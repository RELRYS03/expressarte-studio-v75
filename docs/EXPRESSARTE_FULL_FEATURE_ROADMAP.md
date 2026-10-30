# Express'Arte 3D — catálogo de recursos e integração incremental

Pesquisa de referência (30/10/2026): https://club.zapach.com.br/

Este documento descreve capacidades **equivalentes e originais**, não cópia de código, interface, acervo, aulas ou benefícios restritos a assinantes. Não é uma lista de recursos já concluídos. As entregas devem manter PRs independentes, testes de STL e conferência no Bambu Studio antes de merge.

## Recursos anunciados publicamente pelo site de referência

| Módulo original Express'Arte | Escopo funcional | Estado no repositório |
| --- | --- | --- |
| Criar chaveiro personalizado | base circular/retangular, argola e furo, nome, espessura | protótipo inicial PR 24 (bases fixas); texto pendente |
| Aplicar logo | importação SVG, escala, posicionamento e relevo | pendente |
| Peça no formato do logo | vetorização de silhueta, offset, extrusão, furo opcional | pendente |
| Personalizar nome/texto | fontes licenciadas, kerning, alinhamento, altura e relevo | pendente |
| Letras-caixa LED | extrusão oca, parede, fundo removível, folga e passagem de fiação | pendente |
| Letreiros | texto unido, base e suportes, dimensionamento | pendente |
| Prévia em tempo real | visualização integrada, atualização de parâmetros, controles de câmera | Studio existente; novos geradores pendentes |
| Gerenciador de arquivos | pastas, pesquisa, tags, favoritos, miniaturas, duplicação e backup | projetos locais existentes; expansão pendente |
| STL / 3MF | STL com malha verificável; 3MF com unidades, objetos e cor conforme suporte | exportação existente; validação de 3MF pendente |
| Calculadora de precificação | material, energia, tempo, perdas, mão de obra, margem | calculadora existente; revisão da integração pendente |
| Academia Express'Arte | material autoral sobre Bambu Studio, modelagem, manutenção, preço e vendas | pendente; não copiar aulas de terceiros |
| Vitrine de filamentos | comparação de preços públicos, cores, estoque e custo/kg | pendente; descontos exclusivos alheios não são reutilizáveis |
| Benefícios comerciais | catálogos, modelos próprios com licenças claras, orçamento e pedidos | catálogo existente; direitos e fluxo pendentes |

## Ideias complementares para o nosso público
- Foto para litofania/relevo, luminária e porta-retratos.
- Criador de molduras, caixas, tampas, encaixes e tolerâncias.
- Edição de STL: escala, rotação, divisão, corte, união, subtração, desfazer e detecção de malha aberta.
- Preparação multicolorida 3MF para Bambu Lab A1 Combo / AMS Lite.
- Biblioteca de peças e modelos de produção reutilizáveis.
- Orçamento por WhatsApp; cálculo de custo por peça e margem.

## Ordem de engenharia

1. **Fundação geométrica:** validar PR 22 com dois STLs reais, Windows, Android, desfazer, timeout e fatiamento. Não confundir manifold com reparo automático.
2. **Geradores básicos:** PR 24; validar chaveiros e placa, exportação STL e fechamento dos furos.
3. **SVG / texto / silhueta:** sanitização SVG, curvas e furos internos, extrusão, posicionamento e booleanas no Worker. Preservar arquivo original.
4. **Letras e produtos:** letras-caixa, letreiros, molduras, litofania, caixas e suportes, com parâmetros editáveis.
5. **Produção:** saída 3MF especificada e testada; componentes por cor, conferência Bambu Studio e custos reais.
6. **Gestão e aprendizagem:** arquivos, tags, fornecedores públicos e conteúdos originais.

## Critérios obrigatórios por recurso
- UI navegável em Windows/Chrome e Android; sem congelar durante operações pesadas.
- Valores em mm, tolerância configurável e malhas com arestas fechadas quando necessário.
- Cancelar, timeout, erro legível, sem perda da peça original, desfazer.
- Exportar STL (e 3MF quando anunciado) e importar no Bambu Studio; confirmar escala, orientação e fatiamento.
- Testes automatizados, build, TypeScript; corrigir configuração ESLint separadamente.
- Não marcar concluído antes de teste real e CI.

**Importante:** página pública não prova ferramentas privadas, código-fonte, API nem acesso ao conteúdo pago. Não há integração com contas Zapach, promoções exclusivas ou licença comercial transferível.
