// Uji logika server (core.mjs) dengan database palsu di memori.
// Jalankan: node --test   (dari folder media/uno-hijaiyah)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../supabase/functions/game/core.mjs';
import * as engine from '../supabase/functions/game/engine.mjs';

function memoryStore() {
  const rooms = new Map(), players = new Map(), secrets = new Map(), hands = new Map();
  let n = 0;
  const key = (r, u) => r + '|' + u;
  return {
    _rooms: rooms, _hands: hands, _secrets: secrets,
    async getRoomByCode(code) { return [...rooms.values()].find((r) => r.code === code) || null; },
    async getRoom(id) { return rooms.get(id) || null; },
    async createRoom({ code, hostId }) {
      const r = { id: 'room' + (++n), code, host_id: hostId, status: 'lobby', public_state: null };
      rooms.set(r.id, r); players.set(r.id, []); return r;
    },
    async listPlayers(id) { return (players.get(id) || []).map((p) => ({ ...p })); },
    async addPlayer(id, uid, name, seat) { players.get(id).push({ user_id: uid, name, seat }); },
    async removePlayer(id, uid) { players.set(id, players.get(id).filter((p) => p.user_id !== uid)); },
    async deleteRoom(id) { rooms.delete(id); players.delete(id); },
    async setHost(id, uid) { rooms.get(id).host_id = uid; },
    async setStatus(id, s) { rooms.get(id).status = s; },
    async loadSecret(id) { const s = secrets.get(id); return s ? JSON.parse(JSON.stringify(s)) : null; },
    async getHand(id, uid) { return hands.get(key(id, uid)) || null; },
    async saveGame({ roomId, expectedVersion, state, publicState, hands: h, status }) {
      const room = rooms.get(roomId);
      if (expectedVersion === null) { if (room.status !== 'lobby') return false; }
      else { const cur = secrets.get(roomId); if (!cur || cur.version !== expectedVersion) return false; }
      secrets.set(roomId, { state: JSON.parse(JSON.stringify(state)), version: state.version });
      room.public_state = publicState; room.status = status;
      for (const uid of Object.keys(h)) hands.set(key(roomId, uid), JSON.parse(JSON.stringify(h[uid])));
      return true;
    }
  };
}

function setup() {
  const store = memoryStore();
  const core = createCore({ store, engine });
  return { store, core, call: (u, req) => core.handle(u, req) };
}

async function startedRoom(n = 2) {
  const { store, core, call } = setup();
  const ids = ['u1', 'u2', 'u3', 'u4'].slice(0, n);
  const c = await call('u1', { action: 'create', name: 'Nel' });
  for (let i = 1; i < n; i++) await call(ids[i], { action: 'join', code: c.code, name: 'P' + i });
  const s = await call('u1', { action: 'start', roomId: c.roomId });
  assert.equal(s.ok, true);
  return { store, core, call, roomId: c.roomId, code: c.code, ids };
}

test('buat ruangan: kode 5 karakter tanpa 0/O/1/I', async () => {
  const { call } = setup();
  const r = await call('u1', { action: 'create', name: 'Nel' });
  assert.equal(r.ok, true);
  assert.match(r.code, /^[A-HJ-NP-Z2-9]{5}$/);
});

test('nama dibersihkan (tag, kontrol, panjang)', async () => {
  const { call, store } = setup();
  const c = await call('u1', { action: 'create', name: '<b>Nel</b>\n   sangat panjang sekali namanya' });
  const p = await store.listPlayers(c.roomId);
  assert.ok(p[0].name.length <= 14);
  assert.ok(!/[<>\n]/.test(p[0].name));
});

test('gabung: kode salah, ruangan penuh, masuk lagi', async () => {
  const { call } = setup();
  const c = await call('u1', { action: 'create', name: 'A' });
  assert.equal((await call('u2', { action: 'join', code: 'ZZZZZ', name: 'B' })).code, 'room_not_found');
  assert.equal((await call('u2', { action: 'join', code: 'ab', name: 'B' })).code, 'bad_code');
  await call('u2', { action: 'join', code: c.code.toLowerCase(), name: 'B' });
  await call('u3', { action: 'join', code: c.code, name: 'C' });
  await call('u4', { action: 'join', code: c.code, name: 'D' });
  assert.equal((await call('u5', { action: 'join', code: c.code, name: 'E' })).code, 'room_full');
  const again = await call('u2', { action: 'join', code: c.code, name: 'B' });
  assert.equal(again.ok, true); assert.equal(again.rejoined, true);
});

test('hanya tuan rumah yang boleh memulai; minimal 2 pemain', async () => {
  const { call } = setup();
  const c = await call('u1', { action: 'create', name: 'A' });
  assert.equal((await call('u1', { action: 'start', roomId: c.roomId })).code, 'too_few');
  await call('u2', { action: 'join', code: c.code, name: 'B' });
  assert.equal((await call('u2', { action: 'start', roomId: c.roomId })).code, 'not_host');
  assert.equal((await call('u1', { action: 'start', roomId: c.roomId })).ok, true);
  assert.equal((await call('u1', { action: 'start', roomId: c.roomId })).code, 'already_started');
});

test('tidak bisa gabung setelah permainan dimulai (orang luar)', async () => {
  const { call, code } = await startedRoom(2);
  assert.equal((await call('u9', { action: 'join', code, name: 'X' })).code, 'room_started');
});

test('status publik TIDAK memuat kartu tangan', async () => {
  const { store, roomId } = await startedRoom(3);
  const pub = JSON.stringify(store._rooms.get(roomId).public_state);
  const secret = store._secrets.get(roomId).state;
  secret.players.forEach((p) => p.hand.forEach((c) => assert.ok(!pub.includes('"' + c.id + '"') ||
    // topCard boleh terbuka; kartu di tangan tidak
    c.id === secret.discardPile[secret.discardPile.length - 1].id, 'bocor: ' + c.id)));
  assert.ok(!('hand' in store._rooms.get(roomId).public_state));
  assert.deepEqual(store._rooms.get(roomId).public_state.players.map((p) => p.handCount), [7, 7, 7]);
});

test('tangan tiap pemain tersimpan di barisnya sendiri', async () => {
  const { store, roomId, ids } = await startedRoom(2);
  const secret = store._secrets.get(roomId).state;
  ids.forEach((u) => {
    const row = store._hands.get(roomId + '|' + u);
    const mine = secret.players.find((p) => p.id === u).hand;
    assert.deepEqual(row.cards.map((c) => c.id), mine.map((c) => c.id));
  });
});

test('aksi di luar giliran ditolak dan status tidak berubah', async () => {
  const { store, call, roomId, ids } = await startedRoom(2);
  const before = JSON.stringify(store._secrets.get(roomId));
  const cur = store._secrets.get(roomId).state.players[store._secrets.get(roomId).state.turn].id;
  const other = ids.find((u) => u !== cur);
  const r = await call(other, { action: 'draw', roomId });
  assert.equal(r.ok, false); assert.equal(r.code, 'not_your_turn');
  assert.equal(JSON.stringify(store._secrets.get(roomId)), before);
});

test('kartu milik lawan tidak bisa dimainkan', async () => {
  const { store, call, roomId, ids } = await startedRoom(2);
  const st = store._secrets.get(roomId).state;
  const cur = st.players[st.turn];
  const opp = st.players.find((p) => p.id !== cur.id);
  const r = await call(cur.id, { action: 'play', roomId, cardId: opp.hand[0].id });
  assert.equal(r.code, 'card_not_in_hand');
});

test('orang luar tidak bisa bertindak atau membaca status', async () => {
  const { call, roomId } = await startedRoom(2);
  assert.equal((await call('hacker', { action: 'draw', roomId })).code, 'not_member');
  assert.equal((await call('hacker', { action: 'state', roomId })).code, 'not_member');
  assert.equal((await call(null, { action: 'draw', roomId })).code, 'unauthorized');
});

test('userId dari token, bukan dari isi permintaan', async () => {
  const { store, call, roomId, ids } = await startedRoom(2);
  const st = store._secrets.get(roomId).state;
  const curId = st.players[st.turn].id;
  const other = ids.find((u) => u !== curId);
  // penyerang mengirim playerId palsu di body: harus diabaikan
  const r = await call(other, { action: 'draw', roomId, playerId: curId });
  assert.equal(r.code, 'not_your_turn');
});

test('pemain giliran bisa mengambil kartu; versi naik; tangan privat berubah', async () => {
  const { store, call, roomId } = await startedRoom(2);
  const st0 = store._secrets.get(roomId).state;
  const cur = st0.players[st0.turn].id;
  const v0 = store._secrets.get(roomId).version;
  const r = await call(cur, { action: 'draw', roomId });
  assert.equal(r.ok, true);
  assert.ok(store._secrets.get(roomId).version > v0);
  const pub = store._rooms.get(roomId).public_state;
  assert.ok(!pub.lastEvents.some((e) => e.card && e.type === 'draw'), 'kartu ambilan bocor di event publik');
});

test('dua aksi bersamaan: yang kedua ditolak (stale_state), tidak ada ganda', async () => {
  const { store, core, roomId } = await startedRoom(2);
  const st = store._secrets.get(roomId).state;
  const cur = st.players[st.turn].id;
  // paksa keadaan balapan: store mengembalikan versi lama kepada pemanggil kedua
  const real = store.loadSecret.bind(store);
  const snapshot = await real(roomId);
  let calls = 0;
  store.loadSecret = async (id) => { calls++; return JSON.parse(JSON.stringify(snapshot)); };
  const a = await core.handle(cur, { action: 'draw', roomId });
  const b = await core.handle(cur, { action: 'draw', roomId });
  assert.equal(a.ok, true);
  assert.equal(b.ok, false);
  assert.equal(b.code, 'stale_state');
});

test('main penuh sampai ada pemenang lewat core (bot sederhana), skor terakumulasi', async () => {
  const { store, call, roomId } = await startedRoom(2);
  const bot = (await import('../js/game/bot.js')).default || (await import('../js/game/bot.js'));
  const botMod = bot.chooseAction ? bot : bot.default;
  let guard = 0;
  while (store._rooms.get(roomId).status === 'playing' && guard++ < 1500) {
    const st = store._secrets.get(roomId).state;
    const cur = st.players[st.turn].id;
    const view = engine.gameState.getView(st, cur);
    const act = botMod.chooseAction(view);
    let r = await call(cur, { action: act.type, cardId: act.cardId, choice: act.choice, roomId });
    if (!r.ok) { r = await call(cur, { action: 'draw', roomId }); if (!r.ok) r = await call(cur, { action: 'pass', roomId }); }
    assert.equal(r.ok, true, JSON.stringify(r));
  }
  assert.equal(store._rooms.get(roomId).status, 'finished');
  const st = store._secrets.get(roomId).state;
  assert.ok(st.roundScore > 0);
  assert.equal((await call('u2', { action: 'next_round', roomId })).code, 'not_host');
  const nr = await call('u1', { action: 'next_round', roomId });
  assert.equal(nr.ok, true);
  const st2 = store._secrets.get(roomId).state;
  assert.equal(st2.round, 2);
  assert.equal(st2.scores[st.winnerId], st.roundScore);
});

test('keluar dari lobi: tuan rumah pindah; ruangan kosong dihapus', async () => {
  const { call, store } = setup();
  const c = await call('u1', { action: 'create', name: 'A' });
  await call('u2', { action: 'join', code: c.code, name: 'B' });
  await call('u1', { action: 'leave', roomId: c.roomId });
  assert.equal(store._rooms.get(c.roomId).host_id, 'u2');
  const l = await call('u2', { action: 'leave', roomId: c.roomId });
  assert.equal(l.closed, true);
  assert.equal(store._rooms.has(c.roomId), false);
});

test('tidak bisa keluar saat bermain; hanya tuan rumah yang bisa mengakhiri', async () => {
  const { call, roomId, store } = await startedRoom(2);
  assert.equal((await call('u2', { action: 'leave', roomId })).code, 'in_progress');
  assert.equal((await call('u2', { action: 'end', roomId })).code, 'not_host');
  assert.equal((await call('u1', { action: 'end', roomId })).ok, true);
  assert.equal(store._rooms.get(roomId).status, 'closed');
  const st = store._secrets.get(roomId).state;
  assert.equal((await call(st.players[st.turn].id, { action: 'draw', roomId })).code, 'not_playing');
});

test('aksi tak dikenal / permintaan rusak', async () => {
  const { call } = setup();
  assert.equal((await call('u1', { action: 'hack' })).code, 'unknown_action');
  assert.equal((await call('u1', null)).code, 'bad_request');
});
