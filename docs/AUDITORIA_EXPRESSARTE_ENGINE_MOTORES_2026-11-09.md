# Auditoria inicial — Express'Arte Engine

Data: 2026-11-09
Base desta auditoria: branch `main` e leitura de branches/documentos existentes. Esta entrega é inventário documental; não houve acesso ao Windows/GPU do usuário nem execução local de inferência.

## Resumo executivo

O repositório contém ferramentas locais reais para geometria 2.5D e modelagem paramétrica, integrações de API pagas para Tripo/Meshy e uma integração experimental de TripoSR local em branch candidata. Não há evidência suficiente para afirmar que um motor de IA local esteja instalado e operacional no computador do usuário.

A geração paga não é necessária para usar o conversor local de relevo/silhueta/litofania, o criador paramétrico ou as ferramentas de inspeção. Geração livre de personagens por IA é outro problema e depende de um modelo local, pesos, runtime e hardware compatível.

## Inventário por evidência

| Motor/ferramenta | Evidência no repositório | Situação confirmada | Custo por geração externa | Próxima validação |
|---|---|---|---|---|
| Conversor local imagem→malha | `src/lib/studio/image3d.ts`, chamado por `ImageTo3DApp.tsx` | Implementação local para relevo, silhueta e litofania; não é reconstrução 3D completa | Nenhum | Teste de browser e STL com imagens reais |
| Modelagem paramétrica | PR #34 descreve boneco base, chaveiro e organizador com Manifold | Entrega documentada e testes relatados no PR; verificar integração na base que será adotada | Nenhum | Confirmar branch de integração e executar suíte |
| Tripo API | `src/lib/studio/tripo-api.ts` em main | Integração remota; exige `TRIPO_API_KEY`; envia `texture: true` e `pbr: true` | Sim, conforme plano/créditos do fornecedor | Diagnóstico de chave/endpoint/status sem iniciar tarefa paga |
| Meshy API | `src/lib/studio/meshy-api.ts` em main | Integração remota; exige `MESHY_API_KEY`; suporta 1–4 imagens e consulta de tarefa | Sim, conforme plano/créditos | Não executar POST; verificar configuração sem revelar segredo |
| TripoSR local | `feature/expressinho-triposr-local`, `docs/EXPRESSINHO_TRIPOSR_LOCAL.md`, componente `ExpressinhoTripoSR.tsx` na candidata | Código experimental de ponte local; documentação diz explicitamente que dependências, GPU, pesos e geração real no Windows estão pendentes | Sem créditos de API quando executado localmente | Diagnóstico de hardware e teste de status; inferência somente após autorização e pesos disponíveis |
| Hunyuan3D | Branch `feature/hunyuan3d-adapter` | Branch sugere adaptador/prova de conceito; nenhum arquivo `hunyuan3d-api.ts` foi encontrado no caminho tentado da candidata. Não prova runtime instalado | Pode ser local, mas exige hardware e pesos | Inspecionar branch completa, dependências, licença e compatibilidade |
| InstantMesh | Não encontrado como integração em main no inventário de caminhos | Não comprovado no repositório | Local se instalado | Avaliar instalação e requisitos CUDA antes de adotar |
| TRELLIS.2 | Não encontrado como integração em main no inventário de caminhos | Não comprovado no repositório | Local se instalado | Avaliar requisitos CUDA, dependências e memória |
| Stable Fast 3D | Não encontrado como integração em main no inventário de caminhos | Não comprovado no repositório | Local se instalado | Revisar licença Stability AI e registro comercial antes de uso |
| Texture Studio | Branches/rotas devem ser auditadas; `ColorStudio.tsx` na candidata é ferramenta de receitas/amostragem de tintas | Não confundir receitas de tinta física com texturização PBR de malha 3D | Nenhum para processamento local, se implementado | Inventariar branch `feature/color-studio` e separar cor de tinta/filamento de materiais PBR |
| Mesh Doctor | `src/routes/mesh-doctor.tsx` em main; PR #43 | Diagnóstico; PR informa que não faz reparo automático | Nenhum | Reconciliar PR e testar geometrias defeituosas |
| Oficina GLB / inspeção | PR #42 adiciona `/inspecionar-glb`; candidata tem handoff IndexedDB e oficina `/modelo-ia` | Funcionalidades estão distribuídas entre branches/PRs; não presumir que todas estejam na main | Nenhum | Definir branch-base de integração e testar importação GLB |
| Print Studio | `src/lib/studio/print-exports.ts` e conversor local; branches de preparação de impressão | Exportação local existe em código/branches; confirmar formatos e preservação de cores | Nenhum | Validar STL/3MF real no Bambu Studio |

## Diagnóstico preliminar da geração que pode estar falhando

1. **Tripo e Meshy não são motores locais.** Seus adaptadores chamam serviços externos e exigem chaves de API.
2. **TripoSR é experimental e separado da main.** A documentação `docs/EXPRESSINHO_TRIPOSR_LOCAL.md` afirma que a existência de caminhos configurados não prova que PyTorch, pesos e GPU funcionem.
3. **Compatibilidade de hardware é um bloqueio provável, mas ainda não diagnosticado.** A documentação do projeto alerta que o TripoSR original recomenda NVIDIA/CUDA e que uma RX 580 AMD não segue o caminho CUDA padrão. Isso não substitui a leitura do hardware real.
4. **Imagem para relevo não equivale a imagem para personagem 3D.** `image3d.ts` gera relevo, silhueta e litofania; não reconstrói a parte traseira de um boneco.
5. **As branches contêm entregas não incorporadas à main.** É necessário selecionar e integrar cuidadosamente a candidata, sem misturar PRs/branches automaticamente.
6. **Não há diagnóstico do erro em execução do PC nesta auditoria.** Sem logs do serviço local, hardware, ambiente Python e pesos, a causa exata permanece não verificada.

## Licenças e riscos de adoção

| Projeto | Licença/condições verificadas | Decisão preliminar |
|---|---|---|
| TripoSR (VAST-AI-Research) | MIT indicada pelo projeto e documentação existente do repositório; conferir LICENSE e licença/termos dos pesos efetivamente baixados | Candidato prioritário para teste local, condicionado a GPU/runtime e validação de pesos |
| InstantMesh (TencentARC) | Apache-2.0 no repositório oficial; README recomenda Python >=3.10, PyTorch >=2.1 e CUDA >=12.1 | Não priorizar para RX 580 sem prova de backend compatível |
| TRELLIS.2 (Microsoft) | MIT para projeto/modelo; README alerta que dependências como nvdiffrast e nvdiffrec têm licenças próprias e stack CUDA especializada | Candidato de servidor NVIDIA, não presumir viável localmente |
| Hunyuan3D 2.1 (Tencent) | Tencent Hunyuan 3D 2.1 Community License, não MIT. Exclui UE/Reino Unido/Coreia do Sul; impõe condições de distribuição/aviso e prevê licença adicional para produtos com mais de 1 milhão de usuários ativos mensais, entre outras obrigações | Revisão jurídica obrigatória antes de qualquer produto/serviço |
| Stable Fast 3D (Stability AI) | Stability AI Community License; uso comercial exige registro; termos publicados preveem limite de receita anual de US$ 1 milhão e licença enterprise acima do limite | Não classificar como MIT/gratuito irrestrito; revisar elegibilidade e registro |

Fontes oficiais:
- TripoSR: https://github.com/VAST-AI-Research/TripoSR
- InstantMesh: https://github.com/TencentARC/InstantMesh
- TRELLIS.2: https://github.com/microsoft/TRELLIS.2
- Hunyuan3D 2.1: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- Stable Fast 3D: https://github.com/Stability-AI/stable-fast-3d

A licença do código não garante automaticamente a mesma licença para pesos, datasets, dependências ou modelos derivados. Cada artefato precisa de verificação própria antes de distribuição.

## Recomendação da primeira execução técnica

**Não iniciar pelo Canvas visual.** Primeiro provar um motor local.

1. Obter inventário real do PC: GPU, VRAM, driver, RAM, Python e runtimes disponíveis.
2. Verificar se TripoSR está instalado, se os pesos existem e se o endpoint local responde.
3. Não baixar pesos nem instalar pacotes pesados sem autorização explícita.
4. Se a RX 580 não suportar o runtime necessário, avaliar CPU ou execução em outra máquina/servidor próprio; não prometer desempenho em tempo real.
5. Depois de um GLB gerado localmente, conectá-lo ao handoff IndexedDB já existente na branch candidata e à oficina.
6. Somente então construir Canvas como orquestrador de ferramentas comprovadas.

## O que não foi feito nesta entrega

- Nenhuma API de Tripo/Meshy foi chamada para criar tarefa.
- Nenhum crédito foi consumido.
- Nenhum peso de modelo foi baixado.
- Nenhuma dependência foi instalada.
- Nenhuma alteração foi feita na branch `main`.
- Não houve acesso ao PC, à RX 580, ao Blender local ou ao Bambu Studio.
- Não foram executados testes, build ou inferência; esta alteração é documentação de auditoria baseada no repositório e fontes oficiais.

## Critério de saída da Fase 1

A auditoria documental está registrada. A fase só será considerada tecnicamente fechada quando houver inventário do hardware local, estado de instalação dos pesos e um teste de inferência sem API paga, ou um bloqueio reproduzível com log e plano de correção.
