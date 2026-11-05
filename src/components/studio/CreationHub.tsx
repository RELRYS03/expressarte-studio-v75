import { lazy, Suspense, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Box, Download, ImageUp, Layers, LoaderCircle, Shapes, Sparkles, ArrowRight, Ruler, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { creationDefaults, parseCreationPrompt, type CreationKind, type CreationSpec } from "@/lib/studio/creation-spec";
import type { PrintableMesh } from "@/lib/studio/image3d";
import { stlBinary, threeMfFile, saveModel } from "@/lib/studio/print-exports";
import "./creation-hub.css";

const Preview = lazy(() => import("./ImagePreview3D"));
const ImageEngine = lazy(() => import("./ExpressinhoTripoSR"));
const options: {kind: CreationKind; title: string; detail: string; icon: typeof Box}[] = [
  {kind: "figure", title: "Boneco colecionável", detail: "Cabeça grande · modelo base", icon: Sparkles},
  {kind: "keychain", title: "Chaveiro", detail: "Nome em relevo · 3 formatos", icon: Shapes},
  {kind: "organizer", title: "Organizador", detail: "Bandeja · 4 compartimentos", icon: Layers},
];
const examples: Record<CreationKind, string> = {
  figure: "Boneco colecionável com boné, altura de 100 mm",
  keychain: 'Chaveiro retangular, 60 x 35 x 3 mm, nome "ANA"',
  organizer: "Organizador de mesa, 180 x 120 x 40 mm",
};

export default function CreationHub() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [spec, setSpec] = useState<CreationSpec>({...creationDefaults.figure});
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [mesh, setMesh] = useState<PrintableMesh | null>(null);
  const [resultName, setResultName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(0);
  const [generatedDescription, setGeneratedDescription] = useState("");
  function select(kind: CreationKind) {
    setSpec({...creationDefaults[kind]}); setPrompt(""); setError("");
  }
  async function generate() {
    setBusy(true); setError("");
    try {
      const next = parseCreationPrompt(prompt, spec);
      setSpec(next);
      const [{ guidedSolidInputs, geometryToPrintableMesh }, { editSolid }, THREE] = await Promise.all([
        import("@/lib/studio/creation-geometry"), import("@/lib/studio/solid-mesh-client"), import("three"),
      ]);
      const parts = guidedSolidInputs(next);
      const geometry = parts.length > 1
        ? await editSolid(parts[0]!, {kind: "union-many", parts: parts.slice(1)})
        : new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(parts[0]!, 3));
      try { setMesh(geometryToPrintableMesh(geometry)); }
      finally { geometry.dispose(); }
      const label = options.find(option => option.kind === next.kind)!.title;
      setResultName(`expressarte-${next.kind}`);
      setGeneratedDescription(`${label}${next.kind === "keychain" && next.name ? ` · ${next.name}` : ""}`);
      setReset(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível gerar a peça."); }
    finally { setBusy(false); }
  }
  async function generateRelief() {
    if (!image) return;
    setBusy(true); setError("");
    try {
      const { decodeImage, makePrintableMesh, imageDefaults } = await import("@/lib/studio/image3d");
      const source = await decodeImage(image);
      setMesh(makePrintableMesh(source, {...imageDefaults, widthMm: 80, resolution: 96}));
      setResultName("expressarte-imagem-relevo");
      setGeneratedDescription(`Placa em relevo · ${image.name}`);
      setReset(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível converter a imagem."); }
    finally { setBusy(false); }
  }
  function exportFile(format: "stl" | "3mf") {
    if (!mesh) return;
    try { saveModel(format === "stl" ? stlBinary(mesh) : threeMfFile(mesh), `${resultName}.${format}`); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível exportar."); }
  }
  return <div className="creation-hub">
    <header className="creation-header">
      <Link to="/" className="creation-brand"><span><Box size={23}/></span><div>EXPRESS’ARTE<small>STUDIO 3D</small></div></Link>
      <nav aria-label="Navegação principal"><Link to="/" aria-current="page">Criar</Link><Link to="/workbench">Editor 3D</Link><Link to="/catalogo">Catálogo</Link><Link to="/calculadora">Calculadora</Link></nav>
      <span className="creation-local">Criação local · sem créditos</span>
    </header>
    <main className="creation-main">
      <div className="creation-intro"><span className="creation-eyebrow">SUA OFICINA DE IDEIAS</span><h1>Da ideia à sua próxima peça.</h1><p>Escolha um modelo, descreva os detalhes e veja sua criação em 3D.</p></div>
      <div className="creation-layout">
        <section className="creation-controls" aria-label="Criar um objeto">
          <div className="creation-tabs" role="group" aria-label="Entrada da criação">
            <button disabled={busy} type="button" aria-pressed={mode === "text"} onClick={() => {setMode("text");setError("");}}><Sparkles size={16}/> Por texto</button>
            <button disabled={busy} type="button" aria-pressed={mode === "image"} onClick={() => {setMode("image");setError("");}}><ImageUp size={16}/> Por imagem</button>
          </div>
          {mode === "text" ? <fieldset disabled={busy} className="creation-fieldset">
            <legend className="sr-only">Modelos guiados por descrição</legend>
            <label className="creation-label">O que vamos criar?</label>
            <div className="creation-kinds">{options.map(({kind,title,detail,icon: Icon}) => <button key={kind} type="button" aria-pressed={spec.kind === kind} onClick={() => select(kind)}><Icon size={21}/><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={15}/></button>)}</div>
            <label className="creation-label" htmlFor="creation-prompt">Descreva sua peça</label>
            <textarea id="creation-prompt" rows={3} maxLength={1000} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={examples[spec.kind]}/>
            <button className="creation-example" type="button" onClick={() => setPrompt(examples[spec.kind])}>Usar descrição de exemplo</button>
            <div className="creation-measure-heading"><Ruler size={15}/> Medidas em milímetros</div>
            <div className="creation-measures">
              {spec.kind !== "figure" && <><label>Largura<input type="number" value={spec.width} onChange={e => setSpec({...spec,width:Number(e.target.value)})}/></label><label>{spec.kind === "keychain" ? "Altura da face*" : "Comprimento"}<input type="number" value={spec.length} onChange={e => setSpec({...spec,length:Number(e.target.value)})}/></label></>}
              <label>{spec.kind === "keychain" ? "Espessura" : "Altura"}<input type="number" value={spec.height} onChange={e => setSpec({...spec,height:Number(e.target.value)})}/></label>
            </div>
            {spec.kind === "keychain" && <div className="creation-measures"><label>Formato<select value={spec.shape} onChange={e => setSpec({...spec,shape:e.target.value as CreationSpec["shape"]})}><option value="round-keychain">Redondo</option><option value="rectangle-keychain">Retangular</option><option value="hex-keychain">Hexagonal</option></select></label><label>Nome em relevo<input value={spec.name} maxLength={24} onChange={e => setSpec({...spec,name:e.target.value})}/></label></div>}
            {spec.kind === "keychain" && <small className="creation-note">*Altura da face ajustável no formato retangular. Redondo e hexagonal usam a largura.</small>}
            {spec.kind === "figure" && <label className="creation-check"><input type="checkbox" checked={spec.hat} onChange={e => setSpec({...spec,hat:e.target.checked})}/> Adicionar boné</label>}
            <p className="creation-note">Modelos guiados: a descrição reconhece tipo, medidas, nome, formato e boné. Outros detalhes e semelhança com pessoas não são interpretados.</p>
            <Button className="creation-generate" onClick={() => void generate()} disabled={busy}>{busy ? <LoaderCircle className="creation-spin" size={18}/> : <Sparkles size={18}/>} {busy ? "Construindo sua peça…" : "Gerar peça 3D"}</Button>
          </fieldset> : <div className="creation-image-flow">
            <label className="creation-upload" htmlFor="creation-image"><ImageUp size={32}/><strong>Escolher uma imagem</strong><span>PNG, JPG ou WebP · até 5 MB</span><input id="creation-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e => {const file=e.target.files?.[0] ?? null;if(file && (file.size > 5*1024*1024 || !["image/png","image/jpeg","image/webp"].includes(file.type))){setError("Use PNG, JPG ou WebP de até 5 MB.");e.target.value="";return;}setImage(file);setError("");}}/></label>
            {image && <p className="creation-selected">Imagem selecionada: {image.name}</p>}
            <div className="creation-image-option"><h2>Relevo de foto ou desenho</h2><p>Crie uma placa com profundidade a partir da imagem. Funciona neste navegador.</p><Button variant="outline" disabled={!image || busy} onClick={() => void generateRelief()}>{busy ? "Preparando…" : "Criar relevo da imagem"}</Button></div>
            <div className="creation-image-option"><h2>Personagem ou objeto completo</h2><p>Reconstrução por imagem com TripoSR instalado no computador. Não usa a descrição de texto.</p><ClientOnly fallback={<p>Abra no navegador para verificar o motor.</p>}><Suspense fallback={<p>Carregando gerador…</p>}><ImageEngine imageFile={image}/></Suspense></ClientOnly></div>
            <Link className="creation-example" to="/imagem-para-3d">Abrir conversor avançado: silhueta e litofania <ArrowRight size={14}/></Link>
          </div>}
          {error && <p className="creation-error" role="alert">{error}</p>}
        </section>
        <section className="creation-result" aria-label="Prévia e exportação">
          <div className="creation-preview-heading"><span><span className="creation-dot"/> PRÉVIA 3D</span><button type="button" onClick={() => setReset(value => value + 1)} disabled={!mesh} aria-label="Centralizar visualização"><RotateCcw size={17}/></button></div>
          <div className="creation-preview">{mesh ? <ClientOnly fallback={<p>Preparando visualização…</p>}><Suspense fallback={<p>Carregando visualização…</p>}><Preview mesh={mesh} topDown={false} reset={reset}/></Suspense></ClientOnly> : <div className="creation-empty"><div><Box size={65} strokeWidth={1}/></div><h2>Sua próxima criação começa aqui.</h2><p>Escolha o tipo de peça e clique em Gerar.<br/>Você poderá girar o modelo e conferir as medidas.</p><span>01 DESCREVA <i/> 02 VISUALIZE <i/> 03 EXPORTE</span></div>}</div>
          <div className="creation-export"><div><h2>{mesh ? generatedDescription : "Pronto para ganhar forma"}</h2><p>{mesh ? `${mesh.widthMm.toFixed(1)} × ${mesh.heightMm.toFixed(1)} × ${mesh.depthMm.toFixed(1)} mm · ${mesh.triangles.toLocaleString("pt-BR")} triângulos` : "STL e 3MF em milímetros, para abrir no seu fatiador."}</p></div><div className="creation-export-buttons"><Button disabled={!mesh || busy} onClick={() => exportFile("stl")}><Download size={16}/> Baixar STL</Button><Button variant="outline" disabled={!mesh || busy} onClick={() => exportFile("3mf")}>3MF</Button></div>{mesh && <small>Esta é a última peça gerada. Alterações no formulário exigem gerar novamente. Confira suportes e orientação no Bambu Studio.</small>}</div>
        </section>
      </div>
      <footer className="creation-footer"><span><Box size={16}/> Mais possibilidades na sua oficina</span><Link to="/workbench">Editar formas e importar STL <ArrowRight size={14}/></Link><Link to="/modelo-ia">Oficina de modelos GLB <ArrowRight size={14}/></Link><Link to="/projetos">Meus projetos <ArrowRight size={14}/></Link></footer>
    </main>
  </div>;
}
