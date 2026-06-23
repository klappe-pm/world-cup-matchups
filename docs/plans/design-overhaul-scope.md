---
domain: software
category: world-cup-matchups
sub-category: design
date-created: 2026-06-23
date-revised: 2026-06-23
type: plan
status: INPRg
aliases: []
tags: []
version: 2.0.0
---

# design-overhaul-scope

World Cup 2026 matchup finder: design overhaul scope and plan of record. The
route-first redesign (Matchup / Forecast / Bracket) with date-aware paths.

## Revision History

- v2.0.0 (2026-06-23): reframed around a date-first UX priority; corrected the
  data-availability finding (knockout dates already ship in the `games`
  payload, they are discarded, not missing), the consolidation finding (the
  live `index.html` already delegates to `wc-core.js`; un-extracted bracket
  logic lives only in the standalone reference HTML), and the overbuild guard
  (vanilla SPA, no framework). Added frontmatter and version; status set to
  `INPRG` for execution of Phases 1 to 3.
- v1.0.0 (2026-06-23): initial scope from the prototype review.

## 1. Decision Summary

The current design is structurally close but visually wrong for the core task.

The product should not ask users to read two parallel road tables. It should show two paths converging into the match where the selected teams meet.

The implementation should preserve the current structural path engine. The engine already computes the correct top-two matchup scenarios. The next work is additive:

1. Attach schedule dates to every route step.
2. Render route steps as visual match nodes instead of table rows.
3. Move the second prototype into the app as the forecast-control layer.
4. Label all simulated results clearly as possible, projected, assumed, live, or real.
5. Keep the app honest: this is a World Cup path simulator, not a claim that these outcomes will happen.

## 2. Product Goal

Build a World Cup matchup finder that answers this question immediately:

> Can Team A and Team B meet, and if so, in what round, on what date, and what path does each team need to take?

The product supports two related jobs:

1. **Fast matchup answer:** pick two teams and see the earliest possible meeting.
2. **Forecast control:** edit group scores, third-place qualifiers, and knockout assumptions to see how the live bracket changes.

The default experience should be route-first, not table-first.

## 3. Current State

### 3.1 What already works

The current `wc-core.js` is DOM-free and is already the correct place for core matchup logic. The browser view and tests are intended to sit on top of that model.

The current core already provides:

- team normalization
- live score parsing
- fixture-to-live-score indexing
- group standings
- clinched winner logic
- top-two structural scenarios
- earliest meeting lookup
- per-fixture display state

The current structural path engine is good enough to keep. Do not rewrite it unless tests prove a defect.

### 3.2 What is missing

The current route output has match ID, round, opponent label, and meeting state, but not schedule metadata.

Current route step shape:

```js
{ mid, round, opp, meet }
```

Required route step shape:

```js
{
  mid,
  round,
  dateISO,
  opp,
  meet,
  status
}
```

The schedule data already has the needed information. The `games` payload contains all 104 matches, including knockout matches, and each match has `id`, `local_date`, `stadium_id`, `type`, and labels. No hand-authored date table is needed.

### 3.3 What should not be overbuilt

The app is a vanilla static SPA. The component names in this scope describe rendering responsibilities, not a requirement to migrate to React.

Do not introduce a framework to complete this redesign.

## 4. Accuracy Requirement

The design can accurately represent the actual World Cup structure from groups to final if it does all of the following:

1. Uses the 104-match schedule.
2. Uses the published Round-of-32 bracket slots.
3. Uses the third-place annex when third-place qualifiers are involved.
4. Clearly distinguishes real results from user edits and forecast assumptions.
5. Avoids claiming a simulated path is what will happen.

Use this copy:

```text
Possible path based on current standings and selected assumptions.
```

Do not use this copy:

```text
This is how the World Cup will go.
```

## 5. Required Match State Labels

Every route, fixture, and bracket match must be labeled as one of these states:

|State|Meaning|
|:--|:--|
|`REAL`|Final result from source data or saved snapshot.|
|`LIVE`|In-progress score from live data.|
|`YOU`|User-edited score or knockout winner.|
|`FORECAST`|Strategy-filled or projected result.|
|`ASSUMED`|Required assumption for a path, such as “USA finishes 1st.”|
|`TBD`|Not enough information yet.|
||

Color cannot be the only indicator. State text must be visible.

## 6. Prototype Review

### 6.1 Prototype 1: Matchups

What works:

- The selected matchup is clear.
- The page exposes earliest possible meeting round.
- The page lists every top-two group-finish scenario.
- It has the right domain model: group finish determines bracket entry, then path walking determines the first shared match.

What fails:

- The UI renders paths as tables.
- Dates are missing from the match path rows.
- The meeting row is only highlighted inside each team’s table instead of being shown as a shared convergence point.
- The `M##` explanation interrupts the main flow.
- “Must beat” is too mechanical and not how users think about the bracket.

Required change:

Replace road tables with a two-lane route diagram.

### 6.2 Prototype 2: Group Standings

What works:

- Editable score inputs are the correct forecast-control primitive.
- Tables reproject instantly.
- User edits have a visible marker.
- Per-score revert is correct.
- Reset all edits is correct.
- Clinch lock based on real results is correct.

What fails:

- The page is too dense when all 12 groups are expanded.
- The locks are visually noisy.
- The relationship between group edits and the selected matchup is unclear.
- The default standings table has too many columns for a mobile-first forecast UI.

Required change:

Move this into a **Forecast** tab or details panel. Prioritize groups relevant to the selected matchup.

For USA vs England, show:

1. Group D, because USA is in Group D.
2. Group L, because England is in Group L.
3. Group K and Group G, because they appear in the selected paths.
4. Third-place controls, when third-place routes are involved.
5. Remaining groups collapsed.

## 7. Navigation Model

The app should have these top-level areas:

```text
Matchup
Forecast
Bracket
```

If keeping the current two-tab approach for speed, implement as:

```text
Matchup
Forecast
```

Then place Bracket inside an advanced details panel.

Do not bury Forecast below the fold if score editing is part of the pitch.

## 8. Matchup View Scope

### 8.1 Page Structure

```text
Sticky result bar
Team picker
Hero answer card
Earliest scenario route
Other scenario accordions
Every team discovery
Advanced notes
```

### 8.2 Sticky Result Bar

Current sticky bar should become more informative.

Required content:

```text
USA vs England
Earliest: QF, M98, 2026-07-10
```

For no valid result:

```text
USA vs USA
Pick two different teams
```

### 8.3 Team Picker

Keep:

- marquee selector
- Team A selector
- swap button
- Team B selector

Add:

- same-team validation
- clear visual distinction between selected team colors
- no dependency on marquee selection

### 8.4 Hero Answer Card

The hero answer card is the primary output.

Required fields:

```text
Team A
Team B
Earliest possible round
Match ID
Date, yyyy-MM-dd
Required group finish
Current status label
```

Example:

```text
USA vs England

Earliest possible meeting:
Quarterfinal

Match:
M98

Date:
2026-07-10

Required:
USA 1st in Group D
England 2nd in Group L

Status:
Possible path, assuming both teams win through.
```

### 8.5 Bottom Line Copy

Replace:

```text
Soonest they can meet: Quarterfinal (M98) — if USA finishes 1st and England finishes 2nd.
```

With:

```text
Earliest possible meeting: Quarterfinal, M98, 2026-07-10.
Required finish: USA 1st in Group D, England 2nd in Group L.
```

Keep the “possible” language.

## 9. Scenario Coverage

For each selected pair, compute all top-two finish combinations:

```text
Team A 1st, Team B 1st
Team A 1st, Team B 2nd
Team A 2nd, Team B 1st
Team A 2nd, Team B 2nd
```

For same-group matchups, skip invalid same-position cases:

```text
Team A 1st, Team B 1st
Team A 2nd, Team B 2nd
```

For USA vs England, the validated top-two scenarios are:

|Scenario|Meeting|Date|USA path|England path|
|:--|--:|--:|:--|:--|
|USA 1st, England 1st|Final, M104|2026-07-19|M81, M94, M98, M101, M104|M80, M92, M99, M102, M104|
|USA 1st, England 2nd|Quarterfinal, M98|2026-07-10|M81, M94, M98|M83, M93, M98|
|USA 2nd, England 1st|Semifinal, M102|2026-07-15|M88, M95, M100, M102|M80, M92, M99, M102|
|USA 2nd, England 2nd|Final, M104|2026-07-19|M88, M95, M100, M102, M104|M83, M93, M98, M101, M104|
||

## 10. USA vs England Required Path Dates

These are acceptance-test fixtures for the design and implementation.

### 10.1 USA 1st, England 1st

Meeting:

```text
Final, M104, 2026-07-19
```

USA path:

```text
2026-07-01, R32, M81, vs 3rd-place team
2026-07-06, R16, M94, vs Winner of M82
2026-07-10, QF, M98, vs Winner of M93
2026-07-14, SF, M101, vs Winner of M97
2026-07-19, Final, M104, vs England
```

England path:

```text
2026-07-01, R32, M80, vs 3rd-place team
2026-07-05, R16, M92, vs Winner of M79
2026-07-11, QF, M99, vs Winner of M91
2026-07-15, SF, M102, vs Winner of M100
2026-07-19, Final, M104, vs USA
```

### 10.2 USA 1st, England 2nd

Meeting:

```text
Quarterfinal, M98, 2026-07-10
```

USA path:

```text
2026-07-01, R32, M81, vs 3rd-place team
2026-07-06, R16, M94, vs Winner of M82
2026-07-10, QF, M98, vs England
```

England path:

```text
2026-07-02, R32, M83, vs 2nd of Group K
2026-07-06, R16, M93, vs Winner of M84
2026-07-10, QF, M98, vs USA
```

### 10.3 USA 2nd, England 1st

Meeting:

```text
Semifinal, M102, 2026-07-15
```

USA path:

```text
2026-07-03, R32, M88, vs 2nd of Group G
2026-07-07, R16, M95, vs Winner of M86
2026-07-11, QF, M100, vs Winner of M96
2026-07-15, SF, M102, vs England
```

England path:

```text
2026-07-01, R32, M80, vs 3rd-place team
2026-07-05, R16, M92, vs Winner of M79
2026-07-11, QF, M99, vs Winner of M91
2026-07-15, SF, M102, vs USA
```

### 10.4 USA 2nd, England 2nd

Meeting:

```text
Final, M104, 2026-07-19
```

USA path:

```text
2026-07-03, R32, M88, vs 2nd of Group G
2026-07-07, R16, M95, vs Winner of M86
2026-07-11, QF, M100, vs Winner of M96
2026-07-15, SF, M102, vs Winner of M99
2026-07-19, Final, M104, vs England
```

England path:

```text
2026-07-02, R32, M83, vs 2nd of Group K
2026-07-06, R16, M93, vs Winner of M84
2026-07-10, QF, M98, vs Winner of M94
2026-07-14, SF, M101, vs Winner of M97
2026-07-19, Final, M104, vs USA
```

## 11. Route Card Design

### 11.1 Primary Rule

Render the path as a route, not a table.

Bad:

```text
ROUND | MATCH | MUST BEAT
R32   | M81   | a 3rd-place team
```

Good:

```text
2026-07-01
R32 · M81
USA vs 3rd-place team
```

### 11.2 Desktop Route Layout

Use a two-lane convergence diagram:

```text
USA path                                England path

2026-07-01                              2026-07-02
R32 · M81                               R32 · M83
vs 3rd-place team                       vs 2nd Group K
        │                                      │
2026-07-06                              2026-07-06
R16 · M94                               R16 · M93
vs Winner of M82                        vs Winner of M84
        │                                      │
        └────────── 2026-07-10 ──────────┘
                   QF · M98
                 USA vs England
```

### 11.3 Mobile Route Layout

Stacked route:

```text
USA path
2026-07-01 · R32 · M81
USA vs 3rd-place team

2026-07-06 · R16 · M94
USA vs Winner of M82

Meeting
2026-07-10 · QF · M98
USA vs England

England path
2026-07-02 · R32 · M83
England vs 2nd Group K

2026-07-06 · R16 · M93
England vs Winner of M84
```

### 11.4 Match Node Fields

Every node must show:

```text
dateISO
round
match ID
team label
opponent label
state label
```

Example:

```text
2026-07-06
R16 · M94
USA vs Winner of M82
ASSUMED
```

### 11.5 Meeting Node Fields

Meeting node must show:

```text
dateISO
full round name
match ID
Team A vs Team B
state label
```

Example:

```text
2026-07-10
Quarterfinal · M98
USA vs England
POSSIBLE
```

Do not render the meeting as `⚔ meet England` inside each table lane.

## 12. Date Formatting

All visible dates must use:

```text
yyyy-MM-dd
```

Never show:

```text
07/10/2026
Jul 10
7/10
07/10/2026 12:00
```

Add helper:

```js
function toISODate(localDate) {
  if (!localDate) return null;
  const [mdy] = String(localDate).split(' ');
  const [mm, dd, yyyy] = mdy.split('/');
  if (!mm || !dd || !yyyy) return null;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
```

Add schedule lookup:

```js
function buildScheduleByMatchId(gamesPayload) {
  const map = {};
  const games = (gamesPayload && gamesPayload.games) || [];
  games.forEach(g => {
    const id = Number(g.id);
    if (!id) return;
    map[id] = {
      id,
      type: String(g.type || '').toLowerCase(),
      round: normalizeRound(g.type || g.group),
      localDateRaw: g.local_date || null,
      dateISO: toISODate(g.local_date),
      stadiumId: g.stadium_id || null,
      homeLabel: g.home_team_label || g.home_team_name_en || null,
      awayLabel: g.away_team_label || g.away_team_name_en || null
    };
  });
  return map;
}
```

## 13. Core API Changes

### 13.1 Add DOM-free schedule functions

Expose these from `WC` or the created model:

```js
toISODate
buildScheduleByMatchId
setSchedule
scheduleFor
scenariosWithDates
earliestAnyWithDates
```

### 13.2 Preferred model API

```js
const M = WC.createModel(D);
M.setSchedule(gamesPayload);

const scenarios = M.scenariosWithDates('USA', 'England');
const earliest = M.earliestAnyWithDates('USA', 'England');
```

### 13.3 Scenario result shape

```ts
type ScenarioPath = {
  teamA: string
  teamB: string
  teamAFinish: 1 | 2
  teamBFinish: 1 | 2
  meetingRound: 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
  meetingMatchId: number
  meetingDateISO: string
  teamAPath: PathStep[]
  teamBPath: PathStep[]
}
```

### 13.4 Path step shape

```ts
type PathStep = {
  matchId: number
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
  dateISO: string | null
  opponentLabel: string
  isMeetingMatch: boolean
  status: 'ASSUMED' | 'TBD' | 'REAL' | 'LIVE' | 'YOU' | 'FORECAST'
}
```

### 13.5 Backward compatibility

Keep existing `scenarios(a, b)` and `earliestAny(a, b)` during the transition.

Add new date-aware methods rather than breaking current rendering immediately.

## 14. Forecast Tab Scope

### 14.1 Purpose

The Forecast tab answers:

> What group finishes are currently projected, and how do my score edits change the matchup path?

### 14.2 Group ordering

Sort group cards by relevance:

1. Team A group.
2. Team B group.
3. Groups directly referenced by visible route nodes.
4. Groups referenced by third-place slots.
5. All remaining groups.

### 14.3 Group card compact layout

Default standings columns:

```text
Pos
Team
Pld
GD
Pts
```

Expanded standings columns:

```text
Pos
Team
Pld
W
D
L
GF
GA
GD
Pts
```

### 14.4 Fixture row layout

```text
Team A
Score A
Score B
Team B
State badge
Revert
```

State badge rules:

- final official score: `REAL`
- in-progress score: `LIVE`
- user edit: `YOU`
- future default strategy score: `FORECAST`
- locked by final result: `LOCKED`

### 14.5 Clinch lock rules

- Clinch lock must be based only on real committed results.
- User edits must not create a real clinch lock.
- Show lock once in group header and once in the clinched team row.
- Do not repeat lock icons beside every score input.
- Add accessible label: `Clinched based on real results`.

### 14.6 Revert rules

Each user-edited score gets:

```text
YOU
↻ Revert
```

Revert restores the live/final score if one exists. Otherwise, it clears the input.

### 14.7 Reset rules

`Reset my scores` clears all user edits and user knockout picks. It must not clear real scores or live scores.

## 15. Bracket Scope

The current live app can ship without a full top-level Bracket tab, but the design should preserve a bracket view as an advanced mode.

Bracket requirements:

- Show R32, R16, QF, SF, Final.
- Show date in every match card.
- Highlight Team A route.
- Highlight Team B route.
- Highlight meeting match.
- Allow manual winner picks.
- Distinguish manual picks from strategy-filled picks.
- Keep selected matchup visible in sticky bar.

Strategy modes, if retained:

```text
Manual
Favorites
Underdogs
Wildcard
```

Do not let strategy output appear as real result.

## 16. Every Team Discovery

Current alphabetical table is useful but too table-heavy.

Replace with grouped discovery.

### 16.1 Single-anchor grouping

```text
Could meet USA earliest

Round of 32
Belgium, Egypt, Iran, New Zealand

Round of 16
Argentina, Spain, Uruguay

Quarterfinal
England, Portugal, Colombia

Semifinal
Brazil, France, Germany

Final
Australia, Paraguay, Türkiye
```

### 16.2 Dual-anchor grouping

```text
Could meet USA earliest       Could meet England earliest
Round of 32                   Round of 32
...                           ...
Round of 16                   Round of 16
...                           ...
```

Each team chip loads that matchup.

Keep a table fallback only if needed for screen-reader or compact implementation.

## 17. Copy Rules

Use “possible,” “projected,” and “assumed.”

Avoid “will,” unless describing fixed schedule facts such as the final date.

Preferred language:

```text
Earliest possible meeting
Required finish
Possible path
Assuming both teams win through
Projected standings
User-edited score
Real result
```

Avoid:

```text
They will meet
Must beat
Official feed
Guaranteed path
```

Use `data source` instead of `official feed` unless the source is FIFA or another verified official provider.

Footer copy:

```text
Scores and standings use the configured live data source and refresh when available. If the feed is unreachable, the page falls back to the bundled snapshot. Paths follow the published Round-of-32 pairings and assume each selected team wins each prior knockout match. Standings are projected from real results plus your edits. Fair-play and drawing of lots are not modeled.
```

## 18. Visual System

### 18.1 Direction

Use a dark broadcast-pitch theme for the app. Use a light print theme only for PDF/export.

The current dark green palette is close. The redesign needs:

- stronger hierarchy
- fewer decorative borders
- stronger meeting emphasis
- clearer team lane colors
- clearer state chips
- better date visibility

### 18.2 Default app palette

```css
:root {
  /* Surfaces */
  --bg: #061A13;
  --bg-radial-top: #0D4A35;
  --surface-1: #0A2E22;
  --surface-2: #0E3B2C;
  --surface-3: #124C39;
  --surface-raised: #163F32;

  /* Text */
  --text-primary: #F4F7F2;
  --text-secondary: #B7C9BE;
  --text-muted: #7F9B8C;
  --text-inverse: #09130E;

  /* Lines */
  --line-strong: #3A7A61;
  --line-soft: #245943;
  --line-hairline: rgba(244, 247, 242, 0.08);

  /* Team lanes */
  --team-a: #3B82F6;
  --team-a-soft: #BFDBFE;
  --team-a-bg: rgba(59, 130, 246, 0.16);

  --team-b: #F43F5E;
  --team-b-soft: #FFE4E6;
  --team-b-bg: rgba(244, 63, 94, 0.16);

  /* Match state */
  --meeting: #FBBF24;
  --meeting-bg: rgba(251, 191, 36, 0.18);
  --real: #22C55E;
  --live: #38BDF8;
  --user-edit: #A78BFA;
  --forecast: #CBD5E1;
  --assumed: #FBBF24;
  --locked: #D6A22A;
  --danger: #F87171;

  /* Rounds */
  --round-r32: #94A3B8;
  --round-r16: #38BDF8;
  --round-qf: #34D399;
  --round-sf: #FB923C;
  --round-final: #FACC15;
}
```

### 18.3 Light print / PDF palette

```css
@media print {
  :root {
    --bg: #FFFFFF;
    --surface-1: #FFFFFF;
    --surface-2: #F7FAF8;
    --surface-3: #EEF6F1;

    --text-primary: #1F2A24;
    --text-secondary: #52635A;
    --text-muted: #7A8A82;
    --text-inverse: #FFFFFF;

    --line-strong: #2F6F55;
    --line-soft: #A9C7BA;
    --line-hairline: #E1EAE5;

    --team-a: #1D4ED8;
    --team-a-soft: #DBEAFE;
    --team-a-bg: #EFF6FF;

    --team-b: #BE123C;
    --team-b-soft: #FFE4E6;
    --team-b-bg: #FFF1F2;

    --meeting: #B7791F;
    --meeting-bg: #FFF7D6;
    --real: #15803D;
    --live: #0369A1;
    --user-edit: #7C3AED;
    --forecast: #475569;
    --assumed: #A16207;
    --locked: #A16207;
    --danger: #B91C1C;

    --round-r32: #64748B;
    --round-r16: #0284C7;
    --round-qf: #059669;
    --round-sf: #EA580C;
    --round-final: #CA8A04;
  }
}
```

### 18.4 Color use rules

Use team colors only for:

- selected team names
- path lanes
- bracket path highlights
- selected rows

Use round colors only for:

- round badges
- route-node round markers

Use gold only for:

- earliest result
- meeting node
- final
- clinch lock
- primary call to action

Do not use gold for general borders.

## 19. Typography

Use:

```text
Display: Oswald or Bebas Neue
Body: Inter or system-ui
Numeric/date/match IDs: ui-monospace
```

Rules:

- Dates use monospace.
- Match IDs use monospace.
- Round badges use uppercase monospace.
- Team names use body font, semibold.
- Avoid all-caps paragraphs.

## 20. Responsive Requirements

### Mobile

- Single column.
- Hero answer first.
- Earliest scenario expanded.
- Other scenarios collapsed.
- Forecast groups filtered to relevant groups first.
- Bracket horizontally scrollable if shown.
- Score inputs at least 36px by 36px.

### Desktop

- Two-lane route diagram.
- Forecast groups in two columns.
- Bracket uses wide horizontal layout.
- Sticky bar remains compact.

## 21. Accessibility Requirements

- Minimum contrast ratio: 4.5:1 for body text.
- Score inputs must have accessible labels.
- Color cannot be the only state indicator.
- Round badges must include text.
- Meeting node must include visible text: `Team A vs Team B`.
- Lock icon must have accessible label: `Clinched based on real results`.
- Revert button must have accessible label: `Revert this score`.
- Team-chip buttons must identify the matchup they load.

## 22. Edge States

### 22.1 Same team

```text
Pick two different teams.
```

### 22.2 Same group

Skip impossible same-position scenarios and add:

```text
These teams share Group X, so same-position finish scenarios are impossible.
```

### 22.3 No top-two path

```text
No top-two path found. Open Forecast or Bracket to explore third-place routes and knockout assumptions.
```

### 22.4 Third-place unresolved

```text
Third-place routes depend on which eight third-place teams advance. Choose Auto or Manual in Forecast.
```

### 22.5 Missing schedule date

```text
Date TBD
```

Never render an empty date.

## 23. Implementation Plan

### Phase 1: Add dates without changing scenario logic

Files:

```text
src/wc-core.js
tests/test-core.js
tests/fixtures/games.json
index.html
```

Tasks:

1. Add `toISODate`.
2. Add `buildScheduleByMatchId`.
3. Add schedule state to `createModel`.
4. Add `setSchedule(gamesPayload)`.
5. Add `scheduleFor(matchId)`.
6. Add `enrichStepWithSchedule(step)`.
7. Add `scenariosWithDates(a, b)`.
8. Add `earliestAnyWithDates(a, b)`.
9. Keep old methods until rendering is migrated.
10. Add tests.

### Phase 2: Replace scenario tables with route cards

Files:

```text
index.html
src/wc-core.js
```

Tasks:

1. Update `renderSticky`.
2. Update `renderScenarios`.
3. Add `renderHeroAnswer`.
4. Add `renderScenarioRouteCard`.
5. Add `renderPathLane`.
6. Add `renderMatchNode`.
7. Add `renderMeetingNode`.
8. Expand earliest scenario by default.
9. Collapse other scenarios.
10. Remove table-header language from route cards.

### Phase 3: Integrate Forecast tab from second prototype

Files:

```text
index.html
src/wc-core.js
```

Tasks:

1. Create `Matchup` and `Forecast` tab states.
2. Move group cards into Forecast tab.
3. Sort groups by selected matchup relevance.
4. Reduce default standings columns.
5. Add expanded standings toggle.
6. Normalize score state badges.
7. Fix clinch-lock display.
8. Keep reset scores.
9. Keep per-score revert.
10. Ensure Forecast changes update Matchup immediately.

### Phase 4: Add advanced Bracket view

Files:

```text
index.html
src/wc-core.js
```

Tasks:

1. Decide whether Bracket is a tab or details panel.
2. Move bracket/strategy logic into core if currently only in the reference HTML.
3. Add dates to bracket match cards.
4. Highlight Team A route.
5. Highlight Team B route.
6. Highlight meeting match.
7. Add status labels to manual and strategy picks.
8. Keep strategy output separate from real results.

### Phase 5: Visual polish

Files:

```text
index.html
```

Tasks:

1. Replace color tokens.
2. Add route-node styles.
3. Add meeting-node styles.
4. Reduce decorative borders.
5. Add print palette.
6. Validate mobile layout.
7. Validate contrast.
8. Validate keyboard use.

## 24. Test Plan

### 24.1 Date parsing tests

```js
t.test('toISODate converts API local_date to yyyy-MM-dd', () => {
  t.eq(WC.toISODate('07/10/2026 12:00'), '2026-07-10');
});

t.test('toISODate returns null for missing date', () => {
  t.eq(WC.toISODate(null), null);
});
```

### 24.2 Schedule lookup tests

```js
t.test('buildScheduleByMatchId indexes knockout dates', () => {
  const schedule = WC.buildScheduleByMatchId(gamesPayload);
  t.eq(schedule[98].dateISO, '2026-07-10');
  t.eq(schedule[102].dateISO, '2026-07-15');
  t.eq(schedule[104].dateISO, '2026-07-19');
});
```

### 24.3 USA vs England tests

```js
t.test('USA vs England earliest date-aware scenario is QF M98', () => {
  const M = WC.createModel(struct);
  M.setSchedule(gamesPayload);
  const e = M.earliestAnyWithDates('USA', 'England');

  t.eq(e.meetingRound, 'QF');
  t.eq(e.meetingMatchId, 98);
  t.eq(e.meetingDateISO, '2026-07-10');
  t.eq(e.teamAFinish, 1);
  t.eq(e.teamBFinish, 2);
});
```

```js
t.test('USA 1st England 2nd path dates are attached to every node', () => {
  const M = WC.createModel(struct);
  M.setSchedule(gamesPayload);
  const s = M.scenariosWithDates('USA', 'England')
    .find(x => x.teamAFinish === 1 && x.teamBFinish === 2);

  t.eq(s.teamAPath.map(x => x.dateISO), [
    '2026-07-01',
    '2026-07-06',
    '2026-07-10'
  ]);

  t.eq(s.teamBPath.map(x => x.dateISO), [
    '2026-07-02',
    '2026-07-06',
    '2026-07-10'
  ]);
});
```

```js
t.test('USA vs England top-two scenarios match expected meeting IDs', () => {
  const M = WC.createModel(struct);
  M.setSchedule(gamesPayload);
  const rows = M.scenariosWithDates('USA', 'England')
    .map(s => [s.teamAFinish, s.teamBFinish, s.meetingRound, s.meetingMatchId, s.meetingDateISO]);

  t.eq(rows, [
    [1, 1, 'FINAL', 104, '2026-07-19'],
    [1, 2, 'QF', 98, '2026-07-10'],
    [2, 1, 'SF', 102, '2026-07-15'],
    [2, 2, 'FINAL', 104, '2026-07-19']
  ]);
});
```

### 24.4 Forecast tests

```js
t.test('fixtureStatus marks user override as mine without changing official result', () => {
  const M = WC.createModel(struct);
  M.state.results[4] = [6, 1];
  const st = M.fixtureStatus(4);

  t.ok(st.mine);
});
```

```js
t.test('clinch lock is based on official results, not user edits', () => {
  const M = WC.createModel(struct);

  // Add a user edit that would appear to clinch a group.
  // The clinched winner should not change unless official committed results support it.
});
```

## 25. Acceptance Criteria

### 25.1 Matchup

- USA vs England shows earliest meeting as Quarterfinal, M98, 2026-07-10.
- The four USA vs England top-two scenarios match the validated scenario table.
- Every visible match node includes a date in `yyyy-MM-dd`.
- No visible date uses `MM/DD/YYYY`, month names, or locale format.
- The earliest scenario is expanded by default.
- The meeting match is rendered as a shared convergence node.
- Route cards do not use `ROUND | MATCH | MUST BEAT` tables.

### 25.2 Forecast

- Group D and Group L appear first for USA vs England.
- User score edits reproject group standings immediately.
- User edits are marked `YOU`.
- Revert restores real score or clears the future fixture input.
- Clinch locks are based on real results only.
- Reset clears all user edits.
- Forecast tab does not claim projections are official standings.

### 25.3 Bracket

- Team A path and Team B path are visually distinct.
- Meeting match is highlighted.
- Dates appear in all knockout match cards.
- Manual picks are marked `YOU`.
- Strategy picks are marked `FORECAST`.
- Real results remain marked `REAL`.

### 25.4 Code

- `wc-core.js` owns scenario logic.
- Renderer does not compute scenario logic.
- Date parsing is DOM-free and tested.
- Schedule lookup is DOM-free and tested.
- Existing offline tests continue to pass.
- Live endpoint tests remain skippable with `WC_SKIP_LIVE=1`.

## 26. Non-Goals

- Do not add Kalshi odds in this pass.
- Do not migrate to React.
- Do not redesign the data provider integration beyond schedule/date support.
- Do not make Matchup depend on completing every group forecast.
- Do not expose third-place annex complexity in the default answer unless needed.
- Do not call `worldcup26.ir` the official feed unless separately verified.

## 27. Final Design Principle

The user should not have to read the bracket.

The UI should show two roads crossing.

Every match node should answer:

```text
When?
Where in the bracket?
Who must this team face?
Is this real, live, user-edited, forecasted, assumed, or TBD?
```