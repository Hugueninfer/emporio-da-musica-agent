# Exporta o violão/ukulele para a web (three.js): assa as madeiras procedurais em texturas
# e gera um .glb leve + as texturas extras de tampo (spruce, sunburst).
# Uso: blender -b -P exportar_web.py -- <dread|uke> <pasta_saida>
import os
import sys

argv = sys.argv[sys.argv.index('--') + 1:]
KIND_ARG, OUT_DIR = argv[0], os.path.abspath(argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.path.join(OUT_DIR, '_tmp')
os.makedirs(TMP, exist_ok=True)

# Reconstrói a cena com o próprio violao.py, parando antes da parte de render.
src = open(os.path.join(HERE, 'violao.py'), encoding='utf-8').read()
sys.argv = ['blender', '--', KIND_ARG, TMP, TMP, 'web']
exec(compile(src[:src.index('def render_to')], 'violao.py', 'exec'))

import bpy  # noqa: E402  (já importado pelo violao.py; explícito para leitura)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 8
scene.cycles.use_denoising = False
scene.render.bake.margin = 8

WOOD_SIZE = {'Tampo': 2048, 'Corpo': 2048, 'Braco': 1024, 'Mao': 1024, 'Escala': 1024, 'Cavalete': 512, 'Escudo': 1024}


def is_wood(mat):
    return mat is not None and mat.use_nodes and any(n.type == 'TEX_WAVE' for n in mat.node_tree.nodes)


def uv_unwrap(ob):
    activate(ob)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def bake_color(ob, mat, size, name):
    """Assa a cor base (sem luz) do material procedural na UV do objeto."""
    img = bpy.data.images.new(name, size, size, alpha=False)
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.nodes.active = tex
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    activate(ob)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_clear=True, margin=8)
    nt.nodes.remove(tex)
    path = os.path.join(TMP, f'{name}.png')
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img


def baked_material(src_mat, img, name):
    """Principled simples: textura assada + rugosidade/verniz do material original."""
    b0 = src_mat.node_tree.nodes.get('Principled BSDF')
    m, nt, b = new_mat(name)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    for k in ('Roughness', 'Coat Weight', 'Coat Roughness', 'Metallic'):
        if k in b0.inputs and k in b.inputs:
            b.inputs[k].default_value = b0.inputs[k].default_value
    return m


# 1) Madeiras: UV + bake por objeto (cada objeto tem sua UV, logo sua textura).
woods = [o for o in COL.objects if o.type == 'MESH' and is_wood(o.active_material)]
print('MADEIRAS', [o.name for o in woods])
for ob in woods:
    uv_unwrap(ob)
    size = next((v for k, v in WOOD_SIZE.items() if ob.name.startswith(k)), 512)
    src_mat = ob.active_material
    if ob == top:
        # Assa todos os tampos na mesma UV; o .glb leva o primeiro, os outros vão como textura extra.
        imgs = {fin: bake_color(ob, mat, size, f'tampo_{fin}') for fin, mat in TOPS.items()}
        first = list(TOPS)[0]
        new = baked_material(TOPS[first], imgs[first], 'Tampo')
        settings = scene.render.image_settings
        settings.file_format = 'JPEG'
        settings.color_mode = 'RGB'
        settings.quality = 88
        for fin, img in imgs.items():
            if fin == first:
                continue
            img.reload()
            img.save_render(os.path.join(OUT_DIR, f'tampo_{fin}.jpg'), scene=scene)
    else:
        img = bake_color(ob, src_mat, size, f'{ob.name}_cor')
        new = baked_material(src_mat, img, f'{src_mat.name}_web')
    ob.data.materials.clear()
    ob.data.materials.append(new)
top.name = 'Tampo'

# 2) Junta peças pequenas por material (menos draw calls na web).
by_mat = {}
for o in [o for o in COL.objects if o.type == 'MESH' and o not in woods]:
    by_mat.setdefault(o.active_material.name, []).append(o)
for name, obs in by_mat.items():
    if len(obs) < 2:
        continue
    for o in COL.objects:
        o.select_set(False)
    for o in obs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.join()
    obs[0].name = name

# 3) Só o instrumento vai pro .glb (sem luzes, câmera nem mundo).
for o in list(COL.objects):
    if o.type in ('LIGHT', 'CAMERA'):
        bpy.data.objects.remove(o, do_unlink=True)
T.rotation_euler = (0, 0, 0)

out = os.path.join(OUT_DIR, 'violao.glb' if KIND == 'dread' else 'ukulele.glb')
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format='GLB',
    export_cameras=False,
    export_lights=False,
    export_image_format='JPEG',
    export_jpeg_quality=88,
    export_apply=True,
)
print('EXPORTADO', out, os.path.getsize(out))
