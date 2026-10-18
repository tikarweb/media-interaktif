/* =====================================================
   RENDER-PLAYERS.JS — menggambar papan: lawan, tumpukan,
   warna & harakat aktif, tangan, giliran, skor.
   Hanya membaca "view" (tanpa kartu tersembunyi).
   ===================================================== */
(function (root, factory) {
  var HP = (root.HarakaPlay = root.HarakaPlay || {});
  HP.renderPlayers = factory(HP.config, HP.renderCards);
}(this, function (config, cards) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  // Lawan: tampilkan mulai dari pemain setelah kita (urutan giliran)
  function renderOpponents(view, handlers) {
    var box = $('opponents');
    box.innerHTML = '';
    var meIdx = view.players.findIndex(function (p) { return p.id === view.me.id; });
    var n = view.players.length;
    for (var k = 1; k < n; k++) {
      var p = view.players[(meIdx + k) % n];
      var el = document.createElement('div');
      el.className = 'hp-opp' + (p.id === view.turnPlayerId && view.phase === 'playing' ? ' is-turn' : '');
      el.dataset.playerId = p.id;

      var avatar = document.createElement('span');
      avatar.className = 'hp-opp__avatar c-' + config.COLORS[(meIdx + k) % config.COLORS.length].id;
      avatar.textContent = p.isBot ? '🤖' : p.name.charAt(0).toUpperCase();

      var info = document.createElement('span');
      info.className = 'hp-opp__info';
      var nm = document.createElement('span');
      nm.className = 'hp-opp__name';
      nm.textContent = p.name;
      var sc = document.createElement('span');
      sc.className = 'hp-opp__score';
      sc.textContent = 'Skor ' + (view.scores[p.id] || 0);
      info.appendChild(nm);
      info.appendChild(sc);

      var count = document.createElement('span');
      count.className = 'hp-opp__count';
      count.title = p.handCount + ' kartu';
      count.innerHTML = '<span class="hp-opp__cards">🃏</span><b></b>';
      count.querySelector('b').textContent = p.handCount;

      el.appendChild(avatar);
      el.appendChild(info);
      el.appendChild(count);
      if (view.waahidFor === p.id && view.phase === 'playing') {
        el.className += ' is-waahid';
        var cb = document.createElement('button');
        cb.type = 'button';
        cb.className = 'hp-btn hp-btn--small hp-btn--red hp-catch';
        cb.innerHTML = '<span class="ar">' + config.UI.catch.ar + '</span> <small>' + config.UI.catch.id + '</small>';
        (function (pid) { cb.addEventListener('click', function () { if (handlers.onCatch) handlers.onCatch(pid); }); }(p.id));
        el.appendChild(cb);
      }
      box.appendChild(el);
    }
  }

  // Tengah meja: tumpukan ambil, tumpukan buang, warna & harakat aktif
  function renderTable(view, newPlayedId) {
    var drawPile = $('draw-pile-card');
    drawPile.innerHTML = '';
    drawPile.appendChild(cards.createBackEl());
    $('draw-count').textContent = view.drawCount;

    var discard = $('discard-card');
    discard.innerHTML = '';
    discard.appendChild(cards.createCardEl(view.topCard, { static: true, pop: view.topCard.id === newPlayedId, level: view.level }));
    if (newPlayedId && HarakaPlay.pronounce) HarakaPlay.pronounce.play(view.topCard);

    var color = config.colorById[view.activeColor];
    var chipColor = $('active-color');
    chipColor.style.setProperty('--swatch', color.hex);
    $('active-color-name').textContent = color.name;

    var h = config.harakaById[view.activeHaraka];
    $('active-haraka-mark').textContent = 'ا' + h.mark;
    $('active-haraka-name').textContent = h.name;

    // Cara baca kartu teratas (membantu belajar pelafalan)
    var say = $('say-syllable');
    if (view.topCard.type === 'normal' && config.getMode(view.mode || config.modeOfLevel(view.level)).showLatin) {
      say.textContent = cards.syllableText(view.topCard.letter, view.topCard.haraka) + '  =  ' +
        cards.syllableLatin(view.topCard.letter, view.topCard.haraka);
      say.hidden = false;
    } else {
      say.hidden = true;
    }
  }

  // Tangan: semua kartu SELALU bisa diklik; validasi dilakukan setelah klik
  function renderHand(view, onCardClick) {
    var box = $('hand');
    box.innerHTML = '';
    cards.sortHand(view.me.hand).forEach(function (card) {
      var el = cards.createCardEl(card, { level: view.level });
      if (card.id === view.drawnCardId) el.className += ' is-drawn';
      el.addEventListener('click', function () { onCardClick(card); });
      box.appendChild(el);
    });
    $('hand-count').textContent = view.me.hand.length + ' kartu';
  }

  function renderTurn(view) {
    var banner = $('turn-banner');
    var mine = view.turnPlayerId === view.me.id && view.phase === 'playing';
    banner.className = 'hp-turn' + (mine ? ' is-mine' : '');
    if (view.phase !== 'playing') {
      banner.textContent = 'Ronde selesai';
    } else if (mine) {
      banner.textContent = view.drawnCardId
        ? 'Mainkan kartu yang baru diambil, atau Lewati'
        : config.UI.turn.ar + ' · Giliranmu!';
    } else {
      var p = view.players.find(function (x) { return x.id === view.turnPlayerId; });
      banner.textContent = config.UI.turn.ar + ' · Giliran ' + p.name + '…';
    }
    $('pass-btn').hidden = !(mine && view.drawnCardId);
    $('draw-btn').disabled = false;
    var wb = $('waahid-btn');
    wb.hidden = !(view.phase === 'playing' && view.waahidFor === view.me.id);
  }

  function renderScore(view) {
    var lv = config.getLevel(view.level);
    $('score-brief').textContent = lv.name + '  •  Ronde ' + view.round + '  •  Skor kamu: ' + (view.scores[view.me.id] || 0);
  }

  function renderAll(view, handlers, newPlayedId) {
    document.body.setAttribute('data-level', view.level);   // untuk tema warna latar (CSS)
    renderOpponents(view, handlers);
    renderTable(view, newPlayedId);
    if (HarakaPlay.wordUI) HarakaPlay.wordUI.renderPanel(view);
    renderHand(view, handlers.onCardClick);
    renderTurn(view);
    renderScore(view);
  }

  return { renderAll: renderAll };
}));
