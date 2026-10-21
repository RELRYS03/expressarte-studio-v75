// Diagnóstico sem gastos: Node >= 20. Nenhum comando deste arquivo cria tarefas.
const BASE = "https://openapi.tripo3d.ai/v3";
const key = process.env.TRIPO_API_KEY;
if (!key) {
  console.error("TRIPO_API_KEY não configurada. Configure a chave nova apenas no ambiente local.");
  process.exitCode = 1;
} else {
  const task = process.argv[2];
  if (task && !/^task_[\w-]{3,120}$/.test(task)) {
    console.error("ID inválido. Use task_... ou execute sem ID para consultar apenas o saldo.");
    process.exitCode = 1;
  } else {
    const path = task ? `/tasks/${encodeURIComponent(task)}` : "/account/balance";
    try {
      const response = await fetch(BASE + path, {
        headers: {Authorization:`Bearer ${key}`},
        signal:AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result?.code !== 0) {
        // Não exiba corpos completos do servidor, que podem conter detalhes sensíveis.
        throw new Error("Tripo respondeu HTTP " + response.status + ", code=" + String(result?.code ?? "?"));
      }
      const data = result.data || {};
      if (task) {
        console.log(JSON.stringify({
          id: data.task_id, status: data.status, progress: data.progress,
          has_model: typeof data.output?.model_url === "string",
          error: data.error_message || null,
        }, null, 2));
      } else {
        console.log(JSON.stringify({saldo_api:data.balance,congelados:data.frozen},null,2));
      }
    } catch(error) {
      console.error("Diagnóstico falhou: " + (error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  }
}
