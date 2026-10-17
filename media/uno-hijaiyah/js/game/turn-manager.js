/* =====================================================
   TURN-MANAGER.JS — perpindahan giliran.
   Tidak ada kartu pembalik arah, jadi urutan selalu maju.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.turnManager = factory();
  }
}(this, function () {
  'use strict';

  // Indeks pemain setelah maju sejauh `steps` langkah (default 1)
  function nextIndex(playerCount, index, steps) {
    var s = steps === undefined ? 1 : steps;
    return (index + s) % playerCount;
  }

  return { nextIndex: nextIndex };
}));
