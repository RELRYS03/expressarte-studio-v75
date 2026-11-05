"""Local-only Mesh Workbench inspection bridge for Express'Arte Studio.

Runs the upstream Mesh Workbench CLI in an isolated temporary directory.
Only accepts a bounded STL upload and a fixed inspect recipe; never accepts
arbitrary recipes, paths, Python, or shell commands from the browser.
"""
from __future__ import annotations

import base64
import json
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8767
MAX_STL = 20 * 1024 * 1024
MAX_BODY = 30 * 1024 * 1024
ALLOWED_ORIGINS = {
    "http://127.0.0.1:4173", "http://localhost:4173",
    "http://127.0.0.1:5173", "http://localhost:5173",
}
BLENDER = os.environ.get("EXPRESSARTE_BLENDER_EXE") or shutil.which("blender")
MESH_CLI = shutil.which("mesh-workbench")


class Handler(BaseHTTPRequestHandler):
    server_version = "ExpressArteMeshWorkbenchBridge/1.0"

    def _allowed(self):
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        return host in {f"127.0.0.1:{PORT}", f"localhost:{PORT}"} and (
            not origin or origin in ALLOWED_ORIGINS
        )

    def _json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if not self._allowed():
            self._json(403, {"error": "Origem local não autorizada."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", ""))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if not self._allowed():
            self._json(403, {"error": "Acesso permitido somente ao Studio local."})
            return
        if self.path != "/v1/health":
            self._json(404, {"error": "Rota inexistente."})
            return
        self._json(200, {
            "available": bool(MESH_CLI and BLENDER),
            "meshWorkbench": bool(MESH_CLI),
            "blender": bool(BLENDER),
        })

    def do_POST(self):
        if not self._allowed():
            self._json(403, {"error": "Origem local não autorizada."})
            return
        if self.path != "/v1/inspect":
            self._json(404, {"error": "Rota inexistente."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("Envio inválido ou acima de 30 MB.")
            payload = json.loads(self.rfile.read(length))
            if not MESH_CLI or not BLENDER:
                raise ValueError(
                    "Mesh Workbench ou Blender não encontrado. Instale o runtime e reinicie a ponte."
                )
            encoded = payload.get("stlBase64")
            if not isinstance(encoded, str):
                raise ValueError("STL não enviado.")
            raw = base64.b64decode(encoded, validate=True)
            if len(raw) <= 84 or len(raw) > MAX_STL:
                raise ValueError("O STL deve ter entre 85 bytes e 20 MB.")

            with tempfile.TemporaryDirectory(prefix="expressarte-mw-") as tmp:
                root = Path(tmp)
                (root / "input.stl").write_bytes(raw)
                recipe = {
                    "version": 1,
                    "operations": [
                        {"op": "load_mesh", "path": "input.stl", "prefix": "expressarte_"},
                        {"op": "inspect", "object": "expressarte_input"},
                    ],
                }
                (root / "recipe.json").write_text(
                    json.dumps(recipe), encoding="utf-8"
                )
                output = root / "output"
                command = [
                    MESH_CLI, "run", str(root / "recipe.json"),
                    "--output", str(output), "--blender", BLENDER,
                ]
                try:
                    result = subprocess.run(
                        command, capture_output=True, text=True,
                        timeout=180, check=False, cwd=root,
                    )
                except subprocess.TimeoutExpired:
                    self._json(504, {"error": "Diagnóstico excedeu 3 minutos."})
                    return
                audit_path = output / "audit.json"
                if result.returncode != 0 or not audit_path.is_file():
                    detail = result.stderr.strip()[-1200:] or result.stdout.strip()[-1200:]
                    self._json(422, {
                        "error": "Mesh Workbench não conseguiu inspecionar esta malha.",
                        "detail": detail,
                    })
                    return
                audit = json.loads(audit_path.read_text(encoding="utf-8"))
                if audit.get("status") != "complete":
                    self._json(422, {"error": "Diagnóstico incompleto; arquivo original preservado."})
                    return
                operations = audit.get("operations", [])
                inspection = next(
                    (item.get("result") for item in operations if item.get("op") == "inspect"),
                    None,
                )
                if not isinstance(inspection, dict):
                    self._json(422, {"error": "O diagnóstico não retornou métricas da malha."})
                    return
                self._json(200, {
                    "ok": True,
                    "engine": "Mesh Workbench",
                    "blender": audit.get("blender"),
                    "inspection": inspection,
                    "sourcePreserved": audit.get("source_preserved") is True,
                })
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self._json(400, {"error": str(error)})
        except Exception as error:
            self._json(500, {"error": str(error) or "Falha no diagnóstico local."})

    def log_message(self, message, *args):
        print(f"[{self.log_date_time_string()}] {message % args}", flush=True)


if __name__ == "__main__":
    if not MESH_CLI:
        raise SystemExit("mesh-workbench CLI não encontrado no PATH.")
    if not BLENDER or not Path(BLENDER).is_file():
        raise SystemExit("Blender não encontrado; configure EXPRESSARTE_BLENDER_EXE.")
    print(f"Express'Arte Mesh Workbench ativo em http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
