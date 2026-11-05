# Editor avançado identificado pela referência visual

Consulta: 05/11/2026. Repositório: `RELRYS03/expressarte-studio-v75`.

A imagem fornecida pelo usuário corresponde ao **Model Workbench**: interface escura com detalhes âmbar, menus Arquivo/Editar/Malha, ferramentas Selecionar/Mover/Rotacionar/Escalar, gizmo XYZ, hierarquia da cena e exportação STL.

## Referência para continuar

- **Editor principal:** rota `/workbench`, implementada em `src/components/studio/ModelWorkbench.tsx` e `src/components/studio/model-workbench.css`.
- **Branch de origem:** `feature/model-workbench`, ponta consultada `2e48e17c4b0af6043e00f5c50ee26dc6b6bf0bb7`.
- **Branch de continuidade:** `integration/studio-v7.5-candidate`. Ela contém todos os commits da branch de origem; na consulta estava 104 commits de repositório à frente e zero exclusivos atrás. Esse número não representa 104 alterações do editor.
- `/studio` é o fluxo legado/guiado. A nova página inicial de criação não substitui o Workbench. Seus atalhos Editor 3D devem abrir `/workbench`.
- A captura permite identificar o componente e a família visual, mas não provar qual commit exato estava rodando no computador naquele momento.

## Commits encontrados

| Commit | Data, horário de Brasília | O que mudou |
| --- | --- | --- |
| [a5788aa](https://github.com/RELRYS03/expressarte-studio-v75/commit/a5788aa9d84146ad54aeae4cd7e7f04a170e3590) | 31/10/2026 18:27 | Estrutura de modelagem interativa por objetos |
| [63778cd](https://github.com/RELRYS03/expressarte-studio-v75/commit/63778cd6241f9ae44ef53ea298a77f4f4850b4e9) | 31/10/2026 18:28 | Visual CAD escuro correspondente à referência, incluindo os rótulos Organizadores, Chaveiros, Relevo, Reparo e Color Studio |
| [48ff04b](https://github.com/RELRYS03/expressarte-studio-v75/commit/48ff04bcd7adeac5ee1a6670d2818d8548040a7e) | 31/10/2026 18:49 | Seleção em Edit Mode e extrusão de faces |
| [97728cf](https://github.com/RELRYS03/expressarte-studio-v75/commit/97728cf) | 31/10/2026 | Gizmo ligado à seleção de malha |
| [805b169](https://github.com/RELRYS03/expressarte-studio-v75/commit/805b1699bc6f534bab4944d8d46b297fc37bfc0a) | 04/11/2026 12:21 | Mesa Bambu A1 e substituição de botões provisórios por rotas existentes |
| [1bed6d2](https://github.com/RELRYS03/expressarte-studio-v75/commit/1bed6d2) | 04/11/2026 | Preservar orientação Z-up na importação/exportação STL |
| [782c70d](https://github.com/RELRYS03/expressarte-studio-v75/commit/782c70d4ea28ee884c60d01343a745baba1bf037) | 04/11/2026 12:44 | Acesso às ferramentas Blender locais a partir do editor avançado |

## Limites da versão atual

Há atualização funcional posterior ao layout da imagem. O código inclui edição de seleção, extrusão de faces e histórico. Inset/Bevel, booleano, dividir, espelhar e reparar malha continuam com controles desabilitados no Workbench; não descrever esses botões como ferramentas prontas. A existência de operações em outros módulos não significa que estejam conectadas neste editor.

Esta busca foi feita no histórico Git obtido do GitHub, comparando código, ancestralidade e mudanças entre branches. Ela não comprova a versão atualmente publicada no Cloudflare. `main` e produção não foram modificadas.
