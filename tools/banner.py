"""Draw the README cover (docs/banner.png) and a GitHub social preview (docs/social.png).

Run from the repo root (needs Pillow): python3 tools/banner.py
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprites import FRAMES, PALETTE  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD, GOLD_DARK, LAV = (245, 197, 66), (150, 96, 20), (200, 184, 255)

GLYPHS = {
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    'C': ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
}


def sky(w, h, seed, keep_clear=()):
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=(int(0x0d + 0x1d * t), int(0x06 + 0x0c * t), int(0x20 + 0x35 * t)))
    rnd = random.Random(seed)
    px = 6
    for _ in range(w * h // 2600):
        x, y = rnd.randrange(0, w, px), rnd.randrange(0, h, px)
        if any(a - 12 <= x <= c + 12 and b - 12 <= y <= e + 12 for a, b, c, e in keep_clear):
            continue
        c = rnd.choice([(255, 232, 154), (244, 240, 255), (183, 155, 255)])
        d.rectangle([x, y, x + px - 1, y + px - 1], fill=c)
        if rnd.random() < 0.12:  # a few four-point sparkles
            for dx, dy in [(-px, 0), (px, 0), (0, -px), (0, px)]:
                d.rectangle([x + dx, y + dy, x + dx + px - 1, y + dy + px - 1], fill=c)
    return img


def moon(d, x, y, s):
    for dx, dy in [(1, 0), (2, 0), (0, 1), (0, 2), (0, 3), (1, 4), (2, 4), (1, 1), (1, 3)]:
        c = GOLD if dx == 0 else (255, 232, 154)
        d.rectangle([x + dx * s, y + dy * s, x + dx * s + s - 1, y + dy * s + s - 1], fill=c)


def title(d, x, y, word, s):
    for i, ch in enumerate(word):
        for r, row in enumerate(GLYPHS[ch]):
            for c, on in enumerate(row):
                if on == '#':
                    X, Y = x + (i * 6 + c) * s, y + r * s
                    d.rectangle([X + s // 3, Y + s // 3, X + s - 1 + s // 3, Y + s - 1 + s // 3], fill=GOLD_DARK)
                    d.rectangle([X, Y, X + s - 1, Y + s - 1], fill=GOLD)


def ricky(img, x, y, s, frame='idle'):
    d = ImageDraw.Draw(img)
    for r, row in enumerate(FRAMES[frame]):
        for c, ch in enumerate(row):
            col = PALETTE[ch]
            if col:
                d.rectangle([x + c * s, y + r * s, x + c * s + s - 1, y + r * s + s - 1], fill=col)
    # stardust under the wings
    rnd = random.Random(7)
    for k in range(14):
        a = math.pi * (0.15 + 0.7 * rnd.random())
        dist = 32 * s * 0.55 + rnd.random() * s * 10
        X = x + 16 * s + math.cos(a) * dist * (1 if k % 2 else -1)
        Y = y + 26 * s + math.sin(a) * dist * 0.5
        c = GOLD if k % 3 else (184, 244, 255)
        d.rectangle([X, Y, X + s - 1, Y + s - 1], fill=c)


def font(size, bold=False):
    return ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', size, index=1 if bold else 0)


def draw(w, h, path, seed):
    s = 16 if h < 500 else 20
    tx, ty = int(w * 0.08), int(h * 0.26)
    text_box = (tx, ty, tx + 30 * s * 1.25, ty + 7 * s + 34 + int(s * 3.1) + int(s * 1.6))
    img = sky(w, h, seed, [text_box])
    d = ImageDraw.Draw(img)
    moon(d, w - 150, 50, 14)
    title(d, tx, ty, 'RICKY', s)
    sub_y = ty + 7 * s + 34
    d.text((tx, sub_y), 'PIXEL MOD', font=font(int(s * 2.1), True), fill=LAV)
    d.text((tx, sub_y + int(s * 3.1)), 'a pixel cat companion for Claude Code', font=font(int(s * 1.35)), fill=(244, 240, 255))
    cat = 8 if h < 500 else 11
    ricky(img, int(w * 0.70) - 16 * cat // 2, (h - 32 * cat) // 2 + 6, cat)
    img.save(path, optimize=True)
    print('wrote', path, img.size)


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'docs'), exist_ok=True)
    draw(1280, 420, os.path.join(ROOT, 'docs', 'banner.png'), 3)
    draw(1280, 640, os.path.join(ROOT, 'docs', 'social.png'), 5)
