/*
 * wc-core.js — World Cup 2026 matchup-finder core logic.
 * DOM-free. Loads in the browser (window.WC) and in Node (module.exports).
 * The HTML view layer renders on top of a model built here; tests exercise
 * this module directly.
 *
 * Live data source: https://worldcup26.ir (public, no-auth, CORS: *).
 * See docs/references/api-integration.md for the endpoint contract.
 */
(function (global) {
  'use strict';

  var API_BASE = 'https://worldcup26.ir';

  // API name_en -> the app's display names. Only the divergent 7.
  var NAME_MAP = {
    'Cape Verde': 'Cabo Verde',
    'Democratic Republic of the Congo': 'Congo DR',
    'Czech Republic': 'Czechia',
    'Ivory Coast': "Côte d'Ivoire",
    'South Korea': 'Korea Republic',
    'Turkey': 'Türkiye',
    'United States': 'USA'
  };

  function normalizeName(n) { return NAME_MAP[n] || n; }

  // Map an API game type (or group token) to the app's round tokens.
  // group/* stays falsy (group games carry no knockout round).
  var ROUND_MAP = { r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'FINAL', third: 'THIRD' };
  function normalizeRound(type) {
    return ROUND_MAP[String(type || '').toLowerCase()] || null;
  }

  // Convert an API local_date ("MM/DD/YYYY HH:mm") to "yyyy-MM-dd". Null-safe.
  function toISODate(localDate) {
    if (!localDate) return null;
    var mdy = String(localDate).split(' ')[0];
    var parts = mdy.split('/');
    var mm = parts[0], dd = parts[1], yyyy = parts[2];
    if (!mm || !dd || !yyyy) return null;
    return yyyy + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
  }

  // Index ALL games (group + knockout) by Number(id) -> schedule entry.
  function buildScheduleByMatchId(gamesPayload) {
    var map = {};
    var games = (gamesPayload && gamesPayload.games) || [];
    games.forEach(function (g) {
      var id = Number(g.id);
      if (!id) return;
      map[id] = {
        id: id,
        type: String(g.type || '').toLowerCase(),
        round: normalizeRound(g.type || g.group),
        localDateRaw: g.local_date || null,
        dateISO: toISODate(g.local_date),
        stadiumId: g.stadium_id || null
      };
    });
    return map;
  }

  function toScore(v) {
    if (v === '' || v === null || v === undefined) return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  // Parse a /get/games payload into normalized group-stage rows.
  // Each row: {group, md, home, away, hs, as, finished, live}
  function parseGroupGames(payload) {
    var games = (payload && payload.games) || [];
    var out = [];
    for (var i = 0; i < games.length; i++) {
      var x = games[i];
      if (String(x.type || '').toLowerCase() !== 'group') continue;
      var te = String(x.time_elapsed || '').toLowerCase();
      var finished = String(x.finished).toUpperCase() === 'TRUE' || te === 'finished' || te === 'ft';
      var live = !finished && te !== 'notstarted' && te !== '';
      out.push({
        group: x.group,
        md: Number(x.matchday),
        home: normalizeName(x.home_team_name_en),
        away: normalizeName(x.away_team_name_en),
        hs: toScore(x.home_score),
        as: toScore(x.away_score),
        dateISO: toISODate(x.local_date),
        finished: finished,
        live: live
      });
    }
    return out;
  }

  // Match parsed games onto a FIX skeleton by (group, unordered name pair),
  // orienting scores to each fixture's home/away. Returns fixId -> {hs,as,finished,live}.
  function indexLiveByFixture(FIX, parsedGames) {
    var byKey = {}, i;
    for (i = 0; i < parsedGames.length; i++) {
      var pg = parsedGames[i];
      byKey[pg.group + '|' + [pg.home, pg.away].sort().join('|')] = pg;
    }
    var map = {};
    for (i = 0; i < FIX.length; i++) {
      var f = FIX[i];
      var g = byKey[f.g + '|' + [f.h, f.a].sort().join('|')];
      if (!g) continue;
      var hs = g.hs, as_ = g.as;
      if (g.home !== f.h) { hs = g.as; as_ = g.hs; } // fixture orientation differs from API
      map[f.id] = { hs: hs, as: as_, finished: g.finished, live: g.live, dateISO: g.dateISO || null };
    }
    return map;
  }

  // Fetch the three live endpoints. fetchImpl defaults to global fetch.
  // Returns {teams, games, groups} payloads; throws on any failure.
  function fetchLive(opts) {
    opts = opts || {};
    var base = opts.base || API_BASE;
    var f = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
    if (!f) return Promise.reject(new Error('no fetch implementation'));
    function get(path) {
      return f(base + path).then(function (r) {
        if (!r.ok) throw new Error(path + ' -> HTTP ' + r.status);
        return r.json();
      });
    }
    return Promise.all([get('/get/teams'), get('/get/games'), get('/get/groups')])
      .then(function (a) { return { teams: a[0], games: a[1], groups: a[2] }; });
  }

  // Build a stateful model bound to the structural data island D.
  function createModel(D) {
    var GROUPS = D.GROUPS, RANK = D.RANK, FIX = D.FIX, R32 = D.R32, KO = D.KO, ORDER = D.ORDER;
    var GL = Object.keys(GROUPS);
    var FIXBY = {}; FIX.forEach(function (f) { FIXBY[f.id] = f; });
    var R32BY = {}; R32.forEach(function (m) { R32BY[m.id] = m; });
    var KOBY = {}; KO.forEach(function (m) { KOBY[m.id] = m; });
    var NEXT = {}; KO.forEach(function (m) { ['a', 'b'].forEach(function (s) { if (m[s].win !== undefined) NEXT[m[s].win] = m.id; }); });

    var RIDX = { R32: 1, R16: 2, QF: 3, SF: 4, FINAL: 5 };
    var RNAME = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinal', SF: 'Semifinal', FINAL: 'Final' };
    var RSHORT = { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', FINAL: 'FINAL' };
    var RCLS = { R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', FINAL: 'final' };
    var ORD = ['1st', '2nd', '3rd', '4th'];

    var RN = function (id) { return (id >= 73 && id <= 88) ? 'R32' : KOBY[id].round; };
    var rank = function (t) { return RANK[t] || 99; };
    var groupOf = function (t) { for (var i = 0; i < GL.length; i++) if (GROUPS[GL[i]].includes(t)) return GL[i]; return null; };
    var pathFrom = function (e) { var p = [], id = e; while (id != null) { p.push(id); id = NEXT[id]; } return p; };

    // results: user what-if overrides (fixId -> [h,a]). live: API-merged scores.
    var state = { results: {}, live: {}, schedule: {} };

    // official(): final real result only (API finished beats snapshot). Drives clinch.
    function official(fid) {
      var lv = state.live[fid];
      if (lv && lv.finished && lv.hs != null && lv.as != null) return [lv.hs, lv.as];
      var f = FIXBY[fid];
      return f.played ? [f.hs, f.as] : null;
    }
    // current(): real score incl. live in-progress. Provisional, not used for clinch.
    function current(fid) {
      var lv = state.live[fid];
      if (lv && (lv.finished || lv.live) && lv.hs != null && lv.as != null) return [lv.hs, lv.as];
      var f = FIXBY[fid];
      return f.played ? [f.hs, f.as] : null;
    }
    // committed(): what the TABLE counts — user override, else final result only.
    // A live in-progress game is shown in the fixture row (see fixtureStatus.shown)
    // but is not half-counted in the table, matching the official feed's table.
    function committed(fid) {
      if (state.results[fid] !== undefined) return state.results[fid];
      return official(fid);
    }

    function buildRows(g) {
      var rows = {}; GROUPS[g].forEach(function (t) { rows[t] = { team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }; });
      var complete = true;
      FIX.filter(function (f) { return f.g === g; }).forEach(function (f) {
        var s = committed(f.id); if (!s) { complete = false; return; }
        var hs = s[0], as_ = s[1], H = rows[f.h], A = rows[f.a];
        H.P++; A.P++; H.GF += hs; H.GA += as_; A.GF += as_; A.GA += hs;
        if (hs > as_) { H.W++; A.L++; H.Pts += 3; } else if (hs < as_) { A.W++; H.L++; A.Pts += 3; } else { H.D++; A.D++; H.Pts++; A.Pts++; }
      });
      Object.values(rows).forEach(function (r) { r.GD = r.GF - r.GA; });
      return { rows: rows, complete: complete };
    }
    function h2h(g, a, b) {
      var pa = 0, pb = 0;
      FIX.filter(function (f) { return f.g === g; }).forEach(function (f) {
        var s = committed(f.id); if (!s) return;
        if (!([f.h, f.a].includes(a) && [f.h, f.a].includes(b))) return;
        var hs = s[0], as_ = s[1], w = hs > as_ ? f.h : hs < as_ ? f.a : null;
        if (w === null) { pa++; pb++; } else if (w === a) pa += 3; else pb += 3;
      });
      return pb - pa;
    }
    function standings(g) {
      var r = buildRows(g), arr = Object.values(r.rows);
      arr.sort(function (x, y) { return (y.Pts - x.Pts) || h2h(g, x.team, y.team) || (y.GD - x.GD) || (y.GF - x.GF) || (rank(x.team) - rank(y.team)); });
      return { order: arr, complete: r.complete };
    }
    // Clinch uses official() only, so user what-ifs and live in-progress never fabricate a lock.
    function beatHead(g, t, o) {
      return FIX.some(function (f) {
        if (f.g !== g) return false; var s = official(f.id); if (!s) return false;
        if (!([f.h, f.a].includes(t) && [f.h, f.a].includes(o))) return false;
        var w = s[0] > s[1] ? f.h : s[0] < s[1] ? f.a : null; return w === t;
      });
    }
    function clinchedWinner(g) {
      var pts = {}, rem = {}; GROUPS[g].forEach(function (t) { pts[t] = 0; rem[t] = 0; });
      FIX.filter(function (f) { return f.g === g; }).forEach(function (f) {
        var s = official(f.id); if (!s) { rem[f.h]++; rem[f.a]++; return; }
        if (s[0] > s[1]) pts[f.h] += 3; else if (s[0] < s[1]) pts[f.a] += 3; else { pts[f.h]++; pts[f.a]++; }
      });
      for (var ti = 0; ti < GROUPS[g].length; ti++) {
        var t = GROUPS[g][ti], tmin = pts[t], ok = true;
        for (var oi = 0; oi < GROUPS[g].length; oi++) {
          var o = GROUPS[g][oi]; if (o === t) continue;
          var omax = pts[o] + 3 * rem[o];
          if (omax > tmin || (omax === tmin && !beatHead(g, t, o))) { ok = false; break; }
        }
        if (ok) return t;
      }
      return null;
    }

    // ---- structural path engine (no scores) ----
    function entryByPos(g, pos) { for (var i = 0; i < R32.length; i++) for (var si = 0; si < 2; si++) { var s = ['a', 'b'][si], sl = R32[i][s]; if (sl.t === 'pos' && sl.g === g && sl.pos === pos) return { mid: R32[i].id, side: s }; } return null; }
    function entryFor(team, pos) { var g = groupOf(team); if (pos === 1 || pos === 2) return entryByPos(g, pos); return null; }
    function slotLabel(sl) { return sl.t === 'pos' ? (ORD[sl.pos - 1] + ' of Group ' + sl.g) : 'a 3rd-place team'; }
    function routeSteps(team, entry, meet, foe) {
      var steps = [], full = pathFrom(entry.mid);
      for (var i = 0; i < full.length; i++) {
        var mid = full[i], isMeet = mid === meet, opp;
        if (i === 0) { var m = R32BY[mid], other = entry.side === 'a' ? m.b : m.a; opp = isMeet ? foe : slotLabel(other); }
        else { var prev = full[i - 1], mk = KOBY[mid], sib = (mk.a.win === prev) ? mk.b.win : mk.a.win; opp = isMeet ? foe : ('M' + sib + ' winner'); }
        steps.push({ mid: mid, round: RN(mid), opp: opp, meet: isMeet }); if (isMeet) break;
      }
      return steps;
    }
    function combo(a, b, pa, pb) {
      var ea = entryFor(a, pa), eb = entryFor(b, pb); if (!ea || !eb) return { ok: false };
      var pset = new Set(pathFrom(eb.mid)), meet = null, pa2 = pathFrom(ea.mid);
      for (var i = 0; i < pa2.length; i++) if (pset.has(pa2[i])) { meet = pa2[i]; break; }
      if (meet == null) return { ok: false };
      return { ok: true, meet: meet, round: RN(meet), routeA: routeSteps(a, ea, meet, b), routeB: routeSteps(b, eb, meet, a) };
    }
    function scenarios(a, b) {
      var ga = groupOf(a), gb = groupOf(b), out = [];
      [[1, 1], [1, 2], [2, 1], [2, 2]].forEach(function (p) {
        if (ga === gb && p[0] === p[1]) return; var c = combo(a, b, p[0], p[1]); if (c.ok) out.push(Object.assign({ pa: p[0], pb: p[1] }, c));
      });
      return out;
    }
    function earliestAny(a, b) { var best = null; scenarios(a, b).forEach(function (s) { if (!best || RIDX[s.round] < RIDX[best.round]) best = s; }); return best; }

    // ---- date-aware enrichment (wraps the structural engine; no path re-walk) ----
    function scheduleFor(matchId) { return state.schedule[matchId] || null; }
    function dateFor(matchId) { var e = scheduleFor(matchId); return e ? e.dateISO : null; }

    // Map an existing structural step {mid,round,opp,meet} to a PathStep.
    function enrichStep(step) {
      return {
        matchId: step.mid,
        round: step.round,
        dateISO: dateFor(step.mid),
        opponentLabel: step.opp,
        isMeetingMatch: step.meet,
        status: 'ASSUMED'
      };
    }
    function enrichScenario(a, b, s) {
      return {
        teamA: a,
        teamB: b,
        teamAFinish: s.pa,
        teamBFinish: s.pb,
        meetingRound: s.round,
        meetingMatchId: s.meet,
        meetingDateISO: dateFor(s.meet),
        teamAPath: s.routeA.map(enrichStep),
        teamBPath: s.routeB.map(enrichStep)
      };
    }
    function scenariosWithDates(a, b) { return scenarios(a, b).map(function (s) { return enrichScenario(a, b, s); }); }
    function earliestAnyWithDates(a, b) { var s = earliestAny(a, b); return s ? enrichScenario(a, b, s) : null; }

    // Relevance-ordered group list for the Forecast tab (section 14.2):
    // 1) Team A group, 2) Team B group, 3) groups referenced by scenario route
    // nodes, 4) groups referenced by third-place slots, 5) remaining groups.
    // Pure: derives only from the structural draw, scenarios, and group map.
    function relevantGroups(a, b) {
      var ordered = [], seen = {};
      var push = function (g) { if (g && !seen[g]) { seen[g] = true; ordered.push(g); } };
      var thirdSeen = {};
      var ga = groupOf(a), gb = groupOf(b);
      push(ga); push(gb);
      var routeGroups = [], thirdGroups = [];
      if (a !== b) {
        scenarios(a, b).forEach(function (s) {
          [s.routeA, s.routeB].forEach(function (route) {
            route.forEach(function (step) {
              var m = R32BY[step.mid];
              if (!m) return; // only R32 entry nodes carry a group-slot opponent
              ['a', 'b'].forEach(function (side) {
                var sl = m[side];
                if (sl.t === 'pos') { if (routeGroups.indexOf(sl.g) < 0) routeGroups.push(sl.g); }
                else if (sl.t === 'third' && sl.slot) { if (!thirdSeen[sl.slot]) { thirdSeen[sl.slot] = true; thirdGroups.push(sl.slot); } }
              });
            });
          });
        });
      }
      var relevantCount;
      routeGroups.forEach(push);
      thirdGroups.forEach(push);
      relevantCount = ordered.length;
      GL.forEach(push); // remaining groups, collapsed by default
      return { order: ordered, relevantCount: relevantCount };
    }

    function teams() { var t = []; GL.forEach(function (g) { GROUPS[g].forEach(function (x) { t.push(x); }); }); return t.sort(); }

    // Per-fixture display state for the view.
    // shown = what fills the inputs (override, else the live/final score, else empty).
    function fixtureStatus(fid) {
      var lv = state.live[fid];
      var mine = state.results[fid] !== undefined;
      var real = official(fid);                  // final result if any
      var liveOn = !!(lv && lv.live);            // in progress now
      var st = real ? 'finished' : (liveOn ? 'live' : 'upcoming');
      var shown = mine ? state.results[fid] : current(fid);
      var dateISO = (lv && lv.dateISO) || null;  // group-fixture kickoff date from the live feed
      return { state: st, mine: mine, real: real, shown: shown, live: liveOn, dateISO: dateISO };
    }

    return {
      GL: GL, GROUPS: GROUPS, RANK: RANK, FIX: FIX, FIXBY: FIXBY, ORDER: ORDER, R32: R32, KO: KO,
      RN: RN, RIDX: RIDX, RNAME: RNAME, RSHORT: RSHORT, RCLS: RCLS, ORD: ORD,
      rank: rank, groupOf: groupOf, teams: teams,
      state: state,
      setLiveScores: function (gamesPayload) { state.live = indexLiveByFixture(FIX, parseGroupGames(gamesPayload)); return Object.keys(state.live).length; },
      official: official, current: current, committed: committed,
      standings: standings, clinchedWinner: clinchedWinner,
      scenarios: scenarios, earliestAny: earliestAny,
      setSchedule: function (gamesPayload) { state.schedule = buildScheduleByMatchId(gamesPayload); return Object.keys(state.schedule).length; },
      scheduleFor: scheduleFor,
      scenariosWithDates: scenariosWithDates, earliestAnyWithDates: earliestAnyWithDates,
      relevantGroups: relevantGroups,
      fixtureStatus: fixtureStatus
    };
  }

  var WC = {
    API_BASE: API_BASE,
    NAME_MAP: NAME_MAP,
    normalizeName: normalizeName,
    normalizeRound: normalizeRound,
    toISODate: toISODate,
    buildScheduleByMatchId: buildScheduleByMatchId,
    parseGroupGames: parseGroupGames,
    indexLiveByFixture: indexLiveByFixture,
    fetchLive: fetchLive,
    createModel: createModel
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = WC;
  else global.WC = WC;
})(typeof globalThis !== 'undefined' ? globalThis : this);
