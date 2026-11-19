/* Pocket rockets deck game.
   Every press: build a fresh 52-card deck, shuffle it (Fisher-Yates with
   crypto randomness), and deal the top two cards.
   Two aces = pocket rockets = the gift unlocks. */
(() => {
  'use strict';

  /* ---- Edit the gift here ------------------------------------------------ */
  const GIFT = {
    head: 'Pocket rockets. Surprise unlocked.',
    message: 'Save your Jackpot pass and tag @pocketrockkets when you share it. Show them the two aces you were dealt.',
    ctaLabel: 'Follow @pocketrockkets',
    ctaUrl: 'https://www.instagram.com/pocketrockkets/',
    releaseLine: 'In cinemas Dec 11'
  };
  /* ------------------------------------------------------------------------ */

  const SUITS = [
    { k: 'S', g: '♠', red: false, name: 'spades' },
    { k: 'H', g: '♥', red: true, name: 'hearts' },
    { k: 'D', g: '♦', red: true, name: 'diamonds' },
    { k: 'C', g: '♣', red: false, name: 'clubs' }
  ];
  const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const RANK_NAME = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', '10': 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' };
  const RANK_PLURAL = { A: 'Aces', K: 'Kings', Q: 'Queens', J: 'Jacks', '10': 'Tens', '9': 'Nines', '8': 'Eights', '7': 'Sevens', '6': 'Sixes', '5': 'Fives', '4': 'Fours', '3': 'Threes', '2': 'Twos' };

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  /* ---- Deck logic (exposed on window for testing) ------------------------ */
  function randInt(n) {
    if (!(window.crypto && crypto.getRandomValues)) return Math.floor(Math.random() * n);
    const limit = Math.floor(0x100000000 / n) * n; // reject to avoid modulo bias
    const buf = new Uint32Array(1);
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return x % n;
  }
  function freshDeck() {
    const deck = [];
    SUITS.forEach((s) => RANKS.forEach((r) => deck.push({ r, s: s.k })));
    return deck;
  }
  function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  function dealTwo() {
    const deck = shuffle(freshDeck());
    return [deck[0], deck[1]];
  }
  const suitOf = (c) => SUITS.find((s) => s.k === c.s);
  const cardName = (c) => RANK_NAME[c.r] + ' of ' + suitOf(c).name;
  const cardShort = (c) => c.r + suitOf(c).g;

  function verdict(a, b) {
    const aces = (a.r === 'A') + (b.r === 'A');
    if (aces === 2) return { tone: 'win', aces, text: 'Pocket rockets! Two Aces. Your surprise is unlocked.' };
    if (aces === 1) return { tone: 'near', aces, text: 'One Ace. One more and your surprise unlocks.' };
    if (a.r === b.r) return { tone: 'miss', aces, text: 'A pair of ' + RANK_PLURAL[a.r] + '. Strong, but not the rockets.' };
    return { tone: 'miss', aces, text: 'No Aces this time. Shuffle and deal again.' };
  }

  const api = { freshDeck, shuffle, dealTwo, verdict, randInt };
  window.PocketRockets = api;

  /* ---- Saved progress ---------------------------------------------------- */
  const KEY = 'pocket-rockkets-v1';
  let state = { dealt: 0, aces: 0, rockets: 0, unlocked: false, code: '', pass: null };
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  /* ---- DOM --------------------------------------------------------------- */
  const hand = $('hand');
  const cards = [$('card0'), $('card1')];
  const btn = $('dealBtn');
  const status = $('status');
  const handname = $('handname');
  const giftBox = $('giftBox');
  const giftTitle = $('giftTitle');
  const giftSub = $('giftSub');
  const slots = document.querySelectorAll('#meter .slot');
  const dialog = $('gift');
  const reopen = $('reopenGift');
  if (!btn || !hand) return;

  function paintStats() {
    $('sDealt').textContent = state.dealt;
    $('sAces').textContent = state.aces;
    $('sRockets').textContent = state.rockets;
  }
  function paintGift() {
    const open = !!state.unlocked;
    giftBox.classList.toggle('open', open);
    giftTitle.textContent = open ? 'Your surprise is unlocked' : 'Your surprise is locked';
    giftSub.textContent = open ? 'You hit pocket rockets. Your Jackpot pass is waiting.' : 'Land two Aces in one deal to unlock it.';
    reopen.hidden = !open;
  }
  function lightSlots(n) { slots.forEach((s, i) => s.classList.toggle('lit', i < n)); }

  function fillFace(el, card) {
    const s = suitOf(card);
    const face = el.querySelector('.face');
    face.innerHTML =
      '<span class="corner"><b>' + card.r + '</b><i>' + s.g + '</i></span>' +
      '<span class="pip">' + s.g + '</span>' +
      '<span class="corner br"><b>' + card.r + '</b><i>' + s.g + '</i></span>';
    el.classList.toggle('red', s.red);
    el.classList.toggle('ace', card.r === 'A');
    el.setAttribute('aria-label', cardName(card));
  }
  function faceDown(el) {
    el.classList.remove('up', 'ace');
    el.setAttribute('aria-label', 'Face-down card');
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));
  let busy = false;

  async function deal() {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    status.dataset.tone = 'idle';
    status.textContent = 'Shuffling the deck...';
    handname.innerHTML = '&nbsp;';
    lightSlots(0);

    cards.forEach(faceDown);
    hand.classList.add('shuffling');
    const two = api.dealTwo();               // fresh shuffle on every press
    await wait(900);
    hand.classList.remove('shuffling');

    fillFace(cards[0], two[0]);
    fillFace(cards[1], two[1]);
    cards[0].classList.add('up');
    await wait(420);
    cards[1].classList.add('up');
    await wait(520);

    const v = verdict(two[0], two[1]);
    status.dataset.tone = v.tone;
    status.textContent = v.text;
    handname.textContent = cardName(two[0]) + ' and ' + cardName(two[1]);
    lightSlots(v.aces);

    state.dealt += 1;
    state.aces += v.aces;
    if (v.aces === 2) {
      state.rockets += 1;
      state.pass = [two[0], two[1]];
      if (!state.unlocked) state.unlocked = true;
      state.code = makeCode();
    }
    save();
    paintStats();
    paintGift();

    btn.textContent = 'Shuffle and deal again';
    btn.disabled = false;
    busy = false;

    if (v.aces === 2) celebrate();
  }

  /* ---- Win: confetti + gift pass ---------------------------------------- */
  function makeCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) out += alphabet[api.randInt(alphabet.length)];
    return 'PR-' + out.slice(0, 4) + '-' + out.slice(4);
  }

  function celebrate() {
    coins();
    setTimeout(openGift, reduceMotion ? 0 : 900);
  }

  async function openGift() {
    $('giftHead').textContent = GIFT.head;
    $('giftMsg').textContent = GIFT.message;
    const cta = $('giftCta');
    cta.textContent = GIFT.ctaLabel;
    cta.href = GIFT.ctaUrl;
    const url = await drawPass();
    $('passImg').src = url;
    $('passDl').href = url;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }
  reopen.addEventListener('click', openGift);

  function loadTitle() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'TITLE.png';
    });
  }

  async function drawPass(useImage = true) {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    try {
      await Promise.all([
        document.fonts.load('700 120px "Oleo Script"'),
        document.fonts.load('900 300px "Playfair Display"'),
        document.fonts.load('700 40px "Bricolage Grotesque"')
      ]);
    } catch (e) { /* fall back to system fonts */ }

    const bg = x.createRadialGradient(W / 2, 0, 60, W / 2, H / 2, H * 0.9);
    bg.addColorStop(0, '#8a1620'); bg.addColorStop(0.55, '#3b070c'); bg.addColorStop(1, '#14040a');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    const gold = x.createLinearGradient(0, 0, W, H);
    gold.addColorStop(0, '#f6d77a'); gold.addColorStop(0.4, '#a8741f'); gold.addColorStop(0.7, '#f6d77a'); gold.addColorStop(1, '#8a5a12');
    x.strokeStyle = gold; x.lineWidth = 10; x.strokeRect(40, 40, W - 80, H - 80);
    x.lineWidth = 3; x.strokeRect(66, 66, W - 132, H - 132);

    x.textAlign = 'center';
    const chrome = (y0, y1) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#dfe4ee'); g.addColorStop(0.55, '#8a92a3'); g.addColorStop(0.7, '#f2f5fa'); g.addColorStop(1, '#a3abbb'); return g; };
    const title = (t, y, size) => {
      x.font = '700 ' + size + 'px "Oleo Script", cursive';
      x.lineJoin = 'round';
      x.lineWidth = size * 0.17; x.strokeStyle = '#d9a23a'; x.strokeText(t, W / 2, y);
      x.fillStyle = chrome(y - size, y); x.fillText(t, W / 2, y);
    };
    const logo = useImage ? await loadTitle() : null;
    if (logo) {
      const lw = 760, lh = lw * logo.naturalHeight / logo.naturalWidth;
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 30; x.shadowOffsetY = 12;
      x.drawImage(logo, (W - lw) / 2, 120, lw, lh);
      x.shadowColor = 'transparent';
    } else {
      title('Pocket', 250, 170);
      title('Rockkets', 405, 170);
    }

    // the two aces that were dealt
    const pass = state.pass || [{ r: 'A', s: 'S' }, { r: 'A', s: 'H' }];
    const drawCard = (card, cx, cy, rot) => {
      const w = 290, h = 406, s = SUITS.find((q) => q.k === card.s);
      x.save();
      x.translate(cx, cy); x.rotate(rot * Math.PI / 180);
      x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 40; x.shadowOffsetY = 20;
      x.fillStyle = '#f7ecd8';
      x.beginPath(); x.roundRect(-w / 2, -h / 2, w, h, 26); x.fill();
      x.shadowColor = 'transparent';
      x.fillStyle = s.red ? '#c1121f' : '#16090b';
      x.font = '900 70px "Playfair Display", serif'; x.textAlign = 'center';
      x.fillText(card.r, -w / 2 + 52, -h / 2 + 84);
      x.font = '900 56px "Playfair Display", serif';
      x.fillText(s.g, -w / 2 + 52, -h / 2 + 142);
      x.font = '900 190px "Playfair Display", serif';
      x.fillText(s.g, 0, 66);
      x.restore();
    };
    drawCard(pass[0], W / 2 - 170, 760, -9);
    drawCard(pass[1], W / 2 + 170, 770, 9);

    x.textAlign = 'center';
    x.fillStyle = '#e9b949';
    x.font = '700 76px "Oleo Script", cursive';
    x.fillText('Pocket rockets', W / 2, 1065);
    x.fillStyle = '#f7ecd8';
    x.font = '700 38px "Bricolage Grotesque", sans-serif';
    const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    x.fillText('Two aces, dealt on ' + date, W / 2, 1125);
    x.fillStyle = '#e9b949';
    x.font = '900 54px "Playfair Display", serif';
    if ('letterSpacing' in x) x.letterSpacing = '6px';
    x.fillText(state.code || makeCode(), W / 2, 1205);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
    x.fillStyle = '#c9a99a';
    x.font = '500 32px "Bricolage Grotesque", sans-serif';
    x.fillText(GIFT.releaseLine + '  ·  @pocketrockkets', W / 2, 1262);
    try {
      return c.toDataURL('image/png');
    } catch (e) {
      // opened from file:// the image taints the canvas; redraw with the text title
      return useImage ? drawPass(false) : '';
    }
  }

  function coins() {
    if (reduceMotion) return;
    const cv = $('confetti');
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const glyphs = ['♠', '♥', '♦', '♣'];
    const parts = Array.from({ length: 140 }, (_, i) => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 240,
      y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 16,
      vy: -8 - Math.random() * 14,
      r: 6 + Math.random() * 9,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      glyph: i % 4 === 0 ? glyphs[(i / 4) % 4] : null
    }));
    const t0 = performance.now();
    (function frame(t) {
      const age = t - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.42; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.vx *= 0.995;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - age / 3600);
        if (p.glyph) {
          ctx.fillStyle = '#f7ecd8'; ctx.font = (p.r * 2.6) + 'px serif'; ctx.textAlign = 'center';
          ctx.fillText(p.glyph, 0, 0);
        } else {
          const g = ctx.createLinearGradient(-p.r, -p.r, p.r, p.r);
          g.addColorStop(0, '#fbe39a'); g.addColorStop(1, '#a8741f');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * Math.abs(Math.cos(p.rot * 2)) + 1, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      });
      if (age < 3600) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
  }

  btn.addEventListener('click', deal);
  paintStats();
  paintGift();
  if (state.dealt > 0) btn.textContent = 'Shuffle and deal again';
})();
