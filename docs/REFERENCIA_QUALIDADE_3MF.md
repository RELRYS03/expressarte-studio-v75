# Referência de qualidade: colecionável de terno e xícara

Data: 05/11/2026. O usuário forneceu `funko pop figure 3d model.3mf` como exemplo do resultado que o Express’Arte deve alcançar, comparado com o teste procedural anterior.

## Arquivo inspecionado

- 3MF em milímetros, com um objeto e um item no build.
- 984.050 vértices e 1.968.096 triângulos.
- Caixa geométrica: 58,435 × 56,509 × 97,928 mm.
- Geometria visualizada em quatro direções. O nome interno começa por `tripo_node_`; isso sugere proveniência Tripo, sem comprovar como foi gerado, conta, plano ou disponibilidade de API.
- O objeto único no arquivo não comprova corpo conectado, malha fechada ou imprimibilidade. Esses itens não foram verificados nesta inspeção.

## Diferenças observadas

| Aspecto | Teste procedural anterior | Meta demonstrada pelo 3MF |
| --- | --- | --- |
| Cabeça e rosto | Base muito quadrada, volumes simplificados | Transições arredondadas e proporções mais próximas da imagem |
| Cabelo | Tubos e volumes repetidos | Mechas esculpidas, com direção, sobreposição e variação de volume |
| Terno e colete | Primitivas e lapelas simplificadas | Recortes, dobras e transições de tecido |
| Pose, mãos, xícara e sapatos | Aproximação funcional | Detalhamento integrado à silhueta e à pose |
| Densidade | 19.482 triângulos | 1.968.096 triângulos; a quantidade sozinha não define qualidade |

## Critério para os próximos testes

Este 3MF passa a ser o padrão visual de comparação. Avaliar frente, perfil e traseira; preservar proporções, silhueta, cabelo, roupa, pose e acessórios antes de otimizar a malha.

O avanço anterior foi no fluxo de criação, visualização, união de sólidos e exportação. O modelo procedural ainda não atingiu a qualidade de escultura demonstrada aqui. Aumentar subdivisões das mesmas primitivas não resolverá essa diferença.

Fluxo necessário: geração/escultura orgânica de alta qualidade → revisão no Model Workbench → escala e análise da malha → simplificação controlada, se necessária → fatiador. Não anunciar geração automática de personagens livres enquanto não houver motor operacional e resultado visual validado.

Não alterar, simplificar ou sobrescrever o 3MF de referência sem pedido. Não publicar seu arquivo binário no GitHub. A inspeção local usou projeções dos vértices para conferir a forma; pontilhamento dessas projeções não representa defeito comprovado no arquivo.
