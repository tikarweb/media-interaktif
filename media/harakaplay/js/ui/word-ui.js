/* =====================================================
   WORD-UI.JS — tampilan khusus mode Iqlab (Rangkai Kata) dan
   Waahid/Tangkap: panel target kata, pop-up arti kata, pengumuman.
   Dipakai bersama oleh mode bot (app.js) dan online (online-ui.js).
   ===================================================== */
(function () {
  'use strict';
  var HP = window.HarakaPlay;
  var config = HP.config;
  var popTimer = null;

  function $(id) { return document.getElementById(id); }

  function sylText(s) { return config.letterById[s.letter].ch + config.harakaById[s.haraka].mark; }

  // Panel "Target Kata Aktif": suku kata redup -> terang saat terisi. Arti disembunyikan sampai selesai.
  function renderPanel(view) {
    var panel = $('word-panel');
    var show = view.mode === 'iqlab' && view.target && view.phase === 'playing';
    panel.hidden = !show;
    if (!show) return;
    var word = config.wordById[view.target.wordId];
    var slots = $('word-slots');
    slots.innerHTML = '';
    word.syllables.forEach(function (s, i) {
      var el = document.createElement('span');
      el.className = 'hp-slot' + (view.target.filled[i] ? ' is-filled' : '');
      el.textContent = sylText(s);
      el.setAttribute('aria-label', view.target.filled[i] ? 'terisi' : 'belum terisi');
      slots.appendChild(el);
    });
    var done = view.wordsBy && view.wordsBy[view.me.id] || 0;
    $('word-count').textContent = 'Kata kamu: ' + done;
  }

  function hidePop() {
    clearTimeout(popTimer);
    var el = $('word-pop');
    if (el) el.hidden = true;
  }

  // Pop-up arti kata saat selesai dirangkai
  function showWordPop(wordId, byName, bonusText) {
    var w = config.wordById[wordId];
    if (!w) return;
    $('word-pop-ar').textContent = w.arab;
    $('word-pop-arti').textContent = w.arti;
    $('word-pop-by').textContent = byName + ' menyelesaikan kata ini!' + (bonusText ? '  ' + bonusText : '');
    $('word-pop').hidden = false;
    clearTimeout(popTimer);
    popTimer = setTimeout(hidePop, 4500);
    if (HP.pronounce) HP.pronounce.playWord(wordId);
  }

  // events: dari engine / status publik. names: {playerId: nama}, meId: id kita
  function announce(events, names, meId) {
    var bonus = null;
    (events || []).forEach(function (e) { if (e.type === 'bonus') bonus = e; });
    (events || []).forEach(function (e) {
      var who = e.playerId === meId ? 'Kamu' : (names[e.playerId] || 'Pemain');
      if (e.type === 'penalty') HP.dialogs.toast(who + ' ambil 1 kartu dan kehilangan giliran', 'warn');
      else if (e.type === 'wordComplete') {
        var bt = '';
        if (bonus) bt = (bonus.playerId === meId ? 'Kamu' : (names[bonus.playerId] || 'Pemain')) + ' ambil ' + bonus.count + ' kartu (bonus).';
        showWordPop(e.wordId, who, bt);
      }
      else if (e.type === 'waahid') HP.dialogs.toast(who + ': ' + config.UI.waahid.ar + ' (' + config.UI.waahid.id + ')', 'good');
      else if (e.type === 'caught') {
        var by = e.byId === meId ? 'Kamu' : (names[e.byId] || 'Pemain');
        HP.dialogs.toast(by + ' menangkap ' + who + '! ' + who + ' ambil ' + e.count + ' kartu', 'warn');
      }
    });
  }

  // Daftar kata yang berhasil dirangkai di ronde ini (layar hasil)
  function renderResultWords(done, names, meId) {
    var box = $('result-words');
    if (!done || !done.length) { box.hidden = true; return; }
    box.hidden = false;
    var ul = $('result-words-list');
    ul.innerHTML = '';
    done.forEach(function (d) {
      var w = config.wordById[d.wordId];
      if (!w) return;
      var li = document.createElement('li');
      var ar = document.createElement('span');
      ar.className = 'ar';
      ar.textContent = w.arab;
      var txt = document.createElement('span');
      txt.textContent = ' = ' + w.arti + '  (' + (d.by === meId ? 'kamu' : (names[d.by] || 'Pemain')) + ')';
      li.appendChild(ar);
      li.appendChild(txt);
      ul.appendChild(li);
    });
  }

  HP.wordUI = { renderResultWords: renderResultWords, renderPanel: renderPanel, showWordPop: showWordPop, hidePop: hidePop, announce: announce };
}());
