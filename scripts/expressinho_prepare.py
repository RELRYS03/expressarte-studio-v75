"""Preparacao de STL em Blender, sem geracao remota nem codigo vindo do usuario.

Operacoes restritas: flatten_bottom (corte + tampa) e decimate (reducao de malha).
Sempre opera sobre copia temporaria. As partes podem exigir revisao no fatiador.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from expressinho_prepare_specs import validate_spec
import bpy

def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def triangles(obj):
    return sum(max(0, len(face.vertices) - 2) for face in obj.data.polygons)

def main(spec_path, source_path, output_path, report_path):
    with open(spec_path, encoding="utf-8") as file:
        spec = validate_spec(json.load(file))
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.stl_import(filepath=source_path, use_mesh_validate=True)
    objs = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objs:
        raise ValueError("Nenhuma malha encontrada no STL.")
    before = sum(triangles(obj) for obj in objs)
    if not before:
        raise ValueError("A malha nao contem faces.")
    for obj in objs:
        activate(obj)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if spec["operation"] == "flatten_bottom":
            coords = [vertex.co.z for vertex in obj.data.vertices]
            if not coords:
                raise ValueError("Malha vazia.")
            floor = min(coords)
            ceiling = max(coords)
            cut = spec["cutMm"]
            if floor + cut >= ceiling - 0.1:
                raise ValueError("O corte solicitado ultrapassa a altura do modelo.")
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.mesh.bisect(
                plane_co=(0.0, 0.0, floor + cut), plane_no=(0.0, 0.0, 1.0),
                clear_inner=True, clear_outer=False, use_fill=True, threshold=0.0001)
            bpy.ops.object.mode_set(mode="OBJECT")
            if not obj.data.polygons:
                raise ValueError("O corte removeu toda a geometria.")
            # Coloca a base no plano Z=0 para facilitar a orientacao no fatiador.
            new_bottom = min(v.co.z for v in obj.data.vertices)
            for vertex in obj.data.vertices:
                vertex.co.z -= new_bottom
            obj.data.update()
        else:
            count = triangles(obj)
            if count > spec["targetFaces"]:
                modifier = obj.modifiers.new("Expressinho - Simplificar", type="DECIMATE")
                modifier.decimate_type = "COLLAPSE"
                modifier.ratio = max(0.0001, spec["targetFaces"] / count)
                bpy.ops.object.modifier_apply(modifier=modifier.name)
        if not obj.data.polygons:
            raise ValueError("A operacao nao produziu faces.")
    after = sum(triangles(obj) for obj in objs)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.wm.stl_export(
        filepath=output_path, ascii_format=False, export_selected_objects=True,
        global_scale=1.0, use_scene_unit=False, forward_axis="Y", up_axis="Z")
    report = {
        "operation": spec["operation"], "trianglesBefore": before, "trianglesAfter": after,
        "note": "Verifique dimensoes, fechamentos e paredes finas no Bambu Studio; operacao nao certifica imprimibilidade."
    }
    with open(report_path, "w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False)
    print("EXPRESSINHO_PREPARE_OK", spec["operation"], before, after, flush=True)

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    main(*args)
