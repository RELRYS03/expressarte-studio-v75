# GigaPrint — inventário global para engenharia reversa funcional

Data da captura: 2026-11-16  
Fonte primária: página pública aberta em `https://gigaprint.app/#ornament`  
Escopo: catálogo público completo, descrições observáveis, rotas ligadas e capacidades gerais declaradas pelo próprio site.

> Este documento registra o que foi efetivamente observado na página pública. Não representa acesso ao código-fonte privado, aos serviços internos ou aos algoritmos do GigaPrint. O objetivo é reconstruir comportamentos equivalentes com implementação própria, sem copiar código, identidade visual, textos ou ativos protegidos.

## 1. Visão global observada

O site se apresenta como um banco de trabalho 3D executado no navegador. Declara que os arquivos do usuário são processados localmente e não saem do dispositivo.

Capacidades gerais anunciadas:
- Entrada: STL, OBJ, 3MF, PNG, JPG e SVG.
- Saída: STL, 3MF multiobjeto, placas de impressão, folhas de corte SVG e folhas de montagem PDF.
- Compatibilidade anunciada com mais de 50 volumes/perfis de impressoras de marcas como Bambu, Prusa, Creality e Elegoo.
- Pré-visualizações antes da exportação.
- Estimativas de filamento, custo e tempo.
- Fluxo de importação, preparação, visualização, validação e exportação dentro do navegador.
- A página declara exemplos práticos descarregáveis para iniciar cada ferramenta.

## 2. Catálogo público de ferramentas

A página informa “49” ferramentas. A lista abaixo foi extraída dos links internos e descrições visíveis no catálogo da página.

| # | Ferramenta | Rota pública | Função anunciada |
|---:|---|---|---|
| 1 | Impressão gigante / divisor de modelos | `/stl-splitter` | Escalar STL/OBJ/3MF e dividir em blocos que cabem na mesa; juntas, IDs, montagem e placas |
| 2 | Organizador de gavetas | `/drawer-organizer` | Recipientes arredondados e redimensionáveis para preencher gavetas |
| 3 | Tapete de gaveta | `/drawer-mat-generator` | Mosaico de peças encaixáveis para preencher gavetas |
| 4 | Organizador de ferramentas | `/tool-organizer` | Suportes dimensionados e identificados para bits, chaves e soquetes |
| 5 | Placas de parede | `/wall-plate-generator` | Placas para interruptores e tomadas em diferentes padrões e módulos |
| 6 | Moldura de fotos | `/picture-frame-maker` | Molduras com perfis, abertura, passe-partout, rebaixo e peças cortadas em mitra |
| 7 | Impressão multicolorida | `/multicolor-3d-print-maker` | Converter PNG/JPG/SVG em peças por cor e 3MF com filamentos atribuídos |
| 8 | Letras balão | `/bubble-letter-generator` | Letras infladas, texturas, suportes e impressão multicolorida |
| 9 | Adornos de Natal | `/christmas-ornament-maker` | Malha plana termoformada, design predistorcido e prensa para formar adornos |
| 10 | Organizador de geladeira | `/refrigerator-organizer` | Módulos para prateleiras, ovos, latas, garrafas e alimentos |
| 11 | Organizador de panelas | `/pots-and-pans-drawer-organizer` | Pegboard, pinos removíveis e suportes para panelas e tampas |
| 12 | Lâmpada de Natal gigante | `/giant-christmas-bulb` | Bulbo C7 em vários tamanhos, facetas, tampa, alojamento de luz e divisão |
| 13 | Criador de caixas | `/box-maker` | Caixas parametrizadas, divisórias, tampas de fricção, magnéticas ou conjuntos |
| 14 | Impressão suspensa | `/suspended-print` | Modelo suspenso por fios dentro de moldura, com geometrias de armação |
| 15 | Criador de moldes | `/mold-maker` | Moldes de duas partes ou carcaça, chaves de registro, canais e respiros |
| 16 | Criador de litofanias | `/lithophane-maker` | Fotos em painéis planos, curvos, cilíndricos, cônicos, globos e caixas de luz |
| 17 | Placas em relevo | `/relief-plaque-maker` | Projetar modelo 3D em placa, moeda, medalhão ou letreiro; baixo-relevo e negativo |
| 18 | Cortadores e etiquetas | `/cookie-cutter-maker` | Traçar imagem/logo para cortador, carimbo, chaveiro, emblema ou extrusão |
| 19 | Corte a laser/CNC | `/laser-cut-slicer` | Fatiar modelo em camadas/grade e exportar SVG/DXF com compensação de corte |
| 20 | Low-poly e wireframe | `/low-poly-generator` | Reestilizar malha em escultura facetada ou wireframe imprimível |
| 21 | Esvaziar modelo | `/hollow-stl` | Criar casca com espessura definida, furos de drenagem e inspeção por seção |
| 22 | Combinar modelos | `/combine-stl` | União, subtração, interseção, primitivas e texto em relevo/gravação |
| 23 | Quebra-cabeça | `/jigsaw-puzzle-maker` | Criar grade de peças com folga constante e encaixes |
| 24 | Quebra-cabeça de coração/chaveiro | `/heart-keychain-puzzle` | Coração dividido em peças interligadas, com nomes e furos para argola |
| 25 | Separar partes | `/separate-stl-parts` | Detectar componentes desconectados em STL/OBJ/3MF e exportar individualmente ou em conjunto |
| 26 | Reparar STL | `/stl-repair` | Detectar e corrigir furos, faces invertidas, lacunas e fragmentos; reduzir triângulos |
| 27 | Aros para rodas de lixeira | `/trash-can-rim-generator` | Aros/capas personalizados, estilos, texto/logo, spinner e fixações |
| 28 | Corrente cubana | `/cuban-link-necklace-generator` | Corrente articulada/entrelaçada com dimensões, folgas e fecho |
| 29 | Pintura com filamento | `/filament-painting` | Converter foto em camadas de filamentos translúcidos com trocas por altura e 3MF |
| 30 | QR e etiquetas Wi-Fi | `/qr-code-wifi-tag-maker` | QR em relevo de duas cores em placas, chaveiros, suportes e bases |
| 31 | Letreiros e placas de nome | `/sign-nameplate-maker` | Texto, fundo com forma, bordas, ícones, suportes e 3MF multicolorido |
| 32 | Chaveiros e tags de pets | `/keychain-pet-tag-maker` | Lotes de etiquetas com nomes e formatos, furos e duas cores |
| 33 | Nome flexível | `/flex-name-generator` | Nome flexível articulado em uma peça, com malha/tiles e 3MF |
| 34 | Moldura de placa veicular | `/license-plate-frame-maker` | Moldura para placas de regiões diferentes, texto e divisão para mesa |
| 35 | Personalizar maleta Pelican | `/customize-your-pelican` | Organizadores medidos por CAD, painéis de grade, suportes e alças |
| 36 | Parede hexagonal de armazenamento | `/hex-storage-wall-planner` | Planejar painéis hexagonais, contornar obstáculos e encaixar acessórios |
| 37 | Lâmpada de sombras | `/shadow-lamp-generator` | Converter silhueta/logo em luminária que projeta sombra, com pontes e base |
| 38 | Cúpula de litofania | `/lithophane-lampshade-generator` | Enrolar foto em cúpula/tela e gerar base com vários tipos de luz |
| 39 | Objetos de litofania | `/lithophane-objects` | Foto em objetos ocos iluminados, como bolas, lua, coração e gema |
| 40 | Caixas de grade 42 mm | `/grid-bin-generator` | Caixas modulares com divisórias, pega, etiqueta, borda de empilhamento e bases |
| 41 | Gerador de vasos | `/vase-generator` | Vasos/porta-lápis com torções, estrias, ondas e modo espiral ou parede estanque |
| 42 | Painéis geométricos de parede | `/geometric-wall-panels` | Painéis com padrões, layout, clipes, penduradores e cores |
| 43 | Vasos e bandejas para plantas | `/plant-pot-generator` | Vasos, bandejas, drenagem, irrigação e divisão para mesas menores |
| 44 | Carimbos personalizados | `/custom-stamp-maker` | Carimbo manual/rolo com texto, logo, padrão, espelhamento e peças em TPU/PLA |
| 45 | Chaveiro clicker com nome | `/name-clicker-keychain-maker` | Carcaça e base com interruptores de teclado, nome/logo e 3MF |
| 46 | Braço robótico | `/robot-arm-generator` | Braço com 4–6 servos, dimensões, pinça, placas e instruções de montagem |
| 47 | Capa para telefone | `/phone-case-generator` | Capas TPU ou rígidas por modelo de dispositivo, padrões, logo e acessórios |
| 48 | Expansor de cigarros (novidade) | `/cigarette-expander` | Acessório de novidade multiabertura, com opções de tamanho e padrão |
| 49 | Ferramenta adicional exibida no catálogo | A confirmar na navegação integral | O contador do catálogo mostra 49; a extração textual de links identificou 48 geradores únicos além do agrupador de organização. Confirmar o item restante em navegação por categoria antes de fechar a lista |

> O contador da interface e a extração de links não coincidem perfeitamente: há agrupadores e rotas reutilizadas. Não se deve inventar o item faltante. A lista será reconciliada abrindo as categorias e páginas individuais.

## 3. Calculadoras públicas identificadas

| Calculadora | Rota | Entradas/finalidade observadas |
|---|---|---|
| Calculadoras 3D | `/3d-printing-calculators` | Índice de calculadoras |
| Custo de impressão | `/3d-print-cost-calculator` | Estimar custo de material/impressão |
| Preço de venda | `/3d-print-price-calculator` | Estimar preço de venda |
| Peso e comprimento do filamento | `/filament-weight-length-calculator` | Converter massa/comprimento de filamento |
| Custo de eletricidade | `/3d-printer-electricity-cost-calculator` | Estimar energia e custo |
| Filamento restante no carretel | `/filament-spool-remaining-calculator` | Estimar filamento restante |
| Escala de impressão | `/3d-print-scale-calculator` | Calcular escala/dimensões |

## 4. Capacidades transversais a investigar em cada ferramenta

1. Importação e parsing de STL, OBJ e 3MF.
2. Unidade, orientação, escala e transformação de malhas.
3. Visualizador 3D, câmera, grade, seleção, wireframe e seções.
4. Parâmetros específicos, validação e atualização ao vivo.
5. Geometria procedural e operações booleanas.
6. Componentes desconectados, reparação e validação watertight.
7. Ajuste à mesa, divisão em peças, juntas e tolerâncias.
8. Disposição em placas e múltiplas impressoras.
9. Estimativas de filamento, custo e tempo.
10. Exportação STL, OBJ, 3MF, SVG, DXF e PDF conforme ferramenta.
11. 3MF multiobjeto, cores, materiais, placas e atribuição de filamento.
12. Exemplos de demonstração e fluxo gratuito/Pro, sem reproduzir autenticação ou cobrança proprietária.

## 5. Evidências e limites da engenharia reversa

### Evidências capturadas
- Texto completo extraído da página pública principal, incluindo catálogo, descrições, rotas e rodapé.
- 70 links internos únicos identificados; incluem geradores, calculadoras, guias, ajuda, termos e páginas institucionais.
- Controles e etapas do gerador de adornos observados em captura anterior, registrados em `reference/gigaprint-ornament-maker-observed.md`.

### Ainda não capturado
- Painel de controles completo e estados de cada uma das outras páginas de ferramenta.
- Valores padrão, limites, dependências entre parâmetros e validações de cada gerador.
- Algoritmos exatos de geometria e parâmetros internos.
- Estrutura binária/metadata de arquivos 3MF reais gerados pelo site.
- Bibliotecas e versões efetivamente usadas pelo GigaPrint, salvo quando declaradas publicamente.
- Comparações de arquivos de entrada/saída por ferramenta.

O texto do catálogo é evidência de funcionalidade anunciada, não prova de como o algoritmo foi implementado. Para cada rota, a próxima fase de captura deve registrar: tela inicial, todos os grupos de parâmetros, valores padrão, ações, estados de pré-visualização, arquivos exportados e comportamento com entradas-limite.

## 6. Plano de reprodução técnica

Ordem de trabalho recomendada, sem alterar o Studio original:

1. **Captura sistemática do site inteiro:** abrir cada rota, registrar grupos de controles, exemplos, estados e exportações.
2. **Infraestrutura comum de arquivos:** importadores, normalização de unidades, geometria, validação, exportadores e estimativas.
3. **Ferramentas de preparação de malha:** separar partes, reparar, esvaziar, combinar, low-poly e divisor de modelos.
4. **Geradores paramétricos de organização:** gavetas, caixas, grade 42 mm, ferramentas, geladeira, panelas e maletas.
5. **Geradores de imagem/luz:** litofanias, objetos, telas, pintura de filamento, sombra e multicolor.
6. **Geradores de peças e decoração:** adornos, molduras, placas, letras, carimbos, chaveiros, vasos e painéis.
7. **Ferramentas mecânicas e compostas:** moldes, impressão suspensa, corrente, braço robótico e capas.
8. **Calculadoras e exportação:** custos, filamento, escala, energia, 3MF multicolor e placas.
9. **Validação cruzada:** parâmetros equivalentes, dimensões, malha fechada, reimportação no Bambu Studio e testes em 390 px/desktop.

Cada ferramenta só pode receber estado “concluída” depois de geração real, exportação, reimportação e teste. Interface ou preview isolado não contam como implementação funcional.
