/* =====================================================
   BACKSOUND.JS — musik latar yang bisa dipakai SEMUA media.
   Cara pakai (taruh di akhir <body>):

   <script src="../../assets/js/backsound.js"
           data-src="audio/backsound.mp3"
           data-volume="0.35"></script>

   - data-src    : lokasi file musik (relatif terhadap halaman)
   - data-volume : 0 sampai 1 (default 0.35)

   Perilaku:
   - Browser melarang suara otomatis, jadi musik mulai saat
     pengguna pertama kali mengklik / menyentuh halaman.
   - Tombol 🔊/🔇 di pojok kanan atas untuk menyalakan / mematikan.
   - Pilihan mati/nyala diingat di browser.
   - Musik berhenti sementara saat tab ditinggalkan.
   - Kalau file musiknya belum ada, tombolnya tidak ditampilkan
     dan halaman tetap berjalan normal.
   ===================================================== */

(function () {
  var script = document.currentScript;
  var src = script.getAttribute('data-src');
  if (!src) return;

  var volume = parseFloat(script.getAttribute('data-volume'));
  if (isNaN(volume)) volume = 0.35;

  var STORE_KEY = 'backsound-muted';
  var muted = false;
  try { muted = localStorage.getItem(STORE_KEY) === '1'; } catch (e) {}

  var audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  audio.preload = 'auto';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-sound';
  document.body.appendChild(btn);

  function render() {
    btn.textContent = muted ? '🔇' : '🔊';
    btn.title = muted ? 'Nyalakan musik' : 'Matikan musik';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', muted ? 'false' : 'true');
  }

  function play() {
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  }

  function saveMuted() {
    try { localStorage.setItem(STORE_KEY, muted ? '1' : '0'); } catch (e) {}
  }

  // Mulai pada interaksi pertama (kecuali sudah dimatikan)
  function firstInteraction(e) {
    if (e.target && e.target.closest && e.target.closest('.btn-sound')) return;
    document.removeEventListener('pointerdown', firstInteraction, true);
    document.removeEventListener('keydown', firstInteraction, true);
    if (!muted) play();
  }
  document.addEventListener('pointerdown', firstInteraction, true);
  document.addEventListener('keydown', firstInteraction, true);

  btn.addEventListener('click', function () {
    document.removeEventListener('pointerdown', firstInteraction, true);
    document.removeEventListener('keydown', firstInteraction, true);
    muted = !muted;
    saveMuted();
    if (muted) { audio.pause(); } else { play(); }
    render();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      audio.pause();
    } else if (!muted && audio.currentTime > 0) {
      play();
    }
  });

  // File musik tidak ditemukan -> sembunyikan tombol
  audio.addEventListener('error', function () {
    if (btn.parentNode) btn.parentNode.removeChild(btn);
  });

  render();
})();
