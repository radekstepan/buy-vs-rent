const fs = require('fs');
const numeral = require('numeral');
const PD = require('probability-distributions');
const Finance = require('financejs');
const finance = new Finance();

const r = (name, map) => fs.readFileSync(`./data/${name}`, 'utf-8').split('\n').map(map);
const n = val => numeral(val).value();

// ------------------------

// TODO handle taxation of stock and RRSP

const INCOME = n('8k'); // $ available to spend on housing/investments
const INCOME_INCREASE = 0.03; // % yearly
const RENT = n('3k'); // $ monthly
const RENT_INCREASE = 0.03; // % yearly

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
const PROPERTY_TAX_INCREASE = 0.04; // % yearly
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
  rent: [],
  buy: [],
  couch: []
};
for (let i = 0; i < 1e4; i++) {
  (function() {
    let property_value = PROPERTY_VALUE; // house value right now
    let property_value_yearly = PROPERTY_VALUE; // yearly house price
    let income = INCOME; // monthly income for this year
    let rent = RENT; // monthly rent for this year
    let mortgage = null;
    let mortgage_rate = MORTGAGE_RATE();

    let deposit = 0; // $ deposit saved so far
    let stock = { // stock market balance
      rent: 0,
      buy: 0,
      couch: 0
    };
    let bought = false;
    let defaulted = false;

    let stop = false;
    let year = 1;
    let month = 0;
    let now = null;
    while (!stop) {
      month += 1; // new month
      now = ((year - 1) * 12) + month;

      let stock_return = STOCK_RETURN(); // stock market return for this month
      stock.rent = (stock.rent + income - rent) * (1 + stock_return); // stock in rent condition, simples...
      stock.couch += income - rent; // stuff it in the couch

      property_value *= 1 + PROPERTY_APPRECIATION(); // new property value

      if (!defaulted) {
        // Saving for house deposit.
        if (!bought) {
          let deposit_needed = property_value * (MORTGAGE_DEPOSIT + PROPERTY_TRANSACTION_FEES); // this is how much I need to save
          deposit += income - rent; // saved up more

          // Saved up enough? Buy!
          if (deposit >= deposit_needed) {
            stock.buy = deposit - deposit_needed; // leftover goes to stock
            mortgage = property_value * (1 - MORTGAGE_DEPOSIT); // mortgage amount
            bought = now;
          }
        } else {
          let mortgage_payment = 0;

          // Paying off mortgage?
          if (!((bought + (MORTGAGE_TERM * 12)) === now)) {
            if ((now % (5 * 12)) === 0) mortgage_rate = MORTGAGE_RATE(); // adjust mortgage rate after 5 years?
            mortgage_payment = finance.AM(mortgage, mortgage_rate * 100, MORTGAGE_TERM * 12, 1); // monthly repayment
          }

          let property_tax = (property_value_yearly * PROPERTY_TAX) / 12; // property tax for this month
          let property_maintenance = (property_value * PROPERTY_MAINTENANCE) / 12; // property maintenance for this month

          let available = income - mortgage_payment - property_tax - property_maintenance; // available to invest

          // Can't pay up?
          if (available < 0) {
            defaulted = true;
            // TODO sell the house, pay off rest of the mortgage and move any money left to stock
            property_value = 0;
          } else {
            stock.buy = (stock.buy + available) * (1 + stock_return); // adjust stock market portfolio
          }
        }
      } else {
        stock.buy = (stock.buy + income - rent) * (1 + stock_return); // just the stock market now
      }

      // A new year.
      if (!(month % 12)) {
        property_value_yearly = property_value; // update yearly property value
        rent *= (1 + RENT_INCREASE); // rent is more expensive
        income *= (1 + INCOME_INCREASE); // I make more

        year += 1; month = 0;
      }
      // Stop after 35 years automatically.
      if (year > 35) stop = true;
    }

    // Final tally.
    res.rent.push(stock.rent);
    res.couch.push(stock.couch);

    if (bought) {
      if (defaulted) {
        res.buy.push(stock.buy);
      } else {
        res.buy.push((property_value * (1 - PROPERTY_TRANSACTION_FEES)) + stock.buy); // TODO assumes house is paid off!
      }
    } else {
      res.buy.push(deposit);
    }
  })();
}

fs.writeFileSync('./data.js', `const data = ${JSON.stringify(res)};`);
