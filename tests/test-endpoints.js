'use strict';
// Live endpoint contract tests against worldcup26.ir.
// Skipped (not failed) when WC_SKIP_LIVE is set, fetch is unavailable, or the
// network is unreachable.
const t = require('./_tinytest');
const { WC, loadStruct } = require('./helpers');

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

module.exports = async function () {
  if (process.env.WC_SKIP_LIVE) { t.test('live endpoints (skipped: WC_SKIP_LIVE)', () => t.skip()); return; }
  if (typeof fetch === 'undefined') { t.test('live endpoints (skipped: no global fetch)', () => t.skip()); return; }

  let data = null;
  await t.testAsync('fetchLive returns teams + games + groups', async () => {
    data = await withTimeout(WC.fetchLive(), 15000);
    t.ok(data.teams && data.games && data.groups, 'all three payloads present');
  });
  if (!data) { t.test('endpoint shape tests (skipped: live fetch failed)', () => t.skip()); return; }

  t.test('/get/teams shape: 48 teams with id/name/flag/group', () => {
    const a = data.teams.teams;
    t.ok(Array.isArray(a) && a.length === 48, '48 teams');
    ['id', 'name_en', 'flag', 'groups'].forEach(k => t.ok(k in a[0], 'team.' + k));
  });
  t.test('/get/games shape: >=72 games with score/status fields', () => {
    const a = data.games.games;
    t.ok(Array.isArray(a) && a.length >= 72, '>=72 games');
    const x = a.find(g => g.type === 'group');
    ['id', 'group', 'matchday', 'home_team_id', 'away_team_id', 'home_score', 'away_score',
     'finished', 'time_elapsed', 'home_team_name_en', 'away_team_name_en']
      .forEach(k => t.ok(k in x, 'game.' + k));
  });
  t.test('/get/groups shape: 12 groups with standings rows', () => {
    const a = data.groups.groups;
    t.ok(Array.isArray(a) && a.length === 12, '12 groups');
    t.ok('name' in a[0] && Array.isArray(a[0].teams), 'group.name + teams');
    ['team_id', 'mp', 'w', 'l', 'd', 'pts', 'gf', 'ga', 'gd'].forEach(k => t.ok(k in a[0].teams[0], 'row.' + k));
  });
  t.test('live standings computed from /get/games match /get/groups table', () => {
    const M = WC.createModel(loadStruct());
    M.setLiveScores(data.games);
    const idName = {};
    data.teams.teams.forEach(tm => { idName[tm.id] = WC.normalizeName(tm.name_en); });
    const miss = [];
    data.groups.groups.forEach(grp => {
      const by = {}; M.standings(grp.name).order.forEach(r => { by[r.team] = r; });
      grp.teams.forEach(row => {
        const m = by[idName[row.team_id]];
        if (!m) { miss.push(grp.name + ' ' + idName[row.team_id] + ' missing'); return; }
        [['P', 'mp'], ['W', 'w'], ['D', 'd'], ['L', 'l'], ['GF', 'gf'], ['GA', 'ga'], ['Pts', 'pts']]
          .forEach(p => { if (m[p[0]] !== Number(row[p[1]])) miss.push(grp.name + ' ' + p[0]); });
      });
    });
    t.eq(miss, [], 'no field mismatches vs live group table');
  });
};
