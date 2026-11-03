# Pesquisa técnica — Tripo Studio e evolução do Express'Arte Studio
Data: 2026-11-03. **Análise documental e revisão estática, não homologação funcional.**

## Fontes públicas
- Tripo Studio: https://studio.tripo3d.ai/pt
- Tripo, imagem para 3D (guia oficial): https://www.tripo3d.ai/product-doc/model-generation/image-to-3d
- Tripo H3.1: https://developers.tripo3d.ai/en/models/v3-1
- API Image-to-Model: https://developers.tripo3d.ai/en/docs/generation-image-to-model/standard
- Linha P / topologia limpa: https://developers.tripo3d.ai/en/docs/generation-image-to-model/p
- Pipeline completo: https://www.tripo3d.ai/help/getting-started/what-features-does-tripo-have
- TripoSR lançado pela Stability AI: https://stability.ai/news-updates/triposr-3d-generation
- Hunyuan3D-2.1: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- TRELLIS: https://github.com/microsoft/TRELLIS

## Como funciona, segundo informação pública
1. Pré-processar imagem de referência, isolando objeto e resolvendo oclusões em parte por inferência.
2. Reconstruir geometria 3D com modelo treinado (imagem única ou múltiplas vistas). Não há comprovação pública do código completo dos atuais modelos proprietários H3.1/P2.
3. Otimizar topologia e contagem de polígonos: linha H prioriza fidelidade e pode produzir malhas densas; linha P prioriza edição e quad/low-poly.
4. Gerar UV e textura, inclusive materiais PBR (cor, rugosidade, metálico, normal). Textura bonita não é garantia de geometria imprimível.
5. Pós-processar com segmentação, retopologia, texturas, rigging e exportação. Cada operação deve ter opção, custo e status independente.
6. Para impressão 3D: aplicar unidades em mm, medir caixas delimitadoras, verificar watertight/non-manifold e exportar STL/3MF; fatiar no Bambu Studio antes de declarar pronto.

**Limite de engenharia reversa:** estudar interface, artigos, documentação, APIs, comportamento e projetos abertos. Não copiar código proprietário, burlar autenticação, créditos, licenças ou extrair modelos privados. REA/Replica Skill não foram executados nesta análise (não identificados entre as ferramentas conectadas disponíveis).

## Comparação com o repositório atual
Repositório: RELRYS03/expressarte-studio-v75, branch principal `main` consultada em 2026-11-03.
- `src/lib/studio/image3d.ts`: gerador 2,5D com relevo, silhueta e litofania, não reconstrução volumétrica 360° por IA.
- `src/components/studio/ImageTo3DApp.tsx`: upload, prévia, 2,5D, serviço Tripo e resultado GLB para baixar.
- `src/lib/studio/tripo-api.ts`: server functions usam `TRIPO_API_KEY`, upload `/files`, `/generation/image-to-model`, polling `/tasks/{id}`; `quality=balanced` usa `v3.1-20260211`; `clean` usa `P1-20260311`. A requisição envia `texture: true, pbr: true` para ambos — compatibilidade, qualidade e custos devem ser testados com documentação atual e resposta real da API. Nenhuma chamada paga foi realizada.
- `src/components/studio/MeshyImageTo3D.tsx`: interface alternativa da Meshy com links de saída STL, 3MF, GLB e outros formatos; requer validar autenticação, créditos e capacidades atuais separadamente.
- `src/lib/studio/print-exports.ts`: STL binário e 3MF de geometria interna; validação no Bambu Studio pendente.
- `src/components/studio/StudioApp.tsx`: ferramentas de edição e importação STL existentes; suporte completo a GLB e a texturas de materiais PBR no editor não foi confirmado.
- PRs 24–27 separados e ainda não liberados para merge. QA Studio no PR 29 é registro manual de evidências.

## Achados que mudam a estratégia
- A aparência do Tripo depende de dois sistemas distintos: **geometria** e **materiais/texturas**. Copiar a interface ou usar Three.js sozinho não gera modelos de personagem detalhados.
- Podemos evoluir o **fluxo de pós-processamento para impressão** agora, sem taxa de IA: importação de GLB/OBJ/3MF com textura (quando implementada), reconhecimento de partes, medidas, orientação, simplificação e exportação.
- Para modelos orgânicos automáticos sem serviço pago, há projetos abertos como TripoSR, Hunyuan3D e TRELLIS para avaliação independente, mas **não equivalem automaticamente ao Tripo H3.1 atual**, e exigem GPU/servidor/licenças e testes reais. Hunyuan3D-2.1 declara ~10 GB VRAM para geometria, ~21 GB para textura, ~29 GB combinados.
- Melhorias para o gerador sem IA: imagem recortada > limpeza de máscara > extrusão 2,5D > malha fechada; adicionar argola/furo sólido ao chaveiro em vez de somente desenhar.
- Não confundir modelos GLB texturizados com STL monocromático. Preservar materiais, UV, orientação e escalas antes de exportar.

## Backlog recomendado (não implementado nesta pesquisa)
1. **P0: testes de integração**, sem gastar créditos: mocks de endpoints Tripo/Meshy, validação de status e erros, proteção da chave em servidor; comparar formatos e validar status da API.
2. **P1: importação e visualização reais** de GLB/OBJ/3MF com materiais, escala/centímetros/metros para mm; exibir número de componentes/partes.
3. **P2: preparação para impressão**: detectar non-manifold, superfícies abertas, partes flutuantes, paredes finas, reparar em cópia, testes STL/3MF e Bambu Studio.
4. **P3: gerador de chaveiro de imagem com furo verdadeiro e dimensões paramétricas** (Ø50 x 3 mm, furo Ø5 mm); teste de malha e exportação.
5. **P4: teste comparativo aberto** com TripoSR vs Hunyuan3D-2.1 vs TRELLIS (qualidade, tempo, memória, licença e custos) usando a mesma imagem, sem prometer paridade com modelos proprietários.

## Critérios de aceitação antes de merge
- Unitários, TypeScript e build efetivamente executados no commit sob teste.
- Windows/Android e interface efetivamente validados.
- Importar arquivos reais, preservar escalas e materiais quando aplicável; reabrir STL/3MF; comparar malha e medidas.
- Bambu Studio confirma slice; impressão física e encaixe ficam pendentes enquanto a impressora estiver ocupada.
- Registrar evidência, data, ambiente, versão/commit, resultado; **nenhum teste novo pode ser pré-marcado como aprovado**.
