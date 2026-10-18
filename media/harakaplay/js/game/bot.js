/* =====================================================
   BOT.JS — pemain komputer untuk mode latihan.

   Bot hanya menerima "view" (hasil getView): tangannya sendiri dan
   informasi publik. Bot TIDAK bisa melihat kartu lawan.

   Prioritas (sesuai spesifikasi):
     1. kartu biasa yang cocok dengan warna aktif
     2. kartu biasa yang cocok dengan harakat aktif
     3. Draw 1 yang sah
     4. Ganti Harakat yang sah
     5. Ganti Warna
   Tidak ada yang sah -> ambil satu kartu. Kalau kartu yang diambil
   sah, bot langsung memainkannya.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'), require('./deck'), require('./rules'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.bot = factory(HP.config, HP.deck, HP.rules);
  }
}(this, function (config, deck, rules) {
  'use strict';

  var T = deck.TYPES;

  // Nilai yang paling sering muncul di tangan (untuk memilih harakat/warna baru)
  function mostCommon(values, fallback) {
    var count = {};
    var best = fallback;
    var bestN = 0;
    values.forEach(function (v) {
      count[v] = (count[v] || 0) + 1;
      if (count[v] > bestN) { bestN = count[v]; best = v; }
    });
    return best;
  }

  function pickChoice(card, hand, levelId) {
    var others = hand.filter(function (c) { return c.id !== card.id; });
    if (card.type === T.CHANGE_HARAKA) {
      return mostCommon(
        others.filter(function (c) { return c.type === T.NORMAL; }).map(function (c) { return c.haraka; }),
        config.getLevel(levelId).harakat[0]
      );
    }
    if (card.type === T.CHANGE_COLOR) {
      return mostCommon(
        others.filter(function (c) { return c.color; }).map(function (c) { return c.color; }),
        config.COLORS[0].id
      );
    }
    return undefined;
  }

  function playAction(view, card) {
    var action = { type: 'play', playerId: view.me.id, cardId: card.id };
    var choice = pickChoice(card, view.me.hand, view.level);
    if (choice !== undefined) action.choice = choice;
    return action;
  }

  function chooseAction(view) {
    var hand = view.me.hand;

    // Baru mengambil kartu yang sah: langsung mainkan
    if (view.drawnCardId) {
      var drawn = hand.filter(function (c) { return c.id === view.drawnCardId; })[0];
      if (drawn) return playAction(view, drawn);
      return { type: 'pass', playerId: view.me.id };
    }

    function playable(c) { return rules.isPlayable(c, view.activeColor, view.activeHaraka); }
    function first(pred) { return hand.filter(function (c) { return playable(c) && pred(c); })[0]; }

    var pick =
      first(function (c) { return c.type === T.NORMAL && c.color === view.activeColor; }) ||
      first(function (c) { return c.type === T.NORMAL && c.haraka === view.activeHaraka; }) ||
      first(function (c) { return c.type === T.DRAW1; }) ||
      first(function (c) { return c.type === T.CHANGE_HARAKA; }) ||
      first(function (c) { return c.type === T.CHANGE_COLOR; });

    if (pick) return playAction(view, pick);
    return { type: 'draw', playerId: view.me.id };
  }

  return { chooseAction: chooseAction };
}));
