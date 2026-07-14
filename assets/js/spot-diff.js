/* Recall — Spot the Difference · scene engine
 * Each scene = { id, name, vb:[W,H], base:[el...], diffs:[{id,mx,my,apply(ctx)}...] }
 * A "round" activates a random subset (6..24) of a scene's diff pool, so every
 * stage is different. base = the ORIGINAL panel; diffs are applied to build the
 * MODIFIED panel. Marker (mx,my) locates each active difference for Reveal.
 */
(function () {
  // ---- Recall palette ----
  const PAL = ['hsl(349,71%,52%)', 'hsl(230,86%,62%)', 'hsl(39,89%,49%)', 'hsl(189,59%,53%)', 'hsl(261,73%,60%)'];
  const RED = PAL[0], BLUE = PAL[1], YEL = PAL[2], CYA = PAL[3], PUR = PAL[4];
  const LINE = 'hsl(214,22%,58%)';           // structural lines on navy
  const FAINT = 'rgba(255,255,255,0.14)';
  function rotate(c) { const i = PAL.indexOf(c); return i < 0 ? CYA : PAL[(i + 2) % PAL.length]; }

  // ---- seeded RNG (stable layouts) ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- element -> svg ----
  function el2svg(e) {
    if (!e) return '';
    const op = e.opacity != null ? ` opacity="${e.opacity}"` : '';
    const st = e.stroke ? ` stroke="${e.stroke}" stroke-width="${e.sw || 2}" stroke-linecap="round" stroke-linejoin="round"` : '';
    switch (e.type) {
      case 'circle': return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="${e.fill || 'none'}"${st}${op}/>`;
      case 'ring': return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="none" stroke="${e.stroke}" stroke-width="${e.sw || 3}"${op}/>`;
      case 'rect': return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.rx || 0}" fill="${e.fill || 'none'}"${st}${op}/>`;
      case 'line': return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.stroke}" stroke-width="${e.sw || 2}" stroke-linecap="round"${op}/>`;
      case 'ellipse': return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="${e.fill || 'none'}" transform="rotate(${e.rot || 0} ${e.cx} ${e.cy})"${op}/>`;
      case 'poly': return `<polygon points="${e.pts.map(p => p.join(',')).join(' ')}" fill="${e.fill || 'none'}"${st}${op}/>`;
      case 'path': return `<path d="${e.d}" fill="${e.fill || 'none'}"${st}${op}/>`;
    }
    return '';
  }

  // apply context for building the modified panel
  function makeCtx(base) {
    const arr = base.map(e => Object.assign({}, e));
    const idx = {}; arr.forEach((e, i) => (idx[e.id] = i));
    return {
      arr,
      get: id => arr[idx[id]],
      remove: id => { if (idx[id] != null) arr[idx[id]] = null; },
      add: e => { arr.push(e); },
      recolor: (id, c) => { const e = arr[idx[id]]; if (e) e.fill = c; },
      replace: (id, e) => { if (idx[id] != null) arr[idx[id]] = Object.assign({ id }, e); },
    };
  }

  // =====================================================================
  // SCENE 1 — SYNAPSE  (nodes + connections; the brand-signature scene)
  // =====================================================================
  function buildSynapse() {
    const W = 440, H = 340, rng = mulberry32(7);
    const nodes = [], N = 11, margin = 52;
    let tries = 0;
    while (nodes.length < N && tries < 4000) {
      tries++;
      const x = margin + rng() * (W - 2 * margin), y = margin + rng() * (H - 2 * margin);
      if (nodes.every(n => Math.hypot(n.x - x, n.y - y) > 68)) nodes.push({ x: Math.round(x), y: Math.round(y) });
    }
    nodes.forEach((n, i) => { n.id = 'n' + i; n.r = 11 + (i % 3) * 3; n.fill = PAL[i % PAL.length]; });
    const edges = [], eset = new Set();
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d);
      near.slice(0, 2).forEach(o => {
        const k = [Math.min(i, o.j), Math.max(i, o.j)].join('-');
        if (!eset.has(k)) { eset.add(k); edges.push({ id: 'e' + edges.length, a: i, b: o.j }); }
      });
    });
    const deg = {}; edges.forEach(e => { deg[e.a] = (deg[e.a] || 0) + 1; deg[e.b] = (deg[e.b] || 0) + 1; });
    const base = [];
    edges.forEach(e => base.push({ id: e.id, type: 'line', x1: nodes[e.a].x, y1: nodes[e.a].y, x2: nodes[e.b].x, y2: nodes[e.b].y, stroke: LINE, sw: 3, opacity: 0.7 }));
    nodes.forEach(n => base.push({ id: n.id, type: 'circle', cx: n.x, cy: n.y, r: n.r, fill: n.fill }));

    const diffs = [];
    nodes.forEach(n => diffs.push({ id: 're_' + n.id, mx: n.x, my: n.y, apply: c => c.recolor(n.id, rotate(n.fill)) }));
    nodes.forEach((n, i) => { if ((deg[i] || 0) <= 1) diffs.push({ id: 'rm_' + n.id, mx: n.x, my: n.y, apply: c => c.remove(n.id) }); });
    edges.forEach((e, i) => { if (i % 2 === 0) diffs.push({ id: 'rme_' + e.id, mx: (nodes[e.a].x + nodes[e.b].x) / 2, my: (nodes[e.a].y + nodes[e.b].y) / 2, apply: c => c.remove(e.id) }); });
    // grow a node (radius change)
    nodes.forEach((n, i) => { if (i % 3 === 1) diffs.push({ id: 'gr_' + n.id, mx: n.x, my: n.y, apply: c => { const g = c.get(n.id); if (g) g.r = n.r + 7; } }); });
    // add phantom nodes near existing ones
    const addSpots = [[0, 40, -30], [3, -34, 26], [6, 30, 34], [8, -30, -28]];
    addSpots.forEach(([ni, dx, dy], k) => {
      if (!nodes[ni]) return;
      const x = nodes[ni].x + dx, y = nodes[ni].y + dy, col = PAL[(k + 2) % PAL.length];
      diffs.push({ id: 'ad_s' + k, mx: x, my: y, apply: c => { c.add({ id: 'ad_s' + k, type: 'line', x1: nodes[ni].x, y1: nodes[ni].y, x2: x, y2: y, stroke: LINE, sw: 3, opacity: 0.7 }); c.add({ id: 'ad_sn' + k, type: 'circle', cx: x, cy: y, r: 10, fill: col }); } });
    });
    return { id: 'synapse', name: 'Synapse', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 2 — SKYLINE  (buildings + lit windows + moon)
  // =====================================================================
  function buildSkyline() {
    const W = 440, H = 340, rng = mulberry32(23), baseY = 300;
    const base = [], diffs = [];
    base.push({ id: 'ground', type: 'rect', x: 0, y: baseY, w: W, h: H - baseY, fill: 'rgba(255,255,255,0.05)' });
    // moon + stars
    base.push({ id: 'moon', type: 'circle', cx: 372, cy: 66, r: 26, fill: YEL });
    diffs.push({ id: 're_moon', mx: 372, my: 66, apply: c => c.recolor('moon', CYA) });
    const stars = [[60, 50], [120, 84], [210, 44], [286, 92], [92, 120]];
    stars.forEach(([x, y], i) => {
      base.push({ id: 'star' + i, type: 'circle', cx: x, cy: y, r: 3, fill: '#dfe6f5', opacity: 0.85 });
      if (i % 2 === 0) diffs.push({ id: 'rm_star' + i, mx: x, my: y, apply: c => c.remove('star' + i) });
    });
    // buildings
    const builds = []; let x = 30;
    while (x < W - 54) { const w = 40 + rng() * 26, h = 96 + rng() * 150; builds.push({ x: Math.round(x), w: Math.round(w), h: Math.round(h) }); x += w + 8 + rng() * 12; }
    builds.forEach((b, bi) => {
      const fill = PAL[bi % PAL.length]; const top = baseY - b.h;
      base.push({ id: 'bld' + bi, type: 'rect', x: b.x, y: top, w: b.w, h: b.h, rx: 4, fill });
      diffs.push({ id: 're_bld' + bi, mx: b.x + b.w / 2, my: top + 26, apply: c => c.recolor('bld' + bi, rotate(fill)) });
      if (b.h < 170) diffs.push({ id: 'rm_bld' + bi, mx: b.x + b.w / 2, my: top + b.h / 2, apply: c => c.remove('bld' + bi) });
      // windows
      const cols = Math.max(2, Math.floor((b.w - 12) / 15)), rows = Math.floor((b.h - 22) / 20);
      const gw = (b.w - 8) / cols;
      for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
        const wx = b.x + 6 + col * gw, wy = top + 12 + r * 20, lit = ((r + col + bi) % 3 !== 0);
        const id = `w${bi}_${r}_${col}`;
        base.push({ id, type: 'rect', x: wx, y: wy, w: 8, h: 10, rx: 1.5, fill: lit ? YEL : 'rgba(255,255,255,0.16)' });
      }
      // window diffs — sample some to toggle off, some recolor
      for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
        const id = `w${bi}_${r}_${col}`, wx = b.x + 6 + col * gw, wy = top + 12 + r * 20;
        if ((r * 3 + col + bi) % 7 === 0) diffs.push({ id: 'off_' + id, mx: wx + 4, my: wy + 5, apply: c => c.recolor(id, 'rgba(255,255,255,0.16)') });
        if ((r * 2 + col + bi) % 9 === 0) diffs.push({ id: 'lit_' + id, mx: wx + 4, my: wy + 5, apply: c => c.recolor(id, CYA) });
      }
      // antenna add on tall buildings
      if (b.h > 150) { const ax = b.x + b.w / 2; diffs.push({ id: 'ant_' + bi, mx: ax, my: top - 16, apply: c => { c.add({ id: 'ant_' + bi, type: 'line', x1: ax, y1: top, x2: ax, y2: top - 26, stroke: LINE, sw: 3 }); c.add({ id: 'antd_' + bi, type: 'circle', cx: ax, cy: top - 28, r: 4, fill: RED }); } }); }
    });
    return { id: 'skyline', name: 'Skyline', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 3 — GARDEN  (flowers, sun, clouds, butterflies)
  // =====================================================================
  function buildGarden() {
    const W = 440, H = 340, groundY = 288;
    const base = [], diffs = [];
    base.push({ id: 'ground', type: 'rect', x: 0, y: groundY, w: W, h: H - groundY, fill: 'rgba(255,255,255,0.06)' });
    // sun with rays
    const sx = 66, sy = 64;
    base.push({ id: 'sun', type: 'circle', cx: sx, cy: sy, r: 24, fill: YEL });
    diffs.push({ id: 're_sun', mx: sx, my: sy, apply: c => c.recolor('sun', RED) });
    for (let i = 0; i < 8; i++) {
      const a = i * 45 * Math.PI / 180, x1 = sx + 30 * Math.cos(a), y1 = sy + 30 * Math.sin(a), x2 = sx + 40 * Math.cos(a), y2 = sy + 40 * Math.sin(a);
      base.push({ id: 'ray' + i, type: 'line', x1, y1, x2, y2, stroke: YEL, sw: 4 });
      if (i % 2 === 0) diffs.push({ id: 'rm_ray' + i, mx: x2, my: y2, apply: c => c.remove('ray' + i) });
    }
    // clouds
    const clouds = [[210, 70], [330, 110]];
    clouds.forEach(([cx, cy], i) => {
      base.push({ id: 'cloud' + i, type: 'ellipse', cx, cy, rx: 34, ry: 15, rot: 0, fill: 'rgba(255,255,255,0.5)' });
      diffs.push({ id: 're_cloud' + i, mx: cx, my: cy, apply: c => c.recolor('cloud' + i, 'rgba(255,255,255,0.85)') });
      if (i === 1) diffs.push({ id: 'rm_cloud' + i, mx: cx, my: cy, apply: c => c.remove('cloud' + i) });
    });
    // flowers
    const fx = [90, 165, 240, 315, 388];
    fx.forEach((x, fi) => {
      const cy = 200 - (fi % 2) * 24, petal = PAL[fi % PAL.length], ctr = PAL[(fi + 3) % PAL.length];
      base.push({ id: 'stem' + fi, type: 'line', x1: x, y1: groundY, x2: x, y2: cy, stroke: CYA, sw: 4, opacity: 0.8 });
      const pIds = [];
      for (let p = 0; p < 6; p++) {
        const a = p * 60 * Math.PI / 180, px = x + 15 * Math.cos(a), py = cy + 15 * Math.sin(a), id = `pet${fi}_${p}`;
        base.push({ id, type: 'ellipse', cx: px, cy: py, rx: 11, ry: 7, rot: p * 60, fill: petal });
        pIds.push(id);
      }
      base.push({ id: 'ctr' + fi, type: 'circle', cx: x, cy, r: 9, fill: ctr });
      // diffs: whole-flower petal recolor, center recolor, drop one petal, remove flower, leaf
      diffs.push({ id: 're_pet' + fi, mx: x, my: cy, apply: c => pIds.forEach(id => c.recolor(id, rotate(petal))) });
      diffs.push({ id: 're_ctr' + fi, mx: x, my: cy, apply: c => c.recolor('ctr' + fi, rotate(ctr)) });
      diffs.push({ id: 'rm_pet' + fi, mx: x + 15, my: cy, apply: c => c.remove(pIds[0]) });
      if (fi % 2 === 1) diffs.push({ id: 'rm_flw' + fi, mx: x, my: cy, apply: c => { pIds.forEach(id => c.remove(id)); c.remove('ctr' + fi); c.remove('stem' + fi); } });
      // leaf add on stem
      const ly = (groundY + cy) / 2;
      diffs.push({ id: 'lf' + fi, mx: x + 12, my: ly, apply: c => c.add({ id: 'lf' + fi, type: 'ellipse', cx: x + 12, cy: ly, rx: 10, ry: 5, rot: -30, fill: CYA }) });
    });
    // butterflies (add-only)
    [[150, 120, RED], [300, 175, PUR]].forEach(([x, y, col], i) => {
      diffs.push({ id: 'bfly' + i, mx: x, my: y, apply: c => { c.add({ id: 'bfa' + i, type: 'circle', cx: x - 6, cy: y, r: 7, fill: col }); c.add({ id: 'bfb' + i, type: 'circle', cx: x + 6, cy: y, r: 7, fill: col }); c.add({ id: 'bfc' + i, type: 'circle', cx: x, cy: y, r: 3, fill: '#fff' }); } });
    });
    return { id: 'garden', name: 'Garden', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 4 — CIRCUIT  (board, chips, vias, traces, LEDs)
  // =====================================================================
  function buildCircuit() {
    const W = 440, H = 340, rng = mulberry32(41);
    const base = [], diffs = [];
    base.push({ id: 'board', type: 'rect', x: 24, y: 24, w: W - 48, h: H - 48, rx: 16, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.12)', sw: 2 });
    // traces
    const traces = [[40, 80, 200, 80], [200, 80, 200, 200], [200, 200, 380, 200], [80, 260, 260, 260], [300, 60, 300, 150], [120, 120, 120, 240]];
    traces.forEach((t, i) => {
      base.push({ id: 'tr' + i, type: 'line', x1: t[0], y1: t[1], x2: t[2], y2: t[3], stroke: CYA, sw: 3, opacity: 0.7 });
      if (i % 2 === 0) diffs.push({ id: 're_tr' + i, mx: (t[0] + t[2]) / 2, my: (t[1] + t[3]) / 2, apply: c => c.recolor('tr' + i, PUR) });
      if (i % 3 === 0) diffs.push({ id: 'rm_tr' + i, mx: (t[0] + t[2]) / 2, my: (t[1] + t[3]) / 2, apply: c => c.remove('tr' + i) });
    });
    // chips
    const chips = [[150, 130, 70, 50, BLUE], [250, 220, 84, 44, RED], [300, 90, 56, 40, PUR]];
    chips.forEach((ch, i) => {
      const [x, y, w, h, fill] = ch;
      base.push({ id: 'chip' + i, type: 'rect', x, y, w, h, rx: 6, fill });
      diffs.push({ id: 're_chip' + i, mx: x + w / 2, my: y + h / 2, apply: c => c.recolor('chip' + i, rotate(fill)) });
      if (i === 2) diffs.push({ id: 'rm_chip' + i, mx: x + w / 2, my: y + h / 2, apply: c => c.remove('chip' + i) });
      // pins
      const pins = Math.floor(w / 14);
      for (let p = 0; p < pins; p++) {
        const px = x + 8 + p * 14;
        base.push({ id: `pin${i}_${p}t`, type: 'line', x1: px, y1: y, x2: px, y2: y - 7, stroke: LINE, sw: 3 });
        base.push({ id: `pin${i}_${p}b`, type: 'line', x1: px, y1: y + h, x2: px, y2: y + h + 7, stroke: LINE, sw: 3 });
        if (p % 2 === 0) diffs.push({ id: `rmpin${i}_${p}`, mx: px, my: y - 7, apply: c => c.remove(`pin${i}_${p}t`) });
      }
    });
    // vias grid
    let vi = 0;
    for (let gx = 60; gx <= 380; gx += 40) for (let gy = 60; gy <= 260; gy += 40) {
      if (rng() < 0.42) {
        const id = 'via' + (vi++);
        base.push({ id, type: 'circle', cx: gx, cy: gy, r: 5, fill: YEL, opacity: 0.9 });
        if (vi % 2 === 0) diffs.push({ id: 'rm_' + id, mx: gx, my: gy, apply: c => c.remove(id) });
        else diffs.push({ id: 're_' + id, mx: gx, my: gy, apply: c => c.recolor(id, CYA) });
      } else if (rng() < 0.3) {
        // add-only via
        diffs.push({ id: 'add_via' + gx + '_' + gy, mx: gx, my: gy, apply: c => c.add({ id: 'av' + gx + '_' + gy, type: 'circle', cx: gx, cy: gy, r: 5, fill: RED }) });
      }
    }
    return { id: 'circuit', name: 'Circuit', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 5 — MOSAIC  (grid of shapes — guaranteed rich diff pool)
  // =====================================================================
  function tile(kind, cx, cy, s, fill, id) {
    if (kind === 'circle') return { id, type: 'circle', cx, cy, r: s * 0.5, fill };
    if (kind === 'square') return { id, type: 'rect', x: cx - s * 0.5, y: cy - s * 0.5, w: s, h: s, rx: 6, fill };
    if (kind === 'tri') return { id, type: 'poly', pts: [[cx, cy - s * 0.55], [cx + s * 0.55, cy + s * 0.5], [cx - s * 0.55, cy + s * 0.5]], fill };
    return { id, type: 'poly', pts: [[cx, cy - s * 0.6], [cx + s * 0.55, cy], [cx, cy + s * 0.6], [cx - s * 0.55, cy]], fill }; // diamond
  }
  function buildMosaic() {
    const W = 440, H = 340, rng = mulberry32(89);
    const base = [], diffs = [];
    const cols = 6, rows = 4, mx0 = 46, my0 = 58, sx = (W - 2 * mx0) / (cols - 1), sy = (H - 2 * my0) / (rows - 1), s = 46;
    const kinds = ['circle', 'square', 'tri', 'diamond'];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = Math.round(mx0 + c * sx), cy = Math.round(my0 + r * sy);
      const kind = kinds[Math.floor(rng() * kinds.length)], fill = PAL[Math.floor(rng() * PAL.length)], id = `t${r}_${c}`;
      base.push(tile(kind, cx, cy, s, fill, id));
      // every tile: recolor OR reshape OR remove (mix so pool is varied)
      const roll = (r * cols + c) % 3;
      if (roll === 0) diffs.push({ id: 're_' + id, mx: cx, my: cy, apply: cx2 => cx2.recolor(id, rotate(fill)) });
      else if (roll === 1) { const nk = kinds[(kinds.indexOf(kind) + 1) % kinds.length]; diffs.push({ id: 'sh_' + id, mx: cx, my: cy, apply: cx2 => cx2.replace(id, tile(nk, cx, cy, s, fill)) }); }
      else diffs.push({ id: 'rm_' + id, mx: cx, my: cy, apply: cx2 => cx2.remove(id) });
    }
    return { id: 'mosaic', name: 'Mosaic', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 6 — COSMOS  (sun, orbits, planets, moons, stars, comet)
  // =====================================================================
  function buildCosmos() {
    const W = 440, H = 340, cx = 220, cy = 172, rng = mulberry32(53);
    const base = [], diffs = [];
    for (let i = 0; i < 14; i++) {
      const x = Math.round(18 + rng() * (W - 36)), y = Math.round(14 + rng() * (H - 28)), id = 'st' + i;
      base.push({ id, type: 'circle', cx: x, cy: y, r: 2 + (i % 3), fill: '#dfe6f5', opacity: 0.85 });
      if (i % 2 === 0) diffs.push({ id: 'rm_st' + i, mx: x, my: y, apply: c => c.remove(id) });
      else diffs.push({ id: 're_st' + i, mx: x, my: y, apply: c => c.recolor(id, YEL) });
    }
    base.push({ id: 'sun', type: 'circle', cx, cy, r: 22, fill: YEL });
    diffs.push({ id: 're_sun', mx: cx, my: cy, apply: c => c.recolor('sun', RED) });
    const orbits = [46, 80, 114, 150], cols = [RED, BLUE, CYA, PUR];
    orbits.forEach((rr, oi) => {
      base.push({ id: 'orb' + oi, type: 'ring', cx, cy, r: rr, stroke: 'rgba(255,255,255,0.14)', sw: 2 });
      if (oi % 2 === 0) diffs.push({ id: 'rm_orb' + oi, mx: cx + rr, my: cy, apply: c => c.remove('orb' + oi) });
      const ang = (oi * 57 + 30) * Math.PI / 180;
      const px = Math.round(cx + rr * Math.cos(ang)), py = Math.round(cy + rr * Math.sin(ang)), col = cols[oi % cols.length];
      base.push({ id: 'pl' + oi, type: 'circle', cx: px, cy: py, r: 10 + oi, fill: col });
      diffs.push({ id: 're_pl' + oi, mx: px, my: py, apply: c => c.recolor('pl' + oi, rotate(col)) });
      diffs.push({ id: 'gr_pl' + oi, mx: px, my: py, apply: c => { const g = c.get('pl' + oi); if (g) g.r = 10 + oi + 6; } });
      if (oi % 2 === 1) diffs.push({ id: 'rm_pl' + oi, mx: px, my: py, apply: c => c.remove('pl' + oi) });
      diffs.push({ id: 'mn' + oi, mx: px + 16, my: py - 12, apply: c => c.add({ id: 'mn' + oi, type: 'circle', cx: px + 16, cy: py - 12, r: 4, fill: '#dfe6f5' }) });
    });
    diffs.push({ id: 'comet', mx: 366, my: 68, apply: c => { c.add({ id: 'comet', type: 'circle', cx: 366, cy: 68, r: 7, fill: CYA }); c.add({ id: 'cometT', type: 'line', x1: 366, y1: 68, x2: 398, y2: 48, stroke: CYA, sw: 3, opacity: 0.6 }); } });
    return { id: 'cosmos', name: 'Cosmos', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 7 — REEF  (fish, seaweed, bubbles, starfish)
  // =====================================================================
  function buildReef() {
    const W = 440, H = 340, rng = mulberry32(67);
    const base = [], diffs = [];
    base.push({ id: 'water', type: 'rect', x: 0, y: 0, w: W, h: H, fill: 'rgba(70,150,190,0.08)' });
    base.push({ id: 'sand', type: 'rect', x: 0, y: 302, w: W, h: 38, fill: 'rgba(255,220,150,0.12)' });
    const weeds = [60, 108, 356, 396];
    weeds.forEach((x, i) => {
      const col = [CYA, PUR, YEL, RED][i % 4];
      base.push({ id: 'wd' + i, type: 'path', d: `M${x},304 C${x - 14},270 ${x + 14},240 ${x},206`, stroke: col, sw: 6, opacity: 0.85 });
      diffs.push({ id: 're_wd' + i, mx: x, my: 255, apply: c => { const g = c.get('wd' + i); if (g) g.stroke = rotate(col); } });
      if (i % 2 === 0) diffs.push({ id: 'rm_wd' + i, mx: x, my: 255, apply: c => c.remove('wd' + i) });
    });
    const fishes = [[118, 118, 20, RED, 1], [300, 150, 24, BLUE, -1], [200, 224, 18, YEL, 1], [346, 92, 16, PUR, -1], [84, 240, 20, CYA, 1]];
    fishes.forEach((fz, i) => {
      const [x, y, s, col, dir] = fz, tailX = x - dir * s * 0.9;
      base.push({ id: 'fb' + i, type: 'ellipse', cx: x, cy: y, rx: s, ry: s * 0.62, rot: 0, fill: col });
      base.push({ id: 'ft' + i, type: 'poly', pts: [[tailX, y], [tailX - dir * s * 0.5, y - s * 0.5], [tailX - dir * s * 0.5, y + s * 0.5]], fill: col });
      base.push({ id: 'fe' + i, type: 'circle', cx: x + dir * s * 0.45, cy: y - s * 0.15, r: Math.max(2, s * 0.12), fill: '#12203c' });
      diffs.push({ id: 're_f' + i, mx: x, my: y, apply: c => { c.recolor('fb' + i, rotate(col)); c.recolor('ft' + i, rotate(col)); } });
      diffs.push({ id: 'gr_f' + i, mx: x, my: y, apply: c => { const g = c.get('fb' + i); if (g) { g.rx = s + 5; g.ry = (s + 5) * 0.62; } } });
      if (i % 2 === 0) diffs.push({ id: 'rm_f' + i, mx: x, my: y, apply: c => { c.remove('fb' + i); c.remove('ft' + i); c.remove('fe' + i); } });
    });
    for (let i = 0; i < 10; i++) {
      const x = Math.round(30 + rng() * 380), y = Math.round(38 + rng() * 236), r = 3 + Math.round(rng() * 5), id = 'bu' + i;
      base.push({ id, type: 'circle', cx: x, cy: y, r, fill: 'none', stroke: 'rgba(255,255,255,0.4)', sw: 2 });
      if (i % 2 === 0) diffs.push({ id: 'rm_bu' + i, mx: x, my: y, apply: c => c.remove(id) });
    }
    [[150, 285, YEL], [270, 290, PUR]].forEach(([x, y, col], i) => {
      diffs.push({ id: 'star' + i, mx: x, my: y, apply: c => { const pts = []; for (let k = 0; k < 5; k++) { const a = (-90 + k * 72) * Math.PI / 180; pts.push([+(x + 12 * Math.cos(a)).toFixed(1), +(y + 12 * Math.sin(a)).toFixed(1)]); const a2 = (-90 + k * 72 + 36) * Math.PI / 180; pts.push([+(x + 5 * Math.cos(a2)).toFixed(1), +(y + 5 * Math.sin(a2)).toFixed(1)]); } c.add({ id: 'star' + i, type: 'poly', pts, fill: col }); } });
    });
    return { id: 'reef', name: 'Reef', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 8 — DASHBOARD  (bar chart, donut, line chart)
  // =====================================================================
  function buildDashboard() {
    const W = 440, H = 340;
    const base = [], diffs = [];
    base.push({ id: 'bg', type: 'rect', x: 20, y: 20, w: W - 40, h: H - 40, rx: 16, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.1)', sw: 2 });
    const bx = 54, bw = 22, gap = 14, baseY = 200, heights = [50, 80, 40, 96, 64, 110];
    base.push({ id: 'axis', type: 'line', x1: bx - 8, y1: baseY, x2: bx + 6 * (bw + gap), y2: baseY, stroke: 'rgba(255,255,255,0.25)', sw: 2 });
    heights.forEach((h, i) => {
      const x = bx + i * (bw + gap), col = PAL[i % PAL.length];
      base.push({ id: 'bar' + i, type: 'rect', x, y: baseY - h, w: bw, h, rx: 4, fill: col });
      diffs.push({ id: 're_bar' + i, mx: x + bw / 2, my: baseY - h + 12, apply: c => c.recolor('bar' + i, rotate(col)) });
      diffs.push({ id: 'gr_bar' + i, mx: x + bw / 2, my: baseY - h, apply: c => { const g = c.get('bar' + i); if (g) { const nh = h + 24; g.h = nh; g.y = baseY - nh; } } });
      if (i % 2 === 1) diffs.push({ id: 'rm_bar' + i, mx: x + bw / 2, my: baseY - h / 2, apply: c => c.remove('bar' + i) });
    });
    const dcx = 336, dcy = 96, dr = 44;
    function arcPath(a0, a1) { const p0 = [dcx + dr * Math.cos(a0 * Math.PI / 180), dcy + dr * Math.sin(a0 * Math.PI / 180)], p1 = [dcx + dr * Math.cos(a1 * Math.PI / 180), dcy + dr * Math.sin(a1 * Math.PI / 180)], large = (a1 - a0) > 180 ? 1 : 0; return `M${dcx},${dcy} L${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${dr},${dr} 0 ${large} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} Z`; }
    [[0, 90, RED], [90, 180, BLUE], [180, 270, YEL], [270, 360, CYA]].forEach(([a0, a1, col], i) => {
      base.push({ id: 'wg' + i, type: 'path', d: arcPath(a0, a1), fill: col });
      const mid = (a0 + a1) / 2 * Math.PI / 180;
      diffs.push({ id: 're_wg' + i, mx: dcx + dr * 0.6 * Math.cos(mid), my: dcy + dr * 0.6 * Math.sin(mid), apply: c => c.recolor('wg' + i, rotate(col)) });
    });
    base.push({ id: 'hole', type: 'circle', cx: dcx, cy: dcy, r: 18, fill: 'hsl(233,44%,13%)' });
    const lpts = [[250, 272], [288, 250], [326, 262], [364, 234], [402, 248]];
    lpts.forEach((p, i) => { if (i < lpts.length - 1) base.push({ id: 'ln' + i, type: 'line', x1: p[0], y1: p[1], x2: lpts[i + 1][0], y2: lpts[i + 1][1], stroke: CYA, sw: 3, opacity: 0.75 }); });
    lpts.forEach((p, i) => {
      base.push({ id: 'lp' + i, type: 'circle', cx: p[0], cy: p[1], r: 5, fill: PUR });
      diffs.push({ id: 're_lp' + i, mx: p[0], my: p[1], apply: c => c.recolor('lp' + i, YEL) });
      if (i % 2 === 0) diffs.push({ id: 'mv_lp' + i, mx: p[0], my: p[1] - 22, apply: c => { const g = c.get('lp' + i); if (g) g.cy = p[1] - 22; } });
    });
    return { id: 'dashboard', name: 'Dashboard', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 9 — BLOCKS  (stacked towers of colored blocks)
  // =====================================================================
  function buildBlocks() {
    const W = 440, H = 340;
    const base = [], diffs = [];
    base.push({ id: 'floor', type: 'line', x1: 20, y1: 300, x2: 420, y2: 300, stroke: 'rgba(255,255,255,0.2)', sw: 3 });
    const towers = [80, 172, 264, 356], counts = [4, 3, 5, 3], bw = 52, bh = 34;
    towers.forEach((cx, ti) => {
      const n = counts[ti];
      for (let k = 0; k < n; k++) {
        const y = 300 - (k + 1) * bh, col = PAL[(ti + k) % PAL.length], id = 'bk' + ti + '_' + k;
        base.push({ id, type: 'rect', x: cx - bw / 2, y, w: bw, h: bh - 4, rx: 6, fill: col });
        diffs.push({ id: 're_' + id, mx: cx, my: y + bh / 2, apply: c => c.recolor(id, rotate(col)) });
        if (k === n - 1) diffs.push({ id: 'rm_' + id, mx: cx, my: y + bh / 2, apply: c => c.remove(id) });
      }
      const ty = 300 - (n + 1) * bh;
      diffs.push({ id: 'add_' + ti, mx: cx, my: ty + bh / 2, apply: c => c.add({ id: 'add_' + ti, type: 'rect', x: cx - bw / 2, y: ty, w: bw, h: bh - 4, rx: 6, fill: PAL[(ti + 2) % 5] }) });
      diffs.push({ id: 'ball_' + ti, mx: cx, my: ty + 4, apply: c => c.add({ id: 'ball_' + ti, type: 'circle', cx, cy: ty + 6, r: 12, fill: CYA }) });
    });
    return { id: 'blocks', name: 'Blocks', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 10 — TRAFFIC  (road, cars, signal, buildings, clouds)
  // =====================================================================
  function buildTraffic() {
    const W = 440, H = 340;
    const base = [], diffs = [];
    base.push({ id: 'tlpole', type: 'rect', x: 386, y: 134, w: 6, h: 78, rx: 2, fill: 'rgba(255,255,255,0.32)' });
    [40, 90, 140].forEach((x, i) => {
      const h = 80 + i * 20, col = [CYA, BLUE, YEL][i];
      base.push({ id: 'bb' + i, type: 'rect', x, y: 210 - h, w: 44, h, rx: 4, fill: col, opacity: 0.9 });
      diffs.push({ id: 're_bb' + i, mx: x + 22, my: 210 - h / 2, apply: c => c.recolor('bb' + i, rotate(col)) });
      if (i % 2 === 0) diffs.push({ id: 'rm_bb' + i, mx: x + 22, my: 210 - h / 2, apply: c => c.remove('bb' + i) });
    });
    [[150, 60], [280, 50]].forEach(([x, y], i) => {
      base.push({ id: 'cl' + i, type: 'ellipse', cx: x, cy: y, rx: 30, ry: 13, rot: 0, fill: 'rgba(255,255,255,0.45)' });
      diffs.push({ id: 're_cl' + i, mx: x, my: y, apply: c => c.recolor('cl' + i, 'rgba(255,255,255,0.8)') });
      if (i === 1) diffs.push({ id: 'rm_cl' + i, mx: x, my: y, apply: c => c.remove('cl' + i) });
    });
    base.push({ id: 'road', type: 'rect', x: 0, y: 210, w: W, h: 70, fill: 'rgba(255,255,255,0.06)' });
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 62;
      base.push({ id: 'dash' + i, type: 'rect', x, y: 242, w: 30, h: 6, rx: 3, fill: YEL });
      if (i % 2 === 0) diffs.push({ id: 'rm_dash' + i, mx: x + 15, my: 245, apply: c => c.remove('dash' + i) });
      else diffs.push({ id: 're_dash' + i, mx: x + 15, my: 245, apply: c => c.recolor('dash' + i, CYA) });
    }
    const cars = [[70, 198, RED], [208, 198, BLUE], [330, 198, PUR]];
    cars.forEach(([x, y, col], i) => {
      base.push({ id: 'car' + i, type: 'rect', x, y, w: 70, h: 26, rx: 8, fill: col });
      base.push({ id: 'cab' + i, type: 'rect', x: x + 16, y: y - 16, w: 38, h: 18, rx: 6, fill: col });
      base.push({ id: 'wa' + i, type: 'circle', cx: x + 16, cy: y + 26, r: 8, fill: '#12203c' });
      base.push({ id: 'wb' + i, type: 'circle', cx: x + 54, cy: y + 26, r: 8, fill: '#12203c' });
      diffs.push({ id: 're_car' + i, mx: x + 35, my: y + 13, apply: c => { c.recolor('car' + i, rotate(col)); c.recolor('cab' + i, rotate(col)); } });
      if (i % 2 === 1) diffs.push({ id: 'rm_car' + i, mx: x + 35, my: y + 13, apply: c => { c.remove('car' + i); c.remove('cab' + i); c.remove('wa' + i); c.remove('wb' + i); } });
      diffs.push({ id: 'rm_wh' + i, mx: x + 54, my: y + 26, apply: c => c.remove('wb' + i) });
    });
    base.push({ id: 'tlbox', type: 'rect', x: 376, y: 70, w: 26, h: 64, rx: 8, fill: 'rgba(255,255,255,0.12)' });
    [[RED, 82], [YEL, 102], [CYA, 122]].forEach(([col, y], i) => {
      base.push({ id: 'tl' + i, type: 'circle', cx: 389, cy: y, r: 8, fill: col });
      diffs.push({ id: 're_tl' + i, mx: 389, my: y, apply: c => c.recolor('tl' + i, rotate(col)) });
    });
    diffs.push({ id: 'sign', mx: 60, my: 168, apply: c => { c.add({ id: 'signp', type: 'line', x1: 60, y1: 210, x2: 60, y2: 172, stroke: 'rgba(255,255,255,0.4)', sw: 3 }); c.add({ id: 'signb', type: 'circle', cx: 60, cy: 166, r: 12, fill: RED }); } });
    return { id: 'traffic', name: 'Traffic', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 11 — BOOKSHELF  (rows of books)
  // =====================================================================
  function buildBookshelf() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'frame', type: 'rect', x: 30, y: 36, w: W - 60, h: 288, rx: 10, fill: 'none', stroke: 'rgba(255,255,255,0.12)', sw: 3 });
    const shelfYs = [130, 220, 308];
    shelfYs.forEach((sy, si) => {
      base.push({ id: 'shelf' + si, type: 'line', x1: 34, y1: sy, x2: W - 34, y2: sy, stroke: 'rgba(255,255,255,0.2)', sw: 4 });
      let x = 48, bi = 0;
      while (x < W - 66) {
        const bw = 18 + ((si * 3 + bi * 7) % 4) * 5, bh = 54 + ((bi * 13 + si * 5) % 3) * 16, col = PAL[(si + bi) % PAL.length], id = 'bk' + si + '_' + bi, y = sy - bh;
        base.push({ id, type: 'rect', x, y, w: bw, h: bh, rx: 3, fill: col });
        diffs.push({ id: 're_' + id, mx: x + bw / 2, my: y + 18, apply: c => c.recolor(id, rotate(col)) });
        if ((bi + si) % 3 === 0) diffs.push({ id: 'rm_' + id, mx: x + bw / 2, my: y + bh / 2, apply: c => c.remove(id) });
        else if ((bi + si) % 3 === 1) diffs.push({ id: 'gr_' + id, mx: x + bw / 2, my: y, apply: c => { const g = c.get(id); if (g) { g.h = bh + 18; g.y = sy - (bh + 18); } } });
        x += bw + 6; bi++;
      }
    });
    diffs.push({ id: 'plant', mx: 360, my: 108, apply: c => { c.add({ id: 'pot', type: 'rect', x: 350, y: 108, w: 20, h: 22, rx: 3, fill: RED }); c.add({ id: 'leaf', type: 'circle', cx: 360, cy: 100, r: 12, fill: CYA }); } });
    return { id: 'bookshelf', name: 'Bookshelf', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 12 — WEATHER  (sun, rainbow, clouds, rain, lightning)
  // =====================================================================
  function buildWeather() {
    const W = 440, H = 340, base = [], diffs = [];
    const sx = 88, sy = 78;
    base.push({ id: 'sun', type: 'circle', cx: sx, cy: sy, r: 28, fill: YEL });
    diffs.push({ id: 're_sun', mx: sx, my: sy, apply: c => c.recolor('sun', RED) });
    diffs.push({ id: 'gr_sun', mx: sx, my: sy, apply: c => { const g = c.get('sun'); if (g) g.r = 34; } });
    for (let i = 0; i < 8; i++) { const a = i * 45 * Math.PI / 180; base.push({ id: 'ray' + i, type: 'line', x1: sx + 34 * Math.cos(a), y1: sy + 34 * Math.sin(a), x2: sx + 46 * Math.cos(a), y2: sy + 46 * Math.sin(a), stroke: YEL, sw: 4 }); if (i % 2 === 0) diffs.push({ id: 'rm_ray' + i, mx: sx + 46 * Math.cos(a), my: sy + 46 * Math.sin(a), apply: c => c.remove('ray' + i) }); }
    const rcx = 332, rcy = 148;
    [RED, YEL, CYA, PUR].forEach((col, i) => { const rr = 62 - i * 13; base.push({ id: 'rb' + i, type: 'path', d: `M${rcx - rr},${rcy} A${rr},${rr} 0 0 1 ${rcx + rr},${rcy}`, stroke: col, sw: 7 }); diffs.push({ id: 're_rb' + i, mx: rcx, my: rcy - rr, apply: c => { const g = c.get('rb' + i); if (g) g.stroke = rotate(col); } }); if (i % 2 === 1) diffs.push({ id: 'rm_rb' + i, mx: rcx - rr + 8, my: rcy - 8, apply: c => c.remove('rb' + i) }); });
    [[160, 190, BLUE], [300, 236, CYA]].forEach(([cx, cy, col], i) => {
      base.push({ id: 'cl' + i + 'a', type: 'ellipse', cx: cx - 16, cy, rx: 22, ry: 15, rot: 0, fill: col, opacity: 0.9 });
      base.push({ id: 'cl' + i + 'b', type: 'ellipse', cx: cx + 14, cy: cy - 5, rx: 26, ry: 18, rot: 0, fill: col, opacity: 0.9 });
      diffs.push({ id: 're_cl' + i, mx: cx, my: cy, apply: c => { c.recolor('cl' + i + 'a', rotate(col)); c.recolor('cl' + i + 'b', rotate(col)); } });
      for (let r = 0; r < 4; r++) { const rx = cx - 18 + r * 14, ry = cy + 24; base.push({ id: 'rain' + i + '_' + r, type: 'line', x1: rx, y1: ry, x2: rx - 4, y2: ry + 16, stroke: CYA, sw: 3, opacity: 0.85 }); if (r % 2 === 0) diffs.push({ id: 'rm_rain' + i + '_' + r, mx: rx, my: ry + 8, apply: c => c.remove('rain' + i + '_' + r) }); else diffs.push({ id: 're_rain' + i + '_' + r, mx: rx, my: ry + 8, apply: c => { const g = c.get('rain' + i + '_' + r); if (g) g.stroke = BLUE; } }); }
    });
    diffs.push({ id: 'bolt', mx: 232, my: 272, apply: c => c.add({ id: 'bolt', type: 'poly', pts: [[232, 240], [220, 272], [232, 272], [222, 302], [246, 264], [234, 264]], fill: YEL }) });
    [[130, 128], [200, 110]].forEach(([x, y], i) => diffs.push({ id: 'bird' + i, mx: x, my: y, apply: c => c.add({ id: 'bird' + i, type: 'path', d: `M${x - 10},${y} q8,-8 14,0 q6,-8 14,0`, stroke: '#dfe6f5', sw: 3, fill: 'none' }) }));
    return { id: 'weather', name: 'Weather', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 13 — TRAIN  (engine + carriages, windows, wheels, smoke)
  // =====================================================================
  function buildTrain() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'track', type: 'line', x1: 10, y1: 272, x2: 430, y2: 272, stroke: 'rgba(255,255,255,0.25)', sw: 4 });
    for (let i = 0; i < 9; i++) { const x = 24 + i * 48; base.push({ id: 'tie' + i, type: 'rect', x, y: 274, w: 10, h: 14, rx: 2, fill: 'rgba(255,255,255,0.15)' }); if (i % 2 === 0) diffs.push({ id: 'rm_tie' + i, mx: x + 5, my: 281, apply: c => c.remove('tie' + i) }); }
    // ----- steam locomotive (front) — faces left, cab toward the carriages -----
    base.push({ id: 'cowc', type: 'poly', pts: [[52, 246], [52, 268], [28, 268]], fill: LINE });
    base.push({ id: 'boiler', type: 'rect', x: 50, y: 216, w: 80, h: 40, rx: 20, fill: BLUE });
    base.push({ id: 'smokebox', type: 'circle', cx: 54, cy: 236, r: 20, fill: rotate(BLUE) });
    base.push({ id: 'cab', type: 'rect', x: 118, y: 194, w: 32, h: 62, rx: 6, fill: BLUE });
    base.push({ id: 'cabroof', type: 'rect', x: 114, y: 188, w: 40, h: 10, rx: 3, fill: rotate(BLUE) });
    base.push({ id: 'cabwin', type: 'rect', x: 126, y: 206, w: 16, h: 16, rx: 3, fill: CYA });
    base.push({ id: 'dome', type: 'circle', cx: 94, cy: 216, r: 10, fill: rotate(BLUE) });
    base.push({ id: 'funnel', type: 'poly', pts: [[60, 216], [76, 216], [80, 186], [56, 186]], fill: BLUE });
    base.push({ id: 'funnelrim', type: 'rect', x: 54, y: 182, w: 28, h: 7, rx: 3, fill: rotate(BLUE) });
    base.push({ id: 'headlight', type: 'circle', cx: 50, cy: 226, r: 6, fill: YEL });
    base.push({ id: 'dwheel', type: 'circle', cx: 118, cy: 256, r: 18, fill: '#12203c', stroke: LINE, sw: 3 });
    base.push({ id: 'dwheelh', type: 'circle', cx: 118, cy: 256, r: 6, fill: LINE });
    base.push({ id: 'lwheel', type: 'circle', cx: 64, cy: 264, r: 10, fill: '#12203c', stroke: LINE, sw: 3 });
    diffs.push({ id: 're_boiler', mx: 90, my: 236, apply: c => c.recolor('boiler', rotate(BLUE)) });
    diffs.push({ id: 're_cab', mx: 134, my: 236, apply: c => c.recolor('cab', rotate(BLUE)) });
    diffs.push({ id: 're_cabwin', mx: 134, my: 214, apply: c => c.recolor('cabwin', YEL) });
    diffs.push({ id: 'rm_dome', mx: 94, my: 212, apply: c => c.remove('dome') });
    diffs.push({ id: 're_headlight', mx: 50, my: 226, apply: c => c.recolor('headlight', RED) });
    diffs.push({ id: 'rm_lwheel', mx: 64, my: 264, apply: c => c.remove('lwheel') });
    diffs.push({ id: 're_funnel', mx: 68, my: 202, apply: c => c.recolor('funnel', rotate(BLUE)) });
    // ----- carriages -----
    [[164, RED], [258, YEL], [352, PUR]].forEach(([x, col], ci) => {
      const i = ci + 1, w = 80, y = 208, h = 48;
      base.push({ id: 'body' + i, type: 'rect', x, y, w, h, rx: 8, fill: col });
      diffs.push({ id: 're_body' + i, mx: x + w / 2, my: y + h / 2, apply: c => c.recolor('body' + i, rotate(col)) });
      for (let k = 0; k < 3; k++) { const wx = x + 12 + k * (w - 20) / 3, wy = y + 16; base.push({ id: 'win' + i + '_' + k, type: 'rect', x: wx, y: wy, w: 16, h: 16, rx: 3, fill: CYA }); diffs.push({ id: 're_win' + i + '_' + k, mx: wx + 8, my: wy + 8, apply: c => c.recolor('win' + i + '_' + k, YEL) }); if (k === 1) diffs.push({ id: 'rm_win' + i + '_' + k, mx: wx + 8, my: wy + 8, apply: c => c.remove('win' + i + '_' + k) }); }
      base.push({ id: 'wl' + i + 'a', type: 'circle', cx: x + 18, cy: 262, r: 12, fill: '#12203c', stroke: LINE, sw: 3 });
      base.push({ id: 'wl' + i + 'b', type: 'circle', cx: x + w - 18, cy: 262, r: 12, fill: '#12203c', stroke: LINE, sw: 3 });
      if (i % 2 === 1) diffs.push({ id: 'rm_wl' + i, mx: x + w - 18, my: 262, apply: c => c.remove('wl' + i + 'b') });
    });
    // ----- steam from the funnel -----
    [[76, 158], [98, 132], [126, 110]].forEach(([x, y], i) => { base.push({ id: 'puff' + i, type: 'circle', cx: x, cy: y, r: 13 - i * 2, fill: 'rgba(255,255,255,0.4)' }); diffs.push({ id: 're_puff' + i, mx: x, my: y, apply: c => c.recolor('puff' + i, 'rgba(255,255,255,0.75)') }); if (i === 2) diffs.push({ id: 'rm_puff' + i, mx: x, my: y, apply: c => c.remove('puff' + i) }); });
    diffs.push({ id: 'add_puff', mx: 152, my: 94, apply: c => c.add({ id: 'add_puff', type: 'circle', cx: 152, cy: 94, r: 6, fill: 'rgba(255,255,255,0.4)' }) });
    return { id: 'train', name: 'Train', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 14 — BALLOONS  (balloons on strings, sun, birds)
  // =====================================================================
  function buildBalloons() {
    const W = 440, H = 340, base = [], diffs = [];
    [70, 130, 200, 270, 330, 390].forEach((x, i) => {
      const y = 96 + (i % 3) * 30, col = PAL[i % PAL.length], id = 'bal' + i;
      base.push({ id: 'str' + i, type: 'line', x1: x, y1: y + 26, x2: x + (i % 2 ? 8 : -8), y2: 300, stroke: 'rgba(255,255,255,0.3)', sw: 2 });
      base.push({ id, type: 'ellipse', cx: x, cy: y, rx: 22, ry: 27, rot: 0, fill: col });
      base.push({ id: 'knot' + i, type: 'poly', pts: [[x - 4, y + 26], [x + 4, y + 26], [x, y + 32]], fill: col });
      base.push({ id: 'hl' + i, type: 'ellipse', cx: x - 7, cy: y - 9, rx: 5, ry: 7, rot: -20, fill: 'rgba(255,255,255,0.5)' });
      diffs.push({ id: 're_' + id, mx: x, my: y, apply: c => { c.recolor(id, rotate(col)); c.recolor('knot' + i, rotate(col)); } });
      diffs.push({ id: 'gr_' + id, mx: x, my: y, apply: c => { const g = c.get(id); if (g) { g.rx = 26; g.ry = 32; } } });
      diffs.push({ id: 'rm_hl' + i, mx: x - 7, my: y - 9, apply: c => c.remove('hl' + i) });
      if (i % 2 === 0) diffs.push({ id: 'rm_' + id, mx: x, my: y, apply: c => { c.remove(id); c.remove('knot' + i); c.remove('str' + i); c.remove('hl' + i); } });
    });
    base.push({ id: 'sun', type: 'circle', cx: 60, cy: 46, r: 20, fill: YEL });
    diffs.push({ id: 're_sun', mx: 60, my: 46, apply: c => c.recolor('sun', RED) });
    diffs.push({ id: 'cloud', mx: 350, my: 52, apply: c => c.add({ id: 'cloud', type: 'ellipse', cx: 350, cy: 52, rx: 30, ry: 14, rot: 0, fill: 'rgba(255,255,255,0.5)' }) });
    [[200, 40], [260, 66]].forEach(([x, y], i) => diffs.push({ id: 'bird' + i, mx: x, my: y, apply: c => c.add({ id: 'bird' + i, type: 'path', d: `M${x - 10},${y} q8,-8 14,0 q6,-8 14,0`, stroke: '#dfe6f5', sw: 3, fill: 'none' }) }));
    return { id: 'balloons', name: 'Balloons', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 15 — ROBOT  (face + body, eyes, teeth, buttons, arms)
  // =====================================================================
  function buildRobot() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'head', type: 'rect', x: 150, y: 70, w: 140, h: 120, rx: 20, fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.18)', sw: 3 });
    base.push({ id: 'ant', type: 'line', x1: 220, y1: 70, x2: 220, y2: 44, stroke: LINE, sw: 4 });
    base.push({ id: 'antb', type: 'circle', cx: 220, cy: 38, r: 9, fill: RED });
    diffs.push({ id: 're_antb', mx: 220, my: 38, apply: c => c.recolor('antb', CYA) });
    base.push({ id: 'earL', type: 'rect', x: 138, y: 112, w: 12, h: 30, rx: 3, fill: PUR });
    base.push({ id: 'earR', type: 'rect', x: 290, y: 112, w: 12, h: 30, rx: 3, fill: PUR });
    diffs.push({ id: 're_earL', mx: 144, my: 127, apply: c => c.recolor('earL', rotate(PUR)) });
    diffs.push({ id: 'rm_earR', mx: 296, my: 127, apply: c => c.remove('earR') });
    base.push({ id: 'eyeL', type: 'circle', cx: 190, cy: 118, r: 20, fill: CYA });
    base.push({ id: 'eyeR', type: 'circle', cx: 250, cy: 118, r: 20, fill: CYA });
    base.push({ id: 'pupL', type: 'circle', cx: 190, cy: 118, r: 8, fill: '#12203c' });
    base.push({ id: 'pupR', type: 'circle', cx: 250, cy: 118, r: 8, fill: '#12203c' });
    diffs.push({ id: 're_eyeL', mx: 190, my: 118, apply: c => c.recolor('eyeL', YEL) });
    diffs.push({ id: 're_eyeR', mx: 250, my: 118, apply: c => c.recolor('eyeR', YEL) });
    diffs.push({ id: 'rm_pupL', mx: 190, my: 118, apply: c => c.remove('pupL') });
    diffs.push({ id: 'rm_pupR', mx: 250, my: 118, apply: c => c.remove('pupR') });
    for (let k = 0; k < 5; k++) { const mx = 178 + k * 16; base.push({ id: 'tooth' + k, type: 'rect', x: mx, y: 156, w: 12, h: 16, rx: 2, fill: k % 2 ? YEL : 'rgba(255,255,255,0.7)' }); diffs.push({ id: 're_tooth' + k, mx: mx + 6, my: 164, apply: c => c.recolor('tooth' + k, PAL[k % PAL.length]) }); if (k % 2 === 0) diffs.push({ id: 'rm_tooth' + k, mx: mx + 6, my: 164, apply: c => c.remove('tooth' + k) }); }
    base.push({ id: 'body', type: 'rect', x: 168, y: 200, w: 104, h: 96, rx: 14, fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.18)', sw: 3 });
    [[196, 230, RED], [244, 230, BLUE], [196, 266, YEL], [244, 266, PUR]].forEach(([x, y, col], i) => { base.push({ id: 'btn' + i, type: 'circle', cx: x, cy: y, r: 11, fill: col }); diffs.push({ id: 're_btn' + i, mx: x, my: y, apply: c => c.recolor('btn' + i, rotate(col)) }); if (i % 2 === 0) diffs.push({ id: 'rm_btn' + i, mx: x, my: y, apply: c => c.remove('btn' + i) }); });
    base.push({ id: 'armL', type: 'rect', x: 130, y: 210, w: 30, h: 14, rx: 7, fill: PUR });
    base.push({ id: 'armR', type: 'rect', x: 280, y: 210, w: 30, h: 14, rx: 7, fill: PUR });
    diffs.push({ id: 're_armL', mx: 145, my: 217, apply: c => c.recolor('armL', rotate(PUR)) });
    diffs.push({ id: 'rm_armR', mx: 295, my: 217, apply: c => c.remove('armR') });
    diffs.push({ id: 'gauge', mx: 220, my: 285, apply: c => c.add({ id: 'gauge', type: 'ring', cx: 220, cy: 285, r: 12, stroke: CYA, sw: 3 }) });
    return { id: 'robot', name: 'Robot', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 16 — MUSIC  (staff + notes + clef)
  // =====================================================================
  function buildMusic() {
    const W = 440, H = 340, base = [], diffs = [];
    [110, 140, 170, 200, 230].forEach((y, i) => base.push({ id: 'staff' + i, type: 'line', x1: 40, y1: y, x2: 400, y2: y, stroke: 'rgba(255,255,255,0.22)', sw: 2 }));
    [[90, 200, RED], [140, 170, BLUE], [190, 140, YEL], [240, 200, CYA], [290, 170, PUR], [340, 110, RED]].forEach(([x, y, col], i) => {
      base.push({ id: 'nh' + i, type: 'ellipse', cx: x, cy: y, rx: 12, ry: 9, rot: -20, fill: col });
      base.push({ id: 'ns' + i, type: 'line', x1: x + 11, y1: y, x2: x + 11, y2: y - 48, stroke: col, sw: 3 });
      diffs.push({ id: 're_n' + i, mx: x, my: y, apply: c => { c.recolor('nh' + i, rotate(col)); const g = c.get('ns' + i); if (g) g.stroke = rotate(col); } });
      diffs.push({ id: 'mv_n' + i, mx: x, my: y - 30, apply: c => { const h = c.get('nh' + i), s = c.get('ns' + i); if (h) h.cy = y - 30; if (s) { s.y1 = y - 30; s.y2 = y - 78; } } });
      if (i % 2 === 0) diffs.push({ id: 'rm_n' + i, mx: x, my: y, apply: c => { c.remove('nh' + i); c.remove('ns' + i); } });
      diffs.push({ id: 'flag' + i, mx: x + 11, my: y - 48, apply: c => c.add({ id: 'flag' + i, type: 'path', d: `M${x + 11},${y - 48} q14,6 8,22`, stroke: col, sw: 3, fill: 'none' }) });
    });
    base.push({ id: 'clef', type: 'ring', cx: 58, cy: 170, r: 20, stroke: PUR, sw: 4 });
    diffs.push({ id: 're_clef', mx: 58, my: 170, apply: c => { const g = c.get('clef'); if (g) g.stroke = CYA; } });
    diffs.push({ id: 'rest', mx: 218, my: 158, apply: c => c.add({ id: 'rest', type: 'rect', x: 213, y: 148, w: 10, h: 22, rx: 2, fill: YEL }) });
    diffs.push({ id: 'rm_staff', mx: 220, my: 230, apply: c => c.remove('staff4') });
    return { id: 'music', name: 'Music', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 17 — HARBOR  (sailboats, sun, waves, buoys)
  // =====================================================================
  function buildHarbor() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'sea', type: 'rect', x: 0, y: 232, w: W, h: 108, fill: 'rgba(70,150,190,0.1)' });
    base.push({ id: 'sun', type: 'circle', cx: 360, cy: 64, r: 24, fill: YEL });
    diffs.push({ id: 're_sun', mx: 360, my: 64, apply: c => c.recolor('sun', RED) });
    diffs.push({ id: 'cloud', mx: 120, my: 58, apply: c => c.add({ id: 'cloud', type: 'ellipse', cx: 120, cy: 58, rx: 30, ry: 13, rot: 0, fill: 'rgba(255,255,255,0.5)' }) });
    [[200, 50], [252, 74]].forEach(([x, y], i) => diffs.push({ id: 'bird' + i, mx: x, my: y, apply: c => c.add({ id: 'bird' + i, type: 'path', d: `M${x - 10},${y} q8,-8 14,0 q6,-8 14,0`, stroke: '#dfe6f5', sw: 3, fill: 'none' }) }));
    const boats = [[110, 232, RED], [242, 232, BLUE], [352, 232, PUR]];
    boats.forEach(([x, y, col], i) => {
      const s = i === 2 ? 0.82 : 1, hw = 64 * s;
      base.push({ id: 'hull' + i, type: 'poly', pts: [[x - hw / 2, y], [x + hw / 2, y], [x + hw / 2 - 14, y + 22], [x - hw / 2 + 14, y + 22]], fill: col });
      diffs.push({ id: 're_hull' + i, mx: x, my: y + 11, apply: c => c.recolor('hull' + i, rotate(col)) });
      base.push({ id: 'mast' + i, type: 'line', x1: x, y1: y, x2: x, y2: y - 70 * s, stroke: LINE, sw: 3 });
      const sc = PAL[(i + 2) % 5];
      base.push({ id: 'sailA' + i, type: 'poly', pts: [[x - 2, y - 68 * s], [x - 2, y - 4], [x - 40 * s, y - 4]], fill: sc });
      diffs.push({ id: 're_sailA' + i, mx: x - 20 * s, my: y - 30 * s, apply: c => c.recolor('sailA' + i, rotate(sc)) });
      const sc2 = PAL[(i + 3) % 5];
      base.push({ id: 'sailB' + i, type: 'poly', pts: [[x + 2, y - 56 * s], [x + 2, y - 4], [x + 30 * s, y - 4]], fill: sc2 });
      diffs.push({ id: 're_sailB' + i, mx: x + 16 * s, my: y - 26 * s, apply: c => c.recolor('sailB' + i, rotate(sc2)) });
      if (i % 2 === 1) diffs.push({ id: 'rm_sailB' + i, mx: x + 16 * s, my: y - 26 * s, apply: c => c.remove('sailB' + i) });
      diffs.push({ id: 'flag' + i, mx: x + 9, my: y - 70 * s, apply: c => c.add({ id: 'flag' + i, type: 'poly', pts: [[x, y - 70 * s], [x + 18, y - 64 * s], [x, y - 58 * s]], fill: RED }) });
      if (i === 2) diffs.push({ id: 'rm_boat' + i, mx: x, my: y, apply: c => { c.remove('hull' + i); c.remove('mast' + i); c.remove('sailA' + i); c.remove('sailB' + i); } });
    });
    for (let k = 0; k < 6; k++) { const x = 30 + k * 70, y = 292 + (k % 2) * 14; base.push({ id: 'wave' + k, type: 'path', d: `M${x},${y} q10,-8 20,0 t20,0`, stroke: 'rgba(255,255,255,0.3)', sw: 3, fill: 'none' }); if (k % 2 === 0) diffs.push({ id: 'rm_wave' + k, mx: x + 20, my: y, apply: c => c.remove('wave' + k) }); else diffs.push({ id: 're_wave' + k, mx: x + 20, my: y, apply: c => { const g = c.get('wave' + k); if (g) g.stroke = CYA; } }); }
    [[70, 268, RED], [400, 268, YEL]].forEach(([x, y, col], i) => { base.push({ id: 'buoy' + i, type: 'circle', cx: x, cy: y, r: 8, fill: col }); diffs.push({ id: 're_buoy' + i, mx: x, my: y, apply: c => c.recolor('buoy' + i, rotate(col)) }); });
    return { id: 'harbor', name: 'Harbor', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 18 — FERRIS WHEEL  (rim, spokes, cabins, lights, hub)
  // =====================================================================
  function buildFerris() {
    const W = 440, H = 340, cx = 220, cy = 158, R = 118, base = [], diffs = [];
    base.push({ id: 'legL', type: 'line', x1: cx - 72, y1: 300, x2: cx, y2: cy, stroke: LINE, sw: 5 });
    base.push({ id: 'legR', type: 'line', x1: cx + 72, y1: 300, x2: cx, y2: cy, stroke: LINE, sw: 5 });
    base.push({ id: 'ground', type: 'line', x1: 40, y1: 300, x2: 400, y2: 300, stroke: 'rgba(255,255,255,0.2)', sw: 3 });
    base.push({ id: 'rim', type: 'ring', cx, cy, r: R, stroke: 'rgba(255,255,255,0.3)', sw: 4 });
    diffs.push({ id: 're_rim', mx: cx, my: cy - R, apply: c => { const g = c.get('rim'); if (g) g.stroke = CYA; } });
    const N = 8;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2, px = cx + R * Math.cos(a), py = cy + R * Math.sin(a), col = PAL[i % PAL.length];
      base.push({ id: 'spoke' + i, type: 'line', x1: cx, y1: cy, x2: px, y2: py, stroke: 'rgba(255,255,255,0.2)', sw: 2 });
      base.push({ id: 'cab' + i, type: 'rect', x: px - 14, y: py - 10, w: 28, h: 22, rx: 5, fill: col });
      diffs.push({ id: 're_cab' + i, mx: px, my: py, apply: c => c.recolor('cab' + i, rotate(col)) });
      if (i % 2 === 0) diffs.push({ id: 'rm_cab' + i, mx: px, my: py, apply: c => c.remove('cab' + i) });
      else diffs.push({ id: 'gr_cab' + i, mx: px, my: py, apply: c => { const g = c.get('cab' + i); if (g) { g.w = 34; g.h = 28; g.x = px - 17; g.y = py - 14; } } });
      if (i % 3 === 0) diffs.push({ id: 'rm_spoke' + i, mx: (cx + px) / 2, my: (cy + py) / 2, apply: c => c.remove('spoke' + i) });
    }
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, lx = cx + R * Math.cos(a), ly = cy + R * Math.sin(a); base.push({ id: 'lt' + k, type: 'circle', cx: lx, cy: ly, r: 4, fill: '#dfe6f5' }); if (k % 2 === 0) diffs.push({ id: 'rm_lt' + k, mx: lx, my: ly, apply: c => c.remove('lt' + k) }); else diffs.push({ id: 're_lt' + k, mx: lx, my: ly, apply: c => c.recolor('lt' + k, YEL) }); }
    base.push({ id: 'hub', type: 'circle', cx, cy, r: 14, fill: YEL });
    diffs.push({ id: 're_hub', mx: cx, my: cy, apply: c => c.recolor('hub', RED) });
    diffs.push({ id: 'flag', mx: cx, my: cy - R - 16, apply: c => { c.add({ id: 'flagP', type: 'line', x1: cx, y1: cy - R, x2: cx, y2: cy - R - 24, stroke: LINE, sw: 3 }); c.add({ id: 'flagF', type: 'poly', pts: [[cx, cy - R - 24], [cx + 18, cy - R - 18], [cx, cy - R - 12]], fill: RED }); } });
    return { id: 'ferris', name: 'Ferris Wheel', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 19 — FIELDS  (crop rows, barn, sun)
  // =====================================================================
  function buildFields() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'hill', type: 'path', d: 'M0,200 Q220,150 440,200 L440,340 L0,340 Z', fill: 'rgba(90,180,120,0.12)' });
    base.push({ id: 'sun', type: 'circle', cx: 360, cy: 64, r: 24, fill: YEL });
    diffs.push({ id: 're_sun', mx: 360, my: 64, apply: c => c.recolor('sun', RED) });
    [240, 270, 300].forEach((y, ri) => {
      for (let k = 0; k < 9; k++) { const x = 40 + k * 44, col = [CYA, YEL, PUR][(ri + k) % 3], id = 'cr' + ri + '_' + k; base.push({ id, type: 'circle', cx: x, cy: y, r: 9, fill: col }); if ((ri + k) % 3 === 0) diffs.push({ id: 're_' + id, mx: x, my: y, apply: c => c.recolor(id, rotate(col)) }); else if ((ri + k) % 3 === 1) diffs.push({ id: 'rm_' + id, mx: x, my: y, apply: c => c.remove(id) }); else diffs.push({ id: 'gr_' + id, mx: x, my: y, apply: c => { const g = c.get(id); if (g) g.r = 14; } }); }
    });
    base.push({ id: 'roof', type: 'poly', pts: [[54, 150], [100, 120], [146, 150]], fill: rotate(RED) });
    base.push({ id: 'barn', type: 'rect', x: 60, y: 150, w: 80, h: 60, rx: 4, fill: RED });
    base.push({ id: 'door', type: 'rect', x: 90, y: 180, w: 22, h: 30, rx: 2, fill: '#3a2a1a' });
    diffs.push({ id: 're_barn', mx: 100, my: 182, apply: c => c.recolor('barn', rotate(RED)) });
    diffs.push({ id: 're_roof', mx: 100, my: 132, apply: c => c.recolor('roof', PUR) });
    diffs.push({ id: 'cloud', mx: 150, my: 70, apply: c => c.add({ id: 'cloud', type: 'ellipse', cx: 150, cy: 70, rx: 30, ry: 13, rot: 0, fill: 'rgba(255,255,255,0.5)' }) });
    return { id: 'fields', name: 'Fields', vb: [W, H], base, diffs };
  }

  // =====================================================================
  // SCENE 20 — ARCADE  (pinball bumpers, flippers, ball, score)
  // =====================================================================
  function buildArcade() {
    const W = 440, H = 340, base = [], diffs = [];
    base.push({ id: 'field', type: 'rect', x: 60, y: 24, w: 320, h: 292, rx: 24, fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.14)', sw: 3 });
    [[140, 96, RED], [240, 86, BLUE], [318, 126, YEL], [180, 164, PUR], [280, 182, CYA], [150, 224, YEL]].forEach(([x, y, col], i) => {
      base.push({ id: 'bmp' + i, type: 'circle', cx: x, cy: y, r: 22, fill: col });
      base.push({ id: 'bmpr' + i, type: 'ring', cx: x, cy: y, r: 22, stroke: '#fff', sw: 2, opacity: 0.5 });
      diffs.push({ id: 're_bmp' + i, mx: x, my: y, apply: c => c.recolor('bmp' + i, rotate(col)) });
      diffs.push({ id: 'gr_bmp' + i, mx: x, my: y, apply: c => { const g = c.get('bmp' + i); if (g) g.r = 28; } });
      if (i % 2 === 0) diffs.push({ id: 'rm_bmp' + i, mx: x, my: y, apply: c => { c.remove('bmp' + i); c.remove('bmpr' + i); } });
    });
    base.push({ id: 'flL', type: 'rect', x: 150, y: 282, w: 46, h: 14, rx: 7, fill: PUR });
    base.push({ id: 'flR', type: 'rect', x: 244, y: 282, w: 46, h: 14, rx: 7, fill: PUR });
    diffs.push({ id: 're_flL', mx: 173, my: 289, apply: c => c.recolor('flL', rotate(PUR)) });
    diffs.push({ id: 'rm_flR', mx: 267, my: 289, apply: c => c.remove('flR') });
    base.push({ id: 'ball', type: 'circle', cx: 344, cy: 272, r: 10, fill: '#dfe6f5' });
    diffs.push({ id: 're_ball', mx: 344, my: 272, apply: c => c.recolor('ball', CYA) });
    for (let k = 0; k < 6; k++) { const x = 100 + k * 40; base.push({ id: 'sd' + k, type: 'circle', cx: x, cy: 44, r: 6, fill: PAL[k % PAL.length] }); if (k % 2 === 0) diffs.push({ id: 'rm_sd' + k, mx: x, my: 44, apply: c => c.remove('sd' + k) }); else diffs.push({ id: 're_sd' + k, mx: x, my: 44, apply: c => c.recolor('sd' + k, rotate(PAL[k % PAL.length])) }); }
    diffs.push({ id: 'star', mx: 220, my: 240, apply: c => { const p = [], cx = 220, cy = 240; for (let k = 0; k < 5; k++) { const a = (-90 + k * 72) * Math.PI / 180; p.push([+(cx + 16 * Math.cos(a)).toFixed(1), +(cy + 16 * Math.sin(a)).toFixed(1)]); const a2 = (-90 + k * 72 + 36) * Math.PI / 180; p.push([+(cx + 7 * Math.cos(a2)).toFixed(1), +(cy + 7 * Math.sin(a2)).toFixed(1)]); } c.add({ id: 'star', type: 'poly', pts: p, fill: YEL }); } });
    return { id: 'arcade', name: 'Arcade', vb: [W, H], base, diffs };
  }

  const SCENES = [buildSynapse(), buildSkyline(), buildGarden(), buildCircuit(), buildMosaic(), buildCosmos(), buildReef(), buildDashboard(), buildBlocks(), buildTraffic(), buildBookshelf(), buildWeather(), buildTrain(), buildBalloons(), buildRobot(), buildMusic(), buildHarbor(), buildFerris(), buildFields(), buildArcade()];

  // ---- public render helpers ----
  function renderBase(scene) { return scene.base.map(el2svg).join(''); }
  function renderModified(scene, activeSet) {
    const ctx = makeCtx(scene.base);
    scene.diffs.forEach(d => { if (activeSet.has(d.id)) d.apply(ctx); });
    return ctx.arr.filter(Boolean).map(el2svg).join('');
  }
  function activeMarkers(scene, activeSet) {
    return scene.diffs.filter(d => activeSet.has(d.id))
      .map(d => `<circle cx="${d.mx}" cy="${d.my}" r="19" fill="none" stroke="${CYA}" stroke-width="3"/><circle cx="${d.mx}" cy="${d.my}" r="19" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>`).join('');
  }
  // pick a random subset of size n using a seeded rng (deterministic given seed)
  function pickRound(scene, n, seed) {
    const rng = mulberry32(seed);
    const ids = scene.diffs.map(d => d.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return new Set(ids.slice(0, Math.min(n, ids.length)));
  }
  // return the active differences as plain data: [{id, x, y}] in viewBox coords
  function getActiveDiffs(scene, activeSet) {
    return scene.diffs.filter(d => activeSet.has(d.id)).map(d => ({ id: d.id, x: d.mx, y: d.my }));
  }
  // hit-test a click (viewBox coords) against active diffs; returns {id,x,y} or null.
  // Pass the NEAREST active diff within `radius` (default 22) of the point.
  function hitTest(scene, activeSet, x, y, radius) {
    radius = radius == null ? 22 : radius;
    let best = null, bestD = radius;
    getActiveDiffs(scene, activeSet).forEach(d => { const dist = Math.hypot(d.x - x, d.y - y); if (dist <= bestD) { bestD = dist; best = d; } });
    return best;
  }
  function sceneById(id) { return SCENES.find(s => s.id === id); }

  window.SpotDiff = { SCENES, renderBase, renderModified, activeMarkers, getActiveDiffs, pickRound, hitTest, sceneById, PAL };
})();
