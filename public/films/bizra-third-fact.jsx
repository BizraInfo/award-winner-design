// bizra-third-fact.jsx — "BIZRA: The Third Fact" cinematic (5 scenes, ~3:45)
// Mounts on the animations-v2 engine. All motion is driven by useScene()'s
// scene clock (progress/localTime) so timing is user-editable and export-exact.
/* global React */
const { SceneStage, useScene } = window;
const clamp = window.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));

// ── timing helpers ──────────────────────────────────────────────
const ease = t => 1 - Math.pow(1 - t, 3);
const easeIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
// windowed envelope: 0 before `inAt`, ramps up over `fade`, holds, ramps to 0 ending at `outAt`
function win(p, inAt, outAt, fade) {
  fade = fade == null ? 0.05 : fade;
  return Math.min(clamp((p - inAt) / fade, 0, 1), clamp((outAt - p) / fade, 0, 1));
}
const mix = (a, b, t) => [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const W = 1920, H = 1080;
const CINZEL = "'Cinzel', serif";
const CAIRO = "'Cairo', sans-serif";
const MONO = "'JetBrains Mono', monospace";
const GOLD = [201, 169, 98], GOLD_HI = [232, 200, 112], IVORY = [246, 242, 233];

// deterministic particle seeds (stable across renders → export-exact)
const seedField = (n) => Array.from({ length: n }, (_, i) => {
  const r = k => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2), s: 0.4 + r(3) * 1.8, ph: r(4) * 6.283, sp: 0.25 + r(5) * 0.7, d: r(6) };
});
const FIELD = seedField(60);

// ── shared atmospherics ─────────────────────────────────────────
function Vignette({ strength }) {
  const s = (window.__TF && typeof window.__TF.vignette === 'number') ? window.__TF.vignette : (strength || 0.55);
  return React.createElement('div', { style: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: `radial-gradient(120% 120% at 50% 46%, rgba(0,0,0,0) 42%, rgba(0,0,0,${s}) 100%)` } });
}
function Grain() {
  if (window.__TF && window.__TF.grain === false) return null;
  return React.createElement('div', { style: {
    position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5, mixBlendMode: 'overlay',
    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 1px, transparent 1px, transparent 3px)' } });
}
function Particles({ color, opacity, lt, count, drift }) {
  const els = [];
  const n = count || 44, dr = drift == null ? 26 : drift;
  for (let i = 0; i < n; i++) {
    const p = FIELD[i];
    const cx = p.x * W + Math.sin(lt * p.sp + p.ph) * dr;
    const cy = p.y * H + Math.cos(lt * p.sp * 0.7 + p.ph) * dr;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(lt * 1.6 + p.ph));
    els.push(React.createElement('circle', { key: i, cx, cy, r: p.s, fill: rgba(color, tw * (opacity || 1)) }));
  }
  return React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`,
    style: { position: 'absolute', inset: 0 } }, els);
}
// centered typographic line
function Line({ text, y, size, color, font, weight, ls, opacity, dy, shadow, dir }) {
  return React.createElement('div', { dir: dir || 'ltr', style: {
    position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity,
    transform: `translateY(${dy || 0}px)`, fontFamily: font || CAIRO, fontWeight: weight || 600,
    fontSize: size, letterSpacing: ls || '0', color, textShadow: shadow || 'none', padding: '0 120px',
    lineHeight: 1.2, pointerEvents: 'none' } }, text);
}
function SeedOfLife({ cx, cy, r, stroke, sw, coreFill, coreR, opacity, rot }) {
  const hexes = [[0, 0], [0, -r], [0, r], [r * 0.866, -r * 0.5], [r * 0.866, r * 0.5], [-r * 0.866, -r * 0.5], [-r * 0.866, r * 0.5]];
  return React.createElement('g', { opacity, transform: `rotate(${rot || 0} ${cx} ${cy})` },
    hexes.map(([dx, dy], i) => React.createElement('circle', { key: i, cx: cx + dx, cy: cy + dy, r, fill: 'none', stroke, strokeWidth: sw })),
    coreR ? React.createElement('circle', { cx, cy, r: coreR, fill: coreFill }) : null);
}

// ════════════════════════════════════════════════════════════════
// SCENE 1 — The Echo of Hard Questions (cool, uncertain)
// ════════════════════════════════════════════════════════════════
function Questions() {
  const { progress: p, localTime: lt } = useScene();
  const bg = mix([10, 16, 34], [16, 14, 30], 0.5 + 0.5 * Math.sin(lt * 0.15));
  const global = win(p, 0, 1, 0.08);
  const Qs = [
    'Who decides the rules for AI?',
    'Can AI give my children a better future?',
    'Does AI make the world a more dangerous place?',
    'Can AI help scientists cure diseases?',
  ];
  // each question occupies a window across progress
  const slots = [[0.06, 0.26], [0.26, 0.46], [0.46, 0.66], [0.66, 0.84]];
  const resp = win(p, 0.86, 1, 0.05);
  const swirl = lt * 6;
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden',
    background: `radial-gradient(130% 120% at 50% 44%, ${rgb(mix(bg, [40, 30, 66], 0.25))} 0%, ${rgb(bg)} 46%, #05070f 100%)` } },
    // swirling faint rings
    React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0, opacity: 0.4 * global } },
      [0, 1, 2, 3].map(k => React.createElement('circle', { key: k, cx: W / 2, cy: H / 2 + 30, r: 180 + k * 150,
        fill: 'none', stroke: rgba([120, 130, 180], 0.18 - k * 0.03), strokeWidth: 1, strokeDasharray: '2 26',
        transform: `rotate(${swirl * (k % 2 ? -1 : 1) * (1 - k * 0.2)} ${W / 2} ${H / 2 + 30})` }))),
    React.createElement(Particles, { color: [150, 165, 210], opacity: 0.5 * global, lt, count: 40 }),
    React.createElement(Line, { text: 'A NEW INTELLIGENCE', y: 150, size: 22, color: rgba([150, 165, 210], 0.6 * global),
      font: CINZEL, weight: 500, ls: '0.5em', opacity: win(p, 0.02, 0.9, 0.06) }),
    Qs.map((q, i) => {
      const o = win(p, slots[i][0], slots[i][1], 0.045);
      return React.createElement(Line, { key: i, text: q, y: H / 2 - 70, size: 78, color: rgb(mix([150, 165, 210], IVORY, o)),
        font: CINZEL, weight: 600, ls: '0.01em', opacity: o, dy: (1 - ease(seg(p, slots[i][0], slots[i][0] + 0.06))) * 24,
        shadow: `0 0 40px ${rgba([90, 110, 180], 0.4 * o)}` });
    }),
    React.createElement(Line, { text: 'And this… is a response.', y: H / 2 - 30, size: 64, color: rgb(mix([150, 165, 210], GOLD_HI, resp)),
      font: CINZEL, weight: 600, ls: '0.04em', opacity: resp, shadow: `0 0 50px ${rgba(GOLD, 0.35 * resp)}` }),
    React.createElement(Vignette, { strength: 0.6 }), React.createElement(Grain, null));
}

// ════════════════════════════════════════════════════════════════
// SCENE 2 — The Crisis and the Choice (dark → warm)
// ════════════════════════════════════════════════════════════════
function Crisis() {
  const { progress: p, localTime: lt } = useScene();
  const warm = seg(p, 0.42, 0.62);          // crisis → choice color shift
  const bg1 = [20, 12, 14], bg2 = [26, 20, 12];
  const base = mix(bg1, bg2, warm);
  const jitter = (1 - warm) * (Math.sin(lt * 40) * 1.5);
  const crisisWords = [['Extraction.', 0.05, 0.17], ['Manipulation.', 0.15, 0.27], ['Shattered trust.', 0.25, 0.4]];
  const ramadan = win(p, 0.46, 0.66, 0.05);
  const zeros = win(p, 0.6, 0.8, 0.05);
  const seedShow = win(p, 0.76, 1, 0.06);
  const seedGrow = ease(seg(p, 0.78, 0.98));
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden',
    background: `radial-gradient(120% 120% at 50% ${46 + warm * 6}%, ${rgb(mix([48, 20, 22], [60, 44, 20], warm))} 0%, ${rgb(base)} 48%, #08060a 100%)` } },
    // chaotic crisis nets (fade out as warmth rises)
    React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0, opacity: (1 - warm) * 0.5 } },
      FIELD.slice(0, 22).map((a, i) => {
        const b = FIELD[(i * 7 + 3) % 60];
        return React.createElement('line', { key: i, x1: a.x * W + jitter, y1: a.y * H, x2: b.x * W, y2: b.y * H,
          stroke: rgba([170, 60, 60], 0.14), strokeWidth: 1 });
      })),
    React.createElement(Particles, { color: mix([180, 70, 60], GOLD, warm), opacity: 0.5, lt, count: 34, drift: 18 + (1 - warm) * 30 }),
    // crisis words
    crisisWords.map(([w, a, b], i) => React.createElement(Line, { key: i, text: w, y: H / 2 - 60 + i * 6, size: 92,
      color: rgb(mix([200, 90, 80], [120, 60, 60], 0.3)), font: CINZEL, weight: 700, ls: '0.02em',
      opacity: win(p, a, b, 0.04), dy: Math.sin(lt * 30 + i) * (1 - warm) * 4,
      shadow: `0 0 40px ${rgba([160, 40, 40], 0.4)}` })),
    // warm turn — Ramadan 2023 + the room
    React.createElement('div', { style: { position: 'absolute', inset: 0, opacity: ramadan } },
      React.createElement('div', { style: { position: 'absolute', left: '50%', top: '46%', width: 260, height: 340,
        transform: 'translate(-50%,-50%)', background: `radial-gradient(60% 50% at 50% 30%, ${rgba(GOLD_HI, 0.5 * ramadan)}, transparent 70%)`,
        borderRadius: 8 } })),
    React.createElement(Line, { text: 'Ramadan 2023', y: 220, size: 40, color: rgba(GOLD_HI, 0.9 * ramadan),
      font: CINZEL, weight: 500, ls: '0.28em', opacity: ramadan }),
    React.createElement(Line, { text: 'One man. No team. No funding.', y: H / 2 - 40, size: 68, color: rgb(mix([120, 90, 70], IVORY, warm)),
      font: CINZEL, weight: 600, ls: '0.02em', opacity: win(p, 0.5, 0.74, 0.05) }),
    React.createElement(Line, { text: 'Alone. Zero. Zero. Zero.', y: H / 2 + 60, size: 44, color: rgba(GOLD, 0.85 * zeros),
      font: MONO, weight: 500, ls: '0.14em', opacity: zeros }),
    // the seed
    React.createElement('div', { style: { position: 'absolute', inset: 0, opacity: seedShow } },
      React.createElement('div', { style: { position: 'absolute', left: '50%', top: '52%', width: 420, height: 420,
        transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, ${rgba(GOLD_HI, 0.4 * seedGrow)}, transparent 66%)` } }),
      React.createElement('svg', { width: 360, height: 360, viewBox: '0 0 360 360',
        style: { position: 'absolute', left: '50%', top: '52%', transform: `translate(-50%,-50%) scale(${0.6 + seedGrow * 0.5})` } },
        React.createElement(SeedOfLife, { cx: 180, cy: 180, r: 46, stroke: rgba(GOLD, 0.85 * seedShow), sw: 1.2,
          coreR: 8, coreFill: rgba([255, 248, 224], seedShow), opacity: seedShow, rot: lt * 4 }))),
    React.createElement(Line, { text: 'بِذْرَة', y: H / 2 + 150, size: 72, color: rgba(GOLD_HI, seedShow),
      font: CAIRO, weight: 700, ls: '0', opacity: seedShow, dir: 'rtl', shadow: `0 0 44px ${rgba(GOLD, 0.5 * seedShow)}` }),
    React.createElement(Line, { text: 'a seed of hope, in barren ground', y: H / 2 + 250, size: 30, color: rgba(IVORY, 0.6 * seedShow),
      font: CINZEL, weight: 500, ls: '0.14em', opacity: seedShow }),
    React.createElement(Vignette, { strength: 0.62 }), React.createElement(Grain, null));
}

// ════════════════════════════════════════════════════════════════
// SCENE 3 — The Seed and the Journey (deep blue/green + gold Ihsan)
// ════════════════════════════════════════════════════════════════
const BRANCHES = [
  'M960 760 C 960 640, 900 560, 820 500', 'M960 760 C 960 640, 1020 560, 1100 500',
  'M960 760 C 960 660, 960 560, 960 470', 'M820 500 C 760 452, 700 440, 640 420',
  'M1100 500 C 1160 452, 1220 440, 1280 420', 'M960 470 C 920 420, 880 400, 840 360',
  'M960 470 C 1000 420, 1040 400, 1080 360', 'M820 500 C 800 560, 740 600, 680 640',
  'M1100 500 C 1120 560, 1180 600, 1240 640',
];
function Journey() {
  const { progress: p, localTime: lt } = useScene();
  const global = win(p, 0, 1, 0.06);
  const grow = ease(seg(p, 0.04, 0.5));
  const ihsan = win(p, 0.66, 0.94, 0.06);
  const stats = [
    ['3 Years', 0.12], ['15,000+ Hours', 0.2], ['157 GitHub Repos', 0.3],
    ['200+ Research Papers', 0.4], ['800 GB Data', 0.48], ['6,000+ AI Conversations', 0.56],
  ];
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden',
    background: `radial-gradient(120% 130% at 50% 78%, ${rgb(mix([12, 34, 40], [50, 42, 20], ihsan))} 0%, #0a1c26 46%, #050d14 100%)` } },
    React.createElement(Particles, { color: mix([90, 180, 170], GOLD_HI, ihsan), opacity: 0.55 * global, lt, count: 46, drift: 22 }),
    // growing roots/tree
    React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0 } },
      BRANCHES.map((d, i) => {
        const g = ease(clamp((grow - i * 0.03) / 0.6, 0, 1));
        const len = 520;
        return React.createElement('path', { key: i, d, fill: 'none',
          stroke: rgba(mix([110, 200, 180], GOLD_HI, ihsan), 0.7 * global), strokeWidth: 2.4, strokeLinecap: 'round',
          strokeDasharray: len, strokeDashoffset: len * (1 - g) });
      }),
      // node lights at branch tips
      [[640, 420], [1280, 420], [840, 360], [1080, 360], [680, 640], [1240, 640]].map((pt, i) =>
        React.createElement('circle', { key: 'n' + i, cx: pt[0], cy: pt[1], r: 5,
          fill: rgba(GOLD_HI, ease(clamp((grow - 0.4 - i * 0.04) / 0.3, 0, 1)) * global) })),
      React.createElement(SeedOfLife, { cx: 960, cy: 800, r: 30, stroke: rgba(GOLD, 0.8 * global), sw: 1.2, coreR: 6, coreFill: rgba([255, 248, 224], global), opacity: global, rot: lt * 3 })),
    React.createElement(Line, { text: 'A SOLITARY ODYSSEY', y: 120, size: 22, color: rgba([120, 190, 180], 0.7 * global),
      font: CINZEL, weight: 500, ls: '0.46em', opacity: win(p, 0.04, 0.64, 0.06) }),
    // stat montage (upper area, staggered)
    stats.map(([s, a], i) => {
      const o = win(p, a, 0.66, 0.04);
      const col = i % 2, row = Math.floor(i / 2);
      return React.createElement('div', { key: i, style: { position: 'absolute', left: col ? '58%' : '18%', top: 200 + row * 96,
        opacity: o, transform: `translateY(${(1 - ease(seg(p, a, a + 0.05))) * 16}px)`, fontFamily: MONO,
        fontSize: 44, fontWeight: 700, color: rgba(mix([150, 220, 205], IVORY, 0.5), 1), letterSpacing: '0.02em' } }, s);
    }),
    // Ihsan reveal
    React.createElement('div', { style: { position: 'absolute', inset: 0, opacity: ihsan } },
      React.createElement('svg', { width: 300, height: 300, viewBox: '0 0 100 100', style: { position: 'absolute', left: '50%', top: '42%', transform: `translate(-50%,-50%) rotate(${lt * 8}deg)` } },
        React.createElement('g', { fill: 'none', stroke: rgba(GOLD_HI, 0.7 * ihsan), strokeWidth: 0.8 },
          React.createElement('rect', { x: 30, y: 30, width: 40, height: 40 }),
          React.createElement('rect', { x: 30, y: 30, width: 40, height: 40, transform: 'rotate(45 50 50)' }),
          React.createElement('circle', { cx: 50, cy: 50, r: 28 })))),
    React.createElement(Line, { text: 'إحسان', y: H / 2 - 20, size: 96, color: rgba(GOLD_HI, ihsan),
      font: CAIRO, weight: 700, ls: '0', opacity: ihsan, dir: 'rtl', shadow: `0 0 60px ${rgba(GOLD, 0.5 * ihsan)}` }),
    React.createElement(Line, { text: 'IHSAN — excellence in all things', y: H / 2 + 110, size: 30, color: rgba(IVORY, 0.7 * ihsan),
      font: CINZEL, weight: 500, ls: '0.2em', opacity: ihsan }),
    React.createElement(Vignette, { strength: 0.6 }), React.createElement(Grain, null));
}

// ════════════════════════════════════════════════════════════════
// SCENE 4 — The Revelation: BIZRA, The Third Fact (clean/authoritative)
// ════════════════════════════════════════════════════════════════
function Revelation() {
  const { progress: p, localTime: lt } = useScene();
  const global = win(p, 0, 1, 0.06);
  const title = win(p, 0.02, 0.2, 0.05);
  const laws = [
    'State before screen', 'Contract before runtime', 'Consent before capability',
    'Evidence before trust', 'MoMo before mesh',
  ];
  const refusal = win(p, 0.56, 0.76, 0.05);
  const gates = win(p, 0.76, 0.98, 0.05);
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden',
    background: `radial-gradient(120% 120% at 50% 40%, #17263f 0%, #0c1a30 50%, #060c18 100%)` } },
    React.createElement(Particles, { color: [150, 175, 215], opacity: 0.4 * global, lt, count: 30, drift: 14 }),
    React.createElement(Line, { text: 'BIZRA', y: 118, size: 96, color: rgb(mix([180, 195, 220], IVORY, title)),
      font: CINZEL, weight: 800, ls: '0.14em', opacity: title, shadow: `0 0 50px ${rgba(GOLD, 0.3 * title)}` }),
    React.createElement(Line, { text: 'THE THIRD FACT', y: 232, size: 26, color: rgba(GOLD_HI, 0.9 * title),
      font: CINZEL, weight: 600, ls: '0.5em', opacity: title }),
    // five law pillars
    React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 26, padding: '0 120px' } },
      laws.map((l, i) => {
        const o = win(p, 0.22 + i * 0.05, 0.99, 0.04);
        const rise = (1 - ease(seg(p, 0.22 + i * 0.05, 0.32 + i * 0.05))) * 30;
        return React.createElement('div', { key: i, style: { flex: 1, maxWidth: 300, opacity: o, transform: `translateY(${rise}px)`,
          background: 'linear-gradient(180deg, rgba(180,195,225,.08), rgba(12,26,48,.4))',
          border: `1px solid ${rgba(GOLD, 0.35)}`, borderTop: `3px solid ${rgb(GOLD)}`, borderRadius: 8, padding: '30px 22px', minHeight: 190 } },
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 20, color: rgba(GOLD_HI, 0.8), marginBottom: 14 } }, '0' + (i + 1)),
          React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 27, color: rgb(IVORY), lineHeight: 1.3 } }, l));
      })),
    // verified refusal shield
    React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', opacity: refusal } },
      React.createElement('svg', { width: 120, height: 132, viewBox: '0 0 120 132', style: { display: 'inline-block' } },
        React.createElement('path', { d: 'M60 8 L110 30 V70 C110 100 88 118 60 126 C32 118 10 100 10 70 V30 Z', fill: rgba([15, 30, 52], 0.7), stroke: rgb(GOLD), strokeWidth: 2 }),
        React.createElement('path', { d: 'M40 66 L54 80 L82 48', fill: 'none', stroke: rgb(GOLD_HI), strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round',
          strokeDasharray: 70, strokeDashoffset: 70 * (1 - ease(seg(p, 0.6, 0.72))) })),
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 40, color: rgb(IVORY), marginTop: 10, letterSpacing: '0.04em' } }, 'The Verified Refusal Pattern'),
      React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 26, color: rgba(IVORY, 0.6), marginTop: 8 } }, 'Every platform says YES to more extraction. BIZRA says NO — and proves why.')),
    // governance gates row
    React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', gap: 16, opacity: gates, flexWrap: 'wrap', padding: '0 120px' } },
      ['PAT-7', 'SAT-5', 'FATE', 'EvidenceChain', 'Micro-Consent C0–C5', 'Truth Label Matrix'].map((g, i) =>
        React.createElement('div', { key: i, style: { fontFamily: MONO, fontSize: 22, color: rgba(GOLD_HI, 0.9),
          border: `1px solid ${rgba(GOLD, 0.4)}`, borderRadius: 4, padding: '10px 18px', background: rgba([10, 22, 40], 0.5) } }, g))),
    React.createElement(Vignette, { strength: 0.5 }), React.createElement(Grain, null));
}

// ════════════════════════════════════════════════════════════════
// SCENE 5 — Hope and the Call to Action (warm, expansive)
// ════════════════════════════════════════════════════════════════
function Hope() {
  const { progress: p, localTime: lt } = useScene();
  const global = win(p, 0, 1, 0.06);
  const dawn = ease(seg(p, 0.0, 0.5));
  const crises = [
    'Surveillance Capitalism', 'Algorithmic Manipulation', 'Mental-Health Epidemic',
    'Wealth Extraction', 'Democratic Erosion', 'Trust Collapse',
  ];
  const msgs = [['Have we forgotten our humanity?', 0.3], ['Enough hatred.', 0.42], ['Let us do Ihsan.', 0.52], ['We are all equal.', 0.62], ['This is my choice.', 0.72]];
  const titleCard = win(p, 0.82, 1, 0.05);
  const treeGrow = ease(seg(p, 0.05, 0.55));
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden',
    background: `radial-gradient(130% 130% at 50% ${88 - dawn * 10}%, ${rgb(mix([60, 44, 20], [120, 96, 42], dawn))} 0%, ${rgb(mix([20, 20, 24], [46, 38, 26], dawn))} 50%, #0a0a10 100%)` } },
    React.createElement(Particles, { color: GOLD_HI, opacity: 0.55 * global, lt, count: 50, drift: 30 }),
    // the grown tree (mirror of journey, fuller)
    React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0, opacity: 0.9 } },
      BRANCHES.concat([
        'M640 420 C 600 380, 560 372, 520 356', 'M1280 420 C 1320 380, 1360 372, 1400 356',
        'M840 360 C 820 320, 800 300, 780 268', 'M1080 360 C 1100 320, 1120 300, 1140 268',
      ]).map((d, i) => {
        const g = ease(clamp((treeGrow - i * 0.02) / 0.6, 0, 1));
        const len = 540;
        return React.createElement('path', { key: i, d, fill: 'none', stroke: rgba(GOLD, 0.7 * global), strokeWidth: 2.4, strokeLinecap: 'round',
          strokeDasharray: len, strokeDashoffset: len * (1 - g) });
      }),
      // canopy glow
      React.createElement('circle', { cx: 960, cy: 380, r: 260 * treeGrow, fill: rgba(GOLD_HI, 0.06 * global) }),
      React.createElement(SeedOfLife, { cx: 960, cy: 800, r: 30, stroke: rgba(GOLD, 0.85 * global), sw: 1.2, coreR: 6, coreFill: rgba([255, 248, 224], global), opacity: global, rot: lt * 2 })),
    // six crises dissolve into light (early)
    crises.map((c, i) => {
      const a = 0.06 + i * 0.03;
      const o = win(p, a, a + 0.14, 0.04) * (1 - dawn * 0.5);
      const col = i % 3, row = Math.floor(i / 3);
      return React.createElement('div', { key: i, style: { position: 'absolute', left: `${20 + col * 30}%`, top: 260 + row * 80,
        transform: 'translateX(-50%)', opacity: o, fontFamily: MONO, fontSize: 26, color: rgba(IVORY, 0.7), letterSpacing: '0.04em', whiteSpace: 'nowrap' } }, c);
    }),
    // core message lines (sequential, center)
    msgs.map(([m, a], i) => React.createElement(Line, { key: i, text: m, y: H / 2 - 40, size: 72,
      color: rgb(mix(IVORY, GOLD_HI, 0.3)), font: CINZEL, weight: 600, ls: '0.03em',
      opacity: win(p, a, a + 0.1, 0.04), shadow: `0 0 46px ${rgba(GOLD, 0.35)}` })),
    // title card
    React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: titleCard } },
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 800, fontSize: 128, letterSpacing: '0.1em', color: rgb(IVORY), textShadow: `0 0 70px ${rgba(GOLD, 0.4)}` } }, 'BIZRA'),
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 40, letterSpacing: '0.4em', color: rgba(GOLD_HI, 0.95), marginTop: 12 } }, 'THE THIRD FACT'),
      React.createElement('div', { style: { width: 80, height: 1, background: `linear-gradient(90deg,transparent,${rgb(GOLD)},transparent)`, margin: '34px 0 26px' } }),
      React.createElement('div', { dir: 'rtl', style: { fontFamily: CAIRO, fontSize: 34, color: rgba(IVORY, 0.75) } }, 'ابنِ بالمعنى. اعمل بالبرهان. وانمُ بالإحسان.'),
      React.createElement('div', { style: { fontFamily: CINZEL, fontSize: 24, letterSpacing: '0.28em', color: rgba(GOLD, 0.7), marginTop: 22 } }, 'bizra.ai · bizra.info')),
    React.createElement(Vignette, { strength: 0.5 }), React.createElement(Grain, null));
}

// ════════════════════════════════════════════════════════════════
// ROOT
// ════════════════════════════════════════════════════════════════
function ThirdFact() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  window.__TF = t;
  return React.createElement(React.Fragment, null,
    React.createElement(SceneStage, {
      width: W, height: H, bg: '#05070f',
      scenes: window.OM_SCENES, playback: window.OM_PLAYBACK,
    }, { Questions, Crisis, Journey, Revelation, Hope }),
    React.createElement(window.TweaksPanel, null,
      React.createElement(window.TweakSection, { label: 'Motion' }),
      React.createElement(window.TweakToggle, { label: 'Motion editor', value: t.motionEditor, onChange: v => setTweak('motionEditor', v) }),
      React.createElement(window.TweakSection, { label: 'Look' }),
      React.createElement(window.TweakSlider, { label: 'Vignette', value: t.vignette, min: 0.2, max: 0.8, step: 0.05, unit: '', onChange: v => setTweak('vignette', v) })));
}
window.ThirdFact = ThirdFact;
