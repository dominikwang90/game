'use strict';
/* ============================================================
 * 像素画系统：所有美术均为程序化生成（神兽/敌人/角色/道具/场景）
 * ============================================================ */
window.SP = (function () {
  const OUTLINE = '#171822';
  const cache = {}; // 精灵画布缓存

  /* ---------- 基础工具 ---------- */
  function grid(w, h, fill) {
    const g = [];
    for (let y = 0; y < h; y++) { const r = new Array(w); for (let x = 0; x < w; x++) r[x] = (fill === undefined ? '.' : fill); g.push(r); }
    return g;
  }
  function set(g, x, y, c) {
    if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && c !== '.') g[y][x] = c;
  }
  function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(g, i, j, c); }
  function px(g, x, y, c) { set(g, x, y, c); }
  function ellipse(g, cx, cy, rx, ry, c) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i - cx) / rx, dy = (j - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(g, i, j, c);
      }
  }
  function outline(g) {
    const h = g.length, w = g[0].length, ng = grid(w, h);
    const nb = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] !== '.') {
        set(ng, x, y, g[y][x]);
        for (let k = 0; k < 4; k++) {
          const nx = x + nb[k][0], ny = y + nb[k][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || g[ny][nx] === '.') set(ng, nx, ny, 'O');
        }
      }
    }
    return ng;
  }
  function makePalette(pal) {
    const p = Object.assign({}, pal);
    p['.'] = 'transparent'; p['O'] = OUTLINE; p['R'] = '#ff3b4e';
    return p;
  }
  function renderGrid(ctx, g, pal, dx, dy, scale, flip) {
    const h = g.length, w = g[0].length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = g[y][x];
      if (c === '.') continue;
      const col = pal[c];
      if (!col) continue;
      const sx = flip ? dx + (w - 1 - x) * scale : dx + x * scale;
      ctx.fillStyle = col;
      ctx.fillRect(sx, dy + y * scale, scale, scale);
    }
  }
  function spriteCanvas(spr, scale) {
    const key = spr.key + '|' + scale + '|' + (spr.flip ? 'f' : '');
    if (cache[key]) return cache[key];
    const w = spr.grid[0].length, h = spr.grid.length;
    const cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    renderGrid(ctx, spr.grid, spr.palette, 0, 0, scale, !!spr.flip);
    cache[key] = cv;
    return cv;
  }
  function drawSpr(ctx, spr, x, y, scale, flip) {
    const cv = spriteCanvas(Object.assign({}, spr, { key: spr.key, flip: !!flip }), scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(x), Math.round(y));
    return cv;
  }
  function buildSprite(key, gridData, palette) {
    const g = outline(gridData);
    return { key: key, grid: g, palette: makePalette(palette) };
  }

  /* ---------- 程序化随机 ---------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 颜色与明暗工具 ---------- */
  function hexLerp(hex, target, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const o = (v, tv) => Math.round(v + (tv - v) * amt);
    const nr = o(r, (target >> 16) & 255), ng = o(g, (target >> 8) & 255), nb = o(b, target & 255);
    return '#' + ((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1);
  }
  function applyShade(spr, bodyHex) {
    const g = spr.grid, h = g.length, w = g[0].length;
    spr.palette.H = hexLerp(bodyHex, 0xffffff, 0.30);
    spr.palette.S = hexLerp(bodyHex, 0x000000, 0.32);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (g[y][x] === 'B') {
        const up = y > 0 ? g[y - 1][x] : 'O';
        const dn = y < h - 1 ? g[y + 1][x] : 'O';
        if (up === 'O' || up === '.') g[y][x] = 'H';
        else if (dn === 'O' || dn === '.') g[y][x] = 'S';
      }
    }
    return spr;
  }
  function blinkOf(spr) {
    const g = spr.grid.map(r => r.slice());
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      if (g[y][x] === 'W' || g[y][x] === 'E') g[y][x] = 'B';
    }
    return { key: spr.key + ':bl', grid: g, palette: spr.palette };
  }
  const beastSprCache = {}, enemySprCache = {};

  /* ============================================================
   * 神兽生成器（四足 / 蛇形 / 鸟形 / 龟形）
   * ============================================================ */
  function drawQuad(b, C) {
    const g = grid(18, 16);
    const B = C.body, L = C.belly, A = C.accent, D = C.detail, K = C.shade, E = C.eye;
    const ears = b.ears || 'none', horns = b.horns || 'none', tail = b.tail || 'none';
    const wings = b.wings, mane = b.mane, stripes = b.stripes, spots = b.spots;
    const scales = b.scales, flame = b.flame, crown = b.crown, extra = b.featureExtra || '';
    // 四肢
    rect(g, 6, 11, 2, 3, K); rect(g, 8, 11, 2, 3, K); rect(g, 11, 11, 2, 3, K); rect(g, 13, 11, 2, 3, K);
    // 身体
    rect(g, 6, 7, 8, 5, B); px(g, 7, 7, B); px(g, 12, 7, B);
    rect(g, 7, 10, 6, 1, L);
    // 尾巴
    if (tail === 'fluffy') { rect(g, 2, 7, 4, 2, A); px(g, 1, 8, A); rect(g, 3, 6, 2, 1, A); px(g, 4, 5, A); }
    else if (tail === 'fox') { rect(g, 1, 8, 5, 2, A); px(g, 0, 9, A); px(g, 0, 8, A); px(g, 1, 7, A); px(g, 0, 7, 'W'); }
    else if (tail === 'long') { rect(g, 1, 9, 5, 1, A); px(g, 0, 9, A); px(g, 0, 10, A); }
    else if (tail === 'lion') { rect(g, 2, 6, 4, 3, A); px(g, 1, 7, A); px(g, 1, 8, A); px(g, 1, 6, A); }
    else if (tail === 'scaled') { rect(g, 2, 8, 4, 1, D); px(g, 1, 9, D); px(g, 1, 8, D); }
    else if (tail === 'fox9') { rect(g, 0, 7, 6, 2, A); px(g, 0, 6, A); px(g, 0, 9, A); px(g, 1, 5, A); px(g, 3, 5, A); px(g, 5, 5, A); px(g, 0, 10, 'W'); }
    if (flame) { rect(g, 0, 7, 2, 2, 'F'); px(g, 0, 6, 'F'); }
    // 颈部与头部
    rect(g, 12, 6, 3, 4, B);
    rect(g, 14, 5, 4, 4, B);
    rect(g, 16, 6, 2, 2, L); // 吻部
    px(g, 14, 6, 'W'); px(g, 15, 6, E); // 眼睛
    // 耳朵
    if (ears === 'fox') { rect(g, 14, 2, 2, 3, A); px(g, 15, 1, A); }
    else if (ears === 'cat') { px(g, 14, 2, A); px(g, 16, 2, A); rect(g, 14, 3, 1, 2, A); rect(g, 16, 3, 1, 2, A); }
    else if (ears === 'round') { px(g, 14, 2, A); px(g, 16, 2, A); px(g, 14, 3, A); px(g, 16, 3, A); }
    else if (ears === 'long') { rect(g, 14, 2, 2, 3, A); px(g, 14, 1, A); px(g, 16, 2, 2, 2, A); }
    // 角
    if (horns === 'stag') { px(g, 14, 3, D); px(g, 15, 2, D); px(g, 16, 1, D); px(g, 15, 0, D); px(g, 17, 2, D); px(g, 16, 3, D); }
    else if (horns === 'dragon') { px(g, 14, 4, 'G'); px(g, 15, 3, 'G'); px(g, 16, 2, 'G'); px(g, 17, 1, 'G'); px(g, 15, 2, 'G'); px(g, 14, 3, 'G'); }
    else if (horns === 'single') { px(g, 15, 3, D); px(g, 15, 2, D); px(g, 15, 1, D); }
    else if (horns === 'flame') { px(g, 14, 4, 'F'); px(g, 15, 3, 'F'); px(g, 16, 2, 'F'); }
    else if (horns === 'antler') { px(g, 14, 3, D); px(g, 15, 2, D); px(g, 16, 1, D); px(g, 17, 0, D); px(g, 16, 3, D); px(g, 17, 3, D); }
    // 鬃毛
    if (mane) { rect(g, 11, 5, 3, 4, A); px(g, 12, 4, A); }
    // 翅膀
    if (wings === 'bird') { rect(g, 3, 6, 3, 3, A); px(g, 2, 7, A); px(g, 2, 8, K); px(g, 5, 4, A); px(g, 3, 9, K); }
    else if (wings === 'bat') { rect(g, 2, 5, 2, 5, A); px(g, 1, 6, K); px(g, 1, 7, A); px(g, 4, 5, K); px(g, 4, 9, K); }
    else if (wings === 'dragon') { rect(g, 3, 4, 3, 3, A); px(g, 2, 5, A); px(g, 2, 6, K); px(g, 4, 7, K); }
    // 花纹
    if (stripes) { px(g, 7, 8, D); px(g, 7, 9, D); px(g, 10, 8, D); px(g, 10, 9, D); px(g, 12, 8, D); px(g, 12, 9, D); }
    if (spots) { px(g, 8, 8, D); px(g, 10, 8, D); px(g, 11, 9, D); }
    if (scales) { px(g, 7, 8, D); px(g, 9, 8, D); px(g, 11, 8, D); px(g, 8, 10, D); px(g, 10, 10, D); }
    if (crown) { px(g, 14, 3, 'G'); px(g, 15, 2, 'G'); px(g, 16, 3, 'G'); }
    if (extra.includes('9t')) { rect(g, 0, 8, 4, 1, A); px(g, 0, 9, A); px(g, 1, 10, A); rect(g, 4, 9, 2, 1, A); px(g, 5, 10, A); }
    if (extra.includes('flameEye')) { px(g, 15, 5, 'F'); px(g, 16, 5, 'F'); }
    return g;
  }

  function drawSerpent(b, C) {
    const g = grid(18, 16);
    const B = C.body, L = C.belly, A = C.accent, D = C.detail, E = C.eye, K = C.shade;
    const wings = b.wings, flame = b.flame, extra = b.featureExtra || '';
    const ys = [10, 9, 9, 10, 11, 11, 10, 9, 9, 10, 11, 11, 10, 9];
    for (let i = 0; i < 14; i++) {
      const x = i, y = ys[i];
      rect(g, x, y, 2, 3, B);
      px(g, x + 1, y - 1, B);
      rect(g, x, y + 2, 2, 1, L);
      if (i % 3 === 0) px(g, x + 1, y - 1, D);
    }
    // 头
    rect(g, 13, 5, 4, 4, B); px(g, 14, 4, B); px(g, 15, 4, B);
    rect(g, 16, 6, 2, 2, L);
    px(g, 14, 6, 'W'); px(g, 15, 6, E);
    px(g, 13, 4, 'G'); px(g, 14, 3, 'G'); px(g, 15, 2, 'G'); px(g, 16, 1, 'G'); px(g, 15, 1, 'G');
    px(g, 17, 8, A);
    if (flame) { rect(g, 0, 7, 2, 2, 'F'); px(g, 0, 6, 'F'); }
    if (wings === 'dragon') { rect(g, 4, 4, 3, 3, A); px(g, 3, 5, A); px(g, 3, 6, K); px(g, 5, 7, K); }
    if (extra.includes('flameEye')) { px(g, 15, 5, 'F'); px(g, 16, 5, 'F'); }
    if (extra.includes('beard')) { px(g, 16, 7, D); px(g, 17, 8, D); px(g, 17, 9, D); }
    return g;
  }

  function drawBird(b, C) {
    const g = grid(18, 16);
    const B = C.body, L = C.belly, A = C.accent, D = C.detail, K = C.shade, E = C.eye;
    const flame = b.flame, tail = b.tail || 'short', extra = b.featureExtra || '';
    // 腿
    if (!extra.includes('singleLeg')) rect(g, 6, 11, 2, 3, D);
    rect(g, 10, 11, 2, 3, D);
    // 身体
    rect(g, 5, 7, 8, 5, B); px(g, 6, 6, B); px(g, 7, 6, B); px(g, 11, 6, B);
    rect(g, 6, 10, 6, 1, L);
    // 翅膀
    rect(g, 4, 7, 4, 4, A); px(g, 3, 8, A); px(g, 3, 9, K); px(g, 7, 10, K);
    // 尾羽
    if (tail === 'long') { rect(g, 1, 9, 3, 3, A); px(g, 0, 9, A); px(g, 0, 10, A); px(g, 2, 12, A); px(g, 0, 11, D); }
    else if (tail === 'flame') { rect(g, 2, 9, 3, 2, 'F'); px(g, 1, 8, 'F'); px(g, 1, 10, 'F'); px(g, 0, 9, 'F'); }
    else if (tail === 'phoenix') { rect(g, 0, 9, 4, 2, A); px(g, 0, 11, A); px(g, 1, 12, A); px(g, 2, 13, A); px(g, 0, 10, D); px(g, 1, 8, A); }
    else { rect(g, 2, 9, 3, 2, A); px(g, 1, 10, A); }
    // 头与喙
    rect(g, 12, 5, 4, 4, B); px(g, 13, 4, B);
    rect(g, 15, 6, 2, 1, A); rect(g, 16, 7, 2, 1, A);
    px(g, 13, 6, 'W'); px(g, 14, 6, E);
    if (extra.includes('twinPupil')) px(g, 13, 7, E);
    // 冠羽
    if (b.crest) { px(g, 12, 3, A); px(g, 13, 2, A); px(g, 14, 3, A); }
    if (flame) { px(g, 11, 3, 'F'); px(g, 10, 2, 'F'); px(g, 12, 4, 'F'); }
    if (extra.includes('thirdLeg')) rect(g, 8, 11, 2, 3, D);
    return g;
  }

  function drawTurtle(b, C) {
    const g = grid(18, 16);
    const B = C.body, L = C.belly, A = C.accent, D = C.detail, K = C.shade, E = C.eye;
    const extra = b.featureExtra || '';
    // 甲壳
    rect(g, 4, 6, 10, 6, B); px(g, 4, 5, B); px(g, 5, 5, B); px(g, 12, 5, B); px(g, 13, 5, B);
    px(g, 7, 7, D); px(g, 9, 7, D); px(g, 11, 7, D); px(g, 6, 9, D); px(g, 8, 9, D); px(g, 10, 9, D); px(g, 12, 9, D); px(g, 9, 10, D);
    rect(g, 4, 11, 10, 1, K);
    // 头（朝左）
    rect(g, 1, 7, 4, 3, B); px(g, 0, 8, B);
    px(g, 2, 7, 'W'); px(g, 3, 7, E);
    px(g, 0, 7, L); px(g, 0, 9, L);
    // 四肢与尾
    rect(g, 4, 11, 2, 2, K); rect(g, 12, 11, 2, 2, K); px(g, 14, 11, K);
    // 金蟾特征
    if (extra.includes('toad')) { px(g, 7, 5, A); px(g, 11, 5, A); px(g, 9, 4, A); }
    if (extra.includes('coin')) { px(g, 8, 3, 'G'); px(g, 9, 3, 'G'); px(g, 8, 4, 'G'); px(g, 9, 4, 'G'); }
    if (extra.includes('serpent')) { px(g, 2, 4, A); px(g, 3, 3, A); }
    return g;
  }

  /* 组装神兽精灵 */
  function buildBeast(b, evo) {
    const ckey = b.id + ':' + evo;
    if (beastSprCache[ckey]) return beastSprCache[ckey];
    const C = b.colors;
    const evoGold = evo >= 2;
    const C2 = {
      body: C.body, belly: C.belly, accent: C.accent, detail: C.detail,
      eye: C.eye, shade: C.shade || '#222640'
    };
    let g;
    if (b.shape === 'serpent') g = drawSerpent(b, C2);
    else if (b.shape === 'bird') g = drawBird(b, C2);
    else if (b.shape === 'turtle') g = drawTurtle(b, C2);
    else g = drawQuad(b, C2);
    if (evoGold) { // 进化：金角/光点
      px(g, 14, 3, 'G'); px(g, 15, 2, 'G'); px(g, 16, 3, 'G');
      if (g[8] && g[8][8]) px(g, 8, 8, 'G');
      if (g[10] && g[10][9]) px(g, 9, 9, 'G');
    }
    const spr = buildSprite('beast:' + ckey, g, {
      B: C2.body, L: C2.belly, A: C2.accent, D: C2.detail, E: C2.eye,
      W: '#ffffff', K: C2.shade, G: '#ffd54a', F: '#ff8c3b'
    });
    applyShade(spr, C2.body);
    beastSprCache[ckey] = spr;
    return spr;
  }

  /* ============================================================
   * 敌人生成器（暗影兽潮）
   * ============================================================ */
  function drawEQuad(C, type) {
    const g = grid(18, 16);
    rect(g, 6, 11, 2, 3, C.shade); rect(g, 8, 11, 2, 3, C.shade);
    rect(g, 11, 11, 2, 3, C.shade); rect(g, 13, 11, 2, 3, C.shade);
    rect(g, 6, 7, 8, 5, C.body); rect(g, 7, 10, 6, 1, C.belly);
    rect(g, 2, 8, 4, 2, C.accent); px(g, 1, 8, C.accent);
    rect(g, 12, 6, 3, 4, C.body);
    rect(g, 14, 5, 4, 4, C.body);
    px(g, 14, 6, 'R'); px(g, 15, 6, 'R');
    rect(g, 16, 6, 2, 2, C.belly);
    if (type.horns) { px(g, 15, 3, C.detail); px(g, 15, 2, C.detail); }
    if (type.spikes) { px(g, 7, 6, C.detail); px(g, 9, 6, C.detail); px(g, 11, 6, C.detail); px(g, 13, 6, C.detail); }
    if (type.stripe) { px(g, 8, 8, C.detail); px(g, 10, 8, C.detail); }
    return g;
  }
  function drawEBat(C, type) {
    const g = grid(18, 16);
    rect(g, 1, 6, 3, 4, C.accent); px(g, 0, 6, C.shade); px(g, 0, 7, C.accent); px(g, 4, 5, C.shade);
    rect(g, 13, 6, 3, 4, C.accent); px(g, 17, 6, C.shade); px(g, 17, 7, C.accent); px(g, 14, 5, C.shade);
    rect(g, 5, 7, 8, 5, C.body); px(g, 6, 6, C.body); px(g, 7, 6, C.body);
    rect(g, 8, 4, 3, 2, C.body);
    px(g, 8, 5, 'R'); px(g, 10, 5, 'R');
    px(g, 7, 3, C.accent); px(g, 9, 3, C.accent); px(g, 11, 3, C.accent);
    rect(g, 6, 10, 6, 1, C.belly);
    return g;
  }
  function drawESerpent(C, type) {
    const g = grid(18, 16);
    const ys = [10, 9, 9, 10, 11, 11, 10, 9, 9, 10, 11, 11, 10, 9];
    for (let i = 0; i < 14; i++) { const x = i, y = ys[i]; rect(g, x, y, 2, 3, C.body); px(g, x + 1, y - 1, C.body); rect(g, x, y + 2, 2, 1, C.belly); }
    rect(g, 13, 5, 4, 4, C.body); px(g, 14, 4, C.body); px(g, 15, 4, C.body);
    px(g, 14, 6, 'R'); px(g, 15, 6, 'R');
    rect(g, 16, 6, 2, 2, C.belly);
    px(g, 13, 4, C.detail); px(g, 14, 3, C.detail); px(g, 15, 2, C.detail);
    if (type.horns) { px(g, 15, 3, C.detail); px(g, 16, 2, C.detail); }
    return g;
  }
  function drawEBlob(C, type) {
    const g = grid(18, 16);
    ellipse(g, 8, 9, 6, 5, C.body);
    rect(g, 4, 12, 9, 2, C.body);
    rect(g, 6, 13, 5, 2, C.shade);
    px(g, 6, 7, 'R'); px(g, 10, 7, 'R');
    rect(g, 5, 8, 2, 2, C.belly); rect(g, 9, 8, 2, 2, C.belly);
    px(g, 5, 6, C.detail); px(g, 8, 5, C.detail); px(g, 11, 6, C.detail);
    return g;
  }
  function buildEnemy(type, elite) {
    const ckey = type.id + ':' + (elite ? 'e' : 'n');
    if (enemySprCache[ckey]) return enemySprCache[ckey];
    const C = type.colors;
    let g;
    if (type.shape === 'bat') g = drawEBat(C, type);
    else if (type.shape === 'serpent') g = drawESerpent(C, type);
    else if (type.shape === 'blob') g = drawEBlob(C, type);
    else g = drawEQuad(C, type);
    if (elite) { px(g, 3, 2, 'G'); px(g, 14, 2, 'G'); px(g, 8, 1, 'G'); }
    const spr = buildSprite('enemy:' + ckey, g, {
      B: C.body, L: C.belly, A: C.accent, D: C.detail, E: C.eye,
      W: '#ffffff', K: C.shade, G: '#ffd54a', F: '#ff8c3b'
    });
    applyShade(spr, C.body);
    enemySprCache[ckey] = spr;
    return spr;
  }

  /* ============================================================
   * 主角：多米你可公司·实习研究员 阿灵
   * ============================================================ */
  const PLAYER_GRID = [
    '.....HHHH.......',
    '....HhHHHH......',
    '....HHHHHH......',
    '....HFFFFH......',
    '....HFEFFH......',
    '....HFFFFH......',
    '.....FFRF.......',
    '....BBGBB.......',
    '...PBBBBF.......',
    '...PBBBBF.......',
    '...PBBBBBB......',
    '....KKKKK.......',
    '...LL..LL.......',
    '...LL..LL.......',
    '...KK....KK.....',
    '................'
  ];
  const PLAYER_GRID_B = [
    '.....HHHH.......',
    '....HhHHHH......',
    '....HHHHHH......',
    '....HFFFFH......',
    '....HFEFFH......',
    '....HFFFFH......',
    '.....FFRF.......',
    '....BBGBB.......',
    '...PBBBBF.......',
    '...PBBBBF.......',
    '...PBBBBBB......',
    '....KKKKK.......',
    '..LL....LL......',
    '..LL....LL......',
    '..KK....KK......',
    '................'
  ];
  function buildPlayer(frame) {
    return buildSprite('player' + (frame ? 'b' : ''), frame ? PLAYER_GRID_B : PLAYER_GRID, {
      H: '#6b4226', h: '#a0704a', F: '#ffd9b3', E: '#23243a', R: '#ff6b6b',
      B: '#dfe6ff', P: '#3b5bbf', K: '#2c3350', L: '#5b6b8f', G: '#ffd54a'
    });
  }

  /* ============================================================
   * 道具 / 装饰 小像素
   * ============================================================ */
  function buildSmall(key, rows, pal) { return buildSprite(key, rows.map(r => r.split('')), pal); }

  const XP_ORB = [
    '..CC..',
    '.CWWC.',
    'CWWWWC',
    'CWWWWC',
    '.CWWC.',
    '..CC..'
  ];
  const COIN = [
    '..GG..',
    '.GWWG.',
    'GWGGWG',
    'GWGGWG',
    '.GWWG.',
    '..GG..'
  ];
  const HEART = [
    '.RR.RR.',
    'RRRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...'
  ];
  const EGG = [
    '..DDDD..',
    '.DWDDDD.',
    'DDDDDDDD',
    'DDDDDDDD',
    'DDDWDDDD',
    'DWWDDDDD',
    'DDDDDWDD',
    'DDDDDDDD',
    '.DDDDDD.',
    '..DDDD..'
  ];
  const TREE = [
    '....GG....',
    '...GGGG...',
    '..GGGGGG..',
    '.GGGGGGGG.',
    '.GDDGGDGG.',
    'GGGGGGGGGG',
    '.GGDDGGGG.',
    '..GGGGGG..',
    '....BB....',
    '....BB....',
    '...BBB....',
    '....BB....'
  ];
  const ROCK = [
    '...KKK...',
    '..KGGK...',
    '.KGGGGK..',
    'KGGGGGGK.',
    'KKKKKKKK.'
  ];
  const FLOWER = [
    '..A.A..',
    '.F.F.F.',
    '..A.A..',
    '...B...',
    '...B...'
  ];
  const GRASS = [
    '.GG.',
    'GGG.',
    'GG..'
  ];
  const ALTAR = [
    '....GG....',
    '...GGGG...',
    '..G....G..',
    '.GG....GG.',
    '.G..KK..G.',
    '.G..KK..G.',
    '.G......G.',
    '.G..CC..G.',
    '.G..CC..G.',
    '.G......G.',
    'GGGGGGGGGG',
    '..GGGGGG..'
  ];
  const BONE = [
    'WW..WW',
    'WW..WW',
    '.WWWW.',
    '..WW..',
    '.WWWW.',
    'WW..WW',
    'WW..WW'
  ];

  function initSmall() {
    return {
      xp: buildSmall('xp', XP_ORB, { C: '#4dd0e1', W: '#eaffff' }),
      coin: buildSmall('coin', COIN, { G: '#ffd54a', W: '#fff3c4' }),
      heart: buildSmall('heart', HEART, { R: '#ff6b6b' }),
      egg: buildSmall('egg', EGG, { D: '#c9a7ff', W: '#ffe9ff' }),
      tree: buildSmall('tree', TREE, { G: '#4caf6e', D: '#2e7d4f', B: '#7a4a2b' }),
      rock: buildSmall('rock', ROCK, { K: '#3a3f55', G: '#5a6078' }),
      flower: buildSmall('flower', FLOWER, { A: '#ffd54a', F: '#ff8c9e', B: '#2e7d4f' }),
      grass: buildSmall('grass', GRASS, { G: '#3f9d5f' }),
      altar: buildSmall('altar', ALTAR, { G: '#8b93c4', K: '#2c3350', C: '#4dd0e1' }),
      bone: buildSmall('bone', BONE, { W: '#d8dbe8' })
    };
  }

  /* ============================================================
   * 场景地面生成
   * ============================================================ */
  function buildGround(zone, seed) {
    const cv = document.createElement('canvas');
    cv.width = 200; cv.height = 200;
    const ctx = cv.getContext('2d');
    const rnd = mulberry(seed);
    const base = zone.ground.base, alt = zone.ground.alt, patch = zone.ground.patch || alt;
    ctx.fillStyle = base; ctx.fillRect(0, 0, 200, 200);
    // 噪点
    for (let i = 0; i < 1600; i++) {
      const x = Math.floor(rnd() * 200), y = Math.floor(rnd() * 200);
      const s = rnd() > 0.5 ? 1 : 2;
      ctx.fillStyle = rnd() > 0.5 ? alt : patch;
      ctx.globalAlpha = 0.35 + rnd() * 0.3;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
    // 大块色斑
    for (let i = 0; i < 14; i++) {
      const x = rnd() * 200, y = rnd() * 200, r = 14 + rnd() * 26;
      ctx.fillStyle = patch;
      ctx.globalAlpha = 0.12 + rnd() * 0.16;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return cv;
  }

  return {
    mulberry: mulberry,
    spriteCanvas: spriteCanvas,
    drawSpr: drawSpr,
    buildBeast: buildBeast,
    buildEnemy: buildEnemy,
    buildPlayer: buildPlayer,
    blinkOf: blinkOf,
    buildGround: buildGround,
    small: initSmall()
  };
})();
