#!/usr/bin/env python3
"""
生成 RPGLife 全套像素图标（「盾牌 + 对勾」）。
在 32x32 网格上手绘，最近邻放大保持锐利块状像素，写入 ../assets/。

用法： python3 scripts/gen-icon.py   （需 Pillow： pip install pillow）
产物： icon.png / android-icon-foreground.png / android-icon-background.png
       / android-icon-monochrome.png / splash-icon.png / favicon.png
"""
import os
from PIL import Image

G = 32
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')

C = {
    'bg':   (26, 28, 44, 255), 'bg2': (34, 37, 60, 255), 'fr': (13, 14, 26, 255),
    'gold': (247, 201, 72, 255), 'goldL': (255, 226, 140, 255), 'goldD': (196, 150, 40, 255),
    'green': (106, 190, 48, 255), 'greenL': (158, 232, 104, 255),
    'sky': (74, 124, 205, 255), 'skyD': (44, 74, 140, 255), 'skyL': (120, 165, 230, 255),
    'T': (0, 0, 0, 0),
}

def blank(transparent=False):
    f = C['T'] if transparent else C['bg']
    return [[f for _ in range(G)] for _ in range(G)]

def col(c): return C[c] if isinstance(c, str) else c
def px(g, x, y, c):
    if 0 <= x < G and 0 <= y < G: g[y][x] = col(c)
def rect(g, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(g, x, y, c)

def add_frame(g):
    rect(g, 0, 0, G - 1, G - 1, 'bg')
    rect(g, 3, 3, G - 4, G - 4, 'bg2')
    for i in range(G):
        for j in (0, 1):
            px(g, i, j, 'fr'); px(g, i, G - 1 - j, 'fr'); px(g, j, i, 'fr'); px(g, G - 1 - j, i, 'fr')
    for i in range(2, G - 2):
        px(g, i, 2, 'goldD'); px(g, i, G - 3, 'goldD'); px(g, 2, i, 'goldD'); px(g, G - 3, i, 'goldD')

def shield_edges():
    top, left, right, straight, tip = 6, 8, 23, 16, 28
    E = {}
    for y in range(top, tip + 1):
        if y <= straight:
            l, r = left, right
        else:
            t = (y - straight) / (tip - straight)
            l = round(left + (16 - left) * t); r = round(right - (right - 15) * t)
        E[y] = (l, r)
    E[top] = (left + 1, right - 1)
    return E, top, tip

def draw_shield(g, mono=False):
    E, top, tip = shield_edges()
    for y in range(top, tip + 1):
        l, r = E[y]
        for x in range(l, r + 1):
            px(g, x, y, (255, 255, 255, 255) if mono else ('sky' if y <= 15 else 'skyD'))
    if not mono:
        for y in range(top + 1, 23):
            px(g, E[y][0] + 1, y, 'skyL')
        for y in range(top, tip + 1):
            l, r = E[y]; px(g, l, y, 'gold'); px(g, r, y, 'gold')
        for x in range(E[top][0], E[top][1] + 1): px(g, x, top, 'gold')
        px(g, 15, tip, 'gold'); px(g, 16, tip, 'gold'); px(g, 15, tip - 1, 'goldL'); px(g, 16, tip - 1, 'goldL')
        for sx in (11, 16, 20): px(g, sx, top + 1, 'goldL')
    chk = [(11,15),(12,16),(13,17),(14,16),(15,15),(16,14),(17,13),(18,12),(19,11),(20,10),(21,9)]
    for (x, y) in chk:
        if mono:
            px(g, x, y, C['T']); px(g, x, y + 1, C['T'])
        else:
            px(g, x, y + 1, 'green'); px(g, x, y, 'greenL'); px(g, x, y + 2, 'fr')
    return g

def to_img(g):
    im = Image.new('RGBA', (G, G))
    for y in range(G):
        for x in range(G): im.putpixel((x, y), g[y][x])
    return im

def up(im, n): return im.resize((G * n, G * n), Image.NEAREST)

def centered(shield_img, frac):
    s = int(1024 * frac) // G * G
    big = shield_img.resize((s, s), Image.NEAREST)
    cv = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    cv.paste(big, ((1024 - s) // 2, (1024 - s) // 2), big)
    return cv

def main():
    g = blank(); add_frame(g); draw_shield(g); up(to_img(g), 32).save(f'{OUT}/icon.png')
    g = blank(True); draw_shield(g); centered(to_img(g), 0.66).save(f'{OUT}/android-icon-foreground.png')
    Image.new('RGBA', (1024, 1024), C['bg']).save(f'{OUT}/android-icon-background.png')
    g = blank(True); draw_shield(g, mono=True); centered(to_img(g), 0.66).save(f'{OUT}/android-icon-monochrome.png')
    g = blank(True); draw_shield(g); centered(to_img(g), 0.72).save(f'{OUT}/splash-icon.png')
    g = blank(); add_frame(g); draw_shield(g); up(to_img(g), 32).resize((64, 64), Image.NEAREST).save(f'{OUT}/favicon.png')
    print('icons written to', os.path.normpath(OUT))

if __name__ == '__main__':
    main()
