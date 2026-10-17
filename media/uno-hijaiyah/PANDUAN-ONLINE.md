# Panduan Mode Online HarakaPlay (Supabase) — langkah demi langkah

Proyek Supabase-mu: `fsqzxdifxdtghbqrbipz`  (URL dan kunci publishable sudah terpasang di
`js/net/online-config.js`).

## Langkah 1 — Pasang tabel & aturan keamanan (sekali saja)
1. Buka Supabase Dashboard → proyek `harakaplay`.
2. Menu kiri **SQL Editor** → **New query**.
3. Buka file `supabase/migrations/0001_harakaplay.sql`, salin SEMUA isinya, tempel, klik **Run**.
4. Harus muncul "Success. No rows returned". Aman dijalankan ulang.

## Langkah 2 — Pastikan login anonim aktif
Authentication → Sign In / Providers → **Allow anonymous sign-ins** = hidup → Save.

## Langkah 3 — Pasang "wasit" (Edge Function)
Butuh Node.js (https://nodejs.org, versi LTS). Buka **Terminal** di VS Code
(menu Terminal → New Terminal), lalu:

```
cd media/uno-hijaiyah
npx supabase login
npx supabase link --project-ref fsqzxdifxdtghbqrbipz
npx supabase functions deploy game --use-api
```
- `login` membuka browser; klik izinkan.
- `link` meminta *database password* (yang kamu buat saat membuat proyek).
- `deploy` mengunggah fungsi bernama `game`. Berhasil jika muncul "Deployed Functions ... game".
- Kalau kamu mengubah aturan di `js/game/*.js`, jalankan dulu `node scripts/build-engine.js`
  lalu deploy ulang.

## Langkah 4 — Coba sendiri (dua jendela)
1. Buka situs (GitHub Pages atau `index.html`) di jendela biasa → Main Online → Buat ruangan.
2. Buka jendela **Incognito/Private** → Main Online → masukkan kode → Gabung.
3. Mulai, mainkan beberapa giliran. Coba juga: tutup tab lalu buka lagi → tombol **Lanjutkan**.

## Langkah 5 — Daftarkan alamat situs
Authentication → URL Configuration → **Site URL** = alamat GitHub Pages-mu
(contoh `https://tikarweb.github.io/media-interaktif/`). Lalu unggah versi terbaru ke GitHub.

## Jika ada masalah
| Gejala | Penyebab umum |
|---|---|
| "Gagal masuk (login anonim)" | Langkah 2 belum aktif |
| "Server memberi jawaban yang tidak dikenal (404)" | Langkah 3 belum dijalankan / nama fungsi bukan `game` |
| Error `relation "rooms" does not exist` di log | Langkah 1 belum dijalankan |
| Tampilan telat ±3 detik | Realtime belum aktif; tidak masalah, ada pembaruan otomatis tiap 3 detik |

Log fungsi: Dashboard → Edge Functions → game → Logs.
