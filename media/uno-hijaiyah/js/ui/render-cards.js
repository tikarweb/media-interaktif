/* =====================================================
   RENDER-CARDS.JS — membuat elemen kartu (tanpa logika permainan).
   ===================================================== */
(function (root, factory) {
  var HP = (root.HarakaPlay = root.HarakaPlay || {});
  HP.renderCards = factory(HP.config, HP.deck);
}(this, function (config, deck) {
  'use strict';

  var T = deck.TYPES;
  var COLOR_ORDER = config.COLORS.map(function (c) { return c.id; });
  var LETTER_ORDER = config.LETTERS.map(function (l) { return l.id; });
  var HARAKA_ORDER = config.HARAKAT.map(function (h) { return h.id; });

  // Huruf + harakat digabung, mis. "بَ"
  function syllableText(letterId, harakaId) {
    return config.letterById[letterId].ch + config.harakaById[harakaId].mark;
  }

  // Cara baca latin, mis. "ba"
  function syllableLatin(letterId, harakaId) {
    return config.letterById[letterId].latin + config.harakaById[harakaId].vowel;
  }

  function cardLabel(card) {
    if (card.type === T.NORMAL) {
      return config.letterById[card.letter].ch + ' ' + config.harakaById[card.haraka].name +
        ', ' + config.colorById[card.color].name;
    }
    if (card.type === T.DRAW1) return 'Ambil 1, ' + config.colorById[card.color].name;
    if (card.type === T.CHANGE_HARAKA) return 'Ganti Harakat, ' + config.colorById[card.color].name;
    return 'Ganti Warna';
  }

  function span(cls, text) {
    var el = document.createElement('span');
    el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // Tiga tanda harakat di atas pembawa putus-putus: ــَ ــِ ــُ
  function marksText() {
    return config.HARAKAT.map(function (h) { return 'ا' + h.mark; }).join(' ');
  }

  // options: { asButton: true (default), static: false, pop: false }
  function createCardEl(card, options) {
    var opts = options || {};
    var el = document.createElement(opts.static ? 'div' : 'button');
    if (!opts.static) el.type = 'button';
    el.className = 'hp-card ' + (card.color ? 'c-' + card.color : 'c-wild');
    if (opts.static) el.className += ' is-static';
    if (opts.pop) el.className += ' pop-in';
    el.dataset.cardId = card.id;
    el.setAttribute('aria-label', cardLabel(card));
    el.title = cardLabel(card);

    var text;
    if (card.type === T.NORMAL) {
      text = syllableText(card.letter, card.haraka);
      el.appendChild(span('idx idx--tl', text));
      el.appendChild(span('glyph', text));
      el.appendChild(span('idx idx--br', text));
    } else if (card.type === T.DRAW1) {
      el.appendChild(span('idx idx--tl idx--plus', '+1'));
      el.appendChild(span('glyph glyph--plus', '+1'));
      el.appendChild(span('idx idx--br idx--plus', '+1'));
    } else if (card.type === T.CHANGE_HARAKA) {
      el.appendChild(span('idx idx--tl', 'اَ'));
      el.appendChild(span('glyph glyph--marks', marksText()));
      el.appendChild(span('idx idx--br', 'اَ'));
    } else {
      el.appendChild(span('idx idx--tl idx--wild'));
      var g = span('glyph');
      g.innerHTML = 'Ganti<br>Warna';
      el.appendChild(g);
      el.appendChild(span('idx idx--br idx--wild'));
    }
    return el;
  }

  function createBackEl() {
    var el = document.createElement('div');
    el.className = 'hp-card is-back is-static';
    var g = span('glyph', 'HarakaPlay');
    el.appendChild(g);
    return el;
  }

  // Urutan tampilan tangan: warna -> huruf -> harakat; kartu tanpa warna di akhir
  function sortHand(hand) {
    function key(c) {
      var colorIdx = c.color ? COLOR_ORDER.indexOf(c.color) : COLOR_ORDER.length;
      var typeIdx = c.type === T.NORMAL ? 0 : (c.type === T.DRAW1 ? 1 : (c.type === T.CHANGE_HARAKA ? 2 : 3));
      var letterIdx = c.letter ? LETTER_ORDER.indexOf(c.letter) : 0;
      var harakaIdx = c.haraka ? HARAKA_ORDER.indexOf(c.haraka) : 0;
      return [colorIdx, typeIdx, letterIdx, harakaIdx];
    }
    return hand.slice().sort(function (a, b) {
      var ka = key(a), kb = key(b);
      for (var i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return 0;
    });
  }

  return {
    createCardEl: createCardEl,
    createBackEl: createBackEl,
    syllableText: syllableText,
    syllableLatin: syllableLatin,
    cardLabel: cardLabel,
    sortHand: sortHand
  };
}));
