/* Membuat audio/CEKLIS-AUDIO.md dari config & data kata.
   Jalankan:  node scripts/make-audio-checklist.js   (setelah mengubah data kata / level) */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const config = require('../js/config');

let md = '# Ceklis Rekaman Audio HarakaPlay\n\n' +
  'Format: **mp3**, mono, durasi pendek (±1 detik untuk suku kata, ±2 detik untuk kata).\n' +
  'Simpan di folder yang ditunjuk, lalu jalankan `node scripts/scan-audio.js` agar game mengenali file baru.\n' +
  'File yang belum ada tidak apa-apa: game berjalan tanpa suara itu dan console tetap bersih.\n\n';

md += '## A. Suku kata (folder `audio/huruf/`)\n\n' +
  'Nama file = `<kode huruf>-<harakat>.mp3`. Harakat: `fathah` (a), `kasrah` (i), `dammah` (u), ' +
  '`fathatain` (an), `kasratain` (in), `dammatain` (un).\n\n';
const doneLetters = new Set();
config.LEVELS.forEach((l) => {
  md += '### ' + l.name + '\n\n';
  l.letters.forEach((id) => {
    const L = config.letterById[id];
    l.harakat.forEach((h) => {
      const name = L.file + '-' + h;
      const mark = doneLetters.has(name) ? ' (sudah di level lain)' : '';
      doneLetters.add(name);
      md += '- [ ] `' + name + '.mp3`  ' + L.ch + config.harakaById[h].mark + mark + '\n';
    });
  });
  md += '\n';
});
// suku kata yang hanya muncul di paket kata
const extra = [];
config.PACKS.forEach((p) => p.syllables.forEach((s) => {
  const name = config.letterById[s.letter].file + '-' + s.haraka;
  if (!doneLetters.has(name)) { doneLetters.add(name); extra.push([name, config.letterById[s.letter].ch + config.harakaById[s.haraka].mark]); }
}));
if (extra.length) {
  md += '### Tambahan khusus paket kata (Haraka Iqlab)\n\n';
  extra.forEach(([n, ch]) => { md += '- [ ] `' + n + '.mp3`  ' + ch + '\n'; });
  md += '\n';
}

md += '## B. Kata utuh (folder `audio/kata/`)\n\n' +
  'Dibunyikan saat sebuah kata selesai dirangkai. Nama file = id kata.\n\n';
config.PACKS.forEach((p) => {
  md += '### ' + p.name + ' — ' + p.title + '\n\n';
  p.words.forEach((wid) => {
    const w = config.wordById[wid];
    md += '- [ ] `' + w.id + '.mp3`  ' + w.arab + '  (' + w.arti + ')\n';
  });
  md += '\n';
});
fs.writeFileSync(path.join(root, 'audio', 'CEKLIS-AUDIO.md'), md);
console.log('CEKLIS-AUDIO.md dibuat: ' + doneLetters.size + ' suku kata + ' + config.WORDS.length + ' kata');
