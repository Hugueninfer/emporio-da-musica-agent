# Empório da Música — modelo procedural de violão / ukulele + renders de giro 360°
# Uso: blender -b -P violao.py -- <dread|uke> <pasta_renders> <pasta_modelos> [test|full]
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:]
KIND = argv[0]
OUT = argv[1]
MODEL_DIR = argv[2]
MODE = argv[3] if len(argv) > 3 else 'full'
os.makedirs(OUT, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = scene.collection


# ---------- utilidades ----------
def activate(ob):
    bpy.context.view_layer.update()
    for o in bpy.context.view_layer.objects:
        if o is not None:
            o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)


def hexrgb(h, a=1.0):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), a)


def setin(node, name, val):
    if name in node.inputs:
        node.inputs[name].default_value = val


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    return m, nt, nt.nodes.get('Principled BSDF')


def simple_mat(name, color, rough=0.4, metal=0.0, coat=0.0, trans=0.0):
    m, nt, b = new_mat(name)
    setin(b, 'Base Color', hexrgb(color))
    setin(b, 'Roughness', rough)
    setin(b, 'Metallic', metal)
    setin(b, 'Coat Weight', coat)
    setin(b, 'Coat Roughness', 0.05)
    setin(b, 'Transmission Weight', trans)
    return m


def mix_rgb(nt, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix')
    n.data_type = 'RGBA'
    n.blend_type = blend
    A = [s for s in n.inputs if s.name == 'A' and s.type == 'RGBA'][0]
    B = [s for s in n.inputs if s.name == 'B' and s.type == 'RGBA'][0]
    out = [s for s in n.outputs if s.name == 'Result' and s.type == 'RGBA'][0]
    return n, n.inputs[0], A, B, out


def wood_mat(name, light, dark, scale=90.0, distortion=3.0, coat=1.0, rough=0.45, bump=0.03,
             burst=None, rosette=None):
    m, nt, b = new_mat(name)
    L = nt.links.new
    tc = nt.nodes.new('ShaderNodeTexCoord')
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1.0, 0.12, 1.0)
    L(tc.outputs['Object'], mp.inputs['Vector'])
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = scale
    wave.inputs['Distortion'].default_value = distortion
    wave.inputs['Detail'].default_value = 3.0
    wave.inputs['Detail Scale'].default_value = 1.5
    L(tc.outputs['Object'], wave.inputs['Vector'])
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 9.0
    noise.inputs['Detail'].default_value = 6.0
    L(mp.outputs['Vector'], noise.inputs['Vector'])
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'
    L(noise.outputs['Fac'], m1.inputs[0]); m1.inputs[1].default_value = 0.35
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY_ADD'
    L(wave.outputs['Fac'], m2.inputs[0]); m2.inputs[1].default_value = 0.65; L(m1.outputs[0], m2.inputs[2])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.2
    ramp.color_ramp.elements[0].color = hexrgb(light)
    ramp.color_ramp.elements[1].position = 0.9
    ramp.color_ramp.elements[1].color = hexrgb(dark)
    L(m2.outputs[0], ramp.inputs['Fac'])
    color = ramp.outputs['Color']

    if burst:
        cy, ax, ay = burst
        sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
        L(tc.outputs['Object'], sub.inputs[0]); sub.inputs[1].default_value = (0.0, cy, 0.0)
        mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY'
        L(sub.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = (1 / ax, 1 / ay, 0.0)
        ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
        L(mul.outputs[0], ln.inputs[0])
        br = nt.nodes.new('ShaderNodeValToRGB')
        els = br.color_ramp.elements
        els[0].position = 0.0; els[0].color = hexrgb('#F2B455')
        els[1].position = 1.0; els[1].color = hexrgb('#0E0503')
        for pos, col in ((0.38, '#E08A2A'), (0.66, '#8A320E'), (0.86, '#2C0E05')):
            e = els.new(pos); e.color = hexrgb(col)
        L(ln.outputs['Value'], br.inputs['Fac'])
        mx, F, A, B, out = mix_rgb(nt, 'MULTIPLY')
        F.default_value = 1.0
        L(br.outputs['Color'], A); L(color, B)
        color = out

    if rosette:
        cy, r0, r1 = rosette
        sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'
        L(tc.outputs['Object'], sub.inputs[0]); sub.inputs[1].default_value = (0.0, cy, 0.0)
        mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY'
        L(sub.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = (1.0, 1.0, 0.0)
        ln = nt.nodes.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'
        L(mul.outputs[0], ln.inputs[0])
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['From Min'].default_value = r0
        mr.inputs['From Max'].default_value = r1
        L(ln.outputs['Value'], mr.inputs['Value'])
        rr = nt.nodes.new('ShaderNodeValToRGB')
        rr.color_ramp.interpolation = 'CONSTANT'
        els = rr.color_ramp.elements
        els[0].position = 0.0; els[0].color = (0, 0, 0, 0)
        els[1].position = 0.97; els[1].color = (0, 0, 0, 0)
        for pos, col in ((0.03, '#F1E4C8'), (0.10, '#120804'), (0.20, '#3E6E66'), (0.34, '#B8C9B0'),
                         (0.46, '#2E5A5E'), (0.60, '#120804'), (0.72, '#F1E4C8'), (0.80, '#120804'),
                         (0.88, '#F1E4C8')):
            e = els.new(pos); e.color = hexrgb(col)
        L(mr.outputs['Result'], rr.inputs['Fac'])
        mx, F, A, B, out = mix_rgb(nt, 'MIX')
        L(rr.outputs['Alpha'], F); L(color, A); L(rr.outputs['Color'], B)
        color = out

    L(color, b.inputs['Base Color'])
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = bump
    bp.inputs['Distance'].default_value = 0.0008
    L(m2.outputs[0], bp.inputs['Height'])
    L(bp.outputs['Normal'], b.inputs['Normal'])
    setin(b, 'Roughness', rough)
    setin(b, 'Coat Weight', coat)
    setin(b, 'Coat Roughness', 0.04)
    return m


def assign(ob, mat):
    ob.data.materials.clear()
    ob.data.materials.append(mat)


def smooth(ob, ang=35):
    activate(ob)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(ang))
    except Exception:
        try:
            bpy.ops.object.shade_smooth()
        except Exception:
            pass


def curve_obj(name, pts, dims='2D', fill='BOTH', extrude=0.0, bevel=0.0, z=0.0, res=24):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = dims
    cu.fill_mode = fill
    cu.extrude = extrude
    cu.bevel_depth = bevel
    cu.bevel_resolution = 4
    cu.resolution_u = res
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for bp, (x, y) in zip(sp.bezier_points, pts):
        bp.co = (x, y, 0.0)
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    sp.use_cyclic_u = True
    sp.use_smooth = True
    ob = bpy.data.objects.new(name, cu)
    COL.objects.link(ob)
    ob.location.z = z
    activate(ob)
    bpy.ops.object.convert(target='MESH')
    return ob


def boolean_diff(ob, cutter):
    mod = ob.modifiers.new('bool', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object = cutter
    activate(ob)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def cylinder(r, depth, loc, verts=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc)
    return bpy.context.active_object


def box(name, size, loc, mat, bevel=0.0, segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    activate(ob)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new('bev', 'BEVEL')
        md.width = bevel
        md.segments = segs
        bpy.ops.object.modifier_apply(modifier=md.name)
    assign(ob, mat)
    smooth(ob, 40)
    return ob


def cyl_between(p1, p2, r, mat, verts=12):
    p1 = Vector(p1); p2 = Vector(p2)
    d = p2 - p1
    ob = cylinder(r, d.length, (p1 + p2) / 2, verts)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    assign(ob, mat)
    smooth(ob, 60)
    return ob


def loft(name, sections, profile, cap=True):
    bm = bmesh.new()
    rings = []
    for (y, hw, d) in sections:
        rings.append([bm.verts.new((x, y, z)) for (x, z) in profile(hw, d)])
    n = len(rings[0])
    for a, c in zip(rings[:-1], rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], c[j], c[i]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    return ob


def prof_neck(hw, d, n=18):
    return [(hw * math.cos(math.pi * k / n), -d * math.sin(math.pi * k / n)) for k in range(n + 1)]


def prof_rect(hw, t):
    return [(hw, 0.0), (hw, t), (-hw, t), (-hw, 0.0)]


def prof_rect_down(hw, t):
    return [(hw, -t), (hw, 0.0), (-hw, 0.0), (-hw, -t)]


def outline_full(half):
    return half + [(-x, y) for (x, y) in reversed(half[1:-1])]


# ---------- parâmetros ----------
DREAD = dict(
    L=0.508, depth=0.110,
    half=[(0.000, 0.508), (0.060, 0.505), (0.110, 0.492), (0.140, 0.468), (0.150, 0.430),
          (0.143, 0.380), (0.136, 0.330), (0.150, 0.270), (0.180, 0.200), (0.197, 0.130),
          (0.192, 0.070), (0.165, 0.028), (0.110, 0.005), (0.000, 0.000)],
    scale=0.645, nfrets=20, hole_y=0.345, hole_r=0.050, ros=(0.006, 0.020),
    hw_nut=0.0215, hw_joint=0.0285, fb_t=0.006, dn=0.021, dj=0.024,
    nstr=6, sx_saddle=0.027, sx_nut=0.0175, str_r=[0.00075, 0.00066, 0.00058, 0.0005, 0.00042, 0.00038],
    wound=4, head_len=0.19, head_hw0=0.027, head_hw1=0.040, tuner_y=[0.05, 0.095, 0.14],
    bridge=(0.150, 0.030, 0.009), pins=True, pickguard=True,
    dots=[3, 5, 7, 9, 15, 17], double=[12], burst=(0.21, 0.21, 0.31),
)
UKE = dict(
    L=0.300, depth=0.072,
    half=[(0.000, 0.300), (0.045, 0.297), (0.075, 0.285), (0.090, 0.262), (0.091, 0.235),
          (0.080, 0.205), (0.075, 0.185), (0.085, 0.160), (0.105, 0.120), (0.115, 0.080),
          (0.110, 0.045), (0.090, 0.018), (0.055, 0.003), (0.000, 0.000)],
    scale=0.380, nfrets=18, hole_y=0.222, hole_r=0.027, ros=(0.004, 0.012),
    hw_nut=0.0175, hw_joint=0.0215, fb_t=0.005, dn=0.017, dj=0.019,
    nstr=4, sx_saddle=0.0175, sx_nut=0.0135, str_r=[0.0007, 0.0008, 0.00075, 0.00065],
    wound=0, head_len=0.12, head_hw0=0.022, head_hw1=0.027, tuner_y=[0.035, 0.08],
    bridge=(0.070, 0.018, 0.008), pins=False, pickguard=False,
    dots=[5, 7, 10, 15], double=[12], burst=None,
)
P = DREAD if KIND == 'dread' else UKE

# ---------- materiais ----------
M = {}
M['mahogany'] = wood_mat('Mogno', '#6E2F15', '#3E1508', scale=150, distortion=0.25, rough=0.4, bump=0.006)
M['neck'] = wood_mat('Braco', '#7A3A1A', '#4E1E0B', scale=140, distortion=0.25, coat=0.35, rough=0.5, bump=0.006)
M['fret_board'] = wood_mat('Escala', '#3A2015', '#160A05', scale=110, distortion=2, coat=0.0, rough=0.62, bump=0.01)
M['frets'] = simple_mat('Trastes', '#DAD6CC', rough=0.22, metal=1.0)
M['chrome'] = simple_mat('Cromo', '#EDEDED', rough=0.12, metal=1.0)
M['bone'] = simple_mat('Osso', '#F0E7D3', rough=0.35)
M['binding'] = simple_mat('Friso', '#F2E5CA', rough=0.25, coat=1.0)
M['hole'] = simple_mat('Interior', '#0C0603', rough=0.95)
M['pickguard'] = wood_mat('Escudo', '#3A1608', '#120603', scale=40, distortion=6, coat=0.8, rough=0.3, bump=0.0)
M['veneer'] = simple_mat('Mascara', '#120905', rough=0.3, coat=0.9)
M['bronze'] = simple_mat('Bronze', '#C99E62', rough=0.32, metal=1.0)
M['steel'] = simple_mat('Aco', '#D2D2D2', rough=0.2, metal=1.0)
M['nylon'] = simple_mat('Nylon', '#EEE8DC', rough=0.35, trans=0.25)
M['bridge'] = wood_mat('Cavalete', '#2E1910', '#120804', scale=100, distortion=2, coat=0.2, rough=0.5, bump=0.01)
M['pearl'] = simple_mat('Madreperola', '#EFEDE6', rough=0.15, coat=1.0)

ros = (P['hole_y'], P['hole_r'] + P['ros'][0], P['hole_r'] + P['ros'][1])
TOPS = {}
if KIND == 'dread':
    TOPS['natural'] = wood_mat('Tampo cedro', '#CB8B3E', '#9A5A22', scale=170, distortion=0.6, rosette=ros)
    TOPS['spruce'] = wood_mat('Tampo spruce', '#E8C27A', '#C9984F', scale=190, distortion=0.5, rosette=ros)
    TOPS['sunburst'] = wood_mat('Tampo sunburst', '#FFFFFF', '#BDBDBD', scale=170, distortion=0.6, burst=P['burst'], rosette=ros)
else:
    TOPS['uke'] = wood_mat('Tampo ukulele', '#A85C2C', '#6E3214', scale=120, distortion=1.5, rosette=ros)

# ---------- modelagem ----------
L, depth = P['L'], P['depth']
outline = outline_full(P['half'])
s = P['scale']
nut_y = L + s * (1 - 2 ** (-14 / 12))
saddle_y = nut_y - s
zTop = depth / 2 + 0.0014
fb_end = nut_y - s * (1 - 2 ** (-P['nfrets'] / 12)) - 0.006


def hw_at(y):
    return P['hw_nut'] + (P['hw_joint'] - P['hw_nut']) * (nut_y - y) / (nut_y - L)


parts = []

body = curve_obj('Corpo', outline, extrude=depth / 2 - 0.004, bevel=0.004)
boolean_diff(body, cylinder(P['hole_r'], 0.06, (0, P['hole_y'], depth / 2), 96))
assign(body, M['mahogany']); smooth(body, 30); parts.append(body)

inner = cylinder(P['hole_r'] + 0.001, 0.002, (0, P['hole_y'], depth / 2 - 0.028), 64)
inner.name = 'Fundo'; assign(inner, M['hole']); parts.append(inner)

top = curve_obj('Tampo', outline, extrude=0.0007, z=depth / 2 + 0.0007)
boolean_diff(top, cylinder(P['hole_r'], 0.02, (0, P['hole_y'], depth / 2), 96))
assign(top, list(TOPS.values())[0]); parts.append(top)

for nm, z in (('FrisoTampo', depth / 2 + 0.0004), ('FrisoFundo', -depth / 2)):
    bd = curve_obj(nm, outline, dims='3D', fill='FULL', bevel=0.0022, z=z, res=32)
    assign(bd, M['binding']); smooth(bd, 60); parts.append(bd)

ring = cylinder(P['hole_r'] + 0.0012, 0.0015, (0, P['hole_y'], zTop - 0.0006), 96)
boolean_diff(ring, cylinder(P['hole_r'] - 0.0004, 0.01, (0, P['hole_y'], zTop), 96))
ring.name = 'FrisoBoca'; assign(ring, M['binding']); parts.append(ring)

fb = loft('Escala', [(fb_end, hw_at(fb_end), P['fb_t']), (nut_y, P['hw_nut'], P['fb_t'])], prof_rect)
fb.location.z = zTop
assign(fb, M['fret_board']); parts.append(fb)

neck = loft('Braco', [
    (L - 0.035, hw_at(L), P['dj'] + 0.024),
    (L + 0.004, hw_at(L), P['dj'] + 0.024),
    (L + 0.030, hw_at(L + 0.03), P['dj'] + 0.004),
    (nut_y - 0.06, hw_at(nut_y - 0.06), P['dn'] + 0.001),
    (nut_y + 0.012, P['hw_nut'], P['dn']),
], prof_neck)
neck.location.z = zTop
assign(neck, M['neck']); smooth(neck, 60); parts.append(neck)


def fret_y(n):
    return nut_y - s * (1 - 2 ** (-n / 12))


frets = []
for n in range(1, P['nfrets'] + 1):
    y = fret_y(n)
    w = hw_at(y) * 2
    f = cyl_between((-w / 2, y, zTop + P['fb_t']), (w / 2, y, zTop + P['fb_t']), 0.0011, M['frets'], 10)
    frets.append(f)
activate(frets[0])
for f in frets:
    f.select_set(True)
bpy.ops.object.join()
fr = bpy.context.active_object; fr.name = 'Trastes'; parts.append(fr)

for n in P['dots'] + P['double']:
    y = (fret_y(n - 1) + fret_y(n)) / 2
    xs = [0.0] if n not in P['double'] else [-hw_at(y) * 0.45, hw_at(y) * 0.45]
    for x in xs:
        d = cylinder(0.0028, 0.0006, (x, y, zTop + P['fb_t'] + 0.0001), 24)
        d.name = 'Marcador'; assign(d, M['pearl']); parts.append(d)

nut = box('Pestana', (P['hw_nut'] * 2 + 0.001, 0.005, P['fb_t'] + 0.003),
          (0, nut_y + 0.0025, zTop + (P['fb_t'] + 0.003) / 2), M['bone'], bevel=0.0008)
parts.append(nut)

bx, by, bz = P['bridge']
br = box('Cavalete', (bx, by, bz), (0, saddle_y - by * 0.2, zTop + bz / 2), M['bridge'], bevel=0.0035)
parts.append(br)
sd = box('Rastilho', (bx * 0.5, 0.0028, 0.004), (0, saddle_y, zTop + bz + 0.0012), M['bone'], bevel=0.0008)
parts.append(sd)

sx = [(-P['sx_saddle'] + 2 * P['sx_saddle'] * i / (P['nstr'] - 1)) for i in range(P['nstr'])]
nx = [(-P['sx_nut'] + 2 * P['sx_nut'] * i / (P['nstr'] - 1)) for i in range(P['nstr'])]

if P['pins']:
    for x in sx:
        pn = cylinder(0.0026, 0.002, (x, saddle_y - 0.013, zTop + bz + 0.001), 20)
        pn.name = 'Pino'; assign(pn, M['bone']); parts.append(pn)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0026, location=(x, saddle_y - 0.013, zTop + bz + 0.002), segments=16, ring_count=8)
        dm = bpy.context.active_object; dm.scale.z = 0.5; assign(dm, M['bone']); smooth(dm, 80); parts.append(dm)

if P['pickguard']:
    pg_pts = [(0.055, 0.372), (0.085, 0.378), (0.112, 0.352), (0.122, 0.306), (0.108, 0.266),
              (0.070, 0.246), (0.032, 0.254), (0.020, 0.272), (0.052, 0.300), (0.066, 0.340)]
    pg = curve_obj('Escudo', pg_pts, extrude=0.0003, z=zTop + 0.0003)
    boolean_diff(pg, cylinder(P['hole_r'] + P['ros'][1] + 0.004, 0.02, (0, P['hole_y'], zTop), 96))
    assign(pg, M['pickguard']); parts.append(pg)

# mão (headstock) inclinada 13°
H = Matrix.Translation((0, nut_y + 0.005, zTop + 0.003)) @ Matrix.Rotation(math.radians(-13), 4, 'X')


def place(ob):
    bpy.context.view_layer.update()
    ob.matrix_world = H @ ob.matrix_world
hl = P['head_len']


def head_hw(y):
    return P['head_hw0'] + (P['head_hw1'] - P['head_hw0']) * y / hl


head = loft('Mao', [(0.0, P['head_hw0'], 0.014), (hl, P['head_hw1'], 0.014)], prof_rect_down)
md = head.modifiers.new('bev', 'BEVEL'); md.width = 0.002; md.segments = 3
activate(head); bpy.ops.object.modifier_apply(modifier=md.name)
place(head)
assign(head, M['neck']); smooth(head, 40); parts.append(head)
ven = loft('MascaraMao', [(0.004, P['head_hw0'] - 0.0006, 0.0012), (hl - 0.001, P['head_hw1'] - 0.0006, 0.0012)], prof_rect)
place(ven)
assign(ven, M['veneer']); parts.append(ven)

posts = []
for side in (-1, 1):
    for ty in P['tuner_y']:
        hw = head_hw(ty)
        px = side * (hw - 0.011)
        for ob in (cylinder(0.0034, 0.016, (px, ty, 0.008), 20), cylinder(0.0052, 0.0025, (px, ty, 0.0024), 24)):
            place(ob); assign(ob, M['chrome']); smooth(ob, 60); parts.append(ob)
        hs = box('Carcaca', (0.014, 0.018, 0.010), (side * (hw - 0.010), ty, -0.020), M['chrome'], bevel=0.002)
        place(hs); parts.append(hs)
        sh = cyl_between((side * (hw - 0.003), ty, -0.020), (side * (hw + 0.016), ty, -0.020), 0.0018, M['chrome'], 12)
        place(sh); parts.append(sh)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, location=(side * (hw + 0.024), ty, -0.020), segments=24, ring_count=12)
        bt = bpy.context.active_object; bt.scale = (0.009, 0.003, 0.0085)
        place(bt); assign(bt, M['chrome']); smooth(bt, 80); parts.append(bt)
        posts.append((side, ty, H @ Vector((px, ty, 0.012))))

# cordas
n = P['nstr']
half_n = n // 2
left_posts = sorted([p for p in posts if p[0] < 0], key=lambda p: p[1])
right_posts = sorted([p for p in posts if p[0] > 0], key=lambda p: p[1])
targets = []
for i in range(n):
    if i < half_n:
        targets.append(left_posts[i][2])
    else:
        targets.append(right_posts[n - 1 - i][2])
z_sad = zTop + bz + 0.0034
z_nut = zTop + P['fb_t'] + 0.0026
for i in range(n):
    if KIND == 'uke':
        mat = M['nylon']
    else:
        mat = M['bronze'] if i < P['wound'] else M['steel']
    r = P['str_r'][i]
    a = (sx[i], saddle_y - 0.012, zTop + bz + 0.0016)
    b = (sx[i], saddle_y, z_sad)
    c = (nx[i], nut_y, z_nut)
    for p, q in ((a, b), (b, c), (c, tuple(targets[i]))):
        parts.append(cyl_between(p, q, r, mat, 8))

# hierarquia: Giro (turntable) > Instrumento (deitado no eixo Y local -> Z mundo)
total = (H @ Vector((0, hl, 0))).y
center = total / 2
G = bpy.data.objects.new('Instrumento', None); COL.objects.link(G)
T = bpy.data.objects.new('Giro', None); COL.objects.link(T)
for ob in list(COL.objects):
    if ob.type == 'MESH' and ob.parent is None:
        ob.parent = G
G.rotation_euler = (math.radians(90), 0, 0)
G.location = (0, 0, -center)
G.parent = T

# ---------- luz, câmera, render ----------
def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('-Z', 'Y')


def area(name, loc, size, energy, color):
    ld = bpy.data.lights.new(name, 'AREA'); ld.size = size; ld.energy = energy; ld.color = color[:3]
    lo = bpy.data.objects.new(name, ld); COL.objects.link(lo); lo.location = loc
    try:
        lo.visible_camera = False
    except Exception:
        pass
    look_at(lo, (0, 0, 0)); return lo


span = total
area('Chave', (-1.8 * span, -2.2 * span, 1.0 * span), 1.6 * span, 300 * span * span, hexrgb('#FFE6CC'))
area('Preench', (2.0 * span, -1.6 * span, -0.4 * span), 2.2 * span, 140 * span * span, hexrgb('#DCE6FF'))
area('RecorteE', (-1.5 * span, 1.7 * span, 0.7 * span), 0.9 * span, 420 * span * span, hexrgb('#FFB27A'))
area('RecorteD', (1.6 * span, 1.5 * span, 0.2 * span), 0.9 * span, 380 * span * span, hexrgb('#FF9A5C'))
area('Topo', (0.0, -0.4 * span, 2.2 * span), 1.2 * span, 110 * span * span, hexrgb('#FFF4E8'))

world = bpy.data.worlds.new('Mundo'); scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get('Background')
bg.inputs['Color'].default_value = hexrgb('#2A1A12')
bg.inputs['Strength'].default_value = 0.35

cam_d = bpy.data.cameras.new('Camera')
cam_d.lens = 85
cam_d.sensor_fit = 'VERTICAL'
cam_d.sensor_height = 36
cam = bpy.data.objects.new('Camera', cam_d); COL.objects.link(cam)
dist = total * 1.10 / (36 / 85)
cam.location = (0, -dist, 0)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
cam_d.clip_end = dist * 4

r = scene.render
r.engine = 'CYCLES'
r.film_transparent = (MODE != 'test')
r.resolution_x, r.resolution_y = 540, 900
r.resolution_percentage = 100
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGBA'
scene.cycles.samples = 32 if MODE == 'test' else 72
scene.cycles.use_denoising = True
try:
    scene.view_settings.view_transform = 'AgX'
    for lk in ('AgX - Medium High Contrast', 'Medium High Contrast'):
        try:
            scene.view_settings.look = lk
            break
        except Exception:
            pass
except Exception:
    pass


def setup_gpu():
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
    except Exception:
        return
    for t in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = t
            try:
                prefs.refresh_devices()
            except Exception:
                prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == t]
            if devs:
                for d in prefs.devices:
                    d.use = d.type == t
                scene.cycles.device = 'GPU'
                print('GPU:', t, [d.name for d in devs])
                return
        except Exception as e:
            print('gpu', t, e)
    scene.cycles.device = 'CPU'


setup_gpu()

if MODE == 'test':
    bpy.context.view_layer.update()
    print('TOTAL', total, 'DIST', dist)
    for ob in COL.objects:
        if ob.type in ('MESH', 'LIGHT', 'CAMERA'):
            bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box] if ob.type == 'MESH' else [ob.matrix_world.translation]
            mn = [round(min(v[k] for v in bb), 3) for k in range(3)]
            mx = [round(max(v[k] for v in bb), 3) for k in range(3)]
            print('OBJ', ob.name, ob.type, mn, mx)

if MODE == 'full':
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(MODEL_DIR, f'emporio_{KIND}.blend'))
    try:
        bpy.ops.export_scene.gltf(filepath=os.path.join(MODEL_DIR, f'emporio_{KIND}.glb'), export_format='GLB')
    except Exception as e:
        print('GLB falhou:', e)


def render_to(path):
    r.filepath = path
    bpy.ops.render.render(write_still=True)


def build_sheet(frames, cols, rows, w, h, out_path):
    W, Hh = cols * w, rows * h
    big = np.zeros((Hh, W, 4), np.float32)
    for idx, p in enumerate(frames):
        img = bpy.data.images.load(p)
        px = np.empty(w * h * 4, np.float32)
        img.pixels.foreach_get(px)
        px = px.reshape(h, w, 4)
        rr, cc = divmod(idx, cols)
        y0 = (rows - 1 - rr) * h
        big[y0:y0 + h, cc * w:(cc + 1) * w, :] = px
        bpy.data.images.remove(img)
    im = bpy.data.images.new('sheet', W, Hh, alpha=True)
    im.pixels.foreach_set(big.ravel())
    im.filepath_raw = out_path
    im.file_format = 'WEBP'
    try:
        im.save(quality=86)
    except TypeError:
        im.save()
    bpy.data.images.remove(im)


N = 36
frames_idx = [0, 4, 9] if MODE == 'test' else list(range(N))
for fin, mat in TOPS.items():
    assign(top, mat)
    files = []
    for i in frames_idx:
        T.rotation_euler = (0, 0, math.radians(i * 360 / N))
        p = os.path.join(OUT, f'{KIND}_{fin}_{i:02d}.png')
        render_to(p)
        files.append(p)
    if MODE == 'full':
        build_sheet(files, 6, 6, 540, 900, os.path.join(OUT, f'giro_{fin}.webp'))

    # still de card (3/4, diagonal)
    T.rotation_euler = (0, 0, math.radians(-32))
    bpy.context.view_layer.update()
    tgt = G.matrix_world @ Vector((0, L * 0.62, 0))
    cam_c = bpy.data.objects.get('CamCard')
    if cam_c is None:
        cd = bpy.data.cameras.new('CamCard'); cd.lens = 50
        cam_c = bpy.data.objects.new('CamCard', cd); COL.objects.link(cam_c)
    cam_c.location = tgt + Vector((0.05 * span, -1.05 * span * (0.72 if KIND == 'dread' else 0.95), 0.18 * span))
    q = (tgt - cam_c.location).to_track_quat('-Z', 'Y')
    cam_c.rotation_mode = 'QUATERNION'
    cam_c.rotation_quaternion = q @ Quaternion((0, 0, 1), math.radians(-34))
    scene.camera = cam_c
    r.resolution_x, r.resolution_y = 960, 600
    p = os.path.join(OUT, f'card_{fin}.png')
    render_to(p)
    if MODE == 'full':
        build_sheet([p], 1, 1, 960, 600, os.path.join(OUT, f'card_{fin}.webp'))
    scene.camera = cam
    r.resolution_x, r.resolution_y = 540, 900

print('PRONTO', KIND, MODE)
