const _ = require('lodash');

class Income {
  constructor(opts) {
    this.opts = opts;

    const { tax, income, income_increase } = this.opts;
    this._getNetIncome = _.memoize(tax ? tax : val => val); // 0% tax default

    this.income = [
      income / (1 + income_increase), // (assumed) previous year's income for RRSP
      income
    ];
  }

  get(year = 0) { // default to this year
    return this.income[this.income.length - 1 + year];
  }

  getNet(amount = null) {
    return this._getNetIncome(amount === null ? this.get() : amount);
  }

  getRRSPAllowance() {
    return this.get(-1) * (this.opts.rrsp_allowance || 0); // % yearly
  }

  getOld() {
    return this.get() * (this.opts.income_old_age || 1); // how much % less do I make as a pensioner
  }

  increase() {
    this.income.push(this.get() * (1 + this.opts.income_increase));
  }
}

module.exports = Income;
