const tick = ({ invested, profit }, stock_return) => ((invested + profit) * (1 + stock_return)) - invested;

class Account {
  constructor(opts) {
    this.opts = opts;

    ['personal', 'rrsp'].map(k =>
      this[k] = {
        invested: 0,
        profit: 0,
        total: 0,
        credit: 0
      }
    );
  }

  // A new month.
  month() {
    // Stock market return for this month.
    const { stock_return } = this.opts;
    this.stock_return = typeof stock_return === 'function' && stock_return() || 0;
  }

  getPersonalProfit() {
    // Pay tax on stock profit in personal.
    const { profit } = this.personal;
    this.personal.total += this.personal.invested + profit;

    ['invested', 'profit'].map(k => this.personal[k] = 0);

    return profit;
  }

  // Invest on stock market and update totals.
  invest(amount, { rrsp_allowance }) {
    if (!amount || amount <= 0) return;

    if (rrsp_allowance > 0) {
      // Now for RRSP.
      const [rrsp_amount, remainder] = (amount > rrsp_allowance) ?
        [rrsp_allowance, amount - rrsp_allowance] :
        [amount, 0];

      this.rrsp.invested += rrsp_amount; // more money invested
      this.rrsp.profit = tick(this.rrsp, this.stock_return); // the new profit

      // Personal account
      if (remainder) {
        this.personal.invested += remainder; // more money invested
      }
      this.personal.profit = tick(this.personal, this.stock_return); // the new profit

      // Tax credit goes into personal account.
      this.rrsp.credit += rrsp_amount;
    } else {
      // Personal account only.
      this.personal.invested += amount; // more money invested
      this.personal.profit = tick(this.personal, this.stock_return); // the new profit
    }
  }
}

module.exports = Account;
