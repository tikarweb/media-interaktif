/* =====================================================
   KOSAKATA.JS — DATABASE KOSAKATA (Mode Haraka Syadid: Arab Gundul)
   File ini khusus untuk kamu review & edit.

   Format satu kata:
     { id: 'katib', arab: 'كاتب', voc: 'كَاتِب', arti: 'penulis', pola: 'faail' }

     id    : nama unik (huruf kecil, tanpa spasi). Juga nama file audio kata:
             audio/kata/<id>.mp3
     arab  : kata GUNDUL (tanpa harakat). Inilah yang tampil di kartu.
     voc   : kata yang sama DENGAN harakat. Muncul sebagai pembelajaran
             setelah kuis dan di layar hasil. Jika dihapus harakatnya harus
             persis sama dengan `arab` (diperiksa otomatis oleh `node --test`).
     arti  : arti bahasa Indonesia (3 pilihan kuis diambil dari arti kata lain
             di tema yang sama, jadi arti dalam satu tema harus berbeda-beda).
     pola  : salah satu id di POLA (kartu cocok jika warna ATAU pola sama).

   TEMA = satu "level" di Mode Syadid. Tiap tema berisi 12 id kata
   (idealnya 3 kata untuk tiap pola, supaya kecocokan pola sering terjadi).
   Menambah kata / tema: tambahkan baris, lalu (jika memakai mode online)
   jalankan  node scripts/build-engine.js  dan deploy ulang fungsi "game".
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.kosakataData = factory();
  }
}(this, function () {
  'use strict';

  // Pola kata (wazan). `ar` = bentuk wazan, `nama` = nama singkat untuk pemain.
  var POLA = [
    { id: 'faail',  ar: 'فَاعِل',   nama: 'Pelaku',  ket: 'isim fa’il: yang melakukan (pola فَاعِل)' },
    { id: 'mafuul', ar: 'مَفْعُول', nama: 'Objek',   ket: 'isim maf’ul: yang dikenai pekerjaan (pola مَفْعُول)' },
    { id: 'mafal',  ar: 'مَفْعَل',  nama: 'Tempat',  ket: 'isim makan: tempat (pola مَفْعَل)' },
    { id: 'afaal',  ar: 'أَفْعَال', nama: 'Jamak',   ket: 'jamak taksir: banyak (pola أَفْعَال)' }
  ];

  var KOSAKATA = [
    // ===== Tema 1: Sekolah =====
    { id: 'katib',    arab: 'كاتب',   voc: 'كَاتِب',   arti: 'penulis',              pola: 'faail'  },
    { id: 'thalib',   arab: 'طالب',   voc: 'طَالِب',   arti: 'pelajar',              pola: 'faail'  },
    { id: 'najih',    arab: 'ناجح',   voc: 'نَاجِح',   arti: 'yang lulus',           pola: 'faail'  },
    { id: 'maktub',   arab: 'مكتوب',  voc: 'مَكْتُوب', arti: 'yang tertulis',        pola: 'mafuul' },
    { id: 'maftuh',   arab: 'مفتوح',  voc: 'مَفْتُوح', arti: 'yang terbuka',         pola: 'mafuul' },
    { id: 'mafhum',   arab: 'مفهوم',  voc: 'مَفْهُوم', arti: 'yang dipahami',        pola: 'mafuul' },
    { id: 'maktab',   arab: 'مكتب',   voc: 'مَكْتَب',  arti: 'kantor / meja tulis',  pola: 'mafal'  },
    { id: 'maqad',    arab: 'مقعد',   voc: 'مَقْعَد',  arti: 'tempat duduk',         pola: 'mafal'  },
    { id: 'malab',    arab: 'ملعب',   voc: 'مَلْعَب',  arti: 'lapangan',             pola: 'mafal'  },
    { id: 'aqlam',    arab: 'أقلام',  voc: 'أَقْلَام', arti: 'pena-pena',            pola: 'afaal'  },
    { id: 'awraq',    arab: 'أوراق',  voc: 'أَوْرَاق', arti: 'kertas-kertas',        pola: 'afaal'  },
    { id: 'abwab',    arab: 'أبواب',  voc: 'أَبْوَاب', arti: 'pintu-pintu',          pola: 'afaal'  },

    // ===== Tema 2: Rumah & Dapur =====
    { id: 'sakin',    arab: 'ساكن',   voc: 'سَاكِن',   arti: 'penghuni',             pola: 'faail'  },
    { id: 'thabikh',  arab: 'طابخ',   voc: 'طَابِخ',   arti: 'juru masak',           pola: 'faail'  },
    { id: 'khadim',   arab: 'خادم',   voc: 'خَادِم',   arti: 'pelayan',              pola: 'faail'  },
    { id: 'mathbukh', arab: 'مطبوخ',  voc: 'مَطْبُوخ', arti: 'yang dimasak',         pola: 'mafuul' },
    { id: 'maghsul',  arab: 'مغسول',  voc: 'مَغْسُول', arti: 'yang dicuci',          pola: 'mafuul' },
    { id: 'masyrub',  arab: 'مشروب',  voc: 'مَشْرُوب', arti: 'yang diminum',         pola: 'mafuul' },
    { id: 'mathbakh', arab: 'مطبخ',   voc: 'مَطْبَخ',  arti: 'dapur',                pola: 'mafal'  },
    { id: 'maghsal',  arab: 'مغسل',   voc: 'مَغْسَل',  arti: 'tempat mencuci',       pola: 'mafal'  },
    { id: 'maskan',   arab: 'مسكن',   voc: 'مَسْكَن',  arti: 'tempat tinggal',       pola: 'mafal'  },
    { id: 'athbaq',   arab: 'أطباق',  voc: 'أَطْبَاق', arti: 'piring-piring',        pola: 'afaal'  },
    { id: 'akwab',    arab: 'أكواب',  voc: 'أَكْوَاب', arti: 'gelas-gelas',          pola: 'afaal'  },
    { id: 'aqfal',    arab: 'أقفال',  voc: 'أَقْفَال', arti: 'kunci-kunci',          pola: 'afaal'  },

    // ===== Tema 3: Kota & Perjalanan =====
    { id: 'saiq',     arab: 'سائق',   voc: 'سَائِق',   arti: 'sopir',                pola: 'faail'  },
    { id: 'rakib',    arab: 'راكب',   voc: 'رَاكِب',   arti: 'penumpang',            pola: 'faail'  },
    { id: 'zair',     arab: 'زائر',   voc: 'زَائِر',   arti: 'pengunjung',           pola: 'faail'  },
    { id: 'masyhur',  arab: 'مشهور',  voc: 'مَشْهُور', arti: 'yang terkenal',        pola: 'mafuul' },
    { id: 'maruf',    arab: 'معروف',  voc: 'مَعْرُوف', arti: 'yang dikenal',         pola: 'mafuul' },
    { id: 'maqshud',  arab: 'مقصود',  voc: 'مَقْصُود', arti: 'yang dituju',          pola: 'mafuul' },
    { id: 'mathham',  arab: 'مطعم',   voc: 'مَطْعَم',  arti: 'restoran',             pola: 'mafal'  },
    { id: 'mashna',   arab: 'مصنع',   voc: 'مَصْنَع',  arti: 'pabrik',               pola: 'mafal'  },
    { id: 'makhbaz',  arab: 'مخبز',   voc: 'مَخْبَز',  arti: 'toko roti',            pola: 'mafal'  },
    { id: 'aswaq',    arab: 'أسواق',  voc: 'أَسْوَاق', arti: 'pasar-pasar',          pola: 'afaal'  },
    { id: 'anhar',    arab: 'أنهار',  voc: 'أَنْهَار', arti: 'sungai-sungai',        pola: 'afaal'  },
    { id: 'asfar',    arab: 'أسفار',  voc: 'أَسْفَار', arti: 'perjalanan-perjalanan', pola: 'afaal' }
  ];

  var TEMA = [
    { id: 's1', judul: 'Sekolah',
      kata: ['katib', 'thalib', 'najih', 'maktub', 'maftuh', 'mafhum', 'maktab', 'maqad', 'malab', 'aqlam', 'awraq', 'abwab'] },
    { id: 's2', judul: 'Rumah & Dapur',
      kata: ['sakin', 'thabikh', 'khadim', 'mathbukh', 'maghsul', 'masyrub', 'mathbakh', 'maghsal', 'maskan', 'athbaq', 'akwab', 'aqfal'] },
    { id: 's3', judul: 'Kota & Perjalanan',
      kata: ['saiq', 'rakib', 'zair', 'masyhur', 'maruf', 'maqshud', 'mathham', 'mashna', 'makhbaz', 'aswaq', 'anhar', 'asfar'] }
  ];

  return { POLA: POLA, KOSAKATA: KOSAKATA, TEMA: TEMA };
}));
