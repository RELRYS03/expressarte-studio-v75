"""Executor local e restrito: gera chaveiro parametrico em objetos editaveis.
Executado somente pelo Blender em segundo plano; nao recebe codigo Python do usuario.
"""
import json
import math
import sys
import bpy
from mathutils import Vector

def build_outline(shape, width):
    if shape == "coracao":
        pts = []
        for i in range(160):
            t = 2 * math.pi * i / 160
            x = 16 * math.sin(t) ** 3
            y = 13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t)
            pts.append((x,y))
        xs = [x for x,y in pts]
        ys = [y for x,y in pts]
        scale = width / (max(xs)-min(xs))
        return [((x-(max(xs)+min(xs))/2)*scale, (y-(max(ys)+min(ys))/2)*scale) for x,y in pts]
    radius = width / 2
    return [(radius*math.cos(2*math.pi*i/128),radius*math.sin(2*math.pi*i/128)) for i in range(128)]

def plate(name, outline, depth):
    n=len(outline)
    vertices=[(x,y,0) for x,y in outline]+[(x,y,depth) for x,y in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    return obj

def create(payload, output_stl, output_blend):
    kind=payload["kind"]
    width=float(payload["widthMm"])
    name=payload.get("name","")[:30]
    if kind != "chaveiro" or not 30 <= width <= 150:
        raise ValueError("Este primeiro executor aceita somente chaveiros entre 30 e 150 mm.")
    shape=payload["shape"]
    if shape not in ("circulo","coracao"):
        raise ValueError("Forma invalida.")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    depth=3.5
    outline=build_outline(shape,width)
    base=plate("01_Base_editavel",outline,depth)
    base["expressinho_tipo"]="base"
    highest=max(y for x,y in outline)
    # Sobreposicao fisica na parte superior para garantir contato com a base.
    outer=width*.11
    minor=max(2.0,width*.024)
    bpy.ops.mesh.primitive_torus_add(major_radius=outer-minor,minor_radius=minor,
        major_segments=64,minor_segments=16,location=(0,highest+outer*.45,depth/2))
    loop=bpy.context.object
    loop.name="02_Argola_editavel"
    loop["expressinho_tipo"]="argola"
    # Texto permanece objeto de texto Blender, editavel no .blend.
    if name:
        curve=bpy.data.curves.new("Nome_editavel","FONT")
        curve.body=name
        curve.align_x="CENTER"
        curve.align_y="CENTER"
        curve.size=width*.095
        curve.extrude=.55
        curve.bevel_depth=.05
        obj=bpy.data.objects.new("03_Texto_editavel",curve)
        bpy.context.collection.objects.link(obj)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.update()
        # Escala proporcional se o nome ultrapassar a largura util.
        bpy.context.view_layer.update()
        if obj.dimensions.x > width*.70 and obj.dimensions.x>0:
            factor=width*.70/obj.dimensions.x
            obj.scale=(factor,factor,1)
        obj.location=(0,0,depth+.15)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    # STL de malhas; texto se converte somente na copia da cena usada para exportar.
    bpy.ops.object.select_all(action="SELECT")
    for obj in list(bpy.context.selected_objects):
        if obj.type=="FONT":
            bpy.context.view_layer.objects.active=obj
            bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.wm.stl_export(filepath=output_stl,ascii_format=False,export_selected_objects=True,
        global_scale=1.0,use_scene_unit=False,forward_axis="Y",up_axis="Z")
    print("EXPRESSINHO_GERADO",shape,width,flush=True)

if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:]
    with open(args[0],encoding="utf-8") as f:
        spec=json.load(f)
    create(spec,args[1],args[2])
