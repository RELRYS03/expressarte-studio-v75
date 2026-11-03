# Ensaio 01 — Oficina de Modelos IA / Expressinho
Data: 2026-11-03
Status: **parcial; não homologado**.

## Evidência de referência (fora do navegador)
O protótipo rejeitado `Expressinho_3D_v2_rascunho.glb` foi lido com trimesh em ambiente de análise, sem impressão:
- Geometrias: 48
- Triângulos: 67.040
- Caixa delimitadora: X=60,8; Y=39,2; Z=104,3 (unidades geométricas sem dimensão física comprovada).
- O eixo de maior dimensão é **Z**, não Y. Portanto, um importador que assumir altura=Y aplicaria escala incorreta.
- Ao ajustar altura geométrica de Z=104,3 para 100 mm, as dimensões esperadas aproximadas são X=58,29 mm, Y=37,58 mm e Z=100 mm, **se** o arquivo carregado preservar essas orientações.
- O protótipo segue **reprovado visualmente**; aqui serve somente de massa de teste do importador. O Expressinho aprovado é a referência visual, não esse GLB.

## Alteração já aplicada
- Nova rota `/modelo-ia`: importar GLB, contar malhas/triângulos, renderizar materiais, mostrar dimensões e exportar GLB/STL.
- Ajuste da altura permite identificar automaticamente Y ou Z como eixo vertical estimado (maior entre ambos) e mostra o eixo na interface. Regra é heurística, não orientação garantida.
- A escala agora é multiplicativa em relação à configuração anterior, sem substituir a escala original do nó-raiz.
- A interface explicita que STL não contém cor e que não verifica automaticamente a imprimibilidade.
- Acesso vinculado em `Imagem para 3D`.

## Roteiro mínimo reproduzível (a executar)
1. Checkout `feature/qa-studio-integrado`; `npm ci`, `npx tsc --noEmit`, `npm test -- --run`, `npm run build`. Registrar saídas e commit.
2. Abrir `/modelo-ia` e importar o GLB de teste. Verificar 48 malhas e ~67.040 triângulos (pode haver diferenças pela forma de contar instâncias).
3. Confirmar eixo Z, selecionar altura=100 mm. Dimensões estimadas X=58,29 Y=37,58 Z=100 mm, se orientação preservada.
4. Rotacionar 360 graus e inspecionar materiais. Exportar GLB e STL. Reabrir cópias e medir; cores devem permanecer apenas no GLB.
5. Abrir STL no Bambu Studio, verificar a orientação, escala, partes desconectadas e alertas do fatiador. **Não imprimir** enquanto a impressora estiver ocupada.
6. Usar o GLB realmente gerado no Tripo para validar texturas PBR/UV e tamanho da malha. Modelos muito grandes podem exceder memória do navegador.
7. Testar Chrome Windows e Android e registrar evidências antes de qualquer merge.

## Não confirmado
- TypeScript/build/CI desta branch ainda não executados no ambiente do aplicativo.
- Página no navegador ainda não executada.
- Importação do GLB real produzido pelo Tripo não testada.
- Teste de reparo/união e impressão física não realizados.
- Não houve consumo de API/créditos, deploy ou merge.
