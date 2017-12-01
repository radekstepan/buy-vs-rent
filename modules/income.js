const memoize = require('lodash.memoize');

class Income {
  constructor(opts) {
    this.opts = opts;

    const { tax, income } = this.opts;
    this._getNetIncome = memoize(tax ? tax.getNetIncome.bind(tax) : (val) => val); // 0% tax default

    this.income = [income];
  }

  get() {
    return this.income[this.income.length - 1];
  }

  getNet(amount = null) {
    return this._getNetIncome(amount === null ? this.get() : amount);
  }

  getOld() {
    return this.get() * (this.opts.income_old_age || 1); // how much % less do I make as a pensioner
  }

  increase(inc) {
    this.income.push(this.get() * (1 + inc));
  }
}

module.exports = Income;
