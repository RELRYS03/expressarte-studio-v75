# Validação da candidata unificada

Data: 05/11/2026. Referência: [Central do Projeto](../README.md) e [PR #34](https://github.com/RELRYS03/expressarte-studio-v75/pull/34).

## Código reunido

| Origem | Incluído |
| --- | --- |
| Candidata `2b8be360b9a6a4e070c64bfb2693ae42a8f60038` | Editor, oficina GLB, ferramentas de malha, projetos, catálogo, calculadora e demais módulos existentes |
| PR #39 | Verificação da exportação STL de chaveiros e testes de ida e volta |
| PR #40, `0fc099a5949722695ca60be24433c978b8feb0eb` | Correção do contexto Cloudflare/Nitro e testes de autenticação |
| PR #41, `cf27120f20d390873b5b17c6f9f31760af25737e` | TripoSR local, origem Cloudflare na ponte e transferência para oficina GLB |
| Consolidação | Central no README, mapa do trabalho, instruções de continuidade e smoke ampliado para 13 páginas |

## Resultado desta execução

| Verificação | Resultado |
| --- | --- |
| Ambiente | Node.js 24.22.1; dependências da candidata instaladas com `npm ci` |
| `npm test` | **111 testes passaram**, 22 arquivos |
| `npx tsc --noEmit` | **Passou**, sem erros de TypeScript |
| `npm run build` | **Passou**, cliente e Worker gerados |
| `node scripts/smoke-production.mjs` | **Passou**: falta de segredos bloqueia; login privado funciona; 14 páginas renderizam; modo público explícito responde |
| `python -m unittest discover -s tests` | **16 testes passaram** |
| `git diff --check` | **Passou** |
| `npm run lint` | **Bloqueado**: `eslint.config.js` ausente na base; não tratar como aprovado |

O smoke cobre `/`, `/imagem-para-3d`, `/studio`, `/formas`, `/projetos`, `/catalogo`, `/comunidade`, `/calculadora`, `/mesh-doctor`, `/expressinho`, `/modelo-ia`, `/workbench`, `/qa-studio` e `/color-studio`. Ele chama o Worker compilado.

## Criador guiado e teste de navegador

- Nova página inicial com abas Por texto e Por imagem. O conversor anterior fica em `/imagem-para-3d`.
- Nome e formatos de chaveiro, organizador de quatro compartimentos e boneco colecionável base. União booleana real com Manifold, sem chamada paga.
- Testes com Manifold WASM confirmaram corpo único fechado, volume positivo e reabertura do STL para seis variações, incluindo nome em relevo e boneco com/sem boné.
- Navegador de teste gerou boneco com boné de 100 mm (3.558 triângulos), organizador 180 × 120 × 40 mm (774 triângulos) e chaveiro ANA 60 × 35 × 3,85 mm (656 triângulos).
- WebGL estava desativado no navegador remoto. Foi adicionada visualização SVG das mesmas malhas; o boneco e o chaveiro foram vistos nessa prévia. A renderização WebGL segue sem homologação neste navegador.
- Seleção e conversão de imagem foram testadas com PNG sintético: relevo 80 × 80 × 3,8 mm com 37.632 triângulos, exibido na prévia compatível. A reconstrução completa permanece desabilitada quando a ponte TripoSR não está disponível.
- O evento de download STL não foi confirmado pelo navegador remoto (timeout). Arquivos STL foram exportados/reabertos nos testes automatizados; download no dispositivo do usuário ainda precisa de validação.
- Acesso ao painel Cloudflare chegou à tela de login. Não houve autenticação nem nova publicação.

O build apresenta avisos de tamanho de chunks e externalização de `node:module` em Manifold. Compilar não confirma que operações Manifold/WASM funcionem em todos os navegadores.

## Pendências reais

- Instalação, dependências, GPU e pesos TripoSR no computador do usuário; geração de um modelo real.
- Teste visual do GLB recebido, transferência no IndexedDB, medidas e exportação na oficina.
- Blender no Windows, permissões do navegador para ponte local, Android e inspeção no Bambu Studio.
- Motor gratuito operacional para objetos/personagens livres por texto e imagem + texto.
- Corrigir a configuração de lint e revisar os resultados.
- Homologação, promoção para main e publicação, que não foram realizadas nesta etapa.

Nenhum consumo de créditos, instalação de pesos, alteração de segredos ou publicação foi executado. Não há prova nova de qualidade/imprimibilidade de objetos gerados por IA.
