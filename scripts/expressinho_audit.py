"""Auditoria geometrica local para STL. Executado em Blender --background.

Nunca executa scripts, comandos ou instrucoes embutidas no arquivo do usuario.
Dados de malha sao somente lidos; reparo automatico nao e aplicado.
"""
import json
import sys
import math
import bpy
import bmesh

def inspect(path):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.stl_import(filepath=path, use_mesh_validate=True)
    objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not objects:
        raise ValueError("Nenhuma malha encontrada.")
    totals = {"vertices":0,"triangles":0,"boundary_edges":0,"non_manifold_edges":0,
              "loose_edges":0,"wire_vertices":0,"connected_parts":0}
    all_dimensions = []
    for obj in objects:
        me=obj.data
        bm=bmesh.new()
        try:
            bm.from_mesh(me)
            bm.verts.ensure_lookup_table()
            bm.verts.index_update()
            totals["vertices"] += len(bm.verts)
            totals["triangles"] += sum(max(0,len(face.verts)-2) for face in bm.faces)
            totals["boundary_edges"] += sum(1 for e in bm.edges if e.is_boundary)
            totals["non_manifold_edges"] += sum(1 for e in bm.edges if not e.is_manifold)
            totals["loose_edges"] += sum(1 for e in bm.edges if e.is_wire)
            totals["wire_vertices"] += sum(1 for v in bm.verts if not v.link_edges)
            seen=set()
            for v in bm.verts:
                if v.index in seen: continue
                totals["connected_parts"] += 1
                todo=[v]
                seen.add(v.index)
                while todo:
                    current=todo.pop()
                    for edge in current.link_edges:
                        nxt=edge.other_vert(current)
                        if nxt.index not in seen:
                            seen.add(nxt.index)
                            todo.append(nxt)
        finally:
            bm.free()
        all_dimensions += [tuple(obj.matrix_world @ v.co) for v in me.vertices]
    if not all_dimensions:
        raise ValueError("Malha vazia.")
    dims=[round(max(p[i] for p in all_dimensions)-min(p[i] for p in all_dimensions),3) for i in range(3)]
    warnings=[]
    if totals["boundary_edges"]: warnings.append("Malha aberta: existem bordas sem faces de fechamento.")
    if totals["non_manifold_edges"] > totals["boundary_edges"]:
        warnings.append("Ha conexoes nao-manifold que precisam de revisao.")
    if totals["loose_edges"] or totals["wire_vertices"]:
        warnings.append("Ha arestas ou vertices soltos.")
    if totals["connected_parts"] > 1:
        warnings.append("Existem componentes separados; verificar se devem ser unidos para imprimir.")
    if min(dims) < 1.2:
        warnings.append("Pelo menos uma dimensao geral esta abaixo de 1,2 mm; conferir orientacao e espessuras.")
    if totals["triangles"] > 400000:
        warnings.append("Malha muito densa; considere simplificacao antes de editar.")
    if not warnings:
        warnings.append("Nenhuma anomalia basica detectada; a imprimibilidade ainda depende de outras verificacoes.")
    return {"version":1,"units":"mm (STL sem metadados de unidade; assumidos mm)",
            "dimensionsMm":{"x":dims[0],"y":dims[1],"z":dims[2]},
            "objects":len(objects),"geometry":totals,
            "closedByEdgeTopology":totals["non_manifold_edges"] == 0,
            "readyForPrinting":None,
            "warnings":warnings,
            "limitations":"Nao mede espessura local, auto-intersecoes nem qualidade das normais; revisar no Bambu Studio."}

if __name__=="__main__":
    args=sys.argv[sys.argv.index("--")+1:]
    report=inspect(args[0])
    with open(args[1],"w",encoding="utf-8") as file:
        json.dump(report,file,ensure_ascii=False,indent=2,allow_nan=False)
    print("EXPRESSINHO_AUDIT_OK",flush=True)
