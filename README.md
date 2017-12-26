#Buy vs Rent

[![Build Status](https://img.shields.io/travis/radekstepan/buy-vs-rent/master.svg?style=flat)](https://travis-ci.org/radekstepan/buy-vs-rent)

Compare net worth when buying a property vs renting.

![image](https://raw.githubusercontent.com/radekstepan/buy-vs-rent/master/example.png)

##How

Modify `opts.js` with your variables, then run `npm run simulate` to run a Monte-Carlo simulation of two conditions over a period of *x* years:

1. Saving for a deposit, buying a property and paying off the mortgage. Once paid off, investing any left-over income in a stock market.
2. Renting a property and investing any left-over income in a stock market.

Run `npm start` and visit `0.0.0.0:8080` to see a comparison of net worth.

###Variables considered

- income, yearly income increases, income in old age
- expenses and yearly inflation increases
- federal, provincial taxes (Ontario) and RRSP allowance (for investment)
- rent and historical rent increases according to a [guideline](https://www.ontario.ca/page/rent-increase-guideline)
- 60-40 stock market return adjusted for CAD exchange rate
- Toronto property value for condos/houses, historical increases, condo/maintenance fees, taxes and buy/sell fees
- historical mortgage rates, downpayment minimums and insurance

###Notes

- If we default on a mortgage or don't have enough income to pay all the taxes and fees, property is sold, any equity is invested on a stock market and we continue with renting.
- All of RRSP allowance is used for stock market portfolio. At the end of the simulation it is sold in total which incurs a heavy tax, in real life we'd be withdrawing it year by year instead.

##Todo

- [ ] RRSP allowance carries over to the next year if unused
- [ ] simulate raising of taxes
- [ ] link mortgage rates to inflation
- [ ] consider all payroll deducation in net income
