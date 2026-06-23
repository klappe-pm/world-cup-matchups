'use strict';
// Test runner: offline unit tests first, then live endpoint contract tests.
const t = require('./_tinytest');
require('./test-core');               // sync suite, runs on require
(async () => {
  try { await require('./test-endpoints')(); }
  catch (e) { console.error('\nendpoint suite error:', e && e.message); }
  t.summary();
})();
