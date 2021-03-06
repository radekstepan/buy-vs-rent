const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  income_increase: 0.5, // 50% each year :)
  tax: income => income * 0.7, // 30%
  rrsp_allowance: 0.2,
  expenses: 10,
  rent: 10,
  rent_increase: () => 0,
  stock_return: () => 0.1,
};

const personal_after_tax = 715;
const rrsp_after_tax = 220;
const rrsp_credit = 112;

let called = 0;
sample(opts, (time, key, val) => {
  if (key === 'rent:net_worth') {
    called += 1;
    tap.equal(Math.round(val.personal), personal_after_tax);
    tap.equal(Math.round(val.rrsp), rrsp_after_tax);
  }
  if (key === 'rent:rrsp_credit') {
    called += 1;
    tap.equal(Math.round(val), rrsp_credit);
  }
});

tap.equal(called, 2);
