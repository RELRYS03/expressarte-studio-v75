# Express’Arte Studio v7.5 — Imagem para 3D

**COMECE AQUI:** veja [`README_IMAGEM_PARA_3D.md`](README_IMAGEM_PARA_3D.md) para usar o novo conversor de imagens para STL/3MF, com prévia 3D e medidas em milímetros. Veja [`RELATORIO_V7_5.md`](RELATORIO_V7_5.md) para o estado dos testes e limitações.

O programa continua com os quatro pilares Express’Arte (Studio/editor 3D, Catálogo, Comunidade e Calculadora), mantendo também Formas, Projetos e Mesh Doctor. A página inicial agora é Imagem para 3D; o editor de formas anterior está em `/studio`.

---

# Express'Arte Studio 3D — v7.4 (base web local)

Projeto em **React 19 + TypeScript + Three.js + TanStack Start + Vite**. Esta entrega aperfeiçoa o código recebido, mantendo as telas anteriores, com um novo Catálogo e armazenamento de projetos no navegador.

## Executar no Windows

1. Instale **Node.js 22 ou superior**.
2. Extraia **todo** o ZIP para uma pasta no PC.
3. Dê dois cliques em `INICIAR_WINDOWS.bat` ou, no terminal dentro da pasta, execute `npm install` e `npm run dev -- --host 127.0.0.1`.
4. Abra no navegador o endereço local mostrado no terminal. Na primeira execução, é necessário acesso à internet para baixar dependências do npm.
5. Pressione `Ctrl+C` na janela do terminal para encerrar.

Para usar corte fechado e união booleana do Blender 5.2, abra também `INICIAR_BLENDER_BRIDGE_WINDOWS.bat` e mantenha essa janela aberta. A ponte escuta somente em `127.0.0.1:8766` e aceita as origens locais do Studio. O botão **Verificar** no editor informa se ela está conectada.

O projeto não inclui `node_modules`, banco de dados, backend Python ou executável pré-compilado. Para publicar o site público gratuitamente no Cloudflare Workers, siga [`README_IMAGEM_PARA_3D.md`](README_IMAGEM_PARA_3D.md).

## Funcionalidades entregues

| Área | Estado nesta base |
| --- | --- |
| Studio 3D | 15 formas, texto, material, argola, borda, dimensões, preview WebGL |
| Arquivos 3D | Importação STL até 20 MB; escala por eixo, rotação, espelho, centralização, corte plano e montagem de múltiplos corpos; corte fechado e união booleana via Blender local |
| Projetos | Criação, edição e exclusão em `localStorage`; importa JSON antigo e o novo envelope v7.4, gera backup JSON |
| Catálogo | Cadastra produtos, categoriza, prepara carrinho local e abre mensagem de pedido no WhatsApp para escolha de contato |
| Calculadora | Material, energia, mão de obra, embalagem, manutenção, taxas e margem real sobre preço de venda |
| Mesh Doctor | Diagnóstico básico de triangulação, dimensões e contagem de arestas, sem reparo automático |
| Catálogo de ideias | 602 ideias em 24 categorias, cinco links de pesquisa de modelos por ideia e capas gráficas; o item “Gato articulado” usa render do STL anexado feito no Blender 5.2 |
| Comunidade | Rascunhos privados no navegador e exportação de backup JSON, **não é mural compartilhado** |
| Identidade visual | Paleta creme, café e caramelo, ajustes responsivos |

## Atenção antes de produzir ou vender

- Os projetos, rascunhos e produtos são salvos **apenas no navegador e perfil de usuário atual**. Limpar dados do site remove esse armazenamento. Guarde o JSON das criações e faça cópia do catálogo conforme necessário.
- STL importado **não vira projeto paramétrico editável**; operações de malha ficam na memória até exportar. Exporte a malha que deseja guardar.
- O corte plano direto no navegador deixa a face aberta. Use o corte fechado do Blender ou confira/repare no **Bambu Studio** ou outro fatiador antes de imprimir.
- Montar vários corpos num STL não é união booleana. Use a ação **União booleana com Blender** se os volumes devem virar uma única superfície.
- O botão WhatsApp apenas prepara a mensagem: o usuário seleciona o contato e confirma o envio. Frete, pagamento e disponibilidade **não** são automatizados.
- Integrações Shopee/Mercado Livre, contas individuais, comunidade multiusuário, RK10 e reparo automático geral de malhas **não** estão implementados neste código. O acesso de produção pode ser protegido por uma senha compartilhada da equipe.

## Principais arquivos

- `src/components/studio/StudioApp.tsx`: navegação, controles do Studio, calculadora e Mesh Doctor.
- `src/components/studio/ModelScene.tsx`: cena Three.js.
- `src/lib/studio/model.ts`: geração de geometria.
- `src/lib/studio/persistence.ts`: validação e armazenamento local.
- `src/lib/studio/pricing.ts`: cálculo de custos, taxas e preço.
- `src/components/studio/CatalogPage.tsx`: catálogo local e carrinho.
- `src/components/studio/CommunityPage.tsx`: mural local de rascunhos.

## Testes

Após instalar as dependências:

```bash
npm run test
npm run build
npm run lint
```

A versão distribuída inclui código-fonte e não contém um build de produção pré-validado neste ambiente. Leia `RELATORIO_V7_4.md` para limitações e verificações realizadas.
