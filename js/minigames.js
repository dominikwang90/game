'use strict';
/* ============================================================
 * 奇遇关卡：俄罗斯方块 / 连连看
 * 通关后随机触发；通过 → 双倍奖励，失败 → 丢失部分资源
 * ============================================================ */
window.MG = (function () {
  const ENCOUNTER_CHANCE = 0.45;
  const GAMES = [
    { id: 'tetris', name: '俄罗斯方块', icon: '🧱', desc: '120 秒内消满 4 行即可获胜' },
    { id: 'lianlian', name: '连连看', icon: '🔗', desc: '150 秒内消除全部成对灵兽即可获胜' }
  ];

  let _rewards = null;
  let active = false;

  function el(id) { return document.getElementById(id); }
  function make(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; }
  function randomGame() { return GAMES[Math.floor(Math.random() * GAMES.length)]; }

  function overlay(inner) {
    const m = make('<div class="mg-mask"><div class="mg-box">' + inner + '</div></div>');
    document.body.appendChild(m);
    return m;
  }
  function endOverlay(mask, win, cb) {
    const box = mask.querySelector('.mg-box');
    box.innerHTML = '<div class="mg-result ' + (win ? '' : 'lose') + '">' +
      (win ? '🎉 挑战成功！<br>本次奖励翻倍结算' : '💔 挑战失败……<br>将失去部分资源') +
      '<div class="row mt14"><div class="btn primary" id="mgOk">确定</div></div></div>';
    box.querySelector('#mgOk').onclick = () => { mask.remove(); active = false; cb(win); };
  }

  function run(game, rewards, onDone) {
    if (active) return;
    active = true;
    const g = game || randomGame();
    if (g.id === 'tetris') tetris(onDone);
    else lianlian(onDone);
  }

  /* ---------- 入口（由结算界面调用） ---------- */
  function accept(gameId) {
    const box = document.getElementById('encBox');
    if (box) box.remove();
    // showResult ?? MG._rewards ?????????????
    const R = (window.MG && window.MG._rewards) || _rewards;
    if (!R) return;
    const g = GAMES.find(x => x.id === gameId) || randomGame();
    run(g, R, (win) => {
      const rc = document.getElementById('resCoins'), rj = document.getElementById('resJade');
      if (win) {
        Engine.grantReward(R.coins, R.jade);
        UI.toast('奇遇通过！奖励翻倍：🪙+' + R.coins + ' 💎+' + R.jade);
        if (rc) rc.textContent = Number(rc.textContent) + R.coins;
        if (rj) rj.textContent = Number(rj.textContent) + R.jade;
      } else {
        const lc = Math.max(1, Math.floor(R.coins * 0.5));
        const lj = Math.min(5, Math.max(0, R.jade));
        Engine.forfeitReward(lc, lj);
        UI.toast('奇遇失败，失去 🪙' + lc + ' 💎' + lj);
        if (rc) rc.textContent = Math.max(0, Number(rc.textContent) - lc);
        if (rj) rj.textContent = Math.max(0, Number(rj.textContent) - lj);
      }
    });
  }
  function decline() { const b = document.getElementById('encBox'); if (b) b.remove(); }

  /* ================= 俄罗斯方块 ================= */
  const SHAPES = [
    { m: [[1, 1, 1, 1]], c: '#4dd0e1' },
    { m: [[1, 1], [1, 1]], c: '#ffd54a' },
    { m: [[0, 1, 0], [1, 1, 1]], c: '#b48cff' },
    { m: [[0, 1, 1], [1, 1, 0]], c: '#7ee787' },
    { m: [[1, 1, 0], [0, 1, 1]], c: '#ff6b6b' },
    { m: [[1, 0, 0], [1, 1, 1]], c: '#8ab4ff' },
    { m: [[0, 0, 1], [1, 1, 1]], c: '#ff8c3b' }
  ];
  const WIN_LINES = 4, TIME_LIMIT = 120;

  function tetris(onDone) {
    const W = 10, H = 20, CELL = 22;
    let board = [], cur = null, next = null, bag = [];
    let score = 0, lines = 0, time = 0, over = false, paused = false, win = false;
    let dropAcc = 0, dropMs = 620, raf = 0, last = 0;
    for (let i = 0; i < H; i++) board.push(new Array(W).fill(0));

    const mask = overlay(
      '<div class="mg-head"><span class="mg-title">🧱 俄罗斯方块 · 奇遇挑战</span>' +
      '<span class="mg-sub">消满 <b>' + WIN_LINES + '</b> 行获胜 · 超时或顶格则失败</span></div>' +
      '<div class="tet-wrap">' +
      '<canvas id="mgTet" width="' + (W * CELL) + '" height="' + (H * CELL) + '"></canvas>' +
      '<div class="tet-side">' +
      '<div class="tet-stat"><span>得分</span><b id="mgScore">0</b></div>' +
      '<div class="tet-stat"><span>消行</span><b id="mgLines">0/' + WIN_LINES + '</b></div>' +
      '<div class="tet-stat"><span>时间</span><b id="mgTime">' + TIME_LIMIT + '</b></div>' +
      '<div class="tet-stat"><span>下一块</span><canvas id="mgNext" width="88" height="88"></canvas></div>' +
      '<div class="tet-help">←→ 移动 · ↑ 旋转<br>↓ 软降 · 空格 硬降<br>P / Esc 暂停</div>' +
      '</div></div>'
    );
    const cv = el('mgTet'), ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const ncv = el('mgNext'), nctx = ncv.getContext('2d');
    nctx.imageSmoothingEnabled = false;

    function randShape() {
      if (!bag.length) {
        bag = SHAPES.map((s, i) => i);
        for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      }
      const s = SHAPES[bag.pop()];
      return { m: s.m.map(r => r.slice()), c: s.c };
    }
    function can(m, x, y) {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= W || ny >= H) return false;
        if (ny >= 0 && board[ny][nx]) return false;
      }
      return true;
    }
    function spawn() {
      cur = next;
      next = randShape();
      if (!cur) cur = randShape();
      cur.x = Math.floor((W - cur.m[0].length) / 2);
      cur.y = 0;
      if (!can(cur.m, cur.x, cur.y)) { over = true; win = false; }
    }
    function lock() {
      for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) {
        if (cur.m[r][c]) { const y = cur.y + r; if (y >= 0) board[y][cur.x + c] = cur.c; }
      }
      let cleared = 0;
      for (let y = H - 1; y >= 0; y--) {
        if (board[y].every(v => v)) { board.splice(y, 1); board.unshift(new Array(W).fill(0)); cleared++; y++; }
      }
      if (cleared) {
        lines += cleared;
        score += cleared * 100 * (1 + (cleared - 1));
        if (lines >= WIN_LINES) { over = true; win = true; return; }
      }
      dropMs = Math.max(260, 620 - lines * 60);
      spawn();
    }
    function step() {
      if (can(cur.m, cur.x, cur.y + 1)) cur.y++;
      else lock();
    }
    function draw() {
      ctx.fillStyle = '#0a0c16'; ctx.fillRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (board[y][x]) {
          ctx.fillStyle = board[y][x];
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(x * CELL, y * CELL, CELL, 2);
        }
      }
      if (cur && !over) {
        ctx.fillStyle = cur.c;
        for (let r = 0; r < cur.m.length; r++) for (let c = 0; c < cur.m[r].length; c++) {
          if (cur.m[r][c]) ctx.fillRect((cur.x + c) * CELL, (cur.y + r) * CELL, CELL, CELL);
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
      for (let x = 1; x < W; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, cv.height); ctx.stroke(); }
      nctx.fillStyle = '#0a0c16'; nctx.fillRect(0, 0, 88, 88);
      if (next) {
        nctx.fillStyle = next.c;
        const m = next.m, cw = 22;
        const ox = Math.floor((88 - m[0].length * cw) / 2), oy = Math.floor((88 - m.length * cw) / 2);
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) if (m[r][c]) nctx.fillRect(ox + c * cw, oy + r * cw, cw, cw);
      }
      if (paused && !over) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 20px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('已暂停', cv.width / 2, cv.height / 2);
        ctx.textAlign = 'left';
      }
      el('mgScore').textContent = score;
      el('mgLines').textContent = lines + '/' + WIN_LINES;
      el('mgTime').textContent = Math.max(0, Math.ceil(TIME_LIMIT - time));
    }
    function onKey(e) {
      if (over) return;
      e.stopPropagation();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyP' || e.code === 'Escape') { paused = !paused; return; }
      if (paused) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { if (can(cur.m, cur.x - 1, cur.y)) cur.x--; }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { if (can(cur.m, cur.x + 1, cur.y)) cur.x++; }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { if (can(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 1; } else lock(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        const nm = cur.m[0].map((_, c) => cur.m.map(row => row[c]).reverse());
        for (const k of [0, -1, 1, -2, 2]) { if (can(nm, cur.x + k, cur.y)) { cur.m = nm; cur.x += k; return; } }
      }
      else if (e.code === 'Space') { while (can(cur.m, cur.x, cur.y + 1)) cur.y++; lock(); }
    }
    window.addEventListener('keydown', onKey, true);

    spawn();
    function frame(t) {
      if (over) {
        window.removeEventListener('keydown', onKey, true);
        cancelAnimationFrame(raf);
        endOverlay(mask, win, onDone);
        return;
      }
      if (!paused) {
        const dt = Math.min(0.05, (t - last) / 1000 || 0);
        last = t;
        time += dt;
        dropAcc += dt;
        if (dropAcc >= dropMs) { dropAcc = 0; step(); }
        if (time >= TIME_LIMIT && !over) { over = true; win = false; return; }
      }
      draw();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  /* ================= 连连看 ================= */
  const LL_SYMBOLS = ['🐉', '🐯', '🦊', '🐍', '🐢', '🐦', '🐺', '🐗', '🐀', '🐇', '🐨', '🦄', '🐼', '🦁', '🐸', '🦋', '🐝', '🌺', '🍀', '⚡', '💧', '🔥', '🌙', '⭐'];
  const LL_W = 8, LL_H = 6, LL_TIME = 150;

  function lianlian(onDone) {
    let grid = [], remaining = LL_W * LL_H, sel = null, time = 0, over = false;
    let hint = null, timer = 0, tick = 0;

    function build() {
      const pool = [];
      for (let i = 0; i < (LL_W * LL_H) / 2; i++) pool.push(LL_SYMBOLS[i], LL_SYMBOLS[i]);
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const g = [];
      for (let r = 0; r < LL_H; r++) g.push(pool.slice(r * LL_W, (r + 1) * LL_W));
      return g;
    }
    function b2() {
      const b = [];
      for (let r = 0; r < LL_H + 2; r++) { const row = []; for (let c = 0; c < LL_W + 2; c++) row.push(0); b.push(row); }
      for (let r = 0; r < LL_H; r++) for (let c = 0; c < LL_W; c++) if (grid[r][c]) b[r + 1][c + 1] = grid[r][c];
      return b;
    }
    function clearH(b, r, c1, c2) { const lo = Math.min(c1, c2), hi = Math.max(c1, c2); for (let c = lo + 1; c < hi; c++) if (b[r][c]) return false; return true; }
    function clearV(b, c, r1, r2) { const lo = Math.min(r1, r2), hi = Math.max(r1, r2); for (let r = lo + 1; r < hi; r++) if (b[r][c]) return false; return true; }
    function connect(r1, c1, r2, c2) {
      const b = b2();
      r1++; c1++; r2++; c2++;
      if (b[r1][c1] !== b[r2][c2]) return null;
      if (r1 === r2 && clearH(b, r1, c1, c2)) return [[r1, c1], [r2, c2]];
      if (c1 === c2 && clearV(b, c1, r1, r2)) return [[r1, c1], [r2, c2]];
      if (b[r1][c2] === 0 && clearH(b, r1, c1, c2) && clearV(b, c2, r1, r2)) return [[r1, c1], [r1, c2], [r2, c2]];
      if (b[r2][c1] === 0 && clearH(b, r2, c1, c2) && clearV(b, c1, r1, r2)) return [[r1, c1], [r2, c1], [r2, c2]];
      for (let i = 0; i < LL_H + 2; i++) {
        if (i === r1 || i === r2) continue;
        if (b[i][c1] === 0 && b[i][c2] === 0 && clearV(b, c1, r1, i) && clearH(b, i, c1, c2) && clearV(b, c2, i, r2)) return [[r1, c1], [i, c1], [i, c2], [r2, c2]];
      }
      for (let j = 0; j < LL_W + 2; j++) {
        if (j === c1 || j === c2) continue;
        if (b[r1][j] === 0 && b[r2][j] === 0 && clearH(b, r1, c1, j) && clearV(b, j, r1, r2) && clearH(b, r2, c2, j)) return [[r1, c1], [r1, j], [r2, j], [r2, c2]];
      }
      return null;
    }
    function findMove() {
      for (let r1 = 0; r1 < LL_H; r1++) for (let c1 = 0; c1 < LL_W; c1++) {
        if (!grid[r1][c1]) continue;
        for (let r2 = r1; r2 < LL_H; r2++) for (let c2 = (r2 === r1 ? c1 + 1 : 0); c2 < LL_W; c2++) {
          if (!grid[r2][c2]) continue;
          if (grid[r1][c1] === grid[r2][c2] && connect(r1, c1, r2, c2)) return [r1, c1, r2, c2];
        }
      }
      return null;
    }
    function shuffle() {
      const syms = [];
      for (const row of grid) for (const v of row) if (v) syms.push(v);
      for (let i = syms.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [syms[i], syms[j]] = [syms[j], syms[i]]; }
      let k = 0;
      for (let r = 0; r < LL_H; r++) for (let c = 0; c < LL_W; c++) if (grid[r][c]) grid[r][c] = syms[k++];
    }

    const mask = overlay(
      '<div class="mg-head"><span class="mg-title">🔗 连连看 · 奇遇挑战</span>' +
      '<span class="mg-sub">点击相同的灵兽，路径转弯不超过 2 次即可消除</span></div>' +
      '<div class="ll-bar">' +
      '<div class="tet-stat"><span>剩余</span><b id="llLeft">' + remaining + '</b></div>' +
      '<div class="tet-stat"><span>时间</span><b id="llTime">' + LL_TIME + '</b></div>' +
      '<div class="btn small" id="llHint">💡 提示</div>' +
      '</div>' +
      '<div class="ll-grid" id="llGrid"></div>'
    );

    function render() {
      const g = el('llGrid');
      g.style.gridTemplateColumns = 'repeat(' + LL_W + ', 46px)';
      g.innerHTML = '';
      for (let r = 0; r < LL_H; r++) for (let c = 0; c < LL_W; c++) {
        const v = grid[r][c];
        const d = document.createElement('div');
        d.className = 'll-tile' + (v ? '' : ' removed');
        d.dataset.r = r; d.dataset.c = c;
        d.textContent = v || '';
        if (sel && sel.r === r && sel.c === c) d.classList.add('sel');
        if (hint && ((hint[0] === r && hint[1] === c) || (hint[2] === r && hint[3] === c))) d.classList.add('link');
        g.appendChild(d);
      }
      el('llLeft').textContent = remaining;
      el('llTime').textContent = Math.max(0, LL_TIME - time);
    }
    function flash(mv) {
      const g = el('llGrid');
      const cells = g.children;
      const idx = (r, c) => r * LL_W + c;
      const mark = (r, c) => { const d = cells[idx(r, c)]; if (d) { d.classList.add('link'); setTimeout(() => d.classList.remove('link'), 450); } };
      mark(mv[0], mv[1]); mark(mv[2], mv[3]);
    }
    function clickTile(r, c) {
      if (over) return;
      const v = grid[r][c];
      if (!v) return;
      if (!sel) { sel = { r, c }; render(); return; }
      if (sel.r === r && sel.c === c) { sel = null; render(); return; }
      const path = connect(sel.r, sel.c, r, c);
      if (path) {
        grid[sel.r][sel.c] = null; grid[r][c] = null;
        remaining -= 2;
        flash([sel.r, sel.c, r, c]);
        sel = null;
        render();
        if (remaining === 0) { over = true; winEnd(); return; }
        if (!findMove()) { shuffle(); UI.toast('没有可消除的组合，已重排'); render(); }
        return;
      }
      sel = { r, c };
      render();
    }
    function winEnd() {
      clearInterval(tick);
      endOverlay(mask, true, onDone);
    }
    function loseEnd() {
      if (over) return;
      over = true;
      clearInterval(tick);
      endOverlay(mask, false, onDone);
    }

    el('llGrid').addEventListener('click', (e) => {
      const t = e.target.closest('.ll-tile:not(.removed)');
      if (t) clickTile(Number(t.dataset.r), Number(t.dataset.c));
    });
    el('llHint').addEventListener('click', () => {
      const mv = findMove();
      if (mv) { hint = mv; render(); setTimeout(() => { hint = null; render(); }, 2600); }
      else { shuffle(); render(); UI.toast('已重排盘面'); }
    });

    grid = build();
    render();
    tick = setInterval(() => {
      if (over) return;
      time++;
      el('llTime').textContent = Math.max(0, LL_TIME - time);
      if (time >= LL_TIME) loseEnd();
    }, 1000);
  }

  return {
    ENCOUNTER_CHANCE, GAMES, randomGame, accept, decline
  };
})();
