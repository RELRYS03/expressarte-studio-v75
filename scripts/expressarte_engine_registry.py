"""Read-only hardware/runtime inventory for the Express'Arte local bridge.

No model downloads, GPU allocation, or external API calls are performed here.
"""
from pathlib import Path
import json
import os
import subprocess

DEFAULT_BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
DEFAULT_AI_PYTHON = r"C:\ExpressArte-AI\venv\Scripts\python.exe"


def choose_backend(gpu_names):
    """Choose one inference backend from Windows adapter names."""
    names = " ".join(str(name) for name in (gpu_names or [])).lower()
    if "nvidia" in names:
        return "cuda"
    if any(token in names for token in ("amd", "radeon", "intel", "arc")):
        return "directml"
    return "cpu"


def image3d_execution_mode(backend, vram_gb):
    """Avoid claiming local neural 3D support on unsupported/undersized GPUs."""
    if backend == "cuda" and vram_gb is not None and float(vram_gb) >= 6:
        return "local-cuda-candidate"
    return "remote-recommended"


def detect_windows_hardware():
    if os.name != "nt":
        return {"available": False, "gpus": [], "error": "Diagnóstico CIM disponível somente no Windows."}
    script = r"""
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [pscustomobject]@{
    name = $_.Name
    vramBytes = [int64]$_.AdapterRAM
    vramGB = [math]::Round(([double]$_.AdapterRAM / 1GB), 2)
    driverVersion = $_.DriverVersion
  }
})
$computer = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
[pscustomobject]@{
  gpus = $gpus
  ramGB = [math]::Round(($computer.TotalPhysicalMemory / 1GB), 2)
  cpu = $cpu.Name
} | ConvertTo-Json -Depth 4 -Compress
"""
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script],
            capture_output=True, text=True, timeout=12, check=False,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {"available": False, "gpus": [], "error": result.stderr[-1000:] or "CIM não retornou dados."}
        data = json.loads(result.stdout.strip())
        data["available"] = True
        if not isinstance(data.get("gpus"), list):
            data["gpus"] = [data["gpus"]] if data.get("gpus") else []
        return data
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        return {"available": False, "gpus": [], "error": str(error)}


def probe_onnx_runtime(python_executable):
    python_path = Path(python_executable)
    if not python_path.is_file():
        return {"available": False, "version": None, "providers": [], "error": "Python IA não encontrado."}
    code = (
        "import json, onnxruntime as ort; "
        "print(json.dumps({'version': ort.__version__, 'providers': ort.get_available_providers()}))"
    )
    try:
        result = subprocess.run(
            [str(python_path), "-c", code],
            capture_output=True, text=True, timeout=12, check=False,
        )
        if result.returncode != 0:
            return {"available": False, "version": None, "providers": [], "error": result.stderr[-1200:]}
        data = json.loads(result.stdout.strip().splitlines()[-1])
        data["available"] = True
        return data
    except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        return {"available": False, "version": None, "providers": [], "error": str(error)}


def build_engine_status(blender_executable=None, ai_python=None):
    blender_path = Path(blender_executable or os.environ.get("EXPRESSARTE_BLENDER_EXE", DEFAULT_BLENDER))
    python_path = Path(ai_python or os.environ.get("EXPRESSARTE_AI_PYTHON", DEFAULT_AI_PYTHON))
    hardware = detect_windows_hardware()
    gpus = hardware.get("gpus", [])
    backend = choose_backend([gpu.get("name", "") for gpu in gpus])
    vram_values = [float(gpu.get("vramGB") or 0) for gpu in gpus if gpu.get("vramGB") is not None]
    vram_gb = max(vram_values) if vram_values else None
    onnx = probe_onnx_runtime(python_path)
    providers = onnx.get("providers", [])
    blender_available = blender_path.is_file()
    dml_available = "DmlExecutionProvider" in providers
    image3d_mode = image3d_execution_mode(backend, vram_gb)

    engines = [
        {
            "id": "parametric-text-3d",
            "name": "Criação paramétrica por texto",
            "status": "ready",
            "execution": "Studio + Manifold",
            "reason": "Geração guiada de chaveiros, organizadores e boneco-base já existente na candidata.",
        },
        {
            "id": "blender-bpy",
            "name": "Blender 5.2 / bpy",
            "status": "ready" if blender_available else "missing",
            "execution": "blender-cli",
            "reason": str(blender_path) if blender_available else "Executável Blender não encontrado.",
        },
        {
            "id": "onnx-directml",
            "name": "ONNX Runtime DirectML",
            "status": "ready" if dml_available else "not-ready",
            "execution": "onnx",
            "reason": "DmlExecutionProvider disponível." if dml_available else (onnx.get("error") or "DmlExecutionProvider não está disponível neste venv."),
        },
        {
            "id": "birefnet-background-removal",
            "name": "BiRefNet",
            "status": "model-not-installed",
            "execution": "onnx-directml",
            "reason": "Runtime é verificado; pesos/artefato ONNX ainda precisam ser instalados e testados.",
        },
        {
            "id": "stable-fast-3d-image-to-3d",
            "name": "Stable Fast 3D",
            "status": "remote-only",
            "execution": "remote-worker",
            "reason": "Gera mesh UV-texturizada; exige GPU de aproximadamente 7 GB e licença Community condicional.",
        },
        {
            "id": "instantmesh-image-to-3d",
            "name": "InstantMesh",
            "status": "remote-only",
            "execution": "remote-worker",
            "reason": "Apache-2.0 no código/model card; exporta mapa UV, mas o upstream usa PyTorch/CUDA/xformers.",
        },
        {
            "id": "triposr-image-to-3d",
            "name": "TripoSR",
            "status": "remote-recommended" if image3d_mode == "remote-recommended" else "local-candidate",
            "execution": "isolated-worker",
            "reason": "AMD/DirectML não é o backend CUDA upstream; na RX 580 4 GB usar servidor compatível.",
        },
        {
            "id": "colmap-multiview",
            "name": "COLMAP",
            "status": "not-configured",
            "execution": "external-cli",
            "reason": "SfM/MVS por CPU é possível, mas o executável ainda não foi configurado no Windows.",
        },
        {
            "id": "swinir-upscale",
            "name": "SwinIR",
            "status": "model-not-installed",
            "execution": "onnx-directml",
            "reason": "Selecionar checkpoint Apache-2.0 e exportar/validar ONNX antes de ativar.",
        },
        {
            "id": "unirig-auto-rig",
            "name": "UniRig",
            "status": "remote-only",
            "execution": "remote-worker",
            "reason": "Modelo requer CUDA e GPU de alta memória; checkpoint MIT selecionado, dataset precisa de revisão.",
        },
        {
            "id": "shap-e-text-to-3d",
            "name": "Shap-E",
            "status": "not-configured",
            "execution": "isolated-worker",
            "reason": "Checkpoint e ambiente ainda não configurados; usar CPU/servidor, não prometer tempo real na RX 580.",
        },
        {
            "id": "multiview-3d",
            "name": "Reconstrução multi-view",
            "status": "remote-only",
            "execution": "remote-worker",
            "reason": "Modelos selecionados exigem GPU e memória acima do ambiente local.",
        },
        {
            "id": "pbr-diffusion",
            "name": "Geração PBR por difusão",
            "status": "license-review-required",
            "execution": "remote-worker",
            "reason": "Pesos Material Anything ainda precisam de liberação comercial documentada.",
        },
    ]

    return {
        "ok": True,
        "backend": {
            "selected": backend,
            "reason": {
                "cuda": "Adaptador NVIDIA detectado; requer PyTorch/CUDA compatíveis.",
                "directml": "Adaptador AMD/Intel detectado; usar ONNX Runtime DirectML.",
                "cpu": "Nenhum adaptador NVIDIA/AMD/Intel reconhecido; fallback CPU.",
            }[backend],
        },
        "hardware": hardware,
        "vramGB": vram_gb,
        "aiPython": {"path": str(python_path), "exists": python_path.is_file()},
        "onnxRuntime": onnx,
        "blender": {"path": str(blender_path), "available": blender_available, "expectedVersion": "5.2"},
        "engines": engines,
    }


def engine_catalog(status):
    return status.get("engines", [])
