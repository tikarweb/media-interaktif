/* =====================================================
   RULES.JS — aturan kecocokan kartu dan pilihan.
   Hanya fungsi murni (tanpa DOM, tanpa state global), sehingga
   mode bot dan multiplayer nanti memakai aturan yang SAMA.

   Asumsi yang didokumentasikan:
   - Kartu Draw 1 dan Ganti Harakat punya warna tetapi tidak punya
     harakat, jadi hanya bisa dicocokkan lewat WARNA aktif.
   - Ganti Warna (wild) bisa dimainkan kapan saja.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'), require('./deck'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.rules = factory(HP.config, HP.deck);
  }
}(this, function (config, deck) {
  'use strict';

  var T = deck.TYPES;

  // Apakah kartu sah dimainkan di atas warna & harakat aktif?
  // Huruf yang sama saja TIDAK cukup.
  function isPlayable(card, activeColor, activeHaraka) {
    if (card.type === T.CHANGE_COLOR) return true;
    if (card.type === T.NORMAL) {
      return card.color === activeColor || card.haraka === activeHaraka;
    }
    // Draw 1 dan Ganti Harakat: cocok lewat warna
    return card.color === activeColor;
  }

  // Jenis pilihan yang harus dibuat pemain setelah memainkan kartu
  function needsChoice(card) {
    if (card.type === T.CHANGE_HARAKA) return 'haraka';
    if (card.type === T.CHANGE_COLOR) return 'color';
    return null;
  }

  function isValidChoice(kind, value, levelId) {
    if (kind === 'haraka') return config.getLevel(levelId).harakat.indexOf(value) >= 0;
    if (kind === 'color') return !!config.colorById[value];
    return false;
  }

  // Mode Syadid: 3 pilihan arti untuk kuis sebelum kartu kata dimainkan.
  // Jawaban benar + 2 pengecoh dari tema yang sama, urutan diacak.
  // Mengembalikan [{ id: <id kata>, arti }]; jawaban dikirim sebagai id kata.
  function quizOptions(vocabId, levelId, rng) {
    var level = config.getLevel(levelId);
    var right = config.vocabById[vocabId];
    if (!right) return [];
    var pool = (level.vocab || []).filter(function (id) {
      return id !== vocabId && config.vocabById[id].arti !== right.arti;
    });
    var picks = deck.shuffle(pool, rng).slice(0, 2).concat([vocabId]);
    return deck.shuffle(picks, rng).map(function (id) { return { id: id, arti: config.vocabById[id].arti }; });
  }

  return { isPlayable: isPlayable, needsChoice: needsChoice, isValidChoice: isValidChoice, quizOptions: quizOptions };
}));
