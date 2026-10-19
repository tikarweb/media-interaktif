/* =====================================================
   CORE.MJS — logika server HarakaPlay (tanpa Supabase/Deno di sini).
   Semua akses database lewat objek `store`, jadi file ini bisa diuji
   di Node dengan store palsu (tests/online-core.test.mjs) dan dipakai
   di Edge Function dengan store Supabase (store-supabase.mjs).

   Prinsip keamanan:
   - userId SELALU dari token login yang sudah diverifikasi, tidak pernah
     dari isi permintaan.
   - Semua aksi permainan divalidasi oleh engine yang sama dengan di browser.
   - Kartu di tangan hanya ditulis ke baris milik pemainnya; status publik
     (yang dibaca semua pemain) tidak memuat kartu tersembunyi.
   ===================================================== */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0/O/1/I
const CODE_LENGTH = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export function createCore({ store, engine, random = Math.random }) {
  const GS = engine.gameState;

  function fail(code, message, extra) {
    return Object.assign({ ok: false, code, message }, extra || {});
  }

  function cleanName(raw) {
    const s = String(raw == null ? '' : raw)
      .replace(/[\u0000-\u001f\u007f<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 14);
    return s || 'Pemain';
  }

  function makeCode() {
    let c = '';
    for (let i = 0; i < CODE_LENGTH; i++) c += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
    return c;
  }

  function normCode(raw) {
    return String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
  }

  /* Status publik: boleh dibaca semua anggota ruangan. Tanpa kartu tangan. */
  function publicOf(state, events) {
    const v = GS.getView(state, state.players[0].id);
    return {
      version: v.version,
      round: v.round,
      level: v.level,
      mode: v.mode,
      waahidFor: v.waahidFor,
      target: v.target,
      wordsDone: v.wordsDone,
      wordsBy: v.wordsBy,
      phase: v.phase,
      players: v.players.map((p) => ({ id: p.id, name: p.name, handCount: p.handCount })),
      turnPlayerId: v.turnPlayerId,
      drawCount: v.drawCount,
      topCard: v.topCard,
      discardCount: v.discardCount,
      activeColor: v.activeColor,
      activeHaraka: v.activeHaraka,
      winnerId: v.winnerId,
      roundScore: v.roundScore,
      scores: v.scores,
      lastEvents: (events || []).map((e) => {
        const out = { type: e.type, playerId: e.playerId };
        if (e.type === 'play') out.card = e.card;          // kartu yang dimainkan memang terbuka
        if (e.type === 'win') out.roundScore = e.roundScore;
        if (e.type === 'wordComplete' || e.type === 'slot' || e.type === 'bonus') out.wordId = e.wordId;
        if (e.type === 'slot') out.index = e.index;
        if (e.type === 'bonus' || e.type === 'caught') out.count = e.count;
        if (e.type === 'caught') out.byId = e.byId;
        return out;                                          // kartu yang diambil TIDAK disertakan
      })
    };
  }

  /* Baris tangan per pemain. drawnCardId hanya untuk pemain yang sedang giliran. */
  function handsOf(state) {
    const out = {};
    state.players.forEach((p, i) => {
      out[p.id] = {
        cards: p.hand,
        drawn: i === state.turn && state.phase === 'playing' ? state.drawnCardId || null : null
      };
    });
    return out;
  }

  async function memberOf(roomId, userId) {
    const players = await store.listPlayers(roomId);
    return { players, me: players.find((p) => p.user_id === userId) || null };
  }

  /* ---------- Aksi ---------- */

  async function createRoom(userId, req) {
    const name = cleanName(req.name);
    for (let i = 0; i < 8; i++) {
      const code = makeCode();
      if (await store.getRoomByCode(code)) continue;
      const room = await store.createRoom({ code, hostId: userId });
      await store.addPlayer(room.id, userId, name, 0);
      return { ok: true, roomId: room.id, code };
    }
    return fail('code_busy', 'Gagal membuat kode ruangan. Coba lagi.');
  }

  async function joinRoom(userId, req) {
    const name = cleanName(req.name);
    const code = normCode(req.code);
    if (code.length !== CODE_LENGTH) return fail('bad_code', 'Kode ruangan harus 5 karakter.');
    const room = await store.getRoomByCode(code);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan. Periksa kodenya.');
    const { players, me } = await memberOf(room.id, userId);
    if (me) return { ok: true, roomId: room.id, code: room.code, rejoined: true }; // masuk lagi
    if (room.status !== 'lobby') return fail('room_started', 'Permainan di ruangan ini sudah dimulai.');
    if (players.length >= MAX_PLAYERS) return fail('room_full', 'Ruangan sudah penuh (maksimal 4 pemain).');
    const seat = players.reduce((m, p) => Math.max(m, p.seat), -1) + 1;
    await store.addPlayer(room.id, userId, name, seat);
    return { ok: true, roomId: room.id, code: room.code };
  }

  async function leaveRoom(userId, req) {
    const room = await store.getRoom(req.roomId);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan.');
    const { players, me } = await memberOf(room.id, userId);
    if (!me) return fail('not_member', 'Kamu bukan anggota ruangan ini.');
    if (room.status === 'playing') {
      return fail('in_progress', 'Permainan sedang berjalan. Minta tuan rumah mengakhiri ruangan.');
    }
    await store.removePlayer(room.id, userId);
    const rest = players.filter((p) => p.user_id !== userId);
    if (!rest.length) { await store.deleteRoom(room.id); return { ok: true, closed: true }; }
    if (room.host_id === userId) await store.setHost(room.id, rest[0].user_id);
    return { ok: true };
  }

  async function endRoom(userId, req) {
    const room = await store.getRoom(req.roomId);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan.');
    if (room.host_id !== userId) return fail('not_host', 'Hanya tuan rumah yang bisa mengakhiri ruangan.');
    await store.setStatus(room.id, 'closed');
    return { ok: true };
  }

  async function startRound(userId, req, isNext) {
    const room = await store.getRoom(req.roomId);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan.');
    if (room.host_id !== userId) return fail('not_host', 'Hanya tuan rumah yang bisa memulai.');
    const { players } = await memberOf(room.id, userId);
    if (players.length < MIN_PLAYERS) return fail('too_few', 'Butuh minimal 2 pemain.');

    let level = null;
    if (req.level != null) {
      level = String(req.level).slice(0, 20);
      if (!engine.config.levelById[level]) return fail('bad_level', 'Level tidak dikenal.');
    }
    let expected = null, scores = {}, round = 1;
    if (isNext) {
      if (room.status !== 'finished') return fail('not_finished', 'Ronde belum selesai.');
      const sec = await store.loadSecret(room.id);
      if (!sec) return fail('no_game', 'Data permainan tidak ditemukan.');
      expected = sec.version;
      scores = sec.state.scores || {};
      round = (sec.state.round || 1) + 1;
      if (!level) level = sec.state.level || null;   // tanpa pilihan baru = ulangi level yang sama
    } else if (room.status !== 'lobby') {
      return fail('already_started', 'Permainan sudah dimulai.');
    }

    const ordered = players.slice().sort((a, b) => a.seat - b.seat)
      .map((p) => ({ id: p.user_id, name: p.name, isBot: false }));
    const state = GS.createGame({ players: ordered, scores, round, level });
    const saved = await store.saveGame({
      roomId: room.id, expectedVersion: expected, state,
      publicState: publicOf(state, []), hands: handsOf(state), status: 'playing'
    });
    if (!saved) return fail('stale_state', 'Ruangan baru saja berubah. Coba lagi.');
    return { ok: true };
  }

  async function gameAction(userId, req) {
    const type = req.action;
    const room = await store.getRoom(req.roomId);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan.');
    const { me } = await memberOf(room.id, userId);
    if (!me) return fail('not_member', 'Kamu bukan anggota ruangan ini.');
    if (room.status !== 'playing') return fail('not_playing', 'Permainan belum berjalan atau sudah selesai.');
    const sec = await store.loadSecret(room.id);
    if (!sec) return fail('no_game', 'Data permainan tidak ditemukan.');

    const action = { type, playerId: userId, expectedVersion: sec.version };
    if (type === 'play') {
      action.cardId = String(req.cardId == null ? '' : req.cardId).slice(0, 40);
      if (req.choice != null) action.choice = String(req.choice).slice(0, 20);
    }
    const r = GS.applyAction(sec.state, action);
    if (!r.ok) return fail(r.code, r.message, r.needs ? { needs: r.needs } : undefined);

    const finished = r.state.phase === 'finished';
    const saved = await store.saveGame({
      roomId: room.id, expectedVersion: sec.version, state: r.state,
      publicState: publicOf(r.state, r.events), hands: handsOf(r.state),
      status: finished ? 'finished' : 'playing'
    });
    if (!saved) return fail('stale_state', 'Status permainan sudah berubah. Coba lagi.');
    return { ok: true };
  }

  /* Untuk muat ulang / sambung kembali: tangan milik pemanggil + status publik */
  async function getState(userId, req) {
    const room = await store.getRoom(req.roomId);
    if (!room) return fail('room_not_found', 'Ruangan tidak ditemukan.');
    const { players, me } = await memberOf(room.id, userId);
    if (!me) return fail('not_member', 'Kamu bukan anggota ruangan ini.');
    const hand = await store.getHand(room.id, userId);
    return {
      ok: true,
      room: { id: room.id, code: room.code, host_id: room.host_id, status: room.status, public_state: room.public_state },
      players: players.map((p) => ({ user_id: p.user_id, name: p.name, seat: p.seat })),
      hand: hand ? hand.cards : [],
      drawn: hand ? hand.drawn : null
    };
  }

  async function handle(userId, req) {
    if (!userId) return fail('unauthorized', 'Belum masuk.');
    if (!req || typeof req !== 'object') return fail('bad_request', 'Permintaan tidak valid.');
    try {
      switch (req.action) {
        case 'create': return await createRoom(userId, req);
        case 'join': return await joinRoom(userId, req);
        case 'leave': return await leaveRoom(userId, req);
        case 'end': return await endRoom(userId, req);
        case 'start': return await startRound(userId, req, false);
        case 'next_round': return await startRound(userId, req, true);
        case 'play': case 'draw': case 'pass': case 'waahid': case 'catch': return await gameAction(userId, req);
        case 'state': return await getState(userId, req);
        default: return fail('unknown_action', 'Aksi tidak dikenal.');
      }
    } catch (e) {
      return fail('server_error', 'Terjadi kesalahan di server.');
    }
  }

  return { handle, publicOf, handsOf };
}
