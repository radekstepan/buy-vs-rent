const fs = require('fs');
const numeral = require('numeral');
const PD = require('probability-distributions');
const Finance = require('financejs');
const finance = new Finance();

const r = (name, map) => fs.readFileSync(`./data/${name}`, 'utf-8').split('\n').map(map);
const n = val => numeral(val).value();

// ------------------------

const INCOME = n('200k'); // $ net yearly income
const INCOME_INCREASE = 0.03; // % yearly
const INCOME_TAX = 0.3; // %
const INCOME_TAX_INCREASE = 0.005; // % yearly increase to income tax (higher band etc.)
const EXPENSES = n('4k'); // monthly expenses
const EXPENSES_INCREASE = 0.02; // % yearly

const SAVINGS = 0; // monies already saved up

const RENT = n('4k'); // $ monthly
// https://www.ontario.ca/page/rent-increase-guideline
const RENT_INCREASE = (function() { // yearly rate
  const d = r('rent_increase.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();

// const STOCK_RETURN = () => PD.rnorm(1, 0.65, 2.78).pop() / 100;
// https://www.portfoliovisualizer.com/backtest-portfolio
const STOCK_RETURN = (function() { // yearly rate
  const d = r('60-40_portfolio_returns.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();

const PROPERTY_VALUE = n('1m'); // $
const PROPERTY_APPRECIATION = (function() { // monthly rate
  const d = r('single_family_appreciation_toronto.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();
const PROPERTY_TAX = 0.007; // % of property value yearly
const PROPERTY_TAX_INCREASE = 0.01; // % yearly
const PROPERTY_MAINTENANCE = 0.01; // % of property value earmarked yearly
const PROPERTY_TRANSACTION_FEES = 0.05; // % transaction fees to buy/sell

const MORTGAGE_DEPOSIT = 0.2; // % of buy price
// https://www.ratehub.ca/5-year-fixed-mortgage-rate-history
const MORTGAGE_RATE = (function() { // yearly rate
  const d = r('5yr_fixed_mortgage.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();
const MORTGAGE_TERM = 25; // years

// ------------------------

const res = {
  props: {
    income: INCOME,
    rent: RENT,
    house: PROPERTY_VALUE,
    savings: SAVINGS
  },
  data: {
    rent: [],
    buy: [],
    couch: []
  }
};
for (let i = 0; i < 1e3; i++) {
  (function() {
    let property_value = PROPERTY_VALUE; // house value right now
    let property_value_yearly = PROPERTY_VALUE; // yearly house price
    let income = INCOME / 12; // monthly income for this year
    let income_tax = INCOME_TAX; // income tax for this year
    let expenses = EXPENSES; // monthly expenses for this year
    let rent = RENT; // monthly rent for this year
    let mortgage = null;
    let mortgage_rate = MORTGAGE_RATE();

    let deposit = SAVINGS; // $ deposit saved so far
    let stock = { // stock market balance
      rent: 0,
      buy: 0
    };
    let couch = 0;
    let paid_off = false; // when is this house paid off?
    let defaulted = false;
    let equity = 0; // amount of monies paid off on mortgage already

    let stop = false;
    let year = 1;
    let month = 0;
    let now = null;
    while (!stop) {
      month += 1; // new month
      now = ((year - 1) * 12) + month;

      let stock_return = STOCK_RETURN(); // stock market return for this month
      if (stock_return > 0) { // we'll need to pay tax on stock market profit; TODO RRSP
        stock_return *= 1 - income_tax;
      }

      let available = (income * (1 - income_tax)) - expenses;
      stock.rent = (stock.rent + available - rent) * (1 + stock_return); // stock in rent condition, simples...
      couch += available - rent; // stuff it in the couch

      property_value *= 1 + PROPERTY_APPRECIATION(); // new property value

      if (!defaulted) {
        // Saving for house deposit.
        if (!paid_off) {
          let deposit_needed = property_value * (MORTGAGE_DEPOSIT + PROPERTY_TRANSACTION_FEES); // this is how much I need to save
          deposit += available - rent; // saved up more

          // Saved up enough? Buy!
          if (deposit >= deposit_needed) {
            stock.buy += deposit - deposit_needed; // leftover goes to stock
            mortgage = property_value * (1 - MORTGAGE_DEPOSIT); // mortgage amount
            paid_off = now + (MORTGAGE_TERM * 12);
          }
        } else {
          let mortgage_payment = 0;

          // Paying off mortgage?
          if (paid_off > now) {
            if ((now % (5 * 12)) === 0) mortgage_rate = MORTGAGE_RATE(); // adjust mortgage rate after 5 years?
            mortgage_payment = finance.AM(mortgage, mortgage_rate * 100, MORTGAGE_TERM * 12, 1); // monthly repayment
          }

          let property_tax = (property_value_yearly * PROPERTY_TAX) / 12; // property tax for this month
          let property_maintenance = (property_value_yearly * PROPERTY_MAINTENANCE) / 12; // property maintenance for this month

          available -= mortgage_payment + property_tax + property_maintenance; // available to invest
          equity += mortgage_payment;

          // Can't pay up?
          if (available < 0) {
            // Sell the house, move the monies to stock and rent again.
            if (paid_off > now) {
              stock.buy -= mortgage - equity; // haven't paid off mortgage yet
            }
            stock.buy += property_value * (1 - PROPERTY_TRANSACTION_FEES);
            defaulted = true;
          } else {
            stock.buy = (stock.buy + available) * (1 + stock_return); // adjust stock market portfolio
          }
        }
      } else {
        stock.buy = (stock.buy + available - rent) * (1 + stock_return); // just the stock market now
      }

      // A new year.
      if (!(month % 12)) {
        property_value_yearly = property_value; // update yearly property value
        rent *= (1 + RENT_INCREASE()); // rent is more expensive

        income *= (1 + INCOME_INCREASE); // I make more
        income_tax += INCOME_TAX_INCREASE; // income tax bump
        expenses *= (1 + EXPENSES_INCREASE); // more expenses

        year += 1; month = 0;
      }
      // Stop after 35 years automatically.
      if (year > 35) stop = true;
    }

    // Final tally.
    res.data.rent.push(stock.rent);
    res.data.couch.push(couch);

    if (paid_off) {
      if (defaulted) {
        res.data.buy.push(stock.buy);
      } else {
        res.data.buy.push((property_value * (1 - PROPERTY_TRANSACTION_FEES)) + stock.buy); // TODO assumes house is paid off!
      }
    } else {
      res.data.buy.push(deposit);
    }
  })();
}

// Throw away top and bottom 2.5%
['rent', 'buy', 'couch'].map(key => {
  res.data[key].sort((a,b) => a - b);
  const l = res.data[key].length;
  const low = Math.round(l * 0.025);
  const high = l - low;
  res.data[key] = res.data[key].slice(low, high);
});

fs.writeFileSync('./data.js', `const d = ${JSON.stringify(res)};`);
