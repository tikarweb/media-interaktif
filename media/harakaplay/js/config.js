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
