/* =====================================================
   SCORING.JS — nilai kartu dan skor ronde.
   Kartu biasa 1 poin; Draw 1, Ganti Harakat, Ganti Warna 10 poin.
   Skor ronde pemenang = jumlah nilai kartu yang tersisa di tangan
   semua lawan. Pemain lain tidak mendapat poin.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'), require('./deck'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.scoring = factory(HP.config, HP.deck);
  }
}(this, function (config, deck) {
  'use strict';

  function cardValue(card) {
    return card.type === deck.TYPES.NORMAL ? config.POINTS.normal : config.POINTS.special;
  }

  function handValue(hand) {
    return hand.reduce(function (sum, c) { return sum + cardValue(c); }, 0);
  }

  // players: [{id, hand}] — pemenang dikecualikan
  function roundScore(players, winnerId) {
    return players.reduce(function (sum, p) {
      return p.id === winnerId ? sum : sum + handValue(p.hand);
    }, 0);
  }

  return { cardValue: cardValue, handValue: handValue, roundScore: roundScore };
}));
