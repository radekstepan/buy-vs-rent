const tap = require('tap');

const iteration = require('../iteration');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  income_tax: 0,
  expenses: 10,
  rent: 10,
  property_value: 2160,
  property_transaction_fees: 0,
  mortgage_term: 2,
  mortgage_payment: (mortgage, rate, term) => 90,
  property_tax: 0,
  property_maintenance: 0
};

iteration(opts, (time, key, val) => {
  if (key === 'buy:net_worth') {
    tap.equal(Math.round(val), 80 + (11 * 90));
  }
});
