# HarakaPlay — Kartu Hijaiyah

Game kartu untuk melatih membaca huruf hijaiyah berharakat dan merangkai kata Arab.
Lawan bot, atau main online 2–4 pemain.

## Tiga mode
| Mode | Sasaran | Isi | Status |
|---|---|---|---|
| **Haraka Asasi** (أَسَاسِي) | Pemula | 7 level huruf + harakat, ada bantuan baca Latin | selesai |
| **Haraka Iqlab** (إِقْلَاب) | Menengah | 4 paket kata fi'il madhi, Rangkai Kata, tanpa bantuan Latin | selesai |
| **Haraka Syadid** (شَدِيد) | Mahir | Arab gundul + kosakata tematik | segera (tombol sudah ada, belum bisa dipilih) |

## Cara membuka
Klik dua kali `index.html` (atau Live Server di VS Code). Tanpa install apa pun
(tanpa ES modules, jadi jalan dari `file://`).

## Aturan inti
- Kartu cocok jika **warna** atau **harakat** sama dengan yang aktif (huruf sama saja tidak cukup).
- Kartu khusus: Ambil 1, Ganti Harakat, Ganti Warna.
- Tidak punya kartu cocok: tekan **السَّحْب / Ambil**.
- **وَاحِد ! (Waahid!)**: saat kartu tinggal 1, tekan tombolnya. Kalau lupa dan lawan menekan
  **أَمْسِكْ ! (Tangkap!)** sebelum pemain berikutnya bergerak, kamu ambil `WAAHID_PENALTY` kartu (default 2).
- **Rangkai Kata (Iqlab)**: ada satu Target Kata Aktif, mis. [جَ][لَ][سَ]. Kartu yang dibuang dan
  sama dengan salah satu suku kata target (huruf + harakat) mengisi kotaknya, urutan bebas. Yang
  menaruh potongan terakhir memicu bonus (pemain berikutnya ambil `WORD_BONUS_DRAW` kartu, default 1),
  pop-up arti, lalu target baru keluar otomatis dari paket.

Konstanta aturan ada di `js/config.js`: `WAAHID_PENALTY`, `WORD_BONUS_DRAW`.
Istilah antarmuka dua bahasa ada di `UI` pada file yang sama (mis. `draw`, `turn`, `waahid`, `catch`, `word`).

## Mengedit kosakata (Iqlab)
Semua kata ada di **`js/data/kata.js`**. Satu kata = satu baris:

```js
{ id: 'jalasa', arab: 'جَلَسَ', arti: 'duduk', latin: 'jalasa' }
```
- `arab` harus berharakat penuh, 3 huruf berbeda, tiap huruf punya harakat (fathah/kasrah/dammah).
- `id` huruf kecil tanpa spasi/apostrof; id ini juga nama file audio kata (`audio/kata/<id>.mp3`).
- `PAKET` mengelompokkan kata (5 kata per paket). Tiap paket menjadi satu "level" Iqlab, dan
  dek kartunya dibuat otomatis dari suku kata semua kata di paket itu.
- Salah ketik langsung ketahuan: `parseWord` memberi pesan error yang jelas saat halaman/tes dibuka.
- Setelah mengubah data: `node --test`, lalu `node scripts/make-audio-checklist.js`.
  Bila memakai online: `node scripts/build-engine.js` dan deploy ulang fungsi `game`.

## Audio
- Rekaman suku kata: `audio/huruf/<kode huruf>-<harakat>.mp3`, mis. `ja-fathah.mp3`.
- Rekaman kata utuh: `audio/kata/<id kata>.mp3`, mis. `jalasa.mp3` (dibunyikan saat kata selesai dirangkai).
- Daftar lengkap nama file: **`audio/CEKLIS-AUDIO.md`** (dibuat otomatis, centang sendiri sambil merekam).
- Setelah menambah mp3: jalankan **`node scripts/scan-audio.js`** agar file tercatat di `audio/manifest.js`.
  Hanya file yang tercatat yang diminta browser, jadi file yang belum direkam tidak membuat error di console.
- Ducking: saat klip diputar, musik latar turun halus dari 0.35 ke 0.1 ±1 detik, lalu kembali
  (`window.Backsound.duck(ms)` di `assets/js/backsound.js`, dipakai bersama oleh semua media).
- Musik latar: `audio/backsound.mp3` (lihat `audio/PANDUAN-AUDIO.txt`). Latar: `img/latar.jpg`.

## Struktur
- `js/data/kata.js` — kosakata + paket (dimuat SEBELUM `config.js`)
- `js/config.js` — warna, harakat, huruf, level Asasi, paket Iqlab, mode, istilah UI, konstanta
- `js/game/` — engine murni (deck, rules, scoring, game-state, bot); tanpa DOM
- `js/ui/` — tampilan & pengendali (app, render-*, word-ui, pronounce, levels-ui, dialogs, online-ui)
- `css/` — `cards.css` (kartu), `layout.css` (layar & panel)
- `audio/` — manifest, ceklis, panduan; `scripts/` — build engine, pindai audio, buat ceklis
- `tests/` — engine, level, Iqlab/Waahid, logika server online

## Tes
`node --test` di folder ini (Node 18+): engine, level, mode Iqlab (slot, bonus, Waahid/Tangkap,
simulasi bot tiap paket) dan logika server online.

## Level Asasi
7 level, dipilih sebelum bermain (bot: layar pengaturan; online: tuan rumah di ruang tunggu).
Setelah ronde: **Ulangi** atau **Level/Paket Berikutnya ▶** (skor kumulatif terbawa).
- Level 1–5: lima huruf per level dengan fathah/kasrah/dammah (72 kartu)
- Level 6: و ي ا ء (60 kartu) · Level 7: tanwin dengan ب ت ج د ر (72 kartu)
- Ubah level: edit `LEVELS` di `js/config.js`.

## Mode online (Supabase)
Server = sumber kebenaran.
- `supabase/functions/game/` — Edge Function. `core.mjs` logika (bisa diuji di Node), `engine.mjs` = HASIL
  BUILD (`node scripts/build-engine.js`, memuat `kata.js`, `config.js`, `js/game/*.js`), `store-supabase.mjs`, `index.ts`.
- `supabase/migrations/0001_harakaplay.sql` — tabel, RLS, fungsi simpan atomik, realtime.
- Kartu tersembunyi di `room_secrets`/`hands` (RLS). Kunci `service_role` hanya di Edge Function.
- Pasang & deploy: `PANDUAN-ONLINE.md`. Pembaruan aturan/data kata TIDAK mengubah SQL, tetapi fungsi `game` harus di-deploy ulang.

## Batasan yang diketahui
- Online: tidak ada batas waktu giliran; tidak ada rate limit selain bawaan Supabase; ruangan lama tidak dihapus otomatis.
- Jendela Waahid/Tangkap online bergantung pada kecepatan jaringan; lawan yang lambat bisa kehilangan kesempatan menangkap.
- Tes online hanya terhadap server palsu dan Postgres lokal, ditambah pemakaian nyata versi pertama.
- Istilah Arab antarmuka (mis. أَمْسِكْ، الْكَلِمَة) perlu ditinjau penutur ahli.

Punggung kartu memakai lambang "HarakaPlay" sendiri.
