const fs = require('fs');
const d3 = require('d3');

const opts = require('./opts');
const iteration = require('./iteration');

// ------------------------

const data = {
  buy: [],
  rent: []
};
data.buy.iterations = [];
data.rent.iterations = [];
for (let i = 0; i < opts.iterations; i++) {
  (function() {
    data.buy.iterations.push([]);
    data.rent.iterations.push([]);

    iteration(opts, (key, val) => {
      data[key].iterations[i].push(val);
    });
  })();
}

// Calculate quantiles.
['buy', 'rent'].map(key => {
  for (let y = 0; y < opts.years; y++) {
    const year = [];
    for (let i = 0; i < opts.iterations; i++) {
      year[i] = data[key].iterations[i][y];
    }
    year.sort(d3.ascending);
    data[key][y] = [0.05, 0.5, 0.95].map(q => Math.round(d3.quantile(year, q)));
  }
  delete data[key].iterations;
});

fs.writeFileSync('./data.json', JSON.stringify(data));
