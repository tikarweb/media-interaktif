/* =====================================================
   Pengujian mesin permainan HarakaPlay (tahap 1).
   Jalankan dari folder harakaplay:   node --test tests/
   ===================================================== */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const config = require('../js/config');
const deck = require('../js/game/deck');
const rules = require('../js/game/rules');
const scoring = require('../js/game/scoring');
const game = require('../js/game/game-state');
const bot = require('../js/game/bot');

/* ---------- Bantuan membuat kartu & state tertentu ---------- */
const N = (color, letter, haraka) => ({ id: `n-${color}-${letter}-${haraka}`, type: 'normal', color, letter, haraka });
const D1 = (color) => ({ id: `d1-${color}`, type: 'draw1', color });
const CH = (color) => ({ id: `ch-${color}`, type: 'changeHaraka', color });
const CC = (i) => ({ id: `cc-${i}`, type: 'changeColor', color: null });

// State kecil yang bisa diatur penuh. hands: {A:[...], B:[...], C:[...]}
function makeState({ hands, top, drawPile, turn = 0, scores }) {
  const ids = Object.keys(hands);
  return {
    version: 0, round: 1, phase: 'playing',
    players: ids.map((id) => ({ id, name: id, isBot: false, hand: hands[id] })),
    drawPile: drawPile || [N('red', 'ba', 'fathah'), N('red', 'ta', 'kasrah'), N('green', 'jim', 'dammah')],
    discardPile: [top],
    turn,
    activeColor: top.color,
    activeHaraka: top.haraka,
    drawnCardId: null, winnerId: null, roundScore: 0,
    scores: scores || Object.fromEntries(ids.map((i) => [i, 0]))
  };
}
const play = (s, playerId, cardId, choice) =>
  game.applyAction(s, { type: 'play', playerId, cardId, choice });

const TOP_BLUE_FATHAH = N('blue', 'ba', 'fathah');

/* ---------- Komposisi kartu ---------- */
test('komposisi: total 72 kartu dengan ID unik', () => {
  const cards = deck.createDeck();
  assert.equal(cards.length, 72);
  assert.equal(new Set(cards.map((c) => c.id)).size, 72);
});

test('komposisi: 60 kartu biasa, tiap kombinasi huruf-harakat-warna tepat satu', () => {
  const normals = deck.createDeck().filter((c) => c.type === 'normal');
  assert.equal(normals.length, 5 * 3 * 4);
  const combos = new Set(normals.map((c) => `${c.color}|${c.letter}|${c.haraka}`));
  assert.equal(combos.size, 60);
  assert.deepEqual([...new Set(normals.map((c) => c.letter))].sort(), ['ba', 'ha', 'jim', 'ta', 'tsa']);
  assert.deepEqual([...new Set(normals.map((c) => c.haraka))].sort(), ['dammah', 'fathah', 'kasrah']);
});

test('komposisi: 4 Draw 1, 4 Ganti Harakat, 4 Ganti Warna', () => {
  const cards = deck.createDeck();
  assert.equal(cards.filter((c) => c.type === 'draw1').length, 4);
  assert.equal(cards.filter((c) => c.type === 'changeHaraka').length, 4);
  assert.equal(cards.filter((c) => c.type === 'changeColor').length, 4);
});

/* ---------- Pembagian kartu ---------- */
test('pembagian: tiap pemain 7 kartu, kartu pembuka kartu biasa, semua kartu tercatat', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = game.createGame({
      rng: deck.seededRng(seed),
      players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }, { id: 'D', name: 'D' }]
    });
    g.players.forEach((p) => assert.equal(p.hand.length, 7));
    const top = g.discardPile[0];
    assert.equal(top.type, 'normal', 'kartu pembuka harus kartu biasa');
    assert.equal(g.activeColor, top.color);
    assert.equal(g.activeHaraka, top.haraka);
    const all = [].concat(...g.players.map((p) => p.hand), g.drawPile, g.discardPile);
    assert.equal(all.length, 72);
    assert.equal(new Set(all.map((c) => c.id)).size, 72);
  }
});

test('pembagian: urutan pemain diacak (tidak selalu sama)', () => {
  const orders = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const g = game.createGame({
      rng: deck.seededRng(seed),
      players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }]
    });
    orders.add(g.players.map((p) => p.id).join(''));
  }
  assert.ok(orders.size > 1);
});

test('pembagian: jumlah pemain di luar 2-4 ditolak', () => {
  assert.throws(() => game.createGame({ players: [{ id: 'A', name: 'A' }] }));
  assert.throws(() => game.createGame({ players: ['A', 'B', 'C', 'D', 'E'].map((x) => ({ id: x, name: x })) }));
});

/* ---------- Pencocokan ---------- */
test('pencocokan warna: warna sama sah walau harakat beda', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'dammah'), N('red', 'ha', 'kasrah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'n-blue-ta-dammah');
  assert.ok(r.ok);
  assert.equal(r.state.activeColor, 'blue');
  assert.equal(r.state.activeHaraka, 'dammah');
});

test('pencocokan harakat: harakat sama sah walau warna beda', () => {
  const s = makeState({ hands: { A: [N('red', 'ha', 'fathah'), N('red', 'ta', 'kasrah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'n-red-ha-fathah');
  assert.ok(r.ok);
  assert.equal(r.state.activeColor, 'red');
  assert.equal(r.state.activeHaraka, 'fathah');
});

test('penolakan: huruf sama saja tidak cukup, state tidak berubah', () => {
  const s = makeState({ hands: { A: [N('red', 'ba', 'kasrah'), N('red', 'ta', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const before = JSON.stringify(s);
  const r = play(s, 'A', 'n-red-ba-kasrah');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'card_not_playable');
  assert.equal(JSON.stringify(s), before);
  assert.equal(JSON.stringify(r.state), before);
});

test('setelah dimainkan: kartu jadi teratas, giliran pindah, tangan berkurang', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')], C: [N('red', 'ba', 'dammah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'n-blue-ta-kasrah');
  assert.equal(r.state.discardPile.at(-1).id, 'n-blue-ta-kasrah');
  assert.equal(r.state.turn, 1);
  assert.equal(r.state.players[0].hand.length, 1);
  assert.equal(r.state.version, 1);
});

/* ---------- Kartu spesial ---------- */
test('Draw 1: lawan berikutnya ambil 1 kartu, kehilangan giliran, giliran ke pemain setelahnya', () => {
  const s = makeState({
    hands: { A: [D1('blue'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')], C: [N('red', 'ba', 'dammah')] },
    top: TOP_BLUE_FATHAH
  });
  const r = play(s, 'A', 'd1-blue');
  assert.ok(r.ok);
  assert.equal(r.state.players[1].hand.length, 2, 'B kena penalti 1 kartu');
  assert.equal(r.state.turn, 2, 'giliran melompati B ke C');
  assert.ok(r.events.some((e) => e.type === 'skip' && e.playerId === 'B'));
});

test('Draw 1 pada 2 pemain: korban kehilangan giliran, pemain yang sama main lagi', () => {
  const s = makeState({ hands: { A: [D1('blue'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'd1-blue');
  assert.equal(r.state.turn, 0);
});

test('Draw 1: tidak sah kalau warna tidak cocok', () => {
  const s = makeState({ hands: { A: [D1('red'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'd1-red');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'card_not_playable');
});

test('Draw 1: tidak menumpuk — penalti tetap hanya 1 kartu', () => {
  let s = makeState({
    hands: { A: [D1('blue'), N('red', 'ha', 'dammah')], B: [D1('blue'), N('green', 'ba', 'kasrah')], C: [N('blue', 'ta', 'dammah'), N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    drawPile: [N('green', 'ba', 'dammah'), N('green', 'jim', 'kasrah'), N('green', 'ha', 'fathah')]
  });
  s = play(s, 'A', 'd1-blue').state;       // B +1 dan kehilangan giliran
  assert.equal(s.players[1].hand.length, 3);
  assert.equal(s.turn, 2);
  const r = play(s, 'C', 'n-blue-ta-dammah');    // C main kartu biasa saja
  assert.ok(r.ok);
  assert.equal(r.state.players[0].hand.length, 1, 'A tidak ketambahan kartu');
});

test('Ganti Harakat: butuh pilihan; warna mengikuti kartu, harakat sesuai pilihan', () => {
  const s = makeState({ hands: { A: [CH('blue'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const noChoice = play(s, 'A', 'ch-blue');
  assert.equal(noChoice.ok, false);
  assert.equal(noChoice.code, 'need_choice');
  assert.equal(noChoice.needs, 'haraka');
  assert.equal(JSON.stringify(noChoice.state), JSON.stringify(s));

  const bad = play(s, 'A', 'ch-blue', 'merah');
  assert.equal(bad.code, 'invalid_choice');

  const ok = play(s, 'A', 'ch-blue', 'dammah');
  assert.ok(ok.ok);
  assert.equal(ok.state.activeColor, 'blue');
  assert.equal(ok.state.activeHaraka, 'dammah');
  assert.equal(ok.state.turn, 1);
});

test('Ganti Harakat: tidak sah kalau warna tidak cocok', () => {
  const s = makeState({ hands: { A: [CH('red'), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(play(s, 'A', 'ch-red', 'kasrah').code, 'card_not_playable');
});

test('Ganti Warna: sah kapan saja, harakat tidak berubah, warna sesuai pilihan', () => {
  const s = makeState({ hands: { A: [CC(1), N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(play(s, 'A', 'cc-1').code, 'need_choice');
  assert.equal(play(s, 'A', 'cc-1', 'fathah').code, 'invalid_choice');
  const r = play(s, 'A', 'cc-1', 'green');
  assert.ok(r.ok);
  assert.equal(r.state.activeColor, 'green');
  assert.equal(r.state.activeHaraka, 'fathah');
});

/* ---------- Mengambil kartu ---------- */
test('mengambil kartu sah: boleh langsung dimainkan, giliran belum pindah', () => {
  const s = makeState({
    hands: { A: [N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    drawPile: [N('red', 'ta', 'kasrah'), N('blue', 'jim', 'kasrah')]   // yang teratas: biru (sah)
  });
  const d = game.applyAction(s, { type: 'draw', playerId: 'A' });
  assert.ok(d.ok);
  assert.equal(d.state.turn, 0);
  assert.equal(d.state.drawnCardId, 'n-blue-jim-kasrah');
  assert.equal(d.state.players[0].hand.length, 2);
  const p = play(d.state, 'A', 'n-blue-jim-kasrah');
  assert.ok(p.ok);
});

test('mengambil kartu tidak sah: giliran langsung berakhir', () => {
  const s = makeState({
    hands: { A: [N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    drawPile: [N('blue', 'jim', 'kasrah'), N('red', 'ta', 'kasrah')]   // teratas: merah kasrah (tidak sah)
  });
  const d = game.applyAction(s, { type: 'draw', playerId: 'A' });
  assert.ok(d.ok);
  assert.equal(d.state.turn, 1);
  assert.equal(d.state.drawnCardId, null);
});

test('tidak boleh mengambil dua kali; hanya kartu yang baru diambil yang boleh dimainkan; boleh lewati', () => {
  const s = makeState({
    hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    drawPile: [N('red', 'ta', 'kasrah'), N('blue', 'jim', 'kasrah')]
  });
  const d = game.applyAction(s, { type: 'draw', playerId: 'A' }).state;
  assert.equal(game.applyAction(d, { type: 'draw', playerId: 'A' }).code, 'already_drawn');
  assert.equal(play(d, 'A', 'n-blue-ta-kasrah').code, 'must_play_drawn');
  const passed = game.applyAction(d, { type: 'pass', playerId: 'A' });
  assert.ok(passed.ok);
  assert.equal(passed.state.turn, 1);
  assert.equal(passed.state.drawnCardId, null);
});

test('lewati tanpa mengambil kartu ditolak', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(game.applyAction(s, { type: 'pass', playerId: 'A' }).code, 'cannot_pass');
});

/* ---------- Tumpukan habis ---------- */
test('tumpukan ambil habis: tumpukan buang (selain teratas) dikocok jadi tumpukan baru', () => {
  const s = makeState({
    hands: { A: [N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    drawPile: []
  });
  s.discardPile = [N('green', 'ba', 'kasrah'), N('green', 'ta', 'kasrah'), N('green', 'jim', 'kasrah'), TOP_BLUE_FATHAH];
  const d = game.applyAction(s, { type: 'draw', playerId: 'A' }, { rng: deck.seededRng(3) });
  assert.ok(d.ok);
  assert.equal(d.state.players[0].hand.length, 2);
  assert.equal(d.state.drawPile.length, 2);
  assert.equal(d.state.discardPile.length, 1);
  assert.equal(d.state.discardPile[0].id, TOP_BLUE_FATHAH.id);
});

test('tidak ada kartu sama sekali: mengambil kartu mengakhiri giliran tanpa error', () => {
  const s = makeState({ hands: { A: [N('red', 'ha', 'dammah')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH, drawPile: [] });
  const d = game.applyAction(s, { type: 'draw', playerId: 'A' });
  assert.ok(d.ok);
  assert.equal(d.state.turn, 1);
  assert.equal(d.state.players[0].hand.length, 1);
});

/* ---------- Kemenangan & skor ---------- */
test('kemenangan: kartu terakhir dimainkan, skor = nilai kartu lawan (contoh dari spesifikasi = 25)', () => {
  const s = makeState({
    hands: {
      A: [N('blue', 'ta', 'kasrah')],
      B: [N('red', 'ba', 'kasrah'), N('red', 'ta', 'kasrah'), N('red', 'ha', 'kasrah'), D1('red')],   // 3 + 10 = 13
      C: [N('red', 'ba', 'dammah'), N('green', 'ba', 'dammah')],                                       // 2
      D: [CC(1)]                                                                                      // 10
    },
    top: TOP_BLUE_FATHAH
  });
  const r = play(s, 'A', 'n-blue-ta-kasrah');
  assert.ok(r.ok);
  assert.equal(r.state.phase, 'finished');
  assert.equal(r.state.winnerId, 'A');
  assert.equal(r.state.roundScore, 25);
  assert.equal(r.state.scores.A, 25);
  assert.equal(r.state.scores.B, 0);
  assert.equal(r.state.scores.C, 0);
  assert.equal(r.state.scores.D, 0);
});

test('skor kumulatif ditambah di atas skor sebelumnya; aksi setelah selesai ditolak', () => {
  const s = makeState({
    hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('red', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH,
    scores: { A: 7, B: 4 }
  });
  const r = play(s, 'A', 'n-blue-ta-kasrah');
  assert.equal(r.state.scores.A, 8);
  assert.equal(r.state.scores.B, 4);
  assert.equal(game.applyAction(r.state, { type: 'draw', playerId: 'B' }).code, 'game_over');
});

test('kartu spesial sebagai kartu terakhir: menang tanpa perlu memilih, tanpa penalti', () => {
  const s = makeState({ hands: { A: [D1('blue')], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'A', 'd1-blue');
  assert.equal(r.state.phase, 'finished');
  assert.equal(r.state.players[1].hand.length, 1);
  const s2 = makeState({ hands: { A: [CC(1)], B: [N('red', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(play(s2, 'A', 'cc-1').state.phase, 'finished');
});

test('nilai kartu: biasa 1, spesial 10', () => {
  assert.equal(scoring.cardValue(N('red', 'ba', 'fathah')), 1);
  assert.equal(scoring.cardValue(D1('red')), 10);
  assert.equal(scoring.cardValue(CH('red')), 10);
  assert.equal(scoring.cardValue(CC(1)), 10);
});

/* ---------- Keamanan aksi ---------- */
test('aksi di luar giliran ditolak', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('blue', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const r = play(s, 'B', 'n-blue-ba-kasrah');
  assert.equal(r.code, 'not_your_turn');
  assert.equal(JSON.stringify(r.state), JSON.stringify(s));
  assert.equal(game.applyAction(s, { type: 'draw', playerId: 'B' }).code, 'not_your_turn');
});

test('memainkan kartu yang tidak dimiliki ditolak (kartu lawan / kartu tidak ada)', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('blue', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(play(s, 'A', 'n-blue-ba-kasrah').code, 'card_not_in_hand');
  assert.equal(play(s, 'A', 'tidak-ada').code, 'card_not_in_hand');
});

test('pemain tidak dikenal dan aksi tidak dikenal ditolak', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('blue', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  assert.equal(play(s, 'Z', 'n-blue-ta-kasrah').code, 'unknown_player');
  assert.equal(game.applyAction(s, { type: 'tebak', playerId: 'A' }).code, 'unknown_action');
});

test('dua permintaan bersamaan: yang kedua dengan versi lama ditolak (tidak ada aksi ganda)', () => {
  const s = makeState({
    hands: { A: [N('blue', 'ta', 'kasrah'), N('blue', 'ha', 'kasrah')], B: [N('blue', 'ba', 'kasrah')] },
    top: TOP_BLUE_FATHAH
  });
  const a1 = game.applyAction(s, { type: 'play', playerId: 'A', cardId: 'n-blue-ta-kasrah', expectedVersion: 0 });
  const a2 = game.applyAction(a1.state, { type: 'play', playerId: 'A', cardId: 'n-blue-ha-kasrah', expectedVersion: 0 });
  assert.ok(a1.ok);
  assert.equal(a2.ok, false);
  assert.equal(a2.code, 'stale_state');
  // dari state awal yang sama pun, versi usang ditolak
  const stale = game.applyAction(a1.state, { type: 'draw', playerId: 'B', expectedVersion: 0 });
  assert.equal(stale.code, 'stale_state');
});

test('applyAction tidak pernah mengubah state masukan', () => {
  const s = makeState({ hands: { A: [N('blue', 'ta', 'kasrah')], B: [N('blue', 'ba', 'kasrah')] }, top: TOP_BLUE_FATHAH });
  const before = JSON.stringify(s);
  game.applyAction(s, { type: 'play', playerId: 'A', cardId: 'n-blue-ta-kasrah' });
  game.applyAction(s, { type: 'draw', playerId: 'A' });
  assert.equal(JSON.stringify(s), before);
});

/* ---------- View & bot ---------- */
test('view: tidak membocorkan kartu lawan, hanya jumlahnya', () => {
  const g = game.createGame({ rng: deck.seededRng(11), players: [{ id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }] });
  const view = game.getView(g, 'A');
  const text = JSON.stringify(view);
  g.players.filter((p) => p.id !== 'A').forEach((p) => {
    assert.equal(view.players.find((x) => x.id === p.id).handCount, 7);
    p.hand.forEach((c) => {
      const inOwnHand = view.me.hand.some((m) => m.id === c.id);
      if (!inOwnHand && c.id !== view.topCard.id) assert.ok(!text.includes('"' + c.id + '"'), 'kartu lawan bocor: ' + c.id);
    });
  });
  assert.equal(view.me.hand.length, 7);
  assert.equal(view.drawCount, g.drawPile.length);
});

test('bot: mengikuti prioritas (warna > harakat > Draw 1 > Ganti Harakat > Ganti Warna)', () => {
  const mk = (hand) => ({ me: { id: 'A', hand }, activeColor: 'blue', activeHaraka: 'fathah', drawnCardId: null });
  // warna cocok didahulukan daripada harakat cocok
  let a = bot.chooseAction(mk([N('red', 'ta', 'fathah'), N('blue', 'ta', 'kasrah'), D1('blue')]));
  assert.equal(a.cardId, 'n-blue-ta-kasrah');
  // harakat cocok didahulukan daripada Draw 1
  a = bot.chooseAction(mk([D1('blue'), N('red', 'ta', 'fathah')]));
  assert.equal(a.cardId, 'n-red-ta-fathah');
  // Draw 1 didahulukan daripada Ganti Harakat
  a = bot.chooseAction(mk([CH('blue'), D1('blue'), CC(1)]));
  assert.equal(a.cardId, 'd1-blue');
  // Ganti Harakat sebelum Ganti Warna
  a = bot.chooseAction(mk([CC(1), CH('blue')]));
  assert.equal(a.cardId, 'ch-blue');
  assert.ok(a.choice);
  // hanya Ganti Warna
  a = bot.chooseAction(mk([N('red', 'ta', 'kasrah'), CC(1)]));
  assert.equal(a.cardId, 'cc-1');
  assert.ok(config.colorById[a.choice]);
  // tidak ada yang sah -> ambil kartu
  a = bot.chooseAction(mk([N('red', 'ta', 'kasrah'), D1('red')]));
  assert.equal(a.type, 'draw');
});

test('bot: setelah mengambil kartu sah, langsung memainkannya', () => {
  const view = { me: { id: 'A', hand: [N('red', 'ta', 'kasrah'), N('blue', 'ha', 'dammah')] }, activeColor: 'blue', activeHaraka: 'fathah', drawnCardId: 'n-blue-ha-dammah' };
  const a = bot.chooseAction(view);
  assert.equal(a.type, 'play');
  assert.equal(a.cardId, 'n-blue-ha-dammah');
});

/* ---------- Simulasi: bot melawan bot ---------- */
test('simulasi 600 ronde bot vs bot: selalu selesai, 72 kartu tetap utuh, tidak ada aksi tak sah', () => {
  let finished = 0;
  for (let seed = 1; seed <= 600; seed++) {
    const rng = deck.seededRng(seed);
    const n = 2 + (seed % 3);
    const players = Array.from({ length: n }, (_, i) => ({ id: 'P' + i, name: 'P' + i, isBot: true }));
    let s = game.createGame({ rng, players });
    let steps = 0;
    while (s.phase === 'playing') {
      const cur = s.players[s.turn];
      const view = game.getView(s, cur.id);
      let action = bot.chooseAction(view);
      let r = game.applyAction(s, action, { rng });
      assert.ok(r.ok, `seed ${seed}: bot membuat aksi tak sah (${r.code}) ${JSON.stringify(action)}`);
      s = r.state;
      const all = [].concat(...s.players.map((p) => p.hand), s.drawPile, s.discardPile);
      assert.equal(all.length, 72, `seed ${seed}: jumlah kartu berubah`);
      assert.equal(new Set(all.map((c) => c.id)).size, 72, `seed ${seed}: kartu ganda`);
      assert.ok(++steps < 3000, `seed ${seed}: permainan tidak selesai`);
    }
    assert.ok(s.winnerId);
    assert.equal(s.players.find((p) => p.id === s.winnerId).hand.length, 0);
    finished++;
  }
  assert.equal(finished, 600);
});
