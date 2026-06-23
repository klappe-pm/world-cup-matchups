Reviewed sources: the first prototype’s Matchups PDF, the second prototype’s Group Standings PDF, the current HTML/CSS, the extracted core engine, tests, and the schedule data. The main correction: keep the four top-two USA vs England scenarios, add `yyyy-MM-dd` dates to every path node, and merge the second prototype as the forecast-control layer rather than treating it as a separate page. The current core supports structural top-two matchup scenarios and live/what-if standings; the monolithic HTML also contains bracket/third-place behavior that needs to be reconciled with the extracted `wc-core.js`.  

# design-overhaul-scope

## 1. Product Goal

Build a visual World Cup matchup finder that answers one question immediately:

Can Team A and Team B meet, and if so, in what round, on what date, and what path does each team need to take?

The experience should support two modes:

1. Fast matchup answer: pick two teams and see the earliest possible meeting.
2. Forecast control: edit group scores, third-place qualifiers, and bracket assumptions to see how the live bracket changes.

The current product has the right data model direction but the wrong primary visual model. The matchup path is currently shown as tables. The product should instead show two roads converging into a shared match node.

## 2. Prototype Review

### Prototype 1: Matchups

What works:

The Matchups prototype answers the right question. It correctly exposes the selected matchup, the earliest possible meeting round, the match ID, and the scenario required for that meeting.

The USA vs England top-two scenarios are correct:

|Scenario|Meeting|Meeting date|USA path|England path|
|---|---|---|---|---|
|USA 1st, England 1st|Final, M104|2026-07-19|M81, M94, M98, M101, M104|M80, M92, M99, M102, M104|
|USA 1st, England 2nd|Quarterfinal, M98|2026-07-10|M81, M94, M98|M83, M93, M98|
|USA 2nd, England 1st|Semifinal, M102|2026-07-15|M88, M95, M100, M102|M80, M92, M99, M102|
|USA 2nd, England 2nd|Final, M104|2026-07-19|M88, M95, M100, M102, M104|M83, M93, M98, M101, M104|

What fails:

The design uses tables to explain paths. That forces the user to mentally reconstruct a bracket. The page says “when could they meet,” but the visual answer is still buried in rows like `R32 M81 a 3rd-place team`.

The matchup row is not visually dominant enough. A gold row inside a table is weaker than a shared convergence node.

Dates are missing from the visual path. Date is part of the primary user question and must be displayed on every match node.

The explanation about `M##` is useful but too prominent. It should be secondary help text, not part of the main scan path.

### Prototype 2: Group Standings

What works:

The second prototype adds the missing forecast layer. It gives the user editable group tables, score inputs, “you” edit markers, a reset action, and clinch locks. This is important because matchup paths are not just static bracket facts, they depend on group positions and what-if assumptions.

The strongest ideas to keep:

- Editable fixture scores.
- Instant table reprojection.
- Clinch lock that follows real results, not user edits.
- Per-fixture revert.
- Reset all user scores.
- Group cards with current matchday status.

What fails:

The group standings view is still too dense. Every group card includes a full table and every fixture. That is useful for power users, but it is not the first thing a matchup user needs.

The locks are visually noisy in the PDF output. Lock state should be attached to the group winner row and group header, not repeated in a way that looks like stray marks.

The relationship between group edits and the selected matchup is unclear. If the user selects USA vs England, the page should prioritize Group D and Group L before showing all other groups.

The score editing controls need clearer state labels:

- Real result.
- Live score.
- User edit.
- Forecasted score.
- Locked by real result.
- Reverted to real result.

## 3. Design Decision

Do not build a table-first matchup page.

Build a route-first matchup page with tables available as supporting controls.

The top-level product should have three primary tabs:

1. Matchup
2. Forecast
3. Bracket

The current “Group standings” prototype becomes the Forecast tab. It should not compete with the Matchup tab.

## 4. Required User Flow

### Default Flow

1. User lands on Matchup tab.
2. User selects Team A and Team B.
3. Page shows a hero answer:
    - Earliest possible round.
    - Required finish scenario.
    - Match ID.
    - Match date in `yyyy-MM-dd`.
4. Page shows one expanded scenario card for the earliest meeting.
5. Other scenarios are collapsed below.
6. User can open Forecast to edit scores.
7. User can open Bracket to inspect or override knockout winners.

### Example Hero Answer

```text
USA vs England

Earliest possible meeting:
Quarterfinal, M98

Date:
2026-07-10

Required group finish:
USA 1st in Group D
England 2nd in Group L
```

## 5. Correct USA vs England Scenario Coverage

The primary Matchup view should cover exactly these four top-two scenarios:

### Scenario A: USA 1st, England 1st

Meeting:

```text
Final, M104
2026-07-19
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

### Scenario B: USA 1st, England 2nd

Meeting:

```text
Quarterfinal, M98
2026-07-10
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

### Scenario C: USA 2nd, England 1st

Meeting:

```text
Semifinal, M102
2026-07-15
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

### Scenario D: USA 2nd, England 2nd

Meeting:

```text
Final, M104
2026-07-19
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

## 6. Matchup View Design

### Page Structure

```text
Sticky result bar
Team picker
Hero answer card
Earliest scenario route
Other scenarios
Related teams index
Advanced explanation
```

### Sticky Result Bar

The sticky bar should show only:

```text
USA vs England
Earliest: QF, M98, 2026-07-10
```

Do not show long explanations here.

### Hero Answer Card

The hero answer card is the top priority.

Required fields:

```text
Team A
Team B
Earliest round
Match ID
Match date
Required finish
Confidence/scope label
```

Example:

```text
USA vs England

Earliest possible:
Quarterfinal

Match:
M98

Date:
2026-07-10

Required:
USA 1st, England 2nd
```

### Scenario Route Card

Replace two road tables with a two-lane convergence diagram.

Desktop layout:

```text
USA path                                England path

2026-07-01                              2026-07-02
R32 · M81                               R32 · M83
vs 3rd-place team                       vs 2nd Group K
        │                                      │
2026-07-06                              2026-07-06
R16 · M94                               R16 · M93
vs Winner M82                           vs Winner M84
        │                                      │
        └────────── 2026-07-10 ──────────┘
                   QF · M98
                 USA vs England
```

Mobile layout:

```text
USA path
2026-07-01 · R32 · M81
2026-07-06 · R16 · M94

Meeting
2026-07-10 · QF · M98
USA vs England

England path
2026-07-02 · R32 · M83
2026-07-06 · R16 · M93
```

### Match Node Content

Every match node must include:

```text
Date, yyyy-MM-dd
Round
Match ID
Opponent label
Venue, optional
Status, optional
```

Example:

```text
2026-07-06
R16 · M94
USA vs Winner of M82
```

Meeting node:

```text
2026-07-10
Quarterfinal · M98
USA vs England
```

## 7. Forecast Tab Design

The second prototype becomes the Forecast tab.

### Forecast Tab Purpose

The Forecast tab answers:

What group finishes are currently projected, and how do my score edits change the matchup path?

### Forecast Tab Layout

Default ordering:

1. Selected teams’ groups first.
2. Groups that feed into the selected teams’ R32/R16 path.
3. Remaining groups collapsed.

For USA vs England:

```text
Primary:
Group D, Group L

Secondary path dependencies:
Group K, Group G, relevant third-place groups

Remaining:
Collapsed by default
```

### Group Card Requirements

Each group card should include:

```text
Group name
Matchday status
Clinched winner, if any
Compact standings table
Fixture score editor
Reset group edits
```

### Standings Table Columns

Keep only what users need by default:

```text
Pos
Team
Pld
GD
Pts
```

Move W/D/L/GF/GA into an expanded view.

### Fixture Rows

Each fixture row should have:

```text
Team A
Score input A
Score input B
Team B
State badge
Revert action, if edited
```

State badges:

```text
REAL
LIVE
YOU
FORECAST
LOCKED
```

Replace lowercase `you` with a consistent chip:

```text
YOU
```

Revert should be icon + text on hover/long press:

```text
↻ Revert
```

### Clinch Lock

Clinch lock rules:

- Lock is based only on real official results.
- User what-if edits must not fabricate a clinch.
- Lock appears once in the group header and once on the clinched team row.
- Do not repeat lock icons beside every fixture score.

## 8. Bracket Tab Design

The Bracket tab is the full power-user view.

It should show:

```text
Round of 32
Round of 16
Quarterfinals
Semifinals
Final
```

Bracket features:

- Highlight Team A path.
- Highlight Team B path.
- Highlight meeting match.
- Show dates in every match card.
- Allow strategy fill:
    - Manual
    - Favorites
    - Underdogs
    - Wildcard
- Allow manual winner override.
- Keep selected matchup visible in sticky bar.

The bracket is secondary. It should not be required to understand the main answer.

## 9. Every Team vs Anchors

The current alphabetical table should be redesigned as grouped discovery.

Instead of:

```text
Team | vs USA | vs England
```

Use:

```text
Earliest vs USA

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

For dual-anchor mode, use two columns, grouped by round:

```text
Could meet USA earliest
Could meet England earliest
```

Each team chip should be tappable and load that matchup.

## 10. Date Formatting Requirement

All visible dates must use:

```text
yyyy-MM-dd
```

Do not display:

```text
07/10/2026
Jul 10
7/10
07/10/2026 12:00
```

Internal conversion rule:

```text
Input:
MM/DD/YYYY HH:mm

Output:
YYYY-MM-DD
```

Example:

```text
07/10/2026 12:00 -> 2026-07-10
```

Implementation helper:

```js
function toISODate(localDate) {
  if (!localDate) return null;
  const [mdy] = String(localDate).split(' ');
  const [mm, dd, yyyy] = mdy.split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
```

## 11. Code Scope

### Current Gap

The core logic calculates structural paths, scenarios, standings, and live score ingestion, but path steps do not carry schedule metadata. The view therefore renders `R32`, `M81`, and opponent text, but not the required date.

The monolithic HTML contains more functionality than the extracted `wc-core.js`, including third-place annex behavior and bracket strategy. This needs to be consolidated so the shipped app has one source of truth.

### Required Data Model Additions

Add schedule metadata:

```ts
type ScheduleMatch = {
  id: number
  round: 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL' | '3RD'
  dateISO: string
  localDateRaw: string
  stadiumId?: string
}
```

Add date to path steps:

```ts
type PathStep = {
  matchId: number
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
  dateISO: string
  opponentLabel: string
  isMeetingMatch: boolean
}
```

Add scenario result:

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

### Required Core Functions

Add:

```js
function buildScheduleByMatchId(gamesPayload) {}
function getMatchDateISO(matchId) {}
function withSchedule(step) {}
function scenarioWithDates(a, b) {}
function earliestScenarioWithDates(a, b) {}
```

Keep existing structural path logic, but enrich output.

### Required Rendering Changes

Replace current scenario row rendering:

```text
R32 | M81 | beat a 3rd-place team
```

With:

```text
2026-07-01
R32 · M81
USA vs 3rd-place team
```

Replace `beat M82 winner` with:

```text
vs Winner of M82
```

Replace `⚔ meet England` with a shared meeting node:

```text
USA vs England
```

## 12. Component Scope

### Components

```text
MatchupPicker
StickyMatchupBar
HeroAnswerCard
ScenarioRouteCard
PathLane
MatchNode
MeetingNode
ScenarioAccordion
ForecastGroupCard
FixtureScoreEditor
ClinchBadge
BracketExplorer
AnchorDiscovery
DateBadge
StateBadge
```

### Component Ownership

`wc-core.js` owns:

```text
Teams
Groups
Standings
Clinch
Scenario paths
Earliest meeting
Schedule lookup
Date formatting
```

View layer owns:

```text
Layout
Interaction
Collapsed/expanded state
Visual highlighting
CSS variables
Responsive behavior
```

No scenario logic should live only in the DOM renderer.

## 13. Visual Design Direction

Use a dark broadcast-pitch theme for the app. Use a light print theme only for PDF/export.

The current dark green palette is directionally correct, but it needs clearer hierarchy, fewer outlines, stronger meeting emphasis, and better team/round contrast.

### Default App Palette

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
  --live: #22C55E;
  --user-edit: #A78BFA;
  --forecast: #38BDF8;
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

### Light Print / PDF Palette

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
    --live: #15803D;
    --user-edit: #7C3AED;
    --forecast: #0369A1;
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

### Color Use Rules

Use team colors only for path lanes, selected team rows, and bracket path highlights.

Use round colors only for round badges.

Use gold only for:

```text
Earliest result
Meeting node
Final
Clinch lock
Primary CTA
```

Do not use gold for general borders. Too much gold weakens the meeting state.

## 14. Typography

Use:

```text
Display: Oswald or Bebas Neue
Body: Inter or system-ui
Numeric/date/match IDs: ui-monospace
```

Rules:

- Dates and match IDs use monospace.
- Team names use body font, semibold.
- Round labels use uppercase monospace chips.
- Avoid all-caps body paragraphs.

## 15. Responsive Requirements

### Mobile

- Single column.
- Hero answer card first.
- Earliest scenario expanded.
- Other scenarios collapsed.
- Group cards filtered to relevant groups first.
- Bracket is horizontally scrollable and secondary.

### Desktop

- Two-lane route card.
- Forecast groups in two columns.
- Bracket can use wide horizontal layout.
- Sticky bar remains compact.

## 16. Accessibility Requirements

- Minimum contrast ratio: 4.5:1 for text.
- Score inputs must have labels.
- Color cannot be the only indicator.
- Round badges must include text.
- Meeting node must include visible text: `USA vs England`.
- Lock icon must have accessible label: `Clinched based on real results`.
- Revert button must have accessible label: `Revert this score`.

## 17. Empty and Edge States

### Same Team

```text
Pick two different teams.
```

### Same Group

Only show valid scenarios. If both teams are in the same group, skip impossible same-position scenarios.

### No Top-Two Route

```text
No top-two path found. Open Bracket or Third-place controls to explore advanced routes.
```

### Third-Place Not Resolved

```text
Third-place routes depend on which eight third-place teams advance. Choose Auto or Manual in Forecast.
```

### Date Missing

```text
Date TBD
```

Do not show blank date fields.

## 18. Acceptance Criteria

### Matchup

- USA vs England shows earliest meeting as Quarterfinal, M98, 2026-07-10.
- The four top-two USA vs England scenarios match the validated scenario table.
- Every visible match node includes a date in `yyyy-MM-dd`.
- No visible date uses `MM/DD/YYYY`, month names, or locale format.
- The earliest scenario is expanded by default.
- The meeting match is rendered as a shared convergence node, not as a row in each table.

### Forecast

- Group D and Group L appear first for USA vs England.
- User score edits reproject group standings immediately.
- User edits are marked with `YOU`.
- Revert restores the real or empty score.
- Clinch locks are based on real results only.
- Reset clears all user edits.

### Bracket

- Team A path and Team B path are visually distinct.
- Meeting match is highlighted.
- Dates appear in all bracket match cards.
- Manual, Favorites, Underdogs, and Wildcard strategy modes remain available if implemented.
- Strategy-generated results are visually distinct from user picks.

### Code

- `wc-core.js` exposes scenario paths with dates.
- HTML renderer does not compute scenario logic directly.
- Schedule parsing is tested.
- Scenario date tests exist for USA vs England.
- Offline tests run without live network.
- Live endpoint tests remain skippable.

## 19. Test Additions

Add tests:

```js
test('toISODate converts local_date to yyyy-MM-dd', () => {
  t.eq(toISODate('07/10/2026 12:00'), '2026-07-10');
});

test('USA vs England earliest scenario includes meeting date', () => {
  const e = M.earliestAnyWithDates('USA', 'England');
  t.eq(e.meetingRound, 'QF');
  t.eq(e.meetingMatchId, 98);
  t.eq(e.meetingDateISO, '2026-07-10');
});

test('USA 1st England 2nd path dates are attached to every node', () => {
  const s = M.scenariosWithDates('USA', 'England')
    .find(x => x.teamAFinish === 1 && x.teamBFinish === 2);
  t.eq(s.teamAPath.map(x => x.dateISO), ['2026-07-01', '2026-07-06', '2026-07-10']);
  t.eq(s.teamBPath.map(x => x.dateISO), ['2026-07-02', '2026-07-06', '2026-07-10']);
});
```

## 20. Implementation Sequence

### Phase 1: Data correctness

- Add schedule map from `games.json` or API payload.
- Add `toISODate`.
- Add date-aware scenario output.
- Add tests for USA vs England scenarios and dates.

### Phase 2: Matchup redesign

- Replace table cards with route cards.
- Add hero answer card.
- Add meeting convergence node.
- Collapse non-earliest scenarios.
- Add date to every match node.

### Phase 3: Forecast integration

- Move second prototype into Forecast tab.
- Prioritize selected teams’ groups.
- Clean up score edit states.
- Reduce default columns.
- Fix lock display.

### Phase 4: Bracket integration

- Reconcile monolithic HTML bracket logic with `wc-core.js`.
- Preserve third-place annex behavior in core.
- Add dates to bracket matches.
- Add selected matchup path highlighting.

### Phase 5: Visual polish

- Apply final color tokens.
- Add print stylesheet.
- Improve contrast.
- Add accessibility labels.
- Test mobile layout.

## 21. Non-Goals

Do not add Kalshi odds in this pass.

Do not redesign the full data source integration beyond what is required for date-aware match rendering.

Do not make the primary Matchup tab depend on completing all group forecasts.

Do not expose third-place complexity in the default answer unless needed.

## 22. Final Design Principle

The user should not have to read the bracket.

The UI should show two paths crossing.

The date matrix above is based on the schedule records where match IDs map to `local_date`, then converted to ISO format. For example, the uploaded schedule shows M80 and M81 on 07/01/2026, M83 on 07/02/2026, M88 on 07/03/2026, M98 on 07/10/2026, M101 on 07/14/2026, M102 on 07/15/2026, and M104 on 07/19/2026.