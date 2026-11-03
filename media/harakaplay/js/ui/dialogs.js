/* =====================================================
   DIALOGS.JS — pemberitahuan singkat (toast), jendela pilihan,
   dan panel aturan. Tidak menyentuh status permainan.
   ===================================================== */
(function (root, factory) {
  var HP = (root.HarakaPlay = root.HarakaPlay || {});
  HP.dialogs = factory(HP.config);
}(this, function (config) {
  'use strict';

  /* ---------- Toast: singkat, tidak menutupi layar, tidak menghalangi klik ---------- */
  var toastTimer = null;
  function toast(message, kind) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'hp-toast is-show' + (kind ? ' is-' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'hp-toast'; }, 2200);
  }

  /* ---------- Modal ---------- */
  var openCount = 0;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('has-modal');
    openCount++;
    var focusEl = m.querySelector('[data-autofocus]') || m.querySelector('button');
    if (focusEl) focusEl.focus();
  }
  function closeModal(id) {
    var m = document.getElementById(id);
    if (!m || m.hidden) return;
    m.hidden = true;
    openCount = Math.max(0, openCount - 1);
    if (!openCount) document.body.classList.remove('has-modal');
  }

  // Tombol/area dengan data-close="idModal" menutup modal
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-close]') : null;
    if (t) closeModal(t.getAttribute('data-close'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelectorAll('.hp-modal:not([hidden])');
    if (open.length) closeModal(open[open.length - 1].id);
  });

  /* ---------- Pilihan harakat / warna (mengembalikan Promise, null kalau dibatalkan) ---------- */
  function choose(modalId, listId, items, build) {
    return new Promise(function (resolve) {
      var list = document.getElementById(listId);
      list.innerHTML = '';
      var done = false;
      function finish(value) {
        if (done) return;
        done = true;
        closeModal(modalId);
        resolve(value);
      }
      items.forEach(function (item) {
        var b = build(item);
        b.addEventListener('click', function () { finish(item.id); });
        list.appendChild(b);
      });
      var cancel = document.getElementById(modalId).querySelector('[data-cancel]');
      cancel.onclick = function () { finish(null); };
      var modal = document.getElementById(modalId);
      modal.onkeydown = function (e) { if (e.key === 'Escape') finish(null); };
      openModal(modalId);
    });
  }

  function chooseHaraka(levelId) {
    var level = config.getLevel(levelId);
    var pola = !!level.vocab;     // Syadid: yang dipilih adalah POLA kata
    var list = level.harakat.map(function (id) { return pola ? config.polaById[id] : config.harakaById[id]; });
    document.getElementById('haraka-title').textContent = pola ? 'Pilih pola kata' : 'Pilih harakat';
    return choose('modal-haraka', 'haraka-options', list, function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hp-choice' + (pola ? ' hp-choice--pola' : '');
      b.innerHTML = '<span class="hp-choice__mark"></span><span class="hp-choice__name"></span>';
      b.querySelector('.hp-choice__mark').textContent = pola ? h.ar : 'ا' + h.mark;
      b.querySelector('.hp-choice__name').textContent = pola ? h.nama : h.name;
      return b;
    });
  }

  /* ---------- Kuis arti (Haraka Syadid) ----------
     Menampilkan kata gundul + 3 pilihan arti. Mengembalikan Promise:
     id kata yang dipilih, atau null bila pemain menekan "Lewati". Setelah memilih,
     jawaban benar disorot hijau (salah = merah) dan bentuk berharakat ditampilkan
     sebentar sebelum jendela menutup. */
  function askQuiz(wordId, levelId) {
    return new Promise(function (resolve) {
      var HPns = window.HarakaPlay;
      var v = config.vocabById[wordId];
      var opts = HPns.rules.quizOptions(wordId, levelId);
      var box = document.getElementById('quiz-options');
      var skip = document.getElementById('quiz-skip');
      var done = false;
      document.getElementById('quiz-word').textContent = v.arab;
      document.getElementById('quiz-voc').textContent = '';
      document.getElementById('quiz-voc').hidden = true;
      box.innerHTML = '';
      function finish(value) {
        if (done) return;
        done = true;
        closeModal('modal-quiz');
        resolve(value);
      }
      opts.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hp-choice hp-choice--quiz';
        b.textContent = o.arti;
        b.addEventListener('click', function () {
          if (done || box.getAttribute('data-locked')) return;
          box.setAttribute('data-locked', '1');
          Array.prototype.forEach.call(box.children, function (c, i) {
            c.disabled = true;
            if (opts[i].id === wordId) c.className += ' is-right';
          });
          if (o.id !== wordId) b.className += ' is-wrong';
          var voc = document.getElementById('quiz-voc');
          voc.textContent = v.voc + '  =  ' + v.arti;
          voc.hidden = false;
          skip.hidden = true;
          if (HPns.pronounce) HPns.pronounce.playWord(wordId);
          setTimeout(function () { finish(o.id); }, o.id === wordId ? 1100 : 1700);
        });
        box.appendChild(b);
      });
      box.removeAttribute('data-locked');
      skip.hidden = false;
      skip.onclick = function () { finish(null); };
      var modal = document.getElementById('modal-quiz');
      modal.onkeydown = function (e) { if (e.key === 'Escape' && !box.getAttribute('data-locked')) finish(null); };
      openModal('modal-quiz');
    });
  }

  function chooseColor() {
    return choose('modal-color', 'color-options', config.COLORS, function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hp-choice hp-choice--color c-' + c.id;
      b.style.setProperty('--swatch', c.hex);
      b.innerHTML = '<span class="hp-choice__swatch"></span><span class="hp-choice__name"></span>';
      b.querySelector('.hp-choice__name').textContent = c.name;
      return b;
    });
  }

  /* ---------- Konfirmasi (Ya / Batal) ---------- */
  function confirmDialog(title, text, yesLabel) {
    return new Promise(function (resolve) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-text').textContent = text;
      var yes = document.getElementById('confirm-yes');
      var no = document.getElementById('confirm-no');
      yes.textContent = yesLabel || 'Ya';
      function finish(v) {
        closeModal('modal-confirm');
        yes.onclick = no.onclick = null;
        resolve(v);
      }
      yes.onclick = function () { finish(true); };
      no.onclick = function () { finish(false); };
      openModal('modal-confirm');
    });
  }

  return {
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    chooseHaraka: chooseHaraka,
    askQuiz: askQuiz,
    chooseColor: chooseColor,
    confirmDialog: confirmDialog
  };
}));
