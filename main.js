(() => {
  'use strict';

  /* Roulette wheel behind the hero, drawn once as SVG. */
  const wheel = document.getElementById('wheel');
  if (wheel) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-100 -100 200 200');
    const add = (tag, attrs, parent = svg) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      parent.appendChild(el);
      return el;
    };
    const pol = (r, a) => [(r * Math.cos(a)).toFixed(2), (r * Math.sin(a)).toFixed(2)];

    add('circle', { r: 98, fill: '#2a050a', stroke: '#e9b949', 'stroke-width': 2.4 });
    add('circle', { r: 92, fill: 'none', stroke: '#a8741f', 'stroke-width': 1 });

    const N = 37;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
      const [x0, y0] = pol(88, a0), [x1, y1] = pol(88, a1);
      const [x2, y2] = pol(52, a1), [x3, y3] = pol(52, a0);
      const fill = i === 0 ? '#1f7a45' : i % 2 ? '#c8202e' : '#14090b';
      add('path', {
        d: `M${x0} ${y0} A88 88 0 0 1 ${x1} ${y1} L${x2} ${y2} A52 52 0 0 0 ${x3} ${y3} Z`,
        fill, stroke: '#e9b949', 'stroke-width': 0.4
      });
    }
    add('circle', { r: 50, fill: '#4a0910', stroke: '#e9b949', 'stroke-width': 1.2 });
    add('circle', { r: 30, fill: '#2a050a', stroke: '#a8741f', 'stroke-width': 1 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      const [x, y] = pol(30, a);
      add('line', { x1: 0, y1: 0, x2: x, y2: y, stroke: '#e9b949', 'stroke-width': 2, 'stroke-linecap': 'round' });
    }
    add('circle', { r: 6, fill: '#e9b949' });
    wheel.appendChild(svg);
  }

  /* Teaser: show the YouTube thumbnail first, load the player on click. */
  const facade = document.getElementById('facade');
  const player = document.getElementById('player');
  if (facade && player) {
    facade.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/T3EZyINfUwg?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      frame.title = 'Pocket Rockkets teaser';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      player.replaceChildren(frame);
    });
  }

  /* Cast and crew chips: every account tagged on the film's Instagram posts. */
  const HANDLES = [
    'niharikakonidela', 'pinkelephantpictures', 'maximumcitystudios', 'jdmaxmode',
    'rahul_raghavendra', 'rahulnimmakuri', 'srinivasarala', 'trinadhvarmak',
    'nirmalkmad', 'shriya.kontham', 'kireetid', 'rudraatri', 'edurolu_raju',
    'gyaani_music', 'anwar18_ali', 'manyamramesh', 'vishnuvardhanpulla',
    'rajeshlankaactiondirector', 'jd_masterofficial', 'devaraa92',
    'saimaneendharmani', 'muralikrishnakatta.kmk', 'ravi_pasupuleti',
    'beyondmediapr', 'ticketfactoryoffl'
  ];
  const chips = document.getElementById('chips');
  if (chips) {
    const frag = document.createDocumentFragment();
    HANDLES.forEach((h) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'https://www.instagram.com/' + h + '/';
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'chip';
      a.textContent = '@' + h;
      li.appendChild(a);
      frag.appendChild(li);
    });
    chips.appendChild(frag);
  }
})();
