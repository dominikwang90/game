'use strict';
/* ============================================================
 * 游戏引擎：状态机 / 割草战斗 / 神兽伙伴 / 升级 / 存档
 * ============================================================ */
window.Engine = (function () {
  const D = window.DATA, SP = window.SP;
  const SAVE_KEY = 'shenshou_save_v1';
  const WORLD_W = 2400, WORLD_H = 1800;
  const VIEW_W = 480, VIEW_H = 270;

  /* ---------- 武器参数 ---------- */
  const WD = {
    sword:  { base: { cd: 1.0, dmg: 12, speed: 340, pierce: 1 }, perLv: { dmg: 6, pierce: 0.35, cd: -0.045 }, countAt: [2, 5, 8] },
    ring:   { base: { cd: 0.6, dmg: 10, radius: 46, speed: 3.1, count: 1 }, perLv: { dmg: 5 }, countAt: [2, 4, 6, 8], radGrow: 4 },
    ribbon: { base: { cd: 4.2, dmg: 22, radius: 95 }, perLv: { dmg: 12, cd: -0.35, radius: 8 } },
    fan:    { base: { cd: 1.7, dmg: 8, count: 3, speed: 300 }, perLv: { dmg: 4, cd: -0.06 }, countAt: [2, 4, 6] },
    coin:   { base: { cd: 1.2, dmg: 14, bounces: 2, speed: 330 }, perLv: { dmg: 8, bounces: 0.5 } },
    whip:   { base: { cd: 2.3, dmg: 32, chain: 3, range: 250 }, perLv: { dmg: 12, chain: 0.5, cd: -0.1 } },
    staff:  { base: { dmg: 26, radius: 58, speed: 1.6, count: 1 }, perLv: { dmg: 10, radius: 6, speed: 0.08 } },
    wheels: { base: { ms: 0.08, dmg: 4 }, perLv: { ms: 0.08, dmg: 8 } }
  };
  const WEAPON_ORDER = ['sword', 'ring', 'ribbon', 'fan', 'coin', 'whip', 'staff', 'wheels'];

  /* ---------- 音效 ---------- */
  const Sfx = (function () {
    let ctx = null;
    function unlock() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ctx && ctx.state === 'suspended') ctx.resume(); }
    function beep(f, dur, type, vol, slide) {
      if (!ctx || G.muted) return;
      try {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'square'; o.frequency.value = f;
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
      } catch (e) { }
    }
    return {
      unlock,
      hit() { beep(190, 0.06, 'square', 0.04, 130); },
      hurt() { beep(120, 0.22, 'sawtooth', 0.06, 55); },
      pickup() { beep(660, 0.07, 'square', 0.04, 880); },
      coin() { beep(880, 0.08, 'square', 0.045, 1320); },
      level() { beep(523, 0.1, 'square', 0.05); setTimeout(() => beep(659, 0.1, 'square', 0.05), 90); setTimeout(() => beep(784, 0.13, 'square', 0.05), 180); },
      boss() { beep(90, 0.55, 'sawtooth', 0.09, 50); },
      hatch() { beep(440, 0.1, 'triangle', 0.06); setTimeout(() => beep(660, 0.1, 'triangle', 0.06), 110); setTimeout(() => beep(880, 0.2, 'triangle', 0.06), 220); },
      click() { beep(620, 0.05, 'square', 0.03, 740); },
      dash() { beep(300, 0.09, 'sine', 0.05, 520); },
      whip() { beep(920, 0.13, 'sawtooth', 0.05, 180); },
      pet() { beep(700, 0.16, 'sine', 0.06, 1150); },
      ult() { beep(150, 0.18, 'sawtooth', 0.06, 320); setTimeout(() => beep(230, 0.2, 'square', 0.05, 460), 70); }
    };
  })();

  /* ---------- 全局状态 ---------- */
  const G = {
    canvas: null, ctx: null,
    state: 'boot',
    save: null,
    zoneIdx: 0, zone: null, boss: null,
    player: null,
    enemies: [], projectiles: [], pickups: [], companions: [], effects: [], texts: [],
    battleTime: 0, spawnTimer: 0, nextEliteAt: 30, bossSpawned: false, bossWarn: 0, grace: 5,
    kills: 0, runCoins: 0, runXp: 0,
    levelOpts: [], pendingLevels: 0,
    revives: 1,
    shake: 0, flash: 0, announce: null, announceT: 0,
    camX: 0, camY: 0,
    wheelsT: 0,
    rain: null, clouds: null, archCv: null,
    muted: false,
    groundCache: {}, decorCache: {},
    invuln: 0, hitFlash: 0, time: 0, paused: false,
    speedT: 0, speedMul: 0, atkBoostT: 0, atkBoostMul: 0, shieldT: 0, shield: 0,
    dropBoostT: 0, dropMul: 1, magnetT: 0, magnetR: 0, healT: 0
  };

  /* ---------- 工具 ---------- */
  const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
  const dist = (a, b) => Math.sqrt(dist2(a, b));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- 存档 ---------- */
  function defaultSave() { return { v: 1, coins: 0, jade: 0, pulls: 0, pityRare: 0, pityMyth: 0, beasts: {}, team: [], zone: 0, seenStory: false, artifacts: {}, gear: {}, stats: { kills: 0, clears: 0 } }; }
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return Object.assign(defaultSave(), s); } catch (e) { }
    return defaultSave();
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { } }

  /* ---------- 玩家 ---------- */
  function newPlayer() {
    return {
      x: WORLD_W / 2, y: WORLD_H / 2, r: 10, facing: 1,
      hp: 100, maxHp: 100, lv: 1, xp: 0, xpNext: 9,
      weapons: { sword: 1 }, passives: {}, orbitals: [],
      invuln: 0, hurtCd: 0, regenT: 0, moveDir: { x: 0, y: 0 }, strikeT: 0, strikeVx: 0, strikeVy: 0
    };
  }
  function recalcStats() {
    const p = G.player;
    const st = { atkMul: 1, ms: 170, armor: 0, critCh: 0.05, critMul: 1.5, pickupR: 75, xpMul: 1, coinMul: 1, regen: 0.2, maxHp: 100, dmgRed: 0, dropMul: 1, burn: 0 };
    for (const id in p.passives) {
      const lv = p.passives[id], def = D.PASSIVES[id], v = def.val * lv;
      if (def.stat === 'xpMul') st.xpMul += v;
      else if (def.stat === 'armor') st.armor += v;
      else if (def.stat === 'atkMul') st.atkMul += v;
      else if (def.stat === 'crit') { st.critCh += v; st.critMul += 0.15 * lv; }
      else if (def.stat === 'hp') { st.maxHp += v; st.regen += 0.4 * lv; }
      else if (def.stat === 'coinMul') st.coinMul += v;
      else if (def.stat === 'msMul') st.ms *= (1 + v);
      else if (def.stat === 'burn') st.burn = 9 * lv;
      else if (def.stat === 'dropMul') st.dropMul += v;
      else if (def.stat === 'magnet') st.pickupR += v;
    }
    if (p.weapons.wheels) st.ms *= (1 + WD.wheels.base.ms * p.weapons.wheels + WD.wheels.perLv.ms * (p.weapons.wheels - 1));
    for (const c of G.companions) {
      const b = D.BEASTS[c.id], sk = b.skill, v = sk.val;
      const scale = beastStatScale(c.lv);
      if (sk.stat === 'msMul') st.ms *= (1 + v * scale);
      else if (sk.stat === 'atkMul') st.atkMul *= (1 + v * scale);
      else if (sk.stat === 'hpMul') st.maxHp *= (1 + v * scale);
      else if (sk.stat === 'coinMul') st.coinMul *= (1 + v * scale);
      else if (sk.stat === 'xpMul') st.xpMul *= (1 + v * scale);
      else if (sk.stat === 'critCh') st.critCh += v * scale;
      else if (sk.stat === 'crit') { st.critCh += v * scale; st.critMul += 0.2 * scale; }
      else if (sk.stat === 'armor') st.armor += v * scale;
      else if (sk.stat === 'armorHp') { st.armor += v * scale; st.maxHp *= (1 + 0.08 * scale); }
      else if (sk.stat === 'atkHp') { st.atkMul *= (1 + v * scale); st.maxHp *= (1 + 0.10 * scale); }
      else if (sk.stat === 'dmgRed') st.dmgRed += v * scale;
      else if (sk.stat === 'all') { st.atkMul *= (1 + v * scale); st.maxHp *= (1 + v * scale); st.ms *= (1 + v * scale); }
      else if (sk.stat === 'msMag') { st.ms *= (1 + v * scale); st.pickupR += 60 * scale; }
      else if (sk.stat === 'armorDmg') { st.armor += v * scale; st.dmgRed += 0.08 * scale; }
      for (const aid of gearOf(c.id)) { const art = D.ARTIFACTS[aid]; if (art) applyArtifact(st, art); }
    }
    st.maxHp = Math.floor(st.maxHp);
    const oldPct = p.hp / Math.max(1, p.maxHp);
    p.maxHp = st.maxHp;
    p.hp = Math.min(p.maxHp, Math.max(1, Math.round(p.maxHp * oldPct)));
    p.stats = st;
  }
  function beastStatScale(lv) {
    // ?? +2.5% ?????10/20 ?????????
    const per = 1 + (lv - 1) * 0.025;
    return per + (lv >= 20 ? 0.1 : (lv >= 10 ? 0.05 : 0));
  }
  function gearOf(beastId) { return (G.save && G.save.gear && G.save.gear[beastId]) || []; }
  function applyArtifact(st, art) {
    const v = art.val;
    if (art.stat === 'atkMul') st.atkMul *= (1 + v);
    else if (art.stat === 'hpMul') st.maxHp *= (1 + v);
    else if (art.stat === 'armor') st.armor += v;
    else if (art.stat === 'critCh') st.critCh += v;
    else if (art.stat === 'crit') { st.critCh += v; st.critMul += 0.3; }
    else if (art.stat === 'xpMul') st.xpMul *= (1 + v);
    else if (art.stat === 'coinMul') st.coinMul *= (1 + v);
    else if (art.stat === 'dropMul') st.dropMul += v;
    else if (art.stat === 'msMul') st.ms *= (1 + v);
    else if (art.stat === 'burn') st.burn = Math.max(st.burn, Math.round(v));
    else if (art.stat === 'msMag') { st.ms *= (1 + v); st.pickupR += 60; }
    else if (art.stat === 'all') { st.atkMul *= (1 + v); st.maxHp *= (1 + v); st.ms *= (1 + v); }
  }
  function dmgOf(id, lv) { const b = WD[id]; return Math.round((b.base.dmg + b.perLv.dmg * (lv - 1)) * G.player.stats.atkMul); }
  /* ---------- 敌人 ---------- */
  function spawnEnemy(typeId, x, y, elite) {
    const def = D.ENEMIES[typeId];
    const z = G.zoneIdx;
    const hpMul = (1 + z * 0.35) * (1 + G.battleTime / 480);
    const dmgMul = 1 + z * 0.18;
    const e = {
      id: 'e' + (G.enemies.length) + Math.random().toString(36).slice(2, 6),
      type: def, x, y, r: def.r, elite: !!elite,
      hp: Math.round(def.hp * hpMul * (elite ? 3.2 : 1)),
      maxHp: Math.round(def.hp * hpMul * (elite ? 3.2 : 1)),
      dmg: Math.round(def.dmg * dmgMul * (elite ? 1.5 : 1)),
      spd: def.spd * (elite ? 0.85 : 1) * (0.92 + Math.random() * 0.16),
      xp: def.xp * (elite ? 5 : 1), coin: def.coin * (elite ? 3 : 1),
      hitCd: 0, bob: Math.random() * 6.28, dead: false
    };
    G.enemies.push(e);
    return e;
  }
  function nearestEnemy(x, y, range, exclude) {
    let best = null, bd = range ? range * range : Infinity;
    for (const e of G.enemies) {
      if (exclude && exclude.has(e)) continue;
      const d = dist2({ x, y }, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function randomEnemy() { return G.enemies.length ? G.enemies[Math.floor(Math.random() * G.enemies.length)] : null; }

  function damageEnemy(e, dmg, opts) {
    if (e.dead) return;
    opts = opts || {};
    const p = G.player;
    let d = dmg;
    if (G.atkBoostT > 0) d = Math.round(d * (1 + G.atkBoostMul));
    if (Math.random() < p.stats.critCh) d = Math.round(d * p.stats.critMul);
    e.hp -= d;
    e.hitCd = 0.12;
    if (opts.kb && !e.elite) {
      const dx = e.x - p.x, dy = e.y - p.y, l = Math.hypot(dx, dy) || 1;
      e.x += (dx / l) * opts.kb * 0.35; e.y += (dy / l) * opts.kb * 0.35;
    }
    addText(e.x, e.y - e.r - 4, String(d), '#ffd54a', 0.5);
    if (e.hp <= 0) killEnemy(e);
    else Sfx.hit();
  }
  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    G.kills++;
    G.save.stats.kills++;
    for (let i = 0; i < (e.elite ? 5 : 2); i++)
      G.effects.push({ kind: 'puff', x: e.x + (Math.random() - 0.5) * 12, y: e.y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30, life: 0.5, color: '#8a7ab8', size: 2 + Math.random() * 2 });
    spawnPickup('xp', e.x, e.y, Math.round(e.xp));
    spawnPickup('coin', e.x + 8, e.y + 4, Math.round(e.coin * (G.dropBoostT > 0 ? G.dropMul : 1)));
    if (e.elite && !e.boss) { G.save.jade = (G.save.jade || 0) + 1; if (Math.random() < 0.06 * G.player.stats.dropMul) dropEggAt(e.x, e.y); }
  }
  function spawnPickup(kind, x, y, val) {
    G.pickups.push({
      kind, x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, val, life: 40, t: Math.random() * 6,
      beastId: kind === 'egg' ? val : null
    });
  }
  function dropEggAt(x, y) {
    const id = pickEggBeast();
    if (!id) return;
    spawnPickup('egg', x, y, id);
    announce('✨ 神兽蛋出现了！快去拾取');
  }
  function pickEggBeast() {
    const pool = G.zone.pool;
    const avail = pool.filter(id => !G.save.beasts[id]);
    const list = avail.length ? avail : pool;
    let total = 0;
    const weights = list.map(id => { const r = D.BEASTS[id].rarity; return (avail.includes(id) ? 6 : 1) * Math.pow(2.4, r); });
    weights.forEach(w => total += w);
    let roll = Math.random() * total;
    for (let i = 0; i < list.length; i++) { roll -= weights[i]; if (roll <= 0) return list[i]; }
    return list[list.length - 1];
  }

  /* ---------- 伤害数字 / 特效 / 公告 ---------- */
  function addText(x, y, str, color, life) { G.texts.push({ x, y, str, color: color || '#fff', life: life || 0.6, t: 0 }); }
  function announce(msg) { G.announce = msg; G.announceT = 2.4; }

  /* ---------- 开局 ---------- */
  function startBattle(zoneIdx) {
    G.zoneIdx = zoneIdx; G.zone = D.ZONES[zoneIdx]; G.boss = null;
    G.player = newPlayer();
    G.enemies = []; G.projectiles = []; G.pickups = []; G.companions = []; G.effects = []; G.texts = [];
    G.battleTime = 0; G.spawnTimer = 2; G.nextEliteAt = 30; G.bossSpawned = false; G.bossWarn = 0; G.grace = 5;
    G.kills = 0; G.runCoins = 0; G.runXp = 0; G.pendingLevels = 0; G.revives = 1; G.shake = 0; G.flash = 0; G.wheelsT = 0;
    G.invuln = 1.5; G.hitFlash = 0;
    G.speedT = 0; G.speedMul = 0; G.atkBoostT = 0; G.atkBoostMul = 0; G.shieldT = 0; G.shield = 0;
    G.dropBoostT = 0; G.dropMul = 1; G.magnetT = 0; G.magnetR = 0; G.healT = 0;
    for (const id of G.save.team) {
      if (D.BEASTS[id] && G.save.beasts[id]) {
        G.companions.push({ id, lv: G.save.beasts[id].lv, x: G.player.x - 30, y: G.player.y, cd: 0.6, mode: 'idle', timer: 0, target: null, hitSet: new Set(), bob: Math.random() * 6, ultCd: 0 });
      }
    }
    recalcStats();
    G.player.hp = G.player.maxHp;
    announce('出发！前往【' + G.zone.name + '】');
    G.state = 'battle';
    UI.show('battle');
    Sfx.click();
  }

  /* ---------- 升级 ---------- */
  function gainXp(v) {
    const p = G.player;
    p.xp += Math.round(v * p.stats.xpMul);
    G.runXp += v;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext; p.lv++;
      p.xpNext = Math.floor(7 + p.lv * 3 + p.lv * p.lv * 0.4);
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.18));
      G.pendingLevels++;
      Sfx.level();
    }
    if (G.pendingLevels > 0 && G.state === 'battle') enterLevelUp();
  }
  function enterLevelUp() {
    G.state = 'levelup';
    G.levelOpts = generateOptions();
    UI.show('levelup', G.levelOpts);
  }
  function generateOptions() {
    const p = G.player;
    const cand = [];
    for (const id in D.WEAPONS) {
      const def = D.WEAPONS[id], lv = p.weapons[id] || 0;
      if (lv < def.maxLv) cand.push({ kind: 'weapon', id, lvNew: lv + 1, name: def.name, icon: def.icon, desc: def.desc, lvText: 'Lv.' + lv + ' → Lv.' + (lv + 1) + '　' + def.lvDesc, w: lv ? 4 : 2 });
    }
    for (const id in D.PASSIVES) {
      const def = D.PASSIVES[id], lv = p.passives[id] || 0;
      if (lv < def.maxLv) cand.push({ kind: 'passive', id, lvNew: lv + 1, name: def.name, icon: def.icon, desc: def.desc + '（' + lv + '→' + (lv + 1) + '级）', lvText: 'Lv.' + lv + ' → Lv.' + (lv + 1), w: lv ? 3 : 2 });
    }
    if (p.hp < p.maxHp * 0.85) cand.push({ kind: 'heal', name: '灵泉甘露', icon: '💧', desc: '立即回复 40% 最大生命', lvText: '回复生命', w: 1.5 });
    cand.push({ kind: 'coins', name: '聚灵阵', icon: '🪙', desc: '立即获得 40 点灵力', lvText: '灵力+40', w: 1 });
    const out = [];
    while (out.length < 3 && cand.length) {
      let total = 0; cand.forEach(c => total += c.w || 1);
      let roll = Math.random() * total, pick = null;
      for (const c of cand) { roll -= (c.w || 1); if (roll <= 0) { pick = c; break; } }
      if (!pick) pick = cand[0];
      out.push(pick);
      cand.splice(cand.indexOf(pick), 1);
    }
    return out.map(o => { const c = Object.assign({}, o); delete c.w; return c; });
  }
  function chooseOption(i) {
    const opt = G.levelOpts[i];
    if (!opt) return;
    const p = G.player;
    if (opt.kind === 'weapon') p.weapons[opt.id] = opt.lvNew;
    else if (opt.kind === 'passive') p.passives[opt.id] = opt.lvNew;
    else if (opt.kind === 'heal') p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.4));
    else { G.runCoins += 40; G.save.coins += 40; spawnCoinBurst(p.x, p.y); }
    recalcStats();
    Sfx.click();
    G.pendingLevels--;
    if (G.pendingLevels > 0) { G.levelOpts = generateOptions(); UI.show('levelup', G.levelOpts); return; }
    G.state = 'battle';
    G.invuln = Math.max(G.invuln, 0.8);
    UI.show('battle');
  }
  function spawnCoinBurst(x, y) { for (let i = 0; i < 8; i++) G.effects.push({ kind: 'puff', x, y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 60, life: 0.6, color: '#ffd54a', size: 2 }); }
  /* ---------- 武器发射 ---------- */
  function syncOrbitals(kind, count, radius, speed, dmg, big) {
    const p = G.player;
    p.orbitals = p.orbitals.filter(o => o.kind !== kind);
    for (let i = 0; i < count; i++) {
      p.orbitals.push({ kind, angle: (i / count) * Math.PI * 2 + Math.random(), radius, speed, dmg, tick: 0, big });
    }
  }
  function fireWeapon(id, lv) {
    const p = G.player, b = WD[id];
    if (id === 'sword') {
      const dmg = dmgOf('sword', lv);
      const count = 1 + (lv >= 2) + (lv >= 5) + (lv >= 8);
      const pierce = 1 + Math.floor(lv * 0.35);
      const t = nearestEnemy(p.x, p.y, 560);
      let ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
      for (let i = 0; i < count; i++) {
        const a = ang + (i - (count - 1) / 2) * 0.16;
        G.projectiles.push({ kind: 'sword', x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 8, vx: Math.cos(a) * b.base.speed, vy: Math.sin(a) * b.base.speed, dmg, pierce, life: 1.1, hit: new Set(), flip: Math.cos(a) < 0 });
      }
      Sfx.pickup();
    } else if (id === 'ring') {
      const count = b.base.count + b.countAt.reduce((n, l) => n + (lv >= l ? 1 : 0), 0);
      syncOrbitals('ring', count, b.base.radius + lv * b.radGrow, b.base.speed + lv * 0.12, dmgOf('ring', lv), false);
    } else if (id === 'ribbon') {
      const r = b.base.radius + lv * b.perLv.radius, dmg = dmgOf('ribbon', lv);
      for (const e of G.enemies) if (!e.dead && dist2(e, p) < r * r) damageEnemy(e, dmg, { kb: 100 });
      G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 12, vr: 560, life: 0.42, color: 'rgba(255,107,138,0.85)' });
      G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 8, vr: 380, life: 0.55, color: 'rgba(255,213,74,0.7)' });
      Sfx.dash();
    } else if (id === 'fan') {
      const dmg = dmgOf('fan', lv);
      const count = b.base.count + b.countAt.reduce((n, l) => n + (lv >= l ? 1 : 0), 0);
      const t = nearestEnemy(p.x, p.y, 420);
      let ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
      for (let i = 0; i < count; i++) {
        const a = ang + (i - (count - 1) / 2) * 0.24;
        G.projectiles.push({ kind: 'fire', x: p.x + Math.cos(a) * 6, y: p.y + Math.sin(a) * 6, vx: Math.cos(a) * b.base.speed, vy: Math.sin(a) * b.base.speed, dmg, pierce: 1, life: 0.75, hit: new Set() });
      }
      Sfx.hit();
    } else if (id === 'coin') {
      const dmg = dmgOf('coin', lv);
      const bounces = Math.round(b.base.bounces + b.perLv.bounces * (lv - 1));
      const t = randomEnemy();
      if (!t) return;
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      G.projectiles.push({ kind: 'coin', x: p.x, y: p.y, vx: Math.cos(ang) * b.base.speed, vy: Math.sin(ang) * b.base.speed, dmg, bounces, life: 2.5, hit: new Set() });
      Sfx.coin();
    } else if (id === 'whip') {
      const dmg = dmgOf('whip', lv);
      const chain = Math.round(b.base.chain + b.perLv.chain * (lv - 1));
      const pts = [{ x: p.x, y: p.y }];
      const seen = new Set();
      let e = nearestEnemy(p.x, p.y, b.base.range);
      while (e && pts.length - 1 < chain) { pts.push({ x: e.x, y: e.y }); seen.add(e); damageEnemy(e, dmg, { kb: 30 }); e = nearestEnemy(e.x, e.y, 150, seen); }
      if (pts.length > 1) G.effects.push({ kind: 'lines', pts, life: 0.25, color: '#c792ff' });
      Sfx.whip();
    } else if (id === 'staff') {
      syncOrbitals('staff', b.base.count, b.base.radius + lv * b.perLv.radius, b.base.speed + lv * b.perLv.speed, dmgOf('staff', lv), true);
    }
  }
  function updateOrbitals(dt) {
    const p = G.player;
    for (const o of p.orbitals) {
      o.angle += o.speed * dt;
      const ox = p.x + Math.cos(o.angle) * o.radius, oy = p.y + Math.sin(o.angle) * o.radius;
      o.tick -= dt;
      if (o.tick <= 0) {
        o.tick = 0.3;
        const hitR = o.big ? 20 : 13;
        for (const e of G.enemies) if (!e.dead && dist2(e, { x: ox, y: oy }) < hitR * hitR) damageEnemy(e, o.dmg, { kb: o.big ? 70 : 0 });
      }
    }
  }

  /* ---------- 伙伴更新 ---------- */
  function updateCompanions(dt) {
    const p = G.player;
    G.companions.forEach((c, i) => {
      const b = D.BEASTS[c.id], lv = c.lv;
      const scale = beastStatScale(lv);
      const atk = Math.round((b.combat.atk + lv * 1.3) * p.stats.atkMul * scale);
      const cd = Math.max(0.5, b.combat.cd - lv * 0.02);
      if (c.ultCd > 0) c.ultCd -= dt;
      c.bob += dt * 4;
      if (c.mode === 'idle') {
        const offX = i === 0 ? -30 : 30, offY = (i === 0 ? -6 : 10) + Math.sin(c.bob) * 3;
        c.x += (p.x + offX - c.x) * Math.min(1, dt * 7);
        c.y += (p.y + offY - c.y) * Math.min(1, dt * 7);
        c.cd -= dt;
        if (c.cd <= 0) {
          const t = nearestEnemy(p.x, p.y, 320);
          if (t) {
            if (b.combat.style === 'dash') {
              c.mode = 'dash'; c.timer = 0.34; c.target = t; c.hitSet = new Set();
              Sfx.dash();
            } else if (b.combat.style === 'bolt') {
              const ang = Math.atan2(t.y - c.y, t.x - c.x);
              G.projectiles.push({ kind: 'bolt', x: c.x, y: c.y, vx: Math.cos(ang) * 310, vy: Math.sin(ang) * 310, dmg: atk, pierce: 0, life: 1.1, hit: new Set(), color: b.colors.accent });
              if (Math.random() < 0.2) G.effects.push({ kind: 'heart', x: c.x, y: c.y - 8, vx: (Math.random() - 0.5) * 24, vy: -26, life: 0.9 });
              c.cd = cd; Sfx.pickup();
            } else {
              const r = 95;
              for (const e of G.enemies) if (!e.dead && dist2(e, c) < r * r) damageEnemy(e, Math.round(atk * 0.8), { kb: 40 });
              G.effects.push({ kind: 'ring', x: c.x, y: c.y, r: 10, vr: 340, life: 0.4, color: b.colors.accent });
              c.cd = cd; Sfx.hit();
            }
          }
        }
      } else if (c.mode === 'dash') {
        c.timer -= dt;
        const t = c.target;
        if (t && !t.dead) {
          const ang = Math.atan2(t.y - c.y, t.x - c.x);
          c.x += Math.cos(ang) * (300 + lv * 6) * dt;
          c.y += Math.sin(ang) * (300 + lv * 6) * dt;
          for (const e of G.enemies) {
            if (!e.dead && !c.hitSet.has(e) && dist2(e, c) < 32 * 32) { c.hitSet.add(e); damageEnemy(e, atk, { kb: 90 }); }
          }
        }
        if (c.timer <= 0) { c.mode = 'idle'; c.cd = cd; }
      }
    });
  }
  /* ---------- 战斗更新 ---------- */
    /* ---------- 专属技能 · Q/E ---------- */
  function useUlt(i) {
    const p = G.player;
    if (G.state !== 'battle' || G.paused || !p) return;
    const c = G.companions[i];
    if (!c) return;
    const b = D.BEASTS[c.id], ult = b.ult;
    if (!ult || c.ultCd > 0) return;
    c.ultCd = ult.cd;
    const ef = ult.effect || {};
    const cx = p.x, cy = p.y;
    const col = b.colors.accent || '#ffd54a';
    const dmg = (v) => Math.round(v * p.stats.atkMul);
    Sfx.ult();
    announce('✦ ' + b.name + ' · ' + ult.name + '！');
    if (ef.type === 'nova' || ef.type === 'vortex') {
      const r = ef.radius || 150;
      for (const e of G.enemies) {
        if (e.dead || dist2(e, p) > r * r) continue;
        damageEnemy(e, dmg(ef.power || 20), { kb: ef.type === 'vortex' ? -30 : 70 });
        if (ef.type === 'vortex' || ef.vortex) {
          const dx = p.x - e.x, dy = p.y - e.y, l = Math.hypot(dx, dy) || 1;
          e.x += (dx / l) * 120; e.y += (dy / l) * 120;
        }
        if (ef.burn) damageEnemy(e, ef.burn, {});
        if (ef.slow) { e.slowT = ef.slowDur || 3; e.slowMul = ef.slow; }
      }
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 10, vr: 560, life: 0.5, color: col });
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 6, vr: 300, life: 0.75, color: 'rgba(255,255,255,0.8)' });
      G.flash = Math.max(G.flash, 0.22);
      if (ef.heal) { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * ef.heal)); addText(cx, cy - 26, '+HP', '#7dff9b', 0.7); }
    } else if (ef.type === 'beam') {
      const t = nearestEnemy(p.x, p.y, 560);
      const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
      G.projectiles.push({ kind: 'beam', x: cx + Math.cos(ang) * 12, y: cy + Math.sin(ang) * 12, vx: Math.cos(ang) * 680, vy: Math.sin(ang) * 680, dmg: dmg(ef.power || 30), pierce: 99, life: 0.55, hit: new Set(), color: col });
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 8, vr: 340, life: 0.3, color: col });
      G.flash = Math.max(G.flash, 0.15);
    } else if (ef.type === 'heal') {
      const hp = Math.round(p.maxHp * (ef.power || 0.3));
      p.hp = Math.min(p.maxHp, p.hp + hp);
      G.healT = ef.dur || 4;
      addText(cx, cy - 26, '+' + hp + ' 生命', '#7dff9b', 0.7);
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 8, vr: 400, life: 0.5, color: '#7dff9b' });
      for (let k = 0; k < 8; k++) G.effects.push({ kind: 'puff', x: cx + (Math.random() - 0.5) * 30, y: cy - 6 + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 30, life: 0.6, color: '#7dff9b', size: 2 });
    } else if (ef.type === 'shield') {
      G.shield = Math.round(p.maxHp * (ef.power || 0.5));
      G.shieldT = ef.dur || 4;
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 8, vr: 460, life: 0.6, color: '#7fd4ff' });
      addText(cx, cy - 26, '护盾 +' + G.shield, '#7fd4ff', 0.7);
    } else if (ef.type === 'speed') {
      G.speedT = ef.dur || 5; G.speedMul = ef.power || 0.5;
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 6, vr: 380, life: 0.5, color: '#9ad1ff' });
      addText(cx, cy - 26, '疾风！', '#9ad1ff', 0.7);
    } else if (ef.type === 'buffAtk') {
      G.atkBoostT = ef.dur || 5; G.atkBoostMul = ef.power || 0.35;
      if (ef.shield) { G.shield = Math.round(p.maxHp * ef.shield); G.shieldT = ef.dur || 6; }
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 6, vr: 360, life: 0.5, color: '#ff9d5c' });
      addText(cx, cy - 26, '战力提升！', '#ff9d5c', 0.7);
    } else if (ef.type === 'slow') {
      for (const e of G.enemies) if (!e.dead) { e.slowT = ef.dur || 4; e.slowMul = ef.power || 0.6; }
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 6, vr: 380, life: 0.5, color: '#c792ff' });
      addText(cx, cy - 26, '减速！', '#c792ff', 0.7);
    } else if (ef.type === 'coin') {
      const g = ef.power || 60;
      G.runCoins += g; G.save.coins += g;
      if (ef.dropMul) { G.dropBoostT = ef.dur || 6; G.dropMul = ef.dropMul; }
      if (ef.radius) { G.magnetT = 6; G.magnetR = ef.radius; }
      addText(cx, cy - 26, '+' + g + ' 灵力', '#ffd54a', 0.8);
      Sfx.coin();
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 6, vr: 360, life: 0.5, color: '#ffd54a' });
    } else if (ef.type === 'strike') {
      const t = nearestEnemy(p.x, p.y, 320);
      const ang = t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
      p.strikeT = 0.26; p.strikeVx = Math.cos(ang) * 560; p.strikeVy = Math.sin(ang) * 560;
      if (t) damageEnemy(t, dmg(ef.power || 40), { kb: 170 });
      G.effects.push({ kind: 'ring', x: cx, y: cy, r: 8, vr: 420, life: 0.4, color: col });
      Sfx.dash();
    }
    G.invuln = Math.max(G.invuln, 0.35);
  }
function updateBattle(dt) {
    const p = G.player, st = p.stats;
    G.battleTime += dt;
    G.invuln = Math.max(0, G.invuln - dt);
    G.speedT = Math.max(0, G.speedT - dt);
    G.atkBoostT = Math.max(0, G.atkBoostT - dt);
    G.shieldT = Math.max(0, G.shieldT - dt);
    G.dropBoostT = Math.max(0, G.dropBoostT - dt);
    G.magnetT = Math.max(0, G.magnetT - dt);
    G.healT = Math.max(0, G.healT - dt);

    let mx = 0, my = 0;
    if (KEY['ArrowLeft'] || KEY['KeyA']) mx -= 1;
    if (KEY['ArrowRight'] || KEY['KeyD']) mx += 1;
    if (KEY['ArrowUp'] || KEY['KeyW']) my -= 1;
    if (KEY['ArrowDown'] || KEY['KeyS']) my += 1;
    const T = window.TOUCH;
    if (T && (T.mx || T.my)) { mx += T.mx; my += T.my; }
    const spdMul = G.speedT > 0 ? (1 + G.speedMul) : 1;
    if (p.strikeT > 0) {
      p.strikeT -= dt;
      p.x = clamp(p.x + p.strikeVx * dt, 24, WORLD_W - 24);
      p.y = clamp(p.y + p.strikeVy * dt, 24, WORLD_H - 24);
      p.moveDir = { x: p.strikeVx, y: p.strikeVy };
    } else if (mx || my) {
      const l = Math.hypot(mx, my);
      p.x += (mx / l) * st.ms * spdMul * dt;
      p.y += (my / l) * st.ms * spdMul * dt;
      if (mx !== 0) p.facing = mx;
      p.moveDir = { x: mx / l, y: my / l };
    } else p.moveDir = { x: 0, y: 0 };
    p.x = clamp(p.x, 24, WORLD_W - 24);
    p.y = clamp(p.y, 24, WORLD_H - 24);

    p.regenT -= dt;
    if (p.regenT <= 0) { p.regenT = 1; if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + st.regen); }
    if (G.healT > 0) { G.healT -= dt; if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.06 * dt); }

    p.weaponT = p.weaponT || {};
    for (const id of WEAPON_ORDER) {
      const lv = p.weapons[id];
      if (!lv) continue;
      const cd = Math.max(0.15, WD[id].base.cd + (WD[id].perLv.cd || 0) * (lv - 1));
      p.weaponT[id] = (p.weaponT[id] || 0) - dt;
      if (id !== 'wheels' && p.weaponT[id] <= 0) { p.weaponT[id] = cd; fireWeapon(id, lv); }
    }
    updateOrbitals(dt);

    if (st.burn > 0) {
      G.burnT = (G.burnT || 0) - dt;
      if (G.burnT <= 0) {
        G.burnT = 2;
        for (const e of G.enemies) if (!e.dead && dist2(e, p) < 90 * 90) damageEnemy(e, st.burn, {});
        G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 40, vr: 220, life: 0.4, color: 'rgba(255,140,59,0.6)' });
      }
    }
    if (p.weapons.wheels) {
      G.wheelsT -= dt;
      if (G.wheelsT <= 0) {
        G.wheelsT = 0.45;
        const dmg = WD.wheels.base.dmg + WD.wheels.perLv.dmg * (p.weapons.wheels - 1);
        for (const e of G.enemies) if (!e.dead && dist2(e, p) < 22 * 22) damageEnemy(e, dmg, {});
        G.effects.push({ kind: 'puff', x: p.x + (Math.random() - 0.5) * 14, y: p.y + 8, vx: 0, vy: -10, life: 0.4, color: '#ff8c3b', size: 2 });
      }
    }

    if (!G.bossSpawned && G.battleTime > G.grace) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        const interval = Math.max(0.38, 1.15 - G.battleTime / 200);
        G.spawnTimer = interval;
        const batch = 1 + Math.floor(G.battleTime / 55);
        const set = G.zone.enemySet;
        for (let i = 0; i < batch; i++) {
          const typeId = weightedEnemy(set);
          const a = Math.random() * Math.PI * 2, d = 300 + Math.random() * 80;
          spawnEnemy(typeId, clamp(p.x + Math.cos(a) * d, 20, WORLD_W - 20), clamp(p.y + Math.sin(a) * d, 20, WORLD_H - 20), false);
        }
      }
      if (G.battleTime >= G.nextEliteAt) {
        G.nextEliteAt += 48;
        const a = Math.random() * Math.PI * 2;
        const typeId = G.zone.enemySet[Math.floor(Math.random() * G.zone.enemySet.length)];
        const e = spawnEnemy(typeId, clamp(p.x + Math.cos(a) * 340, 20, WORLD_W - 20), clamp(p.y + Math.sin(a) * 340, 20, WORLD_H - 20), true);
        announce('⚠ 精英·' + e.type.name + ' 来袭！');
      }
    }
    if (!G.bossSpawned) {
      if (G.battleTime >= G.zone.dur) { G.bossWarn = 3.2; G.bossSpawned = true; announce('💥 ' + G.zone.bossName + ' 即将降临！'); Sfx.boss(); }
    } else if (G.bossWarn > 0) {
      G.bossWarn -= dt;
      if (G.bossWarn <= 0 && !G.boss) spawnBoss();
    }
    if (G.boss) {
      if (!G.boss.dead) updateBoss(G.boss, dt);
      if (G.boss.dead && G.state === 'battle') onBossDefeated();
    }

    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      const esMul = e.slowT > 0 ? (1 - (e.slowMul || 0.5)) : 1;
      if (e.slowT > 0) e.slowT -= dt;
      e.x += ((p.x - e.x) / d) * e.spd * esMul * dt;
      e.y += ((p.y - e.y) / d) * e.spd * esMul * dt;
      e.hitCd -= dt;
      if (e.type.fly) e.y += Math.sin(e.bob + G.battleTime * 3) * 6 * dt;
      if (e.hitCd <= 0 && d < e.r + p.r + 4 && G.invuln <= 0) {
        e.hitCd = 0.85;
        damagePlayer(e.dmg, e);
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead);

    for (const pr of G.projectiles) {
      pr.life -= dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.kind === 'coin') pr.vy += 260 * dt;
      if (pr.kind === 'sword' || pr.kind === 'fire' || pr.kind === 'bolt' || pr.kind === 'coin' || pr.kind === 'beam') {
        for (const e of G.enemies) {
          if (e.dead || pr.hit.has(e)) continue;
          if (dist2(e, pr) < (e.r + 6) * (e.r + 6)) {
            pr.hit.add(e);
            damageEnemy(e, pr.dmg, { kb: pr.kind === 'coin' ? 20 : 0 });
            if (pr.kind === 'coin' && pr.bounces > 0) {
              pr.bounces--;
              const t = nearestEnemy(e.x, e.y, 170, pr.hit);
              if (t) { const a = Math.atan2(t.y - pr.y, t.x - pr.x); pr.vx = Math.cos(a) * 330; pr.vy = Math.sin(a) * 330; }
              Sfx.coin();
            } else if (pr.pierce > 0) {
              pr.pierce--;
            } else { pr.life = 0; }
            break;
          }
        }
      }
    }
    for (const pr of G.projectiles) { if (pr.kind === 'ebolt' && G.invuln <= 0 && dist2(pr, p) < (p.r + 4) * (p.r + 4)) { pr.life = 0; damagePlayer(pr.dmg, null); } }
    G.projectiles = G.projectiles.filter(pr => pr.life > 0);

    for (const pk of G.pickups) {
      pk.life -= dt;
      const d = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (d < st.pickupR + (G.magnetT > 0 ? G.magnetR : 0)) {
        pk.vx += ((p.x - pk.x) / (d || 1)) * 900 * dt;
        pk.vy += ((p.y - pk.y) / (d || 1)) * 900 * dt;
      }
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      pk.vx *= 0.9; pk.vy *= 0.9;
      if (d < 16) {
        pk.life = 0;
        if (pk.kind === 'xp') gainXp(pk.val);
        else if (pk.kind === 'coin') { G.runCoins += pk.val; G.save.coins += pk.val; Sfx.coin(); addText(p.x, p.y - 18, '+' + pk.val + ' 灵力', '#ffd54a', 0.5); }
        else if (pk.kind === 'egg') hatchBeast(pk.beastId);
      }
    }
    G.pickups = G.pickups.filter(pk => pk.life > 0);

    updateCompanions(dt);

    for (const f of G.effects) {
      f.life -= dt;
      if (f.kind === 'puff') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 40 * dt; }
      if (f.kind === 'heart') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy -= 14 * dt; }
      if (f.kind === 'ring') f.r += f.vr * dt;
    }
    G.effects = G.effects.filter(f => f.life > 0);
    for (const t of G.texts) { t.t += dt; t.y -= 22 * dt; }
    G.texts = G.texts.filter(t => t.t < t.life);
    G.shake = Math.max(0, G.shake - dt * 30);
    G.flash = Math.max(0, G.flash - dt * 2);
    G.announceT -= dt;

    G.camX = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
    G.camY = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  }

  function weightedEnemy(set) {
    const ranks = { rat: 1, fox: 1, bat: 1, wolf: 2, snake: 2, boar: 3, tiger: 3, dragon: 4, chaos: 4 };
    let total = 0; const ws = set.map(id => 1 / (ranks[id] || 1)); ws.forEach(w => total += w);
    let roll = Math.random() * total;
    for (let i = 0; i < set.length; i++) { roll -= ws[i]; if (roll <= 0) return set[i]; }
    return set[set.length - 1];
  }

  function spawnBoss() {
    const p = G.player;
    const a = Math.random() * Math.PI * 2;
    const bossDef = D.BEASTS[G.zone.boss];
    const z = G.zoneIdx;
    const boss = {
      id: 'boss', type: { id: 'boss', name: G.zone.bossName, shape: bossDef.shape, r: 20 }, fly: false,
      x: clamp(p.x + Math.cos(a) * 380, 40, WORLD_W - 40), y: clamp(p.y + Math.sin(a) * 380, 40, WORLD_H - 40),
      r: 20, elite: true, boss: true,
      hp: Math.round(950 * (1 + z * 0.55)), maxHp: Math.round(950 * (1 + z * 0.55)),
      dmg: Math.round(18 * (1 + z * 0.3)), spd: 72 + z * 4,
      xp: 20, coin: 25, hitCd: 0, bob: 0, dead: false,
      beastId: G.zone.boss, beastScale: 1.8,
      minionT: 6, burstT: 4 + z
    };
    G.boss = boss;
    G.enemies.push(boss);
    announce('💥 ' + G.zone.bossName + ' 降临！');
    Sfx.boss();
  }
  function updateBoss(b, dt) {
    const p = G.player;
    const d = Math.hypot(p.x - b.x, p.y - b.y) || 1;
    b.x += ((p.x - b.x) / d) * b.spd * dt;
    b.y += ((p.y - b.y) / d) * b.spd * dt;
    b.hitCd -= dt;
    if (b.hitCd <= 0 && d < b.r + p.r + 6 && G.invuln <= 0) { b.hitCd = 0.7; damagePlayer(b.dmg, b); }
    b.minionT -= dt;
    if (b.minionT <= 0) {
      b.minionT = 9;
      for (let i = 0; i < 3; i++) {
        const t = G.zone.enemySet[Math.floor(Math.random() * G.zone.enemySet.length)];
        const a = Math.random() * Math.PI * 2;
        spawnEnemy(t, b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, false);
      }
    }
    b.burstT -= dt;
    if (b.burstT <= 0 && G.zoneIdx >= 1) {
      b.burstT = 5;
      const n = 6 + G.zoneIdx;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + b.bob;
        G.projectiles.push({ kind: 'ebolt', x: b.x, y: b.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, dmg: Math.round(b.dmg * 0.5), life: 3.2, hit: new Set() });
      }
      Sfx.whip();
    }
    b.bob += dt * 2;
  }
  function damagePlayer(dmg, src) {
    const p = G.player;
    if (G.invuln > 0 || G.state !== 'battle') return;
    let d = Math.max(1, Math.round(dmg * (1 - Math.min(0.75, p.stats.armor * 0.05 + p.stats.dmgRed))));
    if (G.shield > 0) {
      const absorbed = Math.min(G.shield, d);
      G.shield -= absorbed;
      d -= absorbed;
      addText(p.x, p.y - 30, '-' + absorbed, '#7fd4ff', 0.5);
      G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 10, vr: 260, life: 0.3, color: 'rgba(127,212,255,0.9)' });
    }
    p.hp -= Math.max(0, d);
    G.invuln = 0.7; G.shake = 5; G.flash = 0.35;
    addText(p.x, p.y - 20, '-' + d, '#ff6b6b', 0.6);
    Sfx.hurt();
    if (p.hp <= 0) onPlayerDeath();
  }
  function onPlayerDeath() {
    const p = G.player;
    if (G.revives > 0) {
      G.revives--;
      p.hp = Math.round(p.maxHp * 0.55);
      G.invuln = 2.5;
      G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 20, vr: 500, life: 0.6, color: 'rgba(255,158,203,0.9)' });
      G.effects.push({ kind: 'ring', x: p.x, y: p.y, r: 10, vr: 320, life: 0.8, color: 'rgba(255,213,74,0.8)' });
      for (const e of G.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; if (d < 160) { e.x += ((e.x - p.x) / d) * 60; e.y += ((e.y - p.y) / d) * 60; } }
      announce('✨ 麒麟护佑，灵光重现！');
      Sfx.hatch();
      return;
    }
    endRun(false, null);
  }

  function onBossDefeated() {
    const eggId = pickEggBeast();
    endRun(true, eggId);
  }
  function hatchBeast(id) {
    if (!D.BEASTS[id]) return;
    const isNew = !G.save.beasts[id];
    if (isNew) G.save.beasts[id] = { lv: 1 };
    else G.save.beasts[id].lv = Math.min(30, G.save.beasts[id].lv + 1);
    persist();
    Sfx.hatch();
    announce('🐣 孵化成功！获得【' + D.BEASTS[id].name + '】' + (isNew ? '（新收录！）' : '（等级+1）'));
    G.effects.push({ kind: 'ring', x: G.player.x, y: G.player.y, r: 8, vr: 300, life: 0.8, color: '#c9a7ff' });
  }
  function endRun(win, eggId) {
    let newArt = null;
    let bonus = 0;
    if (win) {
      bonus = 40 + G.zoneIdx * 20;
      G.save.coins += bonus; G.runCoins += bonus;
      G.save.jade = (G.save.jade || 0) + (10 + G.zoneIdx * 5);
      G.save.stats.clears++;
      if (G.zoneIdx + 1 > G.save.zone) G.save.zone = Math.min(D.ZONES.length - 1, G.zoneIdx + 1);
      const art = G.zone.art;
      if (art && !G.save.artifacts[art.id]) { G.save.artifacts[art.id] = true; newArt = art; }
    }
    persist();
    const wasNew = eggId ? !G.save.beasts[eggId] : false;
    if (win && eggId) hatchBeast(eggId);
    G.state = 'result';
    UI.show('result', {
      win,
      zoneName: G.zone.name, bossName: G.zone.bossName,
      time: Math.floor(G.battleTime / 60) + ':' + String(Math.floor(G.battleTime % 60)).padStart(2, '0'),
      kills: G.kills, coins: G.runCoins, lv: G.player.lv,
      egg: eggId ? { id: eggId, name: D.BEASTS[eggId].name, isNew: wasNew } : null,
      finalClear: win && !!G.zone.final,
      rewards: win ? { coins: bonus, jade: 10 + G.zoneIdx * 5 } : null,
      art: newArt,
      zoneStory: win ? (D.ZONE_STORY[G.zone.id] || '') : ''
    });
    Sfx.level();
  }

  /* ---------- 培养 ---------- */
  function feedCost(lv) { return 6 + lv * 3; }
  function feedBeast(id) {
    const b = G.save.beasts[id];
    if (!b || b.lv >= 30) return { ok: false, msg: '已满级' };
    const cost = feedCost(b.lv);
    if (G.save.coins < cost) return { ok: false, msg: '灵力不足' };
    G.save.coins -= cost; b.lv++;
    persist();
    return { ok: true, cost, lv: b.lv };
  }
  function setTeam(ids) {
    if (ids.length > 2) return false;
    for (const id of ids) if (!G.save.beasts[id]) return false;
    G.save.team = ids.slice();
    persist();
    return true;
  }


  /* ---------- 星图罗盘·抽卡 ---------- */
  function weightedRarity() {
    const r = D.GACHA.rates;
    let total = 0; for (const k in r) total += r[k];
    let roll = Math.random() * total;
    for (const k in r) { roll -= r[k]; if (roll <= 0) return parseInt(k, 10); }
    return 1;
  }
  function rollGacha() {
    const save = G.save, g = D.GACHA;
    let rarity;
    if (save.pityMyth >= g.pityMyth - 1) rarity = 5;
    else if (save.pityRare >= g.pityRare - 1) rarity = 3 + Math.floor(Math.random() * 3);
    else rarity = weightedRarity();
    const pool = Object.keys(D.BEASTS).filter(id => D.BEASTS[id].rarity === rarity);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !save.beasts[id];
    if (isNew) save.beasts[id] = { lv: 1 };
    else save.beasts[id].lv = Math.min(30, save.beasts[id].lv + 1);
    if (rarity >= 3) save.pityRare = 0; else save.pityRare = (save.pityRare || 0) + 1;
    if (rarity >= 5) save.pityMyth = 0; else save.pityMyth = (save.pityMyth || 0) + 1;
    save.pulls = (save.pulls || 0) + 1;
    return { id, rarity, isNew, name: D.BEASTS[id].name };
  }
  function gacha(count) {
    const g = D.GACHA;
    const cost = count === 10 ? g.tenCost : g.singleCost;
    if ((G.save.jade || 0) < cost) return { ok: false, msg: '灵玉不足' };
    G.save.jade -= cost;
    const results = [];
    for (let i = 0; i < count; i++) results.push(rollGacha());
    persist();
    return { ok: true, results };
  }

  /* ---------- 动态神兽画布（DOM 内实时动画） ---------- */
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function renderLiveBeasts() {
    const cvs = document.querySelectorAll('canvas.beast-live');
    if (!cvs.length) return;
    for (const cv of cvs) {
      if (cv.offsetParent === null) continue;
      const id = cv.dataset.beast;
      const b = id && D.BEASTS[id];
      if (!b) continue;
      const evo = parseInt(cv.dataset.evo || '0', 10);
      const scale = parseFloat(cv.dataset.scale || '4');
      const seed = parseInt(cv.dataset.seed || '1', 10);
      const w = cv.width, h = cv.height;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, w, h);
      const tt = G.time * 1.6 + seed * 1.7;
      const rcol = D.RARITY_COLOR[b.rarity];
      const aura = ctx.createRadialGradient(w / 2, h * 0.44, 4, w / 2, h * 0.44, w * 0.46);
      aura.addColorStop(0, hexA(rcol, 0.30)); aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) {
        const a = tt * 1.1 + i * 2.4;
        const sx = w / 2 + Math.cos(a) * w * 0.30 * (0.6 + 0.4 * Math.sin(tt * 0.7 + i * 2.1));
        const sy = h * 0.34 + Math.sin(a * 1.35) * h * 0.16;
        const al = 0.25 + 0.45 * Math.abs(Math.sin(G.time * 2.4 + i * 1.9));
        ctx.fillStyle = hexA(i % 3 === 0 ? '#ffffff' : rcol, al);
        const s = i % 2 ? 1 : 2;
        ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.86, 10 * scale * 0.62, 3 * scale * 0.5, 0, 0, 7); ctx.fill();
      const petAge = cv._petT ? (G.time - cv._petT) : 99;
      const hop = petAge < 1.2 ? -Math.abs(Math.sin(petAge * 9)) * 14 : 0;
      const bob = Math.sin(tt * 2) * 2.6 + hop;
      const blink = ((G.time * 0.6 + seed * 3.7) % 4.2) < 0.12;
      const spr = SP.buildBeast(b, evo);
      const drawSpr2 = blink ? SP.blinkOf(spr) : spr;
      const sw = 18 * scale, sh = 16 * scale;
      SP.drawSpr(ctx, drawSpr2, Math.round((w - sw) / 2), Math.round((h - sh) / 2 + bob), scale, false);
      if (petAge < 1.6) {
        for (let i = 0; i < 4; i++) {
          const hx = w / 2 + Math.sin(petAge * 30 + i * 2.1) * 22;
          const hy = h * 0.5 - (petAge * 40 + i * 14);
          ctx.globalAlpha = Math.max(0, 1 - petAge / 1.6) * 0.9;
          SP.drawSpr(ctx, SP.small.heart, Math.round(hx) - 4, Math.round(hy) - 4, 1.3, false);
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  function petBeast(cv) { if (cv) { cv._petT = G.time; Sfx.pet(); } }

  /* ---------- 渲染 ---------- */
  function zoneGround(zone) {
    if (!G.groundCache[zone.id]) G.groundCache[zone.id] = SP.buildGround(zone, zone.seed);
    return G.groundCache[zone.id];
  }
  function zoneDecor(zone) {
    if (!G.decorCache[zone.id]) {
      const rnd = SP.mulberry(zone.seed * 13 + 5);
      const list = [];
      for (let i = 0; i < 130; i++) {
        const x = 30 + rnd() * (WORLD_W - 60), y = 30 + rnd() * (WORLD_H - 60);
        if (Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2) < 240) continue;
        const kind = zone.deco[Math.floor(rnd() * zone.deco.length)];
        list.push({ x, y, kind });
      }
      G.decorCache[zone.id] = list;
    }
    return G.decorCache[zone.id];
  }
  /* ---------- 背景：诗词雨 / 聚光 / 云雾 / 中式建筑 ---------- */
  function initRain() {
    const list = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const line = D.POEMS[Math.floor(Math.random() * D.POEMS.length)];
      list.push({
        x: (i + 0.5) * (VIEW_W / n) + (Math.random() * 8 - 4),
        y0: Math.random() * VIEW_H,
        spd: 16 + Math.random() * 26,
        off: Math.random() * 40,
        line: line
      });
    }
    return list;
  }
  function renderRain(ctx) {
    if (!G.rain) G.rain = initRain();
    ctx.font = 'bold 9px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    const span = VIEW_H + 60;
    for (const c of G.rain) {
      const y = ((c.y0 + G.time * c.spd) % span) - 30;
      const head = Math.floor(G.time * 1.05 + c.off);
      const len = c.line.length;
      for (let k = 0; k < 8; k++) {
        const ci = ((head - k) % len + len) % len;
        const yy = y - k * 10;
        if (yy < -12 || yy > VIEW_H + 12) continue;
        const fade = Math.pow(0.62, k);
        ctx.fillStyle = k === 0
          ? 'rgba(255,213,74,' + (0.8 * fade).toFixed(2) + ')'
          : 'rgba(126,232,216,' + (0.42 * fade).toFixed(2) + ')';
        ctx.fillText(c.line[ci], c.x, yy);
      }
    }
    ctx.textAlign = 'left';
  }
  function renderSpotlight(ctx) {
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 165);
    g.addColorStop(0, 'rgba(255,240,185,0.15)');
    g.addColorStop(0.55, 'rgba(255,240,185,0.05)');
    g.addColorStop(1, 'rgba(255,240,185,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  function buildCloud(rnd) {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 20;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 11, 64, 4);
    ctx.fillRect(4, 8, 56, 4);
    let x = 2;
    while (x < 60) {
      const w = 4 + Math.floor(rnd() * 9), h = 3 + Math.floor(rnd() * 6);
      ctx.fillRect(x, 12 - h, w, h);
      x += w - 2;
    }
    return cv;
  }
  function renderClouds(ctx) {
    if (!G.clouds) {
      const rnd = SP.mulberry(2026);
      G.clouds = [];
      for (let i = 0; i < 7; i++) {
        G.clouds.push({ cv: buildCloud(rnd), x: rnd() * VIEW_W, y: 8 + rnd() * 84, spd: 4 + rnd() * 9, sc: 1 + (rnd() > 0.5 ? 1 : 0), a: 0.14 + rnd() * 0.18 });
      }
    }
    for (const c of G.clouds) {
      const w = c.cv.width * c.sc, h = c.cv.height * c.sc;
      const x = ((c.x + G.time * c.spd) % (VIEW_W + w * 2)) - w;
      ctx.globalAlpha = c.a;
      ctx.drawImage(c.cv, Math.round(x), Math.round(c.y), w, h);
    }
    ctx.globalAlpha = 1;
  }
  function buildArch() {
    const cv = document.createElement('canvas');
    cv.width = 720; cv.height = 96;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#070912';
    function pagoda(bx, tiers, w0, h0) {
      let x = bx, y = 96 - h0;
      for (let t = 0; t < tiers; t++) {
        const tw = w0 - t * 5, th = Math.floor(h0 / tiers);
        ctx.fillRect(x + (w0 - tw) / 2, y, tw, th);
        ctx.fillRect(x + (w0 - tw) / 2 - 4, y, tw + 8, 3);
        y += th;
      }
      ctx.fillRect(bx + w0 / 2 - 1, 96 - h0 - 9, 2, 9);
    }
    function hall(bx) {
      ctx.fillRect(bx, 86, 96, 10);
      ctx.fillRect(bx + 12, 70, 72, 16);
      ctx.fillRect(bx + 6, 64, 84, 6);
      ctx.fillRect(bx + 16, 54, 64, 10);
      ctx.fillRect(bx + 0, 64, 12, 4);
      ctx.fillRect(bx + 84, 64, 12, 4);
      ctx.fillRect(bx + 4, 60, 8, 4);
      ctx.fillRect(bx + 84, 60, 8, 4);
    }
    pagoda(46, 4, 46, 42);
    pagoda(252, 5, 40, 58);
    pagoda(468, 3, 54, 34);
    hall(646);
    return cv;
  }
  function renderArch(ctx, horizonY) {
    if (!G.archCv) G.archCv = buildArch();
    const w = G.archCv.width;
    const off = Math.round((G.camX * 0.35) % w);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(G.archCv, -off, horizonY);
    ctx.drawImage(G.archCv, -off + w, horizonY);
    ctx.globalAlpha = 1;
  }

  function renderBattle() {
    const ctx = G.ctx;
    ctx.fillStyle = G.zone.bg || '#1c2a3c';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const gnd = zoneGround(G.zone);
    renderRain(ctx);
    renderArch(ctx, 34);
    renderClouds(ctx);
    renderSpotlight(ctx);
    const gs = 200;
    const x0 = Math.floor(G.camX / gs), y0 = Math.floor(G.camY / gs);
    for (let ty = y0; ty <= y0 + Math.ceil(VIEW_H / gs); ty++)
      for (let tx = x0; tx <= x0 + Math.ceil(VIEW_W / gs); tx++)
        ctx.drawImage(gnd, tx * gs - G.camX, ty * gs - G.camY);
    const deco = zoneDecor(G.zone);
    const sm = SP.small;
    for (const d of deco) {
      const sx = d.x - G.camX, sy = d.y - G.camY;
      if (sx < -40 || sy < -40 || sx > VIEW_W + 40 || sy > VIEW_H + 40) continue;
      const spr = sm[d.kind];
      if (spr) SP.drawSpr(ctx, spr, sx, sy - (d.kind === 'tree' ? 10 : d.kind === 'altar' ? 8 : 0), d.kind === 'tree' ? 3 : 2, false);
    }
    for (const pk of G.pickups) {
      const spr = pk.kind === 'xp' ? sm.xp : pk.kind === 'coin' ? sm.coin : pk.kind === 'heart' ? sm.heart : sm.egg;
      const bob = Math.sin(pk.t * 2) * 2;
      SP.drawSpr(ctx, spr, pk.x - G.camX, pk.y - G.camY + bob, 2, false);
    }
    for (const e of G.enemies) {
      const spr = e.boss ? SP.buildBeast(D.BEASTS[e.beastId], 0) : SP.buildEnemy(e.type, e.elite);
      const sc = e.boss ? e.beastScale : (e.elite ? 1.5 : 1.15);
      SP.drawSpr(ctx, spr, e.x - G.camX - 9 * sc, e.y - G.camY - 8 * sc, sc, false);
      if (e.elite) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - G.camX - 14, e.y - G.camY - 16 * sc - 8, 28, 4);
        ctx.fillStyle = e.boss ? '#ff5a5a' : '#ffd54a';
        ctx.fillRect(e.x - G.camX - 14, e.y - G.camY - 16 * sc - 8, 28 * Math.max(0, e.hp / e.maxHp), 4);
      }
    }
    if (G.boss && !G.boss.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(20, 16, VIEW_W - 40, 10);
      ctx.fillStyle = '#ff5a5a'; ctx.fillRect(22, 18, (VIEW_W - 44) * Math.max(0, G.boss.hp / G.boss.maxHp), 6);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BOSS·' + G.zone.bossName, VIEW_W / 2, 14);
    }
    const pWalk = G.player.moveDir.x || G.player.moveDir.y ? (Math.floor(G.time * 11) % 2) : 0;
    const pl = SP.buildPlayer(pWalk);
    const plX = G.player.x - G.camX, plY = G.player.y - G.camY;
    if (G.flash > 0 && Math.floor(G.time * 20) % 2 === 0) ctx.globalAlpha = 0.55;
    SP.drawSpr(ctx, pl, plX - 8, plY - 8, 2, G.player.facing < 0);
    ctx.globalAlpha = 1;
    if (G.invuln > 0 && G.invuln < 1.4) { ctx.strokeStyle = 'rgba(255,213,74,0.5)'; ctx.beginPath(); ctx.arc(plX, plY, 14, 0, 7); ctx.stroke(); }
    for (const c of G.companions) {
      const spr = SP.buildBeast(D.BEASTS[c.id], beastEvoLv(c.lv));
      const sc = D.BEASTS[c.id].scale || 1;
      SP.drawSpr(ctx, spr, c.x - G.camX - 9 * sc, c.y - G.camY - 8 * sc, sc, false);
    }
    for (const pr of G.projectiles) {
      const sx = pr.x - G.camX, sy = pr.y - G.camY;
      if (pr.kind === 'sword') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(pr.vy, pr.vx)); ctx.fillStyle = '#8ab4ff'; ctx.fillRect(-7, -2, 14, 4); ctx.fillStyle = '#fff'; ctx.fillRect(3, -1, 4, 2); ctx.restore(); }
      else if (pr.kind === 'fire') { ctx.fillStyle = 'rgba(255,140,59,0.9)'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,213,74,0.8)'; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, 7); ctx.fill(); }
      else if (pr.kind === 'coin') SP.drawSpr(ctx, sm.coin, sx - 4, sy - 4, 1.4, false);
      else if (pr.kind === 'bolt') { ctx.fillStyle = pr.color || '#c9a7ff'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, 7); ctx.fill(); }
      else if (pr.kind === 'beam') {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(pr.vy, pr.vx));
        const grd = ctx.createLinearGradient(-18, 0, 18, 0);
        grd.addColorStop(0, 'rgba(255,255,255,0)');
        grd.addColorStop(0.5, pr.color || '#ffd54a');
        grd.addColorStop(1, '#ffffff');
        ctx.fillStyle = grd; ctx.fillRect(-18, -3, 36, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(-18, -1, 36, 2);
        ctx.restore();
      }
      else if (pr.kind === 'ebolt') { ctx.fillStyle = '#c792ff'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, 7); ctx.fill(); }
    }
    for (const o of G.player.orbitals) {
      const ox = G.player.x + Math.cos(o.angle) * o.radius, oy = G.player.y + Math.sin(o.angle) * o.radius;
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = o.big ? 3 : 2;
      ctx.beginPath(); ctx.arc(ox - G.camX, oy - G.camY, o.big ? 6 : 4, 0, 7); ctx.stroke();
    }
    for (const f of G.effects) {
      if (f.kind === 'ring') { ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, f.life / 0.6); ctx.beginPath(); ctx.arc(f.x - G.camX, f.y - G.camY, f.r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.kind === 'puff') { ctx.fillStyle = f.color; ctx.globalAlpha = Math.max(0, f.life / 0.6); ctx.fillRect(f.x - G.camX, f.y - G.camY, f.size, f.size); ctx.globalAlpha = 1; }
      else if (f.kind === 'heart') { ctx.globalAlpha = Math.max(0, f.life / 0.9); SP.drawSpr(ctx, sm.heart, f.x - G.camX - 4, f.y - G.camY - 4, 1.3, false); ctx.globalAlpha = 1; }
      else if (f.kind === 'lines') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.globalAlpha = Math.max(0, f.life / 0.25);
        ctx.beginPath();
        for (let i = 0; i < f.pts.length; i++) { const pt = f.pts[i]; if (i === 0) ctx.moveTo(pt.x - G.camX, pt.y - G.camY); else ctx.lineTo(pt.x - G.camX, pt.y - G.camY); }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    ctx.font = 'bold 8px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
    for (const t of G.texts) { ctx.globalAlpha = Math.max(0, 1 - t.t / t.life); ctx.fillStyle = t.color; ctx.fillText(t.str, t.x - G.camX, t.y - G.camY); }
    ctx.globalAlpha = 1;
    renderHUD();
    if (G.announceT > 0) {
      ctx.globalAlpha = Math.min(1, G.announceT);
      ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 12px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(G.announce || '', VIEW_W / 2, 74);
      ctx.globalAlpha = 1;
    }
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 120, VIEW_W / 2, VIEW_H / 2, 300);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (G.flash > 0) { ctx.fillStyle = 'rgba(255,60,60,' + Math.min(0.3, G.flash) + ')'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }
  function renderHUD() {
    const ctx = G.ctx, p = G.player, st = p.stats;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(8, 8, 108, 26);
    ctx.fillStyle = '#3a1420'; ctx.fillRect(12, 12, 100, 8);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(12, 12, 100 * Math.max(0, p.hp / p.maxHp), 8);
    ctx.strokeStyle = '#222'; ctx.strokeRect(12, 12, 100, 8);
    ctx.fillStyle = '#fff'; ctx.font = '7px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(p.hp + '/' + p.maxHp, 15, 20);
    ctx.fillStyle = '#0a1a2a'; ctx.fillRect(12, 24, 100, 6);
    ctx.fillStyle = '#4dd0e1'; ctx.fillRect(12, 24, 100 * Math.min(1, p.xp / p.xpNext), 6);
    ctx.fillStyle = '#fff';
    ctx.fillText('Lv.' + p.lv, 12, 32);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 9px "Microsoft YaHei",sans-serif';
    ctx.fillText(G.zone.name, VIEW_W / 2, 14);
    if (!G.bossSpawned) {
      const left = Math.max(0, G.zone.dur - G.battleTime);
      ctx.fillStyle = '#8b93c4'; ctx.font = '8px "Microsoft YaHei",sans-serif';
      ctx.fillText('BOSS 降临倒计时 ' + Math.ceil(left) + 's', VIEW_W / 2, 26);
    } else if (G.boss && !G.boss.dead) {
      ctx.fillStyle = '#ff8c6b'; ctx.font = '8px "Microsoft YaHei",sans-serif';
      ctx.fillText('⚔ 击败 ' + G.zone.bossName, VIEW_W / 2, 26);
    } else if (G.bossWarn > 0) {
      ctx.fillStyle = '#ffd54a'; ctx.font = '8px "Microsoft YaHei",sans-serif';
      ctx.fillText('⚠ 暗影涌动……', VIEW_W / 2, 26);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 9px "Microsoft YaHei",sans-serif';
    ctx.fillText('🪙 ' + G.runCoins, VIEW_W - 10, 14);
    ctx.fillStyle = '#8b93c4'; ctx.font = '7px "Microsoft YaHei",sans-serif';
    ctx.fillText('击杀 ' + G.kills + '　复活 ' + G.revives, VIEW_W - 10, 24);
    ctx.textAlign = 'left';
    const ws = WEAPON_ORDER.filter(id => p.weapons[id]);
    for (let i = 0; i < ws.length && i < 8; i++) {
      const x = 8 + i * 22, y = VIEW_H - 22;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, 19, 17);
      ctx.strokeStyle = '#3a4170'; ctx.strokeRect(x, y, 19, 17);
      ctx.fillStyle = '#4dd0e1'; ctx.font = '10px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(D.WEAPONS[ws[i]].icon, x + 9, y + 12);
      ctx.fillStyle = '#ffd54a'; ctx.font = '7px "Microsoft YaHei",sans-serif';
      ctx.fillText('L' + p.weapons[ws[i]], x + 13, y + 15);
    }
    for (let i = 0; i < G.companions.length; i++) {
      const c = G.companions[i];
      const x = VIEW_W - 34 + i * 30, y = VIEW_H - 26;
      const spr = SP.buildBeast(D.BEASTS[c.id], beastEvoLv(c.lv));
      SP.drawSpr(ctx, spr, x, y, 1.3, false);
      ctx.fillStyle = '#ffd54a'; ctx.font = '7px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('L' + c.lv, x + 22, y + 22);
    }
  

      /* 专属技能槽 Q/E */
    for (let i = 0; i < G.companions.length; i++) {
      const c = G.companions[i];
      const b = D.BEASTS[c.id], ult = b.ult;
      if (!ult) continue;
      const x = VIEW_W / 2 - 32 + i * 46, y = VIEW_H - 24;
      const ready = c.ultCd <= 0;
      ctx.fillStyle = ready ? 'rgba(18,28,48,0.82)' : 'rgba(8,12,24,0.78)';
      ctx.fillRect(x, y, 40, 21);
      ctx.strokeStyle = ready ? '#ffd54a' : '#3a4170';
      ctx.strokeRect(x, y, 40, 21);
      if (ready) {
        const pulse = 0.5 + 0.5 * Math.sin(G.time * 6);
        ctx.strokeStyle = 'rgba(255,213,74,' + (0.35 + 0.5 * pulse) + ')';
        ctx.strokeRect(x - 1, y - 1, 42, 23);
      }
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(i === 0 ? 'Q' : 'E', x + 3, y + 14);
      ctx.font = '10px "Microsoft YaHei",sans-serif';
      ctx.fillText(ult.icon, x + 14, y + 15);
      ctx.fillStyle = '#9fb4d8'; ctx.font = '7px "Microsoft YaHei",sans-serif';
      ctx.fillText(ult.cd + 's', x + 30, y + 9);
      if (!ready) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y, 40, 21 * Math.min(1, c.ultCd / ult.cd));
        ctx.fillStyle = '#7dd7ff'; ctx.font = 'bold 7px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(c.ultCd), x + 20, y + 14);
      }
    }
    ctx.textAlign = 'left';
  }

  function beastEvoLv(lv) { return lv >= 20 ? 2 : (lv >= 10 ? 1 : 0); }

  /* 菜单背景（标题/营地/结算等） */
  function renderMenuBg() {
    const ctx = G.ctx;
    const gnd = zoneGround(D.ZONES[0]);
    ctx.fillStyle = '#10121f'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 40; i++) { const x = (i * 61.7 + G.time * 3) % VIEW_W, y = (i * 37.3) % 120; ctx.fillRect(x, y, 1, 1); }
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.arc(VIEW_W - 60, 36, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#10121f'; ctx.beginPath(); ctx.arc(VIEW_W - 55, 32, 12, 0, 7); ctx.fill();
    renderRain(ctx);
    renderArch(ctx, 34);
    renderClouds(ctx);
    renderSpotlight(ctx);
    ctx.drawImage(gnd, 0, 150, VIEW_W, 120);
    const sm = SP.small;
    for (let i = 0; i < 12; i++) { const x = (i * 90 + G.time * 2) % VIEW_W; SP.drawSpr(ctx, sm.grass, x, 158 + (i % 3) * 22, 2, false); }
    const beasts = [D.BEASTS.fox, D.BEASTS.baize, D.BEASTS.jintoad, D.BEASTS.qilin];
    for (let i = 0; i < beasts.length; i++) {
      const b = beasts[i];
      const w = 210, off = (G.time * (12 + i * 4) + i * w * 0.37) % (w + 100) - 60;
      const x = off + i * 130, y = 168 + (i % 2) * 26 + Math.sin(G.time * 2 + i) * 3;
      if (x < -40 || x > VIEW_W + 40) continue;
      const spr = SP.buildBeast(b, 0);
      SP.drawSpr(ctx, spr, x, y, 1.6, false);
    }
    const pl = SP.buildPlayer();
    SP.drawSpr(ctx, pl, VIEW_W / 2 - 14, 190 + Math.sin(G.time * 1.6) * 1.5, 2.2, false);
  }

  /* ---------- 主循环 ---------- */
  function loop(t) {
    requestAnimationFrame(loop);
    try {
      const dt = Math.min(0.033, (t - (G._last || t)) / 1000 || 0.016);
      G._last = t;
      G.time += dt;
      if (G.state === 'battle') {
        if (!G.paused) updateBattle(dt);
        renderBattle();
      } else {
        renderMenuBg();
      }
      renderLiveBeasts();
    } catch (e) {
      if (window.onerror) window.onerror('game loop: ' + (e && e.message), location.href, 0, 0, e);
    }
  }

  /* ---------- 输入 ---------- */
  const KEY = {};
  function onKeyDown(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    KEY[e.code] = true;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (G.state === 'battle') { G.paused = !G.paused; UI.show(G.paused ? 'pause' : 'battle'); }
      else if (G.state === 'pause') { G.paused = false; UI.show('battle'); }
    }
    if (e.code === 'KeyQ') useUlt(0);
    if (e.code === 'KeyE') useUlt(1);
  }
  function onKeyUp(e) { KEY[e.code] = false; }

  /* ---------- 初始化 ---------- */
  function init() {
    G.canvas = document.getElementById('game');
    G.canvas.width = VIEW_W; G.canvas.height = VIEW_H;
    G.ctx = G.canvas.getContext('2d');
    G.ctx.imageSmoothingEnabled = false;
    G.save = loadSave();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    UI.init();
    requestAnimationFrame(loop);
  }

  return {
    init, Sfx,
    __dbg() { return { state: G.state, t: Math.round(G.battleTime), enemies: G.enemies.length, player: G.player ? { x: Math.round(G.player.x), y: Math.round(G.player.y), hp: G.player.hp, lv: G.player.lv } : null, kills: G.kills, coins: G.runCoins, jade: G.save.jade, pity: [G.save.pityRare, G.save.pityMyth], pending: G.pendingLevels, ultCds: G.companions.map(c => Math.max(0, Math.ceil(c.ultCd || 0))), buffs: { atk: Math.max(0, Math.round(G.atkBoostT * 10) / 10), spd: Math.max(0, Math.round(G.speedT * 10) / 10), shield: Math.round(G.shield) } }; },
    __skip() { if (G.zone) G.battleTime = G.zone.dur - 0.5; },
    __killBoss() { if (G.boss && !G.boss.dead) damageEnemy(G.boss, 1e9, {}); },
    getSave() { return G.save; },
    getTime() { return G.time; },
    petBeast,
    gacha,
    getZoneIdx() { return G.zoneIdx; },
    beastStatScale(lv) { return Math.round(beastStatScale(lv) * 100) / 100; },
    companionAtk(id, lv) { const b = D.BEASTS[id]; if (!b) return 0; return Math.round((b.combat.atk + lv * 1.3) * beastStatScale(lv)); },
    grantReward(coins, jade) { G.save.coins += coins; G.save.jade = (G.save.jade || 0) + jade; persist(); },
    forfeitReward(coins, jade) { G.save.coins = Math.max(0, G.save.coins - coins); G.save.jade = Math.max(0, (G.save.jade || 0) - jade); persist(); },
    gearOf(beastId) { return gearOf(beastId); },
    equipArtifact(beastId, artId) {
      const save = G.save;
      if (!save.beasts[beastId]) return { ok: false, msg: '尚未拥有该神兽' };
      if (!save.artifacts[artId]) return { ok: false, msg: '尚未获得该神器' };
      const art = D.ARTIFACTS[artId];
      if (art.beast !== beastId) return { ok: false, msg: '神器与神兽不匹配' };
      const gear = save.gear[beastId] || (save.gear[beastId] = []);
      if (gear.includes(artId)) return { ok: true, msg: '已装备' };
      if (gear.length >= 2) return { ok: false, msg: '装备栏已满（最多 2 件）' };
      gear.push(artId);
      persist();
      return { ok: true, msg: '装备成功：' + art.name };
    },
    unequipArtifact(beastId, artId) {
      const gear = (G.save && G.save.gear && G.save.gear[beastId]) || [];
      const i = gear.indexOf(artId);
      if (i < 0) return { ok: false, msg: '未装备该神器' };
      gear.splice(i, 1);
      persist();
      return { ok: true, msg: '已卸下' };
    },
    startBattle,
    chooseOption,
    feedBeast, feedCost, setTeam,
    beastEvoLv,
    useUlt,
    togglePause() { if (G.state === 'battle' || G.state === 'pause') { G.paused = !G.paused; UI.show(G.paused ? 'pause' : 'battle'); } },
    resumeBattle() { G.paused = false; G.state = 'battle'; UI.show('battle'); },
    toHub() { G.state = 'hub'; UI.show('hub'); },
    getState() { return G.state; }
  };
})();
