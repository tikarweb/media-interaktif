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
      else if (e.type === 'quizOk') HP.dialogs.toast(who + ' menjawab benar \u2705', 'good');
      else if (e.type === 'quizWrong') HP.dialogs.toast(who + ' salah menjawab, ambil 1 kartu dan giliran berpindah', 'warn');
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
    box.querySelector('h3').textContent = 'Kata yang berhasil dirangkai';
    var note = $('result-words-note');
    if (!note) {
      note = document.createElement('p');
      note.id = 'result-words-note';
      note.className = 'hp-rw__note';
      box.insertBefore(note, $('result-words-list'));
    }
    note.textContent = 'Lencana \ud83c\udfc5 di kanan = pemain yang merangkai kata itu (bukan bagian dari arti).';
    var ul = $('result-words-list');
    ul.innerHTML = '';
    done.forEach(function (d) {
      var w = config.wordById[d.wordId];
      if (!w) return;
      var who = d.by === meId ? 'kamu' : (names[d.by] || 'Pemain');
      var li = document.createElement('li');
      li.className = 'hp-rw';
      var ar = document.createElement('span');
      ar.className = 'ar hp-rw__ar';
      ar.textContent = w.arab;
      var arti = document.createElement('span');
      arti.className = 'hp-rw__arti';
      arti.textContent = w.arti;
      var by = document.createElement('span');
      by.className = 'hp-rw__by' + (d.by === meId ? ' is-me' : '');
      by.textContent = '\ud83c\udfc5 ' + who;
      by.title = 'Dirangkai oleh ' + who;
      li.appendChild(ar);
      li.appendChild(arti);
      li.appendChild(by);
      ul.appendChild(li);
    });
  }

  // Layar hasil Syadid: skor kuis + kata yang salah dijawab (untuk diulang). state = engine state / public state.
  function renderQuizReview(st, names, meId) {
    if (!st) return;
    var box = $('result-words');
    box.hidden = false;
    box.querySelector('h3').textContent = 'Kuis arti kata';
    var note = $('result-words-note');
    if (!note) {
      note = document.createElement('p');
      note.id = 'result-words-note';
      note.className = 'hp-rw__note';
      box.insertBefore(note, $('result-words-list'));
    }
    var by = st.quizBy || {};
    var parts = Object.keys(by).map(function (id) {
      var who = id === meId ? 'Kamu' : (names[id] || 'Pemain');
      return who + ': ' + by[id].ok + ' benar, ' + by[id].no + ' salah';
    });
    var missed = st.quizMissed || [];
    note.textContent = parts.join('  \u2022  ') + (missed.length ? '.  Kata di bawah perlu diulang:' : '.  Tidak ada yang salah. Hebat!');
    var ul = $('result-words-list');
    ul.innerHTML = '';
    var seen = {};
    missed.forEach(function (m) {
      var v = config.vocabById[m.wordId];
      if (!v) return;
      var li = document.createElement('li');
      li.className = 'hp-rw';
      var ar = document.createElement('span');
      ar.className = 'ar hp-rw__ar';
      ar.textContent = v.voc;
      var arti = document.createElement('span');
      arti.className = 'hp-rw__arti';
      arti.textContent = v.arti + '  (' + config.polaById[v.pola].nama + ')';
      var who = m.by === meId ? 'kamu' : (names[m.by] || 'Pemain');
      var tag = document.createElement('span');
      tag.className = 'hp-rw__by' + (m.by === meId ? ' is-me' : '');
      tag.textContent = '\u274c ' + who;
      tag.title = 'Salah dijawab oleh ' + who;
      li.appendChild(ar); li.appendChild(arti); li.appendChild(tag);
      ul.appendChild(li);
    });
  }

  HP.wordUI = { renderQuizReview: renderQuizReview, renderResultWords: renderResultWords, renderPanel: renderPanel, showWordPop: showWordPop, hidePop: hidePop, announce: announce };
}());
