// Uji sistem level (huruf + harakat per level)
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config');
const deck = require('../js/game/deck');
const GS = require('../js/game/game-state');
const bot = require('../js/game/bot');
const rules = require('../js/game/rules');

test('ada 7 level, semua huruf & harakat yang dirujuk level itu ada', () => {
  assert.equal(config.LEVELS.length, 7);
  config.LEVELS.forEach((l) => {
    l.letters.forEach((id) => assert.ok(config.letterById[id], l.id + ' huruf ' + id));
    l.harakat.forEach((id) => assert.ok(config.harakaById[id], l.id + ' harakat ' + id));
  });
  assert.equal(config.LETTERS.length, 29, '28 huruf + hamzah');
});

test('Level 1-6 mencakup semua 29 huruf (28 + hamzah) tepat sekali (L1-L6), tanpa huruf ganda', () => {
  const seen = [];
  config.LEVELS.slice(0, 6).forEach((l) => seen.push(...l.letters));
  assert.equal(seen.length, 29);
  assert.equal(new Set(seen).size, 29);
});

test('ukuran dek per level: huruf x harakat x 4 warna + 12 khusus; id unik', () => {
  config.LEVELS.forEach((l) => {
    const d = deck.createDeck(l.id);
    assert.equal(d.length, l.letters.length * l.harakat.length * 4 + 12, l.id);
    assert.equal(new Set(d.map((c) => c.id)).size, d.length, 'id unik ' + l.id);
    d.filter((c) => c.type === 'normal').forEach((c) => {
      assert.ok(l.letters.includes(c.letter));
      assert.ok(l.harakat.includes(c.haraka));
    });
  });
  assert.equal(deck.createDeck('l1').length, 72);
  assert.equal(deck.createDeck().length, 72, 'tanpa argumen = Level 1');
  assert.equal(deck.createDeck('tidak-ada').length, 72, 'id tak dikenal = Level 1');
});

test('pilihan harakat hanya yang ada di level', () => {
  assert.equal(rules.isValidChoice('haraka', 'fathah', 'l1'), true);
  assert.equal(rules.isValidChoice('haraka', 'fathatain', 'l1'), false);
  assert.equal(rules.isValidChoice('haraka', 'fathah', 'l7'), false);
  assert.equal(rules.isValidChoice('haraka', 'dammatain', 'l7'), true);
});

test('Ganti Harakat menolak harakat di luar level', () => {
  const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const s = GS.createGame({ players, level: 'l1', rng: deck.seededRng(3) });
  const cur = s.players[s.turn];
  const card = { id: 'ch-' + s.activeColor, type: 'changeHaraka', color: s.activeColor };
  cur.hand.push(card, { id: 'pad', type: 'changeColor', color: null });
  const r = GS.applyAction(s, { type: 'play', playerId: cur.id, cardId: card.id, choice: 'fathatain' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_choice');
});

test('level tersimpan di status & view; level 7 hanya berisi tanwin', () => {
  const s = GS.createGame({ players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], level: 'l7' });
  assert.equal(s.level, 'l7');
  assert.equal(GS.getView(s, 'a').level, 'l7');
  assert.ok(['fathatain', 'kasratain', 'dammatain'].includes(s.activeHaraka));
  s.players.forEach((p) => p.hand.filter((c) => c.type === 'normal').forEach((c) =>
    assert.ok(['fathatain', 'kasratain', 'dammatain'].includes(c.haraka))));
});

test('simulasi bot lawan bot: tiap level, 150 ronde selesai, jumlah kartu tetap', () => {
  config.LEVELS.forEach((l) => {
    const total = deck.createDeck(l.id).length;
    for (let seed = 1; seed <= 150; seed++) {
      const rng = deck.seededRng(seed * 7 + l.letters.length);
      const n = 2 + (seed % 3);
      const players = [];
      for (let i = 0; i < n; i++) players.push({ id: 'b' + i, name: 'B' + i, isBot: true });
      let s = GS.createGame({ players, level: l.id, rng });
      let guard = 0;
      while (s.phase === 'playing' && guard++ < 3000) {
        const cur = s.players[s.turn].id;
        const act = bot.chooseAction(GS.getView(s, cur));
        let r = GS.applyAction(s, act, { rng });
        if (!r.ok) { r = GS.applyAction(s, { type: 'draw', playerId: cur }, { rng }); if (!r.ok) r = GS.applyAction(s, { type: 'pass', playerId: cur }, { rng }); }
        assert.equal(r.ok, true, l.id + ' seed ' + seed + ' ' + JSON.stringify(r));
        s = r.state;
        const count = s.drawPile.length + s.discardPile.length + s.players.reduce((a, p) => a + p.hand.length, 0);
        assert.equal(count, total, l.id + ' jumlah kartu');
      }
      assert.equal(s.phase, 'finished', l.id + ' seed ' + seed + ' macet');
    }
  });
});
