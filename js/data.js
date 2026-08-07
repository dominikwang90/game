'use strict';
/* ============================================================
 * 游戏数据：神兽图鉴 / 武器 / 被动 / 敌人 / 区域 / 剧情
 * ============================================================ */
window.DATA = (function () {

  const RARITY_NAME = ['', '凡品', '良品', '珍品', '圣品', '神话'];
  const RARITY_COLOR = ['', '#9aa0b5', '#4dd0e1', '#b48cff', '#ff8c3b', '#ffd54a'];
  const ELEMENT_COLOR = {
    金: '#ffd54a', 木: '#7ee787', 水: '#4dd0e1', 火: '#ff6b6b', 土: '#c9a06c',
    雷: '#c792ff', 风: '#80e8d8', 幻: '#ff9ecb', 光: '#fff3c4', 暗: '#8b93c4',
    祥瑞: '#ffd7a8', 阳: '#ffb84d', 阴: '#a78bfa', 法: '#8ab4ff', 财: '#ffd54a', 智: '#9ad1ff'
  };

  /* ---------------- 神兽图鉴 ---------------- */
  const BEASTS = {
    jintoad: {
      id: 'jintoad', name: '三足金蟾', title: '招财灵蟾', element: '财', rarity: 1,
      shape: 'turtle', featureExtra: 'toad+coin',
      colors: { body: '#7ac96b', belly: '#dff0c8', accent: '#ffd54a', detail: '#2e7d4f', eye: '#2b2b3a', shade: '#3f6b3a' },
      desc: '口衔铜钱的三足金蟾，相传能招财纳福。曾为云梦泽边的小灵蟾，被暗影惊扰后逃入青丘。',
      skill: { name: '聚宝盆', desc: '战斗中获得灵力+10%', stat: 'coinMul', val: 0.10 },
      combat: { hp: 60, atk: 8, cd: 2.2, style: 'aura' },
      evolveNames: ['金蟾', '三足金蟾', '金蟾大仙'], zone: 'qiuqiu',
     ult: { name: '聚宝金雨', icon: '🪙', cd: 14, desc: '泼洒聚宝金雨，立即获得 60 点灵力，并大幅吸引附近掉落物', effect: {"type":"coin","power":60,"radius":260} }

    },
    fuzhu: {
      id: 'fuzhu', name: '夫诸', title: '白鹿泽灵', element: '水', rarity: 1,
      shape: 'quad', ears: 'round', horns: 'stag', tail: 'long',
      colors: { body: '#e8ecff', belly: '#ffffff', accent: '#9ad1ff', detail: '#5b6b8f', eye: '#2b2b3a', shade: '#8f9cc0' },
      desc: '白鹿之形，目如明珠。所过之处水泽丰盈，是云梦泽的水脉守护者。',
      skill: { name: '润泽', desc: '最大生命+12%', stat: 'hpMul', val: 0.12 },
      combat: { hp: 80, atk: 9, cd: 1.8, style: 'dash' },
      evolveNames: ['夫诸', '泽灵夫诸', '水泽神鹿'], zone: 'qiuqiu',
     ult: { name: '甘霖泽世', icon: '💧', cd: 16, desc: '降下甘霖，立即恢复 35% 最大生命，并在 4 秒内持续回复', effect: {"type":"heal","power":0.35,"dur":4} }

    },
    huodou: {
      id: 'huodou', name: '祸斗', title: '炎獒', element: '火', rarity: 1,
      shape: 'quad', ears: 'cat', tail: 'fluffy', flame: true, featureExtra: 'flameEye',
      colors: { body: '#6b4226', belly: '#a05a2c', accent: '#ff8c3b', detail: '#4a2a14', eye: '#ff3b4e', shade: '#33200f' },
      desc: '形似黑犬、身裹烈焰的凶兽，所到之处草木皆焦。但被驯服后是最忠实的伙伴。',
      skill: { name: '烈焰牙', desc: '攻击力+8%', stat: 'atkMul', val: 0.08 },
      combat: { hp: 70, atk: 12, cd: 1.6, style: 'dash' },
      evolveNames: ['祸斗', '炎獒祸斗', '焚天炎犬'], zone: 'qiuqiu',
     ult: { name: '烈焰吐息', icon: '🔥', cd: 13, desc: '向前喷吐烈焰，灼烧直线上的敌人，造成 34 点伤害', effect: {"type":"beam","power":34,"dur":0.5} }

    },
    chongming: {
      id: 'chongming', name: '重明鸟', title: '双瞳瑞鸟', element: '光', rarity: 1,
      shape: 'bird', crest: true, featureExtra: 'twinPupil',
      colors: { body: '#fff3c4', belly: '#ffffff', accent: '#ffd54a', detail: '#e0b64a', eye: '#3a2a14', shade: '#c9a04a' },
      desc: '目生双瞳、能驱邪避害的神鸟。其鸣声可驱散暗影，是青丘村民的守护神。',
      skill: { name: '澄明', desc: '暴击率+5%', stat: 'critCh', val: 0.05 },
      combat: { hp: 55, atk: 10, cd: 1.7, style: 'bolt' },
      evolveNames: ['重明鸟', '重明神鸟', '光明重明'], zone: 'qiuqiu',
     ult: { name: '重瞳开光', icon: '👁', cd: 15, desc: '重瞳开光，灵目所见皆焚，对周围敌人造成 30 点伤害', effect: {"type":"nova","power":30,"radius":170} }

    },
    tiangou: {
      id: 'tiangou', name: '天狗', title: '食月之犬', element: '暗', rarity: 2,
      shape: 'quad', ears: 'long', tail: 'fluffy', flame: true,
      colors: { body: '#2c2c3e', belly: '#4a4a66', accent: '#6b6b8a', detail: '#8a8aa8', eye: '#ffd54a', shade: '#171722' },
      desc: '传说中吞食明月的天狗，长啸可撼星辰。流落到云梦泽后，以暗影为食。',
      skill: { name: '逐月', desc: '移动速度+8%', stat: 'msMul', val: 0.08 },
      combat: { hp: 90, atk: 13, cd: 1.5, style: 'dash' },
      evolveNames: ['天狗', '哮月天狗', '天狗食月'], zone: 'yunmeng',
     ult: { name: '天狗食月', icon: '🌕', cd: 14, desc: '天狗食月，吐出月华冲击波，对直线敌人造成 38 点伤害', effect: {"type":"beam","power":38,"dur":0.5} }

    },
    yingzhao: {
      id: 'yingzhao', name: '英招', title: '腾云天马', element: '风', rarity: 2,
      shape: 'quad', ears: 'long', tail: 'lion', wings: 'bird', mane: true,
      colors: { body: '#80e8d8', belly: '#eafff8', accent: '#4dd0e1', detail: '#2ba3b8', eye: '#1c3a40', shade: '#3f8f96' },
      desc: '马身人面、背生双翼的神兽，为天帝看守花园。性情温良，擅长腾云疾行。',
      skill: { name: '天马行空', desc: '移动速度+10%', stat: 'msMul', val: 0.10 },
      combat: { hp: 85, atk: 11, cd: 1.6, style: 'dash' },
      evolveNames: ['英招', '腾云英招', '巡天英招'], zone: 'yunmeng',
     ult: { name: '御风而行', icon: '🌬', cd: 16, desc: '召唤神风，全队移速提升 50%，持续 5 秒', effect: {"type":"speed","power":0.5,"dur":5} }

    },
    xiezhi: {
      id: 'xiezhi', name: '獬豸', title: '明断法兽', element: '法', rarity: 2,
      shape: 'quad', ears: 'cat', horns: 'single', tail: 'long',
      colors: { body: '#e8ecff', belly: '#ffffff', accent: '#8ab4ff', detail: '#5b6b8f', eye: '#23243a', shade: '#8f9cc0' },
      desc: '独角神羊，能辨忠奸、明是非。它顶向暗影的那一刻，污浊便无所遁形。',
      skill: { name: '明断', desc: '护甲+3（减伤）', stat: 'armor', val: 3 },
      combat: { hp: 95, atk: 10, cd: 1.9, style: 'aura' },
      evolveNames: ['獬豸', '明断獬豸', '执法獬豸'], zone: 'yunmeng',
     ult: { name: '公正壁垒', icon: '⚖', cd: 15, desc: '律令护体，获得 50% 最大生命的护盾，持续 4 秒', effect: {"type":"shield","power":0.5,"dur":4} }

    },
    bifang: {
      id: 'bifang', name: '毕方', title: '独足火鸟', element: '火', rarity: 2,
      shape: 'bird', crest: true, flame: true, featureExtra: 'singleLeg',
      colors: { body: '#5aa7ff', belly: '#cfe6ff', accent: '#ff6b6b', detail: '#ff8c3b', eye: '#23243a', shade: '#3b6bbf' },
      desc: '独脚单翼的火鸟，见之则有火。毕方衔火而舞，为不周山带来第一缕光。',
      skill: { name: '衔火', desc: '攻击力+12%', stat: 'atkMul', val: 0.12 },
      combat: { hp: 80, atk: 14, cd: 1.5, style: 'bolt' },
      evolveNames: ['毕方', '衔火毕方', '炎翼毕方'], zone: 'longyuan',
     ult: { name: '火环燎原', icon: '🔥', cd: 12, desc: '展翅旋出烈焰火环，对周围敌人造成 28 点伤害', effect: {"type":"nova","power":28,"radius":130} }

    },
    jinwu: {
      id: 'jinwu', name: '金乌', title: '三足日鸟', element: '火', rarity: 3,
      shape: 'bird', crest: true, flame: true, featureExtra: 'thirdLeg',
      colors: { body: '#ffd54a', belly: '#fff3c4', accent: '#ff8c3b', detail: '#ff6b2c', eye: '#5a2a14', shade: '#c98a2c' },
      desc: '驮着太阳的三足金乌，每日从扶桑树起飞。它是灵山之上永不熄灭的火焰。',
      skill: { name: '灼日', desc: '攻击力+15%', stat: 'atkMul', val: 0.15 },
      combat: { hp: 100, atk: 16, cd: 1.4, style: 'bolt' },
      evolveNames: ['金乌', '三足金乌', '太阳金乌'], zone: 'lingshan',
     ult: { name: '烈日降临', icon: '☀️', cd: 18, desc: '化身为日，灼烧全场，造成 40 点伤害并附加灼烧', effect: {"type":"nova","power":40,"radius":200,"burn":8} }

    },
    fox: {
      id: 'fox', name: '九尾狐', title: '青丘灵狐', element: '幻', rarity: 3,
      shape: 'quad', ears: 'fox', tail: 'fox9',
      colors: { body: '#f4a7b9', belly: '#ffe3ea', accent: '#ff9ecb', detail: '#c97a94', eye: '#5b2a6b', shade: '#c98a94' },
      desc: '青丘山中的九尾灵狐，通晓幻术。九条尾巴摇曳之间，敌人已坠入梦境。',
      skill: { name: '幻影步', desc: '移动速度+10%', stat: 'msMul', val: 0.10 },
      combat: { hp: 95, atk: 13, cd: 1.5, style: 'bolt' },
      evolveNames: ['九尾狐', '青丘灵狐', '九尾天狐'], zone: 'qiuqiu',
     ult: { name: '魅影狐火', icon: '🦊', cd: 15, desc: '九尾摇曳，魅惑全场敌人，使其减速 60%，持续 4 秒', effect: {"type":"slow","power":0.6,"dur":4} }

    },
    pixiu: {
      id: 'pixiu', name: '貔貅', title: '纳财瑞兽', element: '财', rarity: 3,
      shape: 'quad', ears: 'round', tail: 'scaled', wings: 'dragon', scales: true,
      colors: { body: '#4dd0e1', belly: '#eaffff', accent: '#ffd54a', detail: '#2ba3b8', eye: '#1c3a40', shade: '#2c8f96' },
      desc: '只进不出的瑞兽，张口纳财。它把吞下的灵力都化作了金光闪闪的宝藏。',
      skill: { name: '纳财', desc: '获得灵力+15%', stat: 'coinMul', val: 0.15 },
      combat: { hp: 110, atk: 12, cd: 1.8, style: 'aura' },
      evolveNames: ['貔貅', '纳财貔貅', '吞金貔貅'], zone: 'kunlun',
     ult: { name: '吞金吐宝', icon: '🧧', cd: 18, desc: '吞金吐宝，立即获得 120 点灵力，掉落翻倍持续 6 秒', effect: {"type":"coin","power":120,"dur":6,"dropMul":2} }

    },
    luwu: {
      id: 'luwu', name: '陆吾', title: '昆仑九尾虎', element: '土', rarity: 3,
      shape: 'quad', ears: 'round', tail: 'lion', mane: true, stripes: true, featureExtra: '9t',
      colors: { body: '#c9a06c', belly: '#f0e0c0', accent: '#8a6a3c', detail: '#6b5030', eye: '#2b2b3a', shade: '#7a5a30' },
      desc: '虎身九尾，司天之九部。昆仑山巅的守门神兽，一声虎啸令群山回响。',
      skill: { name: '镇山', desc: '最大生命+15%', stat: 'hpMul', val: 0.15 },
      combat: { hp: 130, atk: 14, cd: 1.7, style: 'dash' },
      evolveNames: ['陆吾', '昆仑陆吾', '九尾虎神'], zone: 'kunlun',
     ult: { name: '虎啸扑击', icon: '🐅', cd: 13, desc: '九首齐啸，扑向最近敌人造成 42 点伤害并强力击退', effect: {"type":"strike","power":42,"dur":0.5} }

    },
    baize: {
      id: 'baize', name: '白泽', title: '通晓万灵', element: '智', rarity: 3,
      shape: 'quad', ears: 'long', horns: 'stag', tail: 'lion', mane: true,
      colors: { body: '#f0f2ff', belly: '#ffffff', accent: '#8ab4ff', detail: '#5b6b8f', eye: '#23243a', shade: '#9aa3cc' },
      desc: '能言语、通万物之情的瑞兽，知晓天下所有神兽的名字与弱点。',
      skill: { name: '博闻', desc: '经验获取+15%', stat: 'xpMul', val: 0.15 },
      combat: { hp: 100, atk: 13, cd: 1.6, style: 'bolt' },
      evolveNames: ['白泽', '通灵白泽', '万象白泽'], zone: 'kunlun',
     ult: { name: '通晓万物', icon: '📖', cd: 16, desc: '识破万物弱点，攻击力提升 35%，持续 5 秒', effect: {"type":"buffAtk","power":0.35,"dur":5} }

    },
    baihu: {
      id: 'baihu', name: '白虎', title: '西方金煞', element: '金', rarity: 4,
      shape: 'quad', ears: 'round', tail: 'long', stripes: true,
      colors: { body: '#e8ecff', belly: '#ffffff', accent: '#ff8c3b', detail: '#5b6b8f', eye: '#23243a', shade: '#8f9cc0' },
      desc: '西方庚金之灵，主杀伐。白虎踏碎暗影的一击，令星辰为之震颤。',
      skill: { name: '庚金', desc: '暴击率+8%、暴伤+20%', stat: 'crit', val: 0.08 },
      combat: { hp: 140, atk: 18, cd: 1.4, style: 'dash' },
      evolveNames: ['白虎', '庚金白虎', '西方白虎'], zone: 'lingshan',
     ult: { name: '庚金杀伐', icon: '🐯', cd: 13, desc: '白虎主杀，喷吐庚金之气，对直线敌人造成 44 点伤害', effect: {"type":"beam","power":44,"dur":0.5} }

    },
    zhuque: {
      id: 'zhuque', name: '朱雀', title: '南方离火', element: '火', rarity: 4,
      shape: 'bird', crest: true, flame: true, tail: 'phoenix',
      colors: { body: '#ff6b6b', belly: '#ffe0d0', accent: '#ff8c3b', detail: '#ff3b2c', eye: '#3a1010', shade: '#c93b3b' },
      desc: '南方七宿之灵，通体燃着南明离火。朱雀展翅，火雨焚尽一切污秽。',
      skill: { name: '离火', desc: '攻击力+18%', stat: 'atkMul', val: 0.18 },
      combat: { hp: 120, atk: 20, cd: 1.3, style: 'aura' },
      evolveNames: ['朱雀', '离火朱雀', '南方朱雀'], zone: 'lingshan',
     ult: { name: '南明离火', icon: '🐦', cd: 15, desc: '南明离火燎原，对周围敌人造成 36 点伤害并附加灼烧', effect: {"type":"nova","power":36,"radius":180,"burn":6} }

    },
    xuanwu: {
      id: 'xuanwu', name: '玄武', title: '北方玄水', element: '水', rarity: 4,
      shape: 'turtle', featureExtra: 'serpent',
      colors: { body: '#2c5a6e', belly: '#9ad1ff', accent: '#4dd0e1', detail: '#1c3a4a', eye: '#eaffff', shade: '#17323f' },
      desc: '龟蛇合体的北方之灵，背负玄水。玄武所至，万顷波涛皆化为坚盾。',
      skill: { name: '玄水', desc: '护甲+4、最大生命+8%', stat: 'armorHp', val: 4 },
      combat: { hp: 170, atk: 14, cd: 1.9, style: 'aura' },
      evolveNames: ['玄武', '玄水玄武', '北方玄武'], zone: 'yunmeng',
     ult: { name: '玄龟甲御', icon: '🐢', cd: 17, desc: '玄武真甲护体，获得 60% 最大生命的护盾，持续 5 秒', effect: {"type":"shield","power":0.6,"dur":5} }

    },
    kaiming: {
      id: 'kaiming', name: '开明兽', title: '九首守天门', element: '金', rarity: 4,
      shape: 'quad', ears: 'cat', tail: 'long', stripes: true, crown: true,
      colors: { body: '#d8b25c', belly: '#f5e6b8', accent: '#ffd54a', detail: '#8a6a2c', eye: '#3a2a14', shade: '#9a7a34' },
      desc: '身大如虎、九首皆人面，立于昆仑天门之上，九双眼睛巡视诸天。',
      skill: { name: '九目', desc: '攻击力+15%、最大生命+10%', stat: 'atkHp', val: 0.15 },
      combat: { hp: 160, atk: 19, cd: 1.5, style: 'dash' },
      evolveNames: ['开明兽', '九首开明', '天门九首'], zone: 'kunlun',
     ult: { name: '九首咆哮', icon: '🐆', cd: 14, desc: '九首齐吼，将周围敌人牵引到身边，造成 30 点伤害', effect: {"type":"vortex","power":30,"radius":180} }

    },
    fenghuang: {
      id: 'fenghuang', name: '凤凰', title: '百鸟之王', element: '火', rarity: 4,
      shape: 'bird', crest: true, flame: true, tail: 'phoenix',
      colors: { body: '#ff9ecb', belly: '#ffe9f2', accent: '#ff6b8a', detail: '#ffd54a', eye: '#5a1430', shade: '#d06a94' },
      desc: '五色备举的百鸟之王，浴火重生。凤凰之羽，可令垂死之灵重获新生。',
      skill: { name: '涅槃', desc: '每次战斗可复活一次', stat: 'revive', val: 1 },
      combat: { hp: 150, atk: 18, cd: 1.4, style: 'bolt' },
      evolveNames: ['凤凰', '浴火凤凰', '百鸟凤皇'], zone: 'lingshan',
     ult: { name: '涅槃重生', icon: '🐤', cd: 18, desc: '浴火重生，恢复 60% 最大生命，并对周围造成 30 点伤害', effect: {"type":"nova","power":30,"radius":150,"heal":0.6} }

    },
    qinglong: {
      id: 'qinglong', name: '青龙', title: '东方苍龙', element: '木', rarity: 5,
      shape: 'serpent', horns: 'dragon', wings: 'dragon', featureExtra: 'beard',
      colors: { body: '#3fbf6e', belly: '#d8f5dc', accent: '#ffd54a', detail: '#2e8a4e', eye: '#0e3a20', shade: '#1f6b3f' },
      desc: '东方七宿之灵，司掌生长与雷霆。青龙盘踞不周山龙渊，守护着世间生机。',
      skill: { name: '苍生', desc: '经验获取+20%', stat: 'xpMul', val: 0.20 },
      combat: { hp: 200, atk: 22, cd: 1.3, style: 'bolt' },
      evolveNames: ['青龙', '苍龙', '东方青龙'], zone: 'longyuan',
     ult: { name: '青龙吐息', icon: '🐉', cd: 16, desc: '青龙吐息，唤来九天之水，对直线敌人造成 50 点伤害', effect: {"type":"beam","power":50,"dur":0.5} }

    },
    yinglong: {
      id: 'yinglong', name: '应龙', title: '雷翼神龙', element: '雷', rarity: 5,
      shape: 'serpent', horns: 'dragon', wings: 'dragon', featureExtra: 'beard',
      colors: { body: '#6b8aff', belly: '#dbe4ff', accent: '#c792ff', detail: '#ffd54a', eye: '#1a1a3a', shade: '#3f52a0' },
      desc: '背生双翼的祖龙，掌风雨雷电。应龙展翼，雷云自九天垂落。',
      skill: { name: '霆击', desc: '攻击力+25%', stat: 'atkMul', val: 0.25 },
      combat: { hp: 210, atk: 26, cd: 1.2, style: 'bolt' },
      evolveNames: ['应龙', '雷翼应龙', '祖龙应龙'], zone: 'longyuan',
     ult: { name: '九天风雷', icon: '🐲', cd: 17, desc: '应龙振翅，风雷齐鸣，对周围造成 40 点伤害并减速敌人', effect: {"type":"nova","power":40,"radius":190,"slow":0.5,"slowDur":3} }

    },
    zhulong: {
      id: 'zhulong', name: '烛龙', title: '昼夜之龙', element: '阳', rarity: 5,
      shape: 'serpent', horns: 'dragon', flame: true, featureExtra: 'flameEye+beard',
      colors: { body: '#ff8c6b', belly: '#ffe0d0', accent: '#ffd54a', detail: '#ff3b2c', eye: '#fff3c4', shade: '#b84a3b' },
      desc: '睁眼为昼、闭眼为夜的神龙。烛龙喷吐的烈焰，照亮了混沌海最深的角落。',
      skill: { name: '烛照', desc: '受到的伤害-10%', stat: 'dmgRed', val: 0.10 },
      combat: { hp: 220, atk: 22, cd: 1.4, style: 'aura' },
      evolveNames: ['烛龙', '烛九阴', '昼夜烛龙'], zone: 'longyuan',
     ult: { name: '烛照九幽', icon: '🕯', cd: 19, desc: '烛龙睁眼，白昼永驻，对周围造成 45 点伤害并附加灼烧', effect: {"type":"nova","power":45,"radius":210,"burn":10} }

    },
    qilin: {
      id: 'qilin', name: '麒麟', title: '祥瑞之首', element: '祥瑞', rarity: 5,
      shape: 'quad', ears: 'round', horns: 'dragon', tail: 'lion', mane: true, scales: true, flame: true,
      colors: { body: '#ffd7a8', belly: '#fff6e8', accent: '#ff8c3b', detail: '#c97a3c', eye: '#3a2010', shade: '#d09a5c' },
      desc: '不履生草、不食生物的仁兽。麒麟现世，天下太平，万灵归心。',
      skill: { name: '仁德', desc: '生命/攻击/速度各+8%', stat: 'all', val: 0.08 },
      combat: { hp: 230, atk: 24, cd: 1.3, style: 'aura' },
      evolveNames: ['麒麟', '祥瑞麒麟', '圣麒麟'], zone: 'lingshan',
     ult: { name: '祥瑞赐福', icon: '🦄', cd: 18, desc: '麒麟踏云，攻击提升 40% 并获得 40% 护盾，持续 6 秒', effect: {"type":"buffAtk","power":0.4,"dur":6,"shield":0.4} }

    },
    kunpeng: {
      id: 'kunpeng', name: '鲲鹏', title: '北冥巨灵', element: '风', rarity: 5,
      shape: 'bird', crest: true, tail: 'long', scale: 1.35,
      colors: { body: '#3a6e8a', belly: '#cfe8f0', accent: '#4dd0e1', detail: '#2b4a5c', eye: '#eaffff', shade: '#1f3f52' },
      desc: '北冥之鲲化而为鹏，翼若垂天之云。鲲鹏一扇翅，便可扶摇九万里。',
      skill: { name: '扶摇', desc: '移动速度+15%、拾取范围+60', stat: 'msMag', val: 0.15 },
      combat: { hp: 240, atk: 24, cd: 1.3, style: 'bolt' },
      evolveNames: ['鲲鹏', '北冥鲲鹏', '垂云巨鹏'], zone: 'hundun',
     ult: { name: '扶摇直上', icon: '🐋', cd: 20, desc: '鲲鹏展翅九万里，掀起巨浪，对周围造成 55 点伤害并牵引敌人', effect: {"type":"nova","power":55,"radius":240,"vortex":true} }

    },
    hundun: {
      id: 'hundun', name: '混沌', title: '七窍之灵', element: '暗', rarity: 5,
      shape: 'quad', ears: 'round', tail: 'fluffy',
      colors: { body: '#5a4a8a', belly: '#8a7ab8', accent: '#c792ff', detail: '#3a2e5c', eye: '#ffd54a', shade: '#2a1f44' },
      desc: '没有七窍的原始神灵，代表万物之初的混沌。被暗影侵蚀后，它成了灾厄的化身。净化它，让它重归宁静。',
      skill: { name: '归元', desc: '护甲+6、受到伤害-8%', stat: 'armorDmg', val: 6 },
      combat: { hp: 260, atk: 20, cd: 1.8, style: 'aura' },
      evolveNames: ['混沌', '七窍混沌', '原始混沌'], zone: 'hundun',
     ult: { name: '混沌吞噬', icon: '🌑', cd: 20, desc: '混沌初开，吞噬万物，牵引并撕裂周围敌人，造成 50 点伤害', effect: {"type":"vortex","power":50,"radius":200} }

    }
  };

  /* ---------------- 武器 ---------------- */
  const WEAPONS = {
    sword: { id: 'sword', name: '灵符飞剑', icon: '⚔', maxLv: 8, kind: 'weapon',
      desc: '自动锁定最近的敌人，射出符剑。', lvDesc: '伤害+6，2/5/8级+1飞剑，每级+1穿透' },
    ring: { id: 'ring', name: '乾坤圈', icon: '◎', maxLv: 8, kind: 'weapon',
      desc: '金色乾坤圈环绕自身旋转。', lvDesc: '伤害+5，2/4/6/8级+1乾坤圈' },
    ribbon: { id: 'ribbon', name: '混天绫', icon: '〰', maxLv: 6, kind: 'weapon',
      desc: '每隔数秒横扫周身一圈，击退敌人。', lvDesc: '伤害+12，冷却缩短，范围扩大' },
    fan: { id: 'fan', name: '神火扇', icon: '🪭', maxLv: 7, kind: 'weapon',
      desc: '扇出扇形火焰，灼烧面前的敌人。', lvDesc: '伤害+4，2/4/6级+1道火焰' },
    coin: { id: 'coin', name: '落宝金钱', icon: '¤', maxLv: 6, kind: 'weapon',
      desc: '抛出带灵气的铜钱，弹射多个敌人。', lvDesc: '伤害+8，弹射+1' },
    whip: { id: 'whip', name: '打神鞭', icon: '⛓', maxLv: 6, kind: 'weapon',
      desc: '引下雷霆之鞭，闪电链式打击敌人。', lvDesc: '伤害+12，2/4/6级+1次连锁' },
    staff: { id: 'staff', name: '定海神针', icon: '🪵', maxLv: 6, kind: 'weapon',
      desc: '擎天巨柱绕身旋转，重击并击退敌人。', lvDesc: '伤害+10，范围扩大' },
    wheels: { id: 'wheels', name: '风火轮', icon: '🔥', maxLv: 5, kind: 'weapon',
      desc: '脚踏风火轮：移速+8%，留下火焰轨迹。', lvDesc: '移速再+8%，火焰伤害+8' }
  };

  /* ---------------- 被动 ---------------- */
  const PASSIVES = {
    qilin: { id: 'qilin', name: '麒麟玉', icon: '💠', maxLv: 5, kind: 'passive',
      desc: '经验获取+15%/级', stat: 'xpMul', val: 0.15 },
    xuanwu: { id: 'xuanwu', name: '玄武甲', icon: '🛡', maxLv: 5, kind: 'passive',
      desc: '护甲+2/级（每点护甲减伤1）', stat: 'armor', val: 2 },
    zhuque: { id: 'zhuque', name: '朱雀羽', icon: '🪶', maxLv: 5, kind: 'passive',
      desc: '攻击力+10%/级', stat: 'atkMul', val: 0.10 },
    baihu: { id: 'baihu', name: '白虎爪', icon: '🐾', maxLv: 5, kind: 'passive',
      desc: '暴击率+4%、暴击伤害+15%/级', stat: 'crit', val: 0.04 },
    longlin: { id: 'longlin', name: '龙鳞', icon: '🐉', maxLv: 5, kind: 'passive',
      desc: '最大生命+20/级，每秒回复+0.4/级', stat: 'hp', val: 20 },
    pixiu: { id: 'pixiu', name: '貔貅袋', icon: '💰', maxLv: 5, kind: 'passive',
      desc: '获得灵力+15%/级', stat: 'coinMul', val: 0.15 },
    jiutail: { id: 'jiutail', name: '九尾灵符', icon: '🦊', maxLv: 5, kind: 'passive',
      desc: '移动速度+8%/级', stat: 'msMul', val: 0.08 },
    jinwuhe: { id: 'jinwuhe', name: '金乌核', icon: '☀', maxLv: 5, kind: 'passive',
      desc: '每2秒灼烧周围敌人，伤害+9/级', stat: 'burn', val: 9 },
    baize: { id: 'baize', name: '白泽书', icon: '📖', maxLv: 5, kind: 'passive',
      desc: '神兽蛋掉落率+10%/级', stat: 'dropMul', val: 0.10 },
    lingzhu: { id: 'lingzhu', name: '灵珠', icon: '🔮', maxLv: 5, kind: 'passive',
      desc: '拾取范围+45/级', stat: 'magnet', val: 45 }
  };

  /* ---------------- 敌人 ---------------- */
  const ENEMIES = {
    rat: { id: 'rat', name: '暗影鼠', hp: 16, spd: 62, dmg: 7, xp: 1, coin: 1, r: 10, shape: 'quad',
      colors: { body: '#6b5a8a', belly: '#4a3f66', accent: '#3a3254', detail: '#8f7bb8', eye: '#ff3b4e', shade: '#26203c' } },
    fox: { id: 'fox', name: '暗影狐', hp: 26, spd: 80, dmg: 9, xp: 2, coin: 2, r: 10, shape: 'quad',
      colors: { body: '#8a5a94', belly: '#5c3f6b', accent: '#4a2f5c', detail: '#a07ab8', eye: '#ff3b4e', shade: '#331f40' } },
    wolf: { id: 'wolf', name: '暗影狼', hp: 36, spd: 68, dmg: 11, xp: 3, coin: 2, r: 11, shape: 'quad', horns: true,
      colors: { body: '#6a7288', belly: '#4c5468', accent: '#3f4658', detail: '#8f9ab0', eye: '#ff3b4e', shade: '#262c3c' } },
    bat: { id: 'bat', name: '暗影蝠', hp: 18, spd: 92, dmg: 8, xp: 2, coin: 1, r: 10, shape: 'bat', fly: true,
      colors: { body: '#5a4a78', belly: '#423a5c', accent: '#3f3555', detail: '#7a6a9c', eye: '#ff3b4e', shade: '#221c34' } },
    boar: { id: 'boar', name: '暗影獠', hp: 55, spd: 48, dmg: 13, xp: 4, coin: 3, r: 12, shape: 'quad', horns: true, spikes: true,
      colors: { body: '#8a6a4c', belly: '#5f4a36', accent: '#6b5038', detail: '#4a3520', eye: '#ff3b4e', shade: '#33271c' } },
    snake: { id: 'snake', name: '暗影蛇', hp: 28, spd: 74, dmg: 10, xp: 2, coin: 2, r: 10, shape: 'serpent',
      colors: { body: '#7a5a8e', belly: '#543e68', accent: '#3f2e50', detail: '#9a7ab0', eye: '#ff3b4e', shade: '#241a30' } },
    tiger: { id: 'tiger', name: '暗影虎', hp: 80, spd: 60, dmg: 16, xp: 6, coin: 4, r: 13, shape: 'quad', stripe: true, spikes: true,
      colors: { body: '#7a6a58', belly: '#54483c', accent: '#4c4038', detail: '#8f7a5c', eye: '#ff3b4e', shade: '#33291f' } },
    dragon: { id: 'dragon', name: '暗影蛟', hp: 130, spd: 56, dmg: 20, xp: 10, coin: 6, r: 14, shape: 'serpent', horns: true,
      colors: { body: '#8a4a6e', belly: '#5c3550', accent: '#4a2a44', detail: '#a05a8a', eye: '#ff3b4e', shade: '#2a1420' } },
    chaos: { id: 'chaos', name: '混沌残影', hp: 95, spd: 42, dmg: 14, xp: 8, coin: 5, r: 12, shape: 'blob',
      colors: { body: '#3a3a52', belly: '#2a2a3e', accent: '#4a4a66', detail: '#5a5a7a', eye: '#ff3b4e', shade: '#1c1c2c' } }
  };

  /* ---------------- 区域 ---------------- */
  const ZONES = [
    {
      id: 'qiuqiu', name: '青丘之野', desc: '青丘山脚下的灵草平原，狐火点点，是神兽宇宙的第一站。',
      dur: 150, boss: 'fox', bossName: '九尾狐·幻影',
      art: { id: 'jiumei-lingfan', name: '九尾灵幡', icon: '🦊', beast: 'fox', stat: 'xpMul', val: 0.20, desc: '九尾狐赠予的灵幡，经验获取 +20%' },
      pool: ['jintoad', 'fuzhu', 'huodou', 'chongming', 'fox'],
      enemySet: ['rat', 'fox', 'bat'],
      ground: { base: '#3f8f5a', alt: '#4c9e66', patch: '#2e7d4f' }, seed: 7,
      deco: ['tree', 'flower', 'grass', 'rock'], bg: '#1c2a3c'
    },
    {
      id: 'yunmeng', name: '云梦泽', desc: '水天一色的百里大泽，雾气中蛰伏着玄水之灵。',
      dur: 165, boss: 'xuanwu', bossName: '玄武·镇水',
      art: { id: 'zhenshui-yin', name: '玄武镇水印', icon: '🐢', beast: 'xuanwu', stat: 'armor', val: 3, desc: '玄武的镇水宝印，护甲 +3' },
      pool: ['fuzhu', 'tiangou', 'yingzhao', 'xiezhi', 'xuanwu'],
      enemySet: ['fox', 'wolf', 'snake', 'bat'],
      ground: { base: '#2c5a7a', alt: '#3a6e8a', patch: '#1c4a66' }, seed: 21,
      deco: ['grass', 'rock', 'altar', 'flower'], bg: '#16283a'
    },
    {
      id: 'kunlun', name: '昆仑山脉', desc: '万山之祖，云雾缭绕。天门九首在峰顶俯瞰诸神。',
      dur: 180, boss: 'kaiming', bossName: '开明兽·九首',
      art: { id: 'jiushou-jing', name: '天门九首镜', icon: '🪞', beast: 'kaiming', stat: 'critCh', val: 0.08, desc: '开明兽的九首镜，暴击率 +8%' },
      pool: ['yingzhao', 'pixiu', 'luwu', 'baize', 'kaiming'],
      enemySet: ['wolf', 'boar', 'tiger', 'bat'],
      ground: { base: '#5a5e6e', alt: '#6a6e80', patch: '#3f4352' }, seed: 33,
      deco: ['rock', 'tree', 'altar', 'grass'], bg: '#2a2c40'
    },
    {
      id: 'longyuan', name: '不周山·龙渊', desc: '撑天之柱断裂处的深渊，雷云翻滚，龙族蛰伏于渊。',
      dur: 195, boss: 'yinglong', bossName: '应龙·雷翼',
      art: { id: 'leiyi-longzhu', name: '雷翼龙珠', icon: '⚡', beast: 'yinglong', stat: 'atkMul', val: 0.18, desc: '应龙的雷翼龙珠，攻击力 +18%' },
      pool: ['bifang', 'zhulong', 'qinglong', 'yinglong'],
      enemySet: ['snake', 'tiger', 'dragon', 'bat'],
      ground: { base: '#3a2e5c', alt: '#4a3a6e', patch: '#241a40' }, seed: 55,
      deco: ['rock', 'altar', 'bone', 'grass'], bg: '#1a1028'
    },
    {
      id: 'lingshan', name: '灵山秘境', desc: '祥云缭绕的灵山，金乌在扶桑树梢栖息，百兽来朝。',
      dur: 210, boss: 'qilin', bossName: '麒麟·祥瑞',
      art: { id: 'xiangrui-jinyin', name: '祥瑞金印', icon: '✨', beast: 'qilin', stat: 'all', val: 0.12, desc: '麒麟的祥瑞金印，全属性 +12%' },
      pool: ['jinwu', 'baihu', 'zhuque', 'fenghuang', 'qilin'],
      enemySet: ['tiger', 'dragon', 'chaos', 'bat'],
      ground: { base: '#6b8a3f', alt: '#7a9e4c', patch: '#4a6e2c' }, seed: 77,
      deco: ['tree', 'flower', 'altar', 'grass'], bg: '#22301c'
    },
    {
      id: 'danxue', name: '丹穴之丘', desc: '火凤栖息的赤色丘陵，丹水汤汤，百鸟朝凤。',
      dur: 235, boss: 'fenghuang', bossName: '凤凰·浴火',
      art: { id: 'niepan-fengyu', name: '涅槃凤羽', icon: '🔥', beast: 'fenghuang', stat: 'hpMul', val: 0.20, desc: '凤凰的涅槃凤羽，最大生命 +20%' },
      pool: ['bifang', 'jinwu', 'zhuque', 'fenghuang', 'qilin'],
      enemySet: ['boar', 'tiger', 'dragon', 'bat'],
      ground: { base: '#8a4a2c', alt: '#9e5a34', patch: '#66301a' }, seed: 121,
      deco: ['flower', 'tree', 'altar', 'rock'], bg: '#2c1410'
    },
    {
      id: 'penglai', name: '蓬莱仙岛', desc: '海雾中的仙山琼阁，白泽在岛上遍览古今。',
      dur: 250, boss: 'baize', bossName: '白泽·通灵',
      art: { id: 'wanxiang-baizeshu', name: '万象白泽书', icon: '📖', beast: 'baize', stat: 'dropMul', val: 0.20, desc: '白泽的万象书，精英掉落几率 +20%' },
      pool: ['baize', 'pixiu', 'luwu', 'kaiming', 'qilin'],
      enemySet: ['tiger', 'dragon', 'chaos', 'bat'],
      ground: { base: '#2c6a6a', alt: '#3a7e7a', patch: '#1c4e4c' }, seed: 143,
      deco: ['altar', 'tree', 'grass', 'rock'], bg: '#0e2430'
    },
    {
      id: 'yaochi', name: '瑶池仙境', desc: '西王母的瑶池，金乌衔日巡天，彩云铺就仙路。',
      dur: 265, boss: 'jinwu', bossName: '金乌·曜日',
      art: { id: 'yaori-jinwuhe', name: '曜日金乌核', icon: '☀️', beast: 'jinwu', stat: 'burn', val: 8, desc: '金乌的曜日核心，攻击附带灼烧' },
      pool: ['jinwu', 'zhuque', 'fenghuang', 'qinglong', 'kunpeng'],
      enemySet: ['dragon', 'chaos', 'tiger', 'bat'],
      ground: { base: '#5a4a8a', alt: '#6a5a9e', patch: '#3e3266' }, seed: 165,
      deco: ['flower', 'altar', 'tree', 'grass'], bg: '#1c1030'
    },
    {
      id: 'fusang', name: '扶桑神木', desc: '日出之所的神树，烛龙衔烛照亮幽冥与白昼的边界。',
      dur: 280, boss: 'zhulong', bossName: '烛龙·衔烛',
      art: { id: 'xianzhu-mingdeng', name: '衔烛幽冥灯', icon: '🕯️', beast: 'zhulong', stat: 'msMag', val: 0.10, desc: '烛龙的幽冥灯，移速 +10%、拾取半径 +60' },
      pool: ['zhulong', 'yinglong', 'qinglong', 'kunpeng', 'hundun'],
      enemySet: ['chaos', 'dragon', 'tiger', 'bat'],
      ground: { base: '#4a6e3a', alt: '#5a7e48', patch: '#2e4e26' }, seed: 187,
      deco: ['tree', 'bone', 'altar', 'grass'], bg: '#241410'
    },
    {
      id: 'ruoshui', name: '弱水之滨', desc: '鹅毛不浮的弱水，鲲鹏垂天之翼在此翻涌。',
      dur: 295, boss: 'kunpeng', bossName: '鲲鹏·垂天',
      art: { id: 'chuitian-kunpengyi', name: '垂天鲲鹏翼', icon: '🕊️', beast: 'kunpeng', stat: 'msMul', val: 0.15, desc: '鲲鹏的垂天之翼，移动速度 +15%' },
      pool: ['kunpeng', 'hundun', 'yinglong', 'qinglong', 'qilin'],
      enemySet: ['chaos', 'dragon', 'bat', 'tiger'],
      ground: { base: '#3a4a6e', alt: '#4a5a80', patch: '#26344e' }, seed: 209,
      deco: ['rock', 'bone', 'grass', 'altar'], bg: '#0c1226'
    },
    {
      id: 'jiutian', name: '九重天阙', desc: '天界最后的壁垒，青龙布雨，天门巍峨。',
      dur: 310, boss: 'qinglong', bossName: '青龙·布雨',
      art: { id: 'buyu-qinglongzhu', name: '布雨青龙珠', icon: '💧', beast: 'qinglong', stat: 'crit', val: 0.06, desc: '青龙的布雨珠，暴击率 +6%、暴击伤害提升' },
      pool: ['qinglong', 'yinglong', 'kunpeng', 'hundun', 'fenghuang'],
      enemySet: ['dragon', 'chaos', 'tiger', 'bat'],
      ground: { base: '#7a7a9e', alt: '#8a8ab0', patch: '#54547a' }, seed: 231,
      deco: ['altar', 'rock', 'tree', 'grass'], bg: '#1a1430'
    },
    {
      id: 'hundun', name: '归墟·混沌海', desc: '万水归流的尽头，暗影之源栖身之地。终结这一切吧。',
      dur: 225, boss: 'hundun', bossName: '混沌·暗影之源',
      art: { id: 'hundun-chukaishi', name: '混沌初开石', icon: '🌑', beast: 'hundun', stat: 'all', val: 0.18, desc: '混沌的初开之石，全属性 +18%' }, final: true,
      pool: ['kunpeng', 'hundun', 'fenghuang', 'qinglong'],
      enemySet: ['dragon', 'chaos', 'tiger', 'bat'],
      ground: { base: '#2c3a4a', alt: '#3a4a5c', patch: '#1c2a38' }, seed: 99,
      deco: ['altar', 'bone', 'rock', 'grass'], bg: '#0e1420'
    }
  ];

  /* ---------------- 每章通关剧情对话 ---------------- */
  const ZONE_STORY = {
    qiuqiu: '小泽蹭了蹭你的指尖：「青丘的狐火熄灭了。九尾狐大人其实是守护者，它留下的灵幡，就当是谢礼吧。」你收下九尾灵幡，灵脉更加清澈。',
    yunmeng: '云梦泽的雾气缓缓散开，老龟玄武沉入水中：「能走到这里，你已有镇水之姿。这块镇水印，替我守着泽脉。」',
    kunlun: '九首齐鸣，天门轰然洞开：「昆仑众神点头了。九首镜照见你心无杂念，带它去更高处吧。」',
    longyuan: '雷云散去，应龙收拢巨翼：「龙渊的封印补全了。雷翼龙珠认你为主，愿你如雷般破开一切暗影。」',
    lingshan: '瑞兽踏光而来，低头将金印放在你掌心：「灵山万灵皆安。此印乃祥瑞所聚，随你行善。」',
    danxue: '凤凰在烈火中重生，衔来一片金羽：「丹穴的丹火不再暴虐。涅槃凤羽，赠予浴火而不灭之人。」',
    penglai: '白泽翻开万卷书卷：「蓬莱的秘密写尽古今。此书予你，愿你知万物、明是非。」',
    yaochi: '金乌振翅，日光洒落瑶池：「曜日金乌核蕴含炽阳之力，用它点亮前路吧。」',
    fusang: '烛龙睁开双目，昼夜随之交替：「幽冥与白昼本是同源。衔烛灯为你照亮暗处，慎用之。」',
    ruoshui: '鲲鹏化为大鹏扶摇直上：「弱水不浮一羽，却能托起垂天之翼。鲲鹏翼赠你，乘风破浪。」',
    jiutian: '青龙盘旋九天，甘霖洒落：「天门之上再无遮拦。青龙珠随你化雨，润泽万物。」',
    hundun: '混沌散去，暗影之源重归宁静。一块混沌初开石落入手心，仿佛记载着宇宙最初的呼吸：「智慧神兽宇宙，重归清明。」'
  };

  /* ---------------- 传统文化神兽诗词（背景诗词雨素材） ---------------- */
  const POEMS = [
    '麟凤龟龙 谓之四灵',
    '凤凰鸣矣 于彼高冈',
    '凤凰于飞 翙翙其羽',
    '青龙蜿蜒 白虎蹲踞',
    '玄武伏波 朱雀衔火',
    '麒麟踏祥云 百兽来朝',
    '大鹏一日同风起 扶摇直上九万里',
    '神龟虽寿 犹有竟时',
    '灵蛇衔珠 以报隋侯',
    '玄鹤鸣九皋 声闻于天',
    '赤龙行雨 泽被苍生',
    '天马行空 独往独来',
    '鹿鸣呦呦 食野之苹',
    '猛虎啸谷 百兽震惶',
    '燕雀安知鸿鹄之志',
    '山不在高 有仙则名',
    '水不在深 有龙则灵',
    '腾蛟起凤 紫电青霜',
    '龙腾虎跃 万象更新',
    '凤栖梧桐 龙潜深渊',
    '九霄龙吟 风云变色',
    '白泽通灵 驱邪避祟'
  ];

  /* ---------------- 剧情 ---------------- */
  const STORY = [
    '【序章】多米你可公司 · 智慧神兽宇宙计划',
    '多米你可公司——全球顶尖的"智慧神兽"研究企业。公司打造的"星图罗盘"可以扫描古籍中的神兽能量，',
    '而"智慧中国神兽宇宙"正是公司倾尽十年的宏伟蓝图：一个神兽与人类共生的数字生态世界。',
    '',
    '今天是"星图罗盘"首次全功率启动的日子。作为新入职的实习研究员，你（阿灵）负责监测罗盘的运行数据。',
    '突然，罗盘核心剧烈震颤——古籍中沉睡的上古神兽能量被意外唤醒，一道金光将你卷入其中！',
    '',
    '等你睁开眼，你已身处一片灵草摇曳的原野。这里……就是神兽宇宙。',
    '一只巴掌大的白色幼兽正歪头看着你，头顶的角泛着微光——这是通晓万灵的白泽幼崽"小泽"。',
    '"你身上有星图罗盘的气息，"小泽说，"你是来帮我们的吗？',
    '暗影兽潮正在侵蚀神兽的家园，连混沌之灵都被污染了。只有收集、培养神兽，才能净化这一切。"',
    '',
    '于是，你的旅程开始了——',
    '收集散落各地的神兽蛋，培养神兽伙伴，穿越重重秘境，直面暗影之源。',
    '让华夏神兽的灵光，重新照亮这片宇宙。'
  ];

  /* ---------------- 星图罗盘·抽卡配置 ---------------- */
  const GACHA = {
    name: '星图罗盘',
    singleCost: 30, tenCost: 270,
    rates: { 1: 40, 2: 28, 3: 18, 4: 10, 5: 4 },
    pityRare: 10,  // 保底：最多 10 抽必出珍品及以上
    pityMyth: 60   // 保底：最多 60 抽必出神话
  };

  /* ---------------- 神器（id -> 定义，按秘境关联） ---------------- */
  const ARTIFACTS = {};
  ZONES.forEach(z => { if (z.art) ARTIFACTS[z.art.id] = z.art; });

  return {
    RARITY_NAME, RARITY_COLOR, ELEMENT_COLOR, GACHA,
    BEASTS, WEAPONS, PASSIVES, ENEMIES, ZONES, STORY, POEMS, ZONE_STORY, ARTIFACTS
  };
})();
