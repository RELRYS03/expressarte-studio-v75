import { useState } from "react";
import { Download, FileSearch, Upload, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

type Report = {
  dimensionsMm: { x: number; y: number; z: number };
  geometry: { vertices: number; triangles: number; boundary_edges: number; non_manifold_edges: number; loose_edges: number; wire_vertices: number; connected_parts: number };
  closedByEdgeTopology: boolean;
  readyForPrinting: null;
  warnings: string[];
  limitations: string;
};
type PrepareReport = { operation: string; trianglesBefore: number; trianglesAfter: number; note: string };
type Mode = "flatten_bottom" | "decimate";
const API = "http://127.0.0.1:8766";
async function encodeStl(file: File): Promise<string> {
  if (file.size < 84 || file.size > 20 * 1024 * 1024) {
    throw new Error("Nesta versão, selecione STL entre 84 bytes e 20 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
async function postJson(path: string, payload: object) {
  const response = await fetch(API + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json() as { error?: string; report?: Report | PrepareReport; stlBase64?: string };
  if (!response.ok) throw new Error(data.error || "O Blender não concluiu a operação.");
  return data;
}
export default function ExpressinhoAudit() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [reportTarget, setReportTarget] = useState("Original");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("flatten_bottom");
  const [cutMm, setCutMm] = useState(2);
  const [targetFaces, setTargetFaces] = useState(100000);
  const [prepared, setPrepared] = useState<Blob | null>(null);
  const [preparedReport, setPreparedReport] = useState<PrepareReport | null>(null);
  const [auditNotice, setAuditNotice] = useState("");

  const reset = () => { setReport(null); setPrepared(null); setPreparedReport(null); setError(""); setAuditNotice(""); };
  async function auditStl(stlBase64: string, target: string) {
    const data = await postJson("/v1/audit-stl", { stlBase64 });
    setReport(data.report as Report);
    setReportTarget(target);
  }
  async function analyze() {
    if (!file || busy) return;
    setBusy(true); setError(""); setAuditNotice("");
    try { await auditStl(await encodeStl(file), "Original"); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha na auditoria."); }
    finally { setBusy(false); }
  }
  async function prepare() {
    if (!file || busy) return;
    setBusy(true); reset();
    try {
      if (file.size < 84 || file.size > 150*1024*1024) {
        throw new Error("Selecione STL entre 84 bytes e 150 MB.");
      }
      const params = new URLSearchParams({operation:mode});
      if (mode === "flatten_bottom") params.set("cutMm", String(cutMm));
      else params.set("targetFaces", String(targetFaces));
      const response = await fetch(API + "/v1/prepare-stl-binary?" + params.toString(), {
        method:"POST", headers:{"Content-Type":"application/octet-stream"}, body:file,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as {error?: string} | null;
        throw new Error(result?.error || "Blender não conseguiu preparar o STL.");
      }
      const blob = await response.blob();
      if (blob.size < 84) throw new Error("A resposta do Blender não contém um STL válido.");
      setPrepared(blob);
      setPreparedReport({
        operation: mode,
        trianglesBefore: Number(response.headers.get("X-Expressinho-Before") || 0),
        trianglesAfter: Number(response.headers.get("X-Expressinho-After") || 0),
        note: "Original preservado. Confira orientação, medidas, furos e paredes no Bambu Studio.",
      });
      if (blob.size <= 20*1024*1024) {
        try { await auditStl(await encodeStl(new File([blob], "preparado.stl")), "Preparado"); }
        catch { setAuditNotice("STL preparado, mas a auditoria automática falhou."); }
      } else {
        setAuditNotice("Arquivo preparado grande: auditoria automática limitada a 20 MB. Verifique no Bambu Studio.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na preparação."); }
    finally { setBusy(false); }
  }
  function downloadPrepared() {
    if (!prepared) return;
    const url = URL.createObjectURL(prepared);
    const a = document.createElement("a");
    a.href = url; a.download = "expressinho-preparado.stl"; a.click();
    URL.revokeObjectURL(url);
  }
  return <section className="expressinho-creation" aria-label="Preparar e avaliar STL">
    <header className="expressinho-creation-heading">
      <div><strong><FileSearch size={16}/> Avaliar e preparar STL no Blender</strong>
        <p>Opera localmente, preserva o original e não gasta créditos do Tripo.</p>
      </div>
    </header>
    <div className="expressinho-creation-actions">
      <label style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12}}>
        <Upload size={15}/> Escolher STL (máx. 150 MB para preparar; 20 MB para auditar)
        <input type="file" accept=".stl" onChange={e => {setFile(e.target.files?.[0] || null);reset();}} />
      </label>
      <Button disabled={!file || busy} variant="outline" onClick={() => void analyze()}>
        {busy ? "Aguarde…" : "Analisar original"}
      </Button>
    </div>
    <div className="expressinho-creation-fields" style={{marginTop:12}}>
      <label>Operação
        <select value={mode} onChange={e => {setMode(e.target.value as Mode);reset();}}>
          <option value="flatten_bottom">Aparar fundo e criar base plana (Z)</option>
          <option value="decimate">Simplificar número de faces</option>
        </select>
      </label>
      {mode === "flatten_bottom"
        ? <label>Remover da parte inferior (mm)
            <input type="number" min={0.1} max={20} step={0.1} value={cutMm} onChange={e => {setCutMm(Number(e.target.value));reset();}} />
          </label>
        : <label>Meta de triângulos
            <input type="number" min={1000} max={500000} step={1000} value={targetFaces} onChange={e => {setTargetFaces(Number(e.target.value));reset();}} />
          </label>}
    </div>
    <p style={{fontSize:11,marginTop:8,color:"#c8cdd8"}}>
      Aparar fundo usa o eixo Z do arquivo. Para chaveiro com verso em outro eixo, oriente o STL primeiro.
      Simplificar reduz a densidade, mas pode perder detalhes. Não substitui reparo de furos ou verificação de paredes.
    </p>
    <div className="expressinho-creation-actions">
      <Button disabled={!file || busy} onClick={() => void prepare()}>
        <Wrench size={15}/> {busy ? "Processando no Blender…" : "Preparar STL"}
      </Button>
      {prepared && <Button variant="outline" onClick={downloadPrepared}><Download size={15}/> Baixar STL preparado</Button>}
    </div>
    {error && <p role="alert" className="expressinho-plan">{error}</p>}
    {preparedReport && <div className="expressinho-plan" role="status">
      <strong>Operação concluída — arquivo original preservado</strong>
      <p>Triângulos: {preparedReport.trianglesBefore.toLocaleString("pt-BR")} antes → {preparedReport.trianglesAfter.toLocaleString("pt-BR")} depois.</p>
      <p>{preparedReport.note}</p>
    </div>}
    {auditNotice && <p role="status" className="expressinho-plan">{auditNotice}</p>}
    {report && <div className="expressinho-plan" role="status">
      <strong>Auditoria: {reportTarget}</strong>
      <p>Dimensões presumidas em mm: {report.dimensionsMm.x} × {report.dimensionsMm.y} × {report.dimensionsMm.z}</p>
      <p>Triângulos: {report.geometry.triangles.toLocaleString("pt-BR")} · Vértices: {report.geometry.vertices.toLocaleString("pt-BR")} · Partes: {report.geometry.connected_parts}</p>
      <p>Bordas abertas: {report.geometry.boundary_edges} · Arestas não-manifold: {report.geometry.non_manifold_edges}</p>
      <p>Malha fechada por topologia: {report.closedByEdgeTopology ? "Sim" : "Não"}.</p>
      <p><strong>Imprimibilidade não confirmada.</strong> {report.limitations}</p>
      {report.warnings.map((w,i) => <p key={i}>• {w}</p>)}
    </div>}
  </section>;
}
