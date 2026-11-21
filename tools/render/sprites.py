"""Детали для опытов: отдельные объекты на прозрачном фоне, ортографическая камера с наклоном 12°.

blender -b --factory-startup -P tools/render/sprites.py -- --out-dir DIR [--only ball-glass,beam] [--samples 192]
Потом: python tools/render/to_webp.py DIR/<name>.png src/course/sprites/<name>.webp --pad 0.02
Браузер рисует детали на холсте и двигает их по законам физики (src/course/physics.ts).
"""
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import scene_lib as S  # noqa: E402

TILT = math.radians(12)
THEORY = dict(center=(1.0, 0.1, 0.62), rim=(1.0, 0.72, 0.95))


def ortho_camera(width, height, target=(0, 0, 0)):
    data = bpy.data.cameras.new('Cam')
    data.type = 'ORTHO'
    data.ortho_scale = max(width, height)
    cam = bpy.data.objects.new('Cam', data)
    bpy.context.scene.collection.objects.link(cam)
    tx, ty, tz = target
    distance = 30
    cam.location = (tx, ty - distance * math.cos(TILT), tz + distance * math.sin(TILT))
    aim = bpy.data.objects.new('Aim', None)
    bpy.context.scene.collection.objects.link(aim)
    aim.location = target
    c = cam.constraints.new('TRACK_TO')
    c.target, c.track_axis, c.up_axis = aim, 'TRACK_NEGATIVE_Z', 'UP_Y'
    bpy.context.scene.camera = cam


def coin(material):
    """Монета лицом к камере (с учётом наклона камеры) с хромовым ободком."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.5, depth=0.09, location=(0, 0, 0))
    disc = bpy.context.active_object
    disc.rotation_euler = (math.pi / 2 - TILT, 0, 0)
    bevel = disc.modifiers.new('Bevel', 'BEVEL')
    bevel.width = 0.025
    bevel.segments = 6
    disc.data.materials.append(material)
    for polygon in disc.data.polygons:
        polygon.use_smooth = True
    rim = S.torus((0, 0, 0), 0.47, 0.04, S.chrome())
    rim.rotation_euler = disc.rotation_euler
    return disc


def tile(material):
    """Квадратная плитка клетки лицом к камере."""
    obj = S.rounded_box((0, 0, 0), (1, 0.16, 1), 0.1, material, segments=5)
    obj.rotation_euler = (-TILT, 0, 0)
    return obj


def frame(bar):
    """Квадратная рамка 1 × 1 из хромовых трубок толщины bar с шариками в углах, лицом к камере.
    Трубки круглые: плоский хром выгорает в белое, а у цилиндра виден перелив."""
    parent = bpy.data.objects.new('Frame', None)
    bpy.context.scene.collection.objects.link(parent)
    h = 0.5 - bar / 2
    r = bar / 2
    for location, rotation in [((0, 0, h), (0, math.pi / 2, 0)), ((0, 0, -h), (0, math.pi / 2, 0)), ((h, 0, 0), (0, 0, 0)), ((-h, 0, 0), (0, 0, 0))]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=r, depth=2 * h, location=location, rotation=rotation)
        tube = bpy.context.active_object
        for polygon in tube.data.polygons:
            polygon.use_smooth = True
        tube.data.materials.append(S.chrome())
        tube.parent = parent
    for x in (-h, h):
        for z in (-h, h):
            S.sphere((x, 0, z), r * 1.15, S.chrome()).parent = parent
    parent.rotation_euler = (-TILT, 0, 0)
    return parent

# Поворот, который ставит грань кубика (раскладка как в scene_lib.die) лицом к −Y; потом — наклон камеры.
DIE_TURNS = {2: ('Z', 0), 5: ('Z', 180), 1: ('X', 90), 6: ('X', -90), 3: ('Z', -90), 4: ('Z', 90)}


def die_showing(face):
    """Стеклянный кубик гранью face к камере, без поворота в плоскости кадра."""
    from mathutils import Matrix

    axis, degrees = DIE_TURNS[face]
    turn = Matrix.Rotation(-TILT, 4, 'X') @ Matrix.Rotation(math.radians(degrees), 4, axis)
    parent = S.die((0, 0, 0), size=1.0)
    parent.rotation_mode = 'QUATERNION'
    parent.rotation_quaternion = turn.to_quaternion()
    return parent

# name: (сборка, ширина кадра, высота кадра, пикселей на единицу, центр кадра, масштаб света)
SPRITES = {
    'ball-glass': (lambda: S.sphere((0, 0, 0), 0.5, S.glass()), 1.1, 1.1, 180, (0, 0, 0), 0.5),
    'ball-chrome': (lambda: S.sphere((0, 0, 0), 0.5, S.chrome()), 1.1, 1.1, 180, (0, 0, 0), 0.5),
    'ball-theory': (lambda: S.sphere((0, 0, 0), 0.5, S.glass(**THEORY)), 1.1, 1.1, 180, (0, 0, 0), 0.5),
    'peg': (lambda: S.sphere((0, 0, 0), 0.5, S.chrome()), 1.1, 1.1, 90, (0, 0, 0), 0.5),
    'beam': (lambda: S.rounded_box((0, 0, 0), (20, 0.6, 0.3), 0.12, S.chrome()), 20.6, 1.4, 70, (0, 0, 0), 2.5),
    'fulcrum': (lambda: S.prism((0, 0, 0), 1.0, 0.8, S.chrome()), 2.2, 2.0, 110, (0, 0, -0.1), 0.7),
    'fulcrum-hot': (lambda: S.prism((0, 0, 0), 1.0, 0.8, S.glass(**THEORY)), 2.2, 2.0, 110, (0, 0, -0.1), 0.7),
    'rail': (lambda: S.rounded_box((0, 0, 0), (20, 0.16, 0.1), 0.045, S.chrome(), segments=4), 20.4, 0.8, 70, (0, 0, 0), 2.5),
    'column-glass': (lambda: S.rounded_box((0, 0, 0), (1, 1, 3), 0.14, S.glass()), 1.3, 3.6, 120, (0, 0, 0), 0.8),
    'column-theory': (lambda: S.rounded_box((0, 0, 0), (1, 1, 3), 0.14, S.glass(**THEORY)), 1.3, 3.6, 120, (0, 0, 0), 0.8),
    'divider': (lambda: S.rounded_box((0, 0, 0), (0.1, 0.6, 3), 0.04, S.chrome(), segments=4), 0.5, 3.4, 120, (0, 0, 0), 0.8),
    'coin-glass': (lambda: coin(S.glass()), 1.15, 1.15, 160, (0, 0, 0), 0.5),
    'coin-graphite': (lambda: coin(S.graphite()), 1.15, 1.15, 160, (0, 0, 0), 0.5),
    'die-1': (lambda: die_showing(1), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'die-2': (lambda: die_showing(2), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'die-3': (lambda: die_showing(3), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'die-4': (lambda: die_showing(4), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'die-5': (lambda: die_showing(5), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'die-6': (lambda: die_showing(6), 1.7, 1.7, 120, (0, 0, 0), 0.7),
    'ball-graphite': (lambda: S.sphere((0, 0, 0), 0.5, S.graphite()), 1.1, 1.1, 180, (0, 0, 0), 0.5),
    'tile-closed': (lambda: tile(S.onyx()), 1.3, 1.3, 110, (0, 0, 0), 0.6),
    'tile-glass': (lambda: tile(S.glass()), 1.3, 1.3, 110, (0, 0, 0), 0.6),
    'tile-graphite': (lambda: tile(S.graphite()), 1.3, 1.3, 110, (0, 0, 0), 0.6),
    'frame-cell': (lambda: frame(0.07), 1.12, 1.12, 110, (0, 0, 0), 0.6),
    'frame-wide': (lambda: frame(0.022), 1.06, 1.06, 640, (0, 0, 0), 0.6),
}


def render(name, out_dir, samples):
    build, width, height, ppu, center, light_scale = SPRITES[name]
    S.reset(round(width * ppu), round(height * ppu), samples)
    S.lights(center, scale=light_scale)
    ortho_camera(width, height, center)
    build()
    S.render_still(os.path.join(out_dir, name + '.png'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out-dir', required=True)
    parser.add_argument('--only')
    parser.add_argument('--samples', type=int, default=192)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    os.makedirs(args.out_dir, exist_ok=True)
    names = args.only.split(',') if args.only else list(SPRITES)
    for name in names:
        render(name, args.out_dir, args.samples)
