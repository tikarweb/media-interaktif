// Uji mode Haraka Syadid: data kosakata gundul, kartu kata, kuis arti, bot
const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../js/config');
const deck = require('../js/game/deck');
const rules = require('../js/game/rules');
const GS = require('../js/game/game-state');
const bot = require('../js/game/bot');

const HARAKAT_RE = /[ً-ْٰ]/g;
const clone = (o) => JSON.parse(JSON.stringify(o));

test('data kosakata: gundul + berharakat sama, pola valid, id unik, arti unik per tema', () => {
  assert.equal(config.VOCAB.length, 36);
  assert.equal(new Set(config.VOCAB.map((v) => v.id)).size, 36);
  config.VOCAB.forEach((v) => {
    assert.ok(v.arab && v.arti && v.voc, v.id);
    assert.equal(v.arab.search(HARAKAT_RE), -1, v.id + ' arab harus gundul');
    assert.equal(v.voc.replace(HARAKAT_RE, ''), v.arab, v.id + ' voc harus sama dengan arab + harakat');
    assert.ok(config.polaById[v.pola], v.id + ' pola');
    assert.ok(!config.wordById[v.id], v.id + ' bentrok dengan id kata Iqlab');
  });
  assert.equal(config.THEMES.length, 3);
  config.THEMES.forEach((t) => {
    assert.equal(t.vocab.length, 12);
    assert.equal(new Set(t.vocab.map((id) => config.vocabById[id].arti)).size, 12, t.id + ' arti unik');
    config.POLAS.forEach((p) => {
      assert.equal(t.vocab.filter((id) => config.vocabById[id].pola === p.id).length, 3, t.id + ' ' + p.id);
    });
  });
});

test('mode Syadid tersedia, dek tema: 48 kartu kata + 12 khusus, id unik', () => {
  assert.equal(config.getMode('syadid').available, true);
  assert.equal(config.getMode('syadid').showLatin, false);
  config.THEMES.forEach((t) => {
    const d = deck.createDeck(t.id);
    assert.equal(d.length, 60);
    assert.equal(new Set(d.map((c) => c.id)).size, 60);
    const words = d.filter((c) => c.type === 'normal');
    assert.equal(words.length, 48);
    words.forEach((c) => assert.equal(c.haraka, config.vocabById[c.word].pola));
  });
  assert.equal(config.modeOfLevel('s2'), 'syadid');
});

function game(level, seed) {
  return GS.createGame({ level, rng: deck.seededRng(seed || 3),
    players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }] });
}

// Kartu kata yang cocok (warna sama) untuk pemain giliran sekarang; rig agar pasti ada
function rigPlayable(s) {
  const t = clone(s);
  const me = t.players[t.turn];
  const topColor = t.activeColor;
  let c = me.hand.find((x) => x.type === 'normal' && x.color === topColor);
  if (!c) {
    c = t.drawPile.find((x) => x.type === 'normal' && x.color === topColor);
    t.drawPile.splice(t.drawPile.indexOf(c), 1);
    me.hand.push(c);
  }
  return { t, me, card: c };
}

test('Syadid: main kartu tanpa jawaban -> need_quiz, state tidak berubah', () => {
  const { t, me, card } = rigPlayable(game('s1'));
  assert.equal(t.mode, 'syadid');
  const r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: card.id });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'need_quiz');
  assert.equal(r.needs, 'quiz');
  assert.deepEqual(r.state, t);
});

test('Syadid: kartu tidak cocok ditolak SEBELUM kuis (tidak perlu menjawab)', () => {
  const t0 = game('s1');
  const t = clone(t0);
  const me = t.players[t.turn];
  const bad = t.drawPile.find((x) => x.type === 'normal' && x.color !== t.activeColor && x.haraka !== t.activeHaraka);
  t.drawPile.splice(t.drawPile.indexOf(bad), 1);
  me.hand.push(bad);
  const r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: bad.id });
  assert.equal(r.code, 'card_not_playable');
});

test('Syadid: cocok juga lewat POLA yang sama (warna beda)', () => {
  const t = clone(game('s1'));
  const me = t.players[t.turn];
  const c = t.drawPile.find((x) => x.type === 'normal' && x.color !== t.activeColor && x.haraka === t.activeHaraka);
  t.drawPile.splice(t.drawPile.indexOf(c), 1);
  me.hand.push(c);
  assert.equal(rules.isPlayable(c, t.activeColor, t.activeHaraka), true);
  const r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: c.id, answer: c.word });
  assert.equal(r.ok, true);
  assert.equal(r.state.activeHaraka, c.haraka);
  assert.equal(r.state.activeColor, c.color);
});

test('Syadid: jawaban benar -> kartu dimainkan, statistik ok bertambah', () => {
  const { t, me, card } = rigPlayable(game('s1'));
  const r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: card.id, answer: card.word });
  assert.equal(r.ok, true);
  assert.equal(r.state.discardPile[r.state.discardPile.length - 1].id, card.id);
  assert.equal(r.state.quizBy[me.id].ok, 1);
  assert.equal(r.state.quizBy[me.id].no, 0);
  assert.ok(r.events.some((e) => e.type === 'quizOk'));
});

test('Syadid: jawaban salah -> ambil 1 kartu, kartu tetap di tangan, giliran pindah, tercatat', () => {
  const { t, me, card } = rigPlayable(game('s1'));
  const before = me.hand.length;
  const wrong = config.THEMES[0].vocab.find((id) => id !== card.word);
  const r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: card.id, answer: wrong });
  assert.equal(r.ok, true);
  const mine = r.state.players.find((p) => p.id === me.id);
  assert.equal(mine.hand.length, before + 1);
  assert.ok(mine.hand.some((c) => c.id === card.id), 'kartu tetap di tangan');
  assert.equal(r.state.discardPile.length, t.discardPile.length, 'buangan tidak berubah');
  assert.notEqual(r.state.players[r.state.turn].id, me.id, 'giliran pindah');
  assert.equal(r.state.drawnCardId, null);
  assert.equal(r.state.quizBy[me.id].no, 1);
  assert.deepEqual(r.state.quizMissed, [{ wordId: card.word, by: me.id }]);
  assert.ok(r.events.some((e) => e.type === 'quizWrong'));
  assert.equal(r.state.version, t.version + 1);
});

test('Syadid: kartu khusus (Draw 1, Ganti Pola, Ganti Warna) tanpa kuis; pola dibatasi tema', () => {
  const t = clone(game('s2'));
  const me = t.players[t.turn];
  const ch = t.drawPile.find((x) => x.type === 'changeHaraka');
  t.drawPile.splice(t.drawPile.indexOf(ch), 1);
  ch.color = t.activeColor;
  me.hand.push(ch);
  let r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: ch.id });
  assert.equal(r.code, 'need_choice');
  assert.equal(r.needs, 'haraka');
  r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: ch.id, choice: 'fathah' });
  assert.equal(r.code, 'invalid_choice');
  r = GS.applyAction(t, { type: 'play', playerId: me.id, cardId: ch.id, choice: 'mafal' });
  assert.equal(r.ok, true);
  assert.equal(r.state.activeHaraka, 'mafal');
});

test('Syadid: kartu terakhir dengan jawaban benar -> menang; salah -> belum menang', () => {
  const { t, me, card } = rigPlayable(game('s3'));
  const x = clone(t);
  const p = x.players[x.turn];
  x.drawPile = x.drawPile.concat(p.hand.filter((c) => c.id !== card.id));
  p.hand = [x.players[x.turn].hand.find((c) => c.id === card.id)];
  const wrong = config.THEMES[2].vocab.find((id) => id !== card.word);
  let r = GS.applyAction(x, { type: 'play', playerId: p.id, cardId: card.id, answer: wrong });
  assert.equal(r.state.phase, 'playing');
  assert.equal(r.state.players.find((q) => q.id === p.id).hand.length, 2);
  r = GS.applyAction(x, { type: 'play', playerId: p.id, cardId: card.id, answer: card.word });
  assert.equal(r.state.phase, 'finished');
  assert.equal(r.state.winnerId, p.id);
});

test('quizOptions: 3 pilihan unik, ada jawaban benar, dari tema yang sama', () => {
  for (let i = 0; i < 50; i++) {
    const t = config.THEMES[i % 3];
    const wid = t.vocab[i % 12];
    const o = rules.quizOptions(wid, t.id);
    assert.equal(o.length, 3);
    assert.equal(new Set(o.map((x) => x.arti)).size, 3);
    assert.ok(o.some((x) => x.id === wid));
    o.forEach((x) => assert.ok(t.vocab.includes(x.id)));
  }
});

test('Syadid: bot menjawab kuis dan simulasi 60 permainan selalu selesai tanpa macet', () => {
  let wrongSeen = 0, okSeen = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const lv = config.THEMES[seed % 3].id;
    let s = GS.createGame({ level: lv, rng: deck.seededRng(seed),
      players: [{ id: 'A', name: 'A', isBot: true }, { id: 'B', name: 'B', isBot: true }, { id: 'C', name: 'C', isBot: true }] });
    let steps = 0;
    while (s.phase === 'playing' && steps++ < 4000) {
      const id = s.players[s.turn].id;
      const act = bot.chooseAction(GS.getView(s, id));
      act.playerId = id;
      let r = GS.applyAction(s, act, { rng: deck.seededRng(seed + steps) });
      if (!r.ok) r = GS.applyAction(s, { type: 'draw', playerId: id });
      if (!r.ok) r = GS.applyAction(s, { type: 'pass', playerId: id });
      assert.ok(r.ok, 'bot macet: ' + (r.code || ''));
      r.events.forEach((e) => { if (e.type === 'quizWrong') wrongSeen++; if (e.type === 'quizOk') okSeen++; });
      s = r.state;
    }
    assert.equal(s.phase, 'finished', 'seed ' + seed + ' tidak selesai');
    const total = Object.values(s.quizBy).reduce((n, q) => n + q.ok + q.no, 0);
    assert.equal(total, s.quizMissed.length + Object.values(s.quizBy).reduce((n, q) => n + q.ok, 0));
  }
  assert.ok(wrongSeen > 0 && okSeen > wrongSeen, 'bot kadang salah, lebih sering benar');
});

test('getView memuat statistik kuis', () => {
  const s = game('s1');
  const v = GS.getView(s, 'A');
  assert.equal(v.mode, 'syadid');
  assert.deepEqual(v.quizMissed, []);
  assert.deepEqual(Object.keys(v.quizBy).sort(), ['A', 'B', 'C']);
});
