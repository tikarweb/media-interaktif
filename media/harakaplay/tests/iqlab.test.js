// Uji mode Iqlab (Rangkai Kata), Waahid & Tangkap, dan data kosakata
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config');
const deck = require('../js/game/deck');
const GS = require('../js/game/game-state');
const bot = require('../js/game/bot');

test('data kata: 20 kata, tiap kata 3 suku kata, huruf valid & berbeda', () => {
  assert.equal(config.WORDS.length, 20);
  config.WORDS.forEach((w) => {
    assert.equal(w.syllables.length, 3, w.id);
    assert.equal(new Set(w.syllables.map((s) => s.letter)).size, 3, w.id + ' huruf berbeda');
    w.syllables.forEach((s) => {
      assert.ok(config.letterById[s.letter], w.id + ' huruf ' + s.letter);
      assert.ok(config.harakaById[s.haraka], w.id + ' harakat');
    });
    assert.ok(w.arti && w.arab, w.id);
  });
});

test('paket Iqlab: dek valid, id unik, tiap kata target bisa dirangkai dari dek', () => {
  assert.equal(config.PACKS.length, 4);
  config.PACKS.forEach((p) => {
    const d = deck.createDeck(p.id);
    assert.equal(new Set(d.map((c) => c.id)).size, d.length);
    p.words.forEach((wid) => config.wordById[wid].syllables.forEach((s) => {
      assert.ok(d.some((c) => c.letter === s.letter && c.haraka === s.haraka), p.id + ' ' + wid);
    }));
  });
});

function game(level, seed) {
  return GS.createGame({ level, rng: deck.seededRng(seed || 5),
    players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }] });
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// pasang kartu A = suku kata target, dan buka kartu atas yang cocok warna
function rig(s, handCards) {
  const t = clone(s);
  const hand = handCards.map((sy, i) => {
    const c = t.drawPile.find((x) => x.type === 'normal' && x.letter === sy.letter && x.haraka === sy.haraka);
    t.drawPile.splice(t.drawPile.indexOf(c), 1);
    return c;
  });
  t.players[0].hand.forEach((c) => t.drawPile.push(c));
  t.players[0].hand = hand.concat(t.drawPile.splice(0, 3));
  t.turn = 0;
  t.drawnCardId = null;
  const top = clone(hand[0]);
  t.discardPile = [Object.assign({}, top, { id: 'top-x' })];
  t.activeColor = hand[0].color; t.activeHaraka = hand[0].haraka;
  return t;
}

test('Iqlab: kartu suku kata target mengisi slot (urutan bebas); selesai -> bonus & kata baru', () => {
  let s = game('p1');
  assert.equal(s.mode, 'iqlab');
  const w = config.wordById[s.target.wordId];
  s = rig(s, [w.syllables[2], w.syllables[0], w.syllables[1]]);
  const rng = deck.seededRng(9);
  let r = GS.applyAction(s, { type: 'play', playerId: 'A', cardId: s.players[0].hand[0].id }, { rng });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.deepEqual(r.state.target.filled, [false, false, true]);
  assert.ok(r.events.some((e) => e.type === 'slot' && e.index === 2));
  // sisanya dimainkan langsung oleh pemain yang sama lewat state rig (warna cocok)
  let t = clone(r.state); t.turn = 0;
  t.activeColor = t.players[0].hand[0].color; t.activeHaraka = t.players[0].hand[0].haraka;
  r = GS.applyAction(t, { type: 'play', playerId: 'A', cardId: t.players[0].hand[0].id }, { rng });
  assert.equal(r.ok, true, JSON.stringify(r));
  t = clone(r.state); t.turn = 0;
  t.activeColor = t.players[0].hand[0].color; t.activeHaraka = t.players[0].hand[0].haraka;
  const before = t.players[1].hand.length;
  const wid = t.target.wordId;
  r = GS.applyAction(t, { type: 'play', playerId: 'A', cardId: t.players[0].hand[0].id }, { rng });
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.ok(r.events.some((e) => e.type === 'wordComplete' && e.wordId === wid));
  assert.equal(r.state.wordsBy.A, 1);
  assert.equal(r.state.wordsDone.length, 1);
  assert.deepEqual(r.state.target.filled, [false, false, false], 'target baru kosong');
  assert.notEqual(r.state.target.wordId, undefined);
  const bonus = r.events.find((e) => e.type === 'bonus');
  assert.ok(bonus && bonus.count === config.WORD_BONUS_DRAW);
  assert.equal(r.state.players[1].hand.length, before + config.WORD_BONUS_DRAW);
});

test('Asasi tidak punya target kata', () => {
  const s = game('l1');
  assert.equal(s.mode, 'asasi');
  assert.equal(s.target, null);
});

function oneLeft() {
  let s = game('l1', 21);
  const t = clone(s);
  t.turn = 0;
  const keep = t.players[0].hand[0];
  const top = clone(keep);
  t.players[0].hand = [keep, t.players[0].hand[1]];
  t.discardPile = [Object.assign({}, top, { id: 'top-y' })];
  t.activeColor = keep.color; t.activeHaraka = keep.haraka;
  return t;
}

test('Waahid: tinggal 1 kartu membuka jendela; menekan Waahid menutupnya tanpa denda', () => {
  const t = oneLeft();
  let r = GS.applyAction(t, { type: 'play', playerId: t.players[0].id, cardId: t.players[0].hand[0].id }, { rng: deck.seededRng(1) });
  assert.equal(r.ok, true);
  assert.equal(r.state.waahidFor, t.players[0].id);
  const w = GS.applyAction(r.state, { type: 'waahid', playerId: t.players[0].id });
  assert.equal(w.ok, true);
  assert.equal(w.state.waahidFor, null);
  const c = GS.applyAction(w.state, { type: 'catch', playerId: t.players[1].id });
  assert.equal(c.ok, false);
  assert.equal(c.code, 'nothing_to_catch');
});

test('Tangkap: lawan menangkap pemain yang lupa -> kena denda kartu; tak bisa tangkap diri sendiri', () => {
  const t = oneLeft();
  const r = GS.applyAction(t, { type: 'play', playerId: t.players[0].id, cardId: t.players[0].hand[0].id }, { rng: deck.seededRng(1) });
  assert.equal(GS.applyAction(r.state, { type: 'catch', playerId: t.players[0].id }).code, 'cannot_catch_self');
  const c = GS.applyAction(r.state, { type: 'catch', playerId: t.players[1].id }, { rng: deck.seededRng(2) });
  assert.equal(c.ok, true);
  assert.equal(c.state.players[0].hand.length, 1 + config.WAAHID_PENALTY);
  assert.equal(c.state.waahidFor, null);
  assert.ok(c.events.some((e) => e.type === 'caught' && e.playerId === t.players[0].id && e.byId === t.players[1].id));
});

test('Jendela Waahid tertutup begitu pemain berikutnya beraksi', () => {
  const t = oneLeft();
  let r = GS.applyAction(t, { type: 'play', playerId: t.players[0].id, cardId: t.players[0].hand[0].id }, { rng: deck.seededRng(1) });
  const next = r.state.players[r.state.turn].id;
  r = GS.applyAction(r.state, { type: 'draw', playerId: next }, { rng: deck.seededRng(3) });
  assert.equal(r.state.waahidFor, null);
});

test('Waahid sebelum waktunya ditolak', () => {
  const s = game('l1');
  const r = GS.applyAction(s, { type: 'waahid', playerId: 'A' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'waahid_not_yet');
});

test('simulasi bot: paket p1-p4, 150 ronde selesai, jumlah kartu tetap, view tak bocor', () => {
  config.PACKS.forEach((p) => {
    const total = deck.createDeck(p.id).length;
    let words = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const rng = deck.seededRng(seed * 13 + total);
      const n = 2 + (seed % 3);
      const players = [];
      for (let i = 0; i < n; i++) players.push({ id: 'b' + i, name: 'B' + i, isBot: true });
      let s = GS.createGame({ players, level: p.id, rng });
      let guard = 0;
      while (s.phase === 'playing' && guard++ < 3000) {
        const cur = s.players[s.turn].id;
        const act = bot.chooseAction(GS.getView(s, cur));
        let r = GS.applyAction(s, act, { rng });
        if (!r.ok) { r = GS.applyAction(s, { type: 'draw', playerId: cur }, { rng }); if (!r.ok) r = GS.applyAction(s, { type: 'pass', playerId: cur }, { rng }); }
        assert.equal(r.ok, true, p.id + ' seed ' + seed + ' ' + JSON.stringify(r));
        s = r.state;
        const count = s.drawPile.length + s.discardPile.length + s.players.reduce((a, q) => a + q.hand.length, 0);
        assert.equal(count, total, p.id + ' jumlah kartu');
      }
      assert.equal(s.phase, 'finished', p.id + ' seed ' + seed);
      words += s.wordsDone.length;
      const v = GS.getView(s, 'b0');
      assert.ok(!('drawPile' in v) && !('wordQueue' in v));
    }
    assert.ok(words > 0, p.id + ' kata selesai di simulasi');
  });
});
