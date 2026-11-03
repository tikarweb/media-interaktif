/* =====================================================
   SITE-CONFIG.JS — pengaturan beranda Titik Arab.
   Semua yang sering kamu ubah ada di SINI: tulisan "Tentang",
   tautan sosial media, WhatsApp, dan tombol dukungan.
   Setelah mengubah, simpan (Ctrl+S) dan muat ulang (Ctrl+F5).
   ===================================================== */

const SITE = {

  /* ---------- Tentang ---------- */
  about: {
    title: 'Hai, aku Nel 👋',
    paragraphs: [
      'Di balik Titik Arab ada aku, pengajar bahasa Arab yang percaya belajar Arab itu nggak harus tegang dan bikin ngantuk.',
      'Makanya aku bikin media interaktif ini: ada roda yang tinggal diputar, ada kartu yang bisa dimainkan bareng teman, semuanya buat bikin latihan Arab jadi seru. Gratis dan bisa dibuka dari HP.',
      'Masih terus nambah media baru. Kalau kamu punya ide, kritik, atau mau kolaborasi, langsung chat aja ya!'
    ]
  },

  /* ---------- Tautan sosial media & WhatsApp ---------- */
  social: [
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/titikarab/' },
    { id: 'tiktok',    label: 'TikTok',    url: 'https://www.tiktok.com/@titik.arab' },
    { id: 'threads',   label: 'Threads',   url: 'https://www.threads.com/@titikarab' },
    { id: 'youtube',   label: 'YouTube',   url: 'https://www.youtube.com/@titikArab' },
    { id: 'whatsapp',  label: 'WhatsApp',  url: 'https://wa.me/628993130572?text=Halo%20Titik%20Arab%2C%20' }
  ],

  /* ---------- Dukungan sukarela ----------
     Tiga cara, boleh diisi salah satu atau semuanya. Yang kosong ('') tidak tampil.
     Kalau SEMUANYA kosong, kartu tampil sebagai "Segera hadir".

     link   : tautan ke halaman donasi/tip pilihanmu (Lynk.id, dll.), contoh 'https://lynk.id/titikarab'
     qris   : nama file gambar QR yang kamu taruh di folder img/ (di samping index.html),
              contoh 'img/qris.png'. Ambil QR dari aplikasi e-wallet / m-banking milikmu sendiri.
     rekening : tulisan nomor yang ingin dibagikan beserta nama pemilik,
              contoh 'DANA 0899xxxxxxx a.n. Nama Kamu'
  */
  support: {
    title: 'Traktir Segelas Kopi ☕',
    text: 'Semua media di sini gratis. Kalau kamu merasa terbantu dan mau ikut mendukung, hadiah sukarela berapa pun, Rp5.000 pun, sangat berarti buat aku lanjut bikin media baru. Terima kasih banyak! 💙',
    link: '',
    qris: '',
    rekening: ''
  },

  /* ---------- Statistik kunjungan ---------- */
  stats: {
    enabled: true,           // false = sembunyikan bagian statistik
    endpoint: '/api/visit',  // dibuat oleh api/visit.js (aktif setelah dipublikasikan di Vercel)
    topCountries: 8          // berapa negara yang ditampilkan
  },

  /* Vercel Web Analytics (dasbor pribadimu). Aktifkan juga di dasbor Vercel. */
  vercelAnalytics: true
};
