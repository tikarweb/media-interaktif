/* Memindai audio/huruf/*.mp3 dan audio/kata/*.mp3 lalu menulis audio/manifest.js
   Jalankan setiap selesai menambah / menghapus rekaman:  node scripts/scan-audio.js */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function list(dir) {
  const d = path.join(root, 'audio', dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => /\.mp3$/i.test(f)).map((f) => f.replace(/\.mp3$/i, '')).sort();
}
const huruf = list('huruf'), kata = list('kata');
const out = `/* DAFTAR REKAMAN YANG SUDAH ADA — jangan diedit manual.
   Dibuat otomatis oleh:  node scripts/scan-audio.js
   (Kosong = belum ada rekaman; game tetap jalan tanpa suara pelafalan.) */
(function (root) {
  var HP = (root.HarakaPlay = root.HarakaPlay || {});
  HP.audioManifest = ${JSON.stringify({ huruf, kata }, null, 2)};
}(this));
`;
fs.writeFileSync(path.join(root, 'audio', 'manifest.js'), out);
console.log('manifest.js: ' + huruf.length + ' rekaman huruf, ' + kata.length + ' rekaman kata');
