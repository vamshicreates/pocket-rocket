/* Pocket Rockkets — "Make your jackpot poster"
   Everything happens in the browser. Photos are drawn onto a canvas on this
   device and are never uploaded anywhere. */
(function () {
  'use strict';

  var canvas = document.getElementById('posterCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var $ = function (id) { return document.getElementById(id); };
  var nameA = $('nameA'), nameB = $('nameB');
  var photoA = $('photoA'), photoB = $('photoB');
  var thumbA = $('thumbA'), thumbB = $('thumbB');
  var clearA = $('clearA'), clearB = $('clearB');
  var dlBtn = $('posterDl'), shareBtn = $('posterShare');
  var note = $('posterNote');
  var formatRadios = document.querySelectorAll('input[name="posterFormat"]');

  var W = 1080;
  var LAYOUTS = {
    story: { H: 1920, logoW: 780, logoY: 110, cardW: 420, cardH: 588, cardCY: 1075, wheelCY: 1000,
             tagSize: 38, partnerY: 672, partnerSize: 86, dateY: 1610, handleY: 1712, makeY: 1766 },
    feed:  { H: 1350, logoW: 520, logoY: 92, cardW: 336, cardH: 470, cardCY: 762, wheelCY: 710,
             tagSize: 30, partnerY: 474, partnerSize: 62, dateY: 1140, handleY: 1214, makeY: 1260 }
  };

  var state = { format: 'story', photos: { a: null, b: null } };

  // ---------- helpers ----------
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function chrome(c, y0, y1) {
    var g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#dfe4ee'); g.addColorStop(0.55, '#8a92a3');
    g.addColorStop(0.7, '#f2f5fa'); g.addColorStop(1, '#a3abbb');
    return g;
  }

  function fitFont(c, text, weight, family, maxSize, maxWidth) {
    var size = maxSize;
    c.font = weight + ' ' + size + 'px ' + family;
    while (size > 18 && c.measureText(text).width > maxWidth) {
      size -= 2;
      c.font = weight + ' ' + size + 'px ' + family;
    }
    return size;
  }

  // ---------- one-time assets ----------
  var assetsPromise = null;
  function loadAssets() {
    if (assetsPromise) return assetsPromise;
    var fonts = Promise.all([
      document.fonts.load('700 120px "Oleo Script"'),
      document.fonts.load('900 60px "Playfair Display"'),
      document.fonts.load('500 32px "Bricolage Grotesque"'),
      document.fonts.load('700 32px "Bricolage Grotesque"')
    ]).catch(function () { /* fall back to system fonts */ });
    var logo = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = 'TITLE.png';
    });
    assetsPromise = Promise.all([fonts, logo]).then(function (r) { return { logo: r[1] }; });
    return assetsPromise;
  }

  // ---------- drawing ----------
  function drawBackground(L) {
    var H = L.H;
    var bg = ctx.createRadialGradient(W / 2, 0, 60, W / 2, H / 2, H * 0.9);
    bg.addColorStop(0, '#8a1620'); bg.addColorStop(0.55, '#3b070c'); bg.addColorStop(1, '#14040a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // roulette wheel peeking out behind the cards
    var cx = W / 2, cy = L.wheelCY, R = 760, n = 24, i;
    for (i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
      ctx.fillStyle = i % 2 ? 'rgba(200,32,46,.20)' : 'rgba(20,4,8,.38)';
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(233,185,73,.30)';
    [R, R * 0.8, R * 0.52, R * 0.2].forEach(function (r, k) {
      ctx.lineWidth = k === 0 ? 6 : 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(233,185,73,.14)';
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    }

    // darken the edges so the lettering reads
    var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, 'rgba(10,2,4,0)'); v.addColorStop(1, 'rgba(10,2,4,.65)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

    // gold frame, double line
    var gold = ctx.createLinearGradient(0, 0, W, H);
    gold.addColorStop(0, '#f6d77a'); gold.addColorStop(0.4, '#a8741f'); gold.addColorStop(0.7, '#f6d77a'); gold.addColorStop(1, '#8a5a12');
    ctx.strokeStyle = gold; ctx.lineWidth = 10; ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 3; ctx.strokeRect(66, 66, W - 132, H - 132);
  }

  function drawPhotoOrInitial(cx, cy, r, photo, initial) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    if (photo) {
      var side = Math.min(photo.width, photo.height);
      var sx = (photo.width - side) / 2;
      var sy = (photo.height - side) * 0.3; // faces usually sit in the upper part
      ctx.drawImage(photo, sx, sy, side, side, cx - r, cy - r, r * 2, r * 2);
    } else {
      var g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#8a1620'); g.addColorStop(1, '#3b070c');
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#e9b949';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(r * 1.15) + 'px "Oleo Script", cursive';
      ctx.fillText(initial, cx, cy + r * 0.06);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    // gold ring
    var ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ring.addColorStop(0, '#f6d77a'); ring.addColorStop(0.5, '#a8741f'); ring.addColorStop(1, '#f6d77a');
    ctx.lineWidth = 10; ctx.strokeStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  // corner index (rank + suit) drawn twice, the second rotated like a real card
  function drawIndex(o, ink, halo) {
    var w = o.w, h = o.h;
    var s1 = Math.round(w * 0.19), s2 = Math.round(w * 0.15);
    var x0 = -w / 2 + w * 0.13, y0 = -h / 2 + w * 0.23;
    [0, Math.PI].forEach(function (rot) {
      ctx.save(); ctx.rotate(rot);
      ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.font = '900 ' + s1 + 'px "Playfair Display", serif';
      if (halo) { ctx.lineWidth = w * 0.05; ctx.strokeStyle = halo; ctx.strokeText('A', x0, y0); }
      ctx.fillStyle = ink; ctx.fillText('A', x0, y0);
      ctx.font = '900 ' + s2 + 'px "Playfair Display", serif';
      if (halo) { ctx.lineWidth = w * 0.05; ctx.strokeStyle = halo; ctx.strokeText(o.glyph, x0, y0 + s2 * 1.05); }
      ctx.fillStyle = ink; ctx.fillText(o.glyph, x0, y0 + s2 * 1.05);
      ctx.restore();
    });
  }

  function drawCard(o) {
    var w = o.w, h = o.h;
    ctx.save();
    ctx.translate(o.cx, o.cy); ctx.rotate(o.rot * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 22;
    ctx.fillStyle = '#f7ecd8';
    rr(ctx, -w / 2, -h / 2, w, h, w * 0.07); ctx.fill();
    ctx.shadowColor = 'transparent';

    var ink = o.red ? '#c1121f' : '#16090b';
    var name = o.name || o.placeholder;

    if (o.photo) {
      // the photo fills the whole card, inside a thin ivory border
      var pad = w * 0.035, iw = w - pad * 2, ih = h - pad * 2, ph = o.photo;
      var k = Math.max(iw / ph.width, ih / ph.height);
      var sw = iw / k, sh = ih / k;
      var sx = (ph.width - sw) / 2, sy = (ph.height - sh) * 0.3;
      ctx.save();
      rr(ctx, -iw / 2, -ih / 2, iw, ih, w * 0.05); ctx.clip();
      ctx.drawImage(ph, sx, sy, sw, sh, -iw / 2, -ih / 2, iw, ih);
      var top = ctx.createLinearGradient(0, -ih / 2, 0, -ih / 2 + ih * 0.22);
      top.addColorStop(0, 'rgba(10,2,4,.38)'); top.addColorStop(1, 'rgba(10,2,4,0)');
      ctx.fillStyle = top; ctx.fillRect(-iw / 2, -ih / 2, iw, ih * 0.22);
      var bot = ctx.createLinearGradient(0, ih / 2 - ih * 0.3, 0, ih / 2);
      bot.addColorStop(0, 'rgba(10,2,4,0)'); bot.addColorStop(1, 'rgba(10,2,4,.85)');
      ctx.fillStyle = bot; ctx.fillRect(-iw / 2, ih / 2 - ih * 0.3, iw, ih * 0.3);
      ctx.restore();

      drawIndex(o, ink, '#f7ecd8');

      var fs = fitFont(ctx, name, 900, '"Playfair Display", serif', Math.round(w * 0.17), w * 0.5);
      ctx.font = '900 ' + fs + 'px "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
      ctx.fillStyle = o.name ? '#f7ecd8' : 'rgba(247,236,216,.6)';
      ctx.fillText(name, 0, h * 0.4);
      ctx.shadowColor = 'transparent';
    } else {
      drawIndex(o, ink, null);
      drawPhotoOrInitial(0, -h * 0.07, w * 0.315, null, o.initial);
      var size = fitFont(ctx, name, 900, '"Playfair Display", serif', Math.round(w * 0.2), w * 0.74);
      ctx.font = '900 ' + size + 'px "Playfair Display", serif';
      ctx.fillStyle = o.name ? ink : 'rgba(22,9,11,.4)';
      ctx.textAlign = 'center';
      ctx.fillText(name, 0, h * 0.355);
    }
    ctx.restore();
  }

  function drawText(L, assets) {
    ctx.textAlign = 'center';
    // title lockup
    if (assets.logo) {
      var lh = L.logoW * assets.logo.naturalHeight / assets.logo.naturalWidth;
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      ctx.drawImage(assets.logo, (W - L.logoW) / 2, L.logoY, L.logoW, lh);
      ctx.shadowColor = 'transparent';
    } else {
      ctx.font = '700 150px "Oleo Script", cursive';
      ctx.fillStyle = '#e9b949';
      ctx.fillText('Pocket Rockkets', W / 2, L.logoY + 180);
    }

    // line under the logo: plain white sans so it reads on any screen
    var line = 'My A-Game Partner';
    var ps = fitFont(ctx, line, 700, '"Bricolage Grotesque", sans-serif', L.partnerSize, 820);
    ctx.font = '700 ' + ps + 'px "Bricolage Grotesque", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.fillText(line, W / 2, L.partnerY);
    ctx.shadowColor = 'transparent';

    // release date in a pill at the bottom
    var dateText = 'In cinemas Dec 11';
    var ds = Math.round(L.tagSize * 1.5);
    ctx.font = '700 ' + ds + 'px "Bricolage Grotesque", sans-serif';
    var dw = ctx.measureText(dateText).width + ds * 1.6, dh = ds * 1.9;
    rr(ctx, (W - dw) / 2, L.dateY - dh / 2, dw, dh, dh / 2);
    ctx.fillStyle = 'rgba(10,2,4,.7)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#e9b949'; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
    ctx.fillText(dateText, W / 2, L.dateY + ds * 0.04);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#f7ecd8';
    ctx.font = '700 ' + Math.round(L.tagSize * 0.9) + 'px "Bricolage Grotesque", sans-serif';
    ctx.fillText('@pocketrockkets', W / 2, L.handleY);
    ctx.fillStyle = '#c9a99a';
    ctx.font = '500 ' + Math.round(L.tagSize * 0.8) + 'px "Bricolage Grotesque", sans-serif';
    ctx.fillText('Make yours at ' + (location.host || 'pocket-rocket-eight.vercel.app'), W / 2, L.makeY);
  }

  function initialOf(name, fallback) {
    var t = (name || '').trim();
    return t ? t.charAt(0).toUpperCase() : fallback;
  }

  function draw(assets) {
    var L = LAYOUTS[state.format];
    if (canvas.height !== L.H) canvas.height = L.H;
    canvas.width = W; // also clears

    var a = nameA.value.trim(), b = nameB.value.trim();
    drawBackground(L);

    // soft gold glow under the cards
    var glow = ctx.createRadialGradient(W / 2, L.cardCY, 40, W / 2, L.cardCY, L.cardW * 1.5);
    glow.addColorStop(0, 'rgba(233,185,73,.28)'); glow.addColorStop(1, 'rgba(233,185,73,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, L.H);

    var off = L.cardW * 0.54;
    drawCard({ cx: W / 2 - off, cy: L.cardCY + 8, w: L.cardW, h: L.cardH, rot: -8, red: false, glyph: '♠',
               name: a, placeholder: 'Your name', initial: initialOf(a, '?'), photo: state.photos.a });
    drawCard({ cx: W / 2 + off, cy: L.cardCY - 8, w: L.cardW, h: L.cardH, rot: 8, red: true, glyph: '♥',
               name: b, placeholder: 'Your friend', initial: initialOf(b, '?'), photo: state.photos.b });
    drawText(L, assets);

    var label = a && b ? 'Pocket Rockkets poster for ' + a + ' and ' + b : 'Pocket Rockkets poster preview';
    canvas.setAttribute('aria-label', label);
  }

  var queue = Promise.resolve();
  var timer = 0;
  function render() {
    queue = queue.then(loadAssets).then(draw).catch(function () {});
    return queue;
  }
  function scheduleRender() {
    clearTimeout(timer);
    timer = setTimeout(render, 70);
    updateControls();
  }

  // ---------- controls ----------
  var canShare = false;
  try {
    canShare = !!(navigator.canShare && navigator.share &&
      navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  } catch (e) { canShare = false; }
  if (canShare) shareBtn.hidden = false;

  function ready() { return nameA.value.trim() && nameB.value.trim(); }

  function updateControls() {
    var ok = !!ready();
    dlBtn.disabled = !ok;
    shareBtn.disabled = !ok;
    clearA.hidden = !state.photos.a;
    clearB.hidden = !state.photos.b;
    note.textContent = ok
      ? 'Looks good. Save it, post it, and tag @pocketrockkets.'
      : 'Add both names to unlock the download.';
  }

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20); }

  function toBlob() {
    return render().then(function () {
      return new Promise(function (resolve, reject) {
        try {
          canvas.toBlob(function (b) { b ? resolve(b) : reject(new Error('empty')); }, 'image/png');
        } catch (e) { reject(e); }
      });
    });
  }

  function fileName() {
    return 'pocket-rockkets-' + (slug(nameA.value) || 'you') + '-and-' + (slug(nameB.value) || 'friend') + '.png';
  }

  dlBtn.addEventListener('click', function () {
    if (!ready()) return;
    toBlob().then(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url; link.download = fileName();
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      note.textContent = 'Saved. Post it and tag @pocketrockkets so we can find it.';
    }).catch(function () {
      note.textContent = 'The poster could not be saved here. Try opening the site in your browser.';
    });
  });

  shareBtn.addEventListener('click', function () {
    if (!ready()) return;
    toBlob().then(function (blob) {
      var file = new File([blob], fileName(), { type: 'image/png' });
      return navigator.share({
        files: [file],
        title: 'Pocket Rockkets',
        text: nameA.value.trim() + ' & ' + nameB.value.trim() + ' got pocket rockets. Pocket Rockkets is in cinemas Dec 11. Make yours: ' + location.origin
      });
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      note.textContent = 'Sharing is not available here. Use Save poster instead.';
    });
  });

  [nameA, nameB].forEach(function (el) { el.addEventListener('input', scheduleRender); });
  Array.prototype.forEach.call(formatRadios, function (r) {
    r.addEventListener('change', function () {
      if (r.checked) { state.format = r.value; canvas.dataset.format = r.value; scheduleRender(); }
    });
  });

  // ---------- photos (read on this device, shrunk, never uploaded) ----------
  function toBitmapCanvas(file) {
    return new Promise(function (resolve, reject) {
      var done = function (src, w, h) {
        var k = Math.min(1, 900 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        if (src.close) src.close();
        resolve(c);
      };
      if (window.createImageBitmap) {
        createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
          done(bmp, bmp.width, bmp.height);
        }).catch(viaImage);
      } else { viaImage(); }
      function viaImage() {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () { URL.revokeObjectURL(url); done(img, img.naturalWidth, img.naturalHeight); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
        img.src = url;
      }
    });
  }

  function wirePhoto(input, thumb, clear, key) {
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type) || file.size > 25 * 1024 * 1024) {
        note.textContent = 'Pick a photo under 25 MB (JPG or PNG works best).';
        input.value = ''; return;
      }
      toBitmapCanvas(file).then(function (c) {
        state.photos[key] = c;
        thumb.src = c.toDataURL('image/jpeg', 0.7);
        thumb.hidden = false;
        scheduleRender();
      }).catch(function () {
        note.textContent = 'That photo could not be read. Try a JPG or PNG.';
      });
    });
    clear.addEventListener('click', function () {
      state.photos[key] = null; input.value = ''; thumb.hidden = true; thumb.removeAttribute('src');
      scheduleRender(); input.focus();
    });
  }
  wirePhoto(photoA, thumbA, clearA, 'a');
  wirePhoto(photoB, thumbB, clearB, 'b');

  // first paint
  updateControls();
  render();

  // handy for tests
  window.PosterMaker = { render: render, state: state };
})();
