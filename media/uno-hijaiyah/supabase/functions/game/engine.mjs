// FILE HASIL BUILD — jangan diedit. Sumber: js/config.js dan js/game/*.js
// Bangun ulang dengan: node scripts/build-engine.js
const REG = {};
REG["config"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   CONFIG.JS — satu-satunya tempat data dasar permainan.
   Dipakai bersama oleh mesin permainan, bot, dan tampilan.

   Semua file js/ memakai pola "UMD": bisa dibuka langsung dari
   file:// (klik dua kali index.html) DAN dijalankan di Node untuk
   pengujian otomatis. Tidak memakai import/export, karena browser
   memblokir modul ES kalau halaman dibuka lewat file://.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.config = factory();
  }
}(this, function () {
  'use strict';

  // Urutan warna juga dipakai untuk mengurutkan kartu di tangan
  var COLORS = [
    { id: 'red',    name: 'Merah',  hex: '#e8202a' },
    { id: 'yellow', name: 'Kuning', hex: '#ffd400' },
    { id: 'green',  name: 'Hijau',  hex: '#1aa84f' },
    { id: 'blue',   name: 'Biru',   hex: '#1d6fd1' }
  ];

  // Harakat (Unicode: fathah U+064E, kasrah U+0650, dammah U+064F)
  var HARAKAT = [
    { id: 'fathah', mark: 'َ', name: 'Fathah', vowel: 'a' },
    { id: 'kasrah', mark: 'ِ', name: 'Kasrah', vowel: 'i' },
    { id: 'dammah', mark: 'ُ', name: 'Dammah', vowel: 'u' }
  ];

  // Huruf hijaiyah di dalam permainan. Untuk menambah huruf, tambahkan baris
  // baru di sini — jumlah kartu menyesuaikan otomatis (huruf x 3 harakat x 4 warna).
  // Catatan: spesifikasi awal memakai 5 huruf (total 72 kartu).
  var LETTERS = [
    { id: 'ba',  ch: 'ب', latin: 'b'  },   // ب
    { id: 'ta',  ch: 'ت', latin: 't'  },   // ت
    { id: 'tsa', ch: 'ث', latin: 'ts' },   // ث
    { id: 'jim', ch: 'ج', latin: 'j'  },   // ج
    { id: 'ha',  ch: 'ح', latin: 'h'  }    // ح
  ];

  var CONFIG = {
    COLORS: COLORS,
    HARAKAT: HARAKAT,
    LETTERS: LETTERS,
    WILD_COUNT: 4,          // jumlah kartu Ganti Warna
    HAND_SIZE: 7,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 4,
    POINTS: { normal: 1, special: 10 }
  };

  function byId(list) {
    var map = {};
    list.forEach(function (x) { map[x.id] = x; });
    return map;
  }
  CONFIG.colorById = byId(COLORS);
  CONFIG.harakaById = byId(HARAKAT);
  CONFIG.letterById = byId(LETTERS);

  return CONFIG;
}));

  }).call({});
  return module.exports;
})();
REG["deck"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   DECK.JS — komposisi kartu, pengocokan, nilai kartu.
   Spesifikasi awal:
     60 kartu biasa  = 5 huruf x 3 harakat x 4 warna
     4 Draw 1        (satu per warna)
     4 Ganti Harakat (satu per warna)
     4 Ganti Warna   (tanpa warna / wild)
     total 72 kartu
   Tidak ada hubungan dengan tampilan (DOM).
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.deck = factory(HP.config);
  }
}(this, function (config) {
  'use strict';

  var TYPES = {
    NORMAL: 'normal',
    DRAW1: 'draw1',
    CHANGE_HARAKA: 'changeHaraka',
    CHANGE_COLOR: 'changeColor'
  };

  // Setiap kartu: id unik, jenis, warna, dan (untuk kartu biasa) huruf + harakat
  function createDeck() {
    var cards = [];
    config.COLORS.forEach(function (color) {
      config.LETTERS.forEach(function (letter) {
        config.HARAKAT.forEach(function (h) {
          cards.push({
            id: 'n-' + color.id + '-' + letter.id + '-' + h.id,
            type: TYPES.NORMAL,
            color: color.id,
            letter: letter.id,
            haraka: h.id
          });
        });
      });
    });
    config.COLORS.forEach(function (color) {
      cards.push({ id: 'd1-' + color.id, type: TYPES.DRAW1, color: color.id });
    });
    config.COLORS.forEach(function (color) {
      cards.push({ id: 'ch-' + color.id, type: TYPES.CHANGE_HARAKA, color: color.id });
    });
    for (var i = 1; i <= config.WILD_COUNT; i++) {
      cards.push({ id: 'cc-' + i, type: TYPES.CHANGE_COLOR, color: null });
    }
    return cards;
  }

  // Fisher-Yates; mengembalikan array baru. rng() harus menghasilkan [0, 1).
  function shuffle(list, rng) {
    var random = rng || Math.random;
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Pengacak yang bisa diulang (untuk pengujian dan simulasi)
  function seededRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    TYPES: TYPES,
    createDeck: createDeck,
    shuffle: shuffle,
    seededRng: seededRng
  };
}));

  }).call({});
  return module.exports;
})();
REG["turn-manager"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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

  }).call({});
  return module.exports;
})();
REG["scoring"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
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

  }).call({});
  return module.exports;
})();
REG["rules"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   RULES.JS — aturan kecocokan kartu dan pilihan.
   Hanya fungsi murni (tanpa DOM, tanpa state global), sehingga
   mode bot dan multiplayer nanti memakai aturan yang SAMA.

   Asumsi yang didokumentasikan:
   - Kartu Draw 1 dan Ganti Harakat punya warna tetapi tidak punya
     harakat, jadi hanya bisa dicocokkan lewat WARNA aktif.
   - Ganti Warna (wild) bisa dimainkan kapan saja.
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../config'), require('./deck'));
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.rules = factory(HP.config, HP.deck);
  }
}(this, function (config, deck) {
  'use strict';

  var T = deck.TYPES;

  // Apakah kartu sah dimainkan di atas warna & harakat aktif?
  // Huruf yang sama saja TIDAK cukup.
  function isPlayable(card, activeColor, activeHaraka) {
    if (card.type === T.CHANGE_COLOR) return true;
    if (card.type === T.NORMAL) {
      return card.color === activeColor || card.haraka === activeHaraka;
    }
    // Draw 1 dan Ganti Harakat: cocok lewat warna
    return card.color === activeColor;
  }

  // Jenis pilihan yang harus dibuat pemain setelah memainkan kartu
  function needsChoice(card) {
    if (card.type === T.CHANGE_HARAKA) return 'haraka';
    if (card.type === T.CHANGE_COLOR) return 'color';
    return null;
  }

  function isValidChoice(kind, value) {
    if (kind === 'haraka') return !!config.harakaById[value];
    if (kind === 'color') return !!config.colorById[value];
    return false;
  }

  return { isPlayable: isPlayable, needsChoice: needsChoice, isValidChoice: isValidChoice };
}));

  }).call({});
  return module.exports;
})();
REG["game-state"] = (function () {
  const module = { exports: {} };
  const require = (p) => REG[p.split('/').pop()];
  (function () {
/* =====================================================
   GAME-STATE.JS — mesin permainan (sumber kebenaran).

   Fungsi murni: applyAction(state, action) TIDAK mengubah state
   masukan; ia mengembalikan state baru. Jika aksi ditolak, state
   tidak berubah sama sekali.

   Mode bot memakai file ini langsung di browser. Untuk multiplayer
   (tahap 4), file yang sama dijalankan di server (Supabase Edge
   Function) sehingga aturannya identik dan klien tidak dipercaya.

   Bentuk aksi:
     { type: 'play', playerId, cardId, choice?, expectedVersion? }
     { type: 'draw', playerId, expectedVersion? }
     { type: 'pass', playerId, expectedVersion? }   // setelah mengambil kartu
   `choice` = id harakat (Ganti Harakat) atau id warna (Ganti Warna).
   `expectedVersion` melindungi dari dua aksi bersamaan: aksi kedua
   yang membawa versi lama ditolak ('stale_state').

   Hasil: { ok, state, events, code?, message?, needs? }
   ===================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('../config'), require('./deck'), require('./rules'),
      require('./scoring'), require('./turn-manager')
    );
  } else {
    var HP = (root.HarakaPlay = root.HarakaPlay || {});
    HP.gameState = factory(HP.config, HP.deck, HP.rules, HP.scoring, HP.turnManager);
  }
}(this, function (config, deck, rules, scoring, turns) {
  'use strict';

  var T = deck.TYPES;

  var MESSAGES = {
    game_over: 'Ronde ini sudah selesai.',
    stale_state: 'Status permainan sudah berubah. Coba lagi.',
    unknown_player: 'Pemain tidak dikenal.',
    unknown_action: 'Aksi tidak dikenal.',
    not_your_turn: 'Belum giliranmu.',
    card_not_in_hand: 'Kartu itu tidak ada di tanganmu.',
    must_play_drawn: 'Setelah mengambil kartu, hanya kartu yang baru diambil yang boleh dimainkan. Atau pilih Lewati.',
    card_not_playable: 'Kartu ini belum cocok dengan warna atau harakat aktif.',
    need_choice: 'Pilih dulu harakat atau warna barunya.',
    invalid_choice: 'Pilihan itu tidak valid.',
    already_drawn: 'Kamu sudah mengambil kartu di giliran ini.',
    cannot_pass: 'Kamu hanya bisa melewati giliran setelah mengambil kartu.'
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function reject(state, code, extra) {
    var r = { ok: false, code: code, message: MESSAGES[code] || code, state: state, events: [] };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  /* ---------- Membuat ronde baru ---------- */
  // opts: { players: [{id, name, isBot}], rng?, scores?, round? }
  function createGame(opts) {
    var rng = opts.rng || Math.random;
    var list = opts.players || [];
    if (list.length < config.MIN_PLAYERS || list.length > config.MAX_PLAYERS) {
      throw new Error('Jumlah pemain harus ' + config.MIN_PLAYERS + '-' + config.MAX_PLAYERS);
    }
    var ids = {};
    list.forEach(function (p) {
      if (ids[p.id]) throw new Error('ID pemain harus unik: ' + p.id);
      ids[p.id] = true;
    });

    // Urutan pemain diacak
    var players = deck.shuffle(list, rng).map(function (p) {
      return { id: p.id, name: p.name, isBot: !!p.isBot, hand: [] };
    });

    var pile = deck.shuffle(deck.createDeck(), rng);

    // Bagikan kartu
    for (var i = 0; i < config.HAND_SIZE; i++) {
      players.forEach(function (p) { p.hand.push(pile.pop()); });
    }

    // Kartu pembuka harus kartu biasa; kartu spesial dikembalikan ke tumpukan
    var skipped = [];
    var start = null;
    while (pile.length) {
      var c = pile.pop();
      if (c.type === T.NORMAL) { start = c; break; }
      skipped.push(c);
    }
    pile = deck.shuffle(pile.concat(skipped), rng);

    var scores = {};
    players.forEach(function (p) {
      scores[p.id] = (opts.scores && opts.scores[p.id]) || 0;
    });

    return {
      version: 0,
      round: opts.round || 1,
      phase: 'playing',
      players: players,
      drawPile: pile,            // kartu teratas = elemen terakhir
      discardPile: [start],      // kartu teratas = elemen terakhir
      turn: 0,
      activeColor: start.color,
      activeHaraka: start.haraka,
      drawnCardId: null,         // kartu yang baru diambil dan boleh langsung dimainkan
      winnerId: null,
      roundScore: 0,
      scores: scores
    };
  }

  /* ---------- Bantuan ---------- */
  function playerIndex(state, playerId) {
    for (var i = 0; i < state.players.length; i++) {
      if (state.players[i].id === playerId) return i;
    }
    return -1;
  }

  // Tumpukan ambil habis -> kocok tumpukan buang selain kartu teratas
  function refillDrawPile(s, rng) {
    if (s.drawPile.length === 0 && s.discardPile.length > 1) {
      var top = s.discardPile.pop();
      s.drawPile = deck.shuffle(s.discardPile, rng);
      s.discardPile = [top];
    }
  }

  // Ambil satu kartu; null kalau benar-benar tidak ada kartu tersisa
  function drawOne(s, rng) {
    refillDrawPile(s, rng);
    return s.drawPile.length ? s.drawPile.pop() : null;
  }

  function currentPlayer(state) { return state.players[state.turn]; }

  /* ---------- Menerapkan aksi ---------- */
  function applyAction(state, action, options) {
    var rng = (options && options.rng) || Math.random;

    if (!action || !action.type) return reject(state, 'unknown_action');
    if (state.phase !== 'playing') return reject(state, 'game_over');
    if (action.expectedVersion !== undefined && action.expectedVersion !== state.version) {
      return reject(state, 'stale_state');
    }

    var idx = playerIndex(state, action.playerId);
    if (idx < 0) return reject(state, 'unknown_player');
    if (idx !== state.turn) return reject(state, 'not_your_turn');

    if (action.type === 'play') return doPlay(state, action, idx, rng);
    if (action.type === 'draw') return doDraw(state, idx, rng);
    if (action.type === 'pass') return doPass(state, idx);
    return reject(state, 'unknown_action');
  }

  function doPlay(state, action, idx, rng) {
    var me = state.players[idx];
    var handPos = -1;
    for (var i = 0; i < me.hand.length; i++) {
      if (me.hand[i].id === action.cardId) { handPos = i; break; }
    }
    if (handPos < 0) return reject(state, 'card_not_in_hand');
    var card = me.hand[handPos];

    if (state.drawnCardId && state.drawnCardId !== card.id) {
      return reject(state, 'must_play_drawn');
    }
    if (!rules.isPlayable(card, state.activeColor, state.activeHaraka)) {
      return reject(state, 'card_not_playable');
    }

    // Pilihan harakat / warna (tidak perlu kalau ini kartu terakhir -> langsung menang)
    var kind = rules.needsChoice(card);
    var isLastCard = me.hand.length === 1;
    if (kind && !isLastCard) {
      if (action.choice === undefined || action.choice === null) {
        return reject(state, 'need_choice', { needs: kind });
      }
      if (!rules.isValidChoice(kind, action.choice)) {
        return reject(state, 'invalid_choice', { needs: kind });
      }
    }

    // --- Aksi sah: mulai mengubah salinan ---
    var s = clone(state);
    var p = s.players[idx];
    var played = p.hand.splice(handPos, 1)[0];
    s.discardPile.push(played);
    s.drawnCardId = null;
    var events = [{ type: 'play', playerId: p.id, card: played, choice: action.choice || null }];

    // Warna & harakat aktif
    if (played.type === T.NORMAL) {
      s.activeColor = played.color;
      s.activeHaraka = played.haraka;
    } else if (played.type === T.DRAW1) {
      s.activeColor = played.color;
    } else if (played.type === T.CHANGE_HARAKA) {
      s.activeColor = played.color;
      if (action.choice) s.activeHaraka = action.choice;
    } else if (played.type === T.CHANGE_COLOR) {
      if (action.choice) s.activeColor = action.choice;
    }

    // Kemenangan: tangan benar-benar kosong
    if (p.hand.length === 0) {
      s.phase = 'finished';
      s.winnerId = p.id;
      s.roundScore = scoring.roundScore(s.players, p.id);
      s.scores[p.id] = (s.scores[p.id] || 0) + s.roundScore;
      s.version = state.version + 1;
      events.push({ type: 'win', playerId: p.id, roundScore: s.roundScore });
      return { ok: true, state: s, events: events };
    }

    // Efek giliran
    var n = s.players.length;
    if (played.type === T.DRAW1) {
      var victimIdx = turns.nextIndex(n, idx, 1);
      var victim = s.players[victimIdx];
      var penalty = drawOne(s, rng);
      if (penalty) victim.hand.push(penalty);
      events.push({ type: 'penalty', playerId: victim.id, gotCard: !!penalty });
      events.push({ type: 'skip', playerId: victim.id });
      s.turn = turns.nextIndex(n, idx, 2);   // korban kehilangan giliran
    } else {
      s.turn = turns.nextIndex(n, idx, 1);
    }

    s.version = state.version + 1;
    return { ok: true, state: s, events: events };
  }

  function doDraw(state, idx, rng) {
    if (state.drawnCardId) return reject(state, 'already_drawn');

    var s = clone(state);
    var p = s.players[idx];
    var card = drawOne(s, rng);
    var events = [];
    var n = s.players.length;

    if (!card) {
      // Tidak ada kartu yang bisa diambil: giliran berakhir
      events.push({ type: 'draw', playerId: p.id, noCards: true });
      s.turn = turns.nextIndex(n, idx, 1);
    } else {
      p.hand.push(card);
      events.push({ type: 'draw', playerId: p.id, card: card });
      if (rules.isPlayable(card, s.activeColor, s.activeHaraka)) {
        s.drawnCardId = card.id;           // boleh langsung dimainkan; giliran belum berpindah
      } else {
        s.turn = turns.nextIndex(n, idx, 1);
      }
    }

    s.version = state.version + 1;
    return { ok: true, state: s, events: events };
  }

  function doPass(state, idx) {
    if (!state.drawnCardId) return reject(state, 'cannot_pass');
    var s = clone(state);
    s.drawnCardId = null;
    s.turn = turns.nextIndex(s.players.length, idx, 1);
    s.version = state.version + 1;
    return { ok: true, state: s, events: [{ type: 'pass', playerId: s.players[idx].id }] };
  }

  /* ---------- Tampilan untuk satu pemain (tanpa kartu tersembunyi) ---------- */
  function getView(state, playerId) {
    var meIdx = playerIndex(state, playerId);
    var me = meIdx >= 0 ? state.players[meIdx] : null;
    return {
      version: state.version,
      round: state.round,
      phase: state.phase,
      me: me ? { id: me.id, name: me.name, hand: me.hand.slice() } : null,
      players: state.players.map(function (p) {
        return { id: p.id, name: p.name, isBot: p.isBot, handCount: p.hand.length };
      }),
      turnPlayerId: state.players[state.turn].id,
      drawCount: state.drawPile.length,
      topCard: state.discardPile[state.discardPile.length - 1],
      discardCount: state.discardPile.length,
      activeColor: state.activeColor,
      activeHaraka: state.activeHaraka,
      drawnCardId: me && state.players[state.turn].id === me.id ? state.drawnCardId : null,
      winnerId: state.winnerId,
      roundScore: state.roundScore,
      scores: Object.assign({}, state.scores)
    };
  }

  return {
    MESSAGES: MESSAGES,
    createGame: createGame,
    applyAction: applyAction,
    getView: getView,
    currentPlayer: currentPlayer,
    playerIndex: playerIndex
  };
}));

  }).call({});
  return module.exports;
})();
export const config = REG["config"];
export const deck = REG["deck"];
export const gameState = REG["game-state"];
