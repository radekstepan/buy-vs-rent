const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  income_tax: 0.3,
  rrsp_allowance: 0.2,
  expenses: 10,
  rent: 10,
  rent_increase: () => 0,
  stock_return: () => 0.1,
};

sample(opts, (time, key, val) => {
  if (key === 'rent:net_worth') {
    tap.equal(Math.round(val), 1043);
  }
});
