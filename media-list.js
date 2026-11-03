/* =====================================================
   MEDIA-LIST.JS — daftar media di beranda.
   Urutan di sini = urutan kartu di beranda (nomor 1, 2, 3, ...),
   jadi susun dari yang paling mudah ke yang paling sulit.

   Cara menambah media baru:
   1. Salin folder media/roda-cuaca (atau harakaplay) jadi folder baru
   2. Tambah satu blok { ... } di bawah ini
   3. Kalau mau mengisi slot "Segera hadir": ganti isinya
      (isi href dan ubah status jadi 'draft' atau 'ready')

   status:
     'ready' = siap dimainkan (tag hijau)
     'draft' = halaman sudah ada tapi masih dikerjakan (tag oranye)
     'soon'  = slot kosong, belum bisa diklik (tag abu-abu)
   ===================================================== */

const MEDIA_LIST = [
  {
    emoji: '🎡',
    ar: 'الْعَجَلَةُ الدَّوَّارَةُ',
    title: 'Roda Putar',
    desc: 'Putar roda, lalu buat kalimat bahasa Arab sesuai tema. Tema pertama: cuaca kemarin, hari ini, dan besok. Tema lain menyusul!',
    href: 'media/roda-cuaca/index.html',
    status: 'ready'
  },
  {
    emoji: '🃏',
    ar: 'لُعْبَةُ الْحَرَكَاتِ',
    title: 'HarakaPlay',
    desc: 'Game kartu belajar Arab: Haraka Asasi (huruf & harakat), Haraka Iqlab (rangkai kata), dan Haraka Syadid (kosakata Arab gundul + kuis arti). Lawan bot atau main online bareng teman.',
    href: 'media/harakaplay/index.html',
    status: 'ready'
  },
  { emoji: '🧩', title: 'Media berikutnya', desc: 'Tempat untuk media interaktif selanjutnya.', status: 'soon' },
  { emoji: '🎯', title: 'Media berikutnya', desc: 'Tempat untuk media interaktif selanjutnya.', status: 'soon' },
  { emoji: '🏆', title: 'Media berikutnya', desc: 'Tempat untuk media interaktif selanjutnya.', status: 'soon' }
];
