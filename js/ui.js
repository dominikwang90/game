'use strict';
/* ============================================================
 * UI 层：动态神兽展示 / 抽卡 / 图鉴 / 培养 / 升级 / 结算
 * ============================================================ */
window.UI = (function () {
  const D = window.DATA, SP = window.SP;

  function el(id) { return document.getElementById(id); }
  function uiEl() { return el('ui'); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function panel(inner, cls) { return '<div class="panel ' + (cls || '') + '">' + inner + '</div>'; }
  function btn(label, fn, cls) { return '<div class="btn ' + (cls || '') + '" onclick="' + fn + '">' + label + '</div>'; }
  function rkName(r) { return D.RARITY_NAME[r] || ''; }
  function rkColor(r) { return D.RARITY_COLOR[r] || '#9aa0b5'; }
  function glow(r) { return 'glow-' + r; }
  function rkBadge(r) { return '<span class="rk" style="color:' + rkColor(r) + '">' + rkName(r) + '</span>'; }

  /* ---------- 动态神兽画布（引擎每帧实时渲染动画） ---------- */
  function live(id, lv, scale, cls) {
    const b = D.BEASTS[id];
    if (!b) return '';
    const evo = Engine.beastEvoLv(lv || 1);
    const w = 18 * scale + 14, h = 16 * scale + 18;
    return '<canvas class="beast-live ' + (cls || '') + ' ' + glow(b.rarity) + '" data-beast="' + id +
      '" data-evo="' + evo + '" data-scale="' + scale + '" data-seed="' + (Math.floor(Math.random() * 997) + 1) +
      '" width="' + w + '" height="' + h + '" title="点击抚摸互动"></canvas>';
  }
  function eggImg(scale) {
    const cv = SP.spriteCanvas(SP.small.egg, scale || 4);
    return '<img class="spr" style="opacity:.8" src="' + cv.toDataURL() + '" alt="???">';
  }
  function ipMascot(cls) {
    return '<img class="ip-mascot ' + (cls || '') + '" src="assets/ip/ip-pixelart.svg" alt="神兽纪元 IP 吉祥物" draggable="false">';
  }
  function namePlate(id, lv) {
    const b = D.BEASTS[id];
    return '<div class="plate"><div class="nm" style="color:' + rkColor(b.rarity) + '">' + b.name + '</div>' +
      '<div class="rk">' + rkName(b.rarity) + ' · ' + b.element + (lv ? ' · Lv.' + lv : '') + '</div></div>';
  }

  /* ---------- 标题 · 神兽舞台 ---------- */
  function showTitle() {
    const save = Engine.getSave();
    const owned = Object.keys(save.beasts);
    const picks = [];
    if (owned.length) { for (const id of owned.slice(0, 3)) picks.push(id); }
    for (const id of ['qilin', 'fenghuang', 'fox']) if (picks.length < 3 && !picks.includes(id)) picks.push(id);
    let stage = '';
    for (const id of picks) stage += '<div class="stage-cell">' + live(id, save.beasts[id] ? save.beasts[id].lv : 1, 5) + namePlate(id, save.beasts[id] ? save.beasts[id].lv : 0) + '</div>';
    uiEl().innerHTML = panel(
      ipMascot('big') +
      '<div class="logo">神兽纪元</div>' +
      '<div class="logo-sub">智慧神兽宇宙</div>' +
      '<div class="stage-row">' + stage + '</div>' +
      '<p class="sub" style="text-align:center;margin:2px 0 10px">—— 多米你可公司 · 神兽收集 × 割草生存 ——</p>' +
      '<div class="row">' +
      btn(save.seenStory ? '继续旅程' : '开始新旅程', 'UI.start()', 'primary') +
      btn('操作说明', 'UI.help()') +
      '</div>' +
      '<div class="legend" style="margin-top:12px">' +
      '<b>玩法</b>：割草生存自动战斗 + 收集/培养华夏神兽<br>' +
      '<b>移动</b>：<kbd>WASD</kbd> / <kbd>方向键</kbd>　<b>暂停</b>：<kbd>Esc</kbd><br>' +
      '点击神兽可抚摸互动；击败 BOSS 或抽卡获得神兽' +
      '</div>'
    );
  }

  /* ---------- 剧情 ---------- */
  let storyIdx = 0, storyTimer = null, storyChars = 0;
  function showStory() {
    Engine.getSave().seenStory = true;
    uiEl().innerHTML = panel(
      '<h2>序章</h2>' +
      '<div id="storyBox" class="story-box"><p></p></div>' +
      '<div class="row mt14">' + btn('跳过剧情', 'UI.storyAll()') + btn('继续 ▶', 'UI.storyNext()', 'primary') + '</div>'
    );
    storyIdx = 0; storyChars = 0;
    if (storyTimer) clearInterval(storyTimer);
    storyTimer = setInterval(() => { storyChars += 3; renderStoryChar(); }, 28);
    renderStoryChar();
  }
  function renderStoryChar() {
    const box = el('storyBox');
    if (!box) return;
    const text = D.STORY[storyIdx] || '';
    box.innerHTML = '<p>' + esc(text.slice(0, storyChars)) + (storyChars < text.length ? '<span class="type-cursor"></span>' : '') + '</p>';
    if (storyChars >= text.length && storyTimer) { clearInterval(storyTimer); storyTimer = null; }
  }
  function storyNext() {
    const text = D.STORY[storyIdx] || '';
    if (storyChars < text.length) { storyChars = text.length; renderStoryChar(); return; }
    if (storyIdx < D.STORY.length - 1) {
      storyIdx++; storyChars = 0; renderStoryChar();
      if (storyTimer) clearInterval(storyTimer);
      storyTimer = setInterval(() => { storyChars += 3; renderStoryChar(); }, 28);
    } else { if (storyTimer) clearInterval(storyTimer); storyTimer = null; Engine.toHub(); }
  }
  function storyAll() { if (storyTimer) clearInterval(storyTimer); storyTimer = null; storyIdx = D.STORY.length - 1; storyChars = 0; renderStoryChar(); storyChars = D.STORY[storyIdx].length; renderStoryChar(); }
  /* ---------- 营地 ---------- */
  function showHub() {
    const save = Engine.getSave();
    const owned = Object.keys(save.beasts);
    // 队伍展示
    let teamStage = '';
    if (save.team.length) {
      for (const id of save.team) {
        if (!D.BEASTS[id]) continue;
        teamStage += '<div class="stage-cell">' + live(id, save.beasts[id].lv, 4) + namePlate(id, save.beasts[id].lv) + '</div>';
      }
    }
    // 图鉴精选
    let pickStage = '';
    const picks = owned.slice(0, 4);
    for (const id of picks) pickStage += '<div class="stage-cell small">' + live(id, save.beasts[id].lv, 3) + namePlate(id, save.beasts[id].lv) + '</div>';
    if (!pickStage) pickStage = '<p class="sub">暂无神兽，先出征秘境或使用星图罗盘抽卡吧</p>';
    // 秘境列表
    let zoneHtml = '';
    D.ZONES.forEach((z, i) => {
      const unlocked = i <= save.zone;
      zoneHtml += '<div class="zone-row ' + (unlocked ? '' : 'locked') + '" ' + (unlocked ? 'onclick="UI.go(' + i + ')"' : '') + '>' +
        '<span class="zn">' + z.name + '</span>' +
        '<span class="zd">' + z.desc + '</span>' +
        '<span class="zs">' + (unlocked ? '<span class="gold">▶ 出征</span>' : '🔒 未解锁') + '</span>' +
        '</div>';
    });
    uiEl().innerHTML = panel(
      '<h2>' + ipMascot('small') + '多米你可 · 神兽营地</h2>' +
      '<p class="sub" style="text-align:center">研究员阿灵：神兽宇宙的灵脉正在复苏，继续探索吧！</p>' +
      '<div class="row mt8" style="font-size:13px">' +
      '<span class="gold">🪙 灵力 ' + save.coins + '</span>' +
      '<span class="jade">💎 灵玉 ' + (save.jade || 0) + '</span>' +
      '<span class="cyan">📖 图鉴 ' + owned.length + '/' + Object.keys(D.BEASTS).length + '</span>' +
      '<span class="dim">通关 ' + save.stats.clears + '　击杀 ' + save.stats.kills + '</span>' +
      '</div>' +
      (teamStage ? '<h3>🐾 出战神兽</h3><div class="stage-row">' + teamStage + '</div>' : '') +
      '<h3>✨ 图鉴精选</h3><div class="stage-row">' + pickStage + '</div>' +
      '<h3>🗺 探索秘境</h3>' + zoneHtml +
      '<div class="row mt14">' +
      btn('💎 星图罗盘·抽卡', 'UI.showGacha()', 'primary') +
      btn('神兽图鉴', 'UI.showCollection()') +
      btn('队伍培养', 'UI.showCultivate()') +
      btn('操作说明', 'UI.help()') +
      btn('重置存档', 'UI.resetSave()') +
      '</div>' +
      '<p class="sub" style="margin-top:10px;text-align:center">提示：出战神兽（最多2只）跟随战斗；击败精英/通关秘境可获得灵玉</p>'
    );
  }
  function go(i) { Engine.Sfx.unlock(); Engine.Sfx.click(); Engine.startBattle(i); }

  /* ---------- 星图罗盘 · 抽卡 ---------- */
  function showGacha() {
    const save = Engine.getSave(), g = D.GACHA;
    const rates = [];
    for (let r = 5; r >= 1; r--) {
      rates.push('<span style="color:' + rkColor(r) + '">' + rkName(r) + ' ' + g.rates[r] + '%</span>');
    }
    uiEl().innerHTML = panel(
      '<h2>💎 星图罗盘 · 抽卡</h2>' +
      '<p class="sub" style="text-align:center">多米你可公司上古科技，可唤醒沉睡的神兽蛋</p>' +
      '<div class="row mt8" style="font-size:13px">' +
      '<span class="jade">💎 灵玉 ' + save.jade + '</span>' +
      '<span class="dim">已抽 ' + (save.pulls || 0) + ' 次</span>' +
      '</div>' +
      '<h3>保底进度</h3>' +
      '<div class="meter-row"><span class="mk">珍品保底</span><div class="bar"><div class="lvl-fill" style="width:' + Math.min(100, (save.pityRare || 0) / g.pityRare * 100) + '%"></div><div class="lbl">' + (save.pityRare || 0) + '/' + g.pityRare + '</div></div></div>' +
      '<div class="meter-row"><span class="mk">神话保底</span><div class="bar"><div class="lvl-fill myth" style="width:' + Math.min(100, (save.pityMyth || 0) / g.pityMyth * 100) + '%"></div><div class="lbl">' + (save.pityMyth || 0) + '/' + g.pityMyth + '</div></div></div>' +
      '<div class="legend" style="text-align:center;margin:6px 0">抽取概率：' + rates.join('　') + '</div>' +
      '<div class="row">' +
      '<div class="btn primary" id="gacha1" onclick="UI.gachaDo(1)">单抽（💎30）</div>' +
      '<div class="btn primary" id="gacha10" onclick="UI.gachaDo(10)">十连（💎270）</div>' +
      '</div>' +
      '<div id="gachaRes"></div>' +
      '<div class="row mt14">' + btn('返回营地', 'UI.showHub()') + '</div>'
    );
    refreshGachaBtns();
  }
  function refreshGachaBtns() {
    const save = Engine.getSave(), g = D.GACHA;
    const b1 = el('gacha1'), b10 = el('gacha10');
    if (b1) b1.classList.toggle('off', (save.jade || 0) < g.singleCost);
    if (b10) b10.classList.toggle('off', (save.jade || 0) < g.tenCost);
  }
  function gachaDo(n) {
    const r = Engine.gacha(n);
    if (!r.ok) { toast(r.msg || '灵玉不足'); return; }
    Engine.Sfx.hatch();
    const box = el('gachaRes');
    let html = '';
    let anyNew = false;
    r.results.forEach((res, i) => {
      if (res.isNew) anyNew = true;
      html += '<div class="gacha-card ' + glow(res.rarity) + '" data-bid="' + res.id + '" style="animation-delay:' + (i * 90) + 'ms">' +
        live(res.id, 1, 4) +
        '<div class="nm" style="color:' + rkColor(res.rarity) + '">' + res.name + '</div>' +
        rkBadge(res.rarity) +
        (res.isNew ? '<div class="new-badge">✦ 新收录</div>' : '<div class="rk">重复 · 等级+1</div>') +
        '</div>';
    });
    box.innerHTML = '<div class="gacha-grid">' + html + '</div>' + (anyNew ? '<p class="gold" style="text-align:center;margin-top:8px">✨ 新神兽已收录进图鉴！</p>' : '');
    // 更新余额
    const bal = uiEl().querySelector('.jade');
    if (bal) bal.innerHTML = '💎 灵玉 ' + Engine.getSave().jade;
    refreshGachaBtns();
    if (anyNew) toast('🎉 抽到新神兽！');
  }
  /* ---------- 图鉴 ---------- */
  function showCollection() {
    const save = Engine.getSave();
    let grid = '';
    for (const id in D.BEASTS) {
      const b = D.BEASTS[id];
      const owned = save.beasts[id];
      grid += '<div class="card ' + (owned ? 'owned' : 'unowned') + '" data-bid="' + id + '" onclick="UI.beastDetail(' + "'" + id + "'" + ')">' +
        (owned ? '<button class="sbtn" data-bid="' + id + '" title="能力说明">ℹ</button>' : '') +
        (owned ? live(id, owned.lv, 3.4) : '<div class="egg-cell">' + eggImg(4) + '</div>') +
        '<div class="nm">' + (owned ? b.name : '？？？') + '</div>' +
        '<div class="rk" style="color:' + rkColor(b.rarity) + '">' + rkName(b.rarity) + ' · ' + b.element + '</div>' +
        (owned ? '<div class="rk">Lv.' + owned.lv + '</div>' : '<div class="rk">未收录</div>') +
        '</div>';
    }
    uiEl().innerHTML = panel(
      '<h2>神兽图鉴 <span class="sub">(' + Object.keys(save.beasts).length + '/' + Object.keys(D.BEASTS).length + ')</span></h2>' +
      '<div class="grid-list">' + grid + '</div>' +
      '<div class="row mt14">' + btn('返回营地', 'UI.showHub()') + btn('💎 抽卡', 'UI.showGacha()', 'primary') + '</div>'
    );
  }

  /* ---------- 神兽详情（大画布 + 抚摸互动） ---------- */
  function gearHTML(beastId) {
    const save = Engine.getSave();
    const gear = (save.gear && save.gear[beastId]) || [];
    let slots = '';
    for (let i = 0; i < 2; i++) {
      const aid = gear[i];
      if (aid) {
        const art = D.ARTIFACTS[aid];
        slots += '<div class="gear-slot" title="点击卸下" onclick="UI.gearToggle(\'' + beastId + '\',\'' + aid + '\')">' +
          '<span class="gear-ic">' + art.icon + '</span><span class="gear-nm">' + art.name + '</span></div>';
      } else {
        slots += '<div class="gear-slot empty">空位</div>';
      }
    }
    let inv = '';
    for (const aid in save.artifacts) {
      const art = D.ARTIFACTS[aid];
      if (!art || art.beast !== beastId) continue;
      const equipped = gear.includes(aid);
      inv += '<div class="gear-chip">' + art.icon + ' <b>' + art.name + '</b> <span class="sub">' + art.desc + '</span> ' +
        '<button class="btn small" onclick="UI.gearToggle(\'' + beastId + '\',\'' + aid + '\')">' + (equipped ? '卸下' : '装备') + '</button></div>';
    }
    if (!inv) inv = '<p class="sub">暂无匹配神器：通关对应秘境可获得专属神器</p>';
    return '<div class="gear-row">' + slots + '</div>' + '<div class="gear-inv">' + inv + '</div>';
  }
  function gearToggle(beastId, artId) {
    const save = Engine.getSave();
    const gear = (save.gear && save.gear[beastId]) || [];
    const r = gear.includes(artId) ? Engine.unequipArtifact(beastId, artId) : Engine.equipArtifact(beastId, artId);
    toast((r.ok ? '✅ ' : '⚠️ ') + r.msg);
    if (r.ok) Engine.Sfx.click();
    beastDetail(beastId);
  }
  function beastDetail(id) {
    const save = Engine.getSave();
    const b = D.BEASTS[id];
    const owned = save.beasts[id];
    const lv = owned ? owned.lv : 1;
    const evo = Engine.beastEvoLv(lv);
    const evoName = b.evolveNames[evo] || b.name;
    const inTeam = save.team.includes(id);
    const nextEvo = evo < 2 ? b.evolveNames[evo + 1] : null;
    uiEl().innerHTML = panel(
      '<h2>' + b.name + ' <span style="color:' + rkColor(b.rarity) + ';font-size:13px">' + rkName(b.rarity) + '</span></h2>' +
      '<div style="text-align:center;margin:4px 0">' + live(id, lv, 7, 'big') + '</div>' +
      '<p class="sub" style="text-align:center">' + b.title + ' · 属性：' + b.element + ' · 阶段：' + evoName + (nextEvo ? ' → ' + nextEvo : '') + '　（点击神兽抚摸）</p>' +
      '<p style="margin-top:8px">' + b.desc + '</p>' +
      '<h3>伙伴技能</h3><p><span class="gold">' + b.skill.name + '</span>：' + b.skill.desc + '</p>' +
      '<h3>专属技能</h3><p><span class="gold">' + (b.ult ? b.ult.icon + ' ' + b.ult.name : '—') + '</span>：' + (b.ult ? b.ult.desc : '') + (b.ult ? '（冷却 ' + b.ult.cd + ' 秒，出战中按对应按键释放）' : '') + '</p>' +
      (owned ? '<h3>⚔ 神器装备（最多 2 件）</h3>' + gearHTML(id) : '') +
      '<h3>战斗素质</h3><p class="sub">生命 ' + b.combat.hp + '　攻击 ' + Engine.companionAtk(id, lv) + '（Lv.' + lv + ' ×' + Engine.beastStatScale(lv).toFixed(2) + '）　攻击方式：' + (b.combat.style === 'dash' ? '冲锋' : b.combat.style === 'bolt' ? '灵弹' : '灵环') + '</p>' +
      (owned ? '<h3>培养进度</h3>' +
        '<div class="meter-row"><span class="mk">等级</span><div class="bar"><div class="lvl-fill" style="width:' + (lv / 30 * 100) + '%"></div><div class="lbl">Lv.' + lv + ' / 30</div></div></div>' +
        '<p class="sub">每级 +2.5% 能力，10 级进化 +5%，20 级完全体 +10%（最高 ×1.8）</p>' +
        '<div class="row mt8">' + btn('喂养升级（💎? / 🪙' + Engine.feedCost(lv) + '）', 'UI.feed(' + "'" + id + "'" + ')') + '</div>'
        : '<p class="sub" style="margin-top:10px">尚未收录此神兽：击败对应秘境 BOSS，或用星图罗盘抽卡！</p>') +
      '<div class="row mt14">' + btn('返回图鉴', 'UI.showCollection()') + btn('技能说明', 'UI.skillInfo(' + "'" + id + "'" + ')') + btn('返回营地', 'UI.showHub()') + '</div>'
    );
  }
  function feed(id) {
    const r = Engine.feedBeast(id);
    toast(r.ok ? '✨ ' + D.BEASTS[id].name + ' 升级到 Lv.' + r.lv + '！' : (r.msg || '喂养失败'));
    if (r.ok) Engine.Sfx.hatch();
    beastDetail(id);
  }

  /* ---------- 队伍培养 ---------- */
  function showCultivate() {
    const save = Engine.getSave();
    let slots = '';
    for (let i = 0; i < 2; i++) {
      const id = save.team[i];
      slots += '<div class="slot ' + (id ? '' : 'empty') + '"' + (id ? ' data-bid="' + id + '"' : '') + ' onclick="UI.pickTeam(' + i + ')" title="点击更换">' +
        (id ? '<button class="sbtn" data-bid="' + id + '" title="能力说明">ℹ</button>' : '') +
        (id ? live(id, save.beasts[id].lv, 4.4) : '') + '</div>';
    }
    let list = '';
    for (const id in D.BEASTS) {
      if (!save.beasts[id]) continue;
      const b = D.BEASTS[id], lv = save.beasts[id].lv;
      list += '<div class="card ' + (save.team.includes(id) ? 'team sel' : '') + '" data-bid="' + id + '" onclick="UI.toggleTeam(' + "'" + id + "'" + ')">' +
        '<button class="sbtn" data-bid="' + id + '" title="能力说明">ℹ</button>' +
        live(id, lv, 3.4) +
        '<div class="nm">' + b.name + '</div>' +
        '<div class="rk" style="color:' + rkColor(b.rarity) + '">' + rkName(b.rarity) + ' Lv.' + lv + '</div>' +
        (save.team.includes(id) ? '<div class="rk green">出战</div>' : '<div class="rk">点击出战</div>') +
        '</div>';
    }
    uiEl().innerHTML = panel(
      '<h2>队伍培养</h2>' +
      '<p class="sub" style="text-align:center">最多 2 只神兽跟随出战，提供被动加成并自动攻击</p>' +
      '<div style="text-align:center;margin:10px 0">' + slots + '</div>' +
      '<div class="grid-list">' + (list || '<p class="sub">还没有神兽，先去秘境收集或抽卡吧！</p>') + '</div>' +
      '<div class="row mt14">' + btn('返回营地', 'UI.showHub()') + btn('神兽图鉴', 'UI.showCollection()') + btn('💎 抽卡', 'UI.showGacha()', 'primary') + '</div>'
    );
  }
  function toggleTeam(id) {
    const save = Engine.getSave();
    let team = save.team.slice();
    if (team.includes(id)) team = team.filter(t => t !== id);
    else {
      if (team.length >= 2) { toast('出战位已满（最多 2 只）'); return; }
      team.push(id);
    }
    if (Engine.setTeam(team)) { Engine.Sfx.click(); showCultivate(); }
  }
  function pickTeam(i) {
    const save = Engine.getSave();
    if (save.team[i]) { const t = save.team.slice(); t.splice(i, 1); Engine.setTeam(t); showCultivate(); return; }
    showCultivate();
  }
  /* ---------- 升级选择 ---------- */
  function showLevelup(opts) {
    let cards = '';
    opts.forEach((o, i) => {
      cards += '<div class="lv-card" style="animation-delay:' + (i * 70) + 'ms" onclick="UI.choose(' + i + ')">' +
        '<div class="ic">' + o.icon + '</div>' +
        '<div class="nm">' + o.name + '</div>' +
        '<div class="ds">' + o.desc + '</div>' +
        '<div class="lv">' + o.lvText + '</div>' +
        '</div>';
    });
    uiEl().innerHTML = '<div class="modal-mask"><div class="panel" style="max-width:760px">' +
      '<h2>✨ 升级！选择一种强化</h2>' +
      '<div class="lv-cards">' + cards + '</div>' +
      '</div></div>';
  }
  function choose(i) { Engine.chooseOption(i); }

  /* ---------- 结算 ---------- */
  function showResult(r) {
    let eggHtml = '';
    if (r.egg) {
      eggHtml = '<div style="text-align:center;margin:10px 0">' + live(r.egg.id, 1, 6, 'big') +
        '<p class="gold" style="margin-top:6px">🐣 孵化获得【' + r.egg.name + '】' + (r.egg.isNew ? '（新收录！）' : '（重复神兽，等级+1）') + '</p></div>';
    }
    MG._rewards = r.rewards || null;
    const jadeGain = 10 + Engine.getZoneIdx() * 5;
    let encHtml = '';
    if (r.win && !r.finalClear && r.rewards && Math.random() < MG.ENCOUNTER_CHANCE) {
      const g = MG.randomGame();
      encHtml = '<div class="enc-box" id="encBox">' +
        '<div class="enc-ic">' + g.icon + '</div>' +
        '<div><b class="gold">奇遇降临：' + g.name + '</b><br>' +
        '<span class="sub">' + g.desc + '，通过双倍奖励，失败将失去部分资源</span></div>' +
        '<div class="row" style="margin:0">' +
        '<div class="btn primary small" onclick="MG.accept(\'' + g.id + '\')">接受挑战</div>' +
        '<div class="btn small" onclick="MG.decline()">放弃</div>' +
        '</div></div>';
    }
    let storyHtml = '';
    if (r.win && r.zoneStory) {
      storyHtml = '<div class="story-box" style="margin-top:10px"><b class="gold">📜 剧情</b><p style="margin-top:4px">' + r.zoneStory + '</p></div>';
    }
    let artHtml = '';
    if (r.win && r.art) {
      const ab = D.BEASTS[r.art.beast];
      artHtml = '<div class="art-gain">✨ 获得神器【' + r.art.icon + ' ' + r.art.name + '】' +
        '<span class="sub">——' + r.art.desc + '（' + (ab ? ab.name : '') + ' 专属）</span></div>';
    }
    uiEl().innerHTML = panel(
      '<h2>' + (r.win ? '🎉 净化成功！' : '💔 被暗影击倒了……') + '</h2>' +
      '<p class="sub" style="text-align:center">' + r.zoneName + ' · ' + (r.win ? '击败 ' + r.bossName : '暗影兽潮仍在蔓延') + '</p>' +
      (r.win && r.finalClear ? '<p class="gold" style="text-align:center;margin-top:6px">⭐ 混沌已净化，智慧神兽宇宙重归宁静！</p>' : '') +
      '<div class="row mt8" style="font-size:14px">' +
      '<span>⏱ ' + r.time + '</span><span class="gold">🪙 <b id="resCoins">' + r.coins + '</b></span><span class="jade">💎 +<b id="resJade">' + jadeGain + '</b> 灵玉</span><span class="cyan">⚔ ' + r.kills + ' 击杀</span><span>Lv.' + r.lv + '</span>' +
      '</div>' +
      eggHtml +
      artHtml +
      encHtml +
      storyHtml +
      (r.win ? '<p class="sub" style="text-align:center">神兽蛋已被星图罗盘收录，营地解锁新的秘境</p>' : '') +
      '<div class="row mt14">' +
      btn('返回营地', 'UI.showHub()', 'primary') +
      btn('再次挑战', 'UI.go(' + Engine.getZoneIdx() + ')') +
      '</div>'
    );
  }

  /* ---------- 暂停 ---------- */
  function showPause() {
    uiEl().innerHTML = '<div class="modal-mask"><div class="panel">' +
      '<h2>⏸ 已暂停</h2>' +
      '<div class="row mt14">' + btn('继续战斗', 'Engine.resumeBattle()', 'primary') + btn('返回营地', 'UI.abandon()') + '</div>' +
      '</div></div>';
  }
  function abandon() { Engine.resumeBattle(); Engine.toHub(); }

  /* ---------- 操作说明 ---------- */
  function help() {
    uiEl().innerHTML = panel(
      '<h2>📜 操作说明</h2>' +
      '<div class="legend">' +
      '<b>移动</b>：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或方向键<br>' +
      '<b>攻击</b>：自动攻击，无需操作（割草玩法）<br>' +
      '<b>暂停</b>：<kbd>Esc</kbd> / <kbd>P</kbd><br>' +
      '<b>互动</b>：点击界面中的神兽可抚摸，会开心地蹦跳并冒出爱心<br>' +
      '<b>专属技能</b>：出战神兽各带专属技，按 <kbd>Q</kbd> / <kbd>E</kbd> 释放（屏幕下方技能槽）<br>' +
      '<b>能力说明</b>：鼠标悬停神兽，或点击卡片右上角 ℹ 查看被动与专属技能<br>' +
      '<b>升级</b>：拾取蓝色灵光经验球，升级时三选一强化<br>' +
      '</div>' +
      '<h3>玩法循环</h3>' +
      '<p class="sub">① 营地出征六大秘境　② 秘境中割草清怪、躲避 BOSS 弹幕<br>' +
      '③ 坚持到倒计时结束，BOSS 降临　④ 击败 BOSS 获得神兽蛋与灵玉<br>' +
      '⑤ 用 💎 灵玉在「星图罗盘」抽卡获得神兽（10 抽保底珍品，60 抽保底神话）<br>' +
      '⑥ 喂养培养神兽、组建出战队伍，挑战更深秘境</p>' +
      '<h3>神兽</h3>' +
      '<p class="sub">共 24 种华夏神兽：青龙、白虎、朱雀、玄武、麒麟、凤凰、九尾狐、貔貅、白泽、鲲鹏、烛龙……<br>' +
      '出战神兽会跟随战斗并提供被动加成；10/20 级进化。精英怪有几率掉神兽蛋。</p>' +
      '<div class="row mt14">' + btn('返回', 'UI.backTo()') + '</div>'
    );
  }
  function backTo() {
    const st = Engine.getState();
    if (st === 'title') showTitle(); else showHub();
  }
  function start() {
    const save = Engine.getSave();
    Engine.Sfx.unlock();
    if (save.seenStory) Engine.toHub();
    else showStory();
  }
  function resetSave() {
    if (confirm('确定要重置所有存档进度吗？（神兽、灵力、灵玉、区域都将清空）')) {
      localStorage.removeItem('shenshou_save_v1');
      location.reload();
    }
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const t = el('toast');
    t.innerHTML = msg;
    t.classList.remove('hidden');
    t.classList.remove('pop');
    void t.offsetWidth;
    t.classList.add('pop');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2000);
  }

  /* ---------- 初始化与分发 ---------- */
    /* ---------- 神兽能力展示：hover 悬浮卡 / ℹ 说明弹窗 ---------- */
  function abTip() {
    let tip = document.getElementById('abTooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'abTooltip';
      tip.className = 'hidden';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function showAb(id, e) {
    const b = D.BEASTS[id];
    if (!b || !b.ult) return;
    const tip = abTip();
    if (tip.dataset.bid !== id) {
      tip.innerHTML = beastAbilityHTML(id);
      tip.dataset.bid = id;
    }
    tip.classList.remove('hidden');
    moveAb(e);
  }
  function moveAb(e) {
    const tip = abTip();
    const pad = 12;
    let x = e.clientX + pad, y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 6) x = e.clientX - r.width - pad;
    if (y + r.height > window.innerHeight - 6) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideAb() {
    const tip = document.getElementById('abTooltip');
    if (tip) { tip.classList.add('hidden'); tip.dataset.bid = ''; }
  }
  function beastAbilityHTML(id) {
    const b = D.BEASTS[id];
    if (!b) return '';
    const save = Engine.getSave();
    const slot = save.team.indexOf(id);
    const key = slot === 0 ? 'Q' : slot === 1 ? 'E' : null;
    const rcol = rkColor(b.rarity);
    return '<div class="ab-head"><span class="ab-rk" style="background:' + rcol + '">' + rkName(b.rarity) + '</span><b>' + b.name + '</b><span class="ab-el">' + b.element + '</span></div>' +
      '<div class="ab-row"><span class="ab-lab">被动</span><b>' + b.skill.name + '</b></div>' +
      '<div class="ab-desc">' + b.skill.desc + '</div>' +
      '<div class="ab-row"><span class="ab-lab">专属技</span><b>' + (b.ult ? b.ult.icon + ' ' + b.ult.name : '—') + '</b>' + (key && b.ult ? '<span class="ab-key">' + key + '</span>' : '') + '</div>' +
      '<div class="ab-desc">' + (b.ult ? b.ult.desc : '') + '</div>' +
      (b.ult ? '<div class="ab-cd">冷却 ' + b.ult.cd + ' 秒　' + (key ? '出战中按 ' + key + ' 释放' : '编入出战队伍后按对应键释放') + '</div>' : '');
  }
  function skillInfo(id) {
    const b = D.BEASTS[id];
    if (!b) return;
    UI._prevHtml = uiEl().innerHTML;
    uiEl().innerHTML =
      '<div class="skill-backdrop" onclick="UI.skillClose()"></div>' +
      '<div class="skill-wrap"><div class="panel">' +
      '<h2>' + b.name + ' · 能力说明</h2>' +
      '<p class="sub" style="text-align:center">' + b.title + ' · 属性：' + b.element + ' · ' + rkName(b.rarity) + '</p>' +
      '<div class="ab-box">' + beastAbilityHTML(id) + '</div>' +
      '<p class="sub" style="margin-top:8px">战斗中使用 <kbd>Q</kbd>（1 号位）/ <kbd>E</kbd>（2 号位）释放专属技能；冷却结束技能槽会亮起金色脉冲。点击背景或「关闭」返回。</p>' +
      '<div class="row mt14">' + btn('关闭', 'UI.skillClose()') + '</div>' +
      '</div></div>';
  }
  function skillClose() {
    if (UI._prevHtml !== undefined) { uiEl().innerHTML = UI._prevHtml; UI._prevHtml = undefined; }
    else { const st = Engine.getState(); if (st === 'title') showTitle(); else showHub(); }
  }
  function init() {
    const u = document.getElementById('ui');
    // 捕获阶段：ℹ 按钮优先于卡片 onClick，避免误开详情页
    u.addEventListener('click', (e) => {
      const sb = e.target.closest('.sbtn');
      if (sb) { e.stopPropagation(); skillInfo(sb.getAttribute('data-bid')); }
    }, true);
    // 点击神兽画布 = 抚摸互动；点击 ℹ = 能力说明
    u.addEventListener('click', (e) => {
      const cv = e.target.closest('canvas.beast-live');
      if (cv) { e.stopPropagation(); Engine.petBeast(cv); }
    });
    // hover 展示神兽能力
    u.addEventListener('mouseover', (e) => {
      const el = e.target.closest('canvas.beast-live, [data-bid]');
      if (!el) { hideAb(); return; }
      const id = el.getAttribute('data-beast') || el.getAttribute('data-bid');
      if (!id || !D.BEASTS[id]) { hideAb(); return; }
      showAb(id, e);
    });
    u.addEventListener('mouseout', (e) => {
      const el = e.target.closest('canvas.beast-live, [data-bid]');
      if (!el) return;
      const rel = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('canvas.beast-live, [data-bid]') : null;
      if (rel !== el) hideAb();
    });
    u.addEventListener('mousemove', (e) => {
      const tip = document.getElementById('abTooltip');
      if (tip && !tip.classList.contains('hidden')) moveAb(e);
    });
  }
  function show(state, payload) {
    Engine.Sfx.unlock();
    const u = uiEl();
    if (state === 'battle') { u.innerHTML = ''; u.classList.add('hidden'); return; }
    u.classList.remove('hidden');
    if (state === 'title') showTitle();
    else if (state === 'story') showStory();
    else if (state === 'hub') showHub();
    else if (state === 'levelup') showLevelup(payload);
    else if (state === 'result') showResult(payload);
    else if (state === 'pause') showPause();
    else if (state === 'gacha') showGacha();
  }

  return {
    init, show, toast, start, go, choose, feed,
    showHub, showCollection, showCultivate, showGacha, gachaDo,
    beastDetail, toggleTeam, pickTeam, help, backTo, resetSave, skillInfo, skillClose,
    storyNext, storyAll, abandon
  };
})();
