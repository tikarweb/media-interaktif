// FILE HASIL BUILD — jangan diedit. Sumber: js/config.js dan js/game/*.js
// Bangun ulang dengan: node scripts/build-engine.js
const REG = {};
REG["kata"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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

  }).call({});
  return module.exports;
})();
REG["config"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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
    module.exports = factory(require('./data/kata'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.config = factory(HP.kataData);      // js/data/kata.js harus dimuat lebih dulu
  }
}(this, function (kataData) {
  'use strict';

  // Urutan warna juga dipakai untuk mengurutkan kartu di tangan
  var COLORS = [
    { id: 'red',    name: 'Merah',  hex: '#e8202a' },
    { id: 'yellow', name: 'Kuning', hex: '#ffd400' },
    { id: 'green',  name: 'Hijau',  hex: '#1aa84f' },
    { id: 'blue',   name: 'Biru',   hex: '#1d6fd1' }
  ];

  // Harakat (Unicode: fathah U+064E, kasrah U+0650, dammah U+064F,
  // tanwin: fathatain U+064B, dammatain U+064C, kasratain U+064D)
  var HARAKAT = [
    { id: 'fathah',   mark: '\u064E', name: 'Fathah',    vowel: 'a'  },
    { id: 'kasrah',   mark: '\u0650', name: 'Kasrah',    vowel: 'i'  },
    { id: 'dammah',   mark: '\u064F', name: 'Dammah',    vowel: 'u'  },
    { id: 'fathatain', mark: '\u064B', name: 'Fathatain', vowel: 'an' },
    { id: 'kasratain', mark: '\u064D', name: 'Kasratain', vowel: 'in' },
    { id: 'dammatain', mark: '\u064C', name: 'Dammatain', vowel: 'un' }
  ];
  var BASIC = ['fathah', 'kasrah', 'dammah'];
  var TANWIN = ['fathatain', 'kasratain', 'dammatain'];

  // Seluruh 28 huruf hijaiyah. "latin" = cara baca (tanpa vokal).
  var LETTERS = [
    { id: 'alif',    ch: '\u0627', latin: ''   },
    { id: 'ba',      ch: '\u0628', latin: 'b'  },
    { id: 'ta',      ch: '\u062A', latin: 't'  },
    { id: 'tsa',     ch: '\u062B', latin: 'ts' },
    { id: 'jim',     ch: '\u062C', latin: 'j'  },
    { id: 'ha',      ch: '\u062D', latin: 'h'  },
    { id: 'kha',     ch: '\u062E', latin: 'kh' },
    { id: 'dal',     ch: '\u062F', latin: 'd'  },
    { id: 'dzal',    ch: '\u0630', latin: 'dz' },
    { id: 'ra',      ch: '\u0631', latin: 'r'  },
    { id: 'zay',     ch: '\u0632', latin: 'z'  },
    { id: 'sin',     ch: '\u0633', latin: 's'  },
    { id: 'syin',    ch: '\u0634', latin: 'sy' },
    { id: 'shad',    ch: '\u0635', latin: 'sh' },
    { id: 'dhad',    ch: '\u0636', latin: 'dl' },
    { id: 'tha',     ch: '\u0637', latin: 'th' },
    { id: 'zha',     ch: '\u0638', latin: 'zh' },
    { id: 'ain',     ch: '\u0639', latin: "'"  },
    { id: 'ghain',   ch: '\u063A', latin: 'gh' },
    { id: 'fa',      ch: '\u0641', latin: 'f'  },
    { id: 'qaf',     ch: '\u0642', latin: 'q'  },
    { id: 'kaf',     ch: '\u0643', latin: 'k'  },
    { id: 'lam',     ch: '\u0644', latin: 'l'  },
    { id: 'mim',     ch: '\u0645', latin: 'm'  },
    { id: 'nun',     ch: '\u0646', latin: 'n'  },
    { id: 'hah',     ch: '\u0647', latin: 'h'  },
    { id: 'waw',     ch: '\u0648', latin: 'w'  },
    { id: 'ya',      ch: '\u064A', latin: 'y'  },
    { id: 'hamzah',  ch: '\u0621', latin: "'"  }
  ];

  // Nama file audio per huruf (audio/huruf/<file>-<harakat>.mp3). Default = id huruf.
  var AUDIO_FILE = { jim: 'ja', dal: 'da', dzal: 'dza', zay: 'za', sin: 'sa', syin: 'sya', shad: 'sha',
                     dhad: 'dha', ghain: 'gha', qaf: 'qa', kaf: 'ka', lam: 'la', mim: 'ma', nun: 'na', waw: 'wa' };
  LETTERS.forEach(function (l) { l.file = AUDIO_FILE[l.id] || l.id; });

  // ===== LEVEL BELAJAR (Mode Haraka Asasi) =====
  // Setiap level = daftar huruf + daftar harakat yang dipakai di dek.
  // Jumlah kartu: huruf x harakat x 4 warna + 12 kartu khusus.
  // Mau menambah level? Tambahkan satu baris di sini (lalu, bila memakai mode online:
  //   node scripts/build-engine.js  dan deploy ulang fungsi "game").
  var LEVELS = [
    { id: 'l1', name: 'Level 1', title: 'Ba Ta Tsa Jim Ha',        letters: ['ba','ta','tsa','jim','ha'],        harakat: BASIC  },
    { id: 'l2', name: 'Level 2', title: 'Kha Dal Dzal Ra Zay',     letters: ['kha','dal','dzal','ra','zay'],     harakat: BASIC  },
    { id: 'l3', name: 'Level 3', title: 'Sin Syin Shad Dhad Tha',  letters: ['sin','syin','shad','dhad','tha'],  harakat: BASIC  },
    { id: 'l4', name: 'Level 4', title: 'Zha Ain Ghain Fa Qaf',    letters: ['zha','ain','ghain','fa','qaf'],    harakat: BASIC  },
    { id: 'l5', name: 'Level 5', title: 'Kaf Lam Mim Nun Ha',      letters: ['kaf','lam','mim','nun','hah'],     harakat: BASIC  },
    { id: 'l6', name: 'Level 6', title: 'Waw Ya Alif Hamzah',      letters: ['waw','ya','alif','hamzah'],        harakat: BASIC  },
    { id: 'l7', name: 'Level 7', title: 'Tanwin (an, in, un)',     letters: ['ba','ta','jim','dal','ra'],        harakat: TANWIN }
  ];

  LEVELS.forEach(function (l) { l.mode = 'asasi'; });

  // ===== PAKET KATA (Mode Haraka Iqlab: Rangkai Kata) =====
  // Dibangun otomatis dari js/data/kata.js: tiap kata dipecah menjadi suku kata
  // (huruf + harakat). Dek paket = suku kata unik x 4 warna + 12 kartu khusus.
  var CHAR_TO_LETTER = {};
  LETTERS.forEach(function (l) { CHAR_TO_LETTER[l.ch] = l; });
  var MARK_TO_HARAKA = {};
  HARAKAT.forEach(function (h) { MARK_TO_HARAKA[h.mark] = h; });

  // "جَلَسَ" -> [{letter:'jim', haraka:'fathah', text:'جَ'}, ...]; huruf tak dikenal -> error jelas
  function parseWord(arab) {
    var syl = [], cur = null, i, ch;
    for (i = 0; i < arab.length; i++) {
      ch = arab.charAt(i);
      if (CHAR_TO_LETTER[ch]) {
        cur = { letter: CHAR_TO_LETTER[ch].id, haraka: null, text: ch };
        syl.push(cur);
      } else if (MARK_TO_HARAKA[ch] && cur && !cur.haraka) {
        cur.haraka = MARK_TO_HARAKA[ch].id;
        cur.text += ch;
      } else {
        throw new Error('Karakter tak dikenal di kata "' + arab + '" pada posisi ' + i + ' (U+' + ch.charCodeAt(0).toString(16) + ')');
      }
    }
    syl.forEach(function (x) {
      if (!x.haraka) throw new Error('Huruf tanpa harakat di kata "' + arab + '"');
    });
    return syl;
  }

  var WORDS = ((kataData && kataData.KATA) || []).map(function (w) {
    return { id: w.id, arab: w.arab, arti: w.arti, latin: w.latin || '', syllables: parseWord(w.arab) };
  });
  var WORD_BY_ID = {};
  WORDS.forEach(function (w) { WORD_BY_ID[w.id] = w; });

  var PACKS = ((kataData && kataData.PAKET) || []).map(function (p, i) {
    var seen = {}, syllables = [], letters = [], harakat = [];
    p.kata.forEach(function (wid) {
      var w = WORD_BY_ID[wid];
      if (!w) throw new Error('Paket ' + p.id + ' merujuk kata yang tidak ada: ' + wid);
      w.syllables.forEach(function (s) {
        var key = s.letter + '|' + s.haraka;
        if (!seen[key]) { seen[key] = true; syllables.push({ letter: s.letter, haraka: s.haraka }); }
        if (letters.indexOf(s.letter) < 0) letters.push(s.letter);
        if (harakat.indexOf(s.haraka) < 0) harakat.push(s.haraka);
      });
    });
    return { id: p.id, mode: 'iqlab', name: 'Paket ' + (i + 1), title: p.judul,
             words: p.kata.slice(), syllables: syllables, letters: letters, harakat: harakat };
  });

  // ===== TIGA MODE =====
  var MODES = [
    { id: 'asasi',  name: 'Haraka Asasi',  ar: 'أَسَاسِي', tag: 'Pemula',   desc: 'Huruf hijaiyah + harakat, dengan bantuan cara baca Latin',
      showLatin: true,  available: true,  levels: LEVELS },
    { id: 'iqlab',  name: 'Haraka Iqlab',  ar: 'إِقْلَاب', tag: 'Menengah', desc: 'Rangkai kata berharakat, tanpa bantuan Latin',
      showLatin: false, available: true,  levels: PACKS },
    { id: 'syadid', name: 'Haraka Syadid', ar: 'شَدِيد',   tag: 'Mahir',    desc: 'Arab gundul & kosakata tematik',
      showLatin: false, available: false, levels: [] }
  ];

  // Istilah antarmuka (Arab + Indonesia). Ubah di sini bila perlu.
  var UI = {
    draw:   { ar: 'السَّحْب',   id: 'Ambil' },
    turn:   { ar: 'نَوْبَة',    id: 'Giliran' },
    waahid: { ar: 'وَاحِد !',   id: 'Waahid!' },
    catch:  { ar: 'أَمْسِكْ !', id: 'Tangkap!' },
    word:   { ar: 'الْكَلِمَة', id: 'Target Kata' }
  };

  var CONFIG = {
    COLORS: COLORS,
    HARAKAT: HARAKAT,
    LETTERS: LETTERS,
    LEVELS: LEVELS,
    PACKS: PACKS,
    WORDS: WORDS,
    MODES: MODES,
    UI: UI,
    WAAHID_PENALTY: 2,      // kartu yang diambil jika lupa menekan Waahid dan tertangkap
    WORD_BONUS_DRAW: 1,     // bonus menyelesaikan kata: pemain berikutnya ambil sekian kartu
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
  CONFIG.levelById = byId(LEVELS.concat(PACKS));
  CONFIG.wordById = WORD_BY_ID;
  CONFIG.modeById = byId(MODES);

  // Level yang valid; id tak dikenal / kosong jatuh ke Level 1
  CONFIG.getLevel = function (id) { return CONFIG.levelById[id] || LEVELS[0]; };
  CONFIG.getMode = function (id) { return CONFIG.modeById[id] || MODES[0]; };
  CONFIG.modeOfLevel = function (id) { return CONFIG.getLevel(id).mode; };

  return CONFIG;
}));

  }).call({});
  return module.exports;
})();
REG["deck"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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

  }).call({});
  return module.exports;
})();
REG["turn-manager"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   TURN-MANAGER.JS — perpindahan giliran.
   Tidak ada kartu pembalik arah, jadi urutan selalu maju.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.turnManager = factory();
  }
}(this, function () {
  'use strict';

  // Indeks pemain setelah maju sejauh `steps` langkah (default 1)
  function nextIndex(playerCount, index, steps) {
    var s = steps === undefined ? 1 : steps;
    return (index + s) % playerCount;
  }

  return { nextIndex: nextIndex };
}));

  }).call({});
  return module.exports;
})();
REG["scoring"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   SCORING.JS — nilai kartu dan skor ronde.
   Kartu biasa 1 poin; Draw 1, Ganti Harakat, Ganti Warna 10 poin.
   Skor ronde pemenang = jumlah nilai kartu yang tersisa di tangan
   semua lawan. Pemain lain tidak mendapat poin.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'), require('./deck'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.scoring = factory(HP.config, HP.deck);
  }
}(this, function (config, deck) {
  'use strict';

  function cardValue(card) {
    return card.type === deck.TYPES.NORMAL ? config.POINTS.normal : config.POINTS.special;
  }

  function handValue(hand) {
    return hand.reduce(function (sum, c) { return sum + cardValue(c); }, 0);
  }

  // players: [{id, hand}] — pemenang dikecualikan
  function roundScore(players, winnerId) {
    return players.reduce(function (sum, p) {
      return p.id === winnerId ? sum : sum + handValue(p.hand);
    }, 0);
  }

  return { cardValue: cardValue, handValue: handValue, roundScore: roundScore };
}));

  }).call({});
  return module.exports;
})();
REG["rules"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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

  return { isPlayable: isPlayable, needsChoice: needsChoice, isValidChoice: isValidChoice };
}));

  }).call({});
  return module.exports;
})();
REG["game-state"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   GAME-STATE.JS — mesin permainan (sumber kebenaran).

   Fungsi murni: applyAction(state, action) TIDAK mengubah state
   masukan; ia mengembalikan state baru. Jika aksi ditolak, state
   tidak berubah sama sekali.

   Mode bot memakai file ini langsung di browser. Untuk multiplayer
   (tahap 4), file yang sama dijalankan di server (Supabase Edge
   Function) sehingga aturannya identik dan klien tidak dipercaya.

   Bentuk aksi:
     { type: 'play', playerId, cardId, choice?, expectedVersion? }
     { type: 'draw', playerId, expectedVersion? }
     { type: 'pass', playerId, expectedVersion? }   // setelah mengambil kartu
     { type: 'waahid', playerId }   // pemain yang kartunya tinggal 1 menekan "وَاحِد !"
     { type: 'catch', playerId }    // lawan menangkap pemain yang lupa menekan Waahid
   (waahid & catch boleh dilakukan di luar giliran, selama jendelanya terbuka)
   `choice` = id harakat (Ganti Harakat) atau id warna (Ganti Warna).
   `expectedVersion` melindungi dari dua aksi bersamaan: aksi kedua
   yang membawa versi lama ditolak ('stale_state').

   Hasil: { ok, state, events, code?, message?, needs? }
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../config'), require('./deck'), require('./rules'),
      require('./scoring'), require('./turn-manager')
    );
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.gameState = factory(HP.config, HP.deck, HP.rules, HP.scoring, HP.turnManager);
  }
}(this, function (config, deck, rules, scoring, turns) {
  'use strict';

  var T = deck.TYPES;

  var MESSAGES = {
    game_over: 'Ronde ini sudah selesai.',
    stale_state: 'Status permainan sudah berubah. Coba lagi.',
    unknown_player: 'Pemain tidak dikenal.',
    unknown_action: 'Aksi tidak dikenal.',
    not_your_turn: 'Belum giliranmu.',
    card_not_in_hand: 'Kartu itu tidak ada di tanganmu.',
    must_play_drawn: 'Setelah mengambil kartu, hanya kartu yang baru diambil yang boleh dimainkan. Atau pilih Lewati.',
    card_not_playable: 'Kartu ini belum cocok dengan warna atau harakat aktif.',
    need_choice: 'Pilih dulu harakat atau warna barunya.',
    invalid_choice: 'Pilihan itu tidak valid.',
    already_drawn: 'Kamu sudah mengambil kartu di giliran ini.',
    cannot_pass: 'Kamu hanya bisa melewati giliran setelah mengambil kartu.',
    waahid_not_yet: 'Belum waktunya. Tekan "وَاحِد !" saat kartumu tinggal 1.',
    waahid_late: 'Terlambat. Giliran sudah berlanjut.',
    nothing_to_catch: 'Tidak ada yang bisa ditangkap sekarang.',
    cannot_catch_self: 'Kamu tidak bisa menangkap dirimu sendiri.'
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function reject(state, code, extra) {
    var r = { ok: false, code: code, message: MESSAGES[code] || code, state: state, events: [] };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  /* ---------- Mode Iqlab: target kata ---------- */
  // Ambil kata berikutnya dari antrean paket (diacak; tidak ada pengulangan sampai semua keluar)
  function pickNextWord(s, rng) {
    var level = config.getLevel(s.level);
    if (!s.wordQueue || !s.wordQueue.length) {
      var q = deck.shuffle(level.words, rng);
      // hindari kata yang sama berturut-turut ketika antrean diisi ulang
      if (s.target && q.length > 1 && q[q.length - 1] === s.target.wordId) {
        var t = q[0]; q[0] = q[q.length - 1]; q[q.length - 1] = t;
      }
      s.wordQueue = q;
    }
    var wid = s.wordQueue.pop();
    s.target = { wordId: wid, filled: config.wordById[wid].syllables.map(function () { return false; }) };
  }

  function sameSyllable(syl, card) {
    return syl.letter === card.letter && syl.haraka === card.haraka;
  }

  /* ---------- Membuat ronde baru ---------- */
  // opts: { players: [{id, name, isBot}], rng?, scores?, round?, level? }
  // level = id level Asasi ('l1'..'l7') atau paket Iqlab ('p1'..'p4'); menentukan mode.
  function createGame(opts) {
    var rng = opts.rng || Math.random;
    var list = opts.players || [];
    if (list.length < config.MIN_PLAYERS || list.length > config.MAX_PLAYERS) {
      throw new Error('Jumlah pemain harus ' + config.MIN_PLAYERS + '-' + config.MAX_PLAYERS);
    }
    var ids = {};
    list.forEach(function (p) {
      if (ids[p.id]) throw new Error('ID pemain harus unik: ' + p.id);
      ids[p.id] = true;
    });

    // Urutan pemain diacak
    var players = deck.shuffle(list, rng).map(function (p) {
      return { id: p.id, name: p.name, isBot: !!p.isBot, hand: [] };
    });

    var level = config.getLevel(opts.level);
    var pile = deck.shuffle(deck.createDeck(level.id), rng);

    // Bagikan kartu
    for (var i = 0; i < config.HAND_SIZE; i++) {
      players.forEach(function (p) { p.hand.push(pile.pop()); });
    }

    // Kartu pembuka harus kartu biasa; kartu spesial dikembalikan ke tumpukan
    var skipped = [];
    var start = null;
    while (pile.length) {
      var c = pile.pop();
      if (c.type === T.NORMAL) { start = c; break; }
      skipped.push(c);
    }
    pile = deck.shuffle(pile.concat(skipped), rng);

    var scores = {};
    players.forEach(function (p) {
      scores[p.id] = (opts.scores && opts.scores[p.id]) || 0;
    });

    var st = {
      version: 0,
      round: opts.round || 1,
      level: level.id,
      mode: level.mode,
      phase: 'playing',
      players: players,
      drawPile: pile,            // kartu teratas = elemen terakhir
      discardPile: [start],      // kartu teratas = elemen terakhir
      turn: 0,
      activeColor: start.color,
      activeHaraka: start.haraka,
      drawnCardId: null,         // kartu yang baru diambil dan boleh langsung dimainkan
      winnerId: null,
      roundScore: 0,
      scores: scores,
      waahidFor: null,           // pemain bertangan 1 kartu yang belum menekan Waahid (jendela tangkap terbuka)
      target: null,              // Iqlab: { wordId, filled:[bool,...] }
      wordQueue: [],
      wordsDone: [],             // Iqlab: [{ wordId, by }] kata yang selesai di ronde ini
      wordsBy: {}
    };
    players.forEach(function (p) { st.wordsBy[p.id] = 0; });
    if (level.mode === 'iqlab') pickNextWord(st, rng);
    return st;
  }

  /* ---------- Bantuan ---------- */
  function playerIndex(state, playerId) {
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === playerId) return i;
    }
    return -1;
  }

  // Tumpukan ambil habis -> kocok tumpukan buang selain kartu teratas
  function refillDrawPile(s, rng) {
    if (s.drawPile.length === 0 && s.discardPile.length > 1) {
      var top = s.discardPile.pop();
      s.drawPile = deck.shuffle(s.discardPile, rng);
      s.discardPile = [top];
    }
  }

  // Ambil satu kartu; null kalau benar-benar tidak ada kartu tersisa
  function drawOne(s, rng) {
    refillDrawPile(s, rng);
    return s.drawPile.length ? s.drawPile.pop() : null;
  }

  function currentPlayer(state) { return state.players[state.turn]; }

  /* ---------- Menerapkan aksi ---------- */
  function applyAction(state, action, options) {
    var rng = (options && options.rng) || Math.random;

    if (!action || !action.type) return reject(state, 'unknown_action');
    if (state.phase !== 'playing') return reject(state, 'game_over');
    if (action.expectedVersion !== undefined && action.expectedVersion !== state.version) {
      return reject(state, 'stale_state');
    }

    var idx = playerIndex(state, action.playerId);
    if (idx < 0) return reject(state, 'unknown_player');

    // Waahid / Tangkap: boleh di luar giliran
    if (action.type === 'waahid') return doWaahid(state, idx);
    if (action.type === 'catch') return doCatch(state, idx, rng);

    if (idx !== state.turn) return reject(state, 'not_your_turn');

    if (action.type === 'play') return doPlay(state, action, idx, rng);
    if (action.type === 'draw') return doDraw(state, idx, rng);
    if (action.type === 'pass') return doPass(state, idx);
    return reject(state, 'unknown_action');
  }

  function doPlay(state, action, idx, rng) {
    var me = state.players[idx];
    var handPos = -1;
    for (var i = 0; i < me.hand.length; i++) {
      if (me.hand[i].id === action.cardId) { handPos = i; break; }
    }
    if (handPos < 0) return reject(state, 'card_not_in_hand');
    var card = me.hand[handPos];

    if (state.drawnCardId && state.drawnCardId !== card.id) {
      return reject(state, 'must_play_drawn');
    }
    if (!rules.isPlayable(card, state.activeColor, state.activeHaraka)) {
      return reject(state, 'card_not_playable');
    }

    // Pilihan harakat / warna (tidak perlu kalau ini kartu terakhir -> langsung menang)
    var kind = rules.needsChoice(card);
    var isLastCard = me.hand.length === 1;
    if (kind && !isLastCard) {
      if (action.choice === undefined || action.choice === null) {
        return reject(state, 'need_choice', { needs: kind });
      }
      if (!rules.isValidChoice(kind, action.choice, state.level)) {
        return reject(state, 'invalid_choice', { needs: kind });
      }
    }

    // --- Aksi sah: mulai mengubah salinan ---
    var s = clone(state);
    var p = s.players[idx];
    var played = p.hand.splice(handPos, 1)[0];
    s.discardPile.push(played);
    s.drawnCardId = null;
    s.waahidFor = null;       // aksi pemain berikutnya menutup jendela tangkap
    var events = [{ type: 'play', playerId: p.id, card: played, choice: action.choice || null }];

    // Warna & harakat aktif
    if (played.type === T.NORMAL) {
      s.activeColor = played.color;
      s.activeHaraka = played.haraka;
    } else if (played.type === T.DRAW1) {
      s.activeColor = played.color;
    } else if (played.type === T.CHANGE_HARAKA) {
      s.activeColor = played.color;
      if (action.choice) s.activeHaraka = action.choice;
    } else if (played.type === T.CHANGE_COLOR) {
      if (action.choice) s.activeColor = action.choice;
    }

    // Iqlab: kartu yang dimainkan otomatis mengisi slot kata target (tidak harus berurutan)
    var completedWord = null;
    if (played.type === T.NORMAL && s.target) {
      var word = config.wordById[s.target.wordId];
      for (var k = 0; k < word.syllables.length; k++) {
        if (!s.target.filled[k] && sameSyllable(word.syllables[k], played)) {
          s.target.filled[k] = true;
          events.push({ type: 'slot', playerId: p.id, wordId: word.id, index: k });
          break;
        }
      }
      if (s.target.filled.every(Boolean)) {
        completedWord = word.id;
        s.wordsDone.push({ wordId: word.id, by: p.id });
        s.wordsBy[p.id] = (s.wordsBy[p.id] || 0) + 1;
        events.push({ type: 'wordComplete', playerId: p.id, wordId: word.id });
        pickNextWord(s, rng);                     // kata berikutnya otomatis
        events.push({ type: 'newTarget', wordId: s.target.wordId });
      }
    }

    // Kemenangan: tangan benar-benar kosong
    if (p.hand.length === 0) {
      s.phase = 'finished';
      s.winnerId = p.id;
      s.roundScore = scoring.roundScore(s.players, p.id);
      s.scores[p.id] = (s.scores[p.id] || 0) + s.roundScore;
      s.version = state.version + 1;
      events.push({ type: 'win', playerId: p.id, roundScore: s.roundScore });
      return { ok: true, state: s, events: events };
    }

    // Efek giliran
    var n = s.players.length;
    if (played.type === T.DRAW1) {
      var victimIdx = turns.nextIndex(n, idx, 1);
      var victim = s.players[victimIdx];
      var penalty = drawOne(s, rng);
      if (penalty) victim.hand.push(penalty);
      events.push({ type: 'penalty', playerId: victim.id, gotCard: !!penalty });
      events.push({ type: 'skip', playerId: victim.id });
      s.turn = turns.nextIndex(n, idx, 2);   // korban kehilangan giliran
    } else {
      s.turn = turns.nextIndex(n, idx, 1);
    }

    // Bonus menyelesaikan kata: pemain berikutnya mengambil kartu (tanpa kehilangan giliran)
    if (completedWord) {
      var bonusVictim = s.players[s.turn];
      var got = 0;
      for (var b = 0; b < config.WORD_BONUS_DRAW; b++) {
        var bc = drawOne(s, rng);
        if (bc) { bonusVictim.hand.push(bc); got++; }
      }
      events.push({ type: 'bonus', playerId: bonusVictim.id, count: got, wordId: completedWord });
    }

    // Tinggal 1 kartu: jendela "Waahid!" terbuka untuk pemain ini
    if (p.hand.length === 1) s.waahidFor = p.id;

    s.version = state.version + 1;
    return { ok: true, state: s, events: events };
  }

  function doWaahid(state, idx) {
    var me = state.players[idx];
    if (state.waahidFor === me.id) {
      var s = clone(state);
      s.waahidFor = null;
      s.version = state.version + 1;
      return { ok: true, state: s, events: [{ type: 'waahid', playerId: me.id }] };
    }
    return reject(state, me.hand.length === 1 ? 'waahid_late' : 'waahid_not_yet');
  }

  function doCatch(state, idx, rng) {
    var catcher = state.players[idx];
    if (!state.waahidFor) return reject(state, 'nothing_to_catch');
    if (state.waahidFor === catcher.id) return reject(state, 'cannot_catch_self');
    var s = clone(state);
    var victim = s.players[playerIndex(s, state.waahidFor)];
    var got = 0;
    for (var i = 0; i < config.WAAHID_PENALTY; i++) {
      var c = drawOne(s, rng);
      if (c) { victim.hand.push(c); got++; }
    }
    s.waahidFor = null;
    s.version = state.version + 1;
    return { ok: true, state: s, events: [{ type: 'caught', playerId: victim.id, byId: catcher.id, count: got }] };
  }

  function doDraw(state, idx, rng) {
    if (state.drawnCardId) return reject(state, 'already_drawn');

    var s = clone(state);
    s.waahidFor = null;
    var p = s.players[idx];
    var card = drawOne(s, rng);
    var events = [];
    var n = s.players.length;

    if (!card) {
      // Tidak ada kartu yang bisa diambil: giliran berakhir
      events.push({ type: 'draw', playerId: p.id, noCards: true });
      s.turn = turns.nextIndex(n, idx, 1);
    } else {
      p.hand.push(card);
      events.push({ type: 'draw', playerId: p.id, card: card });
      if (rules.isPlayable(card, s.activeColor, s.activeHaraka)) {
        s.drawnCardId = card.id;           // boleh langsung dimainkan; giliran belum berpindah
      } else {
        s.turn = turns.nextIndex(n, idx, 1);
      }
    }

    s.version = state.version + 1;
    return { ok: true, state: s, events: events };
  }

  function doPass(state, idx) {
    if (!state.drawnCardId) return reject(state, 'cannot_pass');
    var s = clone(state);
    s.drawnCardId = null;
    s.waahidFor = null;
    s.turn = turns.nextIndex(s.players.length, idx, 1);
    s.version = state.version + 1;
    return { ok: true, state: s, events: [{ type: 'pass', playerId: s.players[idx].id }] };
  }

  /* ---------- Tampilan untuk satu pemain (tanpa kartu tersembunyi) ---------- */
  function getView(state, playerId) {
    var meIdx = playerIndex(state, playerId);
    var me = meIdx >= 0 ? state.players[meIdx] : null;
    return {
      version: state.version,
      round: state.round,
      level: state.level || config.LEVELS[0].id,
      phase: state.phase,
      me: me ? { id: me.id, name: me.name, hand: me.hand.slice() } : null,
      players: state.players.map(function (p) {
        return { id: p.id, name: p.name, isBot: p.isBot, handCount: p.hand.length };
      }),
      turnPlayerId: state.players[state.turn].id,
      drawCount: state.drawPile.length,
      topCard: state.discardPile[state.discardPile.length - 1],
      discardCount: state.discardPile.length,
      activeColor: state.activeColor,
      activeHaraka: state.activeHaraka,
      drawnCardId: me && state.players[state.turn].id === me.id ? state.drawnCardId : null,
      mode: state.mode || 'asasi',
      waahidFor: state.waahidFor || null,
      target: state.target ? { wordId: state.target.wordId, filled: state.target.filled.slice() } : null,
      wordsDone: (state.wordsDone || []).slice(),
      wordsBy: Object.assign({}, state.wordsBy || {}),
      winnerId: state.winnerId,
      roundScore: state.roundScore,
      scores: Object.assign({}, state.scores)
    };
  }

  return {
    MESSAGES: MESSAGES,
    createGame: createGame,
    applyAction: applyAction,
    getView: getView,
    currentPlayer: currentPlayer,
    playerIndex: playerIndex
  };
}));

  }).call({});
  return module.exports;
})();
export const config = REG["config"];
export const deck = REG["deck"];
export const gameState = REG["game-state"];
