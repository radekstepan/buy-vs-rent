const _ = require('lodash');

const federal = [{
  max: 11474,
  tax: 0
}, {
  max: 45282,
  tax: 0.15
}, {
  max: 90563,
  tax: 0.205
}, {
  max: 140388,
  tax: 0.26
}, {
  max: 2e5,
  tax: 0.29
}, {
  max: Number.MAX_VALUE,
  tax: 0.33
}];

const ontario = [{
    max: 10011,
    tax: 0
  }, {
    max: 41536,
    tax: 0.0505
  }, {
    max: 83075,
    tax: 0.0915
  }, {
    max: 15e4,
    tax: 0.1116
  }, {
    max: 22e4,
    tax: 0.1216
  }, {
    max: Number.MAX_VALUE,
    tax: 0.1316
  }];

const tax = (income, table) => {
  var n, a, i, r, o, s, l, c;
  for (o = 0,
    l = [],
    a = 0,
    i = table.length; a < i && (n = table[a], !(income < o)); a++)
    c = income <= n.max ? Math.max(income - o, 0) * n.tax : (n.max - o) * n.tax,
    r = n.max === Number.MAX_VALUE ? null : n.max,
    s = {
      max: r,
      min: o,
      rate: n.tax,
      amount: c
    },
    o = n.max,
    l.push(s);
  return l
};

module.exports = income =>
  income -
  _.sumBy(tax(income, federal), "amount") -
  _.sumBy(tax(income, ontario), "amount");
