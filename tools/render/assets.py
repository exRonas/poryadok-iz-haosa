"""Сцены 3D-картинок учебного режима.

Кадр:     blender -b --factory-startup -P tools/render/assets.py -- --asset hero --out hero.png
Анимация: blender -b --factory-startup -P tools/render/assets.py -- --asset hero --frames 144 --frame-dir DIR
"""
import argparse
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mathutils import Quaternion, Vector  # noqa: E402

import scene_lib as S  # noqa: E402


def hero():
    S.lights((0, 0, 0.6))
    S.camera((0.4, -7.6, 3.4), (0, 0, 0.6))
    _, set_var = S.bell()
    die = S.die((-1.35, -0.2, 1.55))
    home = Vector((-1.35, -0.2, 1.55))
    die.rotation_mode = 'QUATERNION'
    base = Quaternion((1, 0, 0), math.radians(28)) @ Quaternion((0, 1, 0), math.radians(-18)) @ Quaternion((0, 0, 1), math.radians(38))
    axis = Vector((0.35, 0.25, 1.0)).normalized()
    balls = []
    for location, radius, material, period, phase in [
        ((1.45, -0.6, 1.25), 0.26, S.chrome(), 1, 0.0),
        ((1.05, 0.7, 2.05), 0.17, S.glass(), 2, 0.3),
        ((-0.2, -1.1, 2.15), 0.12, S.chrome(), 3, 0.6),
        ((0.75, -1.45, 0.3), 0.16, S.chrome(), 2, 0.15),
    ]:
        balls.append((S.sphere(location, radius, material), Vector(location), period, phase))

    def pose(t):
        tau = 2 * math.pi
        set_var(0.3 + 0.08 * math.sin(tau * 2 * t))  # два «вдоха» за цикл: шире и ниже, уже и выше
        die.rotation_quaternion = Quaternion(axis, tau * t) @ base
        die.location = home + Vector((0, 0, 0.12 * math.sin(tau * t)))
        for ball, start, period, phase in balls:
            ball.location = start + Vector((0, 0, 0.12 * math.sin(tau * (period * t + phase))))

    return pose


def course_descriptive():
    S.lights((0, 0, 1.0))
    S.camera((2.3, -5.2, 2.5), (0, 0, 1.15))
    heights = [0.4, 0.9, 1.6, 2.1, 1.4, 0.7]
    for i, h in enumerate(heights):
        S.rounded_box(((i - 2.5) * 0.62, 0, h / 2), (0.48, 0.48, h), 0.1, S.chrome())
    S.sphere((0.31, 0, 2.1 + 0.5), 0.28, S.glass())


def course_distributions():
    S.lights((0, 0, 2.0), scale=1.15)
    S.camera((1.5, -7.6, 2.6), (0, 0, 2.05))
    step = 0.42
    for row in range(6):
        for k in range(row + 1):
            S.sphere(((k - row / 2) * step, 0, 4.1 - row * 0.36), 0.09, S.chrome())
    stacks = [1, 3, 5, 6, 4, 2, 1]
    for i, count in enumerate(stacks):
        x = (i - 3) * step
        for j in range(count):
            S.sphere((x, 0, 0.16 + j * 0.3), 0.15, S.glass())
    for i in range(len(stacks) + 1):
        S.rounded_box(((i - 3.5) * step, 0, 0.95), (0.04, 0.34, 1.9), 0.018, S.chrome(), segments=4)
    S.rounded_box((0, 0, -0.03), (len(stacks) * step + 0.12, 0.4, 0.06), 0.025, S.chrome(), segments=4)
    S.sphere((0.1, 0, 2.18), 0.15, S.glass())


def course_limits():
    S.lights((0, 0, 0.5))
    S.camera((0.3, -5.3, 2.7), (0, 0, 0.45))
    S.bell(var=0.3, height=0.95)
    for location, radius, material in [((1.25, -0.6, 0.45), 0.2, S.glass()), ((-1.2, -0.5, 0.75), 0.14, S.chrome()), ((0.9, 0.9, 1.1), 0.11, S.chrome())]:
        S.sphere(location, radius, material)


def course_montecarlo():
    S.lights((0, 0, 0))
    S.camera((0.0, -5.2, 4.6), (0, 0, -0.1))
    S.torus((0, 0, 0.06), 1.15, 0.07, S.chrome())
    half = 1.35
    for x, y, sx, sy in [(0, half, 2 * half + 0.08, 0.08), (0, -half, 2 * half + 0.08, 0.08), (half, 0, 0.08, 2 * half), (-half, 0, 0.08, 2 * half)]:
        S.rounded_box((x, y, 0.04), (sx, sy, 0.08), 0.035, S.chrome(), segments=4)
    rng = random.Random(7)
    for _ in range(140):
        x, y = rng.uniform(-1.25, 1.25), rng.uniform(-1.25, 1.25)
        inside = x * x + y * y <= 1.15 ** 2
        S.sphere((x, y, 0.06), 0.055, S.glass() if inside else S.graphite())


def lesson_sample():
    S.lights((0, 0, 0.8))
    S.camera((0.7, -7.0, 2.4), (0, 0, 0.85))
    counts = [2, 5, 3, 1]
    width = 0.42
    for i in range(len(counts) + 1):
        S.rounded_box(((i - 2) * width, 0, 0.85), (0.04, 0.5, 1.7), 0.018, S.chrome(), segments=4)
    S.rounded_box((0, 0, -0.03), (len(counts) * width + 0.12, 0.56, 0.06), 0.025, S.chrome(), segments=4)
    for i, count in enumerate(counts):
        for j in range(count):
            S.sphere(((i - 1.5) * width, 0, 0.17 + j * 0.33), 0.165, S.glass())
    S.sphere((1.55, -0.1, 2.05), 0.165, S.glass())
    S.sphere((-1.45, -0.3, 1.6), 0.12, S.chrome())


def lesson_center():
    S.lights((0, 0, 0.6))
    S.camera((0.6, -8.4, 2.5), (0, 0, 0.7))
    values = [2, 5, 8, 12, 18]
    mean = sum(values) / len(values)
    to_x = lambda v: (v - 10) * 0.26  # noqa: E731
    S.prism((to_x(mean), 0, 0.27), 0.36, 0.5, S.chrome())
    S.rounded_box((0, 0, 0.53), (5.4, 0.6, 0.12), 0.05, S.chrome())
    for v in values:
        S.sphere((to_x(v), 0, 0.59 + 0.2), 0.2, S.glass())


def lesson_spread():
    S.lights((0, 0, 0.8))
    S.camera((0.5, -7.6, 2.0), (0, 0, 0.8))
    unit = 0.32
    bar = 0.035
    for d in [-5, -2, 0, 1, 6]:
        x = d * unit
        if d:
            # Квадрат отклонения — светящийся стеклянный контур со стороной |d|.
            side = abs(d) * unit
            cx, cz = x / 2, side / 2
            for bx, bz, sx, sz in [(cx, side, side, bar), (cx, 0.0, side, bar), (0.0, cz, bar, side), (x, cz, bar, side)]:
                S.rounded_box((bx, 0, bz), (sx + bar, bar, sz + bar), bar * 0.45, S.glass(), segments=3)
        S.sphere((x, 0, 0.0), 0.13 if d else 0.17, S.chrome() if d else S.glass())
    S.rounded_box((0, 0, -0.16), (14 * unit, 0.06, 0.04), 0.015, S.chrome(), segments=3)


def lesson_outliers():
    S.lights((0, 0, 0.3))
    S.camera((0.0, -9.6, 2.3), (0, 0, 0.3))
    for i, offset in enumerate([0.0, 0.05, -0.04, 0.08, 0.0, -0.06, 0.03]):
        S.sphere((-2.6 + i * 0.36 + offset, 0, 0.22), 0.17, S.chrome())
    S.sphere((2.55, 0, 0.28), 0.24, S.glass())
    S.rounded_box((0, 0, 0.0), (6.0, 0.08, 0.05), 0.02, S.chrome(), segments=3)
    S.prism((-1.52, 0, -0.32), 0.16, 0.2, S.glass())  # медиана — на месте
    S.prism((-0.85, 0, -0.32), 0.16, 0.2, S.chrome())  # среднее уехало вправо


def _rod(a, b, radius, material):
    """Стержень-цилиндр от точки a до точки b."""
    import bpy

    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=(b - a).length, location=(a + b) / 2)
    rod = bpy.context.active_object
    rod.rotation_mode = 'QUATERNION'
    rod.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    for polygon in rod.data.polygons:
        polygon.use_smooth = True
    rod.data.materials.append(material)
    return rod


def _coin(location, radius, rotation):
    import bpy

    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=radius * 0.16, location=location)
    coin = bpy.context.active_object
    coin.rotation_euler = tuple(math.radians(a) for a in rotation)
    bevel = coin.modifiers.new('Bevel', 'BEVEL')
    bevel.width = radius * 0.05
    bevel.segments = 6
    bevel.harden_normals = True
    coin.data.materials.append(S.chrome())
    return coin


def lesson_bernoulli():
    S.lights((0, 0, 1.5))
    S.camera((0.9, -7.4, 2.6), (0.3, 0, 1.55))
    for row in range(4):
        for k in range(row + 1):
            S.sphere(((k - row / 2) * 0.6, 0, 2.4 - row * 0.55), 0.09, S.chrome())
    trail = [(0.0, 2.85), (-0.3, 2.13), (0.0, 1.58), (0.3, 1.03), (0.0, 0.48)]
    for i, (x, z) in enumerate(trail):
        S.sphere((x, 0, z), 0.17 if i == len(trail) - 1 else 0.12, S.glass())
    for (x1, z1), (x2, z2) in zip(trail, trail[1:]):
        _rod((x1, 0, z1), (x2, 0, z2), 0.025, S.glass())
    _coin((1.75, -0.2, 1.7), 0.45, (28, -12, 20))


def lesson_moments():
    S.lights((0, 0, 0.8))
    S.camera((1.2, -6.6, 2.1), (0, 0, 0.8))
    probabilities = [1, 8, 28, 56, 70, 56, 28, 8, 1]
    for i, count in enumerate(probabilities):
        h = max(0.06, count / 256 * 8)
        S.rounded_box(((i - 4) * 0.44, 0, h / 2), (0.36, 0.36, h), 0.06, S.glass(), segments=6)
    S.rounded_box((0, 0, -0.14), (4.2, 0.08, 0.05), 0.02, S.chrome(), segments=3)
    S.sphere((0, 0, -0.36), 0.17, S.chrome())
    for x in (-0.62, 0.62):
        S.prism((x, 0, -0.34), 0.12, 0.16, S.chrome())


def lesson_walk():
    S.lights((0, 0, 1.2))
    S.camera((0.0, -9.4, 2.1), (0, 0, 1.25))
    steps = [1, 1, -1, 1, 1, 1, -1, -1, 1, 1, -1, 1]
    position = 0
    points = [(-2.64, 0, 0.6)]
    for i, step in enumerate(steps):
        position += step
        points.append((-2.64 + (i + 1) * 0.44, 0, 0.6 + position * 0.35))
    for a, b in zip(points, points[1:]):
        _rod(a, b, 0.03, S.chrome())
    for i, point in enumerate(points):
        last = i == len(points) - 1
        S.sphere(point, 0.2 if last else 0.1, S.glass() if last or i == 0 else S.chrome())


def lesson_normal():
    S.lights((0, 0, 1.0))
    S.camera((0.9, -6.9, 2.3), (0, 0, 1.05))
    from math import comb

    m = 16
    for k in range(m + 1):
        h = max(0.04, comb(m, k) / 2 ** m * 12)
        S.rounded_box(((k - 8) * 0.27, 0, h / 2), (0.21, 0.24, h), 0.04, S.chrome(), segments=4)
    sigma = 2.0
    x = -8.4
    while x <= 8.4:
        density = math.exp(-((x) ** 2) / (2 * sigma ** 2)) / (sigma * math.sqrt(2 * math.pi))
        S.sphere((x * 0.27, -0.2, density * 12 + 0.16), 0.055, S.glass())
        x += 0.34


# ---------- Курс 3 «Предельные теоремы» ----------

THEORY_GLASS = dict(center=(1.0, 0.1, 0.62), rim=(1.0, 0.72, 0.95))


def lesson_lln():
    """Монета и стеклянная «кривая частоты», которая колеблется и ложится на хромовую прямую p."""
    S.lights((0, 0, 1.0))
    S.camera((0.3, -8.4, 2.3), (-0.1, 0, 1.05))
    level = 0.9
    S.rounded_box((0.45, 0, level), (5.0, 0.06, 0.05), 0.02, S.chrome(), segments=3)
    points = []
    for i in range(16):
        x = -1.9 + i * 0.3
        swing = 1.05 / (i + 1) ** 0.8 * (1 if i % 2 == 0 else -1)
        points.append((x, 0, level + swing))
    for a, b in zip(points, points[1:]):
        _rod(a, b, 0.028, S.glass())
    for i, point in enumerate(points):
        last = i == len(points) - 1
        S.sphere(point, 0.17 if last else 0.085, S.glass() if last else S.chrome())
    _coin((-2.55, -0.2, 1.7), 0.42, (76, 0, 22))


def lesson_noise():
    """Стопка стеклянных «кадров» с размытыми копиями кольца; спереди — одно чёткое хромовое кольцо."""
    S.lights((0, 0, 1.0))
    S.camera((2.2, -7.2, 2.6), (0.4, 0, 1.1))
    rng = random.Random(3)
    for i in range(5):
        offset = (4 - i) * 0.32
        S.rounded_box((offset * 0.9, offset, 1.0 + offset * 0.25), (1.9, 0.05, 1.5), 0.08, S.glass(pane=True), segments=6)
        if i < 4:
            ghost = S.torus((offset * 0.9 + rng.uniform(-0.25, 0.25), offset - 0.06, 1.0 + offset * 0.25 + rng.uniform(-0.2, 0.2)), 0.42, 0.045, S.glass())
            ghost.rotation_euler = (math.radians(90), 0, 0)
    ring = S.torus((-0.05, -0.12, 1.0), 0.42, 0.07, S.chrome())
    ring.rotation_euler = (math.radians(90), 0, 0)
    S.sphere((-0.05, -0.12, 1.0), 0.17, S.glass())


def lesson_clt():
    """Три кубика над колоколом из стеклянных столбиков: сумма кубиков становится нормальной."""
    S.lights((0, 0, 1.0))
    S.camera((0.8, -7.6, 2.6), (0, 0, 1.05))
    from math import comb

    m = 12
    for k in range(m + 1):
        h = max(0.05, comb(m, k) / 2 ** m * 6.5)
        S.rounded_box(((k - 6) * 0.3, 0, h / 2), (0.24, 0.26, h), 0.05, S.glass(), segments=5)
    S.rounded_box((0, 0, -0.04), (4.1, 0.34, 0.06), 0.025, S.chrome(), segments=4)
    for (x, z), rotation in zip([(-1.15, 2.25), (0.0, 2.55), (1.15, 2.2)], [(18, -10, 30), (-12, 20, -15), (25, 8, 60)]):
        die = S.die((x, -0.2, z), size=0.5)
        die.rotation_euler = tuple(math.radians(a) for a in rotation)


def lesson_chaos():
    """Треугольник Серпинского из шариков: 81 стеклянный шарик и три малиновые вершины."""
    S.lights((0, 0, 1.0))
    S.camera((0.0, -7.4, 1.9), (0, 0, 1.05))
    corners = [(0.0, 2.25), (-1.3, 0.0), (1.3, 0.0)]

    def centers(level, a, b, c):
        if level == 0:
            return [((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3)]
        ab = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        bc = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
        ca = ((c[0] + a[0]) / 2, (c[1] + a[1]) / 2)
        return centers(level - 1, a, ab, ca) + centers(level - 1, ab, b, bc) + centers(level - 1, ca, bc, c)

    for i, (x, z) in enumerate(centers(4, *corners)):
        S.sphere((x, 0, z), 0.055, S.glass() if i % 3 else S.chrome())
    for x, z in corners:
        S.sphere((x, 0, z), 0.13, S.glass(**THEORY_GLASS))


# ---------- Курс 4 «Оценивание и Монте-Карло» ----------

def _tile(location, material, size=0.42):
    tile = S.rounded_box(location, (size, 0.08, size), 0.05, material, segments=4)
    return tile


def lesson_share():
    """Сетка плиток: часть открыта — синее стекло (рисунок) и графит (фон), остальные закрыты тёмным глянцем."""
    S.lights((0, 0, 1.2))
    S.camera((1.6, -7.4, 2.8), (0, 0, 1.15))
    rng = random.Random(11)
    n = 6
    step = 0.48
    for row in range(n):
        for col in range(n):
            x = (col - (n - 1) / 2) * step
            z = 0.05 + row * step
            picture = (col - 2.5) ** 2 + (row - 2.5) ** 2 < 5.2
            opened = rng.random() < 0.55
            material = (S.glass() if picture else S.graphite()) if opened else S.onyx()
            _tile((x, 0 if opened else -0.06, z), material)
    S.sphere((1.85, -0.5, 2.75), 0.17, S.glass())


def lesson_area():
    """Квадрат-рамка, четверть круга из хромовых шариков и случайные точки: внутри — стекло, снаружи — графит."""
    S.lights((0, 0, 1.2))
    S.camera((0.4, -7.0, 2.4), (0, 0, 1.2))
    side = 2.4
    x0, z0 = -side / 2, 0.0
    bar = 0.07
    for x, z, sx, sz in [(0, z0, side + bar, bar), (0, z0 + side, side + bar, bar), (x0, z0 + side / 2, bar, side), (x0 + side, z0 + side / 2, bar, side)]:
        S.rounded_box((x, 0, z), (sx, bar, sz), 0.03, S.chrome(), segments=3)
    for a, b in zip(range(24), range(1, 25)):
        pa = (x0 + side * math.cos(math.pi / 2 * a / 24), 0, z0 + side * math.sin(math.pi / 2 * a / 24))
        pb = (x0 + side * math.cos(math.pi / 2 * b / 24), 0, z0 + side * math.sin(math.pi / 2 * b / 24))
        _rod(pa, pb, 0.035, S.chrome())
    rng = random.Random(5)
    for _ in range(110):
        u, v = rng.random(), rng.random()
        inside = u * u + v * v <= 1
        S.sphere((x0 + u * side, -0.05, z0 + v * side), 0.055, S.glass() if inside else S.graphite())


def lesson_precision():
    """Три мишени: чем больше точек в каждой оценке, тем кучнее оценки ложатся в центр."""
    S.lights((0, 0, 1.0))
    S.camera((0.0, -8.6, 2.0), (0, 0, 1.0))
    rng = random.Random(9)
    for i, spread in enumerate([0.42, 0.21, 0.1]):
        cx = (i - 1) * 2.0
        ring = S.torus((cx, 0, 1.0), 0.72, 0.035, S.chrome())
        ring.rotation_euler = (math.radians(90), 0, 0)
        inner = S.torus((cx, 0, 1.0), 0.36, 0.025, S.chrome())
        inner.rotation_euler = (math.radians(90), 0, 0)
        for _ in range(14):
            S.sphere((cx + rng.gauss(0, spread), -0.05, 1.0 + rng.gauss(0, spread)), 0.06, S.glass())
        S.sphere((cx, -0.06, 1.0), 0.07, S.glass(**THEORY_GLASS))


def _digit(text, location, material, size=0.75):
    import bpy

    bpy.ops.object.text_add(location=location)
    obj = bpy.context.active_object
    obj.data.body = text
    obj.data.size = size
    obj.data.extrude = 0.08
    obj.data.bevel_depth = 0.018
    obj.data.bevel_resolution = 4
    obj.data.align_x = 'CENTER'
    obj.data.align_y = 'CENTER'
    obj.rotation_euler = (math.radians(90), 0, 0)
    obj.data.materials.append(material)
    return obj


def lesson_indicator():
    """Ряд индикаторов 1 и 0 (стекло и графит) и кубик: среднее индикаторов — оценка вероятности."""
    S.lights((0, 0, 0.8))
    S.camera((0.8, -8.4, 2.2), (0.5, 0, 0.8))
    for i, bit in enumerate([1, 0, 0, 1, 0, 1, 0]):
        _digit(str(bit), ((i - 3) * 0.62, 0, 0.55), S.glass() if bit else S.graphite())
    S.rounded_box((0, 0, 0.0), (4.6, 0.08, 0.05), 0.02, S.chrome(), segments=3)
    die = S.die((2.45, -0.2, 1.35), size=0.55)
    die.rotation_euler = tuple(math.radians(a) for a in (20, -14, 34))


ASSETS = {
    'hero': (hero, (1600, 1200)),
    'course-descriptive': (course_descriptive, (1200, 1200)),
    'course-distributions': (course_distributions, (1200, 1200)),
    'course-limits': (course_limits, (1200, 1200)),
    'course-montecarlo': (course_montecarlo, (1200, 1200)),
    'lesson-sample': (lesson_sample, (1600, 1200)),
    'lesson-center': (lesson_center, (1600, 1200)),
    'lesson-spread': (lesson_spread, (1600, 1200)),
    'lesson-outliers': (lesson_outliers, (1600, 1200)),
    'lesson-bernoulli': (lesson_bernoulli, (1600, 1200)),
    'lesson-moments': (lesson_moments, (1600, 1200)),
    'lesson-walk': (lesson_walk, (1600, 1200)),
    'lesson-normal': (lesson_normal, (1600, 1200)),
    'lesson-lln': (lesson_lln, (1600, 1200)),
    'lesson-noise': (lesson_noise, (1600, 1200)),
    'lesson-clt': (lesson_clt, (1600, 1200)),
    'lesson-chaos': (lesson_chaos, (1600, 1200)),
    'lesson-share': (lesson_share, (1600, 1200)),
    'lesson-area': (lesson_area, (1600, 1200)),
    'lesson-precision': (lesson_precision, (1600, 1200)),
    'lesson-indicator': (lesson_indicator, (1600, 1200)),
}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--asset', required=True, choices=sorted(ASSETS))
    parser.add_argument('--out')
    parser.add_argument('--samples', type=int, default=256)
    parser.add_argument('--res')
    parser.add_argument('--frames', type=int, default=0)
    parser.add_argument('--frame-dir')
    parser.add_argument('--start', type=int, default=0)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    build, size = ASSETS[args.asset]
    if args.res:
        size = tuple(int(n) for n in args.res.split('x'))
    S.reset(size[0], size[1], args.samples)
    pose = build()
    if args.frames:
        S.render_frames(pose, args.frames, args.frame_dir, args.start)
    else:
        if pose:
            pose(0.0)
        S.render_still(args.out)
