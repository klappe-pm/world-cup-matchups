# api-integration

How the app consumes the live football-data API.

## Source

- Provider: `rezarahiminia/worldcup2026`, hosted at `https://worldcup26.ir`.
- Public, no auth on read endpoints, `Access-Control-Allow-Origin: *`, so the
  static page fetches it directly in-browser. No backend or proxy.
- Rate limit: 120 requests / IP / 60s. Server cache ~30s. The app polls
  `/get/games` every 30s, well under the limit.

## Endpoints used

| Endpoint | Used for |
|---|---|
| `GET /get/games` | Fixtures, scores, and status (polled every 30s) |
| `GET /get/teams` | Team id to name/flag (contract test only) |
| `GET /get/groups` | Authoritative standings table (correctness cross-check) |

## Field notes

- All scalar values are strings; coerce with `Number()`.
- Status is derived from `finished` (`"TRUE"`/`"FALSE"`) and `time_elapsed`
  (`"notstarted"`, a minute, `"HT"`, `"FT"`, `"finished"`, `"live"`).
- `home_team_name_en` / `away_team_name_en` are joined into `/get/games`.
- Knockout games are not displayed in this version; only `type: "group"` is read.

## Name normalization

Seven API names differ from the app's display names. The map lives in
`src/wc-core.js` (`NAME_MAP`):

| API `name_en` | App name |
|---|---|
| United States | USA |
| South Korea | Korea Republic |
| Czech Republic | Czechia |
| Ivory Coast | Côte d'Ivoire |
| Turkey | Türkiye |
| Cape Verde | Cabo Verde |
| Democratic Republic of the Congo | Congo DR |

## Merge model

`src/wc-core.js` keeps the structural backbone (group draw, R32/KO bracket,
third-place annex, FIFA ranks) embedded in the HTML data island and overlays
live scores onto it:

- Games are matched to fixtures by `(group, unordered team-name pair)` and
  scores are oriented to each fixture's home/away.
- `official()` = final result only (API `finished`), and drives the clinched
  group-winner lock, so live in-progress games and user what-ifs never
  fabricate a lock.
- `committed()` = the user's what-if override, else the final result. This is
  what the standings table counts, so a live in-progress game is shown in the
  fixture row but not half-counted (matching the official feed's table).
- Kickoff gate: the feed pre-fills the whole tournament with simulated results,
  so a game can arrive `finished="TRUE"` with a score before its scheduled
  kickoff. `parseGroupGames(payload, now)` (called via `setLiveScores(g,
  Date.now())`) ignores the `finished`/`live` flags and hides the score until
  `now >= local_date` kickoff, so an unplayed game is never counted or shown.
  Passing no `now` disables the gate (offline parsing and tests trust the feed).

## Fallback

If the feed is unreachable the app keeps the embedded snapshot (through
June 22, 2026) and shows an "Offline" status. Verified: standings computed
from `/get/games` match the `/get/groups` table on every field across all 12
groups (see `tests/`).
