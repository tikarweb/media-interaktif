/* Menggabungkan engine (js/config.js + js/game/*.js) menjadi SATU file ESM
   untuk Supabase Edge Function:  supabase/functions/game/engine.mjs
   Jalankan:  node scripts/build-engine.js
   Aturan permainan di server = file yang sama dengan di browser. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = [
  ['kata', 'js/data/kata.js'],
  ['config', 'js/config.js'],
  ['deck', 'js/game/deck.js'],
  ['turn-manager', 'js/game/turn-manager.js'],
  ['scoring', 'js/game/scoring.js'],
  ['rules', 'js/game/rules.js'],
  ['game-state', 'js/game/game-state.js']
];
let out = '// FILE HASIL BUILD — jangan diedit. Sumber: js/config.js dan js/game/*.js\n' +
          '// Bangun ulang dengan: node scripts/build-engine.js\n' +
          'const REG = {};\n';
files.forEach(([name, rel]) => {
  const code = fs.readFileSync(path.join(root, rel), 'utf8');
  out += `REG[${JSON.stringify(name)}] = (function () {\n` +
    `  const module = { exports: {} };\n` +
    `  const require = (p) => REG[p.split('/').pop()];\n` +
    `  (function () {\n${code}\n  }).call({});\n` +
    `  return module.exports;\n})();\n`;
});
out += 'export const config = REG["config"];\nexport const deck = REG["deck"];\nexport const gameState = REG["game-state"];\n';
fs.writeFileSync(path.join(root, 'supabase/functions/game/engine.mjs'), out);
console.log('engine.mjs dibuat (' + out.length + ' byte)');
