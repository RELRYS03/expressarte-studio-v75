import bpy
import sys


def arg(index):
    return sys.argv[sys.argv.index("--") + index]


operation = arg(1)
first_path = arg(2)
second_path = arg(3)
output_path = arg(4)
axis = arg(5)
offset = float(arg(6))
keep_positive = arg(7) == "true"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.stl_import(filepath=first_path, use_mesh_validate=True)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("O STL principal não contém uma malha válida.")
target = meshes[0]

if operation == "union":
    bpy.ops.wm.stl_import(filepath=second_path, use_mesh_validate=True)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) < 2:
        raise RuntimeError("O segundo STL não contém uma malha válida.")
    target, operand = meshes[0], meshes[-1]
    for obj in (target, operand):
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    modifier = target.modifiers.new(name="ExpressArte Boolean Union", type="BOOLEAN")
    modifier.operation = "UNION"
    modifier.solver = "EXACT"
    modifier.object = operand
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(operand, do_unlink=True)
elif operation == "cut":
    axis_index = {"x": 0, "y": 1, "z": 2}[axis]
    plane_co = [0.0, 0.0, 0.0]
    plane_no = [0.0, 0.0, 0.0]
    plane_co[axis_index] = offset
    plane_no[axis_index] = 1.0
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.bisect(
        plane_co=plane_co,
        plane_no=plane_no,
        clear_inner=keep_positive,
        clear_outer=not keep_positive,
        use_fill=True,
        threshold=0.0001,
    )
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode="OBJECT")
else:
    raise RuntimeError("Operação não permitida.")

if len(target.data.polygons) == 0:
    raise RuntimeError("A operação não produziu faces.")
target.data.validate(verbose=False, clean_customdata=True)
bpy.ops.object.select_all(action="DESELECT")
target.select_set(True)
bpy.context.view_layer.objects.active = target
bpy.ops.wm.stl_export(
    filepath=output_path,
    ascii_format=False,
    export_selected_objects=True,
    global_scale=1.0,
    use_scene_unit=False,
    forward_axis="Y",
    up_axis="Z",
)
print("EXPRESSARTE_RESULT", operation, len(target.data.polygons))
