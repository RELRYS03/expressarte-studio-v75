import { useEffect, useState, type FormEvent } from "react";
import { MessageSquare, Plus, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/studio/model";
import { readLocal, writeLocal } from "@/lib/studio/persistence";

type Draft = { id: number; title: string; text: string; createdAt: string };
const isDrafts = (x: unknown): x is Draft[] => Array.isArray(x) && x.length <= 500 && x.every((v) => v && typeof v.id === "number" && typeof v.title === "string" && typeof v.text === "string" && typeof v.createdAt === "string");
export default function CommunityPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  useEffect(() => { setDrafts(readLocal("community-drafts", [], isDrafts)); setReady(true); }, []);
  useEffect(() => { if (ready) writeLocal("community-drafts", drafts); }, [drafts, ready]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setDrafts((p) => [{ id: Date.now(), title: title.trim(), text: text.trim(), createdAt: new Date().toISOString() }, ...p]);
    setTitle(""); setText("");
  }
  return <section className="content-view community-layout">
    <div>
      <p className="local-note"><MessageSquare size={16} /> Mural de rascunhos local. Esta versão não publica mensagens para outros usuários; precisa de servidor e moderação para uma comunidade compartilhada.</p>
      <form className="community-form" onSubmit={submit}><h2>Registrar uma ideia ou publicação</h2>
        <label>Título<input className="text-input" required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Meu novo projeto 3D" /></label>
        <label>Conteúdo<textarea className="text-input" required rows={5} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Conte sua ideia, dúvida ou descoberta..." /></label>
        <Button type="submit"><Plus size={16} /> Guardar no mural</Button>
      </form>
    </div>
    <div><div className="community-header"><h2>Meus rascunhos ({drafts.length})</h2><Button size="sm" variant="outline" disabled={!drafts.length} onClick={() => downloadBlob(new Blob([JSON.stringify(drafts, null, 2)], { type: "application/json" }), "ExpressArte-comunidade-rascunhos.json")}><Download size={15} /> Backup JSON</Button></div>
      {drafts.length === 0 ? <div className="empty-view"><MessageSquare /><h2>Suas ideias têm espaço aqui</h2><p>Salve seus primeiros rascunhos para não perder suas criações.</p></div> : drafts.map((p) => <article className="community-post" key={p.id}><div><span>{new Date(p.createdAt).toLocaleDateString("pt-BR")}</span><Button variant="ghost" size="icon" aria-label="Excluir rascunho" onClick={() => { if (window.confirm("Excluir este rascunho?")) setDrafts((all) => all.filter((d) => d.id !== p.id)); }}><Trash2 size={16} /></Button></div><h3>{p.title}</h3><p>{p.text}</p></article>)}
    </div>
  </section>;
}
