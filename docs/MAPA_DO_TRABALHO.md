# Mapa do trabalho existente

Inventário em 05/11/2026. Comece pela [Central do Projeto](../README.md) e acompanhe o [PR central #34](https://github.com/RELRYS03/expressarte-studio-v75/pull/34).

## Consolidação atual

- Candidata única: `integration/studio-v7.5-candidate`.
- #39: correções de exportação STL incorporadas à candidata.
- #40: correção Cloudflare incorporada à candidata; PR contra main permanece para revisão, sem publicação.
- #41: TripoSR, ponte e transferência para oficina GLB incorporados à candidata.
- main não alterada; branches antigas preservadas. Incorporação de código não significa homologação em Windows/Android/Bambu Studio.

## PRs localizáveis

Snapshot anterior à atualização da candidata. A existência de um PR não significa que seu código está integrado ou operacional. Trabalho experimental deve ser avaliado contra a candidata antes de reaproveitar; não mesclar automaticamente todos os PRs.

| PR | Trabalho | Branch de origem | Destino no snapshot |
| --- | --- | --- | --- |
| [#41](https://github.com/RELRYS03/expressarte-studio-v75/pull/41) | Conectar imagem → TripoSR local → oficina GLB → exportação STL | `fix/image-text-generation-20261105` | `integration/studio-v7.5-candidate` |
| [#40](https://github.com/RELRYS03/expressarte-studio-v75/pull/40) | Corrigir erro 503 de autenticação no Cloudflare/Nitro | `fix/production-cloudflare-auth-20261105` | `main` |
| [#39](https://github.com/RELRYS03/expressarte-studio-v75/pull/39) | fix: validar STL de chaveiros e testar exportação binária | `fix/keychain-stl-export-20261104` | `integration/studio-v7.5-candidate` |
| [#34](https://github.com/RELRYS03/expressarte-studio-v75/pull/34) | integration(studio): homologação unificada do Express'Arte Studio v7.5 | `integration/studio-v7.5-candidate` | `main` |
| [#23](https://github.com/RELRYS03/expressarte-studio-v75/pull/23) | fix(studio): exportar transformações do viewport em STL OBJ GLB | `fix/studio-transform-export` | `feature/viewport-transform-controls` |
| [#22](https://github.com/RELRYS03/expressarte-studio-v75/pull/22) | feat: corte fechado e união sólida local com Manifold | `feature/solid-mesh-tools` | `main` |
| [#21](https://github.com/RELRYS03/expressarte-studio-v75/pull/21) | feat: preparar integração Hunyuan3D-2.1 no Express'Arte Studio | `feature/hunyuan3d-adapter` | `main` |
| [#20](https://github.com/RELRYS03/expressarte-studio-v75/pull/20) | Imagem para 3D: correção de transparência, altura independente e teste de referência | `feature/image3d-alpha-reference-tests` | `main` |
| [#19](https://github.com/RELRYS03/expressarte-studio-v75/pull/19) | Criador de chaveiros: modelos rápidos editáveis | `feature/keychain-quick-presets` | `main` |
| [#17](https://github.com/RELRYS03/expressarte-studio-v75/pull/17) | Selecionar, mover, girar e escalar objetos no viewport 3D | `feature/viewport-transform-controls` | `main` |
| [#15](https://github.com/RELRYS03/expressarte-studio-v75/pull/15) | Corrigir visualização da mesa Bambu A1 no Studio 3D | `fix/a1-build-plate-viewport` | `main` |
| [#13](https://github.com/RELRYS03/expressarte-studio-v75/pull/13) | Calculadora Express'Arte com custo completo por peça e lote | `feature/calculadora-custos-completos` | `main` |
| [#12](https://github.com/RELRYS03/expressarte-studio-v75/pull/12) | Expressinho: criar 3D por descrição na página inicial (Blender local / Tripo v3) | `feature/expressinho-texto-3d-real` | `feature/studio-generated-stl-preview` |
| [#11](https://github.com/RELRYS03/expressarte-studio-v75/pull/11) | Studio: carregar chaveiro gerado no editor e corrigir argola solta | `feature/studio-generated-stl-preview` | `feature/studio-ux-editor-first` |
| [#10](https://github.com/RELRYS03/expressarte-studio-v75/pull/10) | Studio UX: editor primeiro e Expressinho em painel lateral simples | `feature/studio-ux-editor-first` | `feature/expressinho-tripo-task-recovery` |
| [#9](https://github.com/RELRYS03/expressarte-studio-v75/pull/9) | Expressinho: retomar tarefas Tripo v3 sem nova geração | `feature/expressinho-tripo-task-recovery` | `feature/expressinho-triposr-local` |
| [#8](https://github.com/RELRYS03/expressarte-studio-v75/pull/8) | Expressinho IA: integração opcional do TripoSR local (imagem → GLB) | `feature/expressinho-triposr-local` | `feature/expressinho-preparar-impressao` |
| [#7](https://github.com/RELRYS03/expressarte-studio-v75/pull/7) | Expressinho: preparar STL local com base plana e simplificacao sem creditos | `feature/expressinho-preparar-impressao` | `feature/expressinho-malha-auditor` |
| [#6](https://github.com/RELRYS03/expressarte-studio-v75/pull/6) | Expressinho: auditoria local de STL e validação automática | `feature/expressinho-malha-auditor` | `feature/expressinho-blender-keychain` |
| [#5](https://github.com/RELRYS03/expressarte-studio-v75/pull/5) | Expressinho gera chaveiros no Blender por descrição | `feature/expressinho-blender-keychain` | `main` |
| [#4](https://github.com/RELRYS03/expressarte-studio-v75/pull/4) | Expressinho IA: entrada de texto, imagem e plano local de modelagem | `feature/expressinho-criacao-etapa1` | `main` |
| [#3](https://github.com/RELRYS03/expressarte-studio-v75/pull/3) | Editor 3D inspirado na interface do Blender | `feature/blender-like-editor-ui` | `main` |
| [#1](https://github.com/RELRYS03/expressarte-studio-v75/pull/1) | Atualizar automaticamente estado da ponte Blender | `fix/blender-bridge-status-refresh` | `main` |

## Referências de geração 3D

| Frente | Fonte existente | Limite conhecido |
| --- | --- | --- |
| TripoSR | [Guia local](EXPRESSINHO_TRIPOSR_LOCAL.md), `/expressinho` | Só imagem; requer instalação/GPU e teste real |
| Texto / Tripo / Blender | PR #12, `feature/expressinho-texto-3d-real` | Experimental; não incorporado integralmente; API paga não autorizada para uso |
| Hunyuan3D | PR #21, `feature/hunyuan3d-adapter` | Adaptador com testes não equivale a motor instalado |
| Chili3D | `feature/chili3d-local-engine` | Preservado como trabalho experimental; homologação independente |
| FreeLLMAPI / Ollama / REA | Integração em planejamento e pesquisa existente | Não presumir conexão ativa nem capacidade de gerar malha |

## Outras branches preservadas

- `origin`
- `docs/artcraft-rea-integration-backlog`
- `feature/agent-instructions-rk10`
- `feature/blender-like-editor-ui`
- `feature/calculadora-custos-completos`
- `feature/chili3d-local-engine`
- `feature/color-studio`
- `feature/editor-workspace-expanded`
- `feature/expressinho-blender-keychain`
- `feature/expressinho-criacao-etapa1`
- `feature/expressinho-malha-auditor`
- `feature/expressinho-preparar-impressao`
- `feature/expressinho-texto-3d-real`
- `feature/expressinho-tripo-task-recovery`
- `feature/expressinho-triposr-local`
- `feature/guided-creation-zapach-inspired`
- `feature/hunyuan3d-adapter`
- `feature/image3d-alpha-reference-tests`
- `feature/integracao-chaveiros-editor`
- `feature/keychain-quick-presets`
- `feature/mesh-workbench-adapter`
- `feature/model-workbench`
- `feature/orcaslicer-mcp`
- `feature/organizador-parametrico`
- `feature/pocket-eden-inspired-editor`
- `feature/qa-studio-integrado`
- `feature/solid-mesh-tools`
- `feature/studio-generated-stl-preview`
- `feature/studio-ux-editor-first`
- `feature/viewport-transform-controls`
- `fix/a1-build-plate-main-sync`
- `fix/a1-build-plate-viewport`
- `fix/blender-bridge-status-refresh`
- `fix/image-text-generation-20261105`
- `fix/keychain-stl-export-20261104`
- `fix/production-cloudflare-auth-20261105`
- `fix/studio-transform-export`
- `integration/studio-v7.5-candidate`
- `main`
- `research/editor-3d-sources`

As branches ficam no próprio GitHub. Este mapa evita depender da memória de conversas anteriores; os detalhes operacionais vigentes ficam na Central e no relatório de validação.

