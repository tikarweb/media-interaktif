'use strict';
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');

function pairs(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ k: 'p' + i, a: 'A' + i, b: 'B' + i });
  return out;
}

const VARIANTS = ['landscape', 'portrait'];

test('jumlah ubin tiap bentuk = pasang x 2 (lebar & tegak)', () => {
  E.LAYOUT_ORDER.forEach((id) => {
    const L = E.LAYOUTS[id];
    VARIANTS.forEach((v) => assert.strictEqual(E.buildPositions(L, v).length, L.pasang * 2, id + ' ' + v));
  });
});

test('tidak ada dua ubin menumpuk di tempat yang sama', () => {
  E.LAYOUT_ORDER.forEach((id) => VARIANTS.forEach((v) => {
    const p = E.buildPositions(E.LAYOUTS[id], v);
    p.forEach((a, i) => p.forEach((b, j) => {
      if (i < j && a.z === b.z) assert.ok(Math.abs(a.x - b.x) >= 2 || Math.abs(a.y - b.y) >= 2, id + ' ' + v);
    }));
  }));
});

test('aturan ubin bebas: hanya ujung baris & puncak yang bebas', () => {
  const g = E.newGame({ layoutId: 'kecil', pairs: pairs(12), seed: 1 });
  // papan 6x4 satu lapis: bebas = kolom paling kiri & kanan = 8 ubin
  assert.strictEqual(E.freeTiles(g).length, 8);
  const s = E.newGame({ layoutId: 'sedang', pairs: pairs(18), seed: 1 });
  const free = E.freeTiles(s);
  assert.ok(free.every((t) => !s.tiles.some((o) => !o.removed && o.z === t.z + 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2)));
  // ubin yang tertutup tidak boleh bebas
  const covered = s.tiles.find((t) => t.z === 0 && s.tiles.some((o) => o.z === 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2));
  assert.strictEqual(E.isFree(s, covered.id), false);
});

test('setiap kunci muncul tepat dua kali dengan sisi berbeda', () => {
  E.LAYOUT_ORDER.forEach((id) => {
    const L = E.LAYOUTS[id];
    const g = E.newGame({ layoutId: id, pairs: pairs(40), seed: 7 });
    const by = {};
    g.tiles.forEach((t) => { (by[t.k] = by[t.k] || []).push(t.side); });
    assert.strictEqual(Object.keys(by).length, L.pasang);
    Object.values(by).forEach((s) => assert.deepStrictEqual(s.slice().sort(), ['a', 'b']));
  });
});

test('papan selalu bisa diselesaikan (ulang urutan solusi) — 150 benih x semua bentuk x lebar/tegak', () => {
  E.LAYOUT_ORDER.forEach((id) => VARIANTS.forEach((variant) => {
    for (let seed = 1; seed <= 150; seed++) {
      const g = E.newGame({ layoutId: id, variant, pairs: pairs(40), seed });
      g.solution.forEach((s) => {
        assert.strictEqual(E.pick(g, s[0]).type, 'select', id + ' ' + seed);
        const r = E.pick(g, s[1]);
        assert.strictEqual(r.type, 'match', id + ' ' + seed);
      });
      assert.ok(E.isWon(g));
    }
  }));
});

test('benih yang sama menghasilkan papan yang sama', () => {
  const a = E.newGame({ layoutId: 'besar', pairs: pairs(30), seed: 99 });
  const b = E.newGame({ layoutId: 'besar', pairs: pairs(30), seed: 99 });
  assert.deepStrictEqual(a.tiles.map((t) => t.k + t.side), b.tiles.map((t) => t.k + t.side));
});

test('salah pilih: kesalahan dicatat, pilihan dikosongkan', () => {
  const g = E.newGame({ layoutId: 'kecil', pairs: pairs(12), seed: 3 });
  const f = E.freeTiles(g);
  const a = f[0];
  const b = f.find((t) => t.k !== a.k);
  E.pick(g, a.id);
  const r = E.pick(g, b.id);
  assert.strictEqual(r.type, 'mismatch');
  assert.strictEqual(g.stats.mistakes, 1);
  assert.strictEqual(g.selected, null);
  assert.ok(g.missed[a.k] >= 1 && g.missed[b.k] >= 1);
});

test('dua ubin sisi sama dengan kunci sama bukan pasangan (tidak ada di papan, tapi aman)', () => {
  const g = E.newGame({ layoutId: 'kecil', pairs: pairs(12), seed: 4 });
  const a = g.tiles[0];
  E.pick(g, a.id);
  const r = E.pick(g, a.id);
  assert.strictEqual(r.type, 'deselect');
});

test('ubin terkunci tidak bisa dipilih', () => {
  const g = E.newGame({ layoutId: 'sedang', pairs: pairs(18), seed: 5 });
  const locked = g.tiles.find((t) => !E.isFree(g, t.id));
  assert.strictEqual(E.pick(g, locked.id).type, 'blocked');
  assert.strictEqual(g.selected, null);
});

test('undo mengembalikan pasangan terakhir', () => {
  const g = E.newGame({ layoutId: 'kecil', pairs: pairs(12), seed: 6 });
  const s = g.solution[0];
  E.pick(g, s[0]); E.pick(g, s[1]);
  assert.strictEqual(E.remaining(g), 22);
  assert.deepStrictEqual(E.undo(g), s);
  assert.strictEqual(E.remaining(g), 24);
  assert.strictEqual(E.undo(g), null);
});

test('petunjuk selalu memberi pasangan yang bisa diambil', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const g = E.newGame({ layoutId: 'besar', pairs: pairs(30), seed });
    const h = E.hint(g);
    assert.ok(h, 'ada petunjuk');
    assert.strictEqual(E.pick(g, h[0]).type, 'select');
    assert.strictEqual(E.pick(g, h[1]).type, 'match');
  }
});

test('acak ulang: jumlah tetap, tetap bisa diselesaikan', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const g = E.newGame({ layoutId: 'sedang', pairs: pairs(18), seed });
    // mainkan beberapa langkah lalu acak
    for (let i = 0; i < 5; i++) { const s = g.solution[i]; E.pick(g, s[0]); E.pick(g, s[1]); }
    const before = E.remaining(g);
    assert.ok(E.shuffleBoard(g));
    assert.strictEqual(E.remaining(g), before);
    assert.strictEqual(g.stats.shuffles, 1);
    g.solution.forEach((s) => {
      E.pick(g, s[0]);
      assert.strictEqual(E.pick(g, s[1]).type, 'match');
    });
    assert.ok(E.isWon(g));
  }
});

test('permainan acak penuh (pemain ceroboh) tidak membuat mesin error dan acak ulang menyelamatkan', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const g = E.newGame({ layoutId: 'besar', pairs: pairs(30), seed });
    let guard = 0;
    while (!E.isWon(g) && guard++ < 500) {
      const m = E.findMatch(g);
      if (!m) { assert.ok(E.shuffleBoard(g)); continue; }
      E.pick(g, m[0]); E.pick(g, m[1]);
    }
    assert.ok(E.isWon(g), 'seed ' + seed);
  }
});

test('bintang & rangkuman belajar', () => {
  const g = E.newGame({ layoutId: 'kecil', pairs: pairs(12), seed: 8 });
  assert.strictEqual(E.stars(g), 3);
  g.stats.mistakes = 12;
  assert.strictEqual(E.stars(g), 1);
  g.stats.mistakes = 4;
  assert.strictEqual(E.stars(g), 2);
  g.missed = { [Object.keys(g.pairs)[0]]: 3, [Object.keys(g.pairs)[1]]: 5 };
  const r = E.review(g);
  assert.strictEqual(r[0].n, 5);
  assert.ok(r[0].pair);
});

test('pasangan kurang -> error jelas', () => {
  assert.throws(() => E.newGame({ layoutId: 'besar', pairs: pairs(5), seed: 1 }), /Pasangan kurang/);
});

// ---------- Pengujian data ----------
const D = require('../js/data.js');

test('data: setiap paket punya id unik, pasangan unik, dan cukup untuk papan kecil', () => {
  const ids = new Set();
  D.PACKS.forEach((p) => {
    assert.ok(!ids.has(p.id), 'id ganda ' + p.id); ids.add(p.id);
    assert.ok(p.pairs.length >= 12, p.id + ' kurang dari 12 pasang');
    const ks = new Set(), as = new Set(), bs = new Set();
    p.pairs.forEach((x) => {
      assert.ok(!ks.has(x.k), p.id + ' kunci ganda ' + x.k); ks.add(x.k);
      assert.ok(!as.has(x.a), p.id + ' sisi Arab ganda ' + x.a); as.add(x.a);
      assert.ok(!bs.has(x.b), p.id + ' sisi arti ganda ' + x.b + ' (ubin akan membingungkan)'); bs.add(x.b);
      assert.ok(x.a && x.b);
    });
    assert.ok(D.TINGKAT.some((t) => t.id === p.tingkat), p.id + ' tingkat tidak dikenal');
  });
});

test('data: tiap paket bisa membuat papan di semua ukuran yang muat', () => {
  D.PACKS.forEach((p) => {
    E.LAYOUT_ORDER.forEach((id) => {
      if (p.pairs.length < E.LAYOUTS[id].pasang) return;
      for (let s = 1; s <= 5; s++) {
        const g = E.newGame({ layoutId: id, pairs: p.pairs, seed: s });
        g.solution.forEach((sol) => { E.pick(g, sol[0]); assert.strictEqual(E.pick(g, sol[1]).type, 'match'); });
        assert.ok(E.isWon(g), p.id + ' ' + id);
      }
    });
  });
});

test('data: harakat pada kosakata tema Sekolah/Rumah/Kota sama dengan Haraka Syadid', () => {
  const sek = D.PACKS.find((p) => p.id === 'sekolah');
  assert.strictEqual(sek.pairs.length, 12);
  assert.strictEqual(sek.pairs[0].a, 'كَاتِب');
  assert.strictEqual(D.PACKS.find((p) => p.id === 'campur-1').pairs.length, 36);
});
