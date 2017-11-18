const fs = require('fs');
const numeral = require('numeral');
const PD = require('probability-distributions');
const Finance = require('financejs');
const finance = new Finance();

const n = val => numeral(val).value();
const r = (name, map) => fs.readFileSync(`./data/${name}`, 'utf-8').split('\n').map(map);

const opts = {};

opts.iterations = 1e3;
opts.years = 30;

opts.inflation = 0.02; // desired inflation rate set by Bank of Canada

opts.income = n('100k'); // $ net yearly income
opts.income_increase = opts.inflation + 0.02; // % yearly
opts.income_tax = 0.3; // %
opts.income_tax_increase = 0.0025; // % yearly increase to income tax (higher band etc.)
opts.expenses = n('2k'); // monthly expenses
opts.expenses_increase = opts.inflation; // % yearly

opts.savings = n('10k'); // monies already saved up

opts.rent = n('2k'); // $ monthly
// https://www.ontario.ca/page/rent-increase-guideline
opts.rent_increase = (function() { // yearly rate
  const d = r('rent_increase.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();

// opts.stock_return = () => PD.rnorm(1, 0.65, 2.78).pop() / 100;
// https://www.portfoliovisualizer.com/backtest-portfolio
opts.stock_return = (function() { // yearly rate
  const d = r('60-40_portfolio_returns.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();

opts.property_value = n('400k'); // $
// opts.property_type = 'apartment'; // [ 'single_family', 'apartment' ]
opts.property_appreciation = (function() { // monthly rate
  const r = Math.pow(1 + opts.inflation, 1 / 12) - 1;
  return () => r;
})();
// opts.property_appreciation = (function() { // monthly rate
//   const d = r(`${opts.property_type}_appreciation_toronto.csv`, parseFloat);
//   return () => d[PD.rint(1, 0, d.length - 1).pop()];
// })();
opts.property_tax = 0.007; // % of property value yearly
opts.property_tax_increase = opts.inflation; // % yearly
opts.property_maintenance = 0.015; // % of property value earmarked yearly
opts.property_transaction_fees = 0.06; // % transaction fees to buy/sell

// https://www.ratehub.ca/mortgage-down-payment
opts.mortgage_deposit = function(property_value) { // % of buy price
  if (property_value <= n('1m')) {
    return (n('25k') + ((property_value - n('500k')) * 0.1)) / property_value;
  } else {
    return 0.2;
  }
};
opts.mortgage_insurance = function(property_value, mortgage_deposit) {
  const mortgage = property_value * (1 - mortgage_deposit);
  switch (true) {
    case mortgage_deposit < 0.1:
      return mortgage * 0.04;
    case mortgage_deposit < 0.15:
      return mortgage * 0.031;
    case mortgage_deposit < 0.2:
      return mortgage * 0.028;
    default:
      return 0;
  }
};

// https://www.ratehub.ca/5-year-fixed-mortgage-rate-history
opts.mortgage_rate = (function() { // yearly rate
  const d = r('5yr_fixed_mortgage.csv', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();
opts.mortgage_term = 25; // years
opts.mortgage_payment = function(mortgage, rate, term) { // monthly repayment
  return finance.AM(mortgage, rate * 100, term * 12, 1);
};

module.exports = opts;
