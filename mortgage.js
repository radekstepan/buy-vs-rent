// https://www.ratehub.ca/js/mortgages.js?v=66fd3745

var Finance = require('financejs');
var finance = new Finance();

function get_pay_periods(payment_frequency) {
    if (payment_frequency === "monthly") {
        return 12;
    } else if (payment_frequency === "semi_monthly") {
        return 12 * 2;
    } else if (payment_frequency === "weekly") {
        return 52;
    } else if (payment_frequency === "yearly") {
        return 1;
    } else {
        return 52 / 2;
    }
}

function get_divisor(payment_frequency) {
    if (payment_frequency === "monthly") {
        return 365.25 / 12;
    } else if (payment_frequency === "semi_monthly") {
        return (365.25 / 12) * 2;
    } else if (payment_frequency === "weekly") {
        return 7;
    } else if (payment_frequency === "yearly") {
        return 365.25;
    } else {
        return 14;
    }
}

function get_i(original_mortgage_rate, payment_frequency) {
    var periods_per_year = get_pay_periods(payment_frequency);
    var effective_rate = nominal_to_effective(original_mortgage_rate, 2);
    var i = effective_to_nominal(effective_rate, periods_per_year);
    return i;
}

function days_between(original_mortgage_date, refinance_date) {
    // The number of milliseconds in one day
    var one_day = 1000 * 60 * 60 * 24;

    // Convert both dates to milliseconds
    var date1_ms = refinance_date.getTime();
    var date2_ms = original_mortgage_date.getTime();

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date1_ms - date2_ms);

    // Convert back to days and return
    return Math.round(difference_ms / one_day);
}

function nominal_to_effective(nominal_rate, periods_per_year) {
    var effective_rate = Math.pow(1 + nominal_rate / periods_per_year, periods_per_year) - 1;

    return effective_rate;
}

function effective_to_nominal(effective_rate, periods_per_year) {
    var nominal_rate = periods_per_year * (Math.pow(effective_rate + 1, 1 / periods_per_year) - 1);

    return nominal_rate;
}

function get_remaining_mortgage_balance(mortgage_balance, original_mortgage_rate, original_mortgage_date, refinance_date, payment_frequency, original_term_length) {
    var periods_per_year = get_pay_periods(payment_frequency);
    var days_per_payment = get_divisor(payment_frequency);
    var i = get_i(original_mortgage_rate, payment_frequency);

    var t = days_between(original_mortgage_date, refinance_date) / days_per_payment;
    var n = original_term_length * periods_per_year;

    var t_factor = (1 + i) ^ t - 1;
    var n_factor = (1 + i) ^ n - 1;

    return mortgage_balance * (1 - t_factor / n_factor);
}

var a = get_remaining_mortgage_balance(1e5, 0.0334, new Date(2017, 10, 1), new Date(2021, 10, 01), 'monthly', 20);
var b = finance.AM(1e5, 0.0334 * 100, 20 * 12, 1);
console.log(a, b);
