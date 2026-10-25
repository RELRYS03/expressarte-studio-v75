import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { closestCalibrations, correction, type Calibration } from "@/lib/studio/color-learning";
import { decodeImage } from "@/lib/studio/image3d";
type Paint = { id: string; name: string; hex: string };
type Recipe = { id: number; target: string; grams: number; ingredients: { name: string; grams: number }[]; note: string };
const starter: Paint[] = [
  { id: "520", name: "Preto Acrilex PVA", hex: "#151515" },
  { id: "519", name: "Branco Acrilex PVA", hex: "#ffffff" },
  { id: "528", name: "Lilás Acrilex PVA", hex: "#baa2da" },
  { id: "542", name: "Rosa escuro Acrilex PVA", hex: "#d72576" },
  { id: "azul", name: "Azul Acrilex PVA (conferir código)", hex: "#0098ce" },
];
const initial: Recipe = { id: 1, target: "#9324B6", grams: 5, ingredients: [
  { name: "Rosa escuro Acrilex PVA", grams: 2 },
  { name: "Azul Acrilex PVA (conferir código)", grams: 1.5 },
  { name: "Lilás Acrilex PVA", grams: 1.2 },
  { name: "Preto Acrilex PVA", grams: 0.3 },
], note: "Receita experimental, sem validação colorimétrica. Teste após secagem e ajuste gradualmente." };
const load = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
export default function ColorStudio() {
  const [paints, setPaints] = useState<Paint[]>(() => load("expressarte-color-paints-v1", starter));
  const [recipes, setRecipes] = useState<Recipe[]>(() => load("expressarte-color-recipes-v1", [initial]));
  const [target, setTarget] = useState("#9324b6");
  const [grams, setGrams] = useState(5);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hex, setHex] = useState("#a06090");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [sample, setSample] = useState<string | null>(null);
  const [sampleHex, setSampleHex] = useState("#9324b6");
  const [calibrations, setCalibrations] = useState<Calibration[]>(() => load("expressarte-color-calibration-v1", []));
  const [selectedRecipe, setSelectedRecipe] = useState<number>(1);
  const [samplePixels, setSamplePixels] = useState<{width:number;height:number;rgba:Uint8ClampedArray}|null>(null);
  const [sampleError, setSampleError] = useState("");
  useEffect(() => { localStorage.setItem("expressarte-color-paints-v1", JSON.stringify(paints)); }, [paints]);
  useEffect(() => { localStorage.setItem("expressarte-color-recipes-v1", JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem("expressarte-color-calibration-v1", JSON.stringify(calibrations)); }, [calibrations]);
  const savePhoto = (file: File | undefined, setter: (url: string | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { alert("Use imagem de até 8 MB."); return; }
    const reader = new FileReader(); reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file);
  };
  const extract = (x: number, y: number) => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const canvas = document.createElement("canvas");
    const w = Math.min(400, img.naturalWidth);
    canvas.width = w; canvas.height = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const sample = (sx: number, sy: number) => {
      const k = (Math.min(canvas.height-1,Math.max(0,sy))*canvas.width+Math.min(canvas.width-1,Math.max(0,sx)))*4;
      return "#" + [px[k],px[k+1],px[k+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
    };
    setTarget(sample(Math.floor(x*canvas.width),Math.floor(y*canvas.height)));
    const counts = new Map<string,number>();
    for(let py=0;py<canvas.height;py+=4) for(let pxx=0;pxx<canvas.width;pxx+=4) {
      const k=(py*canvas.width+pxx)*4;
      if(px[k+3]<128)continue;
      const q=[px[k],px[k+1],px[k+2]].map(v=>Math.min(255,Math.round(v/32)*32));
      const key="#" + q.map(v=>v.toString(16).padStart(2,"0")).join("");
      counts.set(key,(counts.get(key)||0)+1);
    }
    setPalette([...counts].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([c])=>c));
  };
  const nearest = paints.map(p=>{
    const rgb=(h:string)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
    const a=rgb(target),b=rgb(p.hex);
    return {...p,distance:Math.sqrt(a.reduce((sum,v,i)=>sum+(v-b[i])**2,0))};
  }).sort((a,b)=>a.distance-b.distance).slice(0,3);
  const readSample = async (file?: File) => {
    if (!file) return;
    setSampleError("");
    try {
      const source = await decodeImage(file);
      setSamplePixels(source);
      savePhoto(file,setSample);
    } catch(error) {
      setSamplePixels(null); setSample(null);
      setSampleError(error instanceof Error ? error.message : "Não foi possível ler a amostra.");
    }
  };
  const selectSamplePixel = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!samplePixels) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(samplePixels.width-1,Math.max(0,Math.floor((event.clientX-rect.left)/rect.width*samplePixels.width)));
    const y = Math.min(samplePixels.height-1,Math.max(0,Math.floor((event.clientY-rect.top)/rect.height*samplePixels.height)));
    const values:number[][] = [];
    for(let yy=Math.max(0,y-2);yy<=Math.min(samplePixels.height-1,y+2);yy++)
      for(let xx=Math.max(0,x-2);xx<=Math.min(samplePixels.width-1,x+2);xx++){
        const offset=(yy*samplePixels.width+xx)*4;
        if(samplePixels.rgba[offset+3]>=128)values.push(Array.from(samplePixels.rgba.slice(offset,offset+3)));
      }
    if(!values.length)return;
    const rgb=[0,1,2].map(channel=>{
      const sorted=values.map(v=>v[channel]).sort((a,b)=>a-b);
      return sorted[Math.floor(sorted.length/2)];
    });
    setSampleHex("#"+rgb.map(v=>v.toString(16).padStart(2,"0")).join(""));
  };
  const addPaint = () => {
    if (!name.trim()) return;
    setPaints(old => [...old, { id: code.trim() || String(Date.now()), name: name.trim(), hex }]);
    setName(""); setCode("");
  };
  const saveRecipe = () => {
    const items = initial.ingredients.map(i => ({...i, grams: Number((i.grams * grams / 5).toFixed(3))}));
    setRecipes(old => [{id: Date.now(), target, grams, ingredients: items, note: "Proporções ilustrativas escaladas da receita violeta. NÃO representam cálculo da cor selecionada; teste físico necessário."}, ...old]);
  };
  return <div style={{background:"#faf5ed",color:"#453123",minHeight:"100vh",padding:"24px",fontFamily:"system-ui,sans-serif"}}>
    <div style={{maxWidth:1000,margin:"auto",display:"grid",gap:22}}>
      <header><Link to="/studio">← Voltar ao Studio 3D</Link><h1 style={{fontSize:32,fontWeight:800}}>Express’Arte Color Studio</h1><p>Laboratório experimental de cores para pintura 3D • versão inicial</p></header>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Escolha sua cor</h2>
        <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",marginTop:12}}>
          <input aria-label="Cor desejada" type="color" value={target} onChange={e=>setTarget(e.target.value)} style={{width:100,height:90}} />
          <label>HEX <input value={target} onChange={e=>{if(/^#[0-9a-fA-F]{6}$/.test(e.target.value))setTarget(e.target.value)}} /></label>
          <label>Quantidade (g) <input type="number" min="0.1" max="1000" step="0.1" value={grams} onChange={e=>setGrams(Math.max(0.1,Number(e.target.value)||0.1))} /></label>
        </div>
        <p style={{marginTop:12}}>O seletor é digital; as proporções de pigmentos não podem ser obtidas diretamente do HEX.</p>
        <button onClick={saveRecipe} style={{background:"#76513a",color:"white",padding:12,borderRadius:8,marginTop:10}}>Salvar teste de proporções (não calculado por cor)</button>
      </section>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Minhas tintas</h2>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"12px 0"}}>
          {paints.map((p,i)=><div key={p.id+"-"+i} style={{border:"1px solid #ddd",padding:10,borderRadius:10,minWidth:125}}><div style={{height:45,background:p.hex,borderRadius:6}}/><strong>{p.name}</strong><p>Código: {p.id}</p><button aria-label={"Remover "+p.name} onClick={()=>setPaints(old=>old.filter((_,j)=>j!==i))}>Remover</button></div>)}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input placeholder="Nome da tinta" aria-label="Nome da tinta" value={name} onChange={e=>setName(e.target.value)}/>
          <input placeholder="Código" aria-label="Código" value={code} onChange={e=>setCode(e.target.value)}/>
          <input type="color" aria-label="Cor da tinta" value={hex} onChange={e=>setHex(e.target.value)}/>
          <button onClick={addPaint}>Adicionar tinta</button>
        </div>
      </section>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Fotos da peça e referência</h2>
        <p>Prévia local das imagens. A análise por IA ainda não está conectada.</p>
        <div style={{display:"flex",gap:20,flexWrap:"wrap",marginTop:12}}>
          {([{title:"Peça original",src:photo,set:setPhoto},{title:"Referência pintada",src:reference,set:setReference}]).map(item=><label key={item.title} style={{flex:"1 1 230px"}}><strong>{item.title}</strong><input type="file" accept="image/*" onChange={e=>savePhoto(e.target.files?.[0],item.set)} />{item.src&&<img alt={item.title} src={item.src} style={{maxWidth:"100%",maxHeight:240,objectFit:"contain"}}/>}</label>)}
        </div>
      </section>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Capturar cor por imagem</h2>
        <p>Envie uma imagem e toque no ponto desejado. A cor capturada será enviada ao seletor acima.</p>
        <input type="file" accept="image/*" aria-label="Imagem para capturar cores" onChange={e=>savePhoto(e.target.files?.[0],setReference)}/>
        {reference && <div style={{marginTop:12}}>
          <img ref={imageRef} src={reference} alt="Imagem para selecionar uma cor" onClick={e=>{
            const box=e.currentTarget.getBoundingClientRect();
            extract((e.clientX-box.left)/box.width,(e.clientY-box.top)/box.height);
          }} onLoad={()=>extract(0.5,0.5)} style={{display:"block",width:"100%",maxWidth:550,height:"auto",cursor:"crosshair",borderRadius:10}}/>
          <h3 style={{fontWeight:700,marginTop:12}}>Cores frequentes na imagem</h3>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{palette.map(c=><button key={c} onClick={()=>setTarget(c)} title={c} aria-label={"Selecionar "+c} style={{background:c,width:46,height:46,borderRadius:8,border:"2px solid #aaa"}}/>)}</div>
          <h3 style={{fontWeight:700,marginTop:12}}>Tintas cadastradas mais próximas (cor digital)</h3>
          <div>{nearest.map(p=><p key={p.id}>{p.name} — {p.hex.toUpperCase()}</p>)}</div>
          <p style={{fontSize:13}}>Comparação aproximada por RGB, não é receita de mistura nem garante equivalência física. A foto pode conter variações de luz e sombra.</p>
        </div>}
      </section>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Aprendizado com misturas reais</h2>
        <p>Fotografe a amostra já seca. Selecione a cor da amostra e registre qual receita foi usada. O sistema aprende com seus próprios testes, sem IA externa.</p>
        <label style={{display:"block",marginTop:12}}>Foto da amostra seca <input type="file" accept="image/*" onChange={e=>void readSample(e.target.files?.[0])}/></label>
        {sample && <img src={sample} alt="Amostra de tinta seca — toque para capturar a cor" onClick={selectSamplePixel} style={{maxWidth:260,maxHeight:220,objectFit:"contain",display:"block",marginTop:10,cursor:"crosshair"}}/>}
        {sampleError && <p role="alert">{sampleError}</p>}
        {sample && <p>Toque na amostra para capturar a cor. Usamos a mediana de uma área de 5×5 pixels para reduzir ruído.</p>}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
          <label>Cor medida da amostra <input type="color" value={sampleHex} onChange={e=>setSampleHex(e.target.value)}/></label>
          <label>Receita testada <select value={selectedRecipe} onChange={e=>setSelectedRecipe(Number(e.target.value))}>{recipes.map(r=><option key={r.id} value={r.id}>{r.target} • {r.grams} g • #{r.id}</option>)}</select></label>
        </div>
        <p style={{marginTop:10}}>Referência: <span style={{display:"inline-block",width:18,height:18,background:target,verticalAlign:"middle"}}/> {target} | Amostra: <span style={{display:"inline-block",width:18,height:18,background:sampleHex,verticalAlign:"middle"}}/> {sampleHex}</p>
        <p><strong>Orientação:</strong> {correction(target,sampleHex)}</p>
        <button style={{background:"#76513a",color:"white",padding:10,borderRadius:8,marginTop:10}} onClick={()=>{
          const r=recipes.find(x=>x.id===selectedRecipe);if(!r)return;
          setCalibrations(old=>[{id:Date.now(),target,measured:sampleHex,date:new Date().toISOString(),ingredients:r.ingredients.map(i=>({name:i.name,grams:i.grams,hex:paints.find(p=>p.name===i.name)?.hex||"#808080"}))},...old]);
        }}>Registrar teste real</button>
        <h3 style={{fontWeight:700,marginTop:16}}>Testes anteriores mais próximos da cor selecionada</h3>
        {closestCalibrations(target,calibrations).map(c=><div key={c.id} style={{padding:10,borderBottom:"1px solid #ddd"}}>
          <span style={{display:"inline-block",background:c.measured,width:24,height:24,verticalAlign:"middle",marginRight:8}}/>
          {c.measured} — {c.ingredients.map(i=>i.name+" "+i.grams+"g").join(" + ")}
          <button style={{marginLeft:10}} onClick={()=>setCalibrations(old=>old.filter(x=>x.id!==c.id))}>Excluir</button>
        </div>)}
        <p style={{fontSize:13,marginTop:10}}>Para medir com maior precisão, fotografe referência e amostra sob a mesma luz, com fundo neutro. A cor da foto é uma estimativa; não há leitura de pigmentos por espectrofotômetro.</p>
      </section>
      <section style={{background:"white",borderRadius:16,padding:20}}>
        <h2 style={{fontSize:22,fontWeight:700}}>Histórico de receitas experimentais</h2>
        {recipes.map(r=><article key={r.id} style={{padding:"14px 0",borderBottom:"1px solid #eee"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{background:r.target,width:45,height:45,borderRadius:8,border:"1px solid #ddd"}}/><strong>{r.target.toUpperCase()} • {r.grams} g</strong><button onClick={()=>setRecipes(old=>old.filter(x=>x.id!==r.id))}>Excluir</button></div>
          <ul>{r.ingredients.map(i=><li key={i.name}>{i.name}: {i.grams.toLocaleString("pt-BR")} g</li>)}</ul>
          <p>{r.note}</p>
        </article>)}
      </section>
      <p style={{fontSize:13}}>Dados salvos apenas neste navegador. As fotos não são enviadas nem salvas no histórico. Utilize primer e teste a aderência antes da pintura definitiva.</p>
    </div>
  </div>;
}
