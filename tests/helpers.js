'use strict';
const fs = require('fs');
const path = require('path');
const WC = require(path.join(__dirname, '..', 'src', 'wc-core.js'));
const ROOT = path.join(__dirname, '..');

// Load the structural data island from the shipping HTML, so tests use the
// exact data the app serves.
function loadStruct() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('data island not found in HTML');
  return JSON.parse(m[1]);
}
function fixture(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
}
module.exports = { WC, loadStruct, fixture, ROOT };
