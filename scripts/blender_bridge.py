"""Local-only Blender bridge for Express'Arte Studio STL operations."""

import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent.parent
WORKER = ROOT / "scripts" / "blender_worker.py"
EXPRESSINHO_WORKER = ROOT / "scripts" / "expressinho_worker.py"
BLENDER = Path(os.environ.get(
    "EXPRESSARTE_BLENDER_EXE",
    r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
))
HOST = "127.0.0.1"
PORT = 8766
ALLOWED_ORIGINS = {
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
}
MAX_STL = 20 * 1024 * 1024
MAX_BODY = 50 * 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    server_version = "ExpressArteBlenderBridge/1.0"

    def _origin_ok(self):
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        return host in {f"127.0.0.1:{PORT}", f"localhost:{PORT}"} and (not origin or origin in ALLOWED_ORIGINS)

    def _json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
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
        if not self._origin_ok():
            self._json(403, {"error": "Origem local não autorizada."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", ""))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        if not self._origin_ok():
            self._json(403, {"error": "Acesso permitido somente ao Studio local."})
            return
        if self.path != "/v1/health":
            self._json(404, {"error": "Rota inexistente."})
            return
        self._json(200, {
            "available": BLENDER.is_file(),
            "blender": str(BLENDER) if BLENDER.is_file() else None,
            "version": "5.2",
        })

    def do_POST(self):
        if not self._origin_ok():
            self._json(403, {"error": "Origem local não autorizada."})
            return
        if self.path == "/v1/create-keychain":
            self._create_keychain()
            return
        if self.path != "/v1/edit":
            self._json(404, {"error": "Rota inexistente."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                raise ValueError("O envio excede o limite de 50 MB.")
            payload = json.loads(self.rfile.read(length))
            operation = payload.get("operation")
            if operation not in {"cut", "union"}:
                raise ValueError("Operação não permitida.")
            if not BLENDER.is_file() or not WORKER.is_file():
                raise ValueError("Blender 5.2 ou worker não encontrado.")
            first = base64.b64decode(payload["modelBase64"], validate=True)
            if len(first) > MAX_STL:
                raise ValueError("O modelo principal excede 20 MB.")
            second = b""
            if operation == "union":
                second = base64.b64decode(payload["otherStlBase64"], validate=True)
                if len(second) > MAX_STL:
                    raise ValueError("O segundo STL excede 20 MB.")
            axis = payload.get("axis", "x")
            if axis not in {"x", "y", "z"}:
                raise ValueError("Eixo de corte inválido.")
            offset = float(payload.get("offset", 0))
            if not (-2000 <= offset <= 2000):
                raise ValueError("Posição de corte fora do limite.")
            keep_positive = payload.get("keepPositive") is True
            with tempfile.TemporaryDirectory(prefix="expressarte-blender-") as directory:
                work = Path(directory)
                source = work / "entrada.stl"
                operand = work / "parte.stl"
                output = work / "resultado.stl"
                source.write_bytes(first)
                if second:
                    operand.write_bytes(second)
                command = [
                    str(BLENDER), "--background", "--factory-startup", "--python", str(WORKER), "--",
                    operation, str(source), str(operand), str(output), axis, str(offset), str(keep_positive).lower(),
                ]
                result = subprocess.run(command, capture_output=True, text=True, timeout=240, check=False)
                if result.returncode or not output.is_file() or output.stat().st_size <= 84:
                    print("Blender bridge job failed:", result.stderr[-3000:], flush=True)
                    raise RuntimeError("O Blender não conseguiu concluir a operação na malha.")
                if output.stat().st_size > MAX_STL:
                    raise ValueError("O STL de saída excede o limite de 20 MB.")
                encoded = base64.b64encode(output.read_bytes()).decode("ascii")
            self._json(200, {"ok": True, "operation": operation, "stlBase64": encoded})
        except (ValueError, KeyError, json.JSONDecodeError) as error:
            self._json(400, {"error": str(error)})
        except subprocess.TimeoutExpired:
            self._json(504, {"error": "O Blender excedeu 4 minutos nesta operação."})
        except Exception as error:
            print("Blender bridge error:", repr(error), flush=True)
            self._json(500, {"error": str(error) or "Falha na operação do Blender."})

    def _create_keychain(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 2 or size > 8192:
                raise ValueError("Pedido invalido ou muito extenso.")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict) or set(data) - {"kind", "widthMm", "shape", "name"}:
                raise ValueError("Campos nao permitidos.")
            if data.get("kind") != "chaveiro":
                raise ValueError("Nesta etapa, somente chaveiro esta disponivel.")
            shape = data.get("shape")
            if shape not in ("circulo", "coracao"):
                raise ValueError("Escolha circulo ou coracao.")
            width = data.get("widthMm")
            if isinstance(width, bool) or not isinstance(width, (int, float)) or not 30 <= width <= 150:
                raise ValueError("Largura entre 30 e 150 mm.")
            name = data.get("name", "")
            if not isinstance(name, str) or len(name) > 30 or any(ord(c)<32 for c in name):
                raise ValueError("Nome invalido.")
            if not BLENDER.is_file() or not EXPRESSINHO_WORKER.is_file():
                raise ValueError("Blender ou executor Expressinho nao encontrado.")
            with tempfile.TemporaryDirectory(prefix="expressinho-chaveiro-") as temp:
                work = Path(temp)
                spec = work / "plano.json"
                stl = work / "chaveiro.stl"
                blend = work / "chaveiro.blend"
                spec.write_text(json.dumps({"kind":"chaveiro","widthMm":width,"shape":shape,"name":name}),encoding="utf-8")
                cmd = [str(BLENDER), "--background", "--factory-startup", "--python",
                       str(EXPRESSINHO_WORKER), "--", str(spec), str(stl), str(blend)]
                completed = subprocess.run(cmd, capture_output=True, text=True, timeout=180, check=False)
                if completed.returncode or not stl.is_file() or not blend.is_file():
                    print("Expressinho worker error:", completed.stderr[-2500:], flush=True)
                    raise RuntimeError("Blender nao conseguiu gerar o chaveiro.")
                if stl.stat().st_size > MAX_STL or blend.stat().st_size > MAX_STL:
                    raise ValueError("Arquivo gerado maior que 20 MB.")
                self._json(200, {"ok": True, "stlBase64": base64.b64encode(stl.read_bytes()).decode("ascii"),
                                 "blendBase64": base64.b64encode(blend.read_bytes()).decode("ascii"),
                                 "message":"Chaveiro gerado. Abra o .blend para editar objetos separados."})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            self._json(400, {"error": str(error)})
        except subprocess.TimeoutExpired:
            self._json(504, {"error": "Tempo limite de criacao atingido."})
        except Exception as error:
            print("Expressinho keychain error:", repr(error), flush=True)
            self._json(500, {"error": str(error) or "Falha na criacao local."})

    def log_message(self, message, *args):
        print(f"[{self.log_date_time_string()}] {message % args}", flush=True)


if __name__ == "__main__":
    if not BLENDER.is_file():
        raise SystemExit(f"Blender não encontrado: {BLENDER}\nDefina EXPRESSARTE_BLENDER_EXE para apontar ao executável.")
    print(f"Express'Arte Blender Bridge ativo em http://{HOST}:{PORT}", flush=True)
    print("Apenas localhost; origens autorizadas: " + ", ".join(sorted(ALLOWED_ORIGINS)), flush=True)
    print("Ctrl+C encerra o serviço.", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
