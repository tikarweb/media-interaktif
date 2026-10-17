/* =====================================================
   APP.JS — pengendali layar & mode latihan lawan bot.
   Semua aturan ada di engine (game-state.js); file ini hanya
   menyambungkan klik -> engine -> tampilan.
   ===================================================== */
(function () {
  'use strict';

  var HP = window.HarakaPlay;
  var GS = HP.gameState;
  var dialogs = HP.dialogs;
  var HUMAN = 'p0';
  var BOT_NAMES = ['Bot Ani', 'Bot Budi', 'Bot Citra'];
  var BOT_DELAY = 900;

  var game = null;          // status permainan (engine)
  var scores = {};          // skor kumulatif
  var round = 1;
  var botCount = 1;
  var botTimer = null;
  var busy = false;         // true saat dialog pilihan terbuka / menunggu bot
  var ext = null;           // pengendali mode online (js/ui/online-ui.js); null = mode bot

  function $(id) { return document.getElementById(id); }

  /* ---------- Layar ---------- */
  function show(name) {
    ['menu', 'setup', 'online', 'lobby', 'game', 'result'].forEach(function (n) {
      $('screen-' + n).classList.toggle('is-active', n === name);
    });
    document.body.classList.toggle('in-game', name === 'game');
    window.scrollTo(0, 0);
  }

  /* ---------- Nama pemain (tersimpan di browser, aman bila gagal) ---------- */
  function loadName() {
    try { return localStorage.getItem('harakaplay-name') || ''; } catch (e) { return ''; }
  }
  function saveName(v) {
    try { localStorage.setItem('harakaplay-name', v); } catch (e) { /* abaikan */ }
  }

  /* ---------- Mulai permainan ---------- */
  function startGame(keepScores) {
    clearTimeout(botTimer);
    var name = ($('player-name').value || '').trim().slice(0, 14) || 'Kamu';
    saveName(name);
    var players = [{ id: HUMAN, name: name, isBot: false }];
    for (var i = 0; i < botCount; i++) players.push({ id: 'b' + (i + 1), name: BOT_NAMES[i], isBot: true });
    if (!keepScores) { scores = {}; round = 1; }
    game = GS.createGame({ players: players, scores: scores, round: round });
    busy = false;
    show('game');
    render(null);
    scheduleBot();
  }

  /* ---------- Tampilan ---------- */
  function render(newPlayedId) {
    var view = GS.getView(game, HUMAN);
    HP.renderPlayers.renderAll(view, { onCardClick: onCardClick }, newPlayedId);
  }

  function isMyTurn() {
    return game.phase === 'playing' && GS.currentPlayer(game).id === HUMAN;
  }

  /* ---------- Menjalankan aksi lewat engine ---------- */
  function dispatch(action) {
    var r = GS.applyAction(game, action);
    if (!r.ok) return r;
    game = r.state;
    scores = game.scores;
    var played = null;
    r.events.forEach(function (e) { if (e.type === 'play') played = e.card.id; });
    render(played);
    announce(r.events);
    if (game.phase === 'finished') {
      clearTimeout(botTimer);
      setTimeout(showResult, 900);
    } else {
      scheduleBot();
    }
    return r;
  }

  // Pemberitahuan singkat untuk kejadian penting
  function announce(events) {
    events.forEach(function (e) {
      var p = game.players.filter(function (x) { return x.id === e.playerId; })[0];
      var nm = p ? (p.id === HUMAN ? 'Kamu' : p.name) : 'Pemain';
      if (e.type === 'penalty') dialogs.toast(nm + ' ambil 1 kartu dan kehilangan giliran', 'warn');
    });
  }

  /* ---------- Klik kartu: validasi SETELAH klik ---------- */
  function onCardClick(card) {
    if (ext) return ext.onCard(card);
    if (busy) return;
    if (!game || game.phase !== 'playing') return;
    var r = GS.applyAction(game, { type: 'play', playerId: HUMAN, cardId: card.id });
    if (r.ok) { applyOk(r); return; }
    if (r.code === 'need_choice') {
      busy = true;
      var ask = r.needs === 'haraka' ? dialogs.chooseHaraka() : dialogs.chooseColor();
      ask.then(function (value) {
        busy = false;
        if (!value) return;     // dibatalkan: tidak ada perubahan
        var r2 = dispatch({ type: 'play', playerId: HUMAN, cardId: card.id, choice: value });
        if (!r2.ok) dialogs.toast(r2.message, 'warn');
      });
      return;
    }
    dialogs.toast(r.message, 'warn');
  }

  function applyOk(r) {
    game = r.state;
    scores = game.scores;
    var played = null;
    r.events.forEach(function (e) { if (e.type === 'play') played = e.card.id; });
    render(played);
    announce(r.events);
    if (game.phase === 'finished') { clearTimeout(botTimer); setTimeout(showResult, 900); }
    else scheduleBot();
  }

  function onDraw() {
    if (ext) return ext.onDraw();
    if (busy || !game || game.phase !== 'playing') return;
    if (!isMyTurn()) { dialogs.toast('Belum giliranmu.', 'warn'); return; }
    var r = dispatch({ type: 'draw', playerId: HUMAN });
    if (!r.ok) { dialogs.toast(r.message, 'warn'); return; }
    var drew = r.events.filter(function (e) { return e.type === 'draw'; })[0];
    if (game.drawnCardId) dialogs.toast('Kartu yang kamu ambil bisa dimainkan. Mainkan atau Lewati.', 'good');
    else dialogs.toast('Kartu tidak cocok, giliran berpindah.', 'warn');
  }

  function onPass() {
    if (ext) return ext.onPass();
    if (busy || !game) return;
    var r = dispatch({ type: 'pass', playerId: HUMAN });
    if (!r.ok) dialogs.toast(r.message, 'warn');
  }

  /* ---------- Bot ---------- */
  function scheduleBot() {
    clearTimeout(botTimer);
    if (!game || game.phase !== 'playing') return;
    var cur = GS.currentPlayer(game);
    if (!cur.isBot) return;
    botTimer = setTimeout(function () { botStep(cur.id); }, BOT_DELAY);
  }

  function botStep(botId) {
    if (!game || game.phase !== 'playing' || GS.currentPlayer(game).id !== botId) return;
    var action = HP.bot.chooseAction(GS.getView(game, botId));
    action.playerId = botId;
    var r = dispatch(action);
    if (!r.ok) {            // pengaman: bot tidak boleh macet
      r = dispatch({ type: 'draw', playerId: botId });
      if (!r.ok) dispatch({ type: 'pass', playerId: botId });
    }
  }

  /* ---------- Hasil ---------- */
  function showResult() {
    if (!game || game.phase !== 'finished') return;
    var winner = game.players.filter(function (p) { return p.id === game.winnerId; })[0];
    var mine = winner.id === HUMAN;
    $('result-trophy').textContent = mine ? '🏆' : '🎉';
    $('result-title').textContent = mine ? 'Kamu menang!' : winner.name + ' menang!';
    $('result-sub').textContent = 'Poin ronde ini: +' + game.roundScore;

    var tb = $('result-rows');
    tb.innerHTML = '';
    game.players.forEach(function (p) {
      var tr = document.createElement('tr');
      if (p.id === winner.id) tr.className = 'is-winner';
      var cells = [p.name + (p.id === HUMAN ? ' (kamu)' : ''), p.hand.length, game.scores[p.id] || 0];
      cells.forEach(function (c) {
        var td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    show('result');
  }

  /* ---------- Tombol & navigasi ---------- */
  function bind() {
    $('player-name').value = loadName();

    $('btn-practice').addEventListener('click', function () { show('setup'); $('player-name').focus(); });
    $('btn-online').addEventListener('click', function () {
      if (HP.online) HP.online.open(); else dialogs.openModal('modal-online');
    });
    $('btn-rules').addEventListener('click', function () { dialogs.openModal('modal-rules'); });
    $('btn-rules-game').addEventListener('click', function () { dialogs.openModal('modal-rules'); });

    Array.prototype.forEach.call(document.querySelectorAll('.hp-chip[data-bots]'), function (b) {
      b.addEventListener('click', function () {
        botCount = parseInt(b.getAttribute('data-bots'), 10);
        Array.prototype.forEach.call(document.querySelectorAll('.hp-chip[data-bots]'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
      });
    });

    $('btn-setup-back').addEventListener('click', function () { show('menu'); });
    $('btn-start').addEventListener('click', function () { startGame(false); });
    $('player-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') startGame(false); });

    $('draw-pile-btn').addEventListener('click', onDraw);
    $('draw-btn').addEventListener('click', onDraw);
    $('pass-btn').addEventListener('click', onPass);

    $('btn-exit').addEventListener('click', function () {
      if (ext) return ext.onExit();
      dialogs.confirmDialog('Keluar dari permainan?', 'Permainan yang sedang berjalan akan berhenti.', 'Keluar').then(function (yes) {
        if (!yes) return;
        clearTimeout(botTimer);
        game = null;
        show('menu');
      });
    });

    $('btn-again').addEventListener('click', function () {
      if (ext) return ext.onAgain();
      round = (game ? game.round : round) + 1; startGame(true); });
    $('btn-home').addEventListener('click', function () {
      if (ext) return ext.onHome();
      clearTimeout(botTimer); game = null; show('menu'); });
  }

  document.addEventListener('DOMContentLoaded', bind);

  // Untuk pengujian otomatis
  HP.app = {
    getGame: function () { return game; },
    show: show,
    setExt: function (e) { ext = e; },
    loadName: loadName,
    saveName: saveName
  };
}());
