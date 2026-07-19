// bizra-mission-thesis.jsx — "Mission-Centric Computing" category film
// Model-centric → mission-centric shift · killer model-swap demo · five guarantees ·
// impact economy business model · category close. All motion from useScene().
/* global React */
const { SceneStage, useScene } = window;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eio = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const eo = t => 1 - Math.pow(1 - t, 3);
const sg = (p, a, b) => cl((p - a) / (b - a), 0, 1);
const wn = (p, a, b, f) => { f = f == null ? 0.05 : f; return Math.min(cl((p - a) / f, 0, 1), cl((b - p) / f, 0, 1)); };
const mx = (a, b, t) => [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const lp = (a, b, t) => a + (b - a) * t;

const W = 1920, H = 1080;
const CINZEL = "'Cinzel', serif", CAIRO = "'Cairo', sans-serif", MONO = "'JetBrains Mono', monospace";
const GOLD = [201,169,98], GOLD_HI = [232,200,112], IVORY = [246,242,233], RED = [207,106,90],
      GREEN = [127,217,176], BLUE = [159,176,224], DIM = [130,148,178];
const BG = 'radial-gradient(130% 120% at 50% 42%, #0d1c31 0%, #081120 48%, #04080f 100%)';

const seeds = Array.from({ length: 70 }, (_, i) => {
  const r = k => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1), y: r(2), s: 0.4 + r(3) * 1.7, ph: r(4) * 6.283, sp: 0.25 + r(5) * 0.6 };
});
function Motes({ color, opacity, lt, count, drift }) {
  const n = count || 40, dr = drift == null ? 24 : drift, els = [];
  for (let i = 0; i < n; i++) {
    const p = seeds[i];
    const cx = p.x * W + Math.sin(lt * p.sp + p.ph) * dr;
    const cy = p.y * H + Math.cos(lt * p.sp * 0.7 + p.ph) * dr;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(lt * 1.6 + p.ph));
    els.push(React.createElement('circle', { key: i, cx, cy, r: p.s, fill: rgba(color, tw * (opacity || 1)) }));
  }
  return React.createElement('svg', { width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0 } }, els);
}
function Fx() {
  const t = window.__MT || {};
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(120% 120% at 50% 46%, rgba(0,0,0,0) 44%, rgba(0,0,0,${t.vignette == null ? 0.5 : t.vignette}) 100%)` } }),
    t.grain === false ? null : React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none',
      opacity: 0.4, mixBlendMode: 'overlay',
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.15) 0px, rgba(0,0,0,.15) 1px, transparent 1px, transparent 3px)' } }));
}
function Line({ text, y, size, color, font, weight, ls, opacity, dy, shadow, dir, w }) {
  return React.createElement('div', { dir: dir || 'ltr', style: { position: 'absolute', left: 0, right: 0, top: y,
    textAlign: 'center', opacity, transform: `translateY(${dy || 0}px)`, fontFamily: font || CAIRO, fontWeight: weight || 600,
    fontSize: size, letterSpacing: ls || '0', color, textShadow: shadow || 'none', padding: '0 140px', lineHeight: 1.22,
    pointerEvents: 'none', maxWidth: w || 'none', margin: w ? '0 auto' : 0 } }, text);
}
function Eyebrow({ text, y, opacity, color }) {
  return React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, top: y == null ? 120 : y,
    textAlign: 'center', opacity, fontFamily: CINZEL, fontWeight: 600, fontSize: 22, letterSpacing: '0.46em',
    color: rgba(color || GOLD, 0.85), pointerEvents: 'none' } }, text);
}
function sceneRoot(children, bg) {
  return React.createElement('div', { style: { position: 'absolute', inset: 0, background: bg || BG, overflow: 'hidden' } }, children);
}
function Card({ x, y, w, h, accent, title, sub, o, rise, big, mono }) {
  return React.createElement('div', { style: { position: 'absolute', left: x, top: y, width: w, height: h,
    transform: `translateY(${rise || 0}px)`, opacity: o, boxSizing: 'border-box', borderRadius: 10, padding: '22px 24px',
    background: `linear-gradient(180deg, ${rgba([18,30,52],0.96)}, ${rgba([9,17,32],0.96)})`,
    border: `1px solid ${rgba(accent, 0.3)}`, borderTop: `3px solid ${rgb(accent)}`,
    boxShadow: o > 0.4 ? `0 0 ${30 * o}px ${rgba(accent, 0.22 * o)}` : 'none' } },
    mono ? React.createElement('div', { style: { fontFamily: MONO, fontSize: 16, color: rgba(accent, 0.85), marginBottom: 8 } }, mono) : null,
    React.createElement('div', { style: { fontFamily: CAIRO, fontWeight: 700, fontSize: big || 30, color: rgb(IVORY), lineHeight: 1.2 } }, title),
    sub ? React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 20, color: rgba(DIM, 0.95), marginTop: 10, lineHeight: 1.4 } }, sub) : null);
}

// ══ SCENE 1 — Model-Centric (the old world) ══════════════════════
function ModelCentric() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.06);
  const cx = W / 2, cy = 470;
  const shatter = sg(p, 0.62, 0.9);          // conversation ends → state lost
  const pull = eo(sg(p, 0.05, 0.4));
  const orbies = [0, 1, 2, 3, 4].map(i => {
    const ang = lt * 0.5 + i * 1.256;
    const rad = 210 * (1 - shatter * 0.2);
    return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.7];
  });
  const words = [['provider lock-in', 0.4, 0.55], ['context loss', 0.5, 0.65], ['state is lost', 0.62, 0.86]];
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: DIM, opacity: 0.4 * g, lt, count: 34 }),
    React.createElement(Eyebrow, { key: 'e', text: 'THE OLD PARADIGM · MODEL-CENTRIC', opacity: wn(p, 0.03, 0.92, 0.06), color: DIM }),
    // model orb at accidental center
    React.createElement('div', { key: 'orb', style: { position: 'absolute', left: cx, top: cy, transform: 'translate(-50%,-50%)', opacity: g * (1 - shatter) } },
      React.createElement('div', { style: { width: 220, height: 220, borderRadius: '50%', filter: `blur(${shatter * 30}px)`,
        background: `radial-gradient(circle, ${rgba([90,110,170], 0.5)}, ${rgba([40,54,90], 0.1)} 70%)`, border: `1px solid ${rgba(BLUE, 0.4)}` } }),
      React.createElement('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: CINZEL, fontWeight: 700, fontSize: 30, color: rgba(IVORY, 0.9) } }, 'MODEL')),
    // orbiting satellites (user, context, actions...) pulled in, then scatter
    React.createElement('svg', { key: 'sat', width: '100%', height: '100%', viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0 } },
      orbies.map((o2, i) => {
        const sx = cx + (o2[0] - cx) * (1 + shatter * 3);
        const sy = cy + (o2[1] - cy) * (1 + shatter * 3);
        return React.createElement('g', { key: i, opacity: g * (1 - shatter * 0.9) },
          React.createElement('line', { x1: cx, y1: cy, x2: sx, y2: sy, stroke: rgba(BLUE, 0.18 * pull * (1 - shatter)), strokeWidth: 1 }),
          React.createElement('circle', { cx: sx, cy: sy, r: 6, fill: rgba(mx(BLUE, DIM, shatter), 0.8) }));
      })),
    React.createElement(Line, { key: 'top', text: 'The model became the accidental center.', y: 210, size: 40, color: rgba(IVORY, 0.8 * wn(p, 0.15, 0.62, 0.06)),
      font: CINZEL, weight: 600, ls: '0.02em', opacity: wn(p, 0.15, 0.62, 0.06) }),
    words.map((wd, i) => React.createElement('div', { key: 'w' + i, style: { position: 'absolute', left: `${28 + i * 22}%`, top: 720 + i * 4,
      transform: 'translateX(-50%)', opacity: wn(p, wd[1], wd[2], 0.04), fontFamily: MONO, fontSize: 30,
      color: rgba(i === 2 ? RED : DIM, 0.9), letterSpacing: '0.04em', whiteSpace: 'nowrap' } }, wd[0])),
    React.createElement(Line, { key: 'end', text: 'Conversation ends. The work does not survive it.', y: 800, size: 30, color: rgba(RED, shatter),
      font: CAIRO, weight: 400, opacity: shatter }),
    React.createElement(Fx, { key: 'f' })]);
}

// ══ SCENE 2 — The Shift (question → reframe) ═════════════════════
function TheShift() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.06);
  const q = wn(p, 0.04, 0.32, 0.05);
  const ans = wn(p, 0.34, 0.62, 0.05);
  const swap = sg(p, 0.4, 0.62);             // center morph model→mission
  const layers = [['Model', 'temporary', 0.64], ['Worker', 'replaceable', 0.7], ['Workflow', 'selectable', 0.76], ['Mission', 'durable', 0.82]];
  const law = wn(p, 0.86, 1, 0.05);
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: mx(DIM, GOLD, swap), opacity: 0.4 * g, lt, count: 36 }),
    React.createElement(Line, { key: 'q', text: 'What remains authoritative when the model changes?', y: 200, size: 52, color: rgba(IVORY, 0.85),
      font: CINZEL, weight: 600, ls: '0.01em', opacity: q, w: 1300 }),
    React.createElement('div', { key: 'ctr', style: { position: 'absolute', left: '50%', top: 430, transform: 'translate(-50%,-50%)', opacity: ans } },
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 800, fontSize: lp(60, 92, swap), letterSpacing: '0.03em',
        color: rgb(mx([150,165,210], GOLD_HI, swap)), textShadow: `0 0 ${40 * swap}px ${rgba(GOLD, 0.4 * swap)}` } }, swap > 0.5 ? 'THE MISSION REMAINS.' : 'the model …')),
    // durability ladder
    React.createElement('div', { key: 'lad', style: { position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', gap: 20 } },
      layers.map((l, i) => {
        const o = wn(p, l[2], 0.99, 0.04);
        const durable = i === 3;
        return React.createElement('div', { key: i, style: { opacity: o, transform: `translateY(${(1 - eo(sg(p, l[2], l[2] + 0.05))) * 18}px)`,
          padding: '20px 26px', borderRadius: 10, minWidth: 220, textAlign: 'center',
          background: durable ? `linear-gradient(180deg, ${rgba([40,32,14],0.9)}, ${rgba([20,16,8],0.9)})` : rgba([16,26,46], 0.7),
          border: `1px solid ${rgba(durable ? GOLD : DIM, durable ? 0.5 : 0.25)}`, borderTop: `3px solid ${rgba(durable ? GOLD : DIM, durable ? 1 : 0.5)}` } },
          React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 700, fontSize: 30, color: rgb(durable ? GOLD_HI : IVORY) } }, l[0]),
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 17, color: rgba(durable ? GOLD : DIM, 0.9), marginTop: 8 } }, l[1]));
      })),
    React.createElement(Line, { key: 'law', text: 'Model proposes · code executes · proof verifies · FATE governs · receipts remember · the human decides.',
      y: 900, size: 26, color: rgba(GOLD_HI, 0.9 * law), font: MONO, weight: 500, ls: '0.01em', opacity: law, w: 1500 }),
    React.createElement(Fx, { key: 'f' })]);
}

// ══ SCENE 3 — Killer Demo (model-swap, mission survives) ═════════
function KillerDemo() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.05);
  // phases: claude works (.08-.34) → limit (.34-.42) → swap (.42-.5) → local works (.5-.74) → verdict (.74-.9)
  const claudeActive = wn(p, 0.08, 0.4, 0.04);
  const limit = wn(p, 0.34, 0.46, 0.03);
  const localActive = wn(p, 0.5, 0.86, 0.04);
  const swapT = sg(p, 0.42, 0.52);
  const verdict = wn(p, 0.74, 0.96, 0.04);
  const receipts = [0.2, 0.3, 0.6, 0.7, 0.82].map((t, i) => ({ o: wn(p, t, 0.99, 0.03), i }));
  const barY = 150;
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: GOLD, opacity: 0.28 * g, lt, count: 26 }),
    React.createElement(Eyebrow, { key: 'e', text: 'THE KILLER DEMONSTRATION · ONE MISSION, MANY WORKERS', opacity: wn(p, 0.02, 0.96, 0.05) }),
    // persistent mission contract bar
    React.createElement('div', { key: 'bar', style: { position: 'absolute', left: 200, right: 200, top: barY, opacity: g,
      background: `linear-gradient(180deg, ${rgba([40,32,14],0.95)}, ${rgba([22,17,8],0.95)})`, border: `1px solid ${rgba(GOLD, 0.45)}`,
      borderLeft: `4px solid ${rgb(GOLD)}`, borderRadius: 10, padding: '20px 28px', boxShadow: `0 0 40px ${rgba(GOLD, 0.15)}` } },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 700, fontSize: 30, color: rgb(GOLD_HI) } }, 'MISSION CONTRACT'),
        React.createElement('div', { style: { fontFamily: MONO, fontSize: 18, color: rgba(GREEN, 0.9) } }, 'contract_hash: sha256:a3f7… · IMMUTABLE')),
      React.createElement('div', { style: { fontFamily: MONO, fontSize: 18, color: rgba(DIM, 1), marginTop: 8 } },
        'acceptance: external tests · authority_delta: 0 · state: durable, replayable')),
    // worker slot
    React.createElement('div', { key: 'slot', style: { position: 'absolute', left: 200, right: 200, top: 360, height: 250 } },
      // Claude worker
      React.createElement('div', { style: { position: 'absolute', left: 0, top: 0, width: 640,
        transform: `translateX(${swapT * -80}px)`, opacity: claudeActive * (1 - swapT * 0.7) } },
        React.createElement(Card, { x: 0, y: 0, w: 640, h: 210, accent: limit > 0.3 ? RED : BLUE,
          mono: 'WORKER · attempt 1', title: 'Claude', sub: limit > 0.3 ? '⚠ usage limit reached — deliberate handoff' : 'proposing patch · running against external gates…', o: 1 })),
      // arrow / checkpoint
      React.createElement('div', { style: { position: 'absolute', left: '50%', top: 70, transform: 'translateX(-50%)', opacity: wn(p, 0.42, 0.9, 0.05), textAlign: 'center' } },
        React.createElement('div', { style: { fontFamily: MONO, fontSize: 16, color: rgba(GOLD_HI, 0.9) } }, 'checkpoint'),
        React.createElement('div', { style: { fontSize: 40, color: rgba(GOLD, 0.8) } }, '→'),
        React.createElement('div', { style: { fontFamily: MONO, fontSize: 15, color: rgba(DIM, 0.9) } }, 'state preserved')),
      // local worker
      React.createElement('div', { style: { position: 'absolute', right: 0, top: 0, width: 640,
        transform: `translateX(${(1 - swapT) * 80}px)`, opacity: localActive } },
        React.createElement(Card, { x: 0, y: 0, w: 640, h: 210, accent: GREEN,
          mono: 'WORKER · attempt 2', title: 'Local model (Codex / OSS)', sub: 'resumes from exact checkpoint · cannot widen contract · same gates decide', o: 1 }))),
    // verdict banner
    React.createElement('div', { key: 'v', style: { position: 'absolute', left: 200, right: 200, top: 660, opacity: verdict,
      textAlign: 'center', background: rgba([12,30,22], 0.7 * verdict), border: `1px solid ${rgba(GREEN, 0.4)}`, borderRadius: 10, padding: '20px' } },
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 700, fontSize: 34, color: rgb(GREEN) } }, 'VERDICT: model-blind'),
      React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 22, color: rgba(IVORY, 0.85), marginTop: 8 } },
        'A prestigious model’s bad answer loses to a smaller model’s verified answer.')),
    // receipt chain
    React.createElement('div', { key: 'r', style: { position: 'absolute', left: 0, right: 0, bottom: 70, display: 'flex', justifyContent: 'center', gap: 14 } },
      receipts.map(r => React.createElement('div', { key: r.i, style: { opacity: r.o, display: 'flex', alignItems: 'center', gap: 14 } },
        React.createElement('div', { style: { width: 92, height: 60, borderRadius: 6, border: `1px solid ${rgba(GOLD, 0.4)}`, background: rgba([16,26,46], 0.8),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 13, color: rgba(GOLD_HI, 0.9) } }, 'RCPT'),
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 11, color: rgba(DIM, 0.9) } }, '#' + (r.i + 1))),
        r.i < 4 ? React.createElement('div', { style: { color: rgba(GOLD, 0.5), fontSize: 22 } }, '→') : null))),
    React.createElement(Fx, { key: 'f' })]);
}

// ══ SCENE 4 — Five Guarantees ════════════════════════════════════
function Guarantees() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.06);
  const items = [
    ['01', 'Mission continuity', 'Survives context loss, model swaps, outages, restarts.', GOLD],
    ['02', 'Model independence', 'Identity never decides whether output is accepted.', BLUE],
    ['03', 'Authority containment', 'Knowing how ≠ permission to. Intelligence isn’t consent.', RED],
    ['04', 'Proof-bearing completion', '“Done” is a derived state backed by evidence.', GREEN],
    ['05', 'Human sovereignty', 'The human owns purpose, irreversible acts, and history.', GOLD_HI],
  ];
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: GOLD, opacity: 0.3 * g, lt, count: 30 }),
    React.createElement(Eyebrow, { key: 'e', text: 'THE FIVE NATIVE GUARANTEES', opacity: wn(p, 0.03, 0.95, 0.05) }),
    React.createElement(Line, { key: 't', text: 'Continuity with sovereignty.', y: 200, size: 56, color: rgba(IVORY, 0.9 * g),
      font: CINZEL, weight: 700, ls: '0.02em', opacity: wn(p, 0.05, 0.95, 0.05) }),
    React.createElement('div', { key: 'row', style: { position: 'absolute', left: 0, right: 0, top: 340, display: 'flex', justifyContent: 'center', gap: 22, padding: '0 120px' } },
      items.map((it, i) => {
        const a = 0.14 + i * 0.11;
        const o = wn(p, a, 0.99, 0.045);
        return React.createElement('div', { key: i, style: { flex: 1, maxWidth: 310, minHeight: 320, opacity: o,
          transform: `translateY(${(1 - eo(sg(p, a, a + 0.06))) * 30}px)`, boxSizing: 'border-box', borderRadius: 12, padding: '32px 26px',
          background: `linear-gradient(180deg, ${rgba([18,30,52],0.96)}, ${rgba([9,17,32],0.96)})`,
          border: `1px solid ${rgba(it[3], 0.32)}`, borderTop: `3px solid ${rgb(it[3])}` } },
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 24, color: rgba(it[3], 0.85), marginBottom: 18 } }, it[0]),
          React.createElement('div', { style: { fontFamily: CAIRO, fontWeight: 700, fontSize: 30, color: rgb(IVORY), lineHeight: 1.2 } }, it[1]),
          React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 21, color: rgba(DIM, 1), marginTop: 14, lineHeight: 1.45 } }, it[2]));
      })),
    React.createElement(Fx, { key: 'f' })]);
}

// ══ SCENE 5 — Business Model (impact economy + evolution + moat) ══
function BusinessModel() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.06);
  const flow = ['Contribution', 'Verification', 'Receipt', 'Observed impact', 'Challenge window', 'Impact eligibility', 'Reward eligibility'];
  const stages = [['0', 'One mission'], ['1', 'Personal OS'], ['2', 'Org fabric'], ['3', 'Resource co-op'], ['4', 'Impact economy']];
  const moat = wn(p, 0.82, 1, 0.05);
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: GREEN, opacity: 0.26 * g, lt, count: 26 }),
    React.createElement(Eyebrow, { key: 'e', text: 'THE BUSINESS MODEL · VERIFIED-IMPACT ECONOMY', opacity: wn(p, 0.02, 0.96, 0.05), color: GREEN }),
    React.createElement(Line, { key: 't', text: 'Value is earned by proof — never manufactured.', y: 192, size: 44, color: rgba(IVORY, 0.9 * g),
      font: CINZEL, weight: 600, opacity: wn(p, 0.04, 0.96, 0.05) }),
    // impact flow chain
    React.createElement('div', { key: 'flow', style: { position: 'absolute', left: 0, right: 0, top: 320, display: 'flex', justifyContent: 'center',
      alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0 120px' } },
      flow.map((f, i) => {
        const a = 0.1 + i * 0.07;
        const o = wn(p, a, 0.99, 0.035);
        const last = i === flow.length - 1;
        return React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, opacity: o } },
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 20, padding: '12px 18px', borderRadius: 6,
            color: rgb(last ? GOLD_HI : IVORY), background: last ? rgba([40,32,14], 0.8) : rgba([16,26,46], 0.7),
            border: `1px solid ${rgba(last ? GOLD : GREEN, 0.4)}`, whiteSpace: 'nowrap' } }, f),
          !last ? React.createElement('div', { style: { color: rgba(GREEN, 0.5), fontSize: 22 } }, '→') : null);
      })),
    // product evolution stages
    React.createElement('div', { key: 'stg', style: { position: 'absolute', left: 0, right: 0, top: 500, display: 'flex', justifyContent: 'center', gap: 16, padding: '0 140px' } },
      stages.map((s, i) => {
        const a = 0.34 + i * 0.08;
        const o = wn(p, a, 0.99, 0.04);
        const now = i === 0;
        return React.createElement('div', { key: i, style: { flex: 1, maxWidth: 260, opacity: o, textAlign: 'center',
          transform: `translateY(${(1 - eo(sg(p, a, a + 0.05))) * 16}px)`, borderRadius: 10, padding: '22px 16px',
          background: now ? `linear-gradient(180deg, ${rgba([40,32,14],0.92)}, ${rgba([20,16,8],0.9)})` : rgba([14,24,42], 0.7),
          border: `1px solid ${rgba(now ? GOLD : DIM, now ? 0.5 : 0.24)}` } },
          React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 700, fontSize: 40, color: rgb(now ? GOLD_HI : mx(DIM, IVORY, 0.4)) } }, 'S' + s[0]),
          React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 20, color: rgba(now ? IVORY : DIM, 1), marginTop: 8 } }, s[1]),
          now ? React.createElement('div', { style: { fontFamily: MONO, fontSize: 13, color: rgba(GREEN, 0.9), marginTop: 8 } }, 'THE WEDGE') : null);
      })),
    // moat line
    React.createElement(Line, { key: 'moat', text: 'The moat is not the model. It is the sovereign mission graph — compounding, portable, owned by the node.',
      y: 780, size: 30, color: rgba(GOLD_HI, 0.92 * moat), font: CAIRO, weight: 600, opacity: moat, w: 1500 }),
    React.createElement(Line, { key: 'moat2', text: 'The longer BIZRA runs for one human, the more valuable — and less replaceable — that mission becomes.',
      y: 850, size: 24, color: rgba(DIM, moat), font: CAIRO, weight: 400, opacity: moat, w: 1400 }),
    React.createElement(Fx, { key: 'f' })]);
}

// ══ SCENE 6 — Category close ═════════════════════════════════════
function Category() {
  const { progress: p, localTime: lt } = useScene();
  const g = wn(p, 0, 1, 0.06);
  const contrast = [['Chatbots', 'answer'], ['Agents', 'act'], ['Workflows', 'coordinate'], ['Factories', 'scale']];
  const title = wn(p, 0.5, 1, 0.05);
  const contrastO = wn(p, 0.06, 0.52, 0.05);
  return sceneRoot([
    React.createElement(Motes, { key: 'm', color: GOLD_HI, opacity: 0.4 * g, lt, count: 46, drift: 30 }),
    // contrast list fades in then recedes as title takes over
    React.createElement('div', { key: 'con', style: { position: 'absolute', left: 0, right: 0, top: 260, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 14, opacity: contrastO * (1 - title * 0.85) } },
      contrast.map((c, i) => React.createElement('div', { key: i, style: { opacity: wn(p, 0.08 + i * 0.05, 0.54, 0.04), fontFamily: CINZEL, fontSize: 34 } },
        React.createElement('span', { style: { color: rgba(DIM, 0.9) } }, c[0] + ' '),
        React.createElement('span', { style: { color: rgba(IVORY, 0.6), fontStyle: 'italic' } }, c[1] + '.')))),
    // the title card
    React.createElement('div', { key: 't', style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', opacity: title,
      background: `radial-gradient(90% 90% at 50% 50%, rgba(4,8,15,${0.7 * title}) 30%, rgba(4,8,15,${0.3 * title}) 100%)` } },
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 26, letterSpacing: '0.42em', color: rgba(GOLD, 0.85), marginBottom: 22 } }, 'MISSION-CENTRIC COMPUTING'),
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 800, fontSize: 96, letterSpacing: '0.1em', color: rgb(IVORY), textShadow: `0 0 70px ${rgba(GOLD, 0.4)}` } }, 'BIZRA'),
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 32, letterSpacing: '0.22em', color: rgba(GOLD_HI, 0.95), marginTop: 12 } }, 'THE SOVEREIGN MISSION OPERATING SYSTEM'),
      React.createElement('div', { style: { width: 80, height: 1, background: `linear-gradient(90deg,transparent,${rgb(GOLD)},transparent)`, margin: '34px 0 28px' } }),
      React.createElement('div', { style: { fontFamily: CAIRO, fontWeight: 600, fontSize: 40, color: rgb(mx(IVORY, GOLD_HI, 0.25)) } }, 'Bring any model. Keep your mission. Prove the result.'),
      React.createElement('div', { dir: 'rtl', style: { fontFamily: CAIRO, fontSize: 30, color: rgba(IVORY, 0.7), marginTop: 22 } }, 'ذكاؤك قد يتغيّر… مهمّتك تبقى.'),
      React.createElement('div', { style: { fontFamily: MONO, fontSize: 22, letterSpacing: '0.28em', color: rgba(GOLD, 0.7), marginTop: 26 } }, 'bizra.ai · bizra.info')),
    React.createElement(Fx, { key: 'f' })]);
}

function MissionThesis() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  window.__MT = t;
  return React.createElement(React.Fragment, null,
    React.createElement(SceneStage, { width: W, height: H, bg: '#04080f', scenes: window.OM_SCENES, playback: window.OM_PLAYBACK },
      { ModelCentric, TheShift, KillerDemo, Guarantees, BusinessModel, Category }),
    React.createElement(window.TweaksPanel, null,
      React.createElement(window.TweakSection, { label: 'Motion' }),
      React.createElement(window.TweakToggle, { label: 'Motion editor', value: t.motionEditor, onChange: v => setTweak('motionEditor', v) }),
      React.createElement(window.TweakSection, { label: 'Look' }),
      React.createElement(window.TweakToggle, { label: 'Film grain', value: t.grain, onChange: v => setTweak('grain', v) }),
      React.createElement(window.TweakSlider, { label: 'Vignette', value: t.vignette, min: 0.2, max: 0.8, step: 0.05, onChange: v => setTweak('vignette', v) })));
}
window.MissionThesis = MissionThesis;
