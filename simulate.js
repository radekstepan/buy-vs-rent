const fs = require('fs');
const d3 = require('d3');

const opts = require('./opts');
const sample = require('./sample');

// ------------------------

const data = {
  opts,
  buy: [],
  rent: [],
  defaults: [],
  deposit: [],
  purchase: [],
  net_worth: {}
};
data.buy.samples = [];
data.rent.samples = [];
for (let i = 0; i < opts.samples; i++) {
  (function() {
    data.buy.samples.push([]);
    data.rent.samples.push([]);

    sample(opts, (month, evt, val) => {
      const [ key, type ] = evt.split(':');
      switch (type) {
        case 'net_worth':
          const amount = Object.values(val).reduce((total, amount) => total += amount, 0);
          data[key].samples[i].push(Math.round(amount));
          if (month === opts.years * 12) {
            data[key].samples[i].end = val; // save the account split for the very last month
          }
          return;
        case 'default':
          return data.defaults.push(val.mortgage_rate);
        case 'purchase':
          data.purchase.push(Math.round(val.mortgage));
          return data.deposit.push(Math.round(val.deposit_needed));
      }
    });
  })();
}

['buy', 'rent'].map(key => {
  // Get individual account values for net worth.
  const y = opts.years - 1;
  const net_worth = [];
  for (let i = 0; i < opts.samples; i++) {
    const val = data[key].samples[i][y];
    net_worth.push([ val, data[key].samples[i].end ]);
  }
  net_worth.sort((a, b) => d3.ascending(a[0], b[0]));
  const m = net_worth[net_worth.length / 2 | 0];
  data.net_worth[key] = d3.entries(m[1]).map(({key, value}) => [key, value / m[0]]);

  // Calculate quantiles.
  for (let y = 0; y < opts.years; y++) {
    const year = [];

    for (let i = 0; i < opts.samples; i++) {
      year[i] = data[key].samples[i][y];
    }
    year.sort(d3.ascending);
    data[key][y] = [0.05, 0.5, 0.95].map(q => Math.round(d3.quantile(year, q)));
  }

  delete data[key].samples; // cleanup
});

// Get 90%+ mortgage rates that cause us to default.
data.defaults = {
  mortgage_rate: d3.quantile(data.defaults.sort(d3.ascending), 0.1),
  rate: 100 * data.defaults.length / opts.samples,
};

// Get median mortgage $ when we buy.
data.purchase = {
  mortgage: d3.quantile(data.purchase.sort(d3.ascending), 0.5),
  deposit: d3.quantile(data.deposit.sort(d3.ascending), 0.5),
  rate: 100 * data.purchase.length / opts.samples,
};
delete data.deposit;

fs.writeFileSync('./app/data.json', JSON.stringify(data));
