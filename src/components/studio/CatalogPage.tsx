import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Gift,
  Coffee,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  Send,
  Image as ImageIcon,
  Search,
  Heart,
  ExternalLink,
  ArrowUpDown,
  Lightbulb,
  Sparkles,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { readLocal, writeLocal } from "@/lib/studio/persistence";
import { catalogIdeas } from "@/lib/studio/catalog-ideas";
import { askG4f, checkG4fConnection } from "@/lib/studio/g4f-api";

type Product = { id: number; name: string; description: string; price: number; category: string };
type Cart = Record<string, number>;
const categories = ["Canecas", "Impressão 3D", "Personalizados", "Outros"];
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const isProducts = (value: unknown): value is Product[] =>
  Array.isArray(value) &&
  value.length <= 500 &&
  value.every(
    (p) =>
      p &&
      typeof p.id === "number" &&
      typeof p.name === "string" &&
      p.name.length <= 100 &&
      typeof p.description === "string" &&
      typeof p.price === "number" &&
      Number.isFinite(p.price) &&
      p.price >= 0 &&
      p.price <= 1000000 &&
      categories.includes(p.category),
  );
const isCart = (value: unknown): value is Cart =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.entries(value).every(
    ([key, num]) =>
      /^\d+$/.test(key) &&
      typeof num === "number" &&
      Number.isInteger(num) &&
      num >= 1 &&
      num <= 999,
  );
const blank = { name: "", description: "", price: "", category: "Canecas" };
export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState(blank);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("Todas");
  const [status, setStatus] = useState("");
  const [ideaSearch, setIdeaSearch] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Todas");
  const [ideaSort, setIdeaSort] = useState("potencial");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [ideaLimit, setIdeaLimit] = useState(24);
  const [g4fPrompt, setG4fPrompt] = useState("");
  const [g4fMessages, setG4fMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [g4fStatus, setG4fStatus] = useState("");
  const [g4fBusy, setG4fBusy] = useState(false);
  const [g4fChecking, setG4fChecking] = useState(false);
  useEffect(() => {
    setProducts(readLocal("catalog-products", [], isProducts));
    setCart(readLocal("catalog-cart", {}, isCart));
    setFavorites(
      readLocal(
        "catalog-ideas-favorites",
        [],
        (value): value is number[] =>
          Array.isArray(value) && value.every((id) => Number.isInteger(id)),
      ),
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeLocal("catalog-products", products);
  }, [products, ready]);
  useEffect(() => {
    if (ready) writeLocal("catalog-cart", cart);
  }, [cart, ready]);
  useEffect(() => {
    if (ready) writeLocal("catalog-ideas-favorites", favorites);
  }, [favorites, ready]);
  const visible = products.filter((p) => filter === "Todas" || filter === p.category);
  const ideaCategories = [...new Set(catalogIdeas.map((idea) => idea.cat))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const filteredIdeas = catalogIdeas
    .filter(
      (idea) =>
        (ideaCategory === "Todas" || idea.cat === ideaCategory) &&
        (!favoritesOnly || favorites.includes(idea.id)) &&
        `${idea.name} ${idea.cat}`
          .toLocaleLowerCase("pt-BR")
          .includes(ideaSearch.toLocaleLowerCase("pt-BR")),
    )
    .sort((a, b) =>
      ideaSort === "a-z"
        ? a.name.localeCompare(b.name, "pt-BR")
        : ideaSort === "z-a"
          ? b.name.localeCompare(a.name, "pt-BR")
          : (a.pot === "alto" ? 0 : a.pot === "bom" ? 1 : 2) -
              (b.pot === "alto" ? 0 : b.pot === "bom" ? 1 : 2) || a.id - b.id,
    );
  const items = useMemo(
    () => products.filter((p) => (cart[String(p.id)] ?? 0) > 0),
    [cart, products],
  );
  const total = items.reduce((sum, p) => sum + p.price * (cart[String(p.id)] ?? 0), 0);
  const itemCount = items.reduce((sum, p) => sum + (cart[String(p.id)] ?? 0), 0);
  function addProduct(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    if (
      !form.name.trim() ||
      !form.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1000000
    ) {
      setStatus("Preencha o nome e um preço válido.");
      return;
    }
    setProducts((old) => [
      ...old,
      {
        id: Date.now(),
        name: form.name.trim().slice(0, 100),
        description: form.description.trim().slice(0, 300),
        category: form.category,
        price,
      },
    ]);
    setForm(blank);
    setAdding(false);
    setStatus("Produto cadastrado apenas neste navegador.");
  }
  function remove(id: number) {
    setProducts((old) => old.filter((p) => p.id !== id));
    setCart((old) => {
      const next = { ...old };
      delete next[String(id)];
      return next;
    });
  }
  function addToCart(id: number) {
    setCart((old) => ({ ...old, [String(id)]: Math.min((old[String(id)] ?? 0) + 1, 999) }));
    setStatus("Produto adicionado ao pedido.");
  }
  function shareOrder() {
    if (items.length === 0) {
      setStatus("Adicione um produto ao pedido.");
      return;
    }
    const lines = [
      "Olá! Gostaria de solicitar um orçamento/pedido Express'Arte:",
      "",
      ...items.map(
        (p) =>
          `• ${p.name} (${cart[String(p.id)]} un.) — ${money(p.price * (cart[String(p.id)] ?? 0))}`,
      ),
      "",
      `Subtotal estimado: ${money(total)}`,
      "Aguardo confirmação de disponibilidade, frete e pagamento.",
    ];
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  async function checkAssistant() {
    setG4fChecking(true);
    try {
      const result = await checkG4fConnection();
      setG4fStatus(result.message);
    } catch {
      setG4fStatus("Não foi possível verificar o serviço GPT4Free local.");
    } finally {
      setG4fChecking(false);
    }
  }
  async function askAssistant(e: FormEvent) {
    e.preventDefault();
    if (!g4fPrompt.trim() || g4fBusy) return;
    const nextMessages = [
      ...g4fMessages,
      { role: "user" as const, content: g4fPrompt.trim() },
    ].slice(-12);
    setG4fMessages(nextMessages);
    setG4fPrompt("");
    setG4fBusy(true);
    setG4fStatus("");
    try {
      const result = await askG4f({ data: { messages: nextMessages } });
      setG4fMessages((current) =>
        [...current, { role: "assistant" as const, content: result.answer }].slice(-12),
      );
      setG4fStatus("Resposta gerada pelo GPT4Free.");
    } catch (error) {
      setG4fStatus(error instanceof Error ? error.message : "Falha ao consultar o GPT4Free.");
    } finally {
      setG4fBusy(false);
    }
  }
  function planIdea(idea: (typeof catalogIdeas)[number]) {
    setForm({
      name: idea.name,
      description: `Ideia de impressão 3D · ${idea.cat} · Potencial ${idea.pot}`,
      price: "",
      category: "Impressão 3D",
    });
    setAdding(true);
    setStatus("Ideia copiada para o cadastro. Defina o preço e salve como produto.");
    window.setTimeout(
      () =>
        document
          .querySelector(".catalog-form")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      0,
    );
  }
  return (
    <section className="content-view catalog-layout">
      <div className="catalog-main">
        <section className="ideas-catalog" aria-labelledby="ideas-title">
          <div className="ideas-heading">
            <div>
              <span className="ideas-eyebrow">
                <Lightbulb size={14} /> Catálogo de ideias de impressão
              </span>
              <h1 id="ideas-title">Ideias para criar e vender</h1>
              <p>As 602 ideias do catálogo anterior, organizadas por tema e potencial.</p>
            </div>
            <a
              className="ideas-pdf-link"
              href="/catalogo-produtos.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={15} /> Abrir catálogo PDF
            </a>
          </div>
          <section className="catalog-gpt" aria-labelledby="catalog-gpt-title">
            <div className="catalog-gpt-heading">
              <div>
                <span className="ideas-eyebrow">
                  <Sparkles size={14} /> Assistente de ideias
                </span>
                <h2 id="catalog-gpt-title">Chat GPT4Free</h2>
                <p>
                  Converse sobre ideias de produtos, materiais, impressão 3D e preços. As respostas
                  dependem do provedor conectado e dos limites dele.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={checkAssistant}
                disabled={g4fChecking}
              >
                {g4fChecking ? <LoaderCircle className="catalog-gpt-spinner" size={14} /> : null}
                Testar conexão
              </Button>
            </div>
            <div
              className="catalog-gpt-messages"
              aria-live="polite"
              aria-label="Conversa com GPT4Free"
            >
              {g4fMessages.length === 0 ? (
                <p className="catalog-gpt-empty">
                  Olá! Sou o assistente do Express’Arte. O que você quer criar?
                </p>
              ) : (
                g4fMessages.map((message, index) => (
                  <div
                    key={`${index}-${message.role}`}
                    className={`catalog-gpt-message is-${message.role}`}
                  >
                    <strong>{message.role === "user" ? "Você" : "GPT4Free"}</strong>
                    <p>{message.content}</p>
                  </div>
                ))
              )}
              {g4fBusy && (
                <div className="catalog-gpt-typing">
                  <LoaderCircle className="catalog-gpt-spinner" size={14} /> GPT4Free está
                  respondendo...
                </div>
              )}
            </div>
            <form className="catalog-gpt-form" onSubmit={askAssistant}>
              <textarea
                aria-label="Pergunta para o GPT4Free"
                maxLength={1200}
                placeholder="Ex.: sugira um organizador de ferramentas para impressão 3D, com material e preço de venda..."
                value={g4fPrompt}
                onChange={(event) => setG4fPrompt(event.target.value)}
              />
              <Button type="submit" disabled={g4fBusy || !g4fPrompt.trim()}>
                {g4fBusy ? (
                  <LoaderCircle className="catalog-gpt-spinner" size={15} />
                ) : (
                  <Sparkles size={15} />
                )}
                {g4fBusy ? "Consultando..." : "Perguntar ao GPT4Free"}
              </Button>
            </form>
            {g4fStatus && (
              <p className="catalog-gpt-status" role="status">
                {g4fStatus}
              </p>
            )}
          </section>
          <div className="ideas-controls">
            <label className="ideas-search">
              <Search size={16} />
              <input
                aria-label="Buscar ideias"
                placeholder="Buscar ideia ou categoria..."
                value={ideaSearch}
                onChange={(e) => {
                  setIdeaSearch(e.target.value);
                  setIdeaLimit(24);
                }}
              />
            </label>
            <label className="ideas-sort">
              <ArrowUpDown size={15} />
              <select
                aria-label="Ordenar ideias"
                value={ideaSort}
                onChange={(e) => setIdeaSort(e.target.value)}
              >
                <option value="potencial">Potencial</option>
                <option value="a-z">Nome A–Z</option>
                <option value="z-a">Nome Z–A</option>
              </select>
            </label>
            <Button
              variant={favoritesOnly ? "default" : "outline"}
              onClick={() => {
                setFavoritesOnly((v) => !v);
                setIdeaLimit(24);
              }}
            >
              <Heart size={15} fill={favoritesOnly ? "currentColor" : "none"} /> Favoritos (
              {favorites.length})
            </Button>
          </div>
          <div className="ideas-category-filters" aria-label="Filtrar ideias por categoria">
            <strong>Categorias</strong>
            <div className="ideas-category-list">
              {["Todas", ...ideaCategories].map((category) => {
                const count =
                  category === "Todas"
                    ? catalogIdeas.length
                    : catalogIdeas.filter((idea) => idea.cat === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    className={`ideas-category-chip ${ideaCategory === category ? "is-selected" : ""}`}
                    aria-pressed={ideaCategory === category}
                    onClick={() => {
                      setIdeaCategory(category);
                      setIdeaLimit(24);
                    }}
                  >
                    {category}
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ideas-meta">
            <span>
              {filteredIdeas.length} ideias · {ideaCategories.length} categorias
            </span>
            <span>Salve favoritos neste navegador</span>
          </div>
          {filteredIdeas.length === 0 ? (
            <div className="ideas-empty">
              Nenhuma ideia encontrada. Ajuste a busca ou os filtros.
            </div>
          ) : (
            <div className="ideas-grid">
              {filteredIdeas.slice(0, ideaLimit).map((idea) => {
                const favorite = favorites.includes(idea.id);
                const sources = [
                  [
                    "MakerWorld",
                    `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(idea.name)}`,
                  ],
                  [
                    "Printables",
                    `https://www.printables.com/search/models?q=${encodeURIComponent(idea.name)}`,
                  ],
                  ["Cults3D", `https://cults3d.com/en/search?q=${encodeURIComponent(idea.name)}`],
                  [
                    "Thangs",
                    `https://thangs.com/search/${encodeURIComponent(idea.name)}?scope=all`,
                  ],
                  [
                    "Thingiverse",
                    `https://www.thingiverse.com/search?q=${encodeURIComponent(idea.name)}&type=things`,
                  ],
                ];
                const hasBlenderCover = idea.name.toLocaleLowerCase("pt-BR") === "gato articulado";
                return (
                  <article className="idea-card" key={idea.id}>
                    <div
                      className={`idea-cover idea-cover-${idea.id % 6} ${hasBlenderCover ? "idea-cover-rendered" : ""}`}
                      aria-label={`Capa Express'Arte para ${idea.name}`}
                    >
                      {hasBlenderCover && (
                        <img
                          className="idea-cover-render"
                          src="/catalog-covers/gato-articulado.png"
                          alt="Render Blender 5.2 do STL de gato anexado"
                        />
                      )}
                      <span className="idea-cover-kicker">EXPRESS’ARTE · {idea.cat}</span>
                      <div className="idea-cover-orbit orbit-one" />
                      <div className="idea-cover-orbit orbit-two" />
                      <Package className="idea-cover-object" strokeWidth={1.15} />
                      <span className="idea-cover-title">{idea.name}</span>
                      <span className="idea-cover-footer">
                        IDEIA DE IMPRESSÃO 3D <b>#{String(idea.id).padStart(3, "0")}</b>
                      </span>
                    </div>
                    <div className="idea-card-top">
                      <span className="idea-number">#{String(idea.id).padStart(3, "0")}</span>
                      <button
                        className={`idea-favorite ${favorite ? "is-favorite" : ""}`}
                        aria-label={
                          favorite
                            ? `Remover ${idea.name} dos favoritos`
                            : `Salvar ${idea.name} nos favoritos`
                        }
                        onClick={() =>
                          setFavorites((old) =>
                            favorite ? old.filter((id) => id !== idea.id) : [...old, idea.id],
                          )
                        }
                      >
                        <Heart size={17} fill={favorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <span className="idea-category">{idea.cat}</span>
                    <h3>{idea.name}</h3>
                    <span
                      className={`idea-potential potential-${idea.pot === "alto" ? "high" : idea.pot === "bom" ? "medium" : "test"}`}
                    >
                      Potencial {idea.pot}
                    </span>
                    <div className="idea-recommendations">
                      <strong>Indicações de modelos 3D</strong>
                      <div className="idea-recommendation-links">
                        {sources.map(([name, href]) => (
                          <a key={name} href={href} target="_blank" rel="noopener noreferrer">
                            {name}
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="idea-card-actions">
                      <Button size="sm" onClick={() => planIdea(idea)}>
                        <Plus size={14} /> Planejar produto
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {filteredIdeas.length > ideaLimit && (
            <Button
              className="ideas-load-more"
              variant="outline"
              onClick={() => setIdeaLimit((n) => n + 24)}
            >
              Mostrar mais ideias ({filteredIdeas.length - ideaLimit} restantes)
            </Button>
          )}
        </section>
        <div className="catalog-toolbar">
          <div className="category-tabs">
            {["Todas", ...categories].map((c) => (
              <Button
                key={c}
                variant="ghost"
                className={filter === c ? "selected" : ""}
                onClick={() => setFilter(c)}
              >
                {c}
              </Button>
            ))}
          </div>
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus size={16} /> Cadastrar produto
          </Button>
        </div>
        <p className="local-note">
          <ImageIcon size={15} /> Catálogo local: os produtos ficam somente neste navegador. Nenhuma
          venda é processada automaticamente.
        </p>
        {adding && (
          <form className="catalog-form" onSubmit={addProduct}>
            <label>
              Nome do produto
              <input
                className="text-input"
                required
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Preço (R$)
              <input
                className="text-input"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>
            <label>
              Categoria
              <select
                className="text-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="catalog-wide">
              Descrição
              <textarea
                className="text-input"
                rows={2}
                maxLength={300}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="catalog-wide">
              <Button type="submit">Salvar produto</Button>{" "}
              <Button type="button" variant="outline" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {visible.length === 0 ? (
          <div className="empty-view">
            <Gift />
            <h2>
              {products.length === 0 ? "Seu catálogo começa aqui" : "Nenhum item nesta categoria"}
            </h2>
            <p>Cadastre seus produtos com preços reais para montar pedidos personalizados.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {visible.map((p) => (
              <article className="product-card" key={p.id}>
                <div className="product-art">
                  {p.category === "Canecas" ? (
                    <Coffee />
                  ) : p.category === "Impressão 3D" ? (
                    <Package />
                  ) : (
                    <Gift />
                  )}
                </div>
                <span className="product-category">{p.category}</span>
                <h3>{p.name}</h3>
                <p>{p.description || "Produto personalizado Express'Arte."}</p>
                <strong>{money(p.price)}</strong>
                <div className="product-actions">
                  <Button onClick={() => addToCart(p.id)}>
                    <ShoppingCart size={15} /> Adicionar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir ${p.name}`}
                    title="Excluir produto"
                    onClick={() => {
                      if (window.confirm(`Excluir ${p.name}?`)) remove(p.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <aside className="cart-panel">
        <h2>
          <ShoppingCart size={19} /> Pedido ({itemCount})
        </h2>
        {items.length === 0 ? (
          <p>Escolha produtos para preparar seu pedido.</p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="cart-item">
              <span>
                {p.name}
                <small>{money(p.price)} por unidade</small>
              </span>
              <div className="qty-control">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Reduzir quantidade"
                  onClick={() =>
                    setCart((old) => {
                      const next = { ...old };
                      next[String(p.id)] = (old[String(p.id)] ?? 0) - 1;
                      if ((next[String(p.id)] ?? 0) <= 0) delete next[String(p.id)];
                      return next;
                    })
                  }
                >
                  −
                </Button>
                <b>{cart[String(p.id)]}</b>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Aumentar quantidade"
                  onClick={() => addToCart(p.id)}
                >
                  +
                </Button>
              </div>
            </div>
          ))
        )}
        <div className="cart-total">
          <span>Subtotal</span>
          <strong>{money(total)}</strong>
        </div>
        <Button className="w-full" disabled={!items.length} onClick={shareOrder}>
          <Send size={16} /> Preparar no WhatsApp
        </Button>
        <p className="cart-disclaimer">
          Você escolhe o contato no WhatsApp. O pedido não é enviado nem cobrado automaticamente.
        </p>
      </aside>
      {status && (
        <div className="notification" role="status">
          {status}
        </div>
      )}
    </section>
  );
}
