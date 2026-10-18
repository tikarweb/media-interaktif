/* =====================================================
   KATA.JS — DATABASE KOSAKATA (Mode Haraka Iqlab: Rangkai Kata)
   File ini khusus untuk kamu review & edit. Tidak perlu mengubah
   file lain: suku kata dipecah OTOMATIS dari tulisan Arab-nya.

   Format satu kata:
     { id: 'jalasa', arab: 'جَلَسَ', arti: 'duduk', latin: 'jalasa' }

     id    : nama unik (huruf kecil, tanpa spasi). Juga nama file audio kata:
             audio/kata/<id>.mp3   (contoh: audio/kata/jalasa.mp3)
     arab  : kata LENGKAP DENGAN HARAKAT pada tiap huruf (3 huruf = 3 suku kata)
     arti  : arti bahasa Indonesia (muncul saat kata selesai dirangkai)
     latin : cara baca (hanya untuk referensimu; Mode Iqlab tidak menampilkannya)

   Aturan agar kata bisa dipakai:
     - Tiap huruf harus ada harakat (fathah/kasrah/dammah) dan termasuk
       huruf di js/config.js (28 huruf + hamzah ء). Hindari أ إ ئ ؤ ة ى.
     - Huruf di dalam satu kata tidak boleh sama (supaya slot tidak ambigu).
     - Tanpa syaddah/sukun/tanwin dulu.
     (Pemeriksaan otomatis: jalankan  node --test  — akan gagal dan memberi
      tahu kata mana yang bermasalah.)

   PAKET = satu "level" di Mode Iqlab. Tiap paket berisi 5 id kata.
   Menambah paket / kata: tambahkan baris, lalu (jika memakai mode online)
   jalankan  node scripts/build-engine.js  dan deploy ulang fungsi "game".
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.kataData = factory();
  }
}(this, function () {
  'use strict';

  // ---- 20 fi'il madhi (kata kerja lampau) 3 huruf, harakat dasar ----
  var KATA = [
    // (Pengelompokan ke paket ada di PAKET di bawah)
    { id: 'kataba',  arab: 'كَتَبَ',  arti: 'menulis',        latin: 'kataba'  },
    { id: 'jalasa',  arab: 'جَلَسَ',  arti: 'duduk',          latin: 'jalasa'  },
    { id: 'dzahaba', arab: 'ذَهَبَ',  arti: 'pergi',          latin: 'dzahaba' },
    { id: 'dakhala', arab: 'دَخَلَ',  arti: 'masuk',          latin: 'dakhala' },
    { id: 'kharaja', arab: 'خَرَجَ',  arti: 'keluar',         latin: 'kharaja' },

    { id: 'nazala',  arab: 'نَزَلَ',  arti: 'turun',          latin: 'nazala'  },
    { id: 'fataha',  arab: 'فَتَحَ',  arti: 'membuka',        latin: 'fataha'  },
    { id: 'rajaa', arab: 'رَجَعَ', arti: 'kembali, pulang', latin: 'raja’a' },
    { id: 'hamala',  arab: 'حَمَلَ',  arti: 'membawa',        latin: 'hamala'  },
    { id: 'faala', arab: 'فَعَلَ', arti: 'melakukan',    latin: 'fa’ala' },

    { id: 'samia', arab: 'سَمِعَ', arti: 'mendengar',    latin: 'sami’a' },
    { id: 'syariba', arab: 'شَرِبَ',  arti: 'minum',          latin: 'syariba' },
    { id: 'fahima',  arab: 'فَهِمَ',  arti: 'memahami',       latin: 'fahima'  },
    { id: 'alima', arab: 'عَلِمَ', arti: 'mengetahui',   latin: '’alima' },
    { id: 'laiba', arab: 'لَعِبَ', arti: 'bermain',      latin: 'la’iba' },

    { id: 'nashara', arab: 'نَصَرَ',  arti: 'menolong',       latin: 'nashara' },
    { id: 'dharaba', arab: 'ضَرَبَ',  arti: 'memukul',        latin: 'dharaba' },
    { id: 'rakiba',  arab: 'رَكِبَ',  arti: 'menaiki, naik',  latin: 'rakiba'  },
    { id: 'kabura',  arab: 'كَبُرَ',  arti: 'menjadi besar',  latin: 'kabura'  },
    { id: 'hasuna',  arab: 'حَسُنَ',  arti: 'menjadi baik, bagus', latin: 'hasuna' }
  ];

  // Tiap paket sengaja memuat campuran harakat (fathah + kasrah/dammah) supaya aturan
  // "cocok warna ATAU harakat" tetap bermakna.
  var PAKET = [
    { id: 'p1', judul: 'Aktivitas harian',   kata: ['kataba', 'jalasa', 'dakhala', 'kharaja', 'syariba'] },
    { id: 'p2', judul: 'Gerak & kerja',      kata: ['nazala', 'fataha', 'rajaa', 'hamala', 'rakiba'] },
    { id: 'p3', judul: 'Indra, ilmu & sifat', kata: ['samia', 'fahima', 'alima', 'laiba', 'kabura'] },
    { id: 'p4', judul: 'Aksi & sifat',       kata: ['dzahaba', 'nashara', 'dharaba', 'faala', 'hasuna'] }
  ];

  return { KATA: KATA, PAKET: PAKET };
}));
