// Minimal zero-dependency test harness. Sync + async, with skip support.
'use strict';
const state = { pass: 0, fail: 0, skip: 0, fails: [] };

function rec(kind, name, e) {
  if (kind === 'skip') { state.skip++; process.stdout.write('s'); return; }
  if (kind) { state.pass++; process.stdout.write('.'); return; }
  state.fail++; state.fails.push([name, e]); process.stdout.write('F');
}
function test(name, fn) {
  try { fn(); rec(true, name); }
  catch (e) { e && e.__skip ? rec('skip', name) : rec(false, name, e); }
}
async function testAsync(name, fn) {
  try { await fn(); rec(true, name); }
  catch (e) { e && e.__skip ? rec('skip', name) : rec(false, name, e); }
}
function skip(msg) { const e = new Error(msg || 'skipped'); e.__skip = true; throw e; }
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg || 'eq') + ': expected ' + B + ' got ' + A);
}
function ok(c, msg) { if (!c) throw new Error(msg || 'expected truthy'); }
function summary() {
  console.log('\n\n' + state.pass + ' passed, ' + state.fail + ' failed, ' + state.skip + ' skipped');
  if (state.fail) {
    console.log('\nFailures:');
    for (const [n, e] of state.fails) console.log(' x ' + n + '\n   ' + e.message);
    process.exit(1);
  }
  process.exit(0);
}
module.exports = { test, testAsync, skip, eq, ok, summary, state };
