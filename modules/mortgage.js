class Mortgage {
  constructor(opts) {
    this.opts = opts;

    this.bought = null;
    this.defaulted = false;
    this.paid_off = false;
    this.mortgage_term = this.opts.mortgage_term;
  }

  // Get deposit needed for house value.
  deposit_for(value) {
    this.deposit_amount = this.opts.mortgage_deposit(value);
    this.cmhc_insurance = this.opts.mortgage_insurance(value, this.deposit_amount);
    return this.deposit_needed = value * (this.deposit_amount + this.opts.property_transaction_fees);
  }

  // Set a new mortgage.
  buy(time, value, deposit) {
    this.mortgage = this.cmhc_insurance
      - (deposit - this.deposit_needed)
      + (value * (1 - this.deposit_amount));

    this.paid_off = this.bought + (this.mortgage_term * 12);
    this.rate(time);
  }

  // Update the mortgage rate.
  rate(time, balance) {
    this.mortgage_rate = this.opts.mortgage_rate();
    this.bought = time; // rate is for 5 years

    // Has part of the mortgage been paid up?
    if (balance) {
      this.mortgage = balance;
      this.mortgage_term -= 5;
    }
  }

  // Make a mortgage payment for this month.
  payment(time, available) {
    if (this.paid_off > time) {
      const { payment, balance } = this.opts.mortgage_payment(
        this.mortgage,
        this.mortgage_rate,
        this.mortgage_term,
        time - this.bought
      );
      // Adjust mortgage rate every 5 years.
      if (((time - this.bought) % (5 * 12)) === 0) {
        this.rate(time, balance);
      }
      // Balance remaining.
      this.balance = balance;
      // Make the payment.
      available -= payment;
      // Default?
      if (available < 0) {
        this.defaulted = true;
        this.balance += payment; // payment didn't go through
      }
    }

    return available;
  }
}

module.exports = Mortgage;
