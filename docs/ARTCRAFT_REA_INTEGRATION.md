# Integrações estudadas: ArtCraft + REA (28/10/2026)

Objetivo: preservar oportunidades identificadas e transformar pesquisa em melhorias testáveis do Studio Express'Arte, sem substituir o editor existente.

## Fontes e licenças
- ArtCraft: https://github.com/storytold/artcraft — licença dual MIT/Apache-2.0 no código próprio. Conferir NOTICE e licenças de modelos/serviços antes de incorporar.
- REA: https://github.com/morluto/rea — MIT para código próprio; auxilia investigação via MCP. **Não necessário para análise ordinária de repositórios com fonte disponível**. Usar somente se houver comportamento não esclarecido pelo código.
- REA setup oficial: `npx rea-agents setup` (NÃO executar automaticamente; dependências e permissões precisam ser revistas).

## Componentes que vale avaliar, por ordem de impacto
1. **Montagem de cenas 3D / stage**: estrutura de objetos, seleção, posição, orientação, escala e câmera. **Ação no Studio**: comparar com ModelScene.tsx; selecionar e transformar objeto por gizmo e mouse. Já há implementação proposta na PR #17; validar antes de migrar ou incorporar terceiros.
2. **Combinar peças / kitbashing**: múltiplos corpos, hierarquia, agrupar/desagrupar e alinhamento. **Ação**: verificar funções existentes em mesh-editing.ts e a integração com Blender Bridge; adicionar teste com duas peças e exportação.
3. **Imagem para malha 3D**: analisar pipeline de entrada, geração e importação. **Ação**: usar interfaces do ArtCraft como referência; integrar modelos externos apenas após verificar disponibilidade, limites, custo, licença comercial e qualidade para impressão.
4. **Remoção de fundo e composição 2D**: preparar logotipos e desenhos para chaveiros, texto em relevo e placas. **Ação**: priorizar pré-processamento local que permita prévia e exportação.
5. **Experiência de edição**: barra contextual de ferramentas, propriedades em mm, seleção destacada, zoom/orbit/pan e desfazer/refazer. **Ação**: adaptar interfaces, sem copiar recursos sem licença ou substituir o stack Three.js.

## Critérios para integrar em produção
- Funcionalidade concreta ligada ao fluxo: imagem > 3D > selecionar/editar > validar malha > STL/3MF > Bambu Studio.
- Não prometer que serviço de geração 3D é gratuito; planos, créditos e infraestrutura variam.
- Preservar parâmetros em mm, geometria exportada e cópias de projetos; não aplicar só transformação visual.
- Testar `npm run test`, `npm run build`, `npm run lint`, e pelo menos um teste manual de mouse e exportação.
- Mudanças por PR pequeno, sem deploy automático, com observações de segurança/licenças.
- Estado neste documento: **pesquisa e rastreabilidade integradas ao repositório; nenhuma função do ArtCraft foi copiada ou ativada**.

## REA: quando usar
Somente quando comparação de execução e leitura do código-fonte não explicarem um comportamento específico, com autorização para inspecionar o alvo. Antes disso, não instalar ferramentas de decompilação nem registrar MCPs no Windows.
