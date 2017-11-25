const tick = ({ invested, profit }, stock_return) => ((invested + profit) * (1 + stock_return)) - invested;

// Invest on stock market and update totals.
module.exports = ({ rrsp, personal }, amount, { stock_return, rrsp_allowance }) => {
  if (!amount || amount <= 0) return;

  if (rrsp_allowance > 0) {
    // Now for RRSP.
    const [rrsp_amount, remainder] = (amount > rrsp_allowance) ?
      [rrsp_allowance, amount - rrsp_allowance] :
      [amount, 0];

    rrsp.invested += rrsp_amount; // more money invested
    rrsp.profit = tick(rrsp, stock_return); // the new profit

    // Personal account
    if (remainder) {
      personal.invested += remainder; // more money invested
    }
    personal.profit = tick(personal, stock_return); // the new profit

    // Tax credit goes into personal account.
    rrsp.credit += rrsp_amount;
  } else {
    // Personal account only.
    personal.invested += amount; // more money invested
    personal.profit = tick(personal, stock_return); // the new profit
  }
};
