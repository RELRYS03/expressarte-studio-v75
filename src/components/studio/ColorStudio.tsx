import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
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
  useEffect(() => { localStorage.setItem("expressarte-color-paints-v1", JSON.stringify(paints)); }, [paints]);
  useEffect(() => { localStorage.setItem("expressarte-color-recipes-v1", JSON.stringify(recipes)); }, [recipes]);
  const savePhoto = (file: File | undefined, setter: (url: string | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { alert("Use imagem de até 8 MB."); return; }
    const reader = new FileReader(); reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file);
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
