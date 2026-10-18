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
     { type: 'waahid', playerId }   // pemain yang kartunya tinggal 1 menekan "وَاحِد !"
     { type: 'catch', playerId }    // lawan menangkap pemain yang lupa menekan Waahid
   (waahid & catch boleh dilakukan di luar giliran, selama jendelanya terbuka)
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
    cannot_pass: 'Kamu hanya bisa melewati giliran setelah mengambil kartu.',
    waahid_not_yet: 'Belum waktunya. Tekan "وَاحِد !" saat kartumu tinggal 1.',
    waahid_late: 'Terlambat. Giliran sudah berlanjut.',
    nothing_to_catch: 'Tidak ada yang bisa ditangkap sekarang.',
    cannot_catch_self: 'Kamu tidak bisa menangkap dirimu sendiri.'
  };

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function reject(state, code, extra) {
    var r = { ok: false, code: code, message: MESSAGES[code] || code, state: state, events: [] };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  /* ---------- Mode Iqlab: target kata ---------- */
  // Ambil kata berikutnya dari antrean paket (diacak; tidak ada pengulangan sampai semua keluar)
  function pickNextWord(s, rng) {
    var level = config.getLevel(s.level);
    if (!s.wordQueue || !s.wordQueue.length) {
      var q = deck.shuffle(level.words, rng);
      // hindari kata yang sama berturut-turut ketika antrean diisi ulang
      if (s.target && q.length > 1 && q[q.length - 1] === s.target.wordId) {
        var t = q[0]; q[0] = q[q.length - 1]; q[q.length - 1] = t;
      }
      s.wordQueue = q;
    }
    var wid = s.wordQueue.pop();
    s.target = { wordId: wid, filled: config.wordById[wid].syllables.map(function () { return false; }) };
  }

  function sameSyllable(syl, card) {
    return syl.letter === card.letter && syl.haraka === card.haraka;
  }

  /* ---------- Membuat ronde baru ---------- */
  // opts: { players: [{id, name, isBot}], rng?, scores?, round?, level? }
  // level = id level Asasi ('l1'..'l7') atau paket Iqlab ('p1'..'p4'); menentukan mode.
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

    var level = config.getLevel(opts.level);
    var pile = deck.shuffle(deck.createDeck(level.id), rng);

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

    var st = {
      version: 0,
      round: opts.round || 1,
      level: level.id,
      mode: level.mode,
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
      scores: scores,
      waahidFor: null,           // pemain bertangan 1 kartu yang belum menekan Waahid (jendela tangkap terbuka)
      target: null,              // Iqlab: { wordId, filled:[bool,...] }
      wordQueue: [],
      wordsDone: [],             // Iqlab: [{ wordId, by }] kata yang selesai di ronde ini
      wordsBy: {}
    };
    players.forEach(function (p) { st.wordsBy[p.id] = 0; });
    if (level.mode === 'iqlab') pickNextWord(st, rng);
    return st;
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

    // Waahid / Tangkap: boleh di luar giliran
    if (action.type === 'waahid') return doWaahid(state, idx);
    if (action.type === 'catch') return doCatch(state, idx, rng);

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
      if (!rules.isValidChoice(kind, action.choice, state.level)) {
        return reject(state, 'invalid_choice', { needs: kind });
      }
    }

    // --- Aksi sah: mulai mengubah salinan ---
    var s = clone(state);
    var p = s.players[idx];
    var played = p.hand.splice(handPos, 1)[0];
    s.discardPile.push(played);
    s.drawnCardId = null;
    s.waahidFor = null;       // aksi pemain berikutnya menutup jendela tangkap
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

    // Iqlab: kartu yang dimainkan otomatis mengisi slot kata target (tidak harus berurutan)
    var completedWord = null;
    if (played.type === T.NORMAL && s.target) {
      var word = config.wordById[s.target.wordId];
      for (var k = 0; k < word.syllables.length; k++) {
        if (!s.target.filled[k] && sameSyllable(word.syllables[k], played)) {
          s.target.filled[k] = true;
          events.push({ type: 'slot', playerId: p.id, wordId: word.id, index: k });
          break;
        }
      }
      if (s.target.filled.every(Boolean)) {
        completedWord = word.id;
        s.wordsDone.push({ wordId: word.id, by: p.id });
        s.wordsBy[p.id] = (s.wordsBy[p.id] || 0) + 1;
        events.push({ type: 'wordComplete', playerId: p.id, wordId: word.id });
        pickNextWord(s, rng);                     // kata berikutnya otomatis
        events.push({ type: 'newTarget', wordId: s.target.wordId });
      }
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

    // Bonus menyelesaikan kata: pemain berikutnya mengambil kartu (tanpa kehilangan giliran)
    if (completedWord) {
      var bonusVictim = s.players[s.turn];
      var got = 0;
      for (var b = 0; b < config.WORD_BONUS_DRAW; b++) {
        var bc = drawOne(s, rng);
        if (bc) { bonusVictim.hand.push(bc); got++; }
      }
      events.push({ type: 'bonus', playerId: bonusVictim.id, count: got, wordId: completedWord });
    }

    // Tinggal 1 kartu: jendela "Waahid!" terbuka untuk pemain ini
    if (p.hand.length === 1) s.waahidFor = p.id;

    s.version = state.version + 1;
    return { ok: true, state: s, events: events };
  }

  function doWaahid(state, idx) {
    var me = state.players[idx];
    if (state.waahidFor === me.id) {
      var s = clone(state);
      s.waahidFor = null;
      s.version = state.version + 1;
      return { ok: true, state: s, events: [{ type: 'waahid', playerId: me.id }] };
    }
    return reject(state, me.hand.length === 1 ? 'waahid_late' : 'waahid_not_yet');
  }

  function doCatch(state, idx, rng) {
    var catcher = state.players[idx];
    if (!state.waahidFor) return reject(state, 'nothing_to_catch');
    if (state.waahidFor === catcher.id) return reject(state, 'cannot_catch_self');
    var s = clone(state);
    var victim = s.players[playerIndex(s, state.waahidFor)];
    var got = 0;
    for (var i = 0; i < config.WAAHID_PENALTY; i++) {
      var c = drawOne(s, rng);
      if (c) { victim.hand.push(c); got++; }
    }
    s.waahidFor = null;
    s.version = state.version + 1;
    return { ok: true, state: s, events: [{ type: 'caught', playerId: victim.id, byId: catcher.id, count: got }] };
  }

  function doDraw(state, idx, rng) {
    if (state.drawnCardId) return reject(state, 'already_drawn');

    var s = clone(state);
    s.waahidFor = null;
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
    s.waahidFor = null;
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
      level: state.level || config.LEVELS[0].id,
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
      mode: state.mode || 'asasi',
      waahidFor: state.waahidFor || null,
      target: state.target ? { wordId: state.target.wordId, filled: state.target.filled.slice() } : null,
      wordsDone: (state.wordsDone || []).slice(),
      wordsBy: Object.assign({}, state.wordsBy || {}),
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
