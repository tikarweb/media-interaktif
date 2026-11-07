/* =====================================================
   DATA.JS — isi "Ubin Titik": tingkat, tema, dan pasangan ubin.
   File ini khusus untuk kamu REVIEW & EDIT (bahasa Arabnya!).

   Satu pasangan:  [ 'id-unik', 'sisi A (Arab)', 'sisi B (arti / bunyi)' ]
   - id-unik harus berbeda-beda di dalam satu tema.
   - Ubin sisi A tampil putih dengan tulisan Arab besar,
     ubin sisi B tampil berwarna dengan tulisan Latin/Indonesia.
   - Jumlah pasangan menentukan ukuran papan yang bisa dipilih:
       12+ -> Kecil, 18+ -> Sedang, 24+ -> Besar, 36 -> Piramida.

   Menambah tema baru: salin satu blok di PACKS, ganti isinya.
   Semua pasangan yang BELUM pernah kamu periksa ditandai  cek: true
   supaya mudah dicari (hapus tandanya setelah kamu setujui).
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.UbinData = factory();
}(this, function () {
  'use strict';

  function P(rows) { return rows.map(function (r) { return { k: r[0], a: r[1], b: r[2] }; }); }

  // ---------- Tingkat 1: huruf hijaiyah -> nama huruf ----------
  var HURUF = [
    ['alif', 'ا', 'alif'], ['ba', 'ب', 'ba'], ['ta', 'ت', 'ta'], ['tsa', 'ث', 'tsa'],
    ['jim', 'ج', 'jim'], ['ha1', 'ح', 'ḥa'], ['kha', 'خ', 'kha'], ['dal', 'د', 'dal'],
    ['dzal', 'ذ', 'dzal'], ['ra', 'ر', 'ra'], ['zay', 'ز', 'zay'], ['sin', 'س', 'sin'],
    ['syin', 'ش', 'syin'], ['shad', 'ص', 'ṣad'], ['dhad', 'ض', 'ḍad'], ['tha', 'ط', 'ṭa'],
    ['zha', 'ظ', 'ẓa'], ['ain', 'ع', 'ʿain'], ['ghain', 'غ', 'ghain'], ['fa', 'ف', 'fa'],
    ['qaf', 'ق', 'qaf'], ['kaf', 'ك', 'kaf'], ['lam', 'ل', 'lam'], ['mim', 'م', 'mim'],
    ['nun', 'ن', 'nun'], ['ha2', 'ه', 'ha'], ['wau', 'و', 'wau'], ['ya', 'ي', 'ya']
  ];

  // ---------- Tingkat 2: huruf + harakat -> bunyi ----------
  var HARAKAT = [
    ['b_a', 'بَ', 'ba'], ['b_i', 'بِ', 'bi'], ['b_u', 'بُ', 'bu'],
    ['t_a', 'تَ', 'ta'], ['t_i', 'تِ', 'ti'], ['t_u', 'تُ', 'tu'],
    ['ts_a', 'ثَ', 'tsa'], ['ts_i', 'ثِ', 'tsi'], ['ts_u', 'ثُ', 'tsu'],
    ['j_a', 'جَ', 'ja'], ['j_i', 'جِ', 'ji'], ['j_u', 'جُ', 'ju'],
    ['h_a', 'حَ', 'ḥa'], ['h_i', 'حِ', 'ḥi'], ['h_u', 'حُ', 'ḥu'],
    ['kh_a', 'خَ', 'kha'], ['kh_i', 'خِ', 'khi'], ['kh_u', 'خُ', 'khu']
  ];

  // ---------- Tingkat 3: kosakata (kata berharakat -> arti) ----------
  // Tiga tema pertama diambil dari Haraka Syadid.
  var SEKOLAH = [
      ['katib', 'كَاتِب', 'penulis'],
      ['thalib', 'طَالِب', 'pelajar'],
      ['najih', 'نَاجِح', 'yang lulus'],
      ['maktub', 'مَكْتُوب', 'yang tertulis'],
      ['maftuh', 'مَفْتُوح', 'yang terbuka'],
      ['mafhum', 'مَفْهُوم', 'yang dipahami'],
      ['maktab', 'مَكْتَب', 'kantor / meja tulis'],
      ['maqad', 'مَقْعَد', 'tempat duduk'],
      ['malab', 'مَلْعَب', 'lapangan'],
      ['aqlam', 'أَقْلَام', 'pena-pena'],
      ['awraq', 'أَوْرَاق', 'kertas-kertas'],
      ['abwab', 'أَبْوَاب', 'pintu-pintu']
  ];
  var RUMAH = [
      ['sakin', 'سَاكِن', 'penghuni'],
      ['thabikh', 'طَابِخ', 'juru masak'],
      ['khadim', 'خَادِم', 'pelayan'],
      ['mathbukh', 'مَطْبُوخ', 'yang dimasak'],
      ['maghsul', 'مَغْسُول', 'yang dicuci'],
      ['masyrub', 'مَشْرُوب', 'yang diminum'],
      ['mathbakh', 'مَطْبَخ', 'dapur'],
      ['maghsal', 'مَغْسَل', 'tempat mencuci'],
      ['maskan', 'مَسْكَن', 'tempat tinggal'],
      ['athbaq', 'أَطْبَاق', 'piring-piring'],
      ['akwab', 'أَكْوَاب', 'gelas-gelas'],
      ['aqfal', 'أَقْفَال', 'kunci-kunci']
  ];
  var KOTA = [
      ['saiq', 'سَائِق', 'sopir'],
      ['rakib', 'رَاكِب', 'penumpang'],
      ['zair', 'زَائِر', 'pengunjung'],
      ['masyhur', 'مَشْهُور', 'yang terkenal'],
      ['maruf', 'مَعْرُوف', 'yang dikenal'],
      ['maqshud', 'مَقْصُود', 'yang dituju'],
      ['mathham', 'مَطْعَم', 'restoran'],
      ['mashna', 'مَصْنَع', 'pabrik'],
      ['makhbaz', 'مَخْبَز', 'toko roti'],
      ['aswaq', 'أَسْوَاق', 'pasar-pasar'],
      ['anhar', 'أَنْهَار', 'sungai-sungai'],
      ['asfar', 'أَسْفَار', 'perjalanan-perjalanan']
  ];

  // Tema baru (cek: true = tolong diperiksa Nel sebelum dipublikasikan)
  var KELUARGA = [
    ['ab', 'أَبٌ', 'ayah'], ['umm', 'أُمٌّ', 'ibu'], ['akh', 'أَخٌ', 'saudara laki-laki'],
    ['ukht', 'أُخْتٌ', 'saudara perempuan'], ['jadd', 'جَدٌّ', 'kakek'], ['jadda', 'جَدَّةٌ', 'nenek'],
    ['amm', 'عَمٌّ', 'paman (dari ayah)'], ['amma', 'عَمَّةٌ', 'bibi (dari ayah)'],
    ['khal', 'خَالٌ', 'paman (dari ibu)'], ['khala', 'خَالَةٌ', 'bibi (dari ibu)'],
    ['ibn', 'ابْنٌ', 'anak laki-laki'], ['bint', 'بِنْتٌ', 'anak perempuan']
  ];
  var WARNA = [
    ['ahmar', 'أَحْمَرُ', 'merah'], ['azraq', 'أَزْرَقُ', 'biru'], ['akhdar', 'أَخْضَرُ', 'hijau'],
    ['asfar', 'أَصْفَرُ', 'kuning'], ['abyadh', 'أَبْيَضُ', 'putih'], ['aswad', 'أَسْوَدُ', 'hitam'],
    ['burtuqali', 'بُرْتُقَالِيٌّ', 'oranye'], ['banafsaji', 'بَنَفْسَجِيٌّ', 'ungu'],
    ['wardi', 'وَرْدِيٌّ', 'merah muda'], ['bunni', 'بُنِّيٌّ', 'cokelat'],
    ['ramadi', 'رَمَادِيٌّ', 'abu-abu'], ['dzahabi', 'ذَهَبِيٌّ', 'emas']
  ];
  var ANGKA = [
    ['n1', 'وَاحِدٌ', '1'], ['n2', 'اثْنَانِ', '2'], ['n3', 'ثَلَاثَةٌ', '3'], ['n4', 'أَرْبَعَةٌ', '4'],
    ['n5', 'خَمْسَةٌ', '5'], ['n6', 'سِتَّةٌ', '6'], ['n7', 'سَبْعَةٌ', '7'], ['n8', 'ثَمَانِيَةٌ', '8'],
    ['n9', 'تِسْعَةٌ', '9'], ['n10', 'عَشَرَةٌ', '10'], ['n0', 'صِفْرٌ', '0'], ['n100', 'مِئَةٌ', '100']
  ];

  function join() { return [].concat.apply([], arguments); }

  // ---------- Daftar paket (yang tampil di menu) ----------
  // tingkat: 1..5. warna = warna ubin sisi B. ikon = tulisan/emoji di kartu menu.
  var PACKS = [
    { id: 'huruf-1', tingkat: 1, judul: 'Huruf 1', ikon: 'أ', warna: '#ec4899', ket: 'Alif sampai Shad', pairs: P(HURUF.slice(0, 14)) },
    { id: 'huruf-2', tingkat: 1, judul: 'Huruf 2', ikon: 'ع', warna: '#f43f5e', ket: 'Dhad sampai Ya', pairs: P(HURUF.slice(14)) },
    { id: 'huruf-semua', tingkat: 1, judul: 'Semua Huruf', ikon: 'ب', warna: '#d946ef', ket: '28 huruf hijaiyah', pairs: P(HURUF) },

    { id: 'harakat', tingkat: 2, judul: 'Harakat Dasar', ikon: 'بُ', warna: '#8b5cf6', ket: 'Fathah, kasrah, dhammah', pairs: P(HARAKAT) },

    { id: 'sekolah', tingkat: 3, judul: 'Sekolah', ikon: '🏫', warna: '#0ea5e9', ket: 'Pelaku, objek, tempat, jamak', audio: true, pairs: P(SEKOLAH) },
    { id: 'rumah', tingkat: 3, judul: 'Rumah & Dapur', ikon: '🏠', warna: '#f97316', ket: 'Di dalam rumah', audio: true, pairs: P(RUMAH) },
    { id: 'kota', tingkat: 3, judul: 'Kota & Perjalanan', ikon: '🏙️', warna: '#22c55e', ket: 'Di luar rumah', audio: true, pairs: P(KOTA) },
    { id: 'campur-1', tingkat: 3, judul: 'Campur: Sekolah-Rumah-Kota', ikon: '🎲', warna: '#14b8a6', ket: '36 kata, semua ukuran papan', audio: true, pairs: P(join(SEKOLAH, RUMAH, KOTA)) },
    { id: 'keluarga', tingkat: 3, judul: 'Keluarga', ikon: '👨‍👩‍👧', warna: '#e11d48', ket: 'Anggota keluarga', cek: true, pairs: P(KELUARGA) },
    { id: 'warna', tingkat: 3, judul: 'Warna', ikon: '🎨', warna: '#eab308', ket: 'Nama-nama warna', cek: true, pairs: P(WARNA) },
    { id: 'angka', tingkat: 3, judul: 'Angka', ikon: '🔢', warna: '#6366f1', ket: '0 sampai 100', cek: true, pairs: P(ANGKA) },
    { id: 'campur-2', tingkat: 3, judul: 'Campur: Keluarga-Warna-Angka', ikon: '🎲', warna: '#06b6d4', ket: '36 kata baru', cek: true, pairs: P(join(KELUARGA, WARNA, ANGKA)) }
  ];

  var TINGKAT = [
    { id: 1, judul: 'Huruf', ket: 'Kenali huruf hijaiyah dan namanya' },
    { id: 2, judul: 'Harakat', ket: 'Huruf + harakat, bunyinya apa?' },
    { id: 3, judul: 'Mufradat', ket: 'Kata Arab berharakat dan artinya' },
    { id: 4, judul: 'Hubungan Kata', ket: 'Mufrad-jamak, lawan kata, pola', soon: true },
    { id: 5, judul: 'Mahir', ket: 'Kata gundul, tanpa petunjuk, berwaktu', soon: true }
  ];

  return { PACKS: PACKS, TINGKAT: TINGKAT };
}));
