# Plano de ensaio CAD — Express’Arte Studio

Status geral: **PENDENTE de execução real**. Este roteiro especifica testes; não certifica qualquer capacidade já implementada.

## Princípio de validação
Separar quatro níveis: (1) interface/geração de modelo; (2) geometria e medidas no STL/3MF reimportado; (3) fatiamento no Bambu Studio, com perfil Bambu Lab A1 e filamento efetivamente usado; (4) impressão física e paquímetro. Aprovação de um nível não aprova os seguintes. Registrar versão, commit/PR, sistema operacional, nome do arquivo, screenshots e resultados.

## Ensaios propostos

| ID | Peça | Medidas nominais | O que medir | Critério prévio de aceitação |
|---|---|---|---|---|
| CAD-01 | Cubo maciço | 20 × 20 × 20 mm | X/Y/Z no modelo e STL/3MF reimportados | Dimensão digital com desvio <= 0,05 mm por eixo; medida física registrada, tolerância física definida após calibração |
| CAD-02 | Placa com três furos | 60 × 30 × 4 mm; furos Ø3, Ø5, Ø8 mm | Diâmetro e centros, espessura, malha | Nominais digitais dentro de 0,05 mm; verificar se fatiador mantém furos; paquímetro após imprimir |
| CAD-03 | Cupom de encaixes | pino macho Ø10,0 mm; furos fêmea Ø10,2 / Ø10,4 / Ø10,6 mm | Folga diametral 0,2 / 0,4 / 0,6 mm, encaixe real | Registrar o menor furo que encaixa sem forçar, sem presumir resultado; o pino e os furos devem ter altura suficiente para teste |
| CAD-04 | Cupom de paredes | 1,2 / 2,0 / 3,0 mm; fundo 2,4 mm | Paredes, fundo, perímetros no slice | Registrar contagem de perímetros e eventuais desaparecimentos; sem marcar aprovado antes do slicer |
| CAD-05 | Organizador | externo 220 × 140 × 40 mm; parede 2 mm e fundo 2,4 mm (PR 26) | X/Y/Z externos e internos úteis, espessura da base, divisórias, folga com caixa | Comparar desenho e medição real; verificar se 40 mm é altura externa ou limite interno da caixa e a altura útil disponível |
| CAD-06 | Chaveiros e placa | circular Ø50×3 com furo Ø5; retangular 60×32×3 com furo Ø5; placa 80×30×2,5 mm (PR 24) | Dimensões, posição e diâmetro de furos, espessura | Verificar cada STL e reimportação, depois fatiar |
| CAD-07 | Geometria editada | cubo 20 mm com face extrudada 5 mm | Se a seleção/gizmo/extrusão modificaram somente a região esperada; Undo/Redo | Comparar medidas antes/depois e checar topologia, exportação e slice (PR 27) |
| CAD-08 | Diagnóstico duplo | 2 STLs reais diferentes (PR 25) | V/E/F, bordas abertas, não-manifold, validade numérica, tamanho e tempo | Guardar saída da ponte e comparação com fatiador; falha/timeout não equivalem a malha válida |

## Requisitos de registro
- Evidência do recurso e PR/commit, ambiente Windows ou Android, formato STL/3MF, versão do Bambu Studio, perfil da impressora, material e bico.
- Medidas externas e internas previstas vs. medidas digitais e físicas; desvio absoluto e percentual; folga nominal vs. efetiva; arquivo de evidência.
- Topologia: número de vértices/arestas/faces, bordas abertas, arestas não-manifold, coordenadas NaN/infinito, tamanho em bytes, timeout e relatório do slicer.
- Status inicial **pendente**. Falhas documentadas ficam como **falhou**; ausência de evidência não é **aprovado**.
- O corte plano do editor web pode deixar borda aberta: não presumir imprimibilidade.
- Geração nativa de bonecos orgânicos complexos **não foi comprovada**; proposta experimental: busto simples por primitivas e união, avaliando se essa operação já existe na branch testada.
- PR 24 depende do PR 22; os PRs 25–27 têm branches e bases próprias; não tentar testar recursos só presentes em PRs na main e não efetuar merge para facilitar o teste.

## Sequência de execução
1. Rodar `npm test`, `npx tsc --noEmit` e `npm run build` no commit sob teste.
2. Windows: abrir viewport, gerar peças disponíveis, medir e reimportar STL/3MF.
3. Android: confirmar controles e navegação; capacidades desktop-only devem ser explicitadas.
4. Bambu Studio: abrir e fatiar cada exportação real, arquivar screenshot e logs de alertas.
5. Imprimir cupom CAD-03 e cubo CAD-01; medir com paquímetro, documentar material e perfil.
6. Preencher os checklists no QA Studio, exportar backup JSON e emitir decisão de bloqueio/liberação com evidências.

**Limitação:** as tolerâncias digitais são alvos de teste propostos, não precisão comprovada do software ou da impressora. Encaixes variam com PLA/PETG, orientação, expansão, retração, calibração e perfil de fatiamento.
