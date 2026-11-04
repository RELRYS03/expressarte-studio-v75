import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpressinhoCreation from "@/components/studio/ExpressinhoCreation";
import ExpressinhoAudit from "@/components/studio/ExpressinhoAudit";

type BridgeHealth = { available: boolean; blender: string | null; version: string };

export default function ExpressinhoHub() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "warning" | "error"; message: string } | null>(null);

  async function checkBridge() {
    setChecking(true);
    setStatus(null);
    try {
      const response = await fetch("http://127.0.0.1:8766/v1/health", { method: "GET", cache: "no-store" });
      const data = await response.json() as BridgeHealth;
      if (!response.ok) throw new Error("A ponte local recusou a conexão.");
      if (!data.available) {
        setStatus({ kind: "warning", message: "A ponte respondeu, mas não encontrou o Blender 5.2. Confira EXPRESSARTE_BLENDER_EXE e reinicie a ponte." });
      } else {
        setStatus({ kind: "success", message: `Blender ${data.version} disponível em ${data.blender}. Operações locais habilitadas.` });
      }
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error && error.message !== "Failed to fetch"
          ? error.message
          : "Ponte local não encontrada. No Windows, execute scripts\\INICIAR_BLENDER_BRIDGE_WINDOWS.bat e tente novamente.",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="content-view expressinho-hub">
      <header className="expressinho-hub-heading">
        <div>
          <h1><Sparkles size={22} /> Expressinho 3D</h1>
          <p>Criação local com Blender, auditoria de malha e preparação de STL. Sem enviar arquivos para serviços externos e sem consumir créditos de IA.</p>
        </div>
        <Button variant="outline" disabled={checking} onClick={() => void checkBridge()}>
          <Activity size={16} /> {checking ? "Verificando…" : "Verificar Blender local"}
        </Button>
      </header>
      {status && (
        <p className={`expressinho-bridge-status ${status.kind}`} role="status">
          {status.kind === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          {status.message}
        </p>
      )}
      <div className="expressinho-local-note">
        <strong>Como funciona</strong>
        <p>Os arquivos são processados no Blender instalado neste computador. A ponte escuta somente em 127.0.0.1:8766. A geração real desta etapa está limitada a chaveiros circulares e em formato de coração; os outros tipos produzem apenas um plano estruturado para revisão.</p>
      </div>
      <ExpressinhoCreation />
      <ExpressinhoAudit />
    </main>
  );
}
