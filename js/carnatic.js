// =============================================
//  SRIVIDYALAYAM — Learn page animations (learn.html)
//  1. Tala keeper (the 35 talas)
//  2. Melakarta wheel (72 parent ragas)
//  No libraries. Sound plays only when a visitor presses a button.
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

    // Short percussive sounds for the tala keeper.
    // kind: 'clap' | 'count' | 'turn'. accent = samam (first beat of the cycle).
    let noiseBuf = null;
    function beat(kind, accent = false) {
      if (!ctx) return;
      const t = ctx.currentTime + 0.005;

      if (kind === 'clap') {
        if (!noiseBuf) {
          noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
          const d = noiseBuf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1300;
        bp.Q.value = 0.9;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.6, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        src.connect(bp);
        bp.connect(g);
        g.connect(master);
        src.start(t);
        src.stop(t + 0.2);
      }

      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = kind === 'clap' ? (accent ? 196 : 262) : kind === 'turn' ? 523 : 784;
      const g2 = ctx.createGain();
      const peak = kind === 'clap' ? (accent ? 0.45 : 0.3) : 0.12;
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'clap' ? 0.18 : 0.09));
      o.connect(g2);
      g2.connect(master);
      o.start(t);
      o.stop(t + 0.25);
    }

    return {
      ensure,
      pluckBuffer,
      play,
      beat,
      get ctx() { return ctx; },
    };
  })();

  // =============================================
  //  TALA KEEPER (Suladi Sapta Talas x 5 jatis)
  // =============================================
  // Angas: I = laghu (clap + finger counts, length set by jati)
  //        O = drutam (clap, turn: the palm is turned up)   U = anudrutam (clap)
  const TALAS = [
    { key: 'dhruva',  name: 'Dhruva',  angas: ['I', 'O', 'I', 'I'], jati: 4 },
    { key: 'matya',   name: 'Matya',   angas: ['I', 'O', 'I'],      jati: 4 },
    { key: 'rupaka',  name: 'Rupaka',  angas: ['O', 'I'],           jati: 4 },
    { key: 'jhampa',  name: 'Jhampa',  angas: ['I', 'U', 'O'],      jati: 7 },
    { key: 'triputa', name: 'Triputa', angas: ['I', 'O', 'O'],      jati: 3 },
    { key: 'ata',     name: 'Ata',     angas: ['I', 'I', 'O', 'O'], jati: 5 },
    { key: 'eka',     name: 'Eka',     angas: ['I'],                jati: 4 },
  ];
  const JATIS = [
    { n: 3, name: 'Tisra' },
    { n: 4, name: 'Chatusra' },
    { n: 5, name: 'Khanda' },
    { n: 7, name: 'Misra' },
    { n: 9, name: 'Sankeerna' },
  ];
  const SPEEDS = [
    { key: 'slow', label: 'Slow', bpm: 48 },
    { key: 'medium', label: 'Medium', bpm: 72 },
    { key: 'fast', label: 'Fast', bpm: 104 },
  ];
  const FINGERS = ['Little finger', 'Ring finger', 'Middle finger', 'Index finger', 'Thumb'];
  const FINGER_SHORT = ['Little', 'Ring', 'Middle', 'Index', 'Thumb'];

  // Expand a tala into its beats: [{ kind, finger, label, short, anga }]
  function talaBeats(tala, jati) {
    const beats = [];
    tala.angas.forEach((a, ai) => {
      if (a === 'I') {
        beats.push({ kind: 'clap', label: 'Clap', short: 'Clap', anga: ai });
        for (let k = 0; k < jati - 1; k++) {
          const f = k % 5;
          beats.push({ kind: 'count', finger: f, label: FINGERS[f], short: FINGER_SHORT[f], anga: ai });
        }
      } else if (a === 'O') {
        beats.push({ kind: 'clap', label: 'Clap', short: 'Clap', anga: ai });
        beats.push({ kind: 'turn', label: 'Turn', short: 'Turn', anga: ai });
      } else {
        beats.push({ kind: 'clap', label: 'Clap', short: 'Clap', anga: ai });
      }
    });
    return beats;
  }

  function angaLabel(a, jati) {
    if (a === 'I') return `I<sub>${jati}</sub>`;
    return a;
  }

  function initTala() {
    const section = document.getElementById('tala');
    if (!section) return;

    const ui = {
      circle: section.querySelector('.tala-circle'),
      talaChips: section.querySelector('.tala-chips'),
      jatiChips: section.querySelector('.jati-chips'),
      speedChips: section.querySelector('.speed-chips'),
      name: section.querySelector('.tala-name'),
      alias: section.querySelector('.tala-alias'),
      formula: section.querySelector('.tala-formula'),
      strip: section.querySelector('.tala-strip'),
      playBtn: section.querySelector('.tala-play'),
      soundBtn: section.querySelector('.tala-sound'),
    };

    // ---- Controls ----
    const adiBtn = `<button type="button" class="tala-chip" data-preset="adi">Adi</button>`;
    ui.talaChips.innerHTML = adiBtn + TALAS.map(t =>
      `<button type="button" class="tala-chip" data-tala="${t.key}">${t.name}</button>`).join('');
    ui.jatiChips.innerHTML = JATIS.map(j =>
      `<button type="button" class="tala-chip" data-jati="${j.n}">${j.name} <span class="chip-num">${j.n}</span></button>`).join('');
    ui.speedChips.innerHTML = SPEEDS.map(s =>
      `<button type="button" class="tala-chip" data-speed="${s.key}">${s.label}</button>`).join('');

    // ---- SVG ----
    const R = 158;
    const svg = el('svg', {
      viewBox: '-230 -230 460 460',
      class: 'tala-svg',
      role: 'img',
      'aria-label': 'A tala cycle. A marker moves around the beats while the hand in the centre shows the clap, finger count or turn of the hand for each beat.',
    }, ui.circle);
    el('circle', { r: R, class: 'tala-track' }, svg);
    const progress = el('path', { class: 'tala-progress' }, svg);
    const angaLayer = el('g', { class: 'tala-angas' }, svg);
    const nodeLayer = el('g', { class: 'tala-nodes' }, svg);
    const marker = el('circle', { r: 7, class: 'tala-marker' }, svg);

    // Hand in the centre: palm, four fingers (little → index) and a thumb
    const hand = el('g', { class: 'tala-hand', transform: 'translate(0,-28)' }, svg);
    const handInner = el('g', { class: 'tala-hand-inner' }, hand);
    const ripple = el('circle', { r: 44, class: 'tala-ripple', cx: 0, cy: 8 }, handInner);
    const palm = el('rect', { x: -31, y: -6, width: 62, height: 52, rx: 16, class: 'hand-part hand-palm' }, handInner);
    const fingerEls = [
      el('rect', { x: -31, y: -40, width: 13, height: 42, rx: 6.5, class: 'hand-part' }, handInner),
      el('rect', { x: -15.5, y: -56, width: 13, height: 58, rx: 6.5, class: 'hand-part' }, handInner),
      el('rect', { x: 0, y: -62, width: 13, height: 64, rx: 6.5, class: 'hand-part' }, handInner),
      el('rect', { x: 15.5, y: -54, width: 13, height: 56, rx: 6.5, class: 'hand-part' }, handInner),
      el('rect', { x: 26, y: 2, width: 13, height: 40, rx: 6.5, class: 'hand-part', transform: 'rotate(-38 32 22)' }, handInner),
    ];
    // Draw palm over finger bases
    handInner.appendChild(palm);
    const actionText = el('text', { class: 'tala-action', 'text-anchor': 'middle', y: 70 }, svg);
    const countText = el('text', { class: 'tala-count', 'text-anchor': 'middle', y: 94 }, svg);

    // ---- State ----
    let tala = TALAS.find(t => t.key === 'triputa');
    let jati = 4; // Chatusra Triputa = Adi
    let speed = SPEEDS[1];
    let beats = [];
    let nodes = [];
    let stripCells = [];
    let t0 = performance.now();
    let playing = !reduceMotion();
    let pausedAt = 0;     // beats elapsed when paused
    let lastBeat = -1;
    let soundOn = false;
    let running = false;
    let rafId = 0;

    const beatAngle = (i, n) => -90 + (i * 360) / n;

    function arcPath(r, a0, a1) {
      const [x0, y0] = polar(r, a0);
      const [x1, y1] = polar(r, a1);
      const large = a1 - a0 > 180 ? 1 : 0;
      return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
    }

    function build() {
      beats = talaBeats(tala, jati);
      const n = beats.length;
      nodeLayer.innerHTML = '';
      angaLayer.innerHTML = '';

      // Anga arcs outside the beat ring
      const step = 360 / n;
      let start = 0;
      tala.angas.forEach((a, ai) => {
        const len = beats.filter(b => b.anga === ai).length;
        const a0 = beatAngle(start, n) - step / 2 + 2;
        const a1 = beatAngle(start + len - 1, n) + step / 2 - 2;
        el('path', { d: arcPath(R + 30, a0, a1), class: `tala-anga-arc anga-${a}` }, angaLayer);
        const mid = (a0 + a1) / 2;
        const [lx, ly] = polar(R + 50, mid);
        const t = el('text', {
          x: lx.toFixed(2), y: ly.toFixed(2), class: 'tala-anga-label',
          'text-anchor': 'middle', 'dominant-baseline': 'central',
        }, angaLayer);
        t.textContent = a === 'I' ? 'I' : a;
        if (a === 'I') {
          const sub = el('tspan', { class: 'tala-anga-sub', dy: 5 }, t);
          sub.textContent = jati;
        }
        start += len;
      });

      // Beat nodes
      const nodeR = n > 20 ? 10 : n > 12 ? 12 : 14;
      nodes = beats.map((b, i) => {
        const [x, y] = polar(R, beatAngle(i, n));
        const g = el('g', { class: `tala-node kind-${b.kind}${i === 0 ? ' samam' : ''}`, transform: `translate(${x.toFixed(2)},${y.toFixed(2)})` }, nodeLayer);
        el('circle', { r: nodeR }, g);
        const num = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'tala-node-num' }, g);
        num.textContent = i + 1;
        if (n > 20) num.setAttribute('font-size', '9');
        return g;
      });

      // Readout
      const jatiName = JATIS.find(j => j.n === jati).name;
      ui.name.textContent = `${jatiName} Jati ${tala.name} Tala`;
      const isAdi = tala.key === 'triputa' && jati === 4;
      ui.alias.hidden = !isAdi;
      ui.formula.innerHTML = `${tala.angas.map(a => angaLabel(a, jati)).join(' ')}<span class="tala-formula-sep">·</span>${n} aksharas`;

      // Strip: one cell per beat, grouped by anga
      let html = '';
      tala.angas.forEach((a, ai) => {
        html += `<div class="strip-group"><div class="strip-anga">${a === 'I' ? 'Laghu' : a === 'O' ? 'Drutam' : 'Anudrutam'}</div><div class="strip-cells">`;
        beats.forEach((b, i) => {
          if (b.anga !== ai) return;
          html += `<div class="strip-cell kind-${b.kind}" data-i="${i}"><span class="strip-num">${i + 1}</span><span class="strip-act">${b.short}</span></div>`;
        });
        html += '</div></div>';
      });
      ui.strip.innerHTML = html;
      stripCells = [...ui.strip.querySelectorAll('.strip-cell')];

      // Chip states
      ui.talaChips.querySelectorAll('.tala-chip').forEach(c => {
        const on = c.dataset.preset ? isAdi : (c.dataset.tala === tala.key && !isAdi);
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      ui.jatiChips.querySelectorAll('.tala-chip').forEach(c => {
        const on = Number(c.dataset.jati) === jati;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      ui.speedChips.querySelectorAll('.tala-chip').forEach(c => {
        const on = c.dataset.speed === speed.key;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });

      // Restart the cycle from samam
      t0 = performance.now();
      pausedAt = 0;
      lastBeat = -1;
      render(performance.now());
    }

    function elapsedBeats(now) {
      if (!playing) return pausedAt;
      return ((now - t0) / 1000) * (speed.bpm / 60);
    }

    function onBeat(i) {
      const b = beats[i];
      nodes.forEach((g, k) => g.classList.toggle('is-active', k === i));
      stripCells.forEach((c, k) => c.classList.toggle('is-active', k === i));

      fingerEls.forEach((f, k) => f.classList.toggle('lit', b.kind === 'count' && b.finger === k));
      handInner.classList.remove('clap', 'turn');
      void handInner.getBBox(); // restart the CSS animation
      if (b.kind === 'clap') handInner.classList.add('clap');
      if (b.kind === 'turn') handInner.classList.add('turn');

      actionText.textContent = b.label;
      const where = i === 0 ? `Samam · beat 1 of ${beats.length}` : `Beat ${i + 1} of ${beats.length}`;
      countText.textContent = b.kind === 'turn' ? `Palm turned up · ${where}` : where;

      if (soundOn && playing) Sound.beat(b.kind, i === 0);
    }

    function render(now) {
      const n = beats.length;
      const e = elapsedBeats(now);
      const total = Math.floor(e);
      const pos = e % n;
      const i = Math.floor(pos);
      const smooth = !reduceMotion();
      const p = smooth ? pos : i;

      const ang = beatAngle(p, n);
      const [mx, my] = polar(R, ang);
      marker.setAttribute('cx', mx.toFixed(2));
      marker.setAttribute('cy', my.toFixed(2));
      progress.setAttribute('d', p > 0.001 ? arcPath(R, -90, ang) : '');

      if (total !== lastBeat) {
        lastBeat = total;
        onBeat(i);
      }
    }

    function tick(now) {
      if (running) rafId = requestAnimationFrame(tick);
      render(now);
    }
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    function setPlaying(on) {
      const now = performance.now();
      if (on && !playing) {
        t0 = now - (pausedAt * 60000) / speed.bpm;
      } else if (!on && playing) {
        pausedAt = elapsedBeats(now);
      }
      playing = on;
      ui.playBtn.innerHTML = playing
        ? '<i class="ti ti-player-pause" aria-hidden="true"></i> Pause'
        : '<i class="ti ti-player-play" aria-hidden="true"></i> Play';
      ui.playBtn.setAttribute('aria-pressed', String(playing));
    }

    // ---- Events ----
    ui.talaChips.addEventListener('click', e => {
      const c = e.target.closest('.tala-chip');
      if (!c) return;
      if (c.dataset.preset === 'adi') {
        tala = TALAS.find(t => t.key === 'triputa');
        jati = 4;
      } else {
        tala = TALAS.find(t => t.key === c.dataset.tala);
        jati = tala.jati; // each tala opens in its most commonly used jati
      }
      build();
    });
    ui.jatiChips.addEventListener('click', e => {
      const c = e.target.closest('.tala-chip');
      if (!c) return;
      jati = Number(c.dataset.jati);
      build();
    });
    ui.speedChips.addEventListener('click', e => {
      const c = e.target.closest('.tala-chip');
      if (!c) return;
      const now = performance.now();
      const e0 = elapsedBeats(now);
      speed = SPEEDS.find(s => s.key === c.dataset.speed);
      if (playing) t0 = now - (e0 * 60000) / speed.bpm; // keep our place in the cycle
      ui.speedChips.querySelectorAll('.tala-chip').forEach(x => {
        const on = x === c;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
    });
    ui.playBtn.addEventListener('click', () => setPlaying(!playing));
    ui.soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      if (soundOn && !Sound.ensure()) soundOn = false;
      if (soundOn && !playing) setPlaying(true);
      ui.soundBtn.setAttribute('aria-pressed', String(soundOn));
      ui.soundBtn.innerHTML = soundOn
        ? '<i class="ti ti-volume-off" aria-hidden="true"></i> Mute'
        : '<i class="ti ti-volume" aria-hidden="true"></i> Hear the Beat';
    });

    // Only animate while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.05 }).observe(section);
    } else {
      start();
    }

    setPlaying(playing);
    build();
  }

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

  function initAll() {
    initTala();
    initMelakarta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();