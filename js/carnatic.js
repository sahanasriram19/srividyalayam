// =============================================
//  SRIVIDYALAYAM — Melakarta wheel (72 parent ragas)
//  Used on classes.html. No libraries.
//  Sound plays only when a visitor presses "Hear the Scale".
// =============================================

(() => {
  'use strict';

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = () => reduceMotionQuery.matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  // Madhya sthayi Sa (the scale is played an octave above this)
  const SA = 146.83; // D3

  // =============================================
  //  Shared sound (Web Audio, synthesised plucks)
  // =============================================
  const Sound = (() => {
    let ctx = null;
    let master = null;
    const cache = new Map();

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.8;
        const comp = ctx.createDynamicsCompressor();
        master.connect(comp);
        comp.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    // Karplus-Strong plucked string. Lower "brightness" keeps more high
    // harmonics ringing; "buzz" adds a little veena-like edge.
    function pluckBuffer(freq, seconds, opts = {}) {
      const { brightness = 1, decay = 0.996, buzz = 0 } = opts;
      const key = [freq, seconds, brightness, decay, buzz].join('|');
      if (cache.has(key)) return cache.get(key);

      const sr = ctx.sampleRate;
      const len = Math.floor(sr * seconds);
      const buf = ctx.createBuffer(1, len, sr);
      const out = buf.getChannelData(0);
      const N = Math.max(2, Math.round(sr / freq));
      const line = new Float32Array(N);

      let prev = 0;
      for (let i = 0; i < N; i++) {
        prev = prev * 0.4 + (Math.random() * 2 - 1) * 0.6;
        line[i] = prev;
      }

      let idx = 0;
      let peak = 0;
      for (let n = 0; n < len; n++) {
        const a = line[idx];
        const b = line[(idx + 1) % N];
        line[idx] = decay * (a * (1 - brightness * 0.5) + b * brightness * 0.5);
        idx = (idx + 1) % N;
        let y = a;
        if (buzz) y = y + buzz * y * Math.abs(y);
        out[n] = y;
        const m = Math.abs(y);
        if (m > peak) peak = m;
      }

      const gain = peak > 0 ? 0.8 / peak : 1;
      const fadeIn = Math.floor(sr * 0.003);
      const fadeOut = Math.floor(sr * 0.4);
      for (let n = 0; n < len; n++) {
        let g = gain;
        if (n < fadeIn) g *= n / fadeIn;
        if (n > len - fadeOut) g *= (len - n) / fadeOut;
        out[n] *= g;
      }

      cache.set(key, buf);
      return buf;
    }

    function play(buffer, when = 0, volume = 0.3) {
      if (!ctx) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = volume;
      src.connect(g);
      g.connect(master);
      src.start(when || ctx.currentTime);
    }

    return {
      ensure,
      pluckBuffer,
      play,
      get ctx() { return ctx; },
    };
  })();

  // =============================================
  //  MELAKARTA WHEEL
  // =============================================
  const MELAKARTAS = [
    'Kanakangi', 'Ratnangi', 'Ganamurti', 'Vanaspati', 'Manavati', 'Tanarupi',
    'Senavati', 'Hanumatodi', 'Dhenuka', 'Natakapriya', 'Kokilapriya', 'Rupavati',
    'Gayakapriya', 'Vakulabharanam', 'Mayamalavagowla', 'Chakravakam', 'Suryakantam', 'Hatakambari',
    'Jhankaradhwani', 'Natabhairavi', 'Keeravani', 'Kharaharapriya', 'Gowrimanohari', 'Varunapriya',
    'Mararanjani', 'Charukesi', 'Sarasangi', 'Harikambhoji', 'Dheerasankarabharanam', 'Naganandini',
    'Yagapriya', 'Ragavardhini', 'Gangeyabhushani', 'Vagadheeswari', 'Shulini', 'Chalanata',
    'Salagam', 'Jalarnavam', 'Jhalavarali', 'Navaneetam', 'Pavani', 'Raghupriya',
    'Gavambhodi', 'Bhavapriya', 'Shubhapantuvarali', 'Shadvidamargini', 'Suvarnangi', 'Divyamani',
    'Dhavalambari', 'Namanarayani', 'Kamavardhini', 'Ramapriya', 'Gamanashrama', 'Vishwambari',
    'Shamalangi', 'Shanmukhapriya', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Neetimati',
    'Kantamani', 'Rishabhapriya', 'Latangi', 'Vachaspati', 'Mechakalyani', 'Chitrambari',
    'Sucharitra', 'Jyotiswarupini', 'Dhatuvardhani', 'Nasikabhushani', 'Kosalam', 'Rasikapriya',
  ];
  const WHEEL_LABEL = { 29: 'Sankarabharanam' }; // shorter name to fit the ring

  const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu',
                   'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];

  // R/G pair by position of the chakra, D/N pair by position inside the chakra
  const PAIRS = [[1, 1], [1, 2], [1, 3], [2, 2], [2, 3], [3, 3]];
  const R_NAMES = ['Shuddha', 'Chatushruti', 'Shatshruti'];
  const G_NAMES = ['Shuddha', 'Sadharana', 'Antara'];
  const D_NAMES = ['Shuddha', 'Chatushruti', 'Shatshruti'];
  const N_NAMES = ['Shuddha', 'Kaisiki', 'Kakali'];

  function melakarta(n) { // n = 1..72
    const i = n - 1;
    const chakra = Math.floor(i / 6);
    const [r, gIdx] = PAIRS[chakra % 6];
    const [d, nIdx] = PAIRS[i % 6];
    const m = n <= 36 ? 1 : 2;
    return {
      n,
      name: MELAKARTAS[i],
      chakra,
      chakraName: CHAKRAS[chakra],
      swaras: [
        { s: 'S', sub: '', semi: 0 },
        { s: 'R', sub: r, semi: r, full: `${R_NAMES[r - 1]} Rishabham` },
        { s: 'G', sub: gIdx, semi: gIdx + 1, full: `${G_NAMES[gIdx - 1]} Gandharam` },
        { s: 'M', sub: m, semi: 4 + m, full: `${m === 1 ? 'Shuddha' : 'Prati'} Madhyamam` },
        { s: 'P', sub: '', semi: 7 },
        { s: 'D', sub: d, semi: 7 + d, full: `${D_NAMES[d - 1]} Dhaivatam` },
        { s: 'N', sub: nIdx, semi: 8 + nIdx, full: `${N_NAMES[nIdx - 1]} Nishadam` },
      ],
    };
  }

  function todayIndex() {
    const d = new Date();
    const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return days % 72; // 0..71, changes at local midnight
  }

  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(SVGNS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function polar(r, deg) {
    const a = deg * Math.PI / 180;
    return [r * Math.cos(a), r * Math.sin(a)];
  }

  function sectorPath(r0, r1, a0, a1) {
    const [x0, y0] = polar(r1, a0);
    const [x1, y1] = polar(r1, a1);
    const [x2, y2] = polar(r0, a1);
    const [x3, y3] = polar(r0, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r1},${r1} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} `
      + `L${x2.toFixed(2)},${y2.toFixed(2)} A${r0},${r0} 0 ${large} 0 ${x3.toFixed(2)},${y3.toFixed(2)} Z`;
  }

  function initMelakarta() {
    const section = document.getElementById('melakarta');
    if (!section) return;
    const holder = section.querySelector('.mela-wheel');
    const panel = section.querySelector('.mela-panel');

    const ui = {
      num: panel.querySelector('.mela-num'),
      chakra: panel.querySelector('.mela-chakra'),
      name: panel.querySelector('.mela-name'),
      today: panel.querySelector('.mela-today-tag'),
      aro: panel.querySelector('.mela-aro'),
      ava: panel.querySelector('.mela-ava'),
      notes: panel.querySelector('.mela-notes'),
      prev: panel.querySelector('.mela-prev'),
      next: panel.querySelector('.mela-next'),
      play: panel.querySelector('.mela-play'),
      todayBtn: panel.querySelector('.mela-today-btn'),
    };

    // ---- Geometry (SVG units) ----
    const R_OUT = 292;
    const R_IN = 198;
    const R_CH_OUT = 194;
    const R_CH_IN = 150;
    const R_CORE = 142;
    const R_NOTES = 98;
    const STEP = 5; // 360 / 72

    const svg = el('svg', {
      viewBox: '-320 -320 640 640',
      class: 'mela-svg',
      role: 'img',
      'aria-label': 'A wheel of the 72 melakarta ragas that turns slowly. The raga at the pointer is described alongside.',
    }, holder);

    const defs = el('defs', {}, svg);
    const glow = el('radialGradient', { id: 'melaCoreGlow' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#3d0016' }, glow);
    el('stop', { offset: '100%', 'stop-color': '#1A0008' }, glow);

    el('circle', { r: R_OUT + 8, class: 'mela-rim' }, svg);

    const wheel = el('g', { class: 'mela-rotor' }, svg);

    // Chakra ring (12 groups of 6)
    const chakraEls = [];
    CHAKRAS.forEach((name, c) => {
      const a0 = c * 30 - STEP / 2;
      const grp = el('g', { class: 'mela-chakra-seg' + (c % 2 ? ' alt' : '') }, wheel);
      el('path', { d: sectorPath(R_CH_IN, R_CH_OUT, a0, a0 + 30) }, grp);
      const mid = a0 + 15;
      const label = el('text', { class: 'mela-chakra-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp);
      label.textContent = name.toUpperCase();
      chakraEls.push({ grp, label, angle: mid, flipped: null });
    });

    // Raga ring (72)
    const segs = [];
    for (let i = 0; i < 72; i++) {
      const a = i * STEP;
      const grp = el('g', { class: 'mela-seg', 'data-index': i }, wheel);
      el('path', { d: sectorPath(R_IN, R_OUT, a - STEP / 2, a + STEP / 2) }, grp);
      const text = el('text', { class: 'mela-seg-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp);
      const title = el('title', {}, grp);
      title.textContent = `${i + 1}. ${MELAKARTAS[i]}`;
      segs.push({ grp, text, angle: a, flipped: null, name: WHEEL_LABEL[i + 1] || MELAKARTAS[i] });
    }

    // Shuddha / Prati madhyama boundary lines
    [-STEP / 2, 180 - STEP / 2].forEach(a => {
      const [xa, ya] = polar(R_CH_IN, a);
      const [xb, yb] = polar(R_OUT + 8, a);
      el('line', { x1: xa, y1: ya, x2: xb, y2: yb, class: 'mela-divider' }, wheel);
    });

    // Today's marker (moves with the wheel)
    const todayIdx = todayIndex();
    const [tx, ty] = polar(R_OUT + 8, todayIdx * STEP);
    const todayMark = el('g', { class: 'mela-today-mark', transform: `translate(${tx.toFixed(2)},${ty.toFixed(2)})` }, wheel);
    el('circle', { r: 5 }, todayMark);
    segs[todayIdx].grp.classList.add('is-today');

    // Fixed pointer at 3 o'clock
    el('path', { d: `M${R_OUT + 4},0 L${R_OUT + 22},-10 L${R_OUT + 22},10 Z`, class: 'mela-pointer' }, svg);

    // Centre: the 12 swara positions, and the shape the raga makes on them
    const core = el('g', { class: 'mela-core' }, svg);
    el('circle', { r: R_CORE, fill: 'url(#melaCoreGlow)', class: 'mela-core-disc' }, core);
    el('circle', { r: R_NOTES, class: 'mela-core-guide' }, core);
    const shape = el('polygon', { class: 'mela-shape' }, core);
    const NOTE_LABELS = ['S', 'R₁', 'R₂·G₁', 'R₃·G₂', 'G₃', 'M₁', 'M₂', 'P', 'D₁', 'D₂·N₁', 'D₃·N₂', 'N₃'];
    const noteDots = [];
    for (let k = 0; k < 12; k++) {
      const ang = -90 + k * 30;
      const [x, y] = polar(R_NOTES, ang);
      const dot = el('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 3.5, class: 'mela-note' }, core);
      const [lx, ly] = polar(R_NOTES + 23, ang);
      const lab = el('text', {
        x: lx.toFixed(2), y: ly.toFixed(2),
        class: 'mela-note-label', 'text-anchor': 'middle', 'dominant-baseline': 'central',
      }, core);
      lab.textContent = NOTE_LABELS[k];
      noteDots.push({ dot, lab });
    }
    const coreNum = el('text', { class: 'mela-core-num', 'text-anchor': 'middle', 'dominant-baseline': 'central', y: -6 }, core);
    const coreSub = el('text', { class: 'mela-core-sub', 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 26 }, core);

    // ---- Fit long names into the ring ----
    function setLabels() {
      const compact = holder.getBoundingClientRect().width < 420;
      segs.forEach((s, i) => {
        s.text.textContent = compact ? String(i + 1) : s.name;
        s.text.removeAttribute('textLength');
        s.text.classList.toggle('compact', compact);
        if (!compact) {
          try {
            if (s.text.getComputedTextLength() > 84) {
              s.text.setAttribute('textLength', '84');
              s.text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
            }
          } catch (e) { /* not rendered yet */ }
        }
      });
    }

    // ---- State ----
    let rotation = -todayIdx * STEP; // open on today's melakarta
    let mode = 'hold';               // 'drift' | 'seek' | 'hold'
    let holdUntil = performance.now() + 6000;
    let seek = null;
    let hovering = false;
    let active = -1;
    let visible = false;
    let rafId = 0;
    let running = false;
    let lastT = 0;
    let swaraClock = performance.now();
    let shapeFrom = null;
    let shapeTo = null;
    let shapeStart = 0;
    let current = null;

    const DRIFT = 1;         // degrees per second: a new raga about every 5 seconds
    const SWARA_STEP = 420;  // ms per swara in the arohanam/avarohanam loop

    function pointsFor(m) {
      return m.swaras.map(sw => polar(R_NOTES, -90 + sw.semi * 30));
    }

    function swaraHTML(sw, upper) {
      const sub = sw.sub ? `<sub>${sw.sub}</sub>` : '';
      const dot = upper ? '<span class="tara-dot" aria-hidden="true"></span>' : '';
      return `<span class="swara-letter">${sw.s}${dot}</span>${sub}`;
    }

    function renderPanel(idx) {
      const m = melakarta(idx + 1);
      current = m;
      ui.num.textContent = `Melakarta ${m.n}`;
      ui.chakra.textContent = `${m.chakraName} Chakra · ${m.n <= 36 ? 'Shuddha' : 'Prati'} Madhyama`;
      ui.name.textContent = m.name;
      ui.today.hidden = idx !== todayIdx;

      const aro = [...m.swaras.map((sw, k) => ({ sw, upper: false, k })), { sw: m.swaras[0], upper: true, k: 0 }];
      const ava = [...aro].reverse();
      const chip = ({ sw, upper, k }) =>
        `<span class="swara-chip" data-k="${k}" title="${sw.full || (sw.s === 'S' ? 'Shadjam' : 'Panchamam')}">${swaraHTML(sw, upper)}</span>`;
      ui.aro.innerHTML = aro.map(chip).join('');
      ui.ava.innerHTML = ava.map(chip).join('');

      ui.notes.innerHTML = m.swaras.filter(sw => sw.full)
        .map(sw => `<li><span class="note-key">${sw.s}<sub>${sw.sub}</sub></span>${sw.full}</li>`).join('');

      coreNum.textContent = m.n;
      coreSub.textContent = m.chakraName.toUpperCase();

      const semis = new Set(m.swaras.map(sw => sw.semi));
      noteDots.forEach((nd, k) => {
        nd.dot.classList.toggle('on', semis.has(k));
        nd.lab.classList.toggle('on', semis.has(k));
      });

      const pts = pointsFor(m);
      shapeFrom = shapeTo ? currentShape(performance.now()) : pts;
      shapeTo = pts;
      shapeStart = performance.now();
      swaraClock = performance.now();
    }

    function currentShape(now) {
      if (!shapeFrom || !shapeTo) return shapeTo || [];
      const k = reduceMotion() ? 1 : Math.min(1, (now - shapeStart) / 600);
      const e = 1 - Math.pow(1 - k, 3);
      return shapeTo.map((p, i) => [
        shapeFrom[i][0] + (p[0] - shapeFrom[i][0]) * e,
        shapeFrom[i][1] + (p[1] - shapeFrom[i][1]) * e,
      ]);
    }

    function setActive(idx) {
      if (idx === active) return;
      if (active >= 0) segs[active].grp.classList.remove('is-active');
      active = idx;
      segs[idx].grp.classList.add('is-active');
      const ch = Math.floor(idx / 6);
      chakraEls.forEach((c, i) => c.grp.classList.toggle('is-active', i === ch));
      renderPanel(idx);
    }

    function norm(deg) {
      return ((deg % 360) + 540) % 360 - 180; // -180..180
    }

    function applyRotation() {
      wheel.setAttribute('transform', `rotate(${rotation.toFixed(3)})`);
      // Keep text upright: flip labels on the left half of the wheel
      const place = (item, r) => {
        const flip = Math.cos((item.angle + rotation) * Math.PI / 180) < 0;
        if (flip === item.flipped) return;
        item.flipped = flip;
        const target = item.text || item.label;
        target.setAttribute('transform', `rotate(${item.angle}) translate(${r},0)${flip ? ' rotate(180)' : ''}`);
      };
      segs.forEach(s => place(s, (R_IN + R_OUT) / 2));
      chakraEls.forEach(c => place(c, (R_CH_IN + R_CH_OUT) / 2));
      setActive(((Math.round(-rotation / STEP) % 72) + 72) % 72);
    }

    function goTo(idx, holdMs = 12000) {
      const target = rotation + norm(-idx * STEP - rotation);
      if (reduceMotion()) {
        rotation = target;
        applyRotation();
        mode = 'hold';
        holdUntil = performance.now() + holdMs;
        return;
      }
      seek = { from: rotation, to: target, start: performance.now(), dur: 900, holdMs };
      mode = 'seek';
      if (!running) start();
    }

    function tick(now) {
      if (running) rafId = requestAnimationFrame(tick); // keep going even if a frame fails
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;

      if (mode === 'seek' && seek) {
        const k = Math.min(1, (now - seek.start) / seek.dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        rotation = seek.from + (seek.to - seek.from) * e;
        if (k >= 1) { mode = 'hold'; holdUntil = now + seek.holdMs; seek = null; }
      } else if (mode === 'hold') {
        if (now >= holdUntil && !hovering) mode = 'drift';
      } else if (mode === 'drift' && !hovering && !reduceMotion()) {
        rotation -= DRIFT * dt;
      }
      applyRotation();

      // Centre shape morph
      const pts = currentShape(now);
      shape.setAttribute('points', pts.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' '));

      // Arohanam then avarohanam, one swara at a time, on a loop
      if (!reduceMotion() && current) {
        const elapsed = now - swaraClock;
        const pos = elapsed < 0 ? -1 : Math.floor(elapsed / SWARA_STEP) % 18; // 16 swaras + a short rest
        const chips = [...ui.aro.children, ...ui.ava.children];
        chips.forEach((c, i) => c.classList.toggle('is-on', i === pos));
        let sounding = -1;
        if (pos >= 0 && pos < 16 && chips[pos]) {
          const k = Number(chips[pos].dataset.k);
          sounding = current.swaras[k].semi;
        }
        noteDots.forEach((nd, i) => nd.dot.classList.toggle('sounding', i === sounding));
      }
    }

    function start() {
      if (running) return;
      running = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    // ---- Interaction ----
    svg.addEventListener('click', e => {
      const seg = e.target.closest('.mela-seg');
      if (seg) goTo(Number(seg.dataset.index));
    });
    holder.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true; });
    holder.addEventListener('pointerleave', () => { hovering = false; });

    ui.prev.addEventListener('click', () => goTo((active + 71) % 72));
    ui.next.addEventListener('click', () => goTo((active + 1) % 72));
    ui.todayBtn.addEventListener('click', () => goTo(todayIdx));

    ui.play.addEventListener('click', () => {
      if (!Sound.ensure() || !current) return;
      const ctx = Sound.ctx;
      const seq = [...current.swaras.map(sw => sw.semi), 12];
      const full = [...seq, ...[...seq].reverse()];
      const t0 = ctx.currentTime + 0.08;
      full.forEach((semi, i) => {
        const freq = SA * 2 * Math.pow(2, semi / 12);
        const buf = Sound.pluckBuffer(freq, 1.6, { brightness: 0.9, decay: 0.997, buzz: 0.1 });
        Sound.play(buf, t0 + i * SWARA_STEP / 1000, 0.32);
      });
      // Line the highlight up with the sound and hold the wheel while it plays
      swaraClock = performance.now() + 80;
      mode = 'hold';
      holdUntil = performance.now() + full.length * SWARA_STEP + 3000;
    });

    // Only animate while the section is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
      }, { threshold: 0.05 }).observe(section);
    } else {
      start();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setLabels, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setLabels);

    setLabels();
    applyRotation();
    shape.setAttribute('points', currentShape(performance.now()).map(p => p.join(',')).join(' '));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMelakarta);
  } else {
    initMelakarta();
  }
})();