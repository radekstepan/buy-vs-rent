const invest = require('./modules/invest');
const Mortgage = require('./modules/mortgage');

// Noop function.
const fn = (obj, key) => typeof obj[key] === 'function' ? obj[key] : () => 0;

module.exports = (opts, emit) => {
  [
    'property_appreciation',
    'mortgage_deposit',
    'mortgage_insurance',
    'mortgage_rate',
    'stock_return',
    'rent_increase'
  ].map(key => opts[key] = fn(opts, key));

  let property_value = opts.property_value; // house value right now
  let property_value_yearly = opts.property_value; // yearly house price
  let property_tax = null;

  let income = opts.income;
  const income_old_age = opts.income_old_age || 1; // how much % less do I make as a pensioner
  const tax = opts.tax || { getNetIncome: income => income }; // 0% tax default
  let income_net = tax.getNetIncome(income); // after tax income
  let expenses = opts.expenses; // monthly expenses for this year
  const rrsp_allowance = opts.rrsp_allowance || 0; // % yearly

  let rent = opts.rent; // monthly rent for this year
  const mortgage = new Mortgage(opts);

  let deposit = opts.savings || 0; // $ deposit saved so far
  const stock = {};
  ['rent', 'buy'].map(i => {
    stock[i] = {};
    ['personal', 'rrsp'].map(j => {
      stock[i][j] = {
        invested: 0,
        profit: 0,
        total: 0,
        credit: 0
      };
    });
  });

  let stop = false;
  let year = 1;
  let month = 0;
  let now = null;

  while (!stop) {
    month += 1; // new month
    now = ((year - 1) * 12) + month;

    // Stock market.
    const stock_return = opts.stock_return(); // stock market return for this month

    // After tax and expenses available income.
    let available = (income_net / 12) - expenses;

    // Pay rent and invest on stock market.
    invest(stock.rent, available - rent, {
      stock_return,
      rrsp_allowance: (income * rrsp_allowance) / 12
    });

    // Buy condition.
    if (opts.property_value) {
      // Property value.
      property_value *= 1 + opts.property_appreciation();

      if (mortgage.defaulted) {
        available -= rent;
      } else {
        // Saving for house deposit.
        if (!mortgage.paid_off) {
          // Saved up more.
          deposit += available - rent;
          // Enough? Buy!
          if (deposit >= mortgage.deposit_for(property_value)) {
            mortgage.buy(now, property_value, deposit);
            property_tax = property_value * opts.property_tax;
            emit(month, 'buy:purchase', mortgage);
          }
          available = 0;
        } else {
          available -= (property_tax + (property_value_yearly * opts.property_maintenance)) / 12;
          // Make a mortgage payment.
          available = mortgage.payment(now, available);

          // Can't pay up?
          if (available < 0) {
            // Sell the house, move the monies to stock and rent again.
            available = property_value * (1 - opts.property_transaction_fees);
            if (mortgage.paid_off > now) {
              available -= mortgage.balance; // haven't paid off mortgage yet
            }
            emit(month, 'buy:default', mortgage);
          }
        }
      }

      invest(stock.buy, available, {
        stock_return,
        rrsp_allowance: (income * rrsp_allowance) / 12
      });
    }

    // A new year.
    if (!(month % 12)) {
      // First log the stock balance (and pay tax on it).
      ['rent', 'buy'].map(i => {
        // Pay tax on stock profit in personal.
        const { profit } = stock[i].personal;
        stock[i].personal.total += stock[i].personal.invested;
        stock[i].personal.total += profit;

        if (profit > 0) {
          // Capital gains taxes are half of income tax.
          stock[i].personal.total -= (tax.getNetIncome(income + profit) - income_net) / 2;
        }

        ['invested', 'profit'].map(k => stock[i].personal[k] = 0); // reset personal account

        // Assume RRSP would be taxed on the whole amount, after yearly "old person" income...
        //  this is unrealistic as the RRSP would be drawn in portions.
        if (rrsp_allowance) {
          const rrsp = stock[i].rrsp.invested + stock[i].rrsp.profit;
          stock[i].rrsp.total = tax.getNetIncome((income * income_old_age) + rrsp) - income_net;

          // Invest tax credit into RRSP.
          const rrsp_credit = income_net - tax.getNetIncome(income - stock[i].rrsp.credit);
          stock[i].personal.invested += rrsp_credit;
          stock[i].rrsp.credit = 0;
          emit(month, `${i}:rrsp_credit`, rrsp_credit);
        }
      });

      property_value_yearly = property_value; // update yearly property value
      property_tax *= 1 + opts.property_tax_increase; // tax is higher

      rent *= 1 + opts.rent_increase(); // rent is more expensive

      income *= 1 + opts.income_increase; // I make more
      income_net = tax.getNetIncome(income); // new after tax income
      expenses *= 1 + opts.expenses_increase; // more expenses

      year += 1; month = 0;

      // Log it.
      let v = {
        personal: stock.rent.personal.total,
        rrsp: stock.rent.rrsp.total
      };
      emit(month, 'rent:net_worth', v);

      if (mortgage.paid_off) {
        if (mortgage.defaulted) {
          v = {
            personal: stock.buy.personal.total,
            rrsp: stock.buy.rrsp.total
          };
        } else {
          // Property value (less mortgage with equity paid off) and stock.
          v = {
            house: (property_value * (1 - opts.property_transaction_fees)) - mortgage.balance,
            personal: stock.buy.personal.total,
            rrsp: stock.buy.rrsp.total
          }
        }
      } else {
        v = { cash: deposit };
      }
      emit(month, 'buy:net_worth', v);
    }
    // Stop after x years automatically.
    if (year > opts.years) stop = true;
  }
};
