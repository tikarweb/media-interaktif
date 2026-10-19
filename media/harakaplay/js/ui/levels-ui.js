/* =====================================================
   LEVELS-UI.JS — mode terpilih, daftar level per mode, ingatan terakhir.
   ===================================================== */
(function () {
  'use strict';
  var HP = window.HarakaPlay;
  var config = HP.config;
  var KEY = 'harakaplay-level-';
  var MODE_KEY = 'harakaplay-mode';
  var mode = 'asasi';

  function getMode() { return mode; }
  function setMode(id) {
    var m = config.modeById[id];
    if (m && m.available) mode = id;
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* abaikan */ }
    return mode;
  }
  function loadMode() {
    try { var v = localStorage.getItem(MODE_KEY); if (config.modeById[v] && config.modeById[v].available) mode = v; }
    catch (e) { /* abaikan */ }
    return mode;
  }

  function list(modeId) { return config.getMode(modeId || mode).levels; }

  function label(level) {
    if (level.mode === 'iqlab') {
      var ar = level.words.map(function (id) { return config.wordById[id].arab; }).join('  ');
      return level.name + '  ·  ' + level.title + '  (' + level.words.length + ' kata)';
    }
    var isTanwin = level.harakat.indexOf('fathatain') >= 0;
    var letters = level.letters.map(function (id) { return config.letterById[id].ch; }).join(' ');
    return level.name + '  ·  ' + letters + (isTanwin ? '  (tanwin)' : '');
  }

  function remembered(modeId) {
    var m = modeId || mode, lv = list(m);
    try {
      var v = localStorage.getItem(KEY + m);
      for (var i = 0; i < lv.length; i++) if (lv[i].id === v) return v;
    } catch (e) { /* abaikan */ }
    return lv.length ? lv[0].id : 'l1';
  }
  function remember(id) {
    try { localStorage.setItem(KEY + config.modeOfLevel(id), id); } catch (e) { /* abaikan */ }
  }

  // Isi <select> dengan level mode saat ini (panggil lagi bila mode berubah)
  function fill(select, selectedId) {
    select.innerHTML = '';
    list().forEach(function (l) {
      var o = document.createElement('option');
      o.value = l.id;
      o.textContent = label(l);
      select.appendChild(o);
    });
    select.value = selectedId || remembered();
    if (!select.__hpBound) {
      select.__hpBound = true;
      select.addEventListener('change', function () { remember(select.value); });
    }
  }

  // Kata untuk label: "Level" di Asasi, "Paket" di Iqlab
  function noun(modeId) { return (modeId || mode) === 'iqlab' ? 'Paket' : 'Level'; }

  // Level berikutnya dalam mode yang sama
  function nextOf(levelId) {
    var lv = list(config.modeOfLevel(levelId));
    var i = lv.findIndex(function (l) { return l.id === levelId; });
    return i >= 0 && i + 1 < lv.length ? lv[i + 1] : null;
  }

  HP.levelsUI = {
    fill: fill, noun: noun, label: label, nextOf: nextOf, remembered: remembered, remember: remember,
    getMode: getMode, setMode: setMode, loadMode: loadMode, list: list
  };
}());