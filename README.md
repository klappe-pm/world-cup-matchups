# world-cup-matchups

A live 2026 FIFA World Cup matchup forecaster. Pick any two of the 48 teams and
see the earliest round they could meet and the exact knockout road each side
has to walk, with group standings pulled live from the official feed.

Live: <https://klappe-pm.github.io/world-cup-matchups/>

It has no build step and no backend.

## Features

- **Matchups.** Pick two teams (or a marquee pairing) and get the soonest round
  they can collide, plus the round-by-round path each must win to get there, for
  every way the groups can finish in the top two.
- **Every team vs your anchors.** A sortable table of the earliest round every
  other team could run into USA or England. Tap a cell to load that matchup.
- **Live group standings.** All 12 groups, refreshed every 30 seconds from the
  feed. A mathematically clinched group winner is pinned to first with a lock.
- **What-if score entry.** Tap any group score to project a result. The table
  reprojects instantly; edited matches get a "you" tag and a revert button, and
  "Reset my scores" clears them all. The clinch lock always follows the real
  results, never your edits or in-progress games.
- **Works offline.** If the feed is unreachable the page falls back to a saved
  snapshot and shows an offline status.

## Live data

Scores, fixtures, and standings come from
[`rezarahiminia/worldcup2026`](https://github.com/rezarahiminia/worldcup2026)
at `https://worldcup26.ir` (public, no auth, CORS-open), so the page fetches it
directly in the browser. The endpoint contract, the seven-team name map, and the
merge model are documented in
[`docs/references/api-integration.md`](docs/references/api-integration.md).

## Use

It is live on GitHub Pages: <https://klappe-pm.github.io/world-cup-matchups/>

To run it locally, open `index.html` in a browser, or serve the repo root:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000/
```

Deployment is automatic: GitHub Pages serves `index.html` from `main`, so a push
updates the live site within a minute or two.

## Run the tests

Zero-dependency Node suite (Node 18+; global `fetch` is used by the live suite):

```sh
npm test               # offline unit tests + live endpoint contract tests
npm run test:offline   # offline only (skips network)
```

Coverage: name normalization, game parsing and score orientation, standings
computed from `/get/games` versus the `/get/groups` table (every field, all 12
groups), what-if recompute, clinch-on-real-results-only, revert/reset, and live
endpoint shapes. See [`tests/README.md`](tests/README.md).

## Structure

- `index.html` — the single-page app, served at the site root
- `src/wc-core.js` — DOM-free core logic shared by the app and the tests
  (`src/` also keeps the earlier standalone version for reference)
- `tests/` — Node test suite and captured API fixtures
- `scripts/` — one-off and operational scripts
- `docs/` — operating records and references
- `_local/` — scratch and inbox (gitignored)
- `_archive/` — retired but retained material

See `CLAUDE.md` for project conventions.
