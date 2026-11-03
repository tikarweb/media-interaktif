/* =====================================================
   SCRIPT.JS — logika roda putar.
   Bagian inti (spin, animate, easing, durasi, jumlah
   putaran) SAMA PERSIS dengan versi aslimu.
   Yang ditambah: menggambar gambar (dengan cadangan emoji),
   penataan tulisan otomatis, ganti materi, pemuatan font,
   dan penyesuaian ukuran layar.
   Isi roda (kata, kalimat, gambar, judul) ada di data.js.
   ===================================================== */

const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const wheelContainer = document.querySelector('.wheel-container');

// Kanvas digambar dengan resolusi 1,5x (1200 px) agar tetap tajam di layar HP.
// Semua ukuran di bawah tetap dalam satuan 800 x 800 (diskalakan otomatis).
const RES = 1.5;

// Materi yang sedang tampil
let currentSet = null;
let sectors = [];
let numSectors = 0;
let arc = 0;

let startAngle = 0;
let isSpinning = false;

/* =====================================================
   PENGATURAN UKURAN (satuan: piksel kanvas, kanvas = 800 x 800)
   Boleh diubah — tulisan akan MENGECIL OTOMATIS kalau terlalu
   lebar, jadi tidak akan saling bertabrakan atau keluar petak.
   ===================================================== */
const LAYOUT = {
  wheelRadius: 392,   // jari-jari roda
  centerDist: 246,    // jarak isi petak dari pusat roda
  wordSize: 60,       // kata Arab utama (مُشْمِس dst.)
  subSize: 34,        // kalimat kecil di bawah kata
  imgBox: 88,         // kotak gambar / emoji
  gap: 6,             // jarak antar baris
  subMode: 'one'      // 'one' = kalimat kecil SATU baris (disarankan)
                      // 'two' = dipecah dua baris (jarak antar baris dilonggarkan)
};

// Font
const FONT_WORD = function (px) { return '900 ' + px + 'px "Cairo", Arial'; };
const FONT_SUB = function (px) { return '700 ' + px + 'px "Scheherazade New", "Cairo", serif'; };

// Lingkaran aman: sebuah lingkaran yang muat di dalam petak dan tidak pernah
// menyentuh lingkaran petak tetangganya, berapa pun sudut putarnya.
// Semua isi petak digambar di dalam lingkaran ini. (Dihitung ulang tiap materi,
// karena jumlah petak boleh berbeda-beda.)
let SAFE_R = 140;
let SCALE = 1;      // pengecil otomatis kalau petaknya sempit (banyak petak)

function halfWidthAt(y) {
  return Math.sqrt(Math.max(0, SAFE_R * SAFE_R - y * y));
}

// Kecilkan ukuran font bila teks lebih lebar dari ruang yang tersedia
function fitFontSize(text, fontFn, size, maxWidth) {
  ctx.font = fontFn(size);
  const w = ctx.measureText(text).width;
  return w > maxWidth ? size * maxWidth / w : size;
}

/* ---------- Memuat gambar (kalau belum ada -> pakai emoji) ---------- */
function loadImages(set) {
  set.sectors.forEach(sector => {
    if (sector._imgRequested) return;
    sector._imgRequested = true;
    sector.image = null;
    if (!sector.img) return;
    const im = new Image();
    im.onload = () => { sector.image = im; if (!isSpinning) drawWheel(startAngle); };
    im.onerror = () => { sector.image = null; };
    im.src = sector.img;
  });
}

/* ---------- Menggambar ---------- */
function drawWheel(currentRotationAngle = 0) {
  const cx = 400;
  const cy = 400;
  const r = LAYOUT.wheelRadius;

  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.clearRect(0, 0, 800, 800);
  if (!numSectors) return;

  // Petak warna (gradasi lembut dari tengah ke tepi)
  sectors.forEach((sector, i) => {
    const angle = currentRotationAngle + (i * arc);
    const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, r);
    grad.addColorStop(0, sector.light || sector.color);
    grad.addColorStop(1, sector.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + arc);
    ctx.lineTo(cx, cy);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke();
  });

  // Ukuran baris (sudah disesuaikan dengan lebar petak)
  const wordSize = LAYOUT.wordSize * SCALE;
  const subSize = LAYOUT.subSize * SCALE;
  const imgBox = LAYOUT.imgBox * SCALE;
  const gap = LAYOUT.gap * SCALE;
  const twoLines = LAYOUT.subMode === 'two';

  // Isi petak: gambar, kata, kalimat kecil
  sectors.forEach((sector, i) => {
    const angle = currentRotationAngle + (i * arc);
    const midAngle = angle + arc / 2;

    const bx = cx + Math.cos(midAngle) * LAYOUT.centerDist;
    const by = cy + Math.sin(midAngle) * LAYOUT.centerDist;

    // Kalimat kecil: satu baris (default) atau dua baris
    let subLines = [sector.sub];
    if (twoLines) {
      const words = sector.sub.split(' ');
      if (words.length >= 2) {
        const cut = Math.ceil(words.length / 2);
        subLines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
      }
    }

    // Tinggi tiap baris. Harakat Arab menjorok ke atas dan bawah, jadi baris
    // kalimat kecil diberi ruang lebih (1.5x satu baris, 1.75x kalau dua baris).
    const wordH = wordSize * 1.25;
    const subH = subSize * (twoLines ? 1.75 : 1.5);
    const total = imgBox + gap + wordH + gap + subH * subLines.length;

    // Urutan: gambar (atas, bagian petak yang sempit) -> kata Arab (tengah,
    // bagian terlebar) -> kalimat kecil (bawah)
    let y = -total / 2;
    const imgY = y + imgBox / 2;      y += imgBox + gap;
    const wordY = y + wordH / 2;      y += wordH + gap;
    const subYs = subLines.map((_, k) => y + subH * k + subH / 2);

    ctx.save();
    ctx.translate(bx, by);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    // 1) Gambar (atau emoji cadangan) di atas lingkaran putih lembut
    const box = Math.min(imgBox, 2 * (SAFE_R - Math.abs(imgY) - 4));
    ctx.beginPath();
    ctx.arc(0, imgY, box / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    if (sector.image) {
      const iw = sector.image.naturalWidth;
      const ih = sector.image.naturalHeight;
      const scale = Math.min(box / iw, box / ih);
      const w = iw * scale;
      const h = ih * scale;
      ctx.drawImage(sector.image, -w / 2, imgY - h / 2, w, h);
    } else {
      ctx.font = Math.round(box * 0.72) + 'px "Segoe UI Emoji", "Apple Color Emoji", Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText(sector.emoji || '', 0, imgY + 3);
    }

    // 2) Kata Arab utama (garis putih tebal supaya menonjol seperti stiker)
    const wordEdge = Math.abs(wordY) + wordH * 0.38;
    const wordPx = fitFontSize(sector.text, FONT_WORD, wordSize, 2 * halfWidthAt(wordEdge) - 6);
    ctx.font = FONT_WORD(wordPx);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(sector.text, 0, wordY);
    ctx.fillStyle = '#0c4a6e';
    ctx.fillText(sector.text, 0, wordY);

    // 3) Kalimat kecil
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    subLines.forEach((line, k) => {
      const edge = Math.abs(subYs[k]) + subH * 0.38;
      const px = fitFontSize(line, FONT_SUB, subSize, 2 * halfWidthAt(edge) - 6);
      ctx.font = FONT_SUB(px);
      ctx.strokeText(line, 0, subYs[k]);
      ctx.fillText(line, 0, subYs[k]);
    });

    ctx.restore();
  });
}

/* ---------- Memutar (INTI — tidak diubah) ---------- */
function spin() {
  if (isSpinning) return;
  isSpinning = true;

  const targetSpinTime = 4500;
  const startTimestamp = performance.now();
  const totalRotationTarget = (Math.PI * 2 * 6) + (Math.random() * Math.PI * 2);
  const baseAngle = startAngle;

  function animate(now) {
    const elapsed = now - startTimestamp;
    const t = Math.min(elapsed / targetSpinTime, 1);
    const easeOut = 1 - Math.pow(1 - t, 3);
    const currentAngle = baseAngle + (totalRotationTarget * easeOut);

    drawWheel(currentAngle);

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      startAngle = currentAngle;
      isSpinning = false;
    }
  }
  requestAnimationFrame(animate);
}

/* ---------- Materi (set) ---------- */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el && typeof text === 'string') el.textContent = text;
}

function applySet(set) {
  currentSet = set;
  sectors = set.sectors;
  numSectors = sectors.length;
  arc = 2 * Math.PI / numSectors;

  // Lingkaran aman untuk jumlah petak ini
  SAFE_R = Math.min(
    LAYOUT.centerDist * Math.sin(arc / 2) - 5,
    LAYOUT.wheelRadius - LAYOUT.centerDist - 6
  );
  SCALE = Math.min(1, SAFE_R / 136);

  // Judul dan kalimat pemandu
  setText('titleAr', set.titleAr);
  setText('titleId', set.titleId);
  if (set.prompts) {
    setText('promptLeft', set.prompts.left);
    setText('promptCenter', set.prompts.center);
    setText('promptRight', set.prompts.right);
  }
  if (set.titleId) document.title = set.titleId + ' — Roda Putar Bahasa Arab';

  loadImages(set);
  loadFontsThenDraw(set);
  drawWheel(startAngle);
}

// Gambar ulang setelah font selesai dimuat. Teks Arab materi ikut dikirim
// supaya browser memuat bagian font Arab-nya (font dipecah per jenis huruf).
function loadFontsThenDraw(set) {
  if (!(document.fonts && document.fonts.load)) return;
  const sample = set.sectors.map(s => s.text + ' ' + s.sub).join(' ') + ' a';
  Promise.all([
    document.fonts.load('900 60px "Cairo"', sample),
    document.fonts.load('700 34px "Scheherazade New"', sample)
  ]).then(() => document.fonts.ready).then(() => {
    if (!isSpinning && currentSet === set) drawWheel(startAngle);
  });
}

/* ---------- Layar: Pilih Tema <-> Roda ---------- */
const viewPicker = document.getElementById('viewPicker');
const viewWheel = document.getElementById('viewWheel');

function showPicker(push) {
  viewWheel.hidden = true;
  viewPicker.hidden = false;
  document.title = 'Roda Putar Bahasa Arab';
  if (push) { try { history.pushState({}, '', window.location.pathname); } catch (e) {} }
  window.scrollTo(0, 0);
}

function showWheel(set, push) {
  viewPicker.hidden = true;
  viewWheel.hidden = false;
  applySet(set);
  if (push) { try { history.pushState({ set: set.id }, '', '?set=' + encodeURIComponent(set.id)); } catch (e) {} }
  window.scrollTo(0, 0);
}

function buildThemeCards() {
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = '';
  let i = 0;

  function card(opts) {
    const el = document.createElement(opts.soon ? 'div' : 'button');
    if (!opts.soon) el.type = 'button';
    el.className = 'rc-theme' + (opts.soon ? ' is-soon' : '');
    el.style.setProperty('--c', opts.color);
    el.style.setProperty('--l', opts.light);
    el.style.setProperty('--i', i++);

    const icon = document.createElement('span');
    icon.className = 'rc-theme__icon';
    icon.textContent = opts.icon;
    const ar = document.createElement('span');
    ar.className = 'rc-theme__ar';
    ar.textContent = opts.ar;
    const id = document.createElement('span');
    id.className = 'rc-theme__id';
    id.textContent = opts.name;
    const meta = document.createElement('span');
    meta.className = 'rc-theme__meta';
    meta.textContent = opts.meta;
    el.appendChild(icon); el.appendChild(ar); el.appendChild(id); el.appendChild(meta);

    if (opts.soon) {
      const b = document.createElement('span');
      b.className = 'rc-theme__badge';
      b.textContent = 'Segera';
      el.appendChild(b);
    }
    return el;
  }

  WHEEL_SETS.forEach(function (s) {
    const first = s.sectors[0] || {};
    const el = card({
      icon: s.ikon || first.emoji || '🎡',
      ar: s.titleAr, name: s.menu || s.titleId || s.id,
      meta: s.sectors.length + ' kata',
      color: first.color || '#7db8fb', light: first.light || '#dbeafe'
    });
    el.addEventListener('click', function () { showWheel(s, true); });
    grid.appendChild(el);
  });

  (typeof WHEEL_SOON !== 'undefined' ? WHEEL_SOON : []).forEach(function (s) {
    grid.appendChild(card({
      soon: true, icon: s.ikon || '🎡', ar: s.titleAr, name: s.menu, meta: 'Segera hadir',
      color: s.color || '#cbd5e1', light: s.light || '#f1f5f9'
    }));
  });
}

function setFromUrl() {
  try {
    const wanted = new URLSearchParams(window.location.search).get('set');
    return WHEEL_SETS.find(function (s) { return s.id === wanted; }) || null;
  } catch (e) { return null; }
}

function initSets() {
  if (typeof WHEEL_SETS === 'undefined' || !WHEEL_SETS.length) return;
  buildThemeCards();
  const wanted = setFromUrl();
  if (wanted) showWheel(wanted, false); else showPicker(false);

  document.getElementById('themeBtn').addEventListener('click', function () {
    if (isSpinning) return;
    showPicker(true);
  });
  // tombol Kembali / Maju milik browser
  window.addEventListener('popstate', function () {
    if (isSpinning) return;
    const s = setFromUrl();
    if (s) showWheel(s, false); else showPicker(false);
  });
}

/* ---------- Start ---------- */
window.onload = function () {
  initSets();
};

// Memutar lewat tombol / klik roda. spin() di atas tidak diubah;
// di sini hanya menandai tombol selama roda berputar.
function startSpin() {
  if (isSpinning) return;
  spin();
  spinBtn.classList.add('is-busy');
  (function waitEnd() {
    if (isSpinning) requestAnimationFrame(waitEnd);
    else spinBtn.classList.remove('is-busy');
  }());
}
spinBtn.addEventListener('click', startSpin);
wheelContainer.addEventListener('click', startSpin);
