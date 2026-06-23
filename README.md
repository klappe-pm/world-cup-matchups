# world-cup-matchups

Forecast where teams could meet up: an API-integrated, real-time 2026 FIFA
World Cup matchup forecaster that projects the bracket forward and reports the
rounds at which any two teams could face each other.

## App

`src/world-cup-2026-matchups.html` is a single-page app (open it directly or
serve the `src/` folder). It has two tabs:

- Matchups: pick any two teams and see the earliest round they can meet and the
  exact knockout road each must walk.
- Group standings: live tables pulled from the official feed, refreshed every
  30 seconds. Tap any score to run a what-if and the table reprojects instantly;
  the clinched-winner lock always follows the real results.

Logic lives in `src/wc-core.js` (DOM-free, shared by the app and the tests).
Live data and the name-normalization map are documented in
`docs/references/api-integration.md`.

## Run and test

```sh
npm test               # offline unit tests + live endpoint contract tests
npm run test:offline   # offline only
```

## Structure

- `src/` — application source (the SPA and `wc-core.js`)
- `tests/` — Node test suite + captured API fixtures
- `scripts/` — one-off and operational scripts
- `docs/` — operating records: passoffs, decisions, plans, tasks, backlogs,
  features, lessons, risks, status, reports, references, diagrams, prompts
- `_local/` — scratch and inbox (gitignored)
- `_archive/` — retired but retained material

See `CLAUDE.md` for project conventions and
`/Users/kevinlappe/Projects/harness/scaffolding/project-routing-spec.md` for the
canonical layout.
