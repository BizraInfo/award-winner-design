// bizra-federation-atlas.jsx — animated architecture film of the BIZRA topology
// Node0 → Gateway → URP → Peer federation. Camera tours a 3400×1900 world map;
// all motion driven by useScene() (time-stretch + export exact).
/* global React */
const { SceneStage, useScene } = window;
const clampV = (v, a, b) => Math.max(a, Math.min(b, v));
const easeIO = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const sg = (p, a, b) => clampV((p - a) / (b - a), 0, 1);
const winF = (p, a, b, f) => { f = f == null ? 0.05 : f; return Math.min(clampV((p - a) / f, 0, 1), clampV((b - p) / f, 0, 1)); };
const mixC = (a, b, t) => [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
const rgbaC = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const lerpN = (a, b, t) => a + (b - a) * t;

const VW = 1920, VH = 1080, WW = 3400, WH = 1900;
const CINZEL = "'Cinzel', serif", CAIRO = "'Cairo', sans-serif", MONO = "'JetBrains Mono', monospace";
const GOLD = [201,169,98], GOLD_HI = [232,200,112], IVORY = [246,242,233], RED = [207,106,90],
      GREEN = [127,217,176], BLUE = [159,176,224];
const ZC = { human: IVORY, n0: GOLD, gw: GOLD_HI, urp: GREEN, peer: BLUE, red: RED };

// ── node table (world coords) ───────────────────────────────────
const N = {
  h0:   { x:150, y:120, w:300, h:100, z:'human', t:'Human Sovereign', s:'node0 owner' },
  ui:   { x:150, y:300, w:300, h:110, z:'n0', t:'Dema Continuum', s:'mission cockpit' },
  mc:   { x:150, y:490, w:300, h:110, z:'n0', t:'Mission Contract', s:'objective · acceptance · limits' },
  dema: { x:540, y:300, w:370, h:130, z:'n0', t:'DEMA Cognitive Foundry', s:'understand · refine · coordinate' },
  pat:  { x:540, y:510, w:175, h:110, z:'n0', t:'PAT', s:'private think tank' },
  bat:  { x:735, y:510, w:175, h:110, z:'n0', t:'BAT', s:'local task force' },
  fate: { x:540, y:700, w:370, h:110, z:'red', t:'FATE Gate', s:'consent · policy · effect control' },
  run:  { x:1010, y:470, w:340, h:140, z:'n0', t:'Sovereign Runtime', s:'deterministic state machine' },
  mod:  { x:1010, y:690, w:340, h:90, z:'n0', t:'Intelligence Pool', s:'local models · APIs · tools' },
  mem:  { x:1010, y:820, w:340, h:90, z:'n0', t:'Sovereign Memory', s:'world state · knowledge graph' },
  rec:  { x:1010, y:950, w:340, h:90, z:'n0', t:'Receipt Spine', s:'hashes · signatures · rollback' },
  lurp: { x:1010, y:1080, w:340, h:90, z:'n0', t:'Local URP Controller', s:'resources · policies · offers' },
  gid:  { x:1600, y:360, w:400, h:90, z:'gw', t:'Node Identity', s:'signed chain head' },
  gcap: { x:1600, y:490, w:400, h:90, z:'gw', t:'Capability Manifest', s:'declared resources' },
  gcon: { x:1600, y:620, w:400, h:90, z:'gw', t:'Consent Envelopes', s:'root-bound' },
  ga2a: { x:1600, y:750, w:400, h:90, z:'gw', t:'A2A Mission Protocol', s:'node ↔ node' },
  gmcp: { x:1600, y:880, w:400, h:90, z:'gw', t:'MCP Tool Protocol', s:'capability calls' },
  gpriv:{ x:1600, y:1010, w:400, h:90, z:'red', t:'Data Boundary Firewall', s:'no raw data crosses' },
  disc: { x:2240, y:140, w:420, h:90, z:'urp', t:'Peer Discovery', s:'nodes · capabilities' },
  bus:  { x:2820, y:140, w:430, h:90, z:'urp', t:'Mission Exchange', s:'coordination bus' },
  sched:{ x:2240, y:290, w:420, h:90, z:'urp', t:'Resource Matching', s:'allocation' },
  sat:  { x:2240, y:500, w:420, h:100, z:'urp', t:'SAT Verification Network', s:'independent verifiers' },
  prov: { x:2820, y:500, w:430, h:100, z:'urp', t:'ISNAD Provenance Registry', s:'chain of transmission' },
  rep:  { x:2820, y:660, w:430, h:90, z:'urp', t:'Verified Contribution Graph', s:'reputation from proof' },
  poi:  { x:2820, y:810, w:430, h:90, z:'urp', t:'Proof-of-Impact Eligibility', s:'impact before reward' },
  set:  { x:2820, y:960, w:430, h:90, z:'urp', t:'Reward & Settlement', s:'governed · riba-zero' },
  gov:  { x:2240, y:960, w:420, h:100, z:'n0', t:'Constitution & Governance', s:'the law above all nodes' },
  n1:   { x:2240, y:1400, w:330, h:90, z:'peer', t:'Node1', s:'human + resources + agents' },
  n2:   { x:2610, y:1400, w:330, h:90, z:'peer', t:'Node2', s:'human + resources + agents' },
  n3:   { x:2960, y:1400, w:330, h:90, z:'peer', t:'Node3', s:'human + resources + agents' },
  nv:   { x:2420, y:1540, w:330, h:90, z:'peer', t:'Verifier Nodes', s:'SAT duty' },
  nr:   { x:2790, y:1540, w:330, h:90, z:'peer', t:'Resource Nodes', s:'specialized capacity' },
};
const CONTAINERS = [
  { x:90, y:60, w:1330, h:1210, z:'n0', label:'NODE0 — SOVEREIGN HOME NODE' },
  { x:1560, y:300, w:480, h:850, z:'gw', label:'GATEWAY' },
  { x:2180, y:60, w:1130, h:1210, z:'urp', label:'BIZRA URP — UNIVERSAL RESOURCE POOL' },
  { x:2180, y:1330, w:1130, h:430, z:'peer', label:'SOVEREIGN PEER NODES' },
];
const an = (id, side) => {
  const n = N[id];
  if (side === 't') return [n.x + n.w/2, n.y];
  if (side === 'b') return [n.x + n.w/2, n.y + n.h];
  if (side === 'l') return [n.x, n.y + n.h/2];
  return [n.x + n.w, n.y + n.h/2];
};
const mkE = (a, b, k, c) => ({ a, b, k: k || 0, c: c || GOLD });
const E = {
  h0_ui:   mkE(an('h0','b'), an('ui','t'), 0, IVORY),
  ui_mc:   mkE(an('ui','b'), an('mc','t')),
  mc_dema: mkE(an('mc','r'), an('dema','l'), -40),
  dema_pat:mkE(an('dema','b'), an('pat','t')),
  dema_bat:mkE(an('dema','b'), an('bat','t'), 20),
  pat_fate:mkE(an('pat','b'), an('fate','t'), -10),
  bat_fate:mkE(an('bat','b'), an('fate','t'), 10),
  fate_run:mkE(an('fate','r'), an('run','l'), -50, RED),
  run_mod: mkE(an('run','b'), an('mod','l'), -40),
  run_mem: mkE(an('run','b'), an('mem','l'), -70),
  run_rec: mkE(an('run','b'), an('rec','l'), -100),
  run_lurp:mkE(an('run','b'), an('lurp','l'), -130),
  rec_id:  mkE(an('rec','r'), an('gid','l'), -120, GOLD_HI),
  mem_priv:mkE(an('mem','r'), an('gpriv','l'), 60, RED),
  lurp_a2a:mkE(an('lurp','r'), an('ga2a','l'), -60, GOLD_HI),
  gw_urp:  mkE([2040,720], [2180,660], 0, GOLD_HI),
  sat_prov:mkE(an('sat','r'), an('prov','l'), 0, GREEN),
  prov_rep:mkE(an('prov','b'), an('rep','t'), 0, GREEN),
  rep_poi: mkE(an('rep','b'), an('poi','t'), 0, GREEN),
  poi_set: mkE(an('poi','b'), an('set','t'), 0, GREEN),
  gov_sat: mkE(an('gov','t'), an('sat','b'), 0, GOLD),
  gov_bus: mkE(an('gov','r'), an('bus','b'), 160, GOLD),
  urp_n1:  mkE([2745,1270], an('n1','t'), -40, BLUE),
  urp_n2:  mkE([2745,1270], an('n2','t'), 0, BLUE),
  urp_n3:  mkE([2745,1270], an('n3','t'), 40, BLUE),
  urp_nv:  mkE([2745,1270], an('nv','t'), -20, BLUE),
  urp_nr:  mkE([2745,1270], an('nr','t'), 20, BLUE),
};
const ctrlPt = e => {
  const mx = (e.a[0]+e.b[0])/2, my = (e.a[1]+e.b[1])/2;
  const dx = e.b[0]-e.a[0], dy = e.b[1]-e.a[1], L = Math.hypot(dx,dy) || 1;
  return [mx - dy/L*e.k, my + dx/L*e.k];
};
const qPoint = (e, t) => {
  const c = ctrlPt(e), u = 1 - t;
  return [u*u*e.a[0] + 2*u*t*c[0] + t*t*e.b[0], u*u*e.a[1] + 2*u*t*c[1] + t*t*e.b[1]];
};

// ── world renderer ──────────────────────────────────────────────
function World({ p, lt, cam, nodeAt, edgeAt, pulses, baseN, baseE }) {
  const e0 = easeIO(p);
  const s = lerpN(cam.from[2], cam.to[2], e0);
  const cx = lerpN(cam.from[0], cam.to[0], e0), cy = lerpN(cam.from[1], cam.to[1], e0);
  const tx = VW/2 - cx*s, ty = VH/2 - cy*s;
  const nl = id => Math.max(baseN, nodeAt && nodeAt[id] != null ? sg(p, nodeAt[id], nodeAt[id] + 0.05) : 0);
  const el = id => Math.max(baseE, edgeAt && edgeAt[id] != null ? sg(p, edgeAt[id], edgeAt[id] + 0.08) : 0);
  const edges = Object.keys(E).map(id => {
    const e = E[id], c = ctrlPt(e), i = el(id);
    const len = Math.hypot(e.b[0]-e.a[0], e.b[1]-e.a[1]) * 1.2;
    const drawn = edgeAt && edgeAt[id] != null ? sg(p, edgeAt[id], edgeAt[id] + 0.09) : 1;
    return React.createElement('path', { key: id,
      d: `M ${e.a[0]} ${e.a[1]} Q ${c[0]} ${c[1]} ${e.b[0]} ${e.b[1]}`, fill: 'none',
      stroke: rgbaC(e.c, 0.1 + 0.55 * i), strokeWidth: i > baseE ? 2.4 : 1.4,
      strokeDasharray: len, strokeDashoffset: len * (1 - drawn) });
  });
  const pulseEls = (pulses || []).map((pu, i) => {
    if (p < pu.t0 || p > pu.t1) return null;
    const pos = qPoint(E[pu.e], easeIO(sg(p, pu.t0, pu.t1)));
    const c = pu.c || GOLD_HI;
    return React.createElement('g', { key: 'p'+i },
      React.createElement('circle', { cx: pos[0], cy: pos[1], r: 16, fill: rgbaC(c, 0.18) }),
      React.createElement('circle', { cx: pos[0], cy: pos[1], r: 6.5, fill: rgbaC(c, 0.95) }),
      pu.label ? React.createElement('text', { x: pos[0], y: pos[1] - 24, textAnchor: 'middle',
        fontFamily: MONO, fontSize: 20, fill: rgbaC(c, 0.9) }, pu.label) : null);
  });
  return React.createElement('div', { style: { position: 'absolute', inset: 0, overflow: 'hidden' } },
    React.createElement('div', { style: { position: 'absolute', left: 0, top: 0, width: WW, height: WH,
      transform: `translate(${tx}px,${ty}px) scale(${s})`, transformOrigin: '0 0' } },
      CONTAINERS.map((c, i) => React.createElement('div', { key: i, style: { position: 'absolute',
        left: c.x, top: c.y, width: c.w, height: c.h, border: `1px solid ${rgbaC(ZC[c.z], 0.22)}`,
        borderRadius: 14, background: rgbaC(ZC[c.z], 0.025) } },
        React.createElement('div', { style: { position: 'absolute', top: -30, left: 14, fontFamily: MONO,
          fontSize: 20, letterSpacing: '0.24em', color: rgbaC(ZC[c.z], 0.6), whiteSpace: 'nowrap' } }, c.label))),
      React.createElement('svg', { width: WW, height: WH, viewBox: `0 0 ${WW} ${WH}`,
        style: { position: 'absolute', inset: 0 } }, edges),
      Object.keys(N).map(id => {
        const n = N[id], zc = ZC[n.z], i = nl(id);
        return React.createElement('div', { key: id, style: { position: 'absolute', left: n.x, top: n.y,
          width: n.w, height: n.h, borderRadius: 8, padding: '10px 18px', boxSizing: 'border-box',
          background: `linear-gradient(180deg, ${rgbaC([16,28,48], 0.95)}, ${rgbaC([8,16,30], 0.95)})`,
          border: `1px solid ${rgbaC(zc, 0.18 + 0.5 * i)}`, borderTop: `3px solid ${rgbaC(zc, 0.3 + 0.7 * i)}`,
          boxShadow: i > 0.3 ? `0 0 ${34 * i}px ${rgbaC(zc, 0.3 * i)}` : 'none' } },
          React.createElement('div', { style: { fontFamily: CAIRO, fontWeight: 700, fontSize: 26,
            color: rgbaC(mixC([150,165,195], IVORY, i), 0.95), lineHeight: 1.5, whiteSpace: 'nowrap',
            overflow: 'hidden' } }, n.t),
          React.createElement('div', { style: { fontFamily: MONO, fontSize: 14, marginTop: 2,
            color: rgbaC(zc, 0.35 + 0.45 * i), whiteSpace: 'nowrap', overflow: 'hidden' } }, n.s));
      }),
      React.createElement('svg', { width: WW, height: WH, viewBox: `0 0 ${WW} ${WH}`,
        style: { position: 'absolute', inset: 0, pointerEvents: 'none' } }, pulseEls)));
}
function Caption({ p, eyebrow, line, ar }) {
  const o = winF(p, 0.05, 0.96, 0.06);
  return React.createElement('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 54,
    textAlign: 'center', opacity: o, pointerEvents: 'none' } },
    React.createElement('div', { style: { fontFamily: CINZEL, fontSize: 21, fontWeight: 600,
      letterSpacing: '0.44em', color: rgbaC(GOLD, 0.85), marginBottom: 12 } }, eyebrow),
    React.createElement('div', { style: { fontFamily: CAIRO, fontSize: 32, fontWeight: 400,
      color: rgbaC(IVORY, 0.85) } }, line),
    ar ? React.createElement('div', { dir: 'rtl', style: { fontFamily: CAIRO, fontSize: 24,
      color: rgbaC(GOLD_HI, 0.6), marginTop: 8 } }, ar) : null);
}
function Fx() {
  const t = window.__FA || {};
  return React.createElement(React.Fragment, null,
    React.createElement('div', { style: { position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(120% 120% at 50% 46%, rgba(0,0,0,0) 44%, rgba(0,0,0,${t.vignette == null ? 0.5 : t.vignette}) 100%)` } }),
    t.grain === false ? null : React.createElement('div', { style: { position: 'absolute', inset: 0,
      pointerEvents: 'none', opacity: 0.4, mixBlendMode: 'overlay',
      backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.15) 0px, rgba(0,0,0,.15) 1px, transparent 1px, transparent 3px)' } }));
}
const BG = 'radial-gradient(130% 120% at 50% 40%, #0d1c31 0%, #081120 48%, #04080f 100%)';
function sceneRoot(children) {
  return React.createElement('div', { style: { position: 'absolute', inset: 0, background: BG, overflow: 'hidden' } }, children);
}

// ── scenes ──────────────────────────────────────────────────────
function Sovereign() {
  const { progress: p, localTime: lt } = useScene();
  return sceneRoot([
    React.createElement(World, { key: 'w', p, lt,
      cam: { from: [740, 640, 0.8], to: [790, 680, 0.9] },
      baseN: 0.06, baseE: 0.03,
      nodeAt: { h0: 0.03, ui: 0.11, mc: 0.19, dema: 0.29, pat: 0.39, bat: 0.43, fate: 0.53, run: 0.65, mod: 0.75, mem: 0.8, rec: 0.85, lurp: 0.9 },
      edgeAt: { h0_ui: 0.05, ui_mc: 0.13, mc_dema: 0.21, dema_pat: 0.33, dema_bat: 0.37, pat_fate: 0.46, bat_fate: 0.48, fate_run: 0.58, run_mod: 0.72, run_mem: 0.77, run_rec: 0.82, run_lurp: 0.87 },
      pulses: [
        { e: 'h0_ui', t0: 0.06, t1: 0.13, c: IVORY }, { e: 'ui_mc', t0: 0.14, t1: 0.21 },
        { e: 'mc_dema', t0: 0.22, t1: 0.31 }, { e: 'dema_pat', t0: 0.34, t1: 0.42 },
        { e: 'pat_fate', t0: 0.47, t1: 0.55 }, { e: 'fate_run', t0: 0.59, t1: 0.67, c: RED },
        { e: 'run_rec', t0: 0.82, t1: 0.9 },
      ] }),
    React.createElement(Caption, { key: 'c', p, eyebrow: 'NODE0 — THE SOVEREIGN HOME NODE',
      line: 'Intent becomes a contract. The foundry proposes. FATE consents. The runtime acts — and every act leaves a receipt.',
      ar: 'المهمة تحكم النموذج، والموافقة تحكم الفعل' }),
    React.createElement(Fx, { key: 'f' })]);
}
function Boundary() {
  const { progress: p, localTime: lt } = useScene();
  return sceneRoot([
    React.createElement(World, { key: 'w', p, lt,
      cam: { from: [1480, 740, 0.82], to: [1800, 720, 0.98] },
      baseN: 0.1, baseE: 0.05,
      nodeAt: { gid: 0.1, gcap: 0.2, gcon: 0.3, ga2a: 0.4, gmcp: 0.5, gpriv: 0.6, rec: 0.04, mem: 0.04, lurp: 0.04 },
      edgeAt: { rec_id: 0.08, lurp_a2a: 0.36, mem_priv: 0.54, gw_urp: 0.78 },
      pulses: [
        { e: 'rec_id', t0: 0.12, t1: 0.3, label: 'RCPT' },
        { e: 'lurp_a2a', t0: 0.4, t1: 0.55, label: 'OFFER' },
        { e: 'mem_priv', t0: 0.58, t1: 0.7, c: RED, label: 'BLOCKED' },
        { e: 'gw_urp', t0: 0.82, t1: 0.95, label: 'RCPT' },
      ] }),
    React.createElement(Caption, { key: 'c', p, eyebrow: 'THE GATEWAY — A FAIL-CLOSED MEMBRANE',
      line: 'No raw data crosses. Identity, capability, and root-bound consent — only signed receipts leave the node.' }),
    React.createElement(Fx, { key: 'f' })]);
}
function Commons() {
  const { progress: p, localTime: lt } = useScene();
  return sceneRoot([
    React.createElement(World, { key: 'w', p, lt,
      cam: { from: [2520, 590, 0.72], to: [2745, 640, 0.84] },
      baseN: 0.08, baseE: 0.04,
      nodeAt: { disc: 0.05, bus: 0.11, sched: 0.17, sat: 0.28, prov: 0.4, rep: 0.5, poi: 0.6, set: 0.7, gov: 0.82 },
      edgeAt: { sat_prov: 0.32, prov_rep: 0.44, rep_poi: 0.54, poi_set: 0.64, gov_sat: 0.84, gov_bus: 0.88 },
      pulses: [
        { e: 'sat_prov', t0: 0.34, t1: 0.43, c: GREEN }, { e: 'prov_rep', t0: 0.46, t1: 0.53, c: GREEN },
        { e: 'rep_poi', t0: 0.56, t1: 0.63, c: GREEN }, { e: 'poi_set', t0: 0.66, t1: 0.74, c: GREEN },
        { e: 'gov_sat', t0: 0.86, t1: 0.94 },
      ] }),
    React.createElement(Caption, { key: 'c', p, eyebrow: 'THE COMMONS — UNIVERSAL RESOURCE POOL',
      line: 'Verification before provenance. Provenance before reputation. Impact before reward — and the constitution above all.' }),
    React.createElement(Fx, { key: 'f' })]);
}
function Federation() {
  const { progress: p, localTime: lt } = useScene();
  return sceneRoot([
    React.createElement(World, { key: 'w', p, lt,
      cam: { from: [2745, 950, 0.6], to: [2745, 1180, 0.7] },
      baseN: 0.1, baseE: 0.05,
      nodeAt: { n1: 0.14, n2: 0.24, n3: 0.34, nv: 0.48, nr: 0.58 },
      edgeAt: { urp_n1: 0.1, urp_n2: 0.2, urp_n3: 0.3, urp_nv: 0.44, urp_nr: 0.54 },
      pulses: [
        { e: 'urp_n1', t0: 0.62, t1: 0.72, c: BLUE }, { e: 'urp_n2', t0: 0.68, t1: 0.78, c: BLUE },
        { e: 'urp_n3', t0: 0.74, t1: 0.84, c: BLUE },
      ] }),
    React.createElement(Caption, { key: 'c', p, eyebrow: 'THE FEDERATION — SOVEREIGN PEERS',
      line: 'Every peer is a whole sovereign — human, resources, agents. The pool holds proofs, never people.' }),
    React.createElement(Fx, { key: 'f' })]);
}
const LOOP_SEQ = ['h0_ui','ui_mc','mc_dema','dema_pat','pat_fate','fate_run','run_lurp','lurp_a2a','gw_urp','sat_prov','prov_rep','rep_poi','poi_set'];
function OneLoop() {
  const { progress: p, localTime: lt } = useScene();
  const t0 = 0.06, t1 = 0.76, step = (t1 - t0) / LOOP_SEQ.length;
  const title = winF(p, 0.8, 1, 0.06);
  return sceneRoot([
    React.createElement(World, { key: 'w', p, lt,
      cam: { from: [1700, 950, 0.545], to: [1700, 930, 0.575] },
      baseN: 0.5, baseE: 0.3,
      nodeAt: {}, edgeAt: {},
      pulses: LOOP_SEQ.map((e, i) => ({ e, t0: t0 + i * step, t1: t0 + (i + 1) * step + 0.008 })) }),
    React.createElement(Caption, { key: 'c', p: Math.min(p, 0.79), eyebrow: 'ONE LOOP',
      line: 'From one human’s intent to a federated proof — receipts all the way through.' }),
    React.createElement('div', { key: 't', style: { position: 'absolute', inset: 0, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: title,
      background: `radial-gradient(90% 90% at 50% 50%, rgba(4,8,15,${0.86 * title}) 30%, rgba(4,8,15,${0.6 * title}) 100%)` } },
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 800, fontSize: 118,
        letterSpacing: '0.12em', color: rgbaC(IVORY, 1), textShadow: `0 0 70px ${rgbaC(GOLD, 0.4)}` } }, 'BIZRA'),
      React.createElement('div', { style: { fontFamily: CINZEL, fontWeight: 600, fontSize: 30,
        letterSpacing: '0.42em', color: rgbaC(GOLD_HI, 0.95), marginTop: 14 } }, 'ONE HUMAN · ONE NODE · ONE FEDERATION'),
      React.createElement('div', { dir: 'rtl', style: { fontFamily: CAIRO, fontSize: 30,
        color: rgbaC(IVORY, 0.7), marginTop: 30 } }, 'من نيّة إنسانٍ واحد… إلى برهانٍ تتشاركه الغابة')),
    React.createElement(Fx, { key: 'f' })]);
}

// ── root ────────────────────────────────────────────────────────
function FederationAtlas() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  window.__FA = t;
  return React.createElement(React.Fragment, null,
    React.createElement(SceneStage, { width: VW, height: VH, bg: '#04080f',
      scenes: window.OM_SCENES, playback: window.OM_PLAYBACK },
      { Sovereign, Boundary, Commons, Federation, OneLoop }),
    React.createElement(window.TweaksPanel, null,
      React.createElement(window.TweakSection, { label: 'Motion' }),
      React.createElement(window.TweakToggle, { label: 'Motion editor', value: t.motionEditor, onChange: v => setTweak('motionEditor', v) }),
      React.createElement(window.TweakSection, { label: 'Look' }),
      React.createElement(window.TweakToggle, { label: 'Film grain', value: t.grain, onChange: v => setTweak('grain', v) }),
      React.createElement(window.TweakSlider, { label: 'Vignette', value: t.vignette, min: 0.2, max: 0.8, step: 0.05, onChange: v => setTweak('vignette', v) })));
}
window.FederationAtlas = FederationAtlas;
