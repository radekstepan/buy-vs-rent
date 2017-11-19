const tap = require('tap');

const iteration = require('../iteration');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  income_tax: 0.1,
  expenses: 10,
  rent: 10,
  rent_increase: () => 0,
  stock_return: () => 0.1,
};

iteration(opts, (time, key, val) => {
  if (key === 'rent:net_worth') {
    tap.equal(Math.round(val), 1566);
  }
});