/* =====================================================
   DATA.JS — ISI RODA. Di sinilah kamu memperbarui materi.
   Tidak perlu menyentuh script.js / style.css.

   Satu "materi" (set) = satu isi roda lengkap: judul, tiga
   kalimat pemandu, dan petak-petaknya. Tambahkan materi baru
   dengan menyalin satu blok { ... } di dalam WHEEL_SETS.
   Setiap materi tampil sebagai SATU KARTU di layar "Pilih Tema".
   Materi baru otomatis ikut muncul sebagai kartu baru.

   Tiap materi punya:
     id        : nama pendek tanpa spasi (dipakai di link, lihat bawah)
     menu      : nama yang tampil di kartu tema (bahasa Indonesia)
     ikon      : emoji untuk kartu tema
     titleAr   : judul Arab di atas
     titleId   : judul Indonesia (label biru)
     prompts   : tiga kalimat pemandu di sekeliling roda
                 left = panah kiri, center = panah atas, right = panah kanan
     sectors   : daftar petak (disarankan 4 - 6 petak, jumlah bebas 3 - 8)

   Tiap petak:
     text  : kata Arab utama
     sub   : kalimat kecil di bawah kata (satu baris, boleh berharakat)
     emoji : cadangan kalau gambar belum ada
     img   : lokasi gambar (relatif terhadap index.html). Kalau file
             belum ada, otomatis memakai emoji.
     color : warna petak di tepi,  light : warna terang di tengah petak

   LINK LANGSUNG KE MATERI TERTENTU
     media/roda-cuaca/index.html?set=cuaca
   Tanpa "?set=" yang tampil adalah layar Pilih Tema.
   Berguna untuk dibagikan ke siswa langsung ke satu tema.

   TIPS
     - Tulis harakat selengkap mungkin; font sudah mendukung.
     - Kalimat kecil yang terlalu panjang akan mengecil otomatis.
       Idealnya 2 - 4 kata.
     - Setelah mengubah file ini, simpan (Ctrl+S) lalu muat ulang
       browser (Ctrl+F5).
   ===================================================== */

const WHEEL_SETS = [

  /* ---------- MATERI 1: Cuaca ---------- */
  {
    id: 'cuaca',
    menu: 'Kondisi Cuaca',
    ikon: '🌦️',
    titleAr: 'حَالَةُ الطَّقْسِ',
    titleId: 'Kondisi Cuaca',
    prompts: {
      left: 'أَمْسِ كَانَ الطَّالِبُ...',
      center: 'اليَوْمَ الطَّالِبُ...',
      right: 'غَدًا سَيَـ...'
    },
    sectors: [
      {
        light: '#fff7c2', color: '#fcd34d', emoji: '☀️',
        img: 'img/cerah.png',
        text: 'مُشْمِس', sub: 'يَلْعَبُ فِي الْخَارِجِ'
      },
      {
        light: '#d9fbe5', color: '#6ee7a1', emoji: '💨',
        img: 'img/berangin.png',
        text: 'عَاصِف', sub: 'يَلْبَسُ الْمِعْطَفَ'
      },
      {
        light: '#dbeafe', color: '#7db8fb', emoji: '🌧️',
        img: 'img/hujan.png',
        text: 'مُمْطِر', sub: 'يَحْمِلُ الْمِظَلَّةَ'
      },
      {
        light: '#ecdcff', color: '#b784f5', emoji: '⛈️',
        img: 'img/petir.png',
        text: 'رَعْدِي', sub: 'يَبْقَى فِي الدَّاخِلِ'
      },
      {
        light: '#f1f5f9', color: '#b6c4d6', emoji: '☁️',
        img: 'img/berawan.png',
        text: 'غَائِم', sub: 'يَلْعَبُ فِي الْبَيْتِ'
      }
    ]
  }

  /* ---------- MATERI BARU: salin blok ini, hapus tanda komentar ----------
  ,
  {
    id: 'contoh',
    menu: 'Nama Materi',
    ikon: '⭐',
    titleAr: 'عُنْوَانٌ',
    titleId: 'Judul Materi',
    prompts: {
      left: 'أَمْسِ...',
      center: 'اليَوْمَ...',
      right: 'غَدًا...'
    },
    sectors: [
      { light: '#fff7c2', color: '#fcd34d', emoji: '⭐', img: 'img/contoh1.png', text: 'كَلِمَةٌ', sub: 'جُمْلَةٌ قَصِيرَةٌ' },
      { light: '#d9fbe5', color: '#6ee7a1', emoji: '🍎', img: 'img/contoh2.png', text: 'كَلِمَةٌ', sub: 'جُمْلَةٌ قَصِيرَةٌ' },
      { light: '#dbeafe', color: '#7db8fb', emoji: '📘', img: 'img/contoh3.png', text: 'كَلِمَةٌ', sub: 'جُمْلَةٌ قَصِيرَةٌ' },
      { light: '#ecdcff', color: '#b784f5', emoji: '🏠', img: 'img/contoh4.png', text: 'كَلِمَةٌ', sub: 'جُمْلَةٌ قَصِيرَةٌ' }
    ]
  }
  ------------------------------------------------------------------------- */
];

/* =====================================================
   TEMA YANG AKAN DATANG (kartu "Segera" di layar Pilih Tema)
   Ini hanya penanda tempat, belum bisa dibuka. Hapus atau ganti
   sesukamu. Kalau temanya sudah siap, buat blok materi di
   WHEEL_SETS di atas, lalu hapus baris yang sama di sini.
     menu   : nama Indonesia
     titleAr: nama Arab
     ikon   : emoji
     color / light : warna kartu
   ===================================================== */
const WHEEL_SOON = [
  { menu: 'Keluarga',  titleAr: 'الْأُسْرَةُ',      ikon: '👨‍👩‍👧', color: '#fcd34d', light: '#fff7c2' },
  { menu: 'Warna',     titleAr: 'الْأَلْوَانُ',     ikon: '🎨', color: '#b784f5', light: '#ecdcff' },
  { menu: 'Makanan',   titleAr: 'الطَّعَامُ',      ikon: '🍎', color: '#6ee7a1', light: '#d9fbe5' },
  { menu: 'Hewan',     titleAr: 'الْحَيَوَانَاتُ', ikon: '🐘', color: '#fdba74', light: '#ffedd5' }
];
