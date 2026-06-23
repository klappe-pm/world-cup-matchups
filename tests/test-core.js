'use strict';
// Offline unit tests against captured fixtures + the shipping structural data.
const t = require('./_tinytest');
const { WC, loadStruct, fixture } = require('./helpers');

const struct = loadStruct();
const gamesPayload = fixture('games.json');
const teamsPayload = fixture('teams.json');
const groupsPayload = fixture('groups.json');

// ---- name normalization ----
t.test('NAME_MAP covers the 7 divergent names', () => {
  t.eq(Object.keys(WC.NAME_MAP).length, 7);
});
t.test('normalizeName maps API names to app names', () => {
  t.eq(WC.normalizeName('United States'), 'USA');
  t.eq(WC.normalizeName('South Korea'), 'Korea Republic');
  t.eq(WC.normalizeName('Czech Republic'), 'Czechia');
  t.eq(WC.normalizeName('Ivory Coast'), "Côte d'Ivoire");
  t.eq(WC.normalizeName('Turkey'), 'Türkiye');
  t.eq(WC.normalizeName('Cape Verde'), 'Cabo Verde');
  t.eq(WC.normalizeName('Democratic Republic of the Congo'), 'Congo DR');
});
t.test('normalizeName passes through unmapped names', () => {
  t.eq(WC.normalizeName('Brazil'), 'Brazil');
  t.eq(WC.normalizeName('Mexico'), 'Mexico');
});

// ---- parseGroupGames ----
t.test('parseGroupGames returns only the 72 group fixtures', () => {
  const rows = WC.parseGroupGames(gamesPayload);
  t.eq(rows.length, 72);
  t.ok(rows.every(r => typeof r.hs === 'number' || r.hs === null), 'scores numeric or null');
});
t.test('parseGroupGames normalizes team names in payload', () => {
  const rows = WC.parseGroupGames(gamesPayload);
  // United States must surface as USA somewhere in Group D
  const hasUSA = rows.some(r => r.home === 'USA' || r.away === 'USA');
  t.ok(hasUSA, 'USA present after normalization');
  const hasRawUS = rows.some(r => r.home === 'United States' || r.away === 'United States');
  t.ok(!hasRawUS, 'no raw "United States" left');
});
t.test('parseGroupGames reads a known finished result (Mexico 2-0 South Africa)', () => {
  const rows = WC.parseGroupGames(gamesPayload);
  const m = rows.find(r => r.group === 'A' &&
    [r.home, r.away].sort().join('|') === ['Mexico', 'South Africa'].sort().join('|'));
  t.ok(m, 'fixture found');
  t.ok(m.finished === true, 'finished');
  const mex = m.home === 'Mexico' ? m.hs : m.as;
  const rsa = m.home === 'Mexico' ? m.as : m.hs;
  t.eq([mex, rsa], [2, 0]);
});
t.test('parseGroupGames derives finished from time_elapsed variants', () => {
  const p = WC.parseGroupGames({ games: [{
    type: 'group', group: 'Z', matchday: '1',
    home_team_name_en: 'X', away_team_name_en: 'Y',
    home_score: '1', away_score: '0', finished: 'FALSE', time_elapsed: 'Finished'
  }] })[0];
  t.ok(p.finished === true && p.live === false, 'time_elapsed=Finished => finished');
});
t.test('parseGroupGames flags live in-progress games', () => {
  const p = WC.parseGroupGames({ games: [{
    type: 'group', group: 'Z', matchday: '1',
    home_team_name_en: 'X', away_team_name_en: 'Y',
    home_score: '1', away_score: '0', finished: 'FALSE', time_elapsed: 'live'
  }] })[0];
  t.ok(p.live === true && p.finished === false, 'live flagged');
});

// ---- indexLiveByFixture orientation ----
t.test('indexLiveByFixture orients scores to the fixture home/away', () => {
  const FIX = [{ id: 0, g: 'Z', h: 'Alpha', a: 'Beta', md: 1 }];
  const games = { games: [{
    type: 'group', group: 'Z', matchday: '1',
    home_team_name_en: 'Beta', away_team_name_en: 'Alpha',  // swapped vs fixture
    home_score: '3', away_score: '1', finished: 'TRUE', time_elapsed: 'finished'
  }] };
  const map = WC.indexLiveByFixture(FIX, WC.parseGroupGames(games));
  // API: Beta(home)=3, Alpha(away)=1. Fixture home=Alpha => Alpha 1, Beta 3.
  t.eq(map[0], { hs: 1, as: 3, finished: true, live: false });
});

// ---- model: live merge + standings vs API table ----
t.test('setLiveScores merges all 72 group fixtures', () => {
  const M = WC.createModel(loadStruct());
  const n = M.setLiveScores(gamesPayload);
  t.eq(n, 72);
});
t.test('computed standings match the API group table on every field', () => {
  const M = WC.createModel(loadStruct());
  M.setLiveScores(gamesPayload);
  const idName = {};
  teamsPayload.teams.forEach(tm => { idName[tm.id] = WC.normalizeName(tm.name_en); });
  const miss = [];
  groupsPayload.groups.forEach(grp => {
    const order = M.standings(grp.name).order;
    const by = {}; order.forEach(r => { by[r.team] = r; });
    grp.teams.forEach(row => {
      const nm = idName[row.team_id], m = by[nm];
      if (!m) { miss.push(grp.name + ' ' + nm + ' missing'); return; }
      [['P', 'mp'], ['W', 'w'], ['D', 'd'], ['L', 'l'], ['GF', 'gf'], ['GA', 'ga'], ['Pts', 'pts']]
        .forEach(p => { if (m[p[0]] !== Number(row[p[1]])) miss.push(grp.name + ' ' + nm + ' ' + p[0] + ' ' + m[p[0]] + '!=' + row[p[1]]); });
      if ((m.GF - m.GA) !== Number(row.gd)) miss.push(grp.name + ' ' + nm + ' GD');
    });
  });
  t.eq(miss, []);
});

// ---- what-if + clinch + revert/reset ----
function modelWithLive() { const M = WC.createModel(loadStruct()); M.setLiveScores(gamesPayload); return M; }
function findUpcoming(M) { return M.FIX.find(f => M.fixtureStatus(f.id).state === 'upcoming'); }

t.test('a what-if entry reprojects the group table', () => {
  const M = modelWithLive();
  const f = findUpcoming(M);
  t.ok(f, 'an undecided fixture exists');
  const before = M.standings(f.g).order.map(r => r.team + ':' + r.Pts).join('|');
  M.state.results[f.id] = [5, 0];
  const after = M.standings(f.g).order.map(r => r.team + ':' + r.Pts).join('|');
  t.ok(before !== after, 'standings changed after what-if');
  // home team gained 3 points
  const homeRow = M.standings(f.g).order.find(r => r.team === f.h);
  t.ok(homeRow.Pts >= 3, 'home team has >=3 pts after a 5-0 what-if win');
});
t.test('clinch follows real results, not what-ifs', () => {
  const M = modelWithLive();
  const f = findUpcoming(M);
  const clinchBefore = M.clinchedWinner(f.g);
  M.state.results[f.id] = [9, 0];          // extreme what-if
  t.eq(M.clinchedWinner(f.g), clinchBefore, 'clinch unchanged by what-if');
});
t.test('official() ignores what-ifs; committed() reflects them', () => {
  const M = modelWithLive();
  const f = findUpcoming(M);
  t.eq(M.official(f.id), null, 'upcoming has no official result');
  M.state.results[f.id] = [2, 1];
  t.eq(M.committed(f.id), [2, 1], 'committed = override');
  t.eq(M.official(f.id), null, 'official still null under override');
});
t.test('reverting one fixture restores the baseline table', () => {
  const M = modelWithLive();
  const f = findUpcoming(M);
  const base = M.standings(f.g).order.map(r => r.team + r.Pts + r.GD).join('|');
  M.state.results[f.id] = [4, 0];
  delete M.state.results[f.id];
  const after = M.standings(f.g).order.map(r => r.team + r.Pts + r.GD).join('|');
  t.eq(after, base);
});
t.test('a finished game is counted, locked, and not "mine" by default', () => {
  const M = modelWithLive();
  const fin = M.FIX.find(f => M.fixtureStatus(f.id).state === 'finished');
  t.ok(fin, 'a finished fixture exists');
  const fs = M.fixtureStatus(fin.id);
  t.ok(fs.real && fs.mine === false, 'has real result, not overridden');
  t.eq(M.committed(fin.id), fs.real, 'finished result is counted');
});
t.test('overriding a finished game marks it mine but keeps clinch on real result', () => {
  const M = modelWithLive();
  const g = 'A';
  const clinchBefore = M.clinchedWinner(g);
  const fin = M.FIX.find(f => f.g === g && M.fixtureStatus(f.id).state === 'finished');
  t.ok(fin, 'a finished fixture in A exists');
  M.state.results[fin.id] = [0, 9];
  t.eq(M.fixtureStatus(fin.id).mine, true, 'now mine');
  t.eq(M.committed(fin.id), [0, 9], 'table uses override');
  t.eq(M.clinchedWinner(g), clinchBefore, 'clinch still on real result');
});

// ---- structural path engine is unaffected by scores ----
t.test('earliest-meeting path is structural (USA vs England) and score-independent', () => {
  const M = modelWithLive();
  const e1 = M.earliestAny('USA', 'England');
  const f = findUpcoming(M); M.state.results[f.id] = [3, 0];
  const e2 = M.earliestAny('USA', 'England');
  t.ok(e1 && e2, 'both resolve');
  t.eq(e1.round, e2.round, 'round unchanged by a group what-if');
});
