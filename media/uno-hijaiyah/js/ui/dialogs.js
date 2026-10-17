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

  function chooseHaraka() {
    return choose('modal-haraka', 'haraka-options', config.HARAKAT, function (h) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hp-choice';
      b.innerHTML = '<span class="hp-choice__mark"></span><span class="hp-choice__name"></span>';
      b.querySelector('.hp-choice__mark').textContent = 'ا' + h.mark;
      b.querySelector('.hp-choice__name').textContent = h.name;
      return b;
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
    chooseColor: chooseColor,
    confirmDialog: confirmDialog
  };
}));
