/* =====================================================
   ONLINE-UI.JS — lobi dan permainan online (2–4 pemain).
   Memakai layar permainan & hasil yang sama dengan mode bot.
   Server adalah sumber kebenaran: klien hanya mengirim niat
   (main kartu / ambil / lewati) dan menggambar apa yang dikirim server.
   ===================================================== */
(function () {
  'use strict';

  var HP = window.HarakaPlay;
  var net = HP.onlineClient;
  var dialogs = HP.dialogs;
  var SAVE_KEY = 'harakaplay-room';

  var ctx = null;     // { roomId, code, meId, snap, stop, busy, lastVersion, lastStatus, refreshing, resultTimer }

  function $(id) { return document.getElementById(id); }
  function app() { return HP.app; }

  /* ---------- Penyimpanan ruangan terakhir (aman bila gagal) ---------- */
  function saveRoom(r) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(r)); } catch (e) { /* abaikan */ } }
  function loadRoom() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function clearRoom() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* abaikan */ } }

  function setMsg(text) { var m = $('online-msg'); m.textContent = text || ''; m.hidden = !text; }
  function nameValue() { return ($('online-name').value || '').trim().slice(0, 14) || 'Pemain'; }

  function setBusyButtons(on) {
    ['btn-create-room', 'btn-join-room', 'btn-resume'].forEach(function (id) { $(id).disabled = on; });
  }

  /* ---------- Layar Online ---------- */
  function open(prefillCode) {
    app().setExt(null);
    $('online-name').value = app().loadName();
    if (prefillCode) $('online-code').value = prefillCode;
    setMsg('');
    var saved = loadRoom();
    $('resume-box').hidden = !saved;
    if (saved) $('resume-code').textContent = saved.code;
    app().show('online');
  }

  async function createRoom() {
    setMsg(''); setBusyButtons(true);
    app().saveName(nameValue());
    var r = await net.call({ action: 'create', name: nameValue() });
    setBusyButtons(false);
    if (!r.ok) { setMsg(r.message); return; }
    enterRoom(r.roomId, r.code);
  }

  async function joinRoom() {
    setMsg('');
    var code = ($('online-code').value || '').trim();
    if (!code) { setMsg('Masukkan kode ruangan dulu.'); return; }
    setBusyButtons(true);
    app().saveName(nameValue());
    var r = await net.call({ action: 'join', code: code, name: nameValue() });
    setBusyButtons(false);
    if (!r.ok) { setMsg(r.message); return; }
    enterRoom(r.roomId, r.code);
  }

  function resume() {
    var saved = loadRoom();
    if (!saved) return;
    setMsg(''); setBusyButtons(true);
    enterRoom(saved.roomId, saved.code, true);
  }

  /* ---------- Masuk ke ruangan ---------- */
  async function enterRoom(roomId, code, fromResume) {
    try {
      var meId = await net.userId();
      var snap = await net.fetchSnapshot(roomId, meId);
      if (!snap) {
        clearRoom(); setBusyButtons(false); open();
        setMsg('Ruangan itu sudah tidak ada.');
        return;
      }
      saveRoom({ roomId: roomId, code: code });
      ctx = { roomId: roomId, code: code, meId: meId, snap: null, busy: false, lastVersion: -1, lastStatus: null, refreshing: false, resultTimer: null };
      app().setExt(handlers);
      ctx.stop = net.subscribe(roomId, refresh);
      setBusyButtons(false);
      apply(snap);
    } catch (e) {
      setBusyButtons(false);
      if (fromResume) { setMsg('Belum bisa tersambung. Coba lagi sebentar lagi.'); }
      else setMsg('Belum bisa tersambung. Coba lagi sebentar lagi.');
    }
  }

  async function refresh() {
    if (!ctx || ctx.refreshing) return;
    ctx.refreshing = true;
    var mine = ctx;
    try {
      var snap = await net.fetchSnapshot(mine.roomId, mine.meId);
      if (ctx !== mine) return;           // sudah keluar ruangan
      if (!snap) { roomGone('Ruangan sudah ditutup.'); return; }
      apply(snap);
    } catch (e) {
      /* gangguan sesaat: coba lagi pada polling berikutnya */
    } finally {
      if (ctx === mine) ctx.refreshing = false;
    }
  }

  function roomGone(text) {
    leaveToMenu();
    clearRoom();
    open();
    setMsg(text);
  }

  function leaveToMenu() {
    if (ctx) {
      if (ctx.stop) ctx.stop();
      clearTimeout(ctx.resultTimer);
    }
    ctx = null;
    app().setExt(null);
  }

  /* ---------- Menggambar sesuai status ruangan ---------- */
  function isHost() { return ctx.snap.room.host_id === ctx.meId; }

  function apply(snap) {
    var prev = ctx.lastStatus;
    ctx.snap = snap;
    var status = snap.room.status;

    if (status === 'closed') { roomGone('Ruangan ditutup oleh tuan rumah.'); return; }

    if (status === 'lobby') {
      renderLobby();
      app().show('lobby');
    } else if (status === 'playing') {
      renderGame();
      app().show('game');
      if (prev === 'finished') clearTimeout(ctx.resultTimer);
    } else if (status === 'finished') {
      if (prev === 'playing') {
        renderGame();                                  // perlihatkan kartu terakhir sebentar
        var mine = ctx;
        clearTimeout(ctx.resultTimer);
        ctx.resultTimer = setTimeout(function () {
          if (ctx === mine && ctx.snap.room.status === 'finished') { renderResult(); app().show('result'); }
        }, 1100);
      } else {
        renderResult();
        app().show('result');
      }
    }
    ctx.lastStatus = status;
  }

  function renderLobby() {
    var snap = ctx.snap;
    $('lobby-code').textContent = ctx.code;
    var list = $('lobby-players');
    list.innerHTML = '';
    snap.players.forEach(function (p) {
      var li = document.createElement('li');
      var nm = document.createElement('span');
      nm.textContent = p.name + (p.user_id === ctx.meId ? ' (kamu)' : '');
      li.appendChild(nm);
      if (p.user_id === snap.room.host_id) {
        var b = document.createElement('span');
        b.className = 'hp-badge hp-badge--dark';
        b.textContent = 'tuan rumah';
        li.appendChild(b);
      }
      list.appendChild(li);
    });
    var host = isHost();
    var enough = snap.players.length >= 2;
    $('btn-lobby-start').hidden = !host;
    $('btn-lobby-start').disabled = !enough;
    $('lobby-hint').textContent = host
      ? (enough ? 'Semua siap? Tekan Mulai!' : 'Menunggu pemain lain… (minimal 2, maksimal 4)')
      : 'Menunggu tuan rumah memulai permainan…';
  }

  function toastEvents(pub) {
    if (pub.version === ctx.lastVersion) return;
    var firstLoad = ctx.lastVersion < 0;
    ctx.lastVersion = pub.version;
    if (firstLoad) return;
    var names = {};
    pub.players.forEach(function (p) { names[p.id] = p.name; });
    (pub.lastEvents || []).forEach(function (e) {
      var who = e.playerId === ctx.meId ? 'Kamu' : (names[e.playerId] || 'Pemain');
      if (e.type === 'penalty') dialogs.toast(who + ' ambil 1 kartu dan kehilangan giliran', 'warn');
    });
  }

  function newPlayedId(pub) {
    var id = null;
    (pub.lastEvents || []).forEach(function (e) { if (e.type === 'play' && e.card) id = e.card.id; });
    return id;
  }

  function renderGame() {
    var pub = ctx.snap.room.public_state;
    if (!pub) return;
    var changed = pub.version !== ctx.lastVersion;
    var played = changed ? newPlayedId(pub) : null;
    toastEvents(pub);
    var view = net.buildView(ctx.snap, ctx.meId);
    HP.renderPlayers.renderAll(view, { onCardClick: handlers.onCard }, played);
  }

  function renderResult() {
    var snap = ctx.snap, pub = snap.room.public_state;
    var names = {};
    snap.players.forEach(function (p) { names[p.user_id] = p.name; });
    var mine = pub.winnerId === ctx.meId;
    $('result-trophy').textContent = mine ? '🏆' : '🎉';
    $('result-title').textContent = mine ? 'Kamu menang!' : (names[pub.winnerId] || 'Pemain') + ' menang!';
    $('result-sub').textContent = 'Poin ronde ini: +' + pub.roundScore;
    var tb = $('result-rows');
    tb.innerHTML = '';
    pub.players.forEach(function (p) {
      var tr = document.createElement('tr');
      if (p.id === pub.winnerId) tr.className = 'is-winner';
      [p.name + (p.id === ctx.meId ? ' (kamu)' : ''), p.handCount, pub.scores[p.id] || 0].forEach(function (c) {
        var td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    $('btn-again').textContent = isHost() ? 'Ronde Berikutnya' : 'Menunggu tuan rumah…';
    $('btn-again').disabled = !isHost();
  }

  /* ---------- Aksi pemain (dikirim ke server) ---------- */
  function notMine() {
    var pub = ctx.snap.room.public_state;
    return !pub || pub.phase !== 'playing' || pub.turnPlayerId !== ctx.meId;
  }

  async function send(payload) {
    ctx.busy = true;
    try {
      var r = await net.call(Object.assign({ roomId: ctx.roomId }, payload));
      return r;
    } finally {
      if (ctx) ctx.busy = false;
    }
  }

  var handlers = {
    onCard: async function (card) {
      if (!ctx || ctx.busy || ctx.snap.room.status !== 'playing') return;
      if (notMine()) { dialogs.toast('Belum giliranmu.', 'warn'); return; }
      var mine = ctx;
      var r = await send({ action: 'play', cardId: card.id });
      if (!r.ok && r.code === 'need_choice') {
        mine.busy = true;
        var value = await (r.needs === 'haraka' ? dialogs.chooseHaraka() : dialogs.chooseColor());
        mine.busy = false;
        if (!value) return;
        r = await send({ action: 'play', cardId: card.id, choice: value });
      }
      if (ctx !== mine) return;
      if (!r.ok) dialogs.toast(r.message, 'warn');
      refresh();
    },

    onDraw: async function () {
      if (!ctx || ctx.busy || ctx.snap.room.status !== 'playing') return;
      if (notMine()) { dialogs.toast('Belum giliranmu.', 'warn'); return; }
      var mine = ctx;
      var r = await send({ action: 'draw' });
      if (ctx !== mine) return;
      if (!r.ok) { dialogs.toast(r.message, 'warn'); refresh(); return; }
      await refresh();
      if (ctx === mine && ctx.snap.drawn) dialogs.toast('Kartu yang kamu ambil bisa dimainkan. Mainkan atau Lewati.', 'good');
      else dialogs.toast('Kartu tidak cocok, giliran berpindah.', 'warn');
    },

    onPass: async function () {
      if (!ctx || ctx.busy) return;
      var mine = ctx;
      var r = await send({ action: 'pass' });
      if (ctx !== mine) return;
      if (!r.ok) dialogs.toast(r.message, 'warn');
      refresh();
    },

    onExit: async function () {
      if (!ctx) return;
      var mine = ctx;
      var yes = await dialogs.confirmDialog('Keluar dari permainan?',
        'Kamu tetap terdaftar di ruangan dan bisa kembali lewat tombol "Lanjutkan" di menu Online.', 'Keluar');
      if (!yes || ctx !== mine) return;
      if (isHost() && mine.snap.room.status === 'playing') {
        var endAll = await dialogs.confirmDialog('Sekalian akhiri ruangan?',
          'Semua pemain akan dikeluarkan dari permainan ini. Pilih Batal untuk keluar saja.', 'Akhiri ruangan');
        if (endAll) { await send({ action: 'end' }); clearRoom(); }
      }
      leaveToMenu();
      open();
    },

    onAgain: async function () {
      if (!ctx || ctx.busy) return;
      if (!isHost()) { dialogs.toast('Menunggu tuan rumah memulai ronde berikutnya…', 'warn'); return; }
      var r = await send({ action: 'next_round' });
      if (!r.ok) { dialogs.toast(r.message, 'warn'); return; }
      refresh();
    },

    onHome: function () {
      clearRoom();
      leaveToMenu();
      app().show('menu');
    }
  };

  /* ---------- Tombol layar Online & Lobi ---------- */
  function bind() {
    $('btn-create-room').addEventListener('click', createRoom);
    $('btn-join-room').addEventListener('click', joinRoom);
    $('btn-resume').addEventListener('click', resume);
    $('btn-forget-room').addEventListener('click', function () { clearRoom(); $('resume-box').hidden = true; });
    $('online-code').addEventListener('keydown', function (e) { if (e.key === 'Enter') joinRoom(); });
    $('online-code').addEventListener('input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    });
    $('btn-online-back').addEventListener('click', function () { app().show('menu'); });

    $('btn-lobby-start').addEventListener('click', async function () {
      if (!ctx || ctx.busy) return;
      var r = await send({ action: 'start' });
      if (!r.ok) { dialogs.toast(r.message, 'warn'); return; }
      refresh();
    });
    $('btn-lobby-leave').addEventListener('click', async function () {
      if (!ctx) return;
      var r = await send({ action: 'leave' });
      if (!r.ok && r.code !== 'room_not_found') { dialogs.toast(r.message, 'warn'); return; }
      clearRoom();
      leaveToMenu();
      open();
    });
    $('btn-copy-code').addEventListener('click', function () {
      if (!ctx) return;
      var link = location.href.split('#')[0].split('?')[0] + '?kode=' + ctx.code;
      var done = function () { dialogs.toast('Tautan undangan disalin!', 'good'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { dialogs.toast('Kode: ' + ctx.code, 'good'); });
      else dialogs.toast('Kode ruangan: ' + ctx.code, 'good');
    });

    // Tautan undangan: ...index.html?kode=ABCDE
    var m = /[?&]kode=([A-Za-z0-9]{5})/.exec(location.search);
    if (m) open(m[1].toUpperCase());
  }

  HP.online = { open: open };
  document.addEventListener('DOMContentLoaded', bind);
}());
