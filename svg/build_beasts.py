# -*- coding: utf-8 -*-
"""从浏览器导出的像素网格构建 24 只神兽的实心像素矢量素材。
输入：svg/_grids/<id>.json（由 export_beast_grids.mjs / Playwright 生成）
输出：
  svg/beasts/<id>.svg             —— 实心像素矢量（米色背景 + 按色分组 path）
  assets/beasts/<id>-64.png       —— 64px 位图
  assets/beasts/<id>-256.png      —— 256px 位图
  svg/beasts/README.md            —— 素材索引
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from optimize_svg import grid_to_runs, to_svg, BG

ROOT = os.path.dirname(os.path.abspath(__file__))
GRIDS = os.path.join(ROOT, '_grids')
OUT_SVG = os.path.join(ROOT, 'beasts')
OUT_PNG = os.path.join(os.path.dirname(ROOT), 'assets', 'beasts')

RARITY_NAME = {1: '凡品', 2: '良品', 3: '珍品', 4: '圣品', 5: '神话'}

def fill_bg(grid):
    """None -> 米色背景，得到实心图像。"""
    return [[BG if v is None else v for v in row] for row in grid]

def export_png(grid, size, path):
    from PIL import Image
    img = Image.new('RGB', (size, size), BG)
    px = img.load()
    step = size // 64
    for y in range(64):
        for x in range(64):
            c = grid[y][x]
            col = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))
            for yy in range(y * step, (y + 1) * step):
                for xx in range(x * step, (x + 1) * step):
                    px[xx, yy] = col
    img.save(path)

def main():
    os.makedirs(OUT_SVG, exist_ok=True)
    os.makedirs(OUT_PNG, exist_ok=True)
    rows = []
    total_bytes = 0
    for fn in sorted(os.listdir(GRIDS)):
        if not fn.endswith('.json'):
            continue
        bid = fn[:-5]
        data = json.load(open(os.path.join(GRIDS, fn), encoding='utf-8'))
        grid = fill_bg(data['grid'])
        runs = [r for r in grid_to_runs(grid) if r[4] != BG]
        svg = to_svg(runs, keep_bg=True)
        svg_path = os.path.join(OUT_SVG, bid + '.svg')
        open(svg_path, 'w', encoding='utf-8').write(svg)
        for size in (64, 256):
            export_png(grid, size, os.path.join(OUT_PNG, '%s-%d.png' % (bid, size)))
        b = os.path.getsize(svg_path)
        total_bytes += b
        rows.append((bid, data['name'], RARITY_NAME.get(data['rarity'], ''), b))
        print('%-10s %-6s %-4s %5d bytes' % (bid, data['name'], RARITY_NAME.get(data['rarity'], ''), b))
    # README 索引
    lines = ['# 神兽像素矢量素材', '',
             '由游戏内置神兽生成器渲染并转换为实心像素矢量（64×64，米色背景 #fef9f2，按色分组 path 压缩）。',
             '重新生成：`python svg/export_beast_grids.mjs` 需 Playwright + Edge，然后 `python svg/build_beasts.py`。', '',
             '| id | 神兽 | 稀有度 | SVG 体积 |', '|---|---|---|---|']
    for bid, name, rk, b in rows:
        lines.append('| %s | %s | %s | %.1f KB |' % (bid, name, rk, b / 1024))
    lines.append('')
    lines.append('共 %d 只，合计 %.1f KB' % (len(rows), total_bytes / 1024))
    open(os.path.join(OUT_SVG, 'README.md'), 'w', encoding='utf-8').write('\n'.join(lines))
    print('total:', total_bytes, 'bytes; index written')

if __name__ == '__main__':
    main()
