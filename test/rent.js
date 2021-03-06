const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  tax: income => income * 0.9, // 10%
  expenses: 10,
  rrsp_allowance: 0, // force personal account only
  rent: 10,
  rent_increase: () => 0,
  stock_return: () => 0.1,
};

sample(opts, (time, key, val) => {
  if (key === 'rent:net_worth') {
    tap.equal(Math.round(val.personal), 1284);
    tap.equal(val.rrsp, 0);
  }
});
