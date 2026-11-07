/* =====================================================
   APP.JS — tampilan & kontrol "Ubin Titik".
   Aturan permainan ada di engine.js; isi tema ada di data.js.
   ===================================================== */
(function () {
  'use strict';
  var E = window.UbinEngine, D = window.UbinData;
  var $ = function (id) { return document.getElementById(id); };
  var RATIO = 1.2;          // tinggi ubin : lebar ubin
  var MIN_TILE = 44;        // lebar ubin minimal (px) supaya nyaman disentuh
  var MAX_CW = 54;          // batas ukuran di layar besar
  var AUDIO_BASE = '../harakaplay/audio/kata/';   // audio kata Syadid (kalau sudah direkam)

  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }

  /* ---------- penyimpanan ringan (aman jika diblokir) ---------- */
  var store = {
    get: function (k, def) { try { var v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  };
  var progress = store.get('ubin-progress', {});   // { packId: { sizeId: {stars, time} } }
  function bestOf(packId, sizeId) { return (progress[packId] && progress[packId][sizeId]) || null; }
  function packStars(packId) {
    var s = 0, o = progress[packId] || {};
    Object.keys(o).forEach(function (k) { s += o[k].stars || 0; });
    return s;
  }

  /* ---------- suara (dibuat dengan kode, tanpa berkas) ---------- */
  var Snd = (function () {
    var ctx = null, on = store.get('ubin-sound', true);
    function ac() {
      if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, t0, dur, type, vol) {
      var c = ac(); if (!c || !on) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = f;
      var t = c.currentTime + (t0 || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      isOn: function () { return on; },
      toggle: function () { on = !on; store.set('ubin-sound', on); return on; },
      select: function () { tone(660, 0, 0.08, 'triangle', 0.1); },
      good: function () { tone(660, 0, 0.12, 'triangle'); tone(990, 0.09, 0.18, 'triangle'); },
      bad: function () { tone(170, 0, 0.2, 'sawtooth', 0.07); },
      lock: function () { tone(240, 0, 0.07, 'square', 0.05); },
      win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.3, 'triangle', 0.13); }); }
    };
  })();
  function paintSoundBtns() {
    ['soundBtn', 'soundBtn2'].forEach(function (id) { var b = $(id); if (b) b.textContent = Snd.isOn() ? '🔊' : '🔇'; });
  }

  /* ---------- warna ---------- */
  function lum(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  /* ---------- tampilan: menu ---------- */
  var viewMenu = $('viewMenu'), viewGame = $('viewGame');
  var currentPack = null, currentSize = null;

  function starsText(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }

  function buildMenu() {
    var host = $('levels'); host.innerHTML = '';
    D.TINGKAT.forEach(function (lv) {
      var sec = el('section', 'lv');
      var head = el('div', 'lv__head');
      head.appendChild(el('span', 'lv__no', String(lv.id)));
      head.appendChild(el('h2', '', lv.judul));
      head.appendChild(el('p', '', lv.ket));
      sec.appendChild(head);
      var grid = el('div', 'packs');
      if (lv.soon) {
        var s = el('div', 'pack pack--soon');
        s.appendChild(el('b', '', 'Segera hadir'));
        s.appendChild(el('small', '', 'Tingkat ini sedang disiapkan.'));
        grid.appendChild(s);
      } else {
        D.PACKS.filter(function (p) { return p.tingkat === lv.id; }).forEach(function (p) { grid.appendChild(packCard(p)); });
      }
      sec.appendChild(grid);
      host.appendChild(sec);
    });
  }

  function packCard(p) {
    var b = el('button', 'pack'); b.type = 'button';
    b.style.setProperty('--pc', p.warna);
    b.style.setProperty('--pt', lum(p.warna) > 0.62 ? '#0b1f3a' : '#fff');
    var isEmoji = /[^؀-ۿ]/.test(p.ikon) && p.ikon.length > 1 || /\p{Extended_Pictographic}/u.test(p.ikon);
    b.appendChild(el('span', 'pack__ic' + (isEmoji ? ' pack__ic--emo' : ''), p.ikon));
    b.appendChild(el('b', '', p.judul));
    b.appendChild(el('small', '', p.ket));
    var st = packStars(p.id);
    if (st) b.appendChild(el('span', 'pack__stars', '★ ' + st));
    if (p.cek) b.appendChild(el('span', 'pack__new', 'Baru'));
    b.addEventListener('click', function () { openSheet(p); });
    return b;
  }

  /* ---------- ukuran papan: muat atau tidak? ---------- */
  function fitCw(layoutId, variant, W, H) {
    var b = E.bounds(E.buildPositions(E.LAYOUTS[layoutId], variant));
    var cw = Math.min(W / (b.w + 0.7), H / ((b.h + 0.7) * RATIO));
    return Math.min(cw, MAX_CW);
  }
  function bestVariant(layoutId, W, H) {
    var land = fitCw(layoutId, 'landscape', W, H), port = fitCw(layoutId, 'portrait', W, H);
    return port > land * 1.02 ? { variant: 'portrait', cw: port } : { variant: 'landscape', cw: land };
  }
  function estimateArea() {
    return { W: Math.min(window.innerWidth, 1040) - 32, H: window.innerHeight - 250 };
  }

  /* ---------- dialog ---------- */
  function openModal(id) { var m = $(id); m.hidden = false; var f = m.querySelector('button:not([data-close]), [data-close]'); if (f) f.focus(); }
  function closeModal(id) { $(id).hidden = true; }
  document.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m || (e.target.hasAttribute && e.target.hasAttribute('data-close'))) { if (m.id !== 'result') m.hidden = true; } });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') ['sheet', 'help'].forEach(function (id) { if (!$(id).hidden) closeModal(id); });
  });

  function openSheet(p) {
    currentPack = p;
    var m = $('sheet');
    m.style.setProperty('--pc', p.warna);
    var ic = $('sheetIcon'); ic.textContent = p.ikon; ic.style.setProperty('--pc', p.warna);
    $('sheetTitle').textContent = p.judul;
    $('sheetKet').textContent = p.ket + ' · ' + p.pairs.length + ' pasang';
    var box = $('sizes'); box.innerHTML = '';
    var area = estimateArea(), anySmall = false;
    E.LAYOUT_ORDER.forEach(function (id) {
      var L = E.LAYOUTS[id];
      var enough = p.pairs.length >= L.pasang;
      var fit = bestVariant(id, area.W, area.H);
      var tooSmall = enough && 2 * fit.cw < MIN_TILE;
      var btn = el('button', 'size'); btn.type = 'button';
      btn.appendChild(el('b', '', L.nama + ' · ' + L.pasang + ' pasang'));
      var note = L.ket;
      if (!enough) note = 'Butuh ' + L.pasang + ' pasang (tema ini ' + p.pairs.length + ')';
      else if (tooSmall) { note = 'Butuh layar lebih lebar'; anySmall = true; }
      btn.appendChild(el('small', '', note));
      var best = bestOf(p.id, id);
      if (best) btn.appendChild(el('span', 'size__st', starsText(best.stars)));
      btn.disabled = !enough || tooSmall;
      btn.addEventListener('click', function () { closeModal('sheet'); startGame(p, id); });
      box.appendChild(btn);
    });
    $('sheetNote').textContent = anySmall ? 'Putar HP ke samping atau pakai layar yang lebih besar untuk papan besar.' : 'Bintang dihitung dari salah pilih, petunjuk, dan acak ulang.';
    openModal('sheet');
  }

  /* ---------- permainan ---------- */
  var G = null, tileEls = {}, cwNow = 30, timer = null, t0 = 0, elapsed = 0, started = false, finished = false;
  var board = $('board'), wrap = $('boardWrap');

  function showView(name) {
    viewMenu.hidden = name !== 'menu';
    viewGame.hidden = name !== 'game';
    window.scrollTo(0, 0);
  }

  function fmtTime(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function startTimer() {
    if (started) return; started = true; t0 = Date.now();
    timer = setInterval(function () { elapsed = Math.round((Date.now() - t0) / 1000); $('hudTime').textContent = fmtTime(elapsed); }, 500);
  }

  function startGame(pack, layoutId, keepView) {
    currentPack = pack; currentSize = layoutId;
    stopTimer(); started = false; finished = false; elapsed = 0;
    if (!keepView) { showView('game'); try { history.pushState({ g: 1 }, ''); } catch (e) { /* abaikan */ } }
    $('gTitle').textContent = pack.judul;
    $('gSub').textContent = E.LAYOUTS[layoutId].nama + ' · ' + E.LAYOUTS[layoutId].pasang + ' pasang';
    $('hudTime').textContent = '0:00';
    var W = wrap.clientWidth - 8, H = wrap.clientHeight - 8;
    if (W < 50 || H < 50) { var a = estimateArea(); W = a.W; H = a.H; }
    var fit = bestVariant(layoutId, W, H);
    G = E.newGame({ layoutId: layoutId, variant: fit.variant, pairs: pack.pairs });
    board.style.setProperty('--pc', pack.warna);
    board.innerHTML = ''; tileEls = {};
    G.tiles.forEach(function (t) {
      var b = el('button', 'tile'); b.type = 'button'; b.dataset.id = t.id;
      var face = el('span', 'tile__face'); face.appendChild(el('span', 'tile__txt'));
      b.appendChild(face);
      b.addEventListener('click', onTile);
      board.appendChild(b); tileEls[t.id] = b;
    });
    paintTiles(); layoutBoard(); sync(); hud();
    setToast('Ketuk ubin yang ujungnya kosong, lalu cari pasangannya.', '');
    $('shuffleBtn').classList.remove('is-nudge');
    if (!store.get('ubin-help-seen', false)) { store.set('ubin-help-seen', true); openModal('help'); }
  }

  function arBase(txt, tw) {
    var n = Math.max(txt.replace(/[\u064B-\u065F\u0670]/g, '').length, 1);
    return tw * (n === 1 ? 0.6 : 0.42);
  }
  function idBase(txt, tw) { return tw * (txt.length <= 3 ? 0.34 : 0.26); }

  // Perkecil huruf bertahap sampai benar-benar muat di dalam ubin (diukur di layar)
  function fitAll() {
    var tw = 2 * cwNow * 0.92;
    G.tiles.forEach(function (t) {
      var n = tileEls[t.id], s = n.querySelector('.tile__txt'), face = n.firstChild;
      var pr = G.pairs[t.k], txt = t.side === 'a' ? pr.a : pr.b;
      var isA = t.side === 'a';
      var fs = isA ? arBase(txt, tw) : idBase(txt, tw), guard = 0;
      s.style.fontSize = fs.toFixed(1) + 'px';
      function tooBig() {
        var fw = face.clientWidth * 0.9, fh = face.clientHeight * 0.9;
        // teks Arab: diukur dari lebar aslinya (inline-block), karena kelebihan ke kiri tidak terbaca scrollWidth
        if (isA) return s.offsetWidth > fw || s.offsetHeight > fh;
        return s.scrollWidth > face.clientWidth * 0.86 || s.offsetHeight > fh * 0.95;
      }
      while (guard++ < 24 && fs > 8 && tooBig()) { fs *= 0.92; s.style.fontSize = fs.toFixed(1) + 'px'; }
    });
  }

  function paintTiles(flip) {
    G.tiles.forEach(function (t) {
      var b = tileEls[t.id], pr = G.pairs[t.k];
      var txt = t.side === 'a' ? pr.a : pr.b;
      b.classList.toggle('tile--a', t.side === 'a');
      b.classList.toggle('tile--b', t.side === 'b');
      var s = b.querySelector('.tile__txt');
      s.textContent = txt;
      if (t.side === 'a') { s.lang = 'ar'; s.dir = 'rtl'; } else { s.removeAttribute('lang'); s.dir = 'ltr'; }
      b.setAttribute('aria-label', (t.side === 'a' ? 'Ubin Arab ' : 'Ubin arti ') + txt);
      if (flip) { b.classList.remove('is-flip'); void b.offsetWidth; b.classList.add('is-flip'); }
    });
    if (flip) setTimeout(function () { G.tiles.forEach(function (t) { tileEls[t.id].classList.remove('is-flip'); }); }, 600);
  }

  function layoutBoard() {
    if (!G) return;
    var W = wrap.clientWidth - 8, H = wrap.clientHeight - 8;
    var b = G.bounds;
    var cw = Math.min(W / (b.w + 0.7), H / ((b.h + 0.7) * RATIO), MAX_CW);
    cwNow = cw;
    var ch = cw * RATIO, tw = 2 * cw * 0.92, th = 2 * ch * 0.92, lift = tw * 0.06;
    board.style.width = Math.ceil(b.w * cw + tw * 0.2 + b.layers * lift) + 'px';
    board.style.height = Math.ceil(b.h * ch + th * 0.2 + b.layers * lift) + 'px';
    G.tiles.forEach(function (t) {
      var n = tileEls[t.id];
      n.style.setProperty('--tw', tw.toFixed(1) + 'px');
      n.style.width = tw.toFixed(1) + 'px'; n.style.height = th.toFixed(1) + 'px';
      n.style.left = (t.x * cw + b.layers * lift - t.z * lift).toFixed(1) + 'px';
      n.style.top = (t.y * ch + b.layers * lift - t.z * lift).toFixed(1) + 'px';
      n.style.zIndex = String(t.z * 10 + Math.floor(t.y));
    });
    fitAll();
  }

  function sync() {
    var free = {}; E.freeTiles(G).forEach(function (t) { free[t.id] = true; });
    G.tiles.forEach(function (t) {
      var n = tileEls[t.id];
      if (t.removed) { if (!n.classList.contains('is-pop')) n.classList.add('is-gone'); return; }
      n.classList.remove('is-gone', 'is-pop');
      n.classList.toggle('is-free', !!free[t.id]);
      n.classList.toggle('is-locked', !free[t.id]);
      n.classList.toggle('is-sel', G.selected === t.id);
      n.setAttribute('aria-disabled', free[t.id] ? 'false' : 'true');
    });
  }

  function hud() {
    $('hudLeft').textContent = String(E.remaining(G) / 2);
    $('hudMiss').textContent = String(G.stats.mistakes);
    var st = E.stars(G);
    Array.prototype.forEach.call($('hudStars').children, function (s, i) { s.classList.toggle('off', i >= st); });
    $('undoBtn').disabled = !G.history.length || finished;
  }

  var toastTimer = null;
  function setToast(html, kind, hold) {
    var t = $('toast'); t.className = 'toast' + (kind ? ' is-' + kind : '');
    var s = $('toastTxt'); s.innerHTML = html;
    clearTimeout(toastTimer);
    if (kind === 'learn') toastTimer = setTimeout(function () { setToast('Cari pasangan berikutnya…', ''); }, hold || 2600);
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function playWord(k) {
    if (!Snd.isOn() || !currentPack || !currentPack.audio) return;
    try { var a = new Audio(AUDIO_BASE + k + '.mp3'); a.play().catch(function () { /* belum ada audionya */ }); } catch (e) { /* abaikan */ }
  }

  var lockHinted = 0;
  function onTile(e) {
    if (finished) return;
    var id = Number(e.currentTarget.dataset.id);
    startTimer();
    var r = E.pick(G, id);
    var n = tileEls[id];
    if (r.type === 'blocked') {
      Snd.lock(); n.classList.remove('is-shake'); void n.offsetWidth; n.classList.add('is-shake');
      if (lockHinted++ < 3) setToast('Ubin gelap masih terkunci: harus tidak tertimpa dan salah satu sisinya kosong.', 'warn');
      return;
    }
    if (r.type === 'select') { Snd.select(); }
    if (r.type === 'deselect') { /* hanya sinkron */ }
    if (r.type === 'mismatch') {
      Snd.bad();
      r.ids.forEach(function (i) { var x = tileEls[i]; x.classList.add('is-wrong'); x.classList.remove('is-shake'); void x.offsetWidth; x.classList.add('is-shake'); setTimeout(function () { x.classList.remove('is-wrong', 'is-shake'); }, 450); });
      setToast('Belum cocok. Coba lagi!', 'warn');
    }
    if (r.type === 'match') {
      Snd.good();
      r.ids.forEach(function (i) { var x = tileEls[i]; x.classList.add('is-pop'); setTimeout(function () { x.classList.remove('is-pop'); x.classList.add('is-gone'); }, 430); });
      var pr = G.pairs[r.k];
      setToast('<b lang="ar" dir="rtl">' + esc(pr.a) + '</b> = ' + esc(pr.b), 'learn');
      playWord(r.k);
      if (r.won) { finish(); }
      else if (r.stuck) { setTimeout(function () { setToast('Tidak ada pasangan yang bisa diambil. Tekan Acak!', 'warn'); $('shuffleBtn').classList.add('is-nudge'); }, 900); }
    }
    sync(); hud();
  }

  function finish() {
    finished = true; stopTimer();
    if (started) elapsed = Math.round((Date.now() - t0) / 1000);
    var stars = E.stars(G), rev = E.review(G).slice(0, 5);
    var pk = currentPack.id, sz = currentSize;
    progress[pk] = progress[pk] || {};
    var prev = progress[pk][sz];
    if (!prev || stars > prev.stars || (stars === prev.stars && elapsed < prev.time)) progress[pk][sz] = { stars: stars, time: elapsed };
    store.set('ubin-progress', progress);
    setTimeout(function () {
      Snd.win();
      $('resTitle').textContent = stars === 3 ? 'Sempurna! 🎉' : stars === 2 ? 'Bagus sekali!' : 'Selesai!';
      var rs = $('resStars'); rs.innerHTML = '';
      for (var i = 0; i < 3; i++) { var s = el('span', i < stars ? 'on' : '', '★'); s.style.animationDelay = (i * 0.18) + 's'; rs.appendChild(s); }
      var S = G.stats;
      $('resStat').textContent = fmtTime(elapsed) + ' · ' + S.mistakes + ' salah · ' + S.hints + ' petunjuk · ' + S.shuffles + ' acak';
      var rv = $('resReview'); rv.innerHTML = '';
      if (rev.length) {
        rv.appendChild(el('h3', '', 'Yang masih sering keliru, ulangi ya:'));
        var ul = el('ul');
        rev.forEach(function (x) {
          var li = el('li'); var a = el('b', '', x.pair.a); a.lang = 'ar'; a.dir = 'rtl';
          li.appendChild(a); li.appendChild(el('span', '', x.pair.b)); ul.appendChild(li);
        });
        rv.appendChild(ul);
      } else {
        rv.appendChild(el('h3', '', 'Tanpa salah pilih. Mantap! 💪'));
      }
      openModal('result');
    }, 650);
    buildMenu();
  }

  /* ---------- tombol ---------- */
  $('hintBtn').addEventListener('click', function () {
    if (!G || finished) return;
    startTimer();
    var h = E.hint(G);
    if (!h) { setToast('Tidak ada pasangan yang bisa diambil. Tekan Acak!', 'warn'); $('shuffleBtn').classList.add('is-nudge'); return; }
    h.forEach(function (i) { var x = tileEls[i]; x.classList.add('is-hint'); setTimeout(function () { x.classList.remove('is-hint'); }, 2200); });
    setToast('Petunjuk dipakai (bintang bisa berkurang).', '');
    hud();
  });
  $('undoBtn').addEventListener('click', function () {
    if (!G || finished) return;
    var ids = E.undo(G);
    if (ids) { ids.forEach(function (i) { tileEls[i].classList.remove('is-gone', 'is-pop'); }); Snd.select(); setToast('Dibatalkan.', ''); }
    sync(); hud();
  });
  $('shuffleBtn').addEventListener('click', function () {
    if (!G || finished) return;
    startTimer();
    if (E.shuffleBoard(G)) { paintTiles(true); fitAll(); Snd.good(); setToast('Ubin diacak ulang. Papan tetap bisa diselesaikan.', ''); }
    $('shuffleBtn').classList.remove('is-nudge');
    sync(); hud();
  });
  $('backBtn').addEventListener('click', function () { toMenu(true); });
  $('menuBtn').addEventListener('click', function () { closeModal('result'); toMenu(true); });
  $('againBtn').addEventListener('click', function () { closeModal('result'); startGame(currentPack, currentSize, true); });
  $('helpBtn').addEventListener('click', function () { openModal('help'); });
  $('quickBtn').addEventListener('click', function () {
    var p = D.PACKS.find(function (x) { return x.id === 'campur-1'; }) || D.PACKS[0];
    openSheet(p);
  });
  ['soundBtn', 'soundBtn2'].forEach(function (id) { $(id).addEventListener('click', function () { Snd.toggle(); paintSoundBtns(); Snd.select(); }); });

  function toMenu(pop) {
    stopTimer(); G = null; finished = false;
    showView('menu');
    if (pop) { try { if (history.state && history.state.g) history.back(); } catch (e) { /* abaikan */ } }
  }
  window.addEventListener('popstate', function () { if (!viewGame.hidden) toMenu(false); });

  // Font web baru siap beberapa saat setelah halaman terbuka: ukur ulang agar huruf pas
  function refit() { if (G && !viewGame.hidden) fitAll(); }
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(refit);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);
  }

  var rz = null;
  function onResize() { cancelAnimationFrame(rz); rz = requestAnimationFrame(function () { if (G && !viewGame.hidden) layoutBoard(); }); }
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(wrap);

  /* ---------- mulai ---------- */
  paintSoundBtns();
  buildMenu();
})();
