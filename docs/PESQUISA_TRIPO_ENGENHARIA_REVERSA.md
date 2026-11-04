# Pesquisa técnica — Tripo Studio e evolução do Express'Arte Studio
Data: 2026-11-03. **Análise documental e revisão estática, não homologação funcional.**

## Fontes públicas
- Tripo Studio: https://studio.tripo3d.ai/pt
- Tripo, imagem para 3D (guia oficial): https://www.tripo3d.ai/product-doc/model-generation/image-to-3d
- Tripo H3.1: https://developers.tripo3d.ai/en/models/v3-1
- API Image-to-Model: https://developers.tripo3d.ai/en/docs/generation-image-to-model/standard
- Linha P / topologia limpa: https://developers.tripo3d.ai/en/docs/generation-image-to-model/p
- Pipeline completo: https://www.tripo3d.ai/help/getting-started/what-features-does-tripo-have
- TripoSR: https://stability.ai/news-updates/triposr-3d-generation
- Hunyuan3D-2.1: https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- TRELLIS: https://github.com/microsoft/TRELLIS

## Princípios
1. Separar geometria 3D de materiais/texturas PBR.
2. Textura bonita não garante malha imprimível.
3. Para impressão, aplicar unidades em mm, verificar watertight/non-manifold e fatiar no Bambu Studio.
4. Estudar interfaces, documentação e projetos abertos sem copiar código proprietário, burlar autenticação, créditos ou licenças.
5. TripoSR, Hunyuan3D e TRELLIS exigem avaliação de GPU, memória, licença e qualidade; não equivalem automaticamente a serviços proprietários atuais.

## Estado do Express'Arte
- Imagem para 3D oferece relevo, silhueta e litofania 2,5D; isso não é reconstrução volumétrica 360° por IA.
- O fluxo Tripo usa chave de API no servidor; nenhuma chamada paga foi realizada nesta auditoria.
- O GLB pode preservar materiais/UV; STL é essencialmente geometria sem cor.
- A oficina GLB permite inspeção e exportação, mas a compatibilidade de materiais e orientação deve ser validada com arquivos reais.

## Backlog
1. Testes de integração com mocks, sem consumir créditos.
2. Importação GLB/OBJ/3MF com materiais e unidades.
3. Preparação para impressão: partes flutuantes, paredes finas, non-manifold, reparo em cópia.
4. Chaveiro com furo geométrico real e dimensões paramétricas.
5. Comparativo de modelos abertos com mesma imagem, medindo qualidade, tempo, memória, licença e custo.

## Critérios antes de liberar
- Unitários, TypeScript e build no commit sob teste.
- Windows/Android efetivamente validados.
- Importar arquivos reais, preservar escalas/materiais e reabrir STL/3MF.
- Bambu Studio confirma fatiamento.
- Registrar commit, ambiente, data e evidências. Ausência de evidência não é aprovação.
