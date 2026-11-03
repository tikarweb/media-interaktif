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
    if (card.type === T.NORMAL && card.word) {
      return config.vocabById[card.word].arab + ', ' + config.colorById[card.color].name;
    }
    if (card.type === T.NORMAL) {
      return config.letterById[card.letter].ch + ' ' + config.harakaById[card.haraka].name +
        ', ' + config.colorById[card.color].name;
    }
    if (card.type === T.DRAW1) return 'Ambil 1, ' + config.colorById[card.color].name;
    if (card.type === T.CHANGE_HARAKA) return 'Ganti Harakat/Pola, ' + config.colorById[card.color].name;
    return 'Ganti Warna';
  }

  // Kartu Ganti Harakat di tema Syadid = "Ganti Pola" (level berisi kosakata)
  function isSyadid(card, levelId) {
    var lv = config.levelById[levelId];
    return !!(lv && lv.vocab);
  }

  function span(cls, text) {
    var el = document.createElement('span');
    el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // Tiga tanda harakat di atas pembawa putus-putus: ــَ ــِ ــُ
  function marksText(levelId) {
    return config.getLevel(levelId).harakat.map(function (id) { return config.harakaById[id]; }).map(function (h) { return 'ا' + h.mark; }).join(' ');
  }

  // options: { static: false, pop: false, level: 'l1' }
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
    if (card.type === T.NORMAL && card.word) {
      // Syadid: satu kata gundul. Ukuran huruf mengecil untuk kata panjang.
      var v = config.vocabById[card.word];
      var len = v.arab.length;
      text = v.arab;
      var g0 = span('glyph glyph--word' + (len >= 6 ? ' is-long' : (len >= 5 ? ' is-mid' : '')), text);
      el.appendChild(g0);
      var tag = span('pola-tag', config.polaById[card.haraka].nama);    // petunjuk, tampil bila tombol Petunjuk dinyalakan
      el.appendChild(tag);
    } else if (card.type === T.NORMAL) {
      text = syllableText(card.letter, card.haraka);
      el.appendChild(span('idx idx--tl', text));
      el.appendChild(span('glyph', text));
      el.appendChild(span('idx idx--br', text));
    } else if (card.type === T.DRAW1) {
      el.appendChild(span('idx idx--tl idx--plus', '+1'));
      el.appendChild(span('glyph glyph--plus', '+1'));
      el.appendChild(span('idx idx--br idx--plus', '+1'));
    } else if (card.type === T.CHANGE_HARAKA) {
      var syadidLv = isSyadid(card, opts.level);
      el.appendChild(span('idx idx--tl' + (syadidLv ? ' idx--small' : ''), syadidLv ? 'وَزْن' : 'اَ'));
      if (syadidLv) {
        var gp = span('glyph glyph--wild-text');
        gp.innerHTML = 'Ganti<br>Pola';
        el.appendChild(gp);
      } else {
        el.appendChild(span('glyph glyph--marks', marksText(opts.level)));
      }
      el.appendChild(span('idx idx--br' + (syadidLv ? ' idx--small' : ''), syadidLv ? 'وَزْن' : 'اَ'));
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
      if (c.word) {                      // Syadid: urut per pola, lalu per kata
        harakaIdx = config.POLAS.map(function (p) { return p.id; }).indexOf(c.haraka);
        letterIdx = config.VOCAB.map(function (v) { return v.id; }).indexOf(c.word);
      }
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
