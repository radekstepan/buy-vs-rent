const _ = require('lodash');

const t = [{
  max: 11474,
  tax: 0
}, {
  max: 45282,
  tax: .15
}, {
  max: 90563,
  tax: .205
}, {
  max: 140388,
  tax: .26
}, {
  max: 2e5,
  tax: .29
}, {
  max: Number.MAX_VALUE,
  tax: .33
}];

const a = {
  AB: [{
    max: 18451,
    tax: 0
  }, {
    max: 125e3,
    tax: .1
  }, {
    max: 15e4,
    tax: .12
  }, {
    max: 2e5,
    tax: .13
  }, {
    max: 3e5,
    tax: .14
  }, {
    max: Number.MAX_VALUE,
    tax: .15
  }],
  BC: [{
    max: 10027,
    tax: 0
  }, {
    max: 38210,
    tax: .0506
  }, {
    max: 76421,
    tax: .077
  }, {
    max: 87741,
    tax: .105
  }, {
    max: 106543,
    tax: .1229
  }, {
    max: Number.MAX_VALUE,
    tax: .147
  }],
  MB: [{
    max: 9134,
    tax: 0
  }, {
    max: 31e3,
    tax: .108
  }, {
    max: 67e3,
    tax: .1275
  }, {
    max: Number.MAX_VALUE,
    tax: .174
  }],
  NB: [{
    max: 9758,
    tax: 0
  }, {
    max: 40492,
    tax: .0968
  }, {
    max: 80985,
    tax: .1482
  }, {
    max: 131664,
    tax: .1652
  }, {
    max: 15e4,
    tax: .1784
  }, {
    max: 25e4,
    tax: .21
  }, {
    max: Number.MAX_VALUE,
    tax: .2575
  }],
  NL: [{
    max: 8802,
    tax: 0
  }, {
    max: 35148,
    tax: .077
  }, {
    max: 70295,
    tax: .125
  }, {
    max: 125e3,
    tax: .133
  }, {
    max: 175700,
    tax: .143
  }, {
    max: Number.MAX_VALUE,
    tax: .153
  }],
  NT: [{
    max: 14081,
    tax: 0
  }, {
    max: 41011,
    tax: .059
  }, {
    max: 82024,
    tax: .086
  }, {
    max: 133353,
    tax: .122
  }, {
    max: Number.MAX_VALUE,
    tax: .1405
  }],
  NS: [{
    max: 8481,
    tax: 0
  }, {
    max: 29590,
    tax: .0879
  }, {
    max: 59180,
    tax: .1495
  }, {
    max: 93e3,
    tax: .1667
  }, {
    max: 15e4,
    tax: .175
  }, {
    max: Number.MAX_VALUE,
    tax: .21
  }],
  NU: [{
    max: 12947,
    tax: 0
  }, {
    max: 43176,
    tax: .04
  }, {
    max: 86351,
    tax: .07
  }, {
    max: 140388,
    tax: .09
  }, {
    max: Number.MAX_VALUE,
    tax: .115
  }],
  ON: [{
    max: 10011,
    tax: 0
  }, {
    max: 41536,
    tax: .0505
  }, {
    max: 83075,
    tax: .0915
  }, {
    max: 15e4,
    tax: .1116
  }, {
    max: 22e4,
    tax: .1216
  }, {
    max: Number.MAX_VALUE,
    tax: .1316
  }],
  PE: [{
    max: 7708,
    tax: 0
  }, {
    max: 31984,
    tax: .098
  }, {
    max: 63969,
    tax: .138
  }, {
    max: Number.MAX_VALUE,
    tax: .167
  }],
  QC: [{
    max: 11550,
    tax: 0
  }, {
    max: 42390,
    tax: .16
  }, {
    max: 84780,
    tax: .2
  }, {
    max: 103150,
    tax: .24
  }, {
    max: Number.MAX_VALUE,
    tax: .2575
  }],
  SK: [{
    max: 15843,
    tax: 0
  }, {
    max: 44601,
    tax: .11
  }, {
    max: 127430,
    tax: .13
  }, {
    max: Number.MAX_VALUE,
    tax: .15
  }],
  YT: [{
    max: 11474,
    tax: 0
  }, {
    max: 45282,
    tax: .064
  }, {
    max: 90563,
    tax: .09
  }, {
    max: 140388,
    tax: .109
  }, {
    max: 5e5,
    tax: .128
  }, {
    max: Number.MAX_VALUE,
    tax: .15
  }]
};

class Tax {

  getTaxTable(e, t) {
    var n, a, i, r, o, s, l, c;
    for (o = 0,
      l = [],
      a = 0,
      i = t.length; a < i && (n = t[a], !(e < o)); a++)
      c = e <= n.max ? Math.max(e - o, 0) * n.tax : (n.max - o) * n.tax,
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
  }

  getFederalTaxTable(e) {
    return null == e && (e = 0),
      this.getTaxTable(e, t)
  }

  getProvincialTaxTable(e, t) {
    var n;
    if (null == e && (e = 0), !t)
      throw i;
    return n = a[t],
      this.getTaxTable(e, n)
  }

  getFederalTaxAmount(e) {
    return _.sumBy(this.getFederalTaxTable(e), "amount")
  }

  getProvTaxAmount(e, t) {
    return _.sumBy(this.getProvincialTaxTable(e, t), "amount")
  }

  getNetIncome(e, t) {
    return e - this.getTaxes(e, t)
  }

  getTaxes(e, t) {
    var n, a;
    return n = this.getFederalTaxAmount(e),
      a = this.getProvTaxAmount(e, t),
      n + a
  }

  getAverageTaxRate(e, t) {
    var n, a;
    if (null != e)
      return 0 === e ? 0 : (n = this.getFederalTaxAmount(e),
        a = this.getProvTaxAmount(e, t),
        (n + a) / e)
  }

  getMarginalTaxRate(e, n) {
    var r, o, s, l, c, d, u, p;
    if (!n)
      throw i;
    if (null != e) {
      for (s = 0,
        p = 0,
        o = t,
        l = 0,
        d = o.length; l < d; l++)
        if (r = o[l],
          e <= r.max) {
          s = r.tax;
          break
        }
      for (o = a[n],
        c = 0,
        u = o.length; c < u; c++)
        if (r = o[c],
          e <= r.max) {
          p = r.tax;
          break
        }
      return p + s
    }
  }

  getFederalTaxRates() {
    return _.clone(t, true);
  }

  getProvincialTaxRates(e) {
    return null != e ? _.clone(a[e], true) : _.clone(a, true);
  }

  getGrossIncomeFromNet(e, n) {
    var r, o, s, l, c, d, u, p, f, m, h, g;
    if (null == e && (e = 0), !n)
      throw i;
    for (g = [],
      f = _(t).union(a[n]).value(),
      o = 0,
      c = f.length; o < c; o++)
      p = f[o],
      g.push(p.max);
    for (g = _(g).uniq().sortBy().value(),
      m = 0,
      l = 0,
      s = 0,
      d = g.length; s < d; s++) {
      if (h = g[s],
        (u = this.getNetIncome(h, n)) > e)
        return r = this.getMarginalTaxRate(h, n),
          l + m + (e - l) / (1 - r);
      m = h - u,
        l = u
    }
  }

  getTaxDeduction(income, tax_deduction, province) {
    var a, i;
    return i = this.getTaxes(income, province),
      a = this.getTaxes(income - tax_deduction, province),
      i - a
  }
}

module.exports = new Tax();
