const tap = require('tap');

const tax = require('../modules/tax.js');

tap.equal(parseInt(tax(30000)), 26211);
tap.equal(parseInt(tax(80000)), 62700);
