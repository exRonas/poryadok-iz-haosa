"""Общая часть всех 3D-картинок учебного режима: Cycles, окружение, свет, материалы, примитивы.

Палитра «синий и малиновый»: стекло синее в центре и малиновое по краю, хром отражает
синий и розовый софтбоксы. Скрипт запускается внутри Blender (bpy).
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector

CENTER = (0.02, 0.05, 1.0)      # цвет стекла в центре
EDGE = (1.0, 0.1, 0.7)          # цвет стекла по краю
LEFT = (0.12, 0.22, 1.0)        # левый софтбокс
RIGHT = (1.0, 0.18, 0.7)        # правый софтбокс
SPARKLE = (1.0, 0.9, 1.0)       # блёстки внутри стекла


def rgba(color):
    return (*color, 1.0)


def set_inputs(node, **values):
    for key, value in values.items():
        name = key.replace('_', ' ')
        if name in node.inputs:
            node.inputs[name].default_value = value
        else:
            print('MISSING INPUT', name)


def reset(width, height, samples):
    """Пустая сцена, Cycles на видеокарте, прозрачный фон."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _cache.clear()  # материалы прошлой сцены удалены вместе с ней
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for kind in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                break
        except Exception as error:  # нет такой видеокарты — пробуем следующий тип
            print('device', kind, error)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 16
    scene.cycles.glossy_bounces = 8
    scene.cycles.transmission_bounces = 16
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = -0.35
    _world(scene)
    return scene


def _world(scene):
    """Студийный HDRI виден только в отражениях; сквозь стекло — темнота, как фон сайта."""
    # system_resource работает и в blender.exe, и в модуле bpy из pip (там binary_path пустой).
    studio = os.path.join(bpy.utils.system_resource('DATAFILES'), 'studiolights', 'world', 'studio.exr')
    world = bpy.data.worlds.new('World')
    scene.world = world
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    nodes.clear()
    env = nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(studio)
    lit = nodes.new('ShaderNodeBackground')
    lit.inputs['Strength'].default_value = 1.5
    dark = nodes.new('ShaderNodeBackground')
    dark.inputs['Color'].default_value = (0.004, 0.004, 0.008, 1)
    path = nodes.new('ShaderNodeLightPath')
    mix = nodes.new('ShaderNodeMixShader')
    out = nodes.new('ShaderNodeOutputWorld')
    links.new(env.outputs['Color'], lit.inputs['Color'])
    links.new(path.outputs['Is Transmission Ray'], mix.inputs['Fac'])
    links.new(lit.outputs['Background'], mix.inputs[1])
    links.new(dark.outputs['Background'], mix.inputs[2])
    links.new(mix.outputs['Shader'], out.inputs['Surface'])


def _empty(name, location):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    return obj


def _track(obj, target):
    c = obj.constraints.new('TRACK_TO')
    c.target, c.track_axis, c.up_axis = target, 'TRACK_NEGATIVE_Z', 'UP_Y'


def lights(target=(0, 0, 0.6), scale=1.0):
    """Белый ключ и верх, синий слева, малиновый справа-сзади, слабая заливка спереди."""
    aim = _empty('LightTarget', target)
    tx, ty, tz = target

    def area(name, offset, color, energy, size):
        data = bpy.data.lights.new(name, 'AREA')
        data.color, data.energy, data.size = color, energy * scale * scale, size * scale
        obj = bpy.data.objects.new(name, data)
        obj.location = (tx + offset[0] * scale, ty + offset[1] * scale, tz + offset[2] * scale)
        bpy.context.scene.collection.objects.link(obj)
        _track(obj, aim)

    area('Key', (3, -4, 5.4), (1, 1, 1), 900, 5)
    area('Top', (0, 0.5, 6.4), (1, 1, 1), 600, 8)
    area('Left', (-5.5, -1, 1.2), LEFT, 2200, 4.5)
    area('Right', (4.5, 3, 0.6), RIGHT, 2000, 3.5)
    area('Fill', (0, -6, -0.1), (0.75, 0.78, 0.85), 300, 7)


def camera(location, target, lens=50):
    data = bpy.data.cameras.new('Cam')
    data.lens = lens
    cam = bpy.data.objects.new('Cam', data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    _track(cam, _empty('CamTarget', target))
    bpy.context.scene.camera = cam
    return cam


# ---------- Материалы ----------

_cache = {}


def chrome():
    if 'chrome' not in _cache:
        m = bpy.data.materials.new('Chrome')
        m.use_nodes = True
        set_inputs(m.node_tree.nodes['Principled BSDF'], Base_Color=(0.97, 0.97, 1, 1), Metallic=1.0, Roughness=0.07)
        _cache['chrome'] = m
    return _cache['chrome']


def graphite():
    if 'graphite' not in _cache:
        m = bpy.data.materials.new('Graphite')
        m.use_nodes = True
        set_inputs(m.node_tree.nodes['Principled BSDF'], Base_Color=(0.08, 0.08, 0.1, 1), Metallic=0.6, Roughness=0.3)
        _cache['graphite'] = m
    return _cache['graphite']


def onyx():
    """Тёмный глянцевый пластик: «закрытые» клетки. Не металл, поэтому плоская грань не выгорает в белое."""
    if 'onyx' not in _cache:
        m = bpy.data.materials.new('Onyx')
        m.use_nodes = True
        set_inputs(m.node_tree.nodes['Principled BSDF'], Base_Color=(0.006, 0.006, 0.01, 1), Metallic=0.0, Roughness=0.42,
                   Specular_IOR_Level=0.25)
        _cache['onyx'] = m
    return _cache['onyx']


def glass(pane=False, center=CENTER, rim=EDGE):
    """Синее стекло с малиновым краем и блёстками. pane=True — тонкое прозрачное стекло для плоскостей.
    center/rim меняют цвет: например, малиновое «теоретическое» стекло."""
    key = ("pane" if pane else "glass", center, rim)
    if key in _cache:
        return _cache[key]
    m = bpy.data.materials.new('Pane' if pane else 'Glass')
    m.use_nodes = True
    nodes, links = m.node_tree.nodes, m.node_tree.links
    bsdf = nodes['Principled BSDF']
    set_inputs(bsdf, Base_Color=rgba(center), Metallic=0.0, Roughness=0.1, IOR=1.5,
               Transmission_Weight=0.9 if pane else 0.55, Coat_Weight=1.0, Coat_Roughness=0.02,
               Thin_Film_Thickness=300.0, Thin_Film_IOR=1.33,
               Alpha=0.55 if pane else 1.0)
    facing = nodes.new('ShaderNodeLayerWeight')
    facing.inputs['Blend'].default_value = 0.45
    edge = nodes.new('ShaderNodeMath')
    edge.operation = 'POWER'
    edge.inputs[1].default_value = 1.6
    links.new(facing.outputs['Facing'], edge.inputs[0])
    tint = nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.inputs[6].default_value = rgba(center)
    tint.inputs[7].default_value = rgba(rim)
    links.new(edge.outputs['Value'], tint.inputs['Factor'])
    # Блёстки: редкие маленькие пятна Вороного светятся почти белым.
    vor = nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 38
    near = nodes.new('ShaderNodeMapRange')
    near.inputs['From Min'].default_value = 0.0
    near.inputs['From Max'].default_value = 0.09
    near.inputs['To Min'].default_value = 1.0
    near.inputs['To Max'].default_value = 0.0
    rare = nodes.new('ShaderNodeMath')
    rare.operation = 'GREATER_THAN'
    rare.inputs[1].default_value = 0.72
    sparkle = nodes.new('ShaderNodeMath')
    sparkle.operation = 'MULTIPLY'
    links.new(vor.outputs['Distance'], near.inputs['Value'])
    links.new(vor.outputs['Color'], rare.inputs[0])
    links.new(near.outputs['Result'], sparkle.inputs[0])
    links.new(rare.outputs['Value'], sparkle.inputs[1])
    color = nodes.new('ShaderNodeMix')
    color.data_type = 'RGBA'
    color.inputs[7].default_value = rgba(SPARKLE)
    links.new(tint.outputs[2], color.inputs[6])
    links.new(sparkle.outputs['Value'], color.inputs['Factor'])
    glow = nodes.new('ShaderNodeMath')
    glow.operation = 'MULTIPLY_ADD'
    glow.inputs[1].default_value = 2.2
    glow.inputs[2].default_value = 0.2 if pane else 0.35
    links.new(edge.outputs['Value'], glow.inputs[0])
    total = nodes.new('ShaderNodeMath')
    total.operation = 'MULTIPLY_ADD'
    total.inputs[1].default_value = 0.0 if pane else 10.0
    links.new(sparkle.outputs['Value'], total.inputs[0])
    links.new(glow.outputs['Value'], total.inputs[2])
    links.new(color.outputs[2], bsdf.inputs['Emission Color'])
    links.new(total.outputs['Value'], bsdf.inputs['Emission Strength'])
    _cache[key] = m
    return m


# ---------- Примитивы ----------


def _smooth(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def _finish(obj, material):
    _smooth(obj)
    obj.data.materials.append(material)
    return obj


def sphere(location, radius, material):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, segments=64, ring_count=32, location=location)
    return _finish(bpy.context.active_object, material)


def rounded_box(location, size, radius, material, segments=8):
    """Брусок size = (x, y, z) со скруглёнными рёбрами радиуса radius."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new('Bevel', 'BEVEL')
    bevel.width = radius
    bevel.segments = segments
    bevel.limit_method = 'NONE'
    return _finish(obj, material)


def torus(location, major, minor, material):
    bpy.ops.mesh.primitive_torus_add(location=location, major_radius=major, minor_radius=minor,
                                     major_segments=160, minor_segments=32)
    return _finish(bpy.context.active_object, material)


def prism(location, radius, depth, material):
    """Треугольная призма вершиной вверх, грань — к камере (ось призмы вдоль Y)."""
    h, s = depth / 2, radius * math.sqrt(3) / 2
    tri = [(0.0, radius), (-s, -radius / 2), (s, -radius / 2)]
    verts = [(x, -h, z) for x, z in tri] + [(x, h, z) for x, z in tri]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)]
    mesh = bpy.data.meshes.new('Prism')
    mesh.from_pydata(verts, [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('Prism', mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    bevel = obj.modifiers.new('Bevel', 'BEVEL')
    bevel.width = radius * 0.12
    bevel.segments = 6
    bevel.limit_method = 'NONE'
    bevel.harden_normals = True
    obj.data.materials.append(material)  # без сглаживания: грани призмы остаются плоскими
    return obj


RINGS, SEGS = 90, 180


def bell_points(var, volume):
    """Колокол Гаусса: высота H = V / (2πσ²), радиус диска 2,55σ. Объём V постоянный."""
    height = volume / (2 * math.pi * var)
    radius = 2.55 * math.sqrt(var)
    points = [(0.0, 0.0, height)]
    for i in range(1, RINGS + 1):
        r = radius * i / RINGS
        z = height * math.exp(-r * r / (2 * var))
        for j in range(SEGS):
            a = 2 * math.pi * j / SEGS
            points.append((r * math.cos(a), r * math.sin(a), z))
    return points


def bell(var=0.3, height=0.95, location=(0, 0, 0)):
    """Хромовый колокол. Возвращает (объект, set_var) — set_var(σ²) меняет форму при том же объёме."""
    volume = 2 * math.pi * var * height
    mesh = bpy.data.meshes.new('Bell')
    bm = bmesh.new()
    verts = [bm.verts.new(p) for p in bell_points(var, volume)]

    def ring(i, j):
        return verts[1 + i * SEGS + j % SEGS]

    for j in range(SEGS):
        bm.faces.new((verts[0], ring(0, j), ring(0, j + 1)))
    for i in range(RINGS - 1):
        for j in range(SEGS):
            bm.faces.new((ring(i, j), ring(i + 1, j), ring(i + 1, j + 1), ring(i, j + 1)))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('Bell', mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    solidify = obj.modifiers.new('Solidify', 'SOLIDIFY')
    solidify.thickness = 0.12
    solidify.offset = -1
    bevel = obj.modifiers.new('Bevel', 'BEVEL')
    bevel.width = 0.05
    bevel.segments = 4
    _finish(obj, chrome())

    def set_var(new_var):
        mesh.vertices.foreach_set('co', [c for p in bell_points(new_var, volume) for c in p])
        mesh.update()

    return obj, set_var


def die(location, size=0.95):
    """Игральный кубик из стекла с хромовыми точками. Возвращает пустышку-родителя."""
    parent = _empty('Die', location)
    body = rounded_box((0, 0, 0), (1, 1, 1), 0.17, glass(), segments=12)
    body.parent = parent
    o = 0.26
    layouts = {
        1: [(0, 0)], 2: [(-o, -o), (o, o)], 3: [(-o, -o), (0, 0), (o, o)],
        4: [(-o, -o), (o, -o), (-o, o), (o, o)], 5: [(-o, -o), (o, -o), (0, 0), (-o, o), (o, o)],
        6: [(-o, -o), (-o, 0), (-o, o), (o, -o), (o, 0), (o, o)],
    }
    faces = {1: (2, 1), 6: (2, -1), 2: (1, -1), 5: (1, 1), 3: (0, 1), 4: (0, -1)}
    for count, (axis, sign) in faces.items():
        for a, b in layouts[count]:
            position = [0.0, 0.0, 0.0]
            position[axis] = sign * 0.465
            others = [k for k in range(3) if k != axis]
            position[others[0]], position[others[1]] = a, b
            pip = sphere(position, 0.085, chrome())
            pip.parent = parent
    parent.scale = (size, size, size)
    return parent


def render_still(path):
    scene = bpy.context.scene
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('WROTE', path, flush=True)


def render_frames(pose, frames, folder, start=0):
    """pose(t), t ∈ [0; 1): последний кадр переходит в первый без шва."""
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    for frame in range(start, frames):
        pose(frame / frames)
        scene.render.filepath = os.path.join(folder, f'f{frame:04d}.png')
        bpy.ops.render.render(write_still=True)
        print('FRAME', frame, flush=True)


__all__ = ['Vector']
