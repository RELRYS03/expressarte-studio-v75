import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

type Status = "pendente" | "aprovado" | "falhou" | "bloqueado";
type Check = { id: string; label: string; status: Status; note: string; evidence: string };
type TestFile = { id: string; pr: string; name: string; kind: string; external: string; internal: string; clearance: string; vertices: string; edges: string; faces: string; boundaries: string; nonmanifold: string; numeric: string; bytes: string; timeout: string; slicer: string; evidence: string; notes: string };
type Data = { checks: Check[]; files: TestFile[] };
const key = "expressarte-qa-v1";
const definitions: { group: string; items: [string, string][] }[] = [
  { group: "CAD · Precisão, medidas e encaixes", items: [
    ["cad-cube", "Gerar cubo de calibração 20 × 20 × 20 mm e medir X/Y/Z no STL"],
    ["cad-holes", "Gerar placa 60 × 30 × 4 mm com furos nominais Ø3, Ø5 e Ø8 mm"],
    ["cad-fitting", "Criar pino macho Ø10 mm e furos fêmea Ø10,2 / Ø10,4 / Ø10,6 mm; comparar folgas diametrais"],
    ["cad-walls", "Verificar paredes 1,2 / 2,0 / 3,0 mm e fundo de 2,4 mm"],
    ["cad-box", "Medir organizador externo 220 × 140 × 40 mm e dimensão interna útil; registrar tolerância real"],
    ["cad-units", "Confirmar unidades em milímetros após exportação STL e 3MF e reimportação"],
    ["cad-topology", "Verificar malha fechada, bordas abertas e arestas não-manifold nas peças CAD"],
    ["cad-slicer", "Fatiar no Bambu Studio A1 e comparar dimensões e alertas"],
    ["cad-print", "Imprimir cupom de encaixe e medir com paquímetro os valores obtidos"],
    ["cad-mobile", "Confirmar leitura e edição dos parâmetros CAD no Android"],
  ]},
  { group: "PR 24 · Chaveiros e placas", items: [
    ["24-ci", "CI, testes de dimensões, TypeScript e build — anexar evidência"],
    ["24-circle", "Chaveiro circular Ø50 × 3 mm e furo Ø5 mm em STL real"],
    ["24-rect", "Chaveiro retangular 60 × 32 × 3 mm e furo Ø5 mm"],
    ["24-plate", "Placa 80 × 30 × 2,5 mm, geometria e dimensões"],
    ["24-win", "Validar geração e edição no Windows"],
    ["24-android", "Validar interface e geração no Android"],
    ["24-export", "Exportar STL e 3MF, reabrir e conferir medidas"],
    ["24-bambu", "Fatiar três modelos reais no Bambu Studio"],
    ["24-dependency", "Validar dependência do PR 22 antes de merge"],
  ]},
  { group: "PR 25 · Diagnóstico Mesh Workbench", items: [
    ["25-static", "Revisão estática e limites do serviço documentados"],
    ["25-win", "Inicializar ponte local no Windows com dependências instaladas"],
    ["25-real1", "Diagnosticar primeiro STL real e registrar topologia"],
    ["25-real2", "Diagnosticar segundo STL real e registrar topologia"],
    ["25-compare", "Comparar diagnóstico com Bambu Studio"],
    ["25-timeout", "Validar limite de 20 MB e timeout de 180 segundos"],
  ]},
  { group: "PR 26 · Organizador 220 × 140 × 40 mm", items: [
    ["26-ci", "Executar e registrar testes, TypeScript e build"],
    ["26-ext", "Medir dimensões externas 220 × 140 × 40 mm"],
    ["26-int", "Medir dimensões internas, paredes 2 mm e fundo 2,4 mm"],
    ["26-clearance", "Conferir folgas reais e encaixe na caixa"],
    ["26-geometry", "Conferir cantos R4, divisórias e malha fechada"],
    ["26-export", "Exportar STL e reabrir"],
    ["26-bambu", "Fatiar e inspecionar paredes e base no Bambu Studio"],
  ]},
  { group: "PR 27 · Edit Mode", items: [
    ["27-ci", "64 testes, TypeScript e build reportados no PR — referência histórica"],
    ["27-select", "Testar seleção de vértices, arestas e faces no Windows"],
    ["27-gizmo", "Testar gizmo mover, girar e escalar sem deformação indevida"],
    ["27-extrude", "Testar extrusão e fechamento da geometria"],
    ["27-undo", "Testar Undo/Redo após edição de malha"],
    ["27-android", "Testar interações e seleção no Android"],
    ["27-export", "Exportar STL/3MF e reabrir sem perder modificações"],
    ["27-bambu", "Fatiamento real após edição no Bambu Studio"],
  ]},
];
const defaults: Check[] = definitions.flatMap(g => g.items.map(([id,label]) => ({ id,label,status:"pendente",note:"",evidence:"" })));
function freshFile(): TestFile { return {id: String(Date.now()) + Math.random().toString(36).slice(2),pr:"24",name:"",kind:"STL",external:"",internal:"",clearance:"",vertices:"",edges:"",faces:"",boundaries:"",nonmanifold:"",numeric:"",bytes:"",timeout:"",slicer:"",evidence:"",notes:""}; }
function load(): Data {
  if (typeof window === "undefined") return {checks:defaults,files:[]};
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null") as Partial<Data> | null;
    return {checks:defaults.map(c => ({...c,...(saved?.checks?.find(x=>x.id===c.id)||{})})), files: Array.isArray(saved?.files) ? saved.files : []};
  } catch { return {checks:defaults,files:[]}; }
}
const labels: Record<Status,string> = {pendente:"Pendente",aprovado:"Aprovado com evidência",falhou:"Falhou",bloqueado:"Bloqueado"};
function exportJson(data:Data) {
  const blob = new Blob([JSON.stringify({schema:1,exportedAt:new Date().toISOString(),...data},null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="expressarte-qa-backup.json";a.click();URL.revokeObjectURL(url);
}
export default function QAStudio() {
  const [data,setData]=useState<Data>({checks:defaults,files:[]});
  const [ready,setReady]=useState(false);
  const [active,setActive]=useState("todos");
  const [importError,setImportError]=useState("");
  useEffect(()=>{setData(load());setReady(true);},[]);
  useEffect(()=>{if(ready)localStorage.setItem(key,JSON.stringify(data));},[data,ready]);
  const counts=useMemo(()=>({approved:data.checks.filter(x=>x.status==="aprovado" && x.evidence.trim()).length,pending:data.checks.filter(x=>x.status==="pendente" || (x.status==="aprovado" && !x.evidence.trim())).length,failed:data.checks.filter(x=>x.status==="falhou" || x.status==="bloqueado").length}),[data.checks]);
  const setCheck=(id:string,patch:Partial<Check>)=>setData(d=>({...d,checks:d.checks.map(c=>c.id===id?{...c,...patch}:c)}));
  const setFile=(id:string,patch:Partial<TestFile>)=>setData(d=>({...d,files:d.files.map(f=>f.id===id?{...f,...patch}:f)}));
  const field=(f:TestFile, name:keyof TestFile,caption:string)=> <label className="flex flex-col gap-1 text-xs text-muted-foreground" key={name}>{caption}<input className="rounded-md border border-input bg-background p-2 text-sm text-foreground" value={f[name]} onChange={e=>setFile(f.id,{[name]:e.target.value})}/></label>;
  return <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link className="text-sm underline text-muted-foreground" to="/studio">← Voltar ao Studio 3D</Link><h1 className="mt-2 flex items-center gap-2 text-3xl font-bold"><ClipboardCheck/> QA Studio</h1><p className="text-muted-foreground">Controle de homologação do Express’Arte Studio · registros locais</p></div>
        <div className="flex gap-2"><button className="rounded-md border px-3 py-2 text-sm" onClick={()=>exportJson(data)}><Download className="inline h-4 w-4"/> Backup JSON</button><label className="cursor-pointer rounded-md border px-3 py-2 text-sm"><Upload className="inline h-4 w-4"/> Importar JSON<input type="file" accept=".json,application/json" className="hidden" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{const obj=JSON.parse(await file.text()) as Partial<Data>;if(!Array.isArray(obj.checks)||!Array.isArray(obj.files))throw Error("Formato inválido");setData({checks:defaults.map(c=>({...c,...obj.checks!.find(x=>x.id===c.id)})),files:obj.files});setImportError("");}catch{setImportError("Não foi possível importar este backup.");}e.target.value="";}}/></label></div>
      </div>
      {importError&&<p role="alert" className="text-red-600">{importError}</p>}
      <div className="rounded-lg border border-amber-600/50 p-4 text-sm"><AlertTriangle className="mr-2 inline h-5 w-5"/> <strong>Merge bloqueado até validação real.</strong> CI, build e relatórios históricos não substituem testes manuais no Windows/Android, STL/3MF e fatiamento no Bambu Studio. Nenhum item vem aprovado por padrão. Os dados ficam neste navegador; faça backup.</div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Aprovados com evidência",counts.approved],["Pendentes ou sem evidência",counts.pending],["Falhas / bloqueios",counts.failed]].map(([label,val])=><div key={label} className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-3xl font-semibold">{val}</div></div>)}</div>
      <section className="space-y-3"><div className="flex flex-wrap gap-2">{["todos",...definitions.map(g=>g.group)].map(g=><button key={g} className={`rounded-md border px-3 py-2 text-sm ${g===active?"bg-primary text-primary-foreground":""}`} onClick={()=>setActive(g)}>{g==="todos"?"Todos os PRs":g}</button>)}</div>
        {definitions.filter(g=>active==="todos"||active===g.group).map(g=><div key={g.group} className="rounded-lg border p-4"><h2 className="mb-3 font-semibold">{g.group}</h2><div className="space-y-3">{g.items.map(([id])=>{const c=data.checks.find(x=>x.id===id)!;return <div key={id} className="grid gap-2 border-t py-3 md:grid-cols-[1fr_210px]"><label className="text-sm font-medium">{c.label}</label><select aria-label={`Status: ${c.label}`} className="rounded border bg-background p-2 text-sm" value={c.status} onChange={e=>setCheck(id,{status:e.target.value as Status})}>{(Object.keys(labels) as Status[]).map(s=><option key={s} value={s}>{labels[s]}</option>)}</select><input className="rounded border bg-background p-2 text-sm" placeholder="Evidência: URL, commit, relatório ou caminho" value={c.evidence} onChange={e=>setCheck(id,{evidence:e.target.value})}/><input className="rounded border bg-background p-2 text-sm" placeholder="Resultado, observações e pendências" value={c.note} onChange={e=>setCheck(id,{note:e.target.value})}/>{c.status==="aprovado"&&!c.evidence.trim()&&<p className="text-xs text-amber-600 md:col-span-2">Sem evidência registrada: continua contando como pendente.</p>}</div>;})}</div></div>)}
      </section>
      <section className="space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Arquivos e testes reais</h2><button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={()=>setData(d=>({...d,files:[...d.files,freshFile()]}))}>+ Cadastrar arquivo</button></div>
      <p className="text-sm text-muted-foreground">Registre dois STLs distintos para o PR 25. O formulário registra metadados e evidências, mas não executa diagnóstico ou fatiamento automaticamente.</p>
      {data.files.map(f=><div key={f.id} className="space-y-3 rounded-lg border p-4"><div className="flex justify-between"><h3 className="font-semibold">{f.name||"Novo arquivo de teste"}</h3><button className="text-sm underline" onClick={()=>setData(d=>({...d,files:d.files.filter(x=>x.id!==f.id)}))}>Excluir registro</button></div><div className="grid gap-3 md:grid-cols-3">
       <label className="text-xs">PR<select className="block w-full rounded-md border bg-background p-2" value={f.pr} onChange={e=>setFile(f.id,{pr:e.target.value})}>{["24","25","26","27"].map(n=><option key={n}>{n}</option>)}</select></label>
       <label className="text-xs">Formato<select className="block w-full rounded-md border bg-background p-2" value={f.kind} onChange={e=>setFile(f.id,{kind:e.target.value})}><option>STL</option><option>3MF</option></select></label>
       {field(f,"name","Nome do arquivo")}{field(f,"external","Dimensões externas X × Y × Z (mm)")}{field(f,"internal","Dimensões internas X × Y × Z (mm)")}{field(f,"clearance","Folgas (mm)")}{field(f,"vertices","Vértices")}{field(f,"edges","Arestas")}{field(f,"faces","Faces")}{field(f,"boundaries","Bordas abertas")}{field(f,"nonmanifold","Arestas não-manifold")}{field(f,"numeric","Validade numérica / NaN / infinito")}{field(f,"bytes","Tamanho (bytes)")}{field(f,"timeout","Timeout (segundos)")}{field(f,"slicer","Resultado real do Bambu Studio")}{field(f,"evidence","Evidências / caminho ou URL")}{field(f,"notes","Pendências e observações")}
      </div></div>)}</section>
      <section className="rounded-lg border p-4"><h2 className="flex items-center gap-2 text-xl font-bold"><CheckCircle2/> Resumo pré-merge</h2><p className="mt-2 text-sm">Aprovações com evidência: {counts.approved} de {data.checks.length}. Pendências: {counts.pending}; falhas ou bloqueios: {counts.failed}. {counts.approved===data.checks.length&&counts.failed===0?"Checklist completo; revisar evidências e dependências antes do merge.":"Não liberar merge: concluir validações práticas e anexar evidências."}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{data.checks.filter(c=>c.status!=="aprovado"||!c.evidence.trim()).slice(0,12).map(c=><li key={c.id}>{c.label}</li>)}</ul>{data.checks.filter(c=>c.status!=="aprovado"||!c.evidence.trim()).length>12&&<p className="mt-2 text-sm text-muted-foreground">Há outras pendências nos checklists acima.</p>}</section>
    </div>
  </main>;
}
