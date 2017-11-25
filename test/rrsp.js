const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  tax: {
    getNetIncome: income => income * 0.7 // 30%
  },
  rrsp_allowance: 0.2,
  expenses: 10,
  rent: 10,
  rent_increase: () => 0,
  stock_return: () => 0.1,
};

const personal_after_tax = 585;
const rrsp_after_tax = 329;
const rrsp_credit = 168;

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
