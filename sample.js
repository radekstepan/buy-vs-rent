// Noop function.
const fn = (obj, key) => typeof obj[key] === 'function' ? obj[key] : () => 0;

// Invest on stock market and update totals.
const invest = (obj, amount, stock_return, income, income_tax, rrsp_allowance) => {
  obj.personal.invested += amount; // more money invested
  obj.personal.balance = ((obj.personal.invested + obj.personal.balance) * (1 + stock_return)) - obj.personal.invested; // the new profit
  if (obj.personal.balance > 0) {
    obj.personal.balance_after_tax = obj.personal.balance * (1 - income_tax); // the running after tax profit
  } else {
    obj.personal.balance_after_tax = obj.personal.balance; // the running after tax profit
  }
};

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
  let income_tax = opts.income_tax; // income tax for this year
  let expenses = opts.expenses; // monthly expenses for this year
  const rrsp_allowance = opts.rrsp_allowance || 0; // % yearly

  let rent = opts.rent; // monthly rent for this year
  let mortgage = null;
  let mortgage_rate = null;

  let deposit = opts.savings || 0; // $ deposit saved so far
  const stock = {};
  ['rent', 'buy'].map(i => {
    stock[i] = {};
    ['personal', 'rrsp'].map(j => {
      stock[i][j] = {
        invested: 0,
        balance: 0,
        balance_after_tax: 0,
        total: 0
      };
    });
  });

  let bought = null; // when did I buy?
  let paid_off = false; // when is this house paid off?
  let defaulted = false;
  let equity = 0; // amount of monies paid off on mortgage already

  let stop = false;
  let year = 1;
  let month = 0;
  let now = null;

  const buy = (available, stock_return) => {
    // Property value.
    property_value *= 1 + opts.property_appreciation();

    if (!defaulted) {
      // Saving for house deposit.
      if (!paid_off) {
        const deposit_amount = opts.mortgage_deposit(property_value);
        const cmhc_insurance = opts.mortgage_insurance(property_value, deposit_amount);
        const deposit_needed = property_value * (deposit_amount + opts.property_transaction_fees); // this is how much I need to save
        deposit += available - rent; // saved up more

        // Saved up enough? Buy!
        if (deposit >= deposit_needed) {
          mortgage = cmhc_insurance - (deposit - deposit_needed) + (property_value * (1 - deposit_amount));
          bought = now;
          paid_off = now + (opts.mortgage_term * 12);
          property_tax = property_value * opts.property_tax;
          equity = 0;
          mortgage_rate = opts.mortgage_rate();
          emit(month, 'buy:purchase', {
            mortgage,
          });
        }
      } else {
        let mortgage_payment = 0;

        // Paying off mortgage?
        if (paid_off > now) {
          if (((now - bought) % (5 * 12)) === 0) { // adjust mortgage rate after 5 years?
            mortgage_rate = opts.mortgage_rate();
          }
          mortgage_payment = opts.mortgage_payment(mortgage, mortgage_rate, opts.mortgage_term);
        }
        const maint = (property_value_yearly * opts.property_maintenance) / 12; // property maintenance for this month

        available -= mortgage_payment + (property_tax / 12) + maint; // available to invest

        // Can't pay up?
        if (available < 0) {
          // Sell the house, move the monies to stock and rent again.
          let sale = property_value * (1 - opts.property_transaction_fees);
          if (paid_off > now) {
            sale -= mortgage - equity; // haven't paid off mortgage yet
          }
          invest(stock.buy, sale, stock_return, income, income_tax, rrsp_allowance);
          defaulted = true;
          emit(month, 'buy:default', {
            mortgage,
            mortgage_rate,
            mortgage_payment
          });
        } else {
          equity += mortgage_payment; // had enough to pay mortgage payment
          invest(stock.buy, available, stock_return, income, income_tax, rrsp_allowance); // the rest goes to stock
        }
      }
    } else {
      invest(stock.buy, available - rent, stock_return, income, income_tax, rrsp_allowance); // just the stock market now
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
    invest(stock.rent, available - rent, stock_return, income, income_tax, rrsp_allowance);

    // Buy condition.
    opts.property_value && buy(available, stock_return);

    // A new year.
    if (!(month % 12)) {
      property_value_yearly = property_value; // update yearly property value
      property_tax *= 1 + opts.property_tax_increase; // tax is higher

      rent *= (1 + opts.rent_increase()); // rent is more expensive

      income *= (1 + opts.income_increase); // I make more
      income_tax += opts.income_tax_increase; // income tax bump
      expenses *= (1 + opts.expenses_increase); // more expenses

      year += 1; month = 0;

      ['rent', 'buy'].map(i => {
        stock[i].personal.total += stock[i].personal.invested + stock[i].personal.balance_after_tax; // update total stock
        ['invested', 'balance', 'balance_after_tax'].map(k => stock[i].personal[k] = 0); // reset
      });

      // Log it.
      let v = stock.rent.personal.total;
      emit(month, 'rent:net_worth', v);

      if (paid_off) {
        if (defaulted) {
          v = stock.buy.personal.total;
        } else {
          // Property value (less mortgage with equity paid off) and stock.
          v = (property_value * (1 - opts.property_transaction_fees)) - mortgage + equity + stock.buy.personal.total;
        }
      } else {
        v = deposit;
      }
      emit(month, 'buy:net_worth', v);
    }
    // Stop after x years automatically.
    if (year > opts.years) stop = true;
  }
};
