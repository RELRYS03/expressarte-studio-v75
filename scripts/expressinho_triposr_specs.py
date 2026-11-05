"""Utilitarios leves para validar entrada antes de invocar o TripoSR local.

Este modulo nao instala dependencias, nao baixa modelos e nao usa a API do Tripo.
"""
import base64
import binascii
import os
from pathlib import Path

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}

def decode_image(payload):
    if not isinstance(payload, dict) or set(payload) != {"mimeType", "imageBase64"}:
        raise ValueError("Envie somente mimeType e imageBase64.")
    mime = payload.get("mimeType")
    image_b64 = payload.get("imageBase64")
    if mime not in ALLOWED_MIME or not isinstance(image_b64, str):
        raise ValueError("Use uma imagem PNG, JPG ou WebP.")
    if not 4 <= len(image_b64) <= (MAX_IMAGE_BYTES * 4 // 3 + 8):
        raise ValueError("Imagem deve ter ate 5 MB.")
    try:
        raw = base64.b64decode(image_b64, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("Imagem codificada invalida.") from None
    if not 16 <= len(raw) <= MAX_IMAGE_BYTES:
        raise ValueError("Imagem deve ter ate 5 MB.")
    valid = {
        "image/png": raw.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": raw.startswith(b"\xff\xd8\xff"),
        "image/webp": raw[:4] == b"RIFF" and raw[8:12] == b"WEBP",
    }
    if not valid[mime]:
        raise ValueError("O tipo da imagem nao corresponde ao arquivo.")
    return raw, ALLOWED_MIME[mime]

def local_config(env=None):
    values = os.environ if env is None else env
    directory = values.get("EXPRESSARTE_TRIPOSR_DIR", "").strip()
    python_exe = values.get("EXPRESSARTE_TRIPOSR_PYTHON", "").strip()
    device = values.get("EXPRESSARTE_TRIPOSR_DEVICE", "cuda:0").strip()
    if device not in {"cuda:0", "cpu"}:
        return {"configured": False, "message": "Dispositivo invalido; use cuda:0 ou cpu."}
    if not directory or not python_exe:
        return {"configured": False, "message": "TripoSR nao configurado. Primeiro confira a GPU e instale o modelo num ambiente Python isolado."}
    runner = Path(directory).expanduser().resolve() / "run.py"
    interpreter = Path(python_exe).expanduser().resolve()
    if not runner.is_file() or not interpreter.is_file():
        return {"configured": False, "message": "Nao encontrei o run.py ou o Python informado nas variaveis de ambiente."}
    return {
        "configured": True,
        "message": "Caminhos encontrados; dependencias, GPU e pesos ainda precisam passar no teste real.",
        "runner": str(runner), "interpreter": str(interpreter),
        "cwd": str(runner.parent), "device": device,
    }
