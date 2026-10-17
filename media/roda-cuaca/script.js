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

function initSets() {
  if (typeof WHEEL_SETS === 'undefined' || !WHEEL_SETS.length) return;

  // Materi awal: dari link (?set=cuaca) atau yang pertama
  let first = WHEEL_SETS[0];
  try {
    const wanted = new URLSearchParams(window.location.search).get('set');
    const found = WHEEL_SETS.find(s => s.id === wanted);
    if (found) first = found;
  } catch (e) {}

  // Menu pilihan muncul hanya kalau ada lebih dari satu materi
  const picker = document.getElementById('setPicker');
  const select = document.getElementById('setSelect');
  if (picker && select && WHEEL_SETS.length > 1) {
    WHEEL_SETS.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.menu || s.titleId || s.id;
      select.appendChild(opt);
    });
    select.value = first.id;
    picker.hidden = false;
    select.addEventListener('change', function () {
      if (isSpinning) { select.value = currentSet.id; return; }
      const next = WHEEL_SETS.find(s => s.id === select.value);
      if (next) applySet(next);
    });
  }

  applySet(first);
}

/* ---------- Pengaturan layar & start ---------- */
// Ukuran panggung dibaca dari style.css (.stage). Panggung otomatis
// mengecil di layar kecil dan membesar (maks 1.25x) di layar lebar/proyektor.
function fitStage() {
  const wrap = document.querySelector('.stage-wrap');
  const stage = document.querySelector('.stage');
  const header = document.querySelector('.page-header');
  const W = stage.offsetWidth;
  const H = stage.offsetHeight;
  const availW = window.innerWidth - 24;
  const availH = window.innerHeight - header.offsetHeight - 24;
  const scale = Math.min(1.25, availW / W, availH / H);
  stage.style.transform = 'scale(' + scale + ')';
  wrap.style.width = (W * scale) + 'px';
  wrap.style.height = (H * scale) + 'px';
}

window.addEventListener('resize', fitStage);

window.onload = function () {
  initSets();
  fitStage();
};
spinBtn.addEventListener('click', spin);
wheelContainer.addEventListener('click', spin);
