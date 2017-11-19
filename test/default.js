const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  savings: 1000,
  income: 1200,
  income_tax: 0,
  expenses: 10,
  rent: 10,
  property_value: 2160,
  property_transaction_fees: 0,
  mortgage_term: 2,
  mortgage_payment: (mortgage, rate, term) => 1000,
  property_tax: 0,
  property_maintenance: 0
};

sample(opts, (time, key, val) => {
  if (key === 'buy:net_worth') {
    tap.equal(Math.round(val), 1000 + 80 + (10 * 80));
  }
});