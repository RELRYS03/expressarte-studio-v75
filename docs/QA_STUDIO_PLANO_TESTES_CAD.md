# Plano de ensaio CAD — Express’Arte Studio

Status geral: **PENDENTE de execução real**. Este roteiro especifica testes; não certifica qualquer capacidade já implementada.

## Princípio
Separar quatro níveis: (1) interface/geração; (2) geometria e medidas no STL/3MF reimportados; (3) fatiamento no Bambu Studio com perfil A1 e material real; (4) impressão física e paquímetro. Aprovação de um nível não aprova os seguintes.

## Ensaios
| ID | Peça | Medidas nominais | Critério |
|---|---|---|---|
| CAD-01 | Cubo | 20 × 20 × 20 mm | Desvio digital <= 0,05 mm por eixo; medida física registrada |
| CAD-02 | Placa com furos | 60 × 30 × 4 mm; Ø3/Ø5/Ø8 mm | Diâmetros, centros, espessura e malha |
| CAD-03 | Encaixes | Pino Ø10; furos Ø10,2/10,4/10,6 mm | Registrar folga que encaixa sem forçar |
| CAD-04 | Paredes | 1,2/2/3 mm; fundo 2,4 mm | Verificar perímetros e paredes no slice |
| CAD-05 | Organizador | 220 × 140 × 40 mm; parede 2; fundo 2,4 mm | Medir externo/interno, divisórias e folga |
| CAD-06 | Chaveiros/placa | Circular Ø50×3, furo Ø5; retangular 60×32×3; placa 80×30×2,5 mm | STL reimportado e fatiado |
| CAD-07 | Edit Mode | Cubo 20 mm, face extrudada 5 mm | Seleção, gizmo, topologia, Undo/Redo e slice |
| CAD-08 | Mesh Workbench | 2 STLs reais | V/E/F, bordas, non-manifold, validade, tempo e comparação com slicer |

## Registro obrigatório
- Commit/PR, ambiente, Windows ou Android, formato, versão Bambu Studio, impressora, bico e material.
- Medidas nominais, digitais e físicas; desvios; folgas; arquivo de evidência.
- Topologia, bordas abertas, não-manifold, NaN/infinito, tamanho, timeout e relatório do slicer.
- Status inicial **pendente**. Ausência de evidência não é aprovação.
- O corte plano pode deixar borda aberta; não presumir imprimibilidade.
- Modelos orgânicos complexos ainda não foram comprovados.

## Sequência
1. Rodar testes, TypeScript e build no commit sob teste.
2. Gerar peças no Windows e reimportar STL/3MF.
3. Testar controles e navegação no Android.
4. Fatiar no Bambu Studio e arquivar alertas.
5. Imprimir cupom de encaixe e cubo quando a impressora estiver disponível.
6. Preencher QA Studio e emitir decisão com evidências.

As tolerâncias digitais são metas de teste, não precisão garantida. Encaixes variam com PLA/PETG, orientação, expansão, retração e perfil.
