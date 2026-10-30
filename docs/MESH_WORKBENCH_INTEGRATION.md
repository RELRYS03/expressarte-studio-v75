# Mesh Workbench adapter — stage 0 (runtime readiness)

This branch begins the integration without replacing the current Manifold worker or Blender bridge.

## What is added

`scripts/mesh_workbench_adapter.py` is a read-only readiness probe. It checks:
- Python 3.11 or newer;
- the installed `mesh-workbench` package and CLI;
- the Blender executable (PATH or `EXPRESSARTE_BLENDER_EXE`);
- whether both CLI help and Blender version commands execute.

It does not install dependencies, change Blender settings, edit models, or call a hosted service.

## Install upstream runtime on Windows

Use a separate checkout and virtual environment. Keep it outside the Studio repository:

```powershell
py -3.11 -m venv "$env:USERPROFILE\mesh-workbench-venv"
& "$env:USERPROFILE\mesh-workbench-venv\Scripts\Activate.ps1"
git clone https://github.com/shakystar/mesh-workbench.git "$env:USERPROFILE\mesh-workbench"
Set-Location "$env:USERPROFILE\mesh-workbench"
python -m pip install -e .
```

Ensure Blender 5.2.2 LTS is installed. Set its executable for this PowerShell session if it is not on PATH:

```powershell
$env:EXPRESSARTE_BLENDER_EXE = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
$env:PATH = "$env:USERPROFILE\mesh-workbench-venv\Scripts;$env:PATH"
Set-Location <STUDIO_REPOSITORY_PATH>
python scripts\mesh_workbench_adapter.py
```

The final command emits JSON. Exit code 0 means the local runtime is ready for the next integration stage; exit code 2 means one or more prerequisites are missing.

## Integration boundary

Mesh Workbench is a local Blender CLI, not an MCP server or hosted API. The next stage must wrap selected operations behind a local-only bridge, with strict input/output paths, timeouts, source hashes, audit receipts, and no silent source replacement. The current Express'Arte Blender bridge on port 8766 and Manifold WASM worker remain unchanged.

## Not yet implemented

- No UI buttons or Mesh Workbench operations are exposed in Studio yet.
- No STL repair is claimed.
- No STL/3MF export behavior is changed.
- No user model has been processed by this probe.
- Windows execution and real STL/Bambu Studio validation remain required before merging.
