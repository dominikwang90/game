// -*- coding: utf-8 -*-
// 神兽像素网格导出工具：用 Playwright + Edge 打开游戏，抓取 24 只神兽的 2x 像素网格。
// 依赖：npm i playwright；使用系统 Edge（channel: msedge）。
// 运行：node svg/export_beast_grids.mjs
// 输出：svg/_grids/<id>.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, '_grids');
const url = 'file:///' + join(root, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ channel: 'msedge' });
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const grids = await page.evaluate(() => {
    const out = {};
    for (const id of Object.keys(DATA.BEASTS)) {
      const spr = SP.buildBeast(DATA.BEASTS[id], 0);
      const cv = SP.spriteCanvas(spr, 2);
      const big = document.createElement('canvas');
      big.width = 64; big.height = 64;
      const ctx = big.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.floor((64 - cv.width) / 2), Math.floor((64 - cv.height) / 2));
      const img = ctx.getImageData(0, 0, 64, 64).data;
      const g = [];
      for (let y = 0; y < 64; y++) {
        const row = [];
        for (let x = 0; x < 64; x++) {
          const i = (y * 64 + x) * 4;
          row.push(img[i + 3] === 0 ? null : '#' + [0,1,2].map(k => img[i+k].toString(16).padStart(2, '0')).join(''));
        }
        g.push(row);
      }
      out[id] = { name: DATA.BEASTS[id].name, rarity: DATA.BEASTS[id].rarity, w: cv.width, h: cv.height, grid: g };
    }
    return out;
  });
  mkdirSync(outDir, { recursive: true });
  for (const [id, data] of Object.entries(grids)) writeFileSync(join(outDir, id + '.json'), JSON.stringify(data));
  console.log('exported', Object.keys(grids).length, 'beasts ->', outDir);
} finally {
  await browser.close();
}
