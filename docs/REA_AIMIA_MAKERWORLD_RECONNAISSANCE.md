# REA — Reconhecimento técnico do MakerWorld Aimia

**Data da análise:** 2026-11-06  
**Repositório de destino:** `RELRYS03/expressarte-studio-v75`  
**Branch:** `research/aimia-makerworld-rea-2026-11-06`  
**Status:** reconhecimento parcial baseado em uma captura de rede do navegador e inspeção estática do Express'Arte.  
**Alvo observado:** MakerWorld Aimia, com evidências de navegação em `/pt/makerlab/aimia/model3dProjects`.

> Este documento registra apenas evidências observadas, inferências identificadas como tais e lacunas. Não contém cookies, tokens, identificadores de conta, URLs assinadas nem payloads de autenticação.

## 1. Resumo executivo

A captura fornecida (`Texto colado(5).txt`, 858 linhas) contém 90 chamadas `fetch()`, 18 URLs distintas sob caminhos `/api/`, 30 chunks JavaScript de `/_next/static/chunks/`, 3 folhas CSS e 11 hosts externos distintos.

O achado mais relevante é a presença de rotas próprias do serviço Aimia:

- `GET /api/v1/aimia-service/creditv3/generators/ai_modeling/runtime-config`
- `GET /api/v1/aimia-service/aimodeling/3dprojects?limit=20&direction=backward&sort=desc`
- `GET /api/v1/aimia-service/aimodeling/user/setting`

A captura também mostra consultas de créditos, recursos globais do MakerWorld, arquivos estáticos da página e um objeto servido por armazenamento S3 com URL temporária assinada.

**Limite fundamental:** a captura é da área de projetos/listagem (`model3dProjects` aparece nos referers), não de uma geração iniciada. Não foi observada uma chamada POST que crie uma tarefa de geração, um upload de imagem de entrada, nem a resposta do endpoint `runtime-config`. Portanto, ainda não sabemos qual provedor/modelo é selecionado nem como a geração é orquestrada.

## 2. Escopo e método REA

### Material examinado

1. Captura de rede enviada na conversa: `Texto colado(5).txt` (858 linhas).
2. URLs de recursos estáticos e chamadas de API presentes nessa captura.
3. Repositório Express'Arte Studio v7.5: árvore recursiva da branch `main` e arquivos de implementação relacionados a imagem-para-3D, APIs, visualização, malha e exportação.
4. Documentação existente `AGENTS.md` e `docs/ARTCRAFT_REA_INTEGRATION.md`.

### Método aplicado

- **Coleta:** extrair URLs, métodos, referers, nomes de chunks e domínios.
- **Normalização:** agrupar chamadas repetidas e separar APIs Aimia das APIs globais do MakerWorld, telemetria, consentimento e analytics.
- **Análise estática:** inspecionar a arquitetura e os módulos existentes no Express'Arte.
- **Inferência controlada:** deduzir a provável função de endpoints somente pelo caminho/nome, marcando a inferência como não confirmada.
- **Validação pendente:** obter respostas sanitizadas e uma captura da ação de geração para confirmar o fluxo.

O procedimento segue a disciplina do `AGENTS.md`: não alterar `main`, trabalhar em branch isolada, não registrar credenciais e não declarar comportamento sem evidência.

## 3. Evidências observadas no MakerWorld

### 3.1 APIs específicas do Aimia

| Método | Caminho observado | O que a evidência permite afirmar |
|---|---|---|
| GET | `/api/v1/aimia-service/creditv3/generators/ai_modeling/runtime-config` | A página consulta uma configuração de runtime associada ao gerador `ai_modeling`. O conteúdo da resposta não foi incluído na captura. |
| GET | `/api/v1/aimia-service/aimodeling/3dprojects?limit=20&direction=backward&sort=desc` | A página consulta uma coleção paginada/ordenada de projetos 3D. |
| GET | `/api/v1/aimia-service/aimodeling/user/setting` | A página consulta configurações do usuário relacionadas ao Aimia. A semântica exata depende da resposta. |

### 3.2 Créditos e configuração MakerLab

A captura contém consultas GET para:

- `/api/v1/creation-service/my/credit`
- `/api/v1/creation-service/my/credit/detail?limit=10&offset=0&devicePlatform=web`
- `/api/v1/creation-service/my/credit/detail?limit=200&offset=0&devicePlatform=web`
- `/api/v1/creation-service/makerlab/credit/configs`

Também aparece `/api/v1/point-service/product/productsByType?productTypeId=8`.

**Interpretação:** a interface consulta saldo/histórico/configuração de créditos e dados de produtos relacionados. Os custos efetivos por modelo não podem ser deduzidos sem a resposta de configuração.

### 3.3 Serviços globais carregados pela página

Outras rotas observadas:

- `/api/v1/design-store-service/shops`
- `/api/v1/design-store-service/regions`
- `/api/v1/design-store-service/my/region`
- `/api/v1/user-service/my/message/count`
- `/api/v1/design-user-service/my/preference`
- `/api/v1/aftersale-service/makerworld/totalunreadcount`
- `/api/v1/user-service/minors/decisions`
- `/api/v1/mall/mall-order/mw/v2/cart/query`
- `/api/mall-sign-in/sso` (rota de autenticação; não investigada além da observação do nome)

Essas rotas parecem fazer parte do shell/conta/loja/consentimento geral do MakerWorld. Não devem ser classificadas como APIs de geração 3D sem evidência adicional.

### 3.4 Recursos estáticos e bibliotecas

A captura inclui 30 URLs distintas de chunks JavaScript, incluindo:

- chunk da página Aimia: `/_next/static/chunks/pages/makerlab/aimia/%5B%5B...intercept%5D%5D-ce507c505710eca0.js`
- chunk informado anteriormente: `/_next/static/chunks/96058-872c706d0a10a1c3.js`
- chunk nomeado `three-0900cec5d4f8a835.js`
- `/_next/static/chunks/sentry-aea2aab2c76812b8.js`
- chunks de runtime/framework, vendors e aplicação.

Também aparece `/wasm_exec.js`.

**Conclusões calibradas:**
- O nome `three-...` é evidência de que a página carrega um bundle Three.js. Isso não prova que Three.js gere a malha; pode ser usado apenas para visualização.
- `wasm_exec.js` é um runtime auxiliar associado a WebAssembly/Go. A captura não mostra o binário `.wasm` correspondente, portanto não prova que exista processamento 3D em WebAssembly/Go.
- O identificador `sentry.javascript.nextjs/8.47.0` indica a versão do SDK Sentry para Next.js, não a versão do framework Next.js.
- O chunk da página foi solicitado, mas seu conteúdo-fonte não foi fornecido. Ainda não foi feita desminificação nem análise AST desses bundles.

### 3.5 Armazenamento de artefatos

A captura contém uma requisição GET para um objeto no host de armazenamento `or-cloud-makerlab-prod.s3-accelerate.amazonaws.com`, em um caminho com prefixo:

`makerworld/makerlab/aimodeling/3dProject/copymodel/`

A URL original era assinada e temporária; foi deliberadamente omitida deste relatório.

**O que se pode afirmar:** a página acessou um objeto armazenado em infraestrutura S3, associado pelo caminho a um projeto/modelo copiado.  
**O que não se pode afirmar:** formato do objeto, conteúdo, etapa exata do pipeline ou se é o arquivo final de geração. A validade de 24 horas observada pertence à URL assinada capturada, não é uma regra geral do produto.

### 3.6 Telemetria

A captura anterior mostrou eventos enviados a `perf.bblmw.com/api/4/envelope/` com SDK Sentry Next.js 8.47.0. Trata-se de telemetria/monitoramento, não do motor de geração.

## 4. Inventário de hosts da captura

Hosts externos distintos observados:

- `makerworld.com`
- `makerworld.bblmw.com`
- `public-cdn.bblmw.com`
- `or-cloud-makerlab-prod.s3-accelerate.amazonaws.com`
- `perf.bblmw.com`
- `event.bblmw.com`
- `consent.trustarc.com`
- `analytics.google.com`
- `www.googletagmanager.com`
- `static.cloudflareinsights.com`
- `fonts.googleapis.com`

Os hosts de analytics, consentimento, telemetria e fontes são infraestrutura auxiliar. Não devem ser confundidos com provedores de IA.

## 5. Comparação com o Express'Arte Studio v7.5

A árvore recursiva de `main` contém 102 arquivos. O projeto já possui uma base relevante de imagem-para-3D e exportação; portanto, a estratégia recomendada é comparar e reaproveitar, não reconstruir do zero.

| Arquivo | Implementação observada no Express'Arte |
|---|---|
| `src/components/studio/ImageTo3DApp.tsx` | Interface principal de imagem para 3D; prepara imagens, chama Tripo, acompanha tarefas e exporta projeto/malha. |
| `src/components/studio/MeshyImageTo3D.tsx` | Interface de geração Meshy com uma imagem principal e até três vistas extras; acompanha progresso e resultado. |
| `src/lib/studio/tripo-api.ts` | Server functions para upload de arquivo, criação de tarefa image-to-model e consulta de tarefa Tripo; chave via `TRIPO_API_KEY`. |
| `src/lib/studio/meshy-api.ts` | Server functions para image-to-3D/multi-image-to-3D e polling Meshy; chave via `MESHY_API_KEY`. |
| `src/lib/studio/image3d.ts` | Conversão local de raster para malha imprimível em modos relevo, litofania e silhueta; inclui verificação de fechamento. |
| `src/components/studio/ImagePreview3D.tsx` | Visualização de malha com Three.js e OrbitControls. |
| `src/lib/studio/mesh-editing.ts` | Dimensões, transformações, combinação e corte de geometrias. |
| `src/lib/studio/print-exports.ts` | Exportação STL e 3MF, incluindo 3MF com materiais base. |
| `src/lib/studio/image3d.test.ts` | Testes de geração de malha fechada e cabeçalhos/saídas STL e 3MF. |

### Consequência para a arquitetura

O Express'Arte já tem dois conectores de geração em nuvem (Tripo e Meshy) e um pipeline local determinístico para relevo/silhueta/litofania. A principal oportunidade não é copiar um endpoint interno do MakerWorld, mas melhorar a camada de orquestração e a oficina pós-geração:

1. normalizar provedores por uma interface interna comum;
2. registrar provedor/modelo/opções/custo/ID de tarefa e estado;
3. normalizar URLs e formatos de saída;
4. importar GLB/OBJ e validar geometria;
5. reparar/segmentar peças e converter para STL/3MF;
6. manter uma opção local sem créditos para operações compatíveis.

Não implementar nada disso antes de fechar requisitos, licenças, custos e testes, conforme `AGENTS.md`.

## 6. O que ainda não foi comprovado

| Questão | Estado |
|---|---|
| Provedor/modelo selecionado pelo Aimia | Não identificado |
| Conteúdo do runtime-config | Não capturado |
| Endpoint que inicia geração | Não observado |
| Endpoint de upload da imagem | Não observado |
| Formato do payload de geração | Não observado |
| Polling/estado de tarefa | Não observado |
| Formatos de saída efetivamente oferecidos | Não comprovados nesta captura |
| Pipeline de reparo, segmentação e conectores | Não observado |
| Uso de WebAssembly para processamento 3D | Não comprovado |
| Conteúdo do chunk específico da página | Não obtido |

## 7. Próximas etapas de coleta

Prioridade 1 — **capturar o fluxo real de geração sem expor segredos**
1. Na aba Aimia, abrir Network e limpar a lista.
2. Filtrar por Fetch/XHR e manter Preserve log.
3. Usar uma imagem de teste própria e só iniciar a geração após conferir o custo exibido pela interface.
4. Registrar método, caminho, status, Initiator e nomes dos campos do payload; remover cookies, Authorization, tokens, URLs assinadas, IDs pessoais e imagens privadas.
5. Registrar as requisições subsequentes de polling e download. Não repetir chamadas manualmente nem tentar alterar saldo, permissões ou identificadores.

Prioridade 2 — **analisar os bundles estáticos públicos**
1. Obter o conteúdo do chunk da página Aimia e dos chunks compartilhados relevantes por carregamento normal do navegador.
2. Desminificar e fazer busca por nomes de funções, rotas, estados de tarefa, formatos e módulos.
3. Tratar strings e nomes como pistas; confirmar com fluxo de execução e requisições observadas.
4. Não publicar bundles proprietários completos no repositório. Guardar apenas hashes, nomes de arquivos, referências, trechos mínimos necessários e conclusões próprias.

Prioridade 3 — **comparação no Express'Arte**
1. Criar uma matriz de capacidades Aimia versus Tripo/Meshy/local.
2. Comparar qualidade, tempo, custo, formatos, topologia e aptidão para impressão.
3. Implementar somente adaptadores ou melhorias independentes com testes.

## 8. Segurança e higiene de evidências

O material bruto fornecido continha valores de sessão/autenticação e uma URL S3 assinada. Esses valores não foram copiados para o GitHub nem reproduzidos neste relatório. O arquivo bruto não deve ser versionado.

Recomendação: invalidar as sessões/tokens expostos, encerrar sessões ativas e limpar o material bruto de locais compartilhados. A troca de senha, por si só, não garante a invalidação de todos os tokens existentes.

Nunca registrar no GitHub:
- `Cookie`, `Set-Cookie`, `Authorization`, tokens ou CSRF;
- URLs S3 assinadas ou parâmetros de assinatura;
- IDs de conta, projeto privado ou usuário;
- payloads com dados pessoais ou imagens de clientes.

## 9. Fontes e referências

### Evidência primária
- Captura de rede fornecida pelo usuário: `Texto colado(5).txt`, 858 linhas. Não incluída no repositório por conter segredos de sessão.
- Código do Express'Arte na branch `main`, arquivos listados na seção 5.
- `AGENTS.md` e `docs/ARTCRAFT_REA_INTEGRATION.md`.

### Referências técnicas públicas
- MakerWorld Aimia: https://makerworld.com/pt/makerlab/aimia/generate
- Tripo — Image to 3D API (referência de API assíncrona; **não é evidência de que o Aimia use Tripo**): https://developers.tripo3d.ai/en/docs/generation-image-to-model/standard
- Three.js GLTFLoader: https://threejs.org/docs/#examples/en/loaders/GLTFLoader

## 10. Conclusão

A varredura da captura disponível encontrou a superfície de API do Aimia, endpoints de runtime-config, projetos e preferências, sistema de créditos, recursos estáticos e armazenamento de artefatos. Também identificou uma integração Three.js no frontend.

**Ainda não é uma varredura completa de todo o MakerWorld.** É uma análise detalhada de uma captura de uma rota do Aimia e do código atual do Express'Arte. O backend do MakerWorld, outras páginas, respostas de configuração e o fluxo de geração continuam fora do escopo observado.

A próxima evidência decisiva é uma captura sanitizada de uma geração real: criação da tarefa, polling e obtenção do artefato. Até lá, nenhum provedor específico deve ser atribuído ao Aimia e nenhuma integração nova deve ser implementada por suposição.
