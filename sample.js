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

  let income = opts.income / 12; // monthly income for this year
  let income_tax = opts.income_tax || 0; // income tax for this year
  const income_tax_increase = opts.income_tax_increase || 0;
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
        total: 0
      };
    });
  });

  let stop = false;
  let year = 1;
  let month = 0;
  let now = null;

  const buy = (available, stock_return) => {
    // Property value.
    property_value *= 1 + opts.property_appreciation();

    if (!mortgage.defaulted) {
      // Saving for house deposit.
      if (!mortgage.paid_off) {
        // Saved up more.
        deposit += available - rent;
        // How much deposit do we need?
        const deposit_needed = mortgage.deposit_for(property_value);
        // Is it enough? Buy!
        if (deposit >= deposit_needed) {
          mortgage.buy(now, property_value, deposit);
          property_tax = property_value * opts.property_tax;
          emit(month, 'buy:purchase', mortgage);
        }
      } else {
        const maint = (property_value_yearly * opts.property_maintenance) / 12; // property maintenance for this month
        available -= (property_tax / 12) + maint;
        // Make a mortgage payment.
        available = mortgage.payment(now, available);

        // Can't pay up?
        if (available < 0) {
          // Sell the house, move the monies to stock and rent again.
          let sale = property_value * (1 - opts.property_transaction_fees);
          if (mortgage.paid_off > now) {
            sale -= mortgage.balance; // haven't paid off mortgage yet
          }
          // TODO do something about a loss!
          if (sale > 0) {
            invest(stock.buy, sale, {
              stock_return,
              income_tax,
              rrsp_allowance: income * rrsp_allowance
            });
          }
          emit(month, 'buy:default', mortgage);
        } else {
          // With the rest going to stock
          invest(stock.buy, available, {
            stock_return,
            income_tax,
            rrsp_allowance: income * rrsp_allowance
          });
        }
      }
    } else {
      invest(stock.buy, available - rent, {
        stock_return,
        income_tax,
        rrsp_allowance: income * rrsp_allowance
      }); // just the stock market now
    }
  };

  while (!stop) {
    month += 1; // new month
    now = ((year - 1) * 12) + month;

    // Stock market.
    const stock_return = opts.stock_return(); // stock market return for this month

    // After tax and expenses available income.
    const available = (income * (1 - income_tax)) - expenses;

    // Pay rent and invest on stock market.
    invest(stock.rent, available - rent, {
      stock_return,
      income_tax,
      rrsp_allowance: income * rrsp_allowance
    });

    // Buy condition.
    opts.property_value && buy(available, stock_return);

    // A new year.
    if (!(month % 12)) {
      property_value_yearly = property_value; // update yearly property value
      property_tax *= 1 + opts.property_tax_increase; // tax is higher

      rent *= (1 + opts.rent_increase()); // rent is more expensive

      income *= (1 + opts.income_increase); // I make more
      income_tax += income_tax_increase; // income tax bump
      expenses *= (1 + opts.expenses_increase); // more expenses

      year += 1; month = 0;

      ['rent', 'buy'].map(i => {
        // Pay tax on stock profit in personal.
        stock[i].personal.total += stock[i].personal.invested;
        if (stock[i].personal.profit > 0) {
          // capital gains taxes are a half of income tax.
          stock[i].personal.total += stock[i].personal.profit * (1 - (income_tax / 2));
        } else {
          stock[i].personal.total += stock[i].personal.profit;
        }

        ['invested', 'profit'].map(k => stock[i].personal[k] = 0); // reset personal account

        // RRSP is tax on whole balance.
        stock[i].rrsp.total = (stock[i].rrsp.invested + stock[i].rrsp.profit) * (1 - income_tax);
      });

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
