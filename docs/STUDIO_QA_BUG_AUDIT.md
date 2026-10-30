## Auditoria de bugs e cobertura — 30/10/2026

**Branch:** `feature/guided-creation-zapach-inspired`, baseada no PR #22. **Não fazer merge/deploy antes de validação de STL no Bambu Studio.**

### Corrigido nesta branch
- Exportação STL no Studio usava o nome fixo `ExpressArte-medalha.stl` mesmo para chaveiros/placas. Corrigido para usar um nome derivado do STL aberto ou gerado, sanitizado.

### Bloqueios / problemas conhecidos, ainda não corrigidos
- Projetos STL importados ou gerados por `createStarter` não são persistidos pelo fluxo **Salvar projeto**. A UI informa que é necessário exportar a malha; persistência de projeto editável ainda falta.
- O PR 24 só entrega bases geométricas com dimensões fixas. Não há editor paramétrico completo, SVG, texto em relevo, letras-caixa LED, litofania ou 3MF; a lista integral está em `docs/EXPRESSARTE_FULL_FEATURE_ROADMAP.md`.
- Testes unitários atuais dos geradores comprovam dimensões e coordenadas finitas, mas **não comprovam furos de chaveiro fechados, superfície manifold nem impressão**.
- UI no Windows/Android, operações repetidas, desfazer, exportação real e fatiamento Bambu Studio requerem execução com navegador e fatiador; ainda não foram executados nesta auditoria.
- Lint com ESLint 9 está bloqueado no baseline sem `eslint.config.*`; deve ser uma correção própria, não chamada de regressão nos geradores.

### Matriz mínima para liberação
| Cenário | Critério de aprovação | Estado |
|---|---|---|
| Gerador circular e retangular | dimensões, furos Ø5 mm, malha fechada, sem degeneração | parcial: dimensões automatizadas |
| Placa | 80×30×2,5 mm, faces normais válidas | parcial: dimensões automatizadas |
| Corte Manifold X/Y/Z | volume positivo, faces fechadas, desfazer, timeout | motor PR #22; UI pendente |
| União Manifold | sobreposta funde volume; separada preserva corpos | motor PR #22; UI pendente |
| Entrada inválida | erro visível, malha anterior preservada | motor PR #22; UI pendente |
| Export STL | nomes corretos, mm interpretados no Bambu, fatiamento sem reparos | nome corrigido; Bambu pendente |
| Projetos | salvar/reabrir sem perda de geometria | não implementado para STL |
| SVG / texto / letras-caixa | gerar malha sem auto-interseção, furos válidos e parâmetros persistentes | não implementado |
| 3MF multicolor AMS Lite | unidades, objetos separados, cores e abertura no Bambu | não implementado |
| Móvel | controles, memória, Worker, upload e download | não testado |

### Limitações de entrada x defeitos de código
- STL aberto/invertido/degenerado não equivale a regressão no boolean; rejeição clara é esperada.
- Falha em cancelar/desfazer, travamento, escala errada, perda de malha ou export corrompido são defeitos de aplicação, quando reproduzidos com sólidos válidos.
- Falta do ESLint config é bloqueio de infraestrutura de desenvolvimento separado de ambas as classes.

### Recursos sem esquecer
Gerador de chaveiros, logos SVG, contorno automático, texto 3D, letras-caixa LED, letreiros, prévia ao vivo, gerenciador com backup, STL/3MF, orçamento/custos, academia de cursos próprios, comparação de filamentos, litofania/luminária, molduras, caixas/encaixes, suportes, edição STL avançada, multifilamento Bambu A1 Combo/AMS Lite, catálogo e pedidos.
