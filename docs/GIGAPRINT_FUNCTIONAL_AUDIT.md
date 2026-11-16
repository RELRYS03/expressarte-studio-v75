# Auditoria funcional do GigaPrint — Express'Arte

Data da inspeção: 2026-11-16
Referência pública: https://gigaprint.app/
Projeto de destino: Express'Arte Studio v7.5
Branch de pesquisa: research/gigaprint-functional-reverse-engineering-20261116

## 1. Escopo e limites

Esta auditoria registra funcionalidades observáveis na página pública do GigaPrint e as confronta com a arquitetura documentada do Express'Arte. Não representa acesso ao código-fonte privado, aos serviços internos ou a endpoints não públicos do GigaPrint. A reprodução será implementada com código próprio e bibliotecas compatíveis.

O inventário abaixo é a primeira captura da página pública. Cada ferramenta ainda precisa de inspeção individual de sua rota/fluxo, parâmetros, entradas, operações, exportações e testes. Não considerar uma ferramenta reproduzida apenas por existir uma tela.

## 2. Inventário preliminar de ferramentas observadas

### Preparação e operações de malha
- Impressão gigante / dividir STL em blocos para caber na mesa; opções observadas incluem pinos, espigas, encaixes, conectores e ímãs.
- Separar partes independentes em STL, OBJ e 3MF; exportar componentes individuais ou conjunto multiobjeto.
- Reparar STL/OBJ/3MF; detectar furos, faces invertidas, cavidades e fragmentos; reduzir malhas grandes.
- Combinar modelos: união, subtração/corte e interseção; adicionar primitivas e texto em relevo ou gravado.
- Efeitos de malha: low-poly e wireframe.
- Esvaziar modelo (hollow), controlar parede, furos de drenagem e tampões.
- Impressão suspensa em molduras e estruturas.
- Criador de moldes bipartidos com chaves de registro e canal de vazamento.
- Rompecabezas/puzzles com controle de linhas, colunas e folga.

### Organização e armazenamento
- Organizador de gavetas e bandejas.
- Tapete modular para gavetas.
- Organizador de ferramentas e suportes para bits/soquetes.
- Placas de parede para interruptores/tomadas.
- Organização de panelas e frigideiras com pinos e suportes.
- Organizador de refrigerador.
- Caixas com divisórias, tampas e conjuntos encaixáveis.
- Caixas modulares em grade de 42 mm.
- Compartimentos sob medida com cavidades para objetos.
- Organizadores modulares para armários.
- Personalização de maletas rígidas, incluindo inserções e painéis de grade.

### Imagem, texto, decoração e personalização
- Litofania em painel plano, curva, cilindro e formas especiais; divisão em painéis.
- Objetos litofania em formas 3D iluminadas.
- Placas em relevo a partir de modelo 3D.
- Cortadores, carimbos e etiquetas a partir de desenho/logo.
- Impressão multicolorida a partir de PNG/JPG/SVG com atribuição de filamentos e saída 3MF.
- Letras volumétricas/bubble e nomes flexíveis/articulados.
- Pintura com filamento por camadas de altura e múltiplos filamentos.
- Placas, letreiros e etiquetas QR/Wi-Fi.
- Molduras para fotos.
- Ornamentos termoformados.
- Luminárias de sombra e painéis de luz.
- Painéis decorativos e paredes de armazenamento hexagonal.
- Vasos, cachepôs e bandejas.
- Gerador de capas para telefone e notebook.
- Molduras de placas veiculares.

### Produtos e mecanismos especializados
- Rodas decorativas para lixeiras.
- Correntes e elos articulados.
- Quebra-cabeça de coração com chaveiros.
- Chaveiro clicker com encaixe de interruptor.
- Braço robótico com servos e peças de montagem.

## 3. Controles e fluxos observados no editor

A captura da página revelou controles de:
- Carregamento por seletor de arquivo e arrastar/soltar.
- Transformações de rotação em X/Y/Z, valores numéricos e passos de 90 graus.
- Posicionamento X/Y/Z em milímetros e centralização.
- Escala/dimensionamento do modelo.
- Orientação automática para impressão.
- Formas de moldura e parâmetros de folga, abertura, parede, profundidade e nervuras.
- Efeitos low-poly/wireframe com densidade configurável.
- Adição de texto e primitivas; escolha de fonte, face, relevo/gravação, altura, profundidade e posição.
- Segundo modelo para união, corte ou interseção, com escala e transformações.
- Visualizações 3D, frontal, superior, lateral, wireframe e ajuste.
- Explosão/agrupamento, IDs de peças, verificação de mesa, preenchimento, conectores e seção transversal.
- Tabelas de peças com dimensões, volume, triângulos, peso, filamento, tempo e custo.
- Estimativas com material, densidade, diâmetro do filamento, preço e massa do rolo, preenchimento, paredes, altura de camada e classe de velocidade.
- Exportação de STL por peça, ZIP, 3MF por placas e folha de montagem PDF.

Os controles acima são evidência de interface observada. O funcionamento interno de cada operação ainda precisa ser verificado com testes de entrada/saída.

## 4. Arquitetura atual do Express'Arte identificada no repositório

Stack documentada em package.json/README:
- React 19 + TypeScript.
- TanStack Start e Vite.
- Three.js.
- Vitest e ESLint.
- Componentes principais: src/components/studio/StudioApp.tsx, ModelScene.tsx, ImageTo3DApp.tsx, ImagePreview3D.tsx, CatalogPage.tsx e CommunityPage.tsx.
- Bibliotecas de domínio: src/lib/studio/model.ts, mesh-editing.ts, print-exports.ts, pricing.ts, persistence.ts e image3d.ts.
- Rotas: index, studio, formas, projetos, catalogo, comunidade, calculadora e mesh-doctor.

O README registra importação STL até 20 MB, transformações e operações de malha, ponte local com Blender para corte fechado/união booleana, exportação, calculadora e Mesh Doctor de diagnóstico básico. Também documenta limitações: reparo automático geral não implementado; STL importado não se torna paramétrico; comunidade é local; catálogo e projetos usam armazenamento local.

## 5. Matriz inicial de integração

| Domínio GigaPrint | Base Express'Arte | Próximo trabalho |
|---|---|---|
| Editor e transformações | StudioApp + ModelScene | Verificar seleção, gizmos, undo/redo, unidades e persistência |
| Importação STL | mesh-editing / Studio | Testar STL binário/ASCII, limites, escala e geometria inválida |
| Separar partes | Parcial/não confirmado | Connected components, remoção de fragmentos e exportação múltipla |
| Reparar malha | Mesh Doctor diagnóstico | Diagnóstico topológico e reparação com verificação de watertightness |
| Corte em blocos | Parcial via Blender/planejamento | Cortes fechados, conectores, folgas e encaixes |
| Booleanas | Ponte Blender local documentada | Testar união, diferença e interseção com sólidos reais |
| Geradores paramétricos | Modelagem base existente | Criar geradores isolados com schema de parâmetros e testes geométricos |
| Litofania | Não confirmada | Pipeline imagem → mapa de espessura → malha → STL |
| Placa em relevo | Não confirmada | Projeção de altura/booleana e validação de espessura |
| 3MF multiobjeto | Exportação precisa de QA | Validar pacote ZIP, 3D/3dmodel.model, unidades, componentes e metadados |
| Estimativas | pricing.ts | Diferenciar estimativa geométrica de previsão real do slicer |
| Catálogo/UX | Catálogo local existente | Busca, filtros, estados vazios e responsividade |

## 6. Plano de engenharia reversa e implementação

1. Mapear cada ferramenta e identificar sua rota, estado inicial, parâmetros e formatos.
2. Registrar casos de teste reproduzíveis: arquivo de entrada, parâmetros, resultado esperado e arquivo exportado.
3. Priorizar o núcleo comum: importação, normalização de unidades, bounds, componentes conectados, cortes, booleanas, reparação e exportação.
4. Criar adaptadores de geometria para evitar acoplamento da UI ao motor.
5. Implementar geradores paramétricos como módulos independentes, com schemas e testes.
6. Integrar progressivamente no Studio existente, sem remover rotas ou componentes.
7. Validar STL/3MF com ferramentas independentes e abrir os arquivos no slicer.
8. Executar test, build e lint; registrar falhas sem declarar sucesso indevido.

## 7. Regras de preservação

- Não alterar main.
- Não apagar ou substituir arquivos existentes.
- Não fazer reset ou force-push.
- Não importar código proprietário, assets ou textos protegidos do GigaPrint.
- Não instalar dependências sem justificar compatibilidade, licença e manutenção.
- Toda alteração funcional precisa de testes e evidência de saída real.
- Backup do diretório local Windows ainda precisa ser realizado no ambiente local; esta auditoria no GitHub não cria backup da pasta do usuário.

## 8. Próxima unidade vertical recomendada

Começar por **Separar partes de STL**:
- carregar STL real;
- validar unidades e bounds;
- identificar componentes conectados por conectividade de triângulos;
- permitir selecionar/remover componentes;
- pré-visualizar cada componente;
- exportar STL individual e ZIP;
- testar malha com múltiplos sólidos, fragmentos pequenos e arquivo vazio/corrompido.

Essa unidade exercita o pipeline comum de malha e gera uma base reutilizável para reparação, corte e combinação.
