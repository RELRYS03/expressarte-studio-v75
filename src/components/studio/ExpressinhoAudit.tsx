import { useState } from "react";
import { FileSearch, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Report = {
  dimensionsMm: { x:number; y:number; z:number };
  geometry: { vertices:number; triangles:number; boundary_edges:number; non_manifold_edges:number; loose_edges:number; wire_vertices:number; connected_parts:number };
  closedByEdgeTopology:boolean;
  readyForPrinting:null;
  warnings:string[];
  limitations:string;
};
export default function ExpressinhoAudit() {
  const [file,setFile] = useState<File|null>(null);
  const [report,setReport] = useState<Report|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function analyze() {
    if (!file || busy) return;
    setBusy(true); setError(""); setReport(null);
    try {
      if (file.size > 20*1024*1024 || file.size < 84) throw new Error("Envie um STL com tamanho entre 84 bytes e 20 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i=0;i<bytes.length;i+=8192) bin += String.fromCharCode(...bytes.subarray(i,i+8192));
      const response = await fetch("http://127.0.0.1:8766/v1/audit-stl",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({stlBase64:btoa(bin)}),
      });
      const data = await response.json() as {report?:Report;error?:string};
      if (!response.ok || !data.report) throw new Error(data.error || "Nao foi possivel auditar.");
      setReport(data.report);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Nao foi possivel conectar ao Blender local.");
    } finally { setBusy(false); }
  }
  return <section className="expressinho-creation" aria-label="Avaliador de STL">
    <header className="expressinho-creation-heading"><div><strong><FileSearch size={16}/> Avaliar malha com Blender</strong>
      <p>Relatório de medidas e topologia, sem modificar o modelo e sem consumir créditos.</p></div></header>
    <div className="expressinho-creation-actions">
      <label style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:12}}>
        <Upload size={15}/> Selecionar STL
        <input type="file" accept=".stl" onChange={e=>{setFile(e.target.files?.[0]||null);setReport(null);setError("");}} />
      </label>
      <Button disabled={!file||busy} onClick={()=>void analyze()}>{busy?"Analisando no Blender…":"Analisar arquivo"}</Button>
    </div>
    {error && <p role="alert" className="expressinho-plan">{error}</p>}
    {report && <div className="expressinho-plan" role="status">
      <strong>Resultado da auditoria</strong>
      <p>Dimensões presumidas em mm: {report.dimensionsMm.x} × {report.dimensionsMm.y} × {report.dimensionsMm.z}</p>
      <p>Triângulos: {report.geometry.triangles.toLocaleString("pt-BR")} · Vértices: {report.geometry.vertices.toLocaleString("pt-BR")} · Partes conectadas: {report.geometry.connected_parts}</p>
      <p>Bordas abertas: {report.geometry.boundary_edges} · Arestas não-manifold: {report.geometry.non_manifold_edges}</p>
      <p>Malha fechada por análise de arestas: {report.closedByEdgeTopology?"Sim":"Não"}</p>
      <p><strong>Imprimibilidade: não confirmada.</strong> {report.limitations}</p>
      {report.warnings.map((w,i)=><p key={i}>• {w}</p>)}
    </div>}
  </section>;
}
