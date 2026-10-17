# HarakaPlay — Uno Hijaiyah

Kartu Uno huruf hijaiyah (ب ت ث ج ح) + harakat (fathah, kasrah, dammah) untuk pemula.

## Cara membuka
Klik dua kali `index.html` (atau Live Server di VS Code). Tidak perlu install apa pun
(tanpa ES modules, jadi jalan dari `file://`).

## Mengganti audio / gambar
- Musik latar: `audio/backsound.mp3` (lihat `audio/PANDUAN-AUDIO.txt`)
- Latar: `img/latar.jpg` (lihat `img/PANDUAN-GAMBAR.txt`)

## Struktur
- `js/config.js` — warna, harakat, huruf, poin
- `js/game/` — engine murni (deck, rules, scoring, game-state, bot); tanpa DOM
- `js/ui/` — tampilan & pengendali (render-cards, render-players, dialogs, app)
- `css/` — `cards.css` (kartu bergaya Uno), `layout.css` (layar & panel)
- `tests/engine.test.js` — uji engine

## Tes
`node --test` di folder ini (Node 18+). tes engine (termasuk simulasi 600 ronde bot lawan bot) dan tes logika server online.

## Asumsi aturan (spesifikasi tidak menyebut)
- Kartu Ambil 1 dan Ganti Harakat punya warna tapi tanpa harakat: cocok hanya lewat warna.
- Kartu Ganti Warna tanpa warna (wild). Ambil 1 & Ganti Harakat: 1 kartu per warna.
- Jika kartu terakhir adalah kartu khusus, pemain langsung menang tanpa pilihan/penalti.
- Kartu awal selalu kartu biasa; urutan pemain diacak.

## Mode online (Supabase)
Arsitektur: server = sumber kebenaran.
- `supabase/functions/game/` — Edge Function (wasit). `core.mjs` = logika (bisa diuji di Node),
  `engine.mjs` = HASIL BUILD dari `js/game/*.js` (`node scripts/build-engine.js`),
  `store-supabase.mjs` = akses database, `index.ts` = pintu masuk (verifikasi token).
- `supabase/migrations/0001_harakaplay.sql` — tabel, RLS, fungsi simpan atomik (penjaga versi), realtime.
- `js/net/` — klien (login anonim, panggilan ke fungsi, Realtime + polling 3 dtk), `js/ui/online-ui.js` — lobi & permainan.
- Kartu tersembunyi: tumpukan & semua tangan ada di `room_secrets` (tidak bisa dibaca klien);
  tiap pemain hanya bisa membaca barisnya sendiri di `hands`; status publik tanpa kartu tangan.
- Kunci `service_role` hanya ada di lingkungan Edge Function, TIDAK di kode situs.
- Langkah pasang: lihat `PANDUAN-ONLINE.md`.

## Status tahap
1. Engine + tes — selesai
2. UI + panel aturan — selesai
3. Mode bot — selesai
4. Multiplayer Supabase — kode selesai; BELUM diuji di proyek Supabase asli
5. Uji keamanan/konkurensi — diuji pada logika server (tes Node) dan skema SQL (Postgres lokal);
   uji end-to-end di Supabase asli menunggu deploy
6. Dokumentasi deploy — `PANDUAN-ONLINE.md`

## Batasan yang diketahui (online)
- Tidak ada batas waktu giliran: pemain yang pergi menahan permainan (tuan rumah bisa mengakhiri ruangan).
- Tidak ada pembatasan laju (rate limit) selain bawaan Supabase.
- Ruangan lama tidak dihapus otomatis (lihat komentar di akhir file SQL).
- Pemain tak bisa keluar permanen di tengah permainan; ia hanya meninggalkan tampilan dan bisa kembali.

Catatan: punggung kartu memakai lambang "HarakaPlay" sendiri, bukan logo Uno.
