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
