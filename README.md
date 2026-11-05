# Express’Arte — Central do Projeto

**Comece sempre por esta página.** Aqui estão os endereços, o código em integração, as verificações e as próximas etapas. Atualizada em **05/11/2026**.

**Objetivo:** criar objetos e personagens 3D a partir de imagem, texto ou ambos, visualizar, ajustar medidas e preparar arquivos para impressão. Sem contratar serviços ou consumir créditos sem autorização.

## Onde encontrar

| O que você procura | Lugar oficial |
| --- | --- |
| Abrir o Studio publicado | [Express’Arte Studio](https://expressarte-studio-teste.relrys17.workers.dev/) |
| Acompanhar todo o desenvolvimento | [PR central #34](https://github.com/RELRYS03/expressarte-studio-v75/pull/34) |
| Código consolidado em validação | [integration/studio-v7.5-candidate](https://github.com/RELRYS03/expressarte-studio-v75/tree/integration/studio-v7.5-candidate) |
| Catálogo publicado, preservado separadamente | [Catálogo Express’Arte](https://relrys03.github.io/catalogoExpressarte/) |
| Configurar geração local por imagem | [Guia TripoSR](docs/EXPRESSINHO_TRIPOSR_LOCAL.md) |
| Executar, autenticar e publicar o Studio | [Guia de execução e publicação](README_IMAGEM_PARA_3D.md) |
| Localizar trabalho anterior | [Mapa de branches e PRs](docs/MAPA_DO_TRABALHO.md) |
| Editor escuro da referência do usuário | [Model Workbench: versão e commits](docs/EDITOR_ATUAL.md), rota `/workbench` |
| Teste com a imagem do colecionável de terno e café | [Arquivos, método e validação](docs/TESTE_COLECIONAVEL_TERNO_CAFE.md) |
| Qualidade que o gerador precisa alcançar | [Comparação com o 3MF de referência do usuário](docs/REFERENCIA_QUALIDADE_3MF.md) |

**Publicado e em validação são estados diferentes.** O código consolidado nesta branch ainda não foi publicado. `main`, o site atual, o catálogo e o Netlify antigo permanecem preservados.

## O que está pronto e o que falta

| Recurso | Estado da candidata | Onde fica no aplicativo |
| --- | --- | --- |
| Criador guiado por texto | Chaveiros com nome/formato, organizador com quatro compartimentos e boneco colecionável base com boné opcional; sólidos reais, sem API | `/` |
| Imagem → relevo | Geração local na tela de criação | `/`, aba Por imagem |
| Imagem → relevo, silhueta ou litofania avançados | Conversor anterior preservado; não é reconstrução de personagem completo | `/imagem-para-3d` |
| Imagem → modelo completo com TripoSR local | Integração reunida; geração real depende do motor instalado no computador e ainda precisa de validação | `/expressinho` |
| Modelo GLB → visualizar, medir e exportar STL/GLB | Oficina existente conectada ao TripoSR; falta teste visual e de impressão | `/modelo-ia` |
| Texto → chaveiro simples no Blender | Fluxo anterior preservado para círculo/coração; o novo criador na página inicial gera nome e três formatos sem Blender | `/expressinho` |
| Texto → personagem ou objeto livre; imagem + texto juntos | **Ainda não operacional.** Trabalho experimental preservado no mapa; falta motor gratuito confirmado e integração validada | Próxima etapa |
| Editor avançado Model Workbench | Interface escura da referência, transformações e edição de malha; editor principal preservado | `/workbench` |
| Editor legado, projetos, calculadora, catálogo e ferramentas de malha | Reunidos na candidata; projetos e catálogo do Studio continuam locais ao navegador | `/studio`, `/projetos`, `/calculadora`, `/catalogo` |
| Correção do erro 503 no Cloudflare | Reunida e verificada no Worker compilado | Servidor |
| Validação de STL de chaveiros | Reunida com testes de exportação; Bambu Studio pendente | Editor |

Uma resposta da FreeLLMAPI, um plano JSON ou um adaptador de API não prova que uma malha 3D foi gerada. TripoSR usa imagem; ele não usa texto para condicionar a geração.

O criador guiado interpreta um vocabulário restrito. Não reproduz rostos, roupas, personagens arbitrários ou todos os detalhes escritos. Exemplos: `Boneco colecionável com boné, altura de 100 mm`; `Chaveiro retangular, 60 x 35 x 3 mm, nome "ANA"`; `Organizador 180 x 120 x 40 mm`. A prévia inclui renderização SVG das mesmas malhas quando WebGL não está disponível.

## Próxima execução

1. Confirmar o TripoSR e a ponte no computador do usuário e gerar um objeto real a partir de imagem.
2. Abrir o resultado na oficina, conferir medidas e exportar STL; validar no Bambu Studio.
3. Definir e validar um motor para personagens por texto e, depois, imagem + texto. FreeLLMAPI/Ollama/REA continuam no trabalho de integração, sem presumir que estejam conectados.
4. Homologar a candidata e só então promover para `main` e publicar com autorização.

## Verificações reproduzíveis

Requer Node.js 22.12+ e Python 3. Rode na raiz:

```bash
npm ci
npm test
npm run build
node scripts/smoke-production.mjs
python -m unittest discover -s tests
```

No Windows, `py -3` pode substituir `python`. Para abrir localmente: `npm run dev`. Para a ponte Blender: `py -3 scripts/blender_bridge.py`, com os caminhos configurados conforme o guia TripoSR.

Os resultados desta consolidação estão em [VALIDACAO_ATUAL.md](docs/VALIDACAO_ATUAL.md). Testes automatizados não substituem geração com GPU, inspeção visual ou validação de impressão. O lint está bloqueado pela ausência preexistente de `eslint.config.js`.

## Regra de continuidade

Esta página e o PR #34 são a referência para continuar o projeto em qualquer conversa ou ferramenta. Atualizar aqui as decisões, os bloqueios, os resultados e os links ao concluir cada etapa. Procurar primeiro o código existente; não abrir uma nova candidata para o mesmo objetivo. Segredos nunca entram neste documento ou no GitHub.

[Instruções técnicas para agentes](AGENTS.md) · [README anterior, somente histórico](docs/README_LEGADO.md)
