/* =====================================================
   ONLINE-CLIENT.JS — komunikasi dengan Supabase.
   - Login anonim otomatis (tanpa akun).
   - Semua aksi permainan dikirim ke Edge Function "game"; klien tidak
     pernah menulis langsung ke tabel.
   - Pembaruan: Realtime (jika aktif) + polling cadangan tiap 3 detik.
   ===================================================== */
(function () {
  'use strict';
  var HP = window.HarakaPlay;
  var cfg = HP.onlineConfig;
  var sb = null;

  function client() {
    if (!sb) {
      if (!window.supabase || !window.supabase.createClient) throw new Error('library supabase tidak termuat');
      sb = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    }
    return sb;
  }

  function netError(msg) {
    return { ok: false, code: 'network', message: msg || 'Tidak bisa terhubung ke server. Periksa internetmu.' };
  }

  var sessionPromise = null;
  function ensureSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async function () {
      var c = client();
      var got = await c.auth.getSession();
      if (got.data && got.data.session) return got.data.session;
      var r = await c.auth.signInAnonymously();
      if (r.error || !r.data || !r.data.session) throw new Error(r.error ? r.error.message : 'login anonim gagal');
      return r.data.session;
    })();
    sessionPromise.catch(function () { sessionPromise = null; });   // boleh dicoba lagi
    return sessionPromise;
  }

  async function userId() {
    var s = await ensureSession();
    return s.user.id;
  }

  async function call(payload) {
    var session;
    try { session = await ensureSession(); }
    catch (e) { return netError('Gagal masuk (login anonim). Pastikan "Anonymous sign-ins" aktif di Supabase.'); }
    // token terbaru (bisa diperbarui otomatis)
    var cur = await client().auth.getSession();
    var token = cur.data && cur.data.session ? cur.data.session.access_token : session.access_token;
    try {
      var res = await fetch(cfg.url + '/functions/v1/' + cfg.functionName, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': cfg.key },
        body: JSON.stringify(payload)
      });
      var json = null;
      try { json = await res.json(); } catch (e) { /* bukan JSON */ }
      if (!json) return netError('Server memberi jawaban yang tidak dikenal (' + res.status + ').');
      return json;
    } catch (e) {
      return netError();
    }
  }

  /* Membaca ruangan lewat RLS (hanya anggota yang bisa melihat) */
  async function fetchSnapshot(roomId, meId) {
    var c = client();
    var results = await Promise.all([
      c.from('rooms').select('id,code,host_id,status,public_state').eq('id', roomId).maybeSingle(),
      c.from('room_players').select('user_id,name,seat').eq('room_id', roomId),
      c.from('hands').select('cards,drawn_card_id').eq('room_id', roomId).eq('user_id', meId).maybeSingle()
    ]);
    if (results[0].error || results[1].error) throw new Error('baca ruangan gagal');
    if (!results[0].data) return null;      // ruangan dihapus / bukan anggota
    var hand = results[2].data;
    return {
      room: results[0].data,
      players: (results[1].data || []).sort(function (a, b) { return a.seat - b.seat; }),
      hand: hand ? hand.cards : [],
      drawn: hand ? hand.drawn_card_id : null
    };
  }

  /* Berlangganan perubahan. onChange() dipanggil saat ada kemungkinan perubahan
     (UI lalu mengambil snapshot baru). Mengembalikan fungsi berhenti. */
  function subscribe(roomId, onChange) {
    var channel = null, timer = null, stopped = false;
    try {
      channel = client().channel('room-' + roomId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: 'id=eq.' + roomId }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: 'room_id=eq.' + roomId }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hands', filter: 'room_id=eq.' + roomId }, onChange)
        .subscribe();
    } catch (e) { channel = null; }
    timer = setInterval(function () { if (!stopped && !document.hidden) onChange(); }, 3000);
    function onVisible() { if (!document.hidden) onChange(); }
    document.addEventListener('visibilitychange', onVisible);
    return function stop() {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      try { if (channel) client().removeChannel(channel); } catch (e) { /* abaikan */ }
    };
  }

  /* Menyusun "view" yang sama bentuknya dengan engine.getView, agar
     render-players.js bisa dipakai apa adanya. */
  function buildView(snap, meId) {
    var pub = snap.room.public_state;
    var names = {};
    snap.players.forEach(function (p) { names[p.user_id] = p.name; });
    var me = names[meId] || 'Kamu';
    return {
      version: pub.version,
      round: pub.round,
      phase: pub.phase,
      me: { id: meId, name: me, hand: snap.hand },
      players: pub.players.map(function (p) {
        return { id: p.id, name: p.name, isBot: false, handCount: p.handCount };
      }),
      turnPlayerId: pub.turnPlayerId,
      drawCount: pub.drawCount,
      topCard: pub.topCard,
      discardCount: pub.discardCount,
      activeColor: pub.activeColor,
      activeHaraka: pub.activeHaraka,
      drawnCardId: pub.turnPlayerId === meId ? snap.drawn : null,
      winnerId: pub.winnerId,
      roundScore: pub.roundScore,
      scores: pub.scores || {}
    };
  }

  HP.onlineClient = {
    userId: userId,
    call: call,
    fetchSnapshot: fetchSnapshot,
    subscribe: subscribe,
    buildView: buildView
  };
}());
