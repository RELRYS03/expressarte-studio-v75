# Ensaio 01 — Oficina de Modelos IA / Expressinho
Data: 2026-11-03
Status: **parcial; não homologado**.

## Evidência de referência
O protótipo rejeitado `Expressinho_3D_v2_rascunho.glb` foi lido com trimesh em ambiente de análise, sem impressão:
- Geometrias: 48
- Triângulos: 67.040
- Caixa delimitadora: X=60,8; Y=39,2; Z=104,3 (unidades sem dimensão física comprovada).
- O eixo de maior dimensão é Z, não Y; assumir Y como altura causaria escala incorreta.
- Para altura Z=100 mm, dimensões estimadas: X=58,29; Y=37,58; Z=100 mm, se o arquivo preservar essa orientação.
- Protótipo reprovado visualmente; serve apenas como massa de teste. A referência aprovada do Expressinho continua sendo a arte oficial.

## Alterações na oficina
- Rota `/modelo-ia`: importar GLB, contar malhas/triângulos, renderizar materiais, mostrar dimensões e exportar GLB/STL.
- Heurística identifica Y ou Z como eixo vertical estimado; não é garantia de orientação.
- Escala multiplicativa preserva a escala original do nó-raiz.
- Interface informa que STL não preserva cor e não certifica imprimibilidade.
- Não há chamada de IA nesta página.

## Roteiro pendente
1. Importar o GLB de teste e conferir 48 malhas e cerca de 67.040 triângulos.
2. Confirmar eixo Z e altura 100 mm; conferir dimensões estimadas.
3. Inspecionar materiais, exportar GLB e STL e reabrir os arquivos.
4. Abrir STL no Bambu Studio e verificar orientação, escala, partes e alertas.
5. Testar GLB real gerado pelo Tripo, incluindo UV/PBR.
6. Validar Chrome/Windows e Android.

## Não confirmado
Importação GLB real, testes visuais, reparo/união, fatiamento e impressão física permanecem pendentes. Nenhum crédito de IA foi consumido.
