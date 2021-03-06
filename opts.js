const fs = require('fs');
const numeral = require('numeral');
const PD = require('probability-distributions');
const amortize = require('amortize');
const Finance = require('financejs');
const finance = new Finance();

const tax = require('./modules/tax');

const n = val => numeral(val).value();
const t = () => true;
const r = (name, map, filter = t) => JSON.parse(fs.readFileSync(`./data/${name}`, 'utf-8')).map(map).filter(filter);
const isNumber = val => !Number.isNaN(val);
const y2M = function(val) { // yearly to monthly rate
  const r = Math.pow(1 + val, 1 / 12) - 1;
  return () => r;
};

const opts = {};

opts.samples = 1e3;
opts.years = 30;

opts.inflation = 0.02; // desired inflation rate set by Bank of Canada

opts.income = n('80k'); // $ net yearly income
opts.income_increase = opts.inflation; // % yearly
opts.income_old_age = 0.2; // % less income in old age
opts.tax = tax;
opts.expenses = n('2k'); // monthly expenses (wo/ rent)
opts.expenses_increase = opts.inflation; // % yearly

opts.rrsp_allowance = 0.18; // % yearly

opts.savings = n('20k'); // monies already saved up

opts.rent = n('2k'); // $ monthly
// https://www.ontario.ca/page/rent-increase-guideline
opts.rent_increase = (function() { // yearly rate
  const d = r('rent_increase.json', parseFloat);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();

// opts.stock_return = () => PD.rnorm(1, 0.65, 2.78).pop() / 100;
// https://www.portfoliovisualizer.com/backtest-portfolio
opts.stock_return = (function() { // yearly rate
  const d = r('60-40_portfolio_returns.json', parseFloat, isNumber);
  return () => d[PD.rint(1, 0, d.length - 1).pop()];
})();
// opts.stock_return = y2M(opts.inflation + 0.02); // 2% above inflation

opts.property_value = n('200k'); // $
opts.property_type = 'apartment'; // [ 'single_family', 'apartment' ]
// opts.property_appreciation = (function() { // monthly rate
//   const d = r(`${opts.property_type}_appreciation_toronto.json`, parseFloat);
//   return () => d[PD.rint(1, 0, d.length - 1).pop()];
// })();
opts.property_appreciation = y2M(opts.inflation + 0.02); // 2% above inflation
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
// opts.mortgage_rate = (function() { // yearly rate
//   const d = r('5yr_fixed_mortgage.json', parseFloat);
//   return () => d[PD.rint(1, 0, d.length - 1).pop()];
// })();
opts.mortgage_rate = (function() { // yearly rate
  return () => PD.runif(1, 0.05, 0.075).pop(); // 5% - 7.5%
})();
opts.mortgage_term = 25; // years
opts.mortgage_payment = function(mortgage, rate, term, month) { // monthly repayment
  return amortize({
    amount: mortgage,
    rate: rate * 100,
    totalTerm: term * 12,
    amortizeTerm: month
  });
};

module.exports = opts;
