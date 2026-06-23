# world-cup-matchups

Live 2026 FIFA World Cup matchup forecaster. A static single-page app that
projects the knockout bracket forward (the earliest round any two teams can
meet, with each side's road) and shows live group standings with a what-if
score-entry tool.

Live: https://klappe-pm.github.io/world-cup-matchups/

## Commands

- `npm test` — offline unit tests plus live endpoint contract tests (Node 18+, uses global `fetch`)
- `npm run test:offline` — offline tests only (skips network)
- Local preview: `python3 -m http.server 8000`, then open http://localhost:8000/

## Architecture

- `index.html` — the app, served at the GitHub Pages root. View layer only:
  rendering, events, live fetch with 30s polling, snapshot fallback. Two tabs,
  Matchups and Group standings.
- `src/wc-core.js` — DOM-free core shared by the app and the tests: API client,
  team-name normalization, game-to-fixture merge, and the standings, clinch,
  and path engine.
- `tests/` — zero-dependency Node suite plus captured API fixtures.
- The structural backbone (group draw, R32/KO bracket, third-place annex, FIFA
  ranks) is embedded in the `index.html` `#data` island; live scores overlay it.
- `src/world-cup-2026-matchup-finder.html` — earlier standalone reference
  version, not the live app.

## Live data

Source: worldcup26.ir (public, no auth, CORS `*`), fetched directly in-browser.
Endpoint contract and the seven-team name map: `docs/references/api-integration.md`.

## Conventions and constraints

- Standings count finished games plus the user's what-if edits only; a live
  in-progress score shows in the fixture row but is not half-counted.
- The clinched-winner lock follows real results only — never what-if edits or
  live games.
- Do not attribute Claude Code as an author in commits or PRs (owner preference).
- Stage explicitly by path; never `git add -A` / `git add .`.
- No secret literals; the feed requires none.

## Deferred

- Kalshi real-time odds tab (next version).

## Session continuity

- Plan-of-record: `docs/plans/ACTIVE-PLAN.pointer` (a route-first redesign:
  Matchup / Forecast / Bracket tabs, date-aware paths).
- Latest passoff and open work: `docs/passoffs/LATEST.pointer`.
- Canonical scaffold and layout rules:
  `/Users/kevinlappe/Projects/harness/scaffolding/project-routing-spec.md`.
