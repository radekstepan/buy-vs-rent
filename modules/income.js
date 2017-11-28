const memoize = require('lodash.memoize');

class Income {
  constructor(opts) {
    this.opts = opts;

    this._getNet = memoize(this.opts.tax ? this.opts.tax.getNetIncome : (val) => val); // 0% tax default

    this.income = [this.opts.income];
  }

  get() {
    return this.income[this.income.length - 1];
  }

  getNet(amount = null) {
    return this._getNet(amount === null ? this.get() : amount);
  }

  getOld() {
    return this.get() * (this.opts.income_old_age || 1); // how much % less do I make as a pensioner
  }

  increase(inc) {
    this.income.push(this.get() * 1 + inc);
  }
}

module.exports = Income;
