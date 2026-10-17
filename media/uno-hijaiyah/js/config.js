/* =====================================================
   CONFIG.JS — satu-satunya tempat data dasar permainan.
   Dipakai bersama oleh mesin permainan, bot, dan tampilan.

   Semua file js/ memakai pola "UMD": bisa dibuka langsung dari
   file:// (klik dua kali index.html) DAN dijalankan di Node untuk
   pengujian otomatis. Tidak memakai import/export, karena browser
   memblokir modul ES kalau halaman dibuka lewat file://.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.config = factory();
  }
}(this, function () {
  'use strict';

  // Urutan warna juga dipakai untuk mengurutkan kartu di tangan
  var COLORS = [
    { id: 'red',    name: 'Merah',  hex: '#e8202a' },
    { id: 'yellow', name: 'Kuning', hex: '#ffd400' },
    { id: 'green',  name: 'Hijau',  hex: '#1aa84f' },
    { id: 'blue',   name: 'Biru',   hex: '#1d6fd1' }
  ];

  // Harakat (Unicode: fathah U+064E, kasrah U+0650, dammah U+064F)
  var HARAKAT = [
    { id: 'fathah', mark: 'َ', name: 'Fathah', vowel: 'a' },
    { id: 'kasrah', mark: 'ِ', name: 'Kasrah', vowel: 'i' },
    { id: 'dammah', mark: 'ُ', name: 'Dammah', vowel: 'u' }
  ];

  // Huruf hijaiyah di dalam permainan. Untuk menambah huruf, tambahkan baris
  // baru di sini — jumlah kartu menyesuaikan otomatis (huruf x 3 harakat x 4 warna).
  // Catatan: spesifikasi awal memakai 5 huruf (total 72 kartu).
  var LETTERS = [
    { id: 'ba',  ch: 'ب', latin: 'b'  },   // ب
    { id: 'ta',  ch: 'ت', latin: 't'  },   // ت
    { id: 'tsa', ch: 'ث', latin: 'ts' },   // ث
    { id: 'jim', ch: 'ج', latin: 'j'  },   // ج
    { id: 'ha',  ch: 'ح', latin: 'h'  }    // ح
  ];

  var CONFIG = {
    COLORS: COLORS,
    HARAKAT: HARAKAT,
    LETTERS: LETTERS,
    WILD_COUNT: 4,          // jumlah kartu Ganti Warna
    HAND_SIZE: 7,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 4,
    POINTS: { normal: 1, special: 10 }
  };

  function byId(list) {
    var map = {};
    list.forEach(function (x) { map[x.id] = x; });
    return map;
  }
  CONFIG.colorById = byId(COLORS);
  CONFIG.harakaById = byId(HARAKAT);
  CONFIG.letterById = byId(LETTERS);

  return CONFIG;
}));
