const federal = [{
  max: 11474,
  tax: 0
}, {
  max: 45282,
  tax: 0.15
}, {
  max: 90563,
  tax: 0.205
}, {
  max: 140388,
  tax: 0.26
}, {
  max: 2e5,
  tax: 0.29
}, {
  max: Number.MAX_VALUE,
  tax: 0.33
}];

const ontario = [{
  max: 10011,
  tax: 0
}, {
  max: 41536,
  tax: 0.0505
}, {
  max: 83075,
  tax: 0.0915
}, {
  max: 15e4,
  tax: 0.1116
}, {
  max: 22e4,
  tax: 0.1216
}, {
  max: Number.MAX_VALUE,
  tax: 0.1316
}];

const tax = (income, table) => {
  let bracket, max = 0, sum = 0;
  const len = table.length;

  for (let i = 0; i < len && (bracket = table[i], !(income < max)); i++) {
    sum += bracket.tax * (income <= bracket.max ? Math.max(income - max, 0) : (bracket.max - max));
    max = bracket.max;
  }

  return sum;
};

module.exports = income =>
  income -
  tax(income, federal) -
  tax(income, ontario);
