"""Verifica tarefas Tripo v3 ou cria uma NOVA somente com autorização explícita.

Sem dependências externas (roda com Python 3 no PowerShell ou com o Python do Blender).
NUNCA inclua chaves de API neste arquivo.
"""
import argparse
import json
import os
import re
import time
from urllib import error, request

API_BASE = "https://openapi.tripo3d.ai/v3"
VALID_TASK = re.compile(r"task_[A-Za-z0-9_-]{3,120}\Z")
MAX_POLLS = 120
POLL_SECONDS = 5


def api_call(key, path, payload=None):
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = request.Request(API_BASE + path, headers=headers, data=data,
                          method="POST" if data is not None else "GET")
    try:
        with request.urlopen(req, timeout=35) as response:
            result = json.load(response)
    except error.HTTPError as exc:
        raise RuntimeError(f"Tripo HTTP {exc.code}; confira a chave, o saldo e a conta.") from None
    except (error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"Conexão com Tripo indisponível: {exc}") from None
    if not isinstance(result, dict) or result.get("code") != 0:
        message = result.get("message", "Resposta inválida") if isinstance(result, dict) else "Resposta inválida"
        raise RuntimeError(f"Tripo API recusou a solicitação: {message}")
    data = result.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("A API não retornou o objeto 'data'.")
    return data


def monitor(key, task_id):
    if not VALID_TASK.fullmatch(task_id):
        raise ValueError("ID inválido: use o identificador 'task_...' fornecido pela API.")
    for attempt in range(MAX_POLLS):
        task = api_call(key, "/tasks/" + task_id)
        status = task.get("status", "unknown")
        progress = task.get("progress", 0)
        print(f"Status: {status} — Progresso: {progress}%", flush=True)
        if status == "success":
            output = task.get("output") or {}
            url = output.get("model_url") if isinstance(output, dict) else None
            if not url:
                raise RuntimeError("A tarefa terminou, mas não devolveu output.model_url.")
            print("Modelo pronto. Baixe o GLB logo: o link pode expirar.")
            print("GLB:", url)
            return url
        if status in ("failed", "cancelled", "banned", "expired"):
            raise RuntimeError(f"Tripo encerrou a tarefa: {status}.")
        if attempt != MAX_POLLS - 1:
            time.sleep(POLL_SECONDS)
    raise TimeoutError(f"Consulta encerrada após {MAX_POLLS * POLL_SECONDS} segundos. "
                       f"Guarde o ID {task_id} e consulte novamente; não gere outra tarefa.")


def main():
    parser = argparse.ArgumentParser(description="Consultar Tripo v3 sem gasto, ou gerar somente com autorização.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--task-id", help="Consulta tarefa existente, sem criar nem cobrar outra.")
    group.add_argument("--generate", action="store_true", help="Solicita UMA NOVA geração (pode consumir créditos).")
    parser.add_argument("--prompt", help="Descrição de novo modelo 3D (exigida com --generate).")
    parser.add_argument("--confirm-credits", action="store_true",
                        help="Confirma expressamente a geração sujeita a créditos.")
    args = parser.parse_args()
    key = os.environ.get("TRIPO_API_KEY", "").strip()
    if not key:
        parser.error("Configure uma chave Tripo API NOVA em TRIPO_API_KEY, apenas no seu computador.")
    if args.task_id:
        monitor(key, args.task_id)
        return
    if not args.confirm_credits:
        parser.error("Não gere tarefas pagas sem adicionar explicitamente --confirm-credits.")
    if not args.prompt or not 5 <= len(args.prompt.strip()) <= 1024:
        parser.error("Informe --prompt com uma descrição de 5 a 1024 caracteres.")
    balance = api_call(key, "/account/balance").get("balance")
    if not isinstance(balance, (int, float)) or balance <= 0:
        parser.error("A conta Tripo API está sem saldo. Nenhuma tarefa foi criada.")
    print("Criando UMA tarefa de texto→3D (pode cobrar créditos)...", flush=True)
    created = api_call(key, "/generation/text-to-model", {
        "prompt": args.prompt.strip(),
        "model": "v3.1-20260211",
        "texture": True,
        "pbr": True,
        "texture_quality": "detailed",
    })
    task_id = created.get("task_id")
    if not isinstance(task_id, str) or not VALID_TASK.fullmatch(task_id):
        raise RuntimeError("A API não forneceu um task_id válido; confira o histórico antes de tentar novamente.")
    print("Tarefa criada:", task_id, flush=True)
    monitor(key, task_id)


if __name__ == "__main__":
    main()
