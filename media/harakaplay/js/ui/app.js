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
  var WAAHID_GRACE = 3200;     // jeda bot menunggu bila kamu perlu menekan Waahid
  var CATCH_AT = 2200;         // kapan bot (kadang) menangkap kamu yang lupa Waahid
  var waahidTimer = null, catchTimer = null;

  var game = null;          // status permainan (engine)
  var scores = {};          // skor kumulatif
  var round = 1;
  var level = 'l1';         // level belajar yang sedang dimainkan
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
    clearTimeout(botTimer); clearTimeout(waahidTimer); clearTimeout(catchTimer);
    HP.wordUI.hidePop();
    var name = ($('player-name').value || '').trim().slice(0, 14) || 'Kamu';
    saveName(name);
    var players = [{ id: HUMAN, name: name, isBot: false }];
    for (var i = 0; i < botCount; i++) players.push({ id: 'b' + (i + 1), name: BOT_NAMES[i], isBot: true });
    if (!keepScores) { scores = {}; round = 1; }
    game = GS.createGame({ players: players, scores: scores, round: round, level: level });
    busy = false;
    show('game');
    render(null);
    scheduleBot();
  }

  /* ---------- Tampilan ---------- */
  function render(newPlayedId) {
    var view = GS.getView(game, HUMAN);
    HP.renderPlayers.renderAll(view, { onCardClick: onCardClick, onCatch: onCatch }, newPlayedId);
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

  // Pemberitahuan singkat untuk kejadian penting + giliran bot terkait Waahid
  function announce(events) {
    var names = {};
    game.players.forEach(function (p) { names[p.id] = p.name; });
    HP.wordUI.announce(events, names, HUMAN);
    planWaahid();
  }

  // Bot: kadang lupa menekan Waahid; bot juga kadang menangkap kamu bila kamu lupa
  function planWaahid() {
    clearTimeout(waahidTimer); clearTimeout(catchTimer);
    if (!game || game.phase !== 'playing' || !game.waahidFor) return;
    var who = game.waahidFor;
    var owner = game.players.filter(function (p) { return p.id === who; })[0];
    var version = game.version;
    if (owner.isBot) {
      if (Math.random() < 0.8) {
        waahidTimer = setTimeout(function () {
          if (game && game.waahidFor === who && game.version === version) dispatch({ type: 'waahid', playerId: who });
        }, 500);
      }
    } else if (Math.random() < 0.7) {
      var catcher = game.players.filter(function (p) { return p.isBot; })[0];
      catchTimer = setTimeout(function () {
        if (game && game.waahidFor === who && game.version === version && catcher) dispatch({ type: 'catch', playerId: catcher.id });
      }, CATCH_AT);
    }
  }

  function onWaahid() {
    if (ext) return ext.onWaahid();
    if (!game) return;
    var r = dispatch({ type: 'waahid', playerId: HUMAN });
    if (!r.ok) dialogs.toast(r.message, 'warn');
  }

  function onCatch(pid) {
    if (ext) return ext.onCatch(pid);
    if (!game) return;
    var r = dispatch({ type: 'catch', playerId: HUMAN });
    if (!r.ok) dialogs.toast(r.message, 'warn');
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
      var ask = r.needs === 'haraka' ? dialogs.chooseHaraka(game.level) : dialogs.chooseColor();
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
    var delay = game.waahidFor === HUMAN ? WAAHID_GRACE : BOT_DELAY;
    botTimer = setTimeout(function () { botStep(cur.id); }, delay);
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
    $('result-sub').textContent = HP.config.getLevel(game.level).name + '  •  Poin ronde ini: +' + game.roundScore;
    $('btn-again').textContent = 'Ulangi Level Ini';
    $('btn-again').disabled = false;
    var rnames = {};
    game.players.forEach(function (p) { rnames[p.id] = p.name; });
    HP.wordUI.renderResultWords(game.mode === 'iqlab' ? game.wordsDone : [], rnames, HUMAN);
    var nxt = HP.levelsUI.nextOf(game.level);
    $('btn-next-level').hidden = !nxt;
    $('btn-next-level').disabled = false;
    if (nxt) $('btn-next-level').textContent = nxt.name + ' ▶';

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

  /* ---------- Pilihan mode di menu ---------- */
  function bindModes() {
    HP.levelsUI.loadMode();
    var cards = document.querySelectorAll('.hp-mode[data-mode]');
    function paint() {
      Array.prototype.forEach.call(cards, function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-mode') === HP.levelsUI.getMode() ? 'true' : 'false');
      });
      var m = HP.config.getMode(HP.levelsUI.getMode());
      $('mode-desc').textContent = m.desc;
    }
    Array.prototype.forEach.call(cards, function (c) {
      c.addEventListener('click', function () {
        var id = c.getAttribute('data-mode');
        var m = HP.config.getMode(id);
        if (!m.available) { dialogs.toast(m.name + ' segera hadir di pembaruan berikutnya.', 'good'); return; }
        HP.levelsUI.setMode(id);
        paint();
      });
    });
    paint();
  }

  /* ---------- Tombol & navigasi ---------- */
  function bind() {
    $('player-name').value = loadName();

    bindModes();
    $('btn-practice').addEventListener('click', function () {
      HP.levelsUI.fill($('setup-level'));
      $('setup-mode').textContent = HP.config.getMode(HP.levelsUI.getMode()).name;
      show('setup'); $('player-name').focus();
    });
    $('btn-online').addEventListener('click', function () {
      HP.levelsUI.fillAll($('lobby-level'));
      if (HP.online) HP.online.open(); else dialogs.openModal('modal-online');
    });
    $('waahid-btn').addEventListener('click', onWaahid);
    $('word-pop').addEventListener('click', HP.wordUI.hidePop);
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
    $('btn-start').addEventListener('click', function () {
      level = $('setup-level').value;
      HP.levelsUI.remember(level);
      startGame(false);
    });
    $('player-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('btn-start').click(); });

    $('draw-pile-btn').addEventListener('click', onDraw);
    $('draw-btn').addEventListener('click', onDraw);
    $('pass-btn').addEventListener('click', onPass);

    $('btn-exit').addEventListener('click', function () {
      if (ext) return ext.onExit();
      dialogs.confirmDialog('Keluar dari permainan?', 'Permainan yang sedang berjalan akan berhenti.', 'Keluar').then(function (yes) {
        if (!yes) return;
        clearTimeout(botTimer); clearTimeout(waahidTimer); clearTimeout(catchTimer);
        game = null;
        show('menu');
      });
    });

    $('btn-again').addEventListener('click', function () {
      if (ext) return ext.onAgain();
      round = (game ? game.round : round) + 1; level = game ? game.level : level; startGame(true); });
    $('btn-next-level').addEventListener('click', function () {
      if (ext) return ext.onNextLevel();
      var nxt = HP.levelsUI.nextOf(game ? game.level : level);
      if (!nxt) return;
      round = (game ? game.round : round) + 1; level = nxt.id; HP.levelsUI.remember(level); startGame(true);
    });
    $('btn-home').addEventListener('click', function () {
      if (ext) return ext.onHome();
      clearTimeout(botTimer); clearTimeout(waahidTimer); clearTimeout(catchTimer); game = null; show('menu'); });
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
