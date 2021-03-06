const tap = require('tap');

const sample = require('../sample');

const opts = {
  iterations: 1,
  years: 1,
  income: 1200,
  expenses: 10,
  rrsp_allowance: 0, // force personal account only
  rent: 10,
  property_value: 2160,
  property_transaction_fees: 0,
  mortgage_term: 2,
  mortgage_payment: (mortgage, rate, term, month) => ({
    payment: 90,
    principal: 90 * month,
    balance: mortgage - (90 * month)
  }),
  property_tax: 0,
  property_maintenance: 0
};

sample(opts, (time, key, val) => {
  if (key === 'buy:net_worth') {
    tap.same(val, {
      house: 80 + (11 * 90),
      personal: 0,
      rrsp: 0
    });
  }
});
