"""Read-only readiness probe for the optional Mesh Workbench runtime.

This does not install software, modify Blender preferences, or alter user models.
Run from the Express'Arte Studio repository on Windows, macOS, or Linux.
"""
from __future__ import annotations

import importlib.metadata
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path


def command_output(command: list[str], timeout: int = 15) -> dict:
    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=timeout, check=False
        )
        return {
            "available": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout.strip()[-2000:],
            "stderr": result.stderr.strip()[-1000:],
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"available": False, "error": str(error)}


def main() -> int:
    blender = os.environ.get("EXPRESSARTE_BLENDER_EXE") or shutil.which("blender")
    mesh_cli = shutil.which("mesh-workbench")
    report = {
        "adapter": "mesh-workbench-readiness",
        "mode": "read-only",
        "python": sys.version.split()[0],
        "python_supported": sys.version_info >= (3, 11),
        "mesh_workbench": {"available": bool(mesh_cli), "executable": mesh_cli},
        "blender": {"available": bool(blender), "executable": blender},
    }
    try:
        report["mesh_workbench"]["version"] = importlib.metadata.version("mesh-workbench")
    except importlib.metadata.PackageNotFoundError:
        report["mesh_workbench"]["version"] = None
    if mesh_cli:
        report["mesh_workbench"]["cli"] = command_output([mesh_cli, "--help"])
    if blender:
        report["blender"]["version_check"] = command_output([blender, "--version"])
    report["ready_for_cli_integration"] = bool(
        report["python_supported"]
        and mesh_cli
        and report["mesh_workbench"]["cli"]["available"]
        and blender
        and report["blender"]["version_check"]["available"]
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ready_for_cli_integration"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
