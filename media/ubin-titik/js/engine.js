/* =====================================================
   ENGINE.JS — mesin "Ubin Titik" (mahjong solitaire edukasi).
   Tidak menyentuh tampilan sama sekali, jadi bisa diuji dengan
   `node --test` dan dipakai ulang (mis. mode lain / online).

   Konsep:
   - Papan = kumpulan ubin berkoordinat (x, y, z). Satuan x,y = setengah
     ubin; satu ubin memakai 2 x 2 satuan. z = lapisan (0 = paling bawah).
   - Ubin "bebas" jika (1) tidak tertutup ubin di lapisan atasnya dan
     (2) sisi kirinya ATAU sisi kanannya kosong.
   - Satu pasangan = dua ubin dengan kunci (k) sama tapi sisi beda:
     sisi 'a' (mis. kata Arab) dan sisi 'b' (mis. artinya).
   - Papan dibuat dengan "memainkan terbalik": dua ubin bebas dipilih,
     diberi satu pasangan, dilepas, diulang. Jadi papan SELALU bisa
     diselesaikan (urutan penyelesaiannya disimpan di state.solution).
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UbinEngine = factory();
}(this, function () {
  'use strict';

  // ---------- Bilangan acak berbenih (agar bisa diulang & diuji) ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---------- Bentuk papan ----------
  // rows: tiap huruf 'X' = satu ubin; ox/oy = geser lapisan (satuan setengah ubin).
  var LAYOUTS = {
    kecil: {
      id: 'kecil', nama: 'Kecil', pasang: 12, ket: 'Satu lapis, santai',
      layers: [{ ox: 0, oy: 0, rows: ['XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'] }],
      portrait: [{ ox: 0, oy: 0, rows: ['XXXX', 'XXXX', 'XXXX', 'XXXX', 'XXXX', 'XXXX'] }]
    },
    sedang: {
      id: 'sedang', nama: 'Sedang', pasang: 18, ket: 'Dua lapis',
      layers: [
        { ox: 0, oy: 0, rows: ['XXXXXXX', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX'] },
        { ox: 3, oy: 2, rows: ['XXXX', 'XXXX'] }
      ],
      portrait: [
        { ox: 0, oy: 0, rows: ['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX'] },
        { ox: 3, oy: 3, rows: ['XX', 'XX', 'XX'] }
      ]
    },
    besar: {
      id: 'besar', nama: 'Besar', pasang: 24, ket: 'Tiga lapis',
      layers: [
        { ox: 0, oy: 0, rows: ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'] },
        { ox: 3, oy: 2, rows: ['XXXXXX', 'XXXXXX'] },
        { ox: 5, oy: 3, rows: ['XX', 'XX'] }
      ],
      portrait: [
        { ox: 0, oy: 0, rows: ['XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX', 'XXXXX'] },
        { ox: 3, oy: 4, rows: ['XX', 'XX', 'XX'] },
        { ox: 4, oy: 5, rows: ['X', 'X'] }
      ]
    },
    piramida: {
      id: 'piramida', nama: 'Piramida', pasang: 36, ket: 'Besar, butuh layar lebar',
      layers: [
        { ox: 0, oy: 0, rows: ['XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX', 'XXXXXXXX'] },
        { ox: 3, oy: 2, rows: ['XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'] }
      ],
      portrait: [
        { ox: 0, oy: 0, rows: ['XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX', 'XXXXXX'] },
        { ox: 3, oy: 3, rows: ['XXXX', 'XXXX', 'XXXX', 'XXXX'] },
        { ox: 6, oy: 4, rows: ['X', 'X'] }
      ]
    }
  };
  var LAYOUT_ORDER = ['kecil', 'sedang', 'besar', 'piramida'];

  // variant: 'portrait' = bentuk tegak (enak di HP berdiri); selain itu bentuk lebar
  function buildPositions(layout, variant) {
    var out = [], id = 0;
    var layers = variant === 'portrait' && layout.portrait ? layout.portrait : layout.layers;
    layers.forEach(function (L, z) {
      L.rows.forEach(function (row, r) {
        for (var c = 0; c < row.length; c++) {
          if (row.charAt(c) === 'X') out.push({ id: id++, x: L.ox + 2 * c, y: L.oy + 2 * r, z: z });
        }
      });
    });
    return out;
  }

  function bounds(positions) {
    var maxX = 0, maxY = 0, maxZ = 0;
    positions.forEach(function (p) {
      if (p.x + 2 > maxX) maxX = p.x + 2;
      if (p.y + 2 > maxY) maxY = p.y + 2;
      if (p.z > maxZ) maxZ = p.z;
    });
    return { w: maxX, h: maxY, layers: maxZ + 1 };
  }

  // ---------- Aturan "ubin bebas" ----------
  function isCovered(t, list) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o !== t && o.z === t.z + 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2) return true;
    }
    return false;
  }
  function sideBlocked(t, list, dir) {
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === t || o.z !== t.z || Math.abs(o.y - t.y) >= 2) continue;
      var dx = dir < 0 ? t.x - o.x : o.x - t.x;
      if (dx > 0 && dx <= 2) return true;
    }
    return false;
  }
  function freeIn(t, list) {
    return !isCovered(t, list) && (!sideBlocked(t, list, -1) || !sideBlocked(t, list, 1));
  }

  // ---------- Membuat papan yang pasti bisa diselesaikan ----------
  // positions: ubin yang masih ada; keys: kunci pasangan (jumlahnya = ubin/2)
  // Mengembalikan { tiles:[{id,x,y,z,k,side}], solution:[[idA,idB],...] } atau null
  function generate(positions, keys, rng) {
    var n = positions.length;
    for (var attempt = 0; attempt < 300; attempt++) {
      var remaining = positions.slice();
      var order = [], ok = true;
      while (remaining.length) {
        var free = remaining.filter(function (t) { return freeIn(t, remaining); });
        if (free.length < 2) { ok = false; break; }
        var chosen = null;
        for (var tries = 0; tries < 14 && !chosen; tries++) {
          var f = shuffled(free, rng);
          var a = f[0], b = f[1];
          var rest = remaining.filter(function (t) { return t !== a && t !== b; });
          if (rest.length === 0) { chosen = [a, b]; break; }
          var restFree = 0;
          for (var i = 0; i < rest.length && restFree < 2; i++) if (freeIn(rest[i], rest)) restFree++;
          if (restFree >= 2 || rest.length === 0) chosen = [a, b];
        }
        if (!chosen) { ok = false; break; }
        order.push(chosen);
        remaining = remaining.filter(function (t) { return t !== chosen[0] && t !== chosen[1]; });
      }
      if (!ok || order.length * 2 !== n) continue;

      var ks = shuffled(keys, rng), tiles = [], solution = [];
      order.forEach(function (pr, i) {
        var flip = rng() < 0.5;
        var A = pr[0], B = pr[1];
        tiles.push({ id: A.id, x: A.x, y: A.y, z: A.z, k: ks[i], side: flip ? 'a' : 'b', removed: false });
        tiles.push({ id: B.id, x: B.x, y: B.y, z: B.z, k: ks[i], side: flip ? 'b' : 'a', removed: false });
        solution.push([A.id, B.id]);
      });
      tiles.sort(function (p, q) { return p.id - q.id; });
      return { tiles: tiles, solution: solution };
    }
    return null;
  }

  // ---------- Permainan ----------
  function newGame(opts) {
    var layout = LAYOUTS[opts.layoutId];
    if (!layout) throw new Error('Bentuk papan tidak dikenal: ' + opts.layoutId);
    var variant = opts.variant === 'portrait' ? 'portrait' : 'landscape';
    var positions = buildPositions(layout, variant);
    var need = positions.length / 2;
    if (opts.pairs.length < need) throw new Error('Pasangan kurang: butuh ' + need + ', ada ' + opts.pairs.length);
    var seed = opts.seed == null ? Math.floor(Math.random() * 2147483647) : opts.seed;
    var rng = mulberry32(seed);
    var picked = shuffled(opts.pairs, rng).slice(0, need);
    var byKey = {};
    picked.forEach(function (p) { byKey[p.k] = p; });
    var g = generate(positions, picked.map(function (p) { return p.k; }), rng);
    if (!g) throw new Error('Gagal membuat papan');
    return {
      layoutId: layout.id, variant: variant, seed: seed, rng: rng,
      bounds: bounds(positions),
      pairs: byKey, pairsTotal: need,
      tiles: g.tiles, solution: g.solution,
      history: [], selected: null,
      stats: { moves: 0, mistakes: 0, hints: 0, shuffles: 0, undos: 0 },
      missed: {}
    };
  }

  function live(state) { return state.tiles.filter(function (t) { return !t.removed; }); }
  function tileById(state, id) { return state.tiles[id] && state.tiles[id].id === id ? state.tiles[id] : state.tiles.filter(function (t) { return t.id === id; })[0]; }
  function isFree(state, id) {
    var l = live(state), t = tileById(state, id);
    return !!t && !t.removed && freeIn(t, l);
  }
  function freeTiles(state) { var l = live(state); return l.filter(function (t) { return freeIn(t, l); }); }
  function remaining(state) { return live(state).length; }
  function isWon(state) { return remaining(state) === 0; }

  function findMatch(state) {
    var f = freeTiles(state), seen = {};
    for (var i = 0; i < f.length; i++) {
      var t = f[i];
      if (seen[t.k] !== undefined) {
        var o = seen[t.k];
        if (o.side !== t.side) return [o.id, t.id];
      } else seen[t.k] = t;
    }
    return null;
  }
  function hasMoves(state) { return findMatch(state) !== null; }

  // Petunjuk: utamakan pasangan dari urutan penyelesaian yang masih berlaku
  function hint(state) {
    state.stats.hints++;
    var l = live(state);
    for (var i = 0; i < state.solution.length; i++) {
      var s = state.solution[i];
      var a = tileById(state, s[0]), b = tileById(state, s[1]);
      if (!a.removed && !b.removed && freeIn(a, l) && freeIn(b, l)) return [a.id, b.id];
    }
    return findMatch(state);
  }

  function addMissed(state, k) { state.missed[k] = (state.missed[k] || 0) + 1; }

  // Satu ketukan pemain pada ubin id
  function pick(state, id) {
    var t = tileById(state, id);
    if (!t || t.removed) return { type: 'ignore' };
    if (!isFree(state, id)) return { type: 'blocked', id: id };
    if (state.selected === null) { state.selected = id; return { type: 'select', id: id }; }
    if (state.selected === id) { state.selected = null; return { type: 'deselect', id: id }; }
    var s = tileById(state, state.selected);
    state.selected = null;
    if (s.k === t.k && s.side !== t.side) {
      s.removed = true; t.removed = true;
      state.history.push([s.id, t.id]);
      state.stats.moves++;
      var won = isWon(state);
      return { type: 'match', ids: [s.id, t.id], k: t.k, won: won, stuck: !won && !hasMoves(state) };
    }
    state.stats.mistakes++;
    addMissed(state, s.k);
    if (t.k !== s.k) addMissed(state, t.k);
    return { type: 'mismatch', ids: [s.id, t.id] };
  }

  function undo(state) {
    if (!state.history.length) return null;
    var ids = state.history.pop();
    ids.forEach(function (id) { tileById(state, id).removed = false; });
    state.selected = null;
    state.stats.undos++;
    return ids;
  }

  // Acak ulang isi ubin yang tersisa (posisi tetap) — hasilnya tetap bisa diselesaikan
  function shuffleBoard(state) {
    var l = live(state);
    var keys = {}; l.forEach(function (t) { keys[t.k] = true; });
    var g = generate(l.map(function (t) { return { id: t.id, x: t.x, y: t.y, z: t.z }; }), Object.keys(keys), state.rng);
    if (!g) return false;
    g.tiles.forEach(function (n) { var t = tileById(state, n.id); t.k = n.k; t.side = n.side; });
    state.solution = g.solution;
    state.history = [];
    state.selected = null;
    state.stats.shuffles++;
    return true;
  }

  // ---------- Hasil & belajar ----------
  function penalty(state) { var s = state.stats; return s.mistakes + 2 * s.hints + 2 * s.shuffles; }
  function stars(state) {
    var p = penalty(state), n = state.pairsTotal;
    if (p <= Math.round(n * 0.15)) return 3;
    if (p <= Math.round(n * 0.5)) return 2;
    return 1;
  }
  // Kata yang paling sering keliru, urut dari yang terbanyak
  function review(state) {
    return Object.keys(state.missed)
      .map(function (k) { return { k: k, n: state.missed[k], pair: state.pairs[k] }; })
      .filter(function (r) { return r.pair; })
      .sort(function (a, b) { return b.n - a.n; });
  }

  return {
    LAYOUTS: LAYOUTS, LAYOUT_ORDER: LAYOUT_ORDER,
    mulberry32: mulberry32, buildPositions: buildPositions, bounds: bounds, freeIn: freeIn,
    newGame: newGame, isFree: isFree, freeTiles: freeTiles, remaining: remaining, isWon: isWon,
    findMatch: findMatch, hasMoves: hasMoves, hint: hint, pick: pick, undo: undo,
    shuffleBoard: shuffleBoard, stars: stars, penalty: penalty, review: review, tileById: tileById
  };
}));
