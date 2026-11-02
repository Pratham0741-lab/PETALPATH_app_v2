"""
Turns rendered letters into tracing guides: one centre-line per stroke.

Input: the PNGs written by render.html (one per item, in items.json order).
Output: src/utils/traceGuides.generated.ts, polylines in the item's frame.

    python -I skeletonize.py <render_dir> <out.ts>

Steps per item: binarise, thin to a 1-pixel skeleton (Zhang-Suen), cut the
skeleton at its junctions into separate strokes, drop the short spurs that
thinning leaves at corners, then simplify each stroke (Ramer-Douglas-Peucker).
All items of one script share a vertical band, so a small letter sits at its
real height next to a tall one instead of being stretched to fill the board.
"""
import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image

RENDER, OUT = sys.argv[1], sys.argv[2]
items = json.load(open(os.path.join(RENDER, 'items.json'), encoding='utf-8'))
is_dev = lambda s: re.search('[ऀ-ॿ]', s) is not None

N8 = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]


def thin(img):
    """Zhang-Suen thinning on a boolean image (True = ink)."""
    a = np.pad(img.astype(np.uint8), 1)
    changed = True
    while changed:
        changed = False
        for step in (0, 1):
            p = [np.roll(np.roll(a, -dy, 0), -dx, 1) for dy, dx in N8]
            b = sum(p)
            seq = p + [p[0]]
            t = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(np.uint8) for i in range(8))
            if step == 0:
                c1 = p[0] * p[2] * p[4]
                c2 = p[2] * p[4] * p[6]
            else:
                c1 = p[0] * p[2] * p[6]
                c2 = p[0] * p[4] * p[6]
            m = (a == 1) & (b >= 2) & (b <= 6) & (t == 1) & (c1 == 0) & (c2 == 0)
            if m.any():
                a[m] = 0
                changed = True
    return a[1:-1, 1:-1].astype(bool)


def neighbours(sk, y, x):
    h, w = sk.shape
    for dy, dx in N8:
        yy, xx = y + dy, x + dx
        if 0 <= yy < h and 0 <= xx < w and sk[yy, xx]:
            yield yy, xx


def crossings(sk, y, x):
    """0->1 transitions around a pixel: 1 at an end, 2 along a line, 3+ at a fork.

    Counting neighbours instead marks every staircase step of a thinned diagonal
    as a fork, which is what cut strokes into fragments.
    """
    h, w = sk.shape
    ring = [sk[y + dy, x + dx] if 0 <= y + dy < h and 0 <= x + dx < w else False for dy, dx in N8]
    return sum(1 for i in range(8) if not ring[i] and ring[(i + 1) % 8])


def strokes_of(sk):
    """Cuts the skeleton into polylines between end points and forks."""
    pts = set(zip(*np.nonzero(sk)))
    kind = {}
    for p in pts:
        c = crossings(sk, *p)
        n = sum(1 for _ in neighbours(sk, *p))
        kind[p] = 'end' if n <= 1 or c == 1 else 'fork' if c >= 3 else 'line'
    nodes = {p for p, k in kind.items() if k != 'line'}
    visited = set()
    paths = []

    def step_options(cur, path_set):
        opts = [n for n in neighbours(sk, *cur) if n not in path_set and (n not in visited or n in nodes)]
        # Orthogonal first, so a staircase is walked pixel by pixel, not skipped.
        opts.sort(key=lambda n: abs(n[0] - cur[0]) + abs(n[1] - cur[1]))
        return opts

    def walk(start, nxt):
        path = [start, nxt]
        path_set = {start, nxt}
        cur = nxt
        while cur not in nodes:
            visited.add(cur)
            opts = step_options(cur, path_set)
            if not opts:
                break
            cur = opts[0]
            path.append(cur)
            path_set.add(cur)
        return path

    for n in sorted(nodes):
        if not any(True for _ in neighbours(sk, *n)):
            paths.append([n])  # a dot thinned to a single pixel
            continue
        for nb in list(neighbours(sk, *n)):
            if nb in visited or (nb in nodes and any(p[0] == n and p[1] == nb or p[0] == nb and p[1] == n for p in paths)):
                continue
            path = walk(n, nb)
            if len(path) >= 2:
                paths.append(path)
    # Closed loops with no end or fork (o, 0), and lone dots.
    for p in sorted(pts):
        if p in visited or p in nodes:
            continue
        nb = next((n for n in neighbours(sk, *p) if n not in visited), None)
        visited.add(p)
        if nb is None:
            paths.append([p])
            continue
        path = walk(p, nb)
        paths.append(path + [p])
    return paths, kind


def length(path):
    return sum(math.dist(a, b) for a, b in zip(path, path[1:]))


def prune(paths, kind, spur):
    """Drops short branches between a loose end and a fork (thinning artefacts)."""
    out = []
    for path in paths:
        ends = {kind.get(path[0]), kind.get(path[-1])}
        if 'end' in ends and 'fork' in ends and length(path) < spur:
            continue
        out.append(path)
    return out


def rdp(points, eps):
    if len(points) < 3:
        return points
    (y1, x1), (y2, x2) = points[0], points[-1]
    dy, dx = y2 - y1, x2 - x1
    norm = math.hypot(dx, dy) or 1.0
    dists = [abs(dy * (x - x1) - dx * (y - y1)) / norm for y, x in points[1:-1]]
    i = int(np.argmax(dists))
    if dists[i] > eps:
        return rdp(points[: i + 2], eps)[:-1] + rdp(points[i + 1:], eps)
    return [points[0], points[-1]]


def ink(i):
    im = np.array(Image.open(os.path.join(RENDER, 'out', f'{i:04d}.png')).convert('L'))
    return im < 128


# A shared vertical band per script: the tallest extent of any item.
bands = {}
for i, text in enumerate(items):
    rows = np.nonzero(ink(i).any(axis=1))[0]
    key = 'dev' if is_dev(text) else 'lat'
    top, bottom = bands.get(key, (10 ** 9, -1))
    bands[key] = (min(top, rows[0]), max(bottom, rows[-1]))

guides = {}
for i, text in enumerate(items):
    img = ink(i)
    top, bottom = bands['dev' if is_dev(text) else 'lat']
    cols = np.nonzero(img.any(axis=0))[0]
    left, right = cols[0], cols[-1]
    crop = img[top: bottom + 1, left: right + 1]
    # Stroke width, for the spur threshold: ink area over skeleton length.
    sk = thin(crop)
    stroke_w = crop.sum() / max(1, sk.sum())
    paths, kind = strokes_of(sk)
    paths = prune(paths, kind, spur=stroke_w * 0.75)
    lines = []
    for path in paths:
        if length(path) < stroke_w * 0.5:
            # A dot (the i, the j, a nukta): a short tap mark at its centre.
            cy = sum(p[0] for p in path) / len(path)
            cx = sum(p[1] for p in path) / len(path)
            r = max(2.0, stroke_w * 0.25)
            lines.append([int(cx - r), int(cy), int(cx + r), int(cy)])
            continue
        if path[0] == path[-1] or math.dist(path[0], path[-1]) < 2:
            # A closed loop: simplify each half, or the end points coincide and
            # the whole loop collapses to them.
            half = len(path) // 2
            simple = rdp(path[: half + 1], 1.5) + rdp(path[half:], 1.5)[1:]
        else:
            simple = rdp(path, 1.5)
        lines.append([v for y, x in simple for v in (int(x), int(y))])
    guides[text] = {'w': int(crop.shape[1]), 'h': int(crop.shape[0]), 's': lines}

with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write('/**\n * GENERATED by scripts/trace-guides/skeletonize.py from\n'
            ' * curriculum/revision/trace-sets.json. Do not edit by hand: change the sets\n'
            ' * and re-run the generator (see scripts/trace-guides/README.md).\n *\n'
            ' * Tracing guides for small letters, numbers with more than one digit, number\n'
            ' * names and Hindi. Each entry is the item\'s frame (w x h, in pixels of the\n'
            ' * render) and its strokes as flat [x0, y0, x1, y1, ...] polylines in that frame.\n'
            ' * Shapes: Nunito Bold (Latin) and Noto Sans Devanagari, both SIL Open Font License.\n */\n')
    f.write('export const TRACE_GUIDES: Record<string, { w: number; h: number; s: number[][] }> = ')
    f.write(json.dumps(guides, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
print(len(guides), 'guides,', os.path.getsize(OUT) // 1024, 'KB; bands', bands)
