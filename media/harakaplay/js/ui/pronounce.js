/* =====================================================
   PRONOUNCE.JS — audio pelafalan (opsional, diam bila tidak ada).
   Rekaman huruf : audio/huruf/<file>-<harakat>.mp3   (mis. ba-fathah.mp3)
   Rekaman kata  : audio/kata/<id-kata>.mp3           (mis. jalasa.mp3)
   Daftar nama lengkap: audio/CEKLIS-AUDIO.md

   Agar console tidak penuh error 404 untuk file yang belum direkam,
   hanya file yang tercatat di audio/manifest.js yang diminta.
   Setelah menambah mp3, jalankan:  node scripts/scan-audio.js
   Saat klip diputar, musik latar diturunkan sebentar (ducking).
   ===================================================== */
(function () {
  'use strict';
  var HP = window.HarakaPlay;
  var manifest = HP.audioManifest || { huruf: [], kata: [] };
  var current = null;

  function has(list, name) { return !!list && list.indexOf(name) >= 0; }

  function duck(ms) {
    try { if (window.Backsound && window.Backsound.duck) window.Backsound.duck(ms); } catch (e) { /* abaikan */ }
  }

  function playFile(url) {
    try {
      if (current) current.pause();
      var a = new Audio(url);
      a.volume = 0.9;
      a.addEventListener('error', function () { /* tidak ada / rusak: diam */ });
      a.addEventListener('playing', function () {
        var d = isFinite(a.duration) && a.duration > 0 ? a.duration * 1000 : 1000;
        duck(Math.max(1000, d + 100));
      });
      current = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* diblokir browser: abaikan */ });
    } catch (e) { /* abaikan */ }
  }

  // Nama berkas suku kata: <file huruf>-<harakat>
  function syllableName(letterId, harakaId) {
    var l = HP.config.letterById[letterId];
    return (l && l.file ? l.file : letterId) + '-' + harakaId;
  }

  function play(card) {
    if (!card || card.type !== 'normal') return;
    var name = syllableName(card.letter, card.haraka);
    if (!has(manifest.huruf, name)) return;
    playFile('audio/huruf/' + name + '.mp3');
  }

  function playWord(wordId) {
    if (!has(manifest.kata, wordId)) return;
    playFile('audio/kata/' + wordId + '.mp3');
  }

  HP.pronounce = { play: play, playWord: playWord, syllableName: syllableName };
}());
