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
  purchase: []
};
data.buy.samples = [];
data.rent.samples = [];
for (let i = 0; i < opts.samples; i++) {
  (function() {
    data.buy.samples.push([]);
    data.rent.samples.push([]);

    sample(opts, (time, evt, val) => {
      const [ key, type ] = evt.split(':');
      switch (type) {
        case 'net_worth':
          return data[key].samples[i].push(val);
        case 'default':
          return data.defaults.push(val.mortgage_rate);
        case 'purchase':
          return data.purchase.push(val.mortgage);
      }
    });
  })();
}

// Calculate quantiles.
['buy', 'rent'].map(key => {
  for (let y = 0; y < opts.years; y++) {
    const year = [];
    for (let i = 0; i < opts.samples; i++) {
      year[i] = data[key].samples[i][y];
    }
    year.sort(d3.ascending);
    data[key][y] = [0.05, 0.5, 0.95].map(q => Math.round(d3.quantile(year, q)));
  }
  delete data[key].samples;
});

// Get 90%+ mortgage rates that cause us to default.
data.defaults = {
  mortgage_rate: d3.quantile(data.defaults.sort(d3.ascending), 0.1),
  rate: 100 * data.defaults.length / opts.samples,
};

// Get median mortgage $ when we buy.
data.purchase = {
  mortgage: d3.quantile(data.purchase.sort(d3.ascending), 0.5),
  rate: 100 * data.purchase.length / opts.samples,
};

fs.writeFileSync('./data.json', JSON.stringify(data));
