"""Ricky's pixel sprites: the source of truth for hooks/sprites.ts.

Each frame is drawn as the LEFT half and mirrored, then the asymmetric
details (moon tail, forehead star) are overlaid.
  32x32 frames: the side pane.
  24x24, 16x16 and 8x6 frames: the band above the prompt, by the room it has.

Run (needs Pillow): python3 tools/sprites.py
  -> hooks/sprites.ts, docs/frames-32.png, docs/frames-24.png
"""
import json
import os
import sys

from PIL import Image

PALETTE = {
    '.': None,           # transparent
    'K': (0x2a, 0x16, 0x50),  # outline
    'D': (0x5b, 0x36, 0xb8),  # purple shade
    'P': (0x8a, 0x5c, 0xf0),  # purple main
    'L': (0xb7, 0x9b, 0xff),  # purple light
    'E': (0xe0, 0x7b, 0xff),  # inner ear
    'W': (0xf4, 0xf0, 0xff),  # white fur
    'w': (0xcf, 0xc6, 0xec),  # white shade
    'G': (0xf5, 0xc5, 0x42),  # gold
    'Y': (0xff, 0xe8, 0x9a),  # gold highlight
    'B': (0x1e, 0x1a, 0x4a),  # eye dark
    'b': (0x4a, 0x5c, 0xc8),  # eye blue
    'C': (0xb8, 0xf4, 0xff),  # wing light
    'c': (0x6f, 0xd3, 0xf0),  # wing deep
    'M': (0x3a, 0x20, 0x50),  # mouth
}

W, H = 32, 32

# ---- left halves -----------------------------------------------------------
HEAD_TOP = [
    "................",  # 0
    "................",  # 1
    "......K.........",  # 2
    ".....KEK........",  # 3
    ".....KEPK.......",  # 4
    "....KEEPK.......",  # 5
    "....KEEPPK......",  # 6
    "...KEEEPPPKKKKKK",  # 7
    "...KEEPPPPPPPPPP",  # 8
    "..KPPPPPPPPPPPPP",  # 9
    "..KPPPPPPPPPPPPP",  # 10
]

EYES_OPEN = [
    ".KPLPPPBBBPPPPPP",  # 11
    ".KPLPPBBBBBPPPPP",  # 12
    ".KPLPBWWBBBBPPPP",  # 13
    ".KPPPBWWBBBBPPPP",  # 14
    ".KPPPBBBBWBBPPPP",  # 15
    ".KPPPBbbbbbBPPPW",  # 16
    ".KPPPPBbbbBPPWWW",  # 17
]
EYES_CLOSED = [
    ".KPLPPPPPPPPPPPP",
    ".KPLPPPPPPPPPPPP",
    ".KPLPPPPPPPPPPPP",
    ".KPPPPPPPPPPPPPP",
    ".KPPPBPPPPPBPPPP",
    ".KPPPPBBBBBPPPPW",
    ".KPPPPPPPPPPPWWW",
]
EYES_HAPPY = [
    ".KPLPPPPPPPPPPPP",
    ".KPLPPPPPPPPPPPP",
    ".KPLPPPPBPPPPPPP",
    ".KPPPPPBPBPPPPPP",
    ".KPPPPBPPPBPPPPP",
    ".KPPPBPPPPPBPPPW",
    ".KPPPPPPPPPPPWWW",
]
EYES_SHOCK = [
    ".KPLPPPBBBPPPPPP",
    ".KPLPPBWWWBPPPPP",
    ".KPLPBWWWWWBPPPP",
    ".KPPPBWWBWWBPPPP",
    ".KPPPBWWWWWBPPPP",
    ".KPPPPBWWWBPPPPW",
    ".KPPPPPBBBPPPWWW",
]

MOUTH_SMILE = [
    ".KPEEPPPPPPPWWWW",  # 18
    "..KPPPPPPPWWWMWM",  # 19
    "..KPPPPPPWWWWWMW",  # 20
    "...KPPPPWWWWWWWW",  # 21
    "....KKPPWWWWWWWW",  # 22
]
MOUTH_OPEN = [
    ".KPEEPPPPPPPWWWW",
    "..KPPPPPPPWWWWMM",
    "..KPPPPPPWWWWWME",
    "...KPPPPWWWWWWMM",
    "....KKPPWWWWWWWW",
]

BODY = [
    "......KKPPWWWWWW",  # 23
    ".......KPPPwWWWW",  # 24
    ".......KPPPPwWWW",  # 25
    ".......KPPPPPPPP",  # 26
    ".......KDPPPPPPP",  # 27
    ".......KDDPPKDPP",  # 28
    "........KWWKKWWK",  # 29
    ".........KK..KK.",  # 30
    "................",  # 31
]

WINGS_UP = {
    18: "c...............",
    19: "Cc..............",
    20: "CCc.............",
    21: "CCCc............",
    22: "cCCCc...........",
    23: ".cCCCc..........",
    24: "..cCCc..........",
    25: "...cc...........",
}
WINGS_DOWN = {
    22: "....c...........",
    23: "...cCc..........",
    24: "..cCCCc.........",
    25: ".cCCCCc.........",
    26: "cCCCCc..........",
    27: "CCCc............",
    28: "Cc..............",
    29: "c...............",
}


def mirror(left):
    return left + left[::-1]


def build(eyes, mouth, wings, star_bright=False, fang=True):
    rows = HEAD_TOP + eyes + mouth + BODY
    assert len(rows) == H, len(rows)
    for r in rows:
        assert len(r) == 16, (r, len(r))
    grid = [list(mirror(r)) for r in rows]

    # wings: only paint on transparent pixels
    for r, line in wings.items():
        full = mirror(line)
        for c, ch in enumerate(full):
            if ch != '.' and grid[r][c] == '.':
                grid[r][c] = ch

    # forehead four-point star
    g, y = ('Y', 'W') if star_bright else ('G', 'Y')
    star = [(7, 15, g), (7, 16, g), (8, 15, g), (8, 16, g),
            (9, 14, g), (9, 15, y), (9, 16, y), (9, 17, g),
            (10, 12, g), (10, 13, g), (10, 14, g), (10, 15, y), (10, 16, y), (10, 17, g), (10, 18, g), (10, 19, g),
            (11, 14, g), (11, 15, y), (11, 16, y), (11, 17, g),
            (12, 15, g), (12, 16, g)]
    for (r, c, ch) in star:
        grid[r][c] = ch
    if star_bright:
        for (r, c) in [(4, 15), (4, 16), (3, 15), (5, 16), (8, 11), (8, 20)]:
            grid[r][c] = 'Y'

    # tail from behind the head up to a gold crescent moon, top-left
    for (r, c, ch) in [(6, 2, 'D'), (5, 2, 'D'),
                       (0, 1, 'G'), (0, 2, 'G'), (1, 0, 'G'), (1, 1, 'Y'),
                       (2, 0, 'G'), (3, 0, 'G'), (3, 1, 'Y'), (4, 1, 'G'), (4, 2, 'G')]:
        if grid[r][c] == '.':
            grid[r][c] = ch
    return [''.join(r) for r in grid]


FRAMES = {
    'idle':   build(EYES_OPEN, MOUTH_SMILE, WINGS_UP),
    'idle2':  build(EYES_OPEN, MOUTH_SMILE, WINGS_DOWN),
    'blink':  build(EYES_CLOSED, MOUTH_SMILE, WINGS_UP),
    'think':  build(EYES_CLOSED, MOUTH_SMILE, WINGS_UP, star_bright=True),
    'think2': build(EYES_CLOSED, MOUTH_SMILE, WINGS_DOWN, star_bright=False),
    'happy':  build(EYES_HAPPY, MOUTH_OPEN, WINGS_UP),
    'happy2': build(EYES_HAPPY, MOUTH_OPEN, WINGS_DOWN),
    'shock':  build(EYES_SHOCK, MOUTH_OPEN, WINGS_UP),
}


# ---- 24x24 (band) -----------------------------------------------------------
S24_TOP = [
    "............",  # 0
    "....K.......",  # 1
    "...KEK......",  # 2
    "...KEPK.....",  # 3
    "..KEEPK.....",  # 4
    "..KEEPPKKKKK",  # 5
    ".KEEPPPPPPPG",  # 6
    ".KPPPPPPPPPY",  # 7
    "KPLPPPPPPGGY",  # 8
]
S24_EYES = {  # rows 9-13
    'open':  ["KPLPPBBBPPPG", "KPLPBWWBBPPP", "KPPPBWBBBPPP", "KPPPBbbbBPPW", "KPEEPBBBPPWW"],
    'shut':  ["KPLPPPPPPPPG", "KPLPBPPPBPPP", "KPPPPBBBPPPP", "KPPPPPPPPPPW", "KPEEPPPPPPWW"],
    'happy': ["KPLPPPPPPPPG", "KPLPPPBPPPPP", "KPPPPBPBPPPP", "KPPPBPPPBPPW", "KPEEPPPPPPWW"],
    'shock': ["KPLPPBBBPPPG", "KPLPBWWWBPPP", "KPPPBWBWBPPP", "KPPPBWWWBPPW", "KPEEPBBBPPWW"],
}
S24_MOUTH = {  # rows 14-15
    'smile': [".KPPPPPPWWMW", ".KPPPPPWWWWM"],
    'open':  [".KPPPPPPWWMM", ".KPPPPPWWWWE"],
}
S24_BODY = [
    "..KPPPWWWWWW",  # 16
    "...KKPPWWWWW",  # 17
    ".....KPPwWWW",  # 18
    ".....KPPPwWW",  # 19
    ".....KPPPPPP",  # 20
    ".....KDDPKPP",  # 21
    "......KWWK..",  # 22
    "............",  # 23
]
S24_WINGS = {
    'up':   {14: "c...........", 15: "Cc..........", 16: "CCc.........", 17: "cCCc........", 18: ".cCCc.......", 19: "..cc........"},
    'down': {17: "...c........", 18: "..cCc.......", 19: ".cCCc.......", 20: "cCCc........", 21: "Cc.........."},
}


def build24(eyes, mouth, wings, star_bright=False):
    rows = S24_TOP + S24_EYES[eyes] + S24_MOUTH[mouth] + S24_BODY
    assert len(rows) == 24 and all(len(r) == 12 for r in rows), rows
    grid = [list(mirror(r)) for r in rows]
    for r, line in S24_WINGS[wings].items():
        for c, ch in enumerate(mirror(line)):
            if ch != '.' and grid[r][c] == '.':
                grid[r][c] = ch
    if star_bright:
        for (r, c) in [(6, 11), (6, 12), (7, 11), (7, 12), (8, 11), (8, 12)]:
            grid[r][c] = 'W'
        for (r, c) in [(3, 11), (4, 12), (7, 8), (7, 15)]:
            grid[r][c] = 'Y'
    for (r, c, ch) in [(0, 1, 'G'), (0, 2, 'G'), (1, 0, 'G'), (1, 1, 'Y'), (2, 0, 'G'), (3, 1, 'G'), (3, 2, 'G'), (4, 2, 'D')]:
        if grid[r][c] == '.':
            grid[r][c] = ch
    return [''.join(r) for r in grid]


FRAMES24 = {
    'idle':   build24('open', 'smile', 'up'),
    'idle2':  build24('open', 'smile', 'down'),
    'blink':  build24('shut', 'smile', 'up'),
    'think':  build24('shut', 'smile', 'up', star_bright=True),
    'think2': build24('shut', 'smile', 'down'),
    'happy':  build24('happy', 'open', 'up'),
    'happy2': build24('happy', 'open', 'down'),
    'shock':  build24('shock', 'open', 'up'),
}


# ---- 16x16 and 8x6 (band, when there is less room) --------------------------
S16_TOP = [
    "........",  # 0
    "..K.....",  # 1
    ".KEK....",  # 2
    ".KEPKKKG",  # 3
    "KPPPPPGY",  # 4
    "KPPPPPPG",  # 5
]
S16_EYES = {  # rows 6-8
    'open':  ["KPWBPPPP", "KPBBPPPP", "KEbbPPPW"],
    'shut':  ["KPPPPPPP", "KPBBBPPP", "KEPPPPPW"],
    'happy': ["KPPBPPPP", "KPBPBPPP", "KEPPPPPW"],
    'shock': ["KWWWPPPP", "KWBWPPPP", "KEWWPPPW"],
}
S16_BOTTOM = [
    ".KPPPWMW",  # 9
    "..KPWWWM",  # 10
    "...KWWWW",  # 11
    "...KPWWW",  # 12
    "...KPPPP",  # 13
    "...KDPKP",  # 14
    "...KWK..",  # 15
]
S16_WINGS = {
    'up':   {9: "c.......", 10: "Cc......", 11: "CCc.....", 12: ".cC....."},
    'down': {12: ".cC.....", 13: "cCC.....", 14: "Cc......", 15: "c......."},
}


def build16(eyes, wings, star_bright=False):
    rows = S16_TOP + S16_EYES[eyes] + S16_BOTTOM
    assert len(rows) == 16 and all(len(r) == 8 for r in rows), rows
    grid = [list(mirror(r)) for r in rows]
    for r, line in S16_WINGS[wings].items():
        for c, ch in enumerate(mirror(line)):
            if ch != '.' and grid[r][c] == '.':
                grid[r][c] = ch
    if star_bright:
        for (r, c) in [(3, 7), (3, 8), (4, 7), (4, 8)]:
            grid[r][c] = 'W'
    for (r, c, ch) in [(0, 1, 'G'), (1, 0, 'G'), (2, 0, 'G'), (3, 0, 'G'), (4, 1, 'G')]:  # crescent moon, top-left
        if grid[r][c] == '.':
            grid[r][c] = ch
    return [''.join(r) for r in grid]


FRAMES16 = {
    'idle':   build16('open', 'up'),
    'idle2':  build16('open', 'down'),
    'blink':  build16('shut', 'up'),
    'think':  build16('shut', 'up', star_bright=True),
    'think2': build16('shut', 'down'),
    'happy':  build16('happy', 'up'),
    'happy2': build16('happy', 'down'),
    'shock':  build16('shock', 'up'),
}

# just the head, 8x6
S8 = {
    'open':  ['.K....K.', 'KEK..KEK', 'KPPGGPPK', 'KBPPPPBK', 'KPPWWPPK', '.KKKKKK.'],
    'shut':  ['.K....K.', 'KEK..KEK', 'KPPGGPPK', 'KPPPPPPK', 'KBBWWBBK', '.KKKKKK.'],
    'happy': ['.K....K.', 'KEK..KEK', 'KPPGGPPK', 'KBPPPPBK', 'KPWMMWPK', '.KKKKKK.'],
    'shock': ['.K....K.', 'KEK..KEK', 'KPPGGPPK', 'KWPPPPWK', 'KPPMMPPK', '.KKKKKK.'],
}
FRAMES8 = {
    'idle': S8['open'], 'idle2': S8['open'], 'blink': S8['shut'], 'think': S8['shut'], 'think2': S8['shut'],
    'happy': S8['happy'], 'happy2': S8['open'], 'shock': S8['shock'],
}


def render_png(frames, path, scale=8):
    names = list(frames)
    H = len(next(iter(frames.values())))
    W = len(next(iter(frames.values()))[0])
    gap = 4
    img = Image.new('RGB', ((W + gap) * len(names) * scale, H * scale), (0x14, 0x0b, 0x2e))
    for i, n in enumerate(names):
        for y, row in enumerate(frames[n]):
            for x, ch in enumerate(row):
                col = PALETTE[ch]
                if col is None:
                    continue
                for dy in range(scale):
                    for dx in range(scale):
                        img.putpixel(((i * (W + gap) + x) * scale + dx, y * scale + dy), col)
    img.save(path)


def write_ts(frames, path):
    pal = {k: ('%06x' % (v[0] << 16 | v[1] << 8 | v[2]) if v else None) for k, v in PALETTE.items()}
    body = '// Generated by tools/sprites.py. Do not edit.\n'
    body += 'export const PALETTE: Record<string, number | null> = {\n'
    for k, v in pal.items():
        body += f"  {json.dumps(k)}: {('0x' + v) if v else 'null'},\n"
    body += '}\n\n'
    body += f'export const SPRITE_W = {W}\nexport const SPRITE_H = {H}\n\n'
    body += 'export const FRAMES = {\n'
    for n, rows in frames.items():
        body += f'  {n}: [\n' + ''.join(f'    {json.dumps(r)},\n' for r in rows) + '  ],\n'
    body += '} as const\n\nexport type FrameName = keyof typeof FRAMES\n'
    for name, table in [('FRAMES24', FRAMES24), ('FRAMES16', FRAMES16), ('FRAMES8', FRAMES8)]:
        body += f'\nexport const {name} = {{\n'
        for n, rows in table.items():
            body += f'  {n}: [\n' + ''.join(f'    {json.dumps(r)},\n' for r in rows) + '  ],\n'
        body += '} as const\n'
    with open(path, 'w') as f:
        f.write(body)


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(os.path.join(root, 'docs'), exist_ok=True)
    render_png(FRAMES, os.path.join(root, 'docs', 'frames-32.png'))
    render_png(FRAMES24, os.path.join(root, 'docs', 'frames-24.png'), scale=10)
    render_png(FRAMES16, os.path.join(root, 'docs', 'frames-16.png'), scale=12)
    write_ts(FRAMES, sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'hooks', 'sprites.ts'))
    print('ok', list(FRAMES))
