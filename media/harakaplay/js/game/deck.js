/* =====================================================
   DECK.JS — komposisi kartu, pengocokan, nilai kartu.
   Spesifikasi awal:
     60 kartu biasa  = 5 huruf x 3 harakat x 4 warna
     4 Draw 1        (satu per warna)
     4 Ganti Harakat (satu per warna)
     4 Ganti Warna   (tanpa warna / wild)
     total 72 kartu
   Tidak ada hubungan dengan tampilan (DOM).
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.deck = factory(HP.config);
  }
}(this, function (config) {
  'use strict';

  var TYPES = {
    NORMAL: 'normal',
    DRAW1: 'draw1',
    CHANGE_HARAKA: 'changeHaraka',
    CHANGE_COLOR: 'changeColor'
  };

  // Setiap kartu: id unik, jenis, warna, dan (untuk kartu biasa) huruf + harakat
  function createDeck(levelId) {
    var level = config.getLevel(levelId);
    var cards = [];
    // Daftar suku kata (huruf + harakat) di level ini:
    //  - Asasi: semua huruf x semua harakat level
    //  - Iqlab (paket kata): suku kata unik dari kata-kata paket
    var syllables = level.syllables;
    if (!syllables) {
      syllables = [];
      level.letters.forEach(function (letterId) {
        level.harakat.forEach(function (harakaId) { syllables.push({ letter: letterId, haraka: harakaId }); });
      });
    }
    config.COLORS.forEach(function (color) {
      syllables.forEach(function (sy) {
        cards.push({
          id: 'n-' + color.id + '-' + sy.letter + '-' + sy.haraka,
          type: TYPES.NORMAL,
          color: color.id,
          letter: sy.letter,
          haraka: sy.haraka
        });
      });
    });
    config.COLORS.forEach(function (color) {
      cards.push({ id: 'd1-' + color.id, type: TYPES.DRAW1, color: color.id });
    });
    config.COLORS.forEach(function (color) {
      cards.push({ id: 'ch-' + color.id, type: TYPES.CHANGE_HARAKA, color: color.id });
    });
    for (var i = 1; i <= config.WILD_COUNT; i++) {
      cards.push({ id: 'cc-' + i, type: TYPES.CHANGE_COLOR, color: null });
    }
    return cards;
  }

  // Fisher-Yates; mengembalikan array baru. rng() harus menghasilkan [0, 1).
  function shuffle(list, rng) {
    var random = rng || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Pengacak yang bisa diulang (untuk pengujian dan simulasi)
  function seededRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    TYPES: TYPES,
    createDeck: createDeck,
    shuffle: shuffle,
    seededRng: seededRng
  };
}));
