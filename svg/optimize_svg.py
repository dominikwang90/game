# -*- coding: utf-8 -*-
"""神兽纪元 IP 像素画 SVG 优化工具（幂等，可重复执行）。
读取 svg/ip-pixelart-64x64.svg（矩形或 path 栅格导出），输出：
  1) svg/ip-pixelart-64x64.svg —— 优化矢量文件（保留背景，渲染逐像素一致）
  2) assets/ip/ip-pixelart.svg —— 透明背景版（游戏界面素材）
  3) assets/ip/ip-pixelart-{64,128,256,512}.png —— 位图导出
依赖：Python 3.8+（PNG 导出需要 Pillow）
"""
import os
import re
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSET = os.path.join(os.path.dirname(ROOT), 'assets', 'ip')
SRC = os.path.join(ROOT, 'ip-pixelart-64x64.svg')
TITLE = '神兽纪元 IP 像素画'
BG = '#fef9f2'

def parse_grid(text):
    """支持两种输入格式，返回 64x64 颜色网格（None=透明/背景）。"""
    g = [[None] * 64 for _ in range(64)]
    rects = re.findall(r'<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)" fill="(#[0-9a-fA-F]{6})"/>', text)
    for x, y, w, h, c in rects:
        for yy in range(int(y), int(y) + int(h)):
            for xx in range(int(x), int(x) + int(w)):
                g[yy][xx] = c
    for m in re.finditer(r'<g fill="(#[0-9a-fA-F]{6})"><path d="([^"]+)"/>', text):
        c = m.group(1)
        for sub in re.finditer(r'M(-?\d+) (-?\d+)h(\d+)v(\d+)h-\3z', m.group(2)):
            x, y, w, h = int(sub.group(1)), int(sub.group(2)), int(sub.group(3)), int(sub.group(4))
            for yy in range(y, y + h):
                for xx in range(x, x + w):
                    g[yy][xx] = c
    return g

def grid_to_runs(g):
    """水平 run + 垂直合并，得到 (x,y,w,h,c) 列表。"""
    horiz = []
    for y in range(64):
        x = 0
        while x < 64:
            c = g[y][x]
            if c is None:
                x += 1
                continue
            x2 = x
            while x2 < 64 and g[y][x2] == c:
                x2 += 1
            horiz.append((x, y, x2 - x, c))
            x = x2
    cols = defaultdict(list)
    for x, y, w, c in horiz:
        cols[(c, x, w)].append(y)
    out = []
    for (c, x, w), ys in cols.items():
        ys.sort()
        cy, ch = ys[0], 1
        for y in ys[1:]:
            if y == cy + ch:
                ch += 1
            else:
                out.append((x, cy, w, ch, c))
                cy, ch = y, 1
        out.append((x, cy, w, ch, c))
    return out

def to_svg(runs, keep_bg):
    by_color = defaultdict(list)
    for x, y, w, h, c in runs:
        by_color[c].append((x, y, w, h))
    groups = []
    for c in sorted(by_color):
        d = []
        for x, y, w, h in by_color[c]:
            d.append('M%d %dh%dv%dh-%dz' % (x, y, w, h, w))
        groups.append('<g fill="%s"><path d="%s"/></g>' % (c, ' '.join(d)))
    bg = '<rect width="64" height="64" fill="%s"/>' % BG if keep_bg else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" '
            'shape-rendering="crispEdges" xml:space="preserve">'
            '<title>%s</title><desc>IP 像素画矢量导出（64x64 格，优化后 %d 个矩形）</desc>%s%s</svg>'
            % (TITLE, len(runs), bg, ''.join(groups)))

def export_pngs(g):
    try:
        from PIL import Image
    except ImportError:
        print('  跳过 PNG 导出：未安装 Pillow')
        return
    for size in (64, 128, 256, 512):
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        px = img.load()
        step = size // 64
        for y in range(64):
            for x in range(64):
                c = g[y][x]
                if c is None:
                    continue
                col = tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
                for yy in range(y * step, (y + 1) * step):
                    for xx in range(x * step, (x + 1) * step):
                        px[xx, yy] = col
        out = os.path.join(ASSET, 'ip-pixelart-%d.png' % size)
        img.save(out)
        print('  written %s (%d bytes)' % (os.path.basename(out), os.path.getsize(out)))

def main():
    text = open(SRC, encoding='utf-8').read()
    grid = parse_grid(text)
    filled = sum(1 for row in grid for v in row if v)
    assert filled > 1000, '解析出的像素过少，输入格式异常'
    runs = [r for r in grid_to_runs(grid) if r[4] != BG]

    open(SRC, 'w', encoding='utf-8').write(to_svg(runs, keep_bg=True))
    print('written svg/ip-pixelart-64x64.svg (%d bytes, %d runs)' % (os.path.getsize(SRC), len(runs)))

    os.makedirs(ASSET, exist_ok=True)
    open(os.path.join(ASSET, 'ip-pixelart.svg'), 'w', encoding='utf-8').write(to_svg(runs, keep_bg=False))
    print('written assets/ip/ip-pixelart.svg')
    export_pngs(grid)

if __name__ == '__main__':
    main()
