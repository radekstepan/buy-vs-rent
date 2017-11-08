const fs = require('fs');
const numeral = require('numeral');
const PD = require('probability-distributions');
const Finance = require('financejs');
const finance = new Finance();

const r = (name, map) => fs.readFileSync(`./data/${name}`, 'utf-8').split('\n').map(map);
const n = val => numeral(val).value();

// ------------------------

const ITERATIONS = 1e3;
const YEARS = 30;
const CUT = 0.1; // = 5% best/worst results removed

const INCOME = n('100k'); // $ net yearly income
const INCOME_INCREASE = 0.05; // % yearly
const INCOME_TAX = 0.3; // %
const INCOME_TAX_INCREASE = 0.0025; // % yearly increase to income tax (higher band etc.)
const EXPENSES = n('2k'); // monthly expenses
const EXPENSES_INCREASE = 0.02; // % yearly

const SAVINGS = n('0'); // monies already saved up

const RENT = n('2k'); // $ monthly
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

const PROPERTY_VALUE = n('600k'); // $
const PROPERTY_TYPE = 'apartment'; // [ 'single_family', 'apartment' ]
const PROPERTY_APPRECIATION = (function() { // monthly rate
  const d = r(`${PROPERTY_TYPE}_appreciation_toronto.csv`, parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();
const PROPERTY_TAX = 0.007; // % of property value yearly
const PROPERTY_TAX_INCREASE = 0.03; // % yearly
const PROPERTY_MAINTENANCE = 0.015; // % of property value earmarked yearly
const PROPERTY_TRANSACTION_FEES = 0.06; // % transaction fees to buy/sell

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
    iterations: ITERATIONS,
    years: YEARS
  },
  stats: {
    max: -Infinity
  },
  data: {
    buy: [],
    rent: []
  }
};
for (let i = 0; i < ITERATIONS; i++) {
  (function() {
    res.data.buy.push([]);
    res.data.rent.push([]);

    let property_value = PROPERTY_VALUE; // house value right now
    let property_value_yearly = PROPERTY_VALUE; // yearly house price
    let property_tax = null;
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

      property_value *= 1 + PROPERTY_APPRECIATION(); // new property value

      if (!defaulted) {
        // Saving for house deposit.
        if (!paid_off) {
          let deposit_needed = property_value * (MORTGAGE_DEPOSIT + PROPERTY_TRANSACTION_FEES); // this is how much I need to save
          deposit += available - rent; // saved up more

          // Saved up enough? Buy!
          if (deposit >= deposit_needed) {
            const total = property_value * (1 + PROPERTY_TRANSACTION_FEES);
            const mortgage_deposit = deposit / total; // TODO buy outright?

            mortgage = property_value * (1 - mortgage_deposit); // mortgage amount
            paid_off = now + (MORTGAGE_TERM * 12);
            property_tax = property_value * PROPERTY_TAX;
          }
        } else {
          let mortgage_payment = 0;

          // Paying off mortgage?
          if (paid_off > now) {
            if ((now % (5 * 12)) === 0) mortgage_rate = MORTGAGE_RATE(); // adjust mortgage rate after 5 years?
            mortgage_payment = finance.AM(mortgage, mortgage_rate * 100, MORTGAGE_TERM * 12, 1); // monthly repayment
          }
          let property_maintenance = (property_value_yearly * PROPERTY_MAINTENANCE) / 12; // property maintenance for this month

          available -= mortgage_payment + (property_tax / 12) + property_maintenance; // available to invest
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
        property_tax *= 1 + PROPERTY_TAX_INCREASE; // tax is higher
        rent *= (1 + RENT_INCREASE()); // rent is more expensive

        income *= (1 + INCOME_INCREASE); // I make more
        income_tax += INCOME_TAX_INCREASE; // income tax bump
        expenses *= (1 + EXPENSES_INCREASE); // more expenses

        year += 1; month = 0;

        // Log it.
        let v = stock.rent;
        res.data.rent[i].push(v);
        if (v > res.stats.max) res.stats.max = v;

        if (paid_off) {
          if (defaulted) {
            v = stock.buy;
          } else {
            // Property value (less mortgage with equity paid off) and stock.
            v = (property_value * (1 - PROPERTY_TRANSACTION_FEES)) - mortgage + equity + stock.buy;
          }
        } else {
          v = deposit;
        }
        res.data.buy[i].push(v);
        if (v > res.stats.max) res.stats.max = v;
      }
      // Stop after x years automatically.
      if (year > YEARS) stop = true;
    }
  })();
}

// // Throw away top and bottom 5%
// ['rent', 'buy'].map(key => {
//   res.data[key].sort((a, b) => a[YEARS] - b[YEARS]);
//   const low = Math.round(ITERATIONS * (CUT / 2));
//   const high = ITERATIONS - low;
//   res.data[key] = res.data[key].slice(low, high);
// });

fs.writeFileSync('./data.js', `const d = ${JSON.stringify(res)};`);
