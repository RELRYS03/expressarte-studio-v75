# Integração de editor 3D — pesquisa concluída (29/10/2026)

## Execução
- GitHub Actions: https://github.com/RELRYS03/expressarte-studio-v75/actions/runs/40910130044
- Resultado: sucesso; artefato `expressarte-editor-source-research`, aproximadamente 124 MB.
- Fontes isoladas: `taucad/tau`, `Formsmith746/SketchForge-3D`, `xiangechen/chili3d`. Não adicionadas às dependências do produto.

## Escolha inicial
**Preservar Three.js + Manifold existentes. Investigar apenas integração modular do Tau, sem substituir editor.**

Tau, versão declarada `0.1.0-beta.9`:
- `@taucad/three`: utilitários Three.js independentes de framework; licença Apache-2.0; peer dependencies `three ^0.184.0`, `@taucad/camera`, `@taucad/spatial` e `xstate ^6.0.0-alpha.59`.
- `@taucad/viewer`: React Three Fiber, ferramentas CAD de medida/seção, componentes ligados ao ambiente Tau; Node >=24. *Não é drop-in* para a cena existente.
- `@taucad/react`: hooks do runtime Tau; não integrar isoladamente sem runtime.
- Exemplo `examples/react-router`: usa dependências workspace e não pode ser copiado integralmente para TanStack Start sem adaptação.

## Próxima implementação delimitada
1. Corrigir sincronização entre transformações visuais e exportação STL do Studio (PR #17 registra lacuna). Testar modelo com posição, rotação e escala.
2. Testar importação de `@taucad/three` em branch separada, verificando peer deps, licença e bundle. Rejeitar se provocar duplicação do renderer/canvas ou dependência excessiva.
3. Só depois introduzir controles pontuais de medição e seção, comparando com implementação nativa Three.js + Manifold já disponível.
4. Validar exportação e abertura no Bambu Studio antes de merge.

## Licenças
- Tau: Apache-2.0, preservar LICENSE/NOTICE conforme uso.
- SketchForge e Chili3D: AGPL; pesquisa isolada, **não incorporar código** ao produto comercial sem revisão de obrigações de licença.
- Conferir licenças transitivas antes de redistribuir.

## Limites da comprovação
Workflow confirmou clone e empacotamento, **não** compilação/execução dos editores externos nem funcionamento da integração no Studio. Site em produção intacto.
