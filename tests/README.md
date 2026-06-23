# tests

Zero-dependency Node test suite (no framework). Run with Node 18+ (global
`fetch` required for the live suite).

```sh
npm test               # offline unit tests + live endpoint contract tests
npm run test:offline   # offline only (skips network)
```

## Layout

- `_tinytest.js` — tiny sync/async harness with skip support.
- `helpers.js` — loads `src/wc-core.js` and the structural data island from the
  shipping HTML.
- `test-core.js` — offline unit tests against `fixtures/`: name normalization,
  game parsing, score orientation, standings vs the captured API table, what-if
  recompute, clinch-on-real-results-only, revert/reset, score-independent paths.
- `test-endpoints.js` — live contract tests against `worldcup26.ir`: endpoint
  shapes and that standings computed from `/get/games` match `/get/groups`.
  Skipped (not failed) when offline or `WC_SKIP_LIVE=1`.
- `fixtures/` — captured `/get/teams`, `/get/games`, `/get/groups` snapshots so
  the offline suite is deterministic.
