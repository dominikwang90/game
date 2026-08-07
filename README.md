# 神兽纪元 · 智慧神兽宇宙

HTML5 像素风「神兽收集 + 割草战斗」游戏。以《山海经》等典籍中的 24 只神兽为角色，融合养成、抽卡、图鉴、区域探索与 BOSS 战玩法。

## 玩法

- **割草战斗**：俯视角像素割草（Vampire Survivors 式），可携带神兽伙伴出战
- **神兽收集**：24 只神兽，稀有度分为凡品 / 良品 / 珍品 / 圣品 / 神话
- **抽卡召唤**：消耗灵力进行单抽 / 十连召唤神兽
- **图鉴收集**：查看神兽属性、技能、进化路线
- **区域探索**：多个区域地图推进，含 BOSS 战
- **小游戏**：内置迷你玩法（如聚宝金雨等神兽技能演出）
- **本地存档**：进度自动保存到浏览器 localStorage

## 神兽一览

| id | 神兽 | 稀有度 |
|---|---|---|
| baihu | 白虎 | 圣品 |
| baize | 白泽 | 珍品 |
| bifang | 毕方 | 良品 |
| chongming | 重明鸟 | 凡品 |
| fenghuang | 凤凰 | 圣品 |
| fox | 九尾狐 | 珍品 |
| fuzhu | 夫诸 | 凡品 |
| hundun | 混沌 | 神话 |
| huodou | 祸斗 | 凡品 |
| jintoad | 三足金蟾 | 凡品 |
| jinwu | 金乌 | 珍品 |
| kaiming | 开明兽 | 圣品 |
| kunpeng | 鲲鹏 | 神话 |
| luwu | 陆吾 | 珍品 |
| pixiu | 貔貅 | 珍品 |
| qilin | 麒麟 | 神话 |
| qinglong | 青龙 | 神话 |
| tiangou | 天狗 | 良品 |
| xiezhi | 獬豸 | 良品 |
| xuanwu | 玄武 | 圣品 |
| yinglong | 应龙 | 神话 |
| yingzhao | 英招 | 良品 |
| zhulong | 烛龙 | 神话 |
| zhuque | 朱雀 | 圣品 |

## 运行方式

无需构建，直接打开 `index.html` 即可游玩；或启动本地静态服务器：

```bash
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

## 项目结构

```
index.html        游戏入口
css/style.css     样式
js/
  main.js         启动与画布缩放
  data.js         神兽 / 武器 / 敌人 / 区域数据
  engine.js       游戏引擎（战斗 / 状态机 / 存档）
  ui.js           界面
  sprites.js      程序化像素精灵渲染
  minigames.js    小游戏
assets/           神兽 PNG 与 IP 像素图
svg/              神兽 SVG 矢量素材与生成脚本
qa/               版本测试截图
```

## 技术说明

- 纯原生 JavaScript，无第三方依赖，单页 Canvas 渲染（内部 480×270 放大显示）
- 神兽立绘为程序化像素生成，可导出为 SVG 矢量素材（见 `svg/beasts/README.md`）