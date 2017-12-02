const Mortgage = require('./modules/mortgage');
const Income = require('./modules/income');
const Account = require('./modules/account');

// Noop function.
const fn = (obj, key) => typeof obj[key] === 'function' ? obj[key] : () => 0;

module.exports = (opts, emit) => {
  [
    'property_appreciation',
    'mortgage_deposit',
    'mortgage_insurance',
    'mortgage_rate',
    'rent_increase'
  ].map(key => opts[key] = fn(opts, key));

  let property_value = opts.property_value; // house value right now
  let property_value_yearly = opts.property_value; // yearly house price
  let property_tax = null;

  const income = new Income(opts);
  let expenses = opts.expenses; // monthly expenses for this year

  let rent = opts.rent; // monthly rent for this year
  const mortgage = new Mortgage(opts);

  let deposit = opts.savings || 0; // $ deposit saved so far
  const account = {
    rent: new Account(opts),
    buy: new Account(opts)
  };

  let stop = false;
  let year = 1;
  let month = 0;
  let now = null;

  while (!stop) {
    month += 1; // new month
    now = ((year - 1) * 12) + month;

    // Update accounts.
    ['rent', 'buy'].map(k => account[k].month());

    // After tax and expenses available income.
    let available = (income.getNet() / 12) - expenses;

    // Pay rent and invest on stock market.
    account.rent.invest(available - rent, {
      rrsp_allowance: income.getRRSPAllowance() / 12
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
            emit(now, 'buy:purchase', mortgage);
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
            emit(now, 'buy:default', mortgage);
          }
        }
      }

      account.buy.invest(available, {
        rrsp_allowance: income.getRRSPAllowance() / 12
      });
    }

    // A new year.
    if (!(month % 12)) {
      // First log the stock balance (and pay tax on it).
      ['rent', 'buy'].map(k => {
        // Pay tax on stock profit in personal.
        let profit;
        if ((profit = account[k].getPersonalProfit()) > 0) {
          // Capital gains taxes are half of income tax.
          account[k].personal.total -= (income.getNet(income.get() + profit) - income.getNet()) / 2;
        }

        // Assume RRSP would be taxed on the whole amount, after yearly "old person" income...
        //  (this is highly conservative as in reality the RRSP would be drawn in portions)
        if (opts.rrsp_allowance) {
          const rrsp = account[k].rrsp.invested + account[k].rrsp.profit;
          account[k].rrsp.total = income.getNet(income.getOld() + rrsp) - income.getNet();

          // Invest tax credit into RRSP.
          const rrsp_credit = income.getNet() - income.getNet(income.get() - account[k].rrsp.credit);
          account[k].personal.invested += rrsp_credit;
          account[k].rrsp.credit = 0;
          emit(now, `${k}:rrsp_credit`, rrsp_credit);
        }
      });

      property_value_yearly = property_value; // update yearly property value
      property_tax *= 1 + opts.property_tax_increase; // tax is higher

      rent *= 1 + opts.rent_increase(); // rent is more expensive

      income.increase(); // I make more
      expenses *= 1 + opts.expenses_increase; // more expenses

      year += 1; month = 0;

      // Log it.
      let v = {
        personal: account.rent.personal.total,
        rrsp: account.rent.rrsp.total
      };
      emit(now, 'rent:net_worth', v);

      if (mortgage.paid_off) {
        if (mortgage.defaulted) {
          v = {
            personal: account.buy.personal.total,
            rrsp: account.buy.rrsp.total
          };
        } else {
          // Property value (less mortgage with equity paid off) and stock.
          v = {
            house: (property_value * (1 - opts.property_transaction_fees)) - mortgage.balance,
            personal: account.buy.personal.total,
            rrsp: account.buy.rrsp.total
          }
        }
      } else {
        v = { cash: deposit };
      }
      emit(now, 'buy:net_worth', v);
    }
    // Stop after x years automatically.
    if (year > opts.years) stop = true;
  }
};
