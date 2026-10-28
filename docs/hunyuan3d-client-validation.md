# Validação do cliente Hunyuan3D

O adaptador permanece preparatório. Não há evidência de inferência real, aprovação
de licença, segurança do serviço ou teste no Bambu Studio.

## Uso no servidor

A URL deve vir de configuração confiável do operador, nunca do usuário. O cliente
bloqueia URLs com credenciais, query ou fragmento e não segue redirecionamentos.
Isso não substitui allowlist de rede, autenticação, autorização por job ou uma
fronteira de servidor: não importar este módulo em componentes do navegador.

O terceiro argumento do construtor aceita `timeoutMs` (padrão: 30 segundos),
`generationTimeoutMs` (5 minutos) e `maxModelBytes` (64 MiB). Ajustar os prazos
com medições do serviço e limites do proxy/runtime. Todos os métodos aceitam um
argumento de opções com `signal: AbortSignal`; em `health`, esse é o primeiro
argumento, e nos demais é o segundo.

O prazo cobre cabeçalhos e leitura do corpo. Cancelamento explícito rejeita com
`AbortError`; timeout rejeita com `TimeoutError`, exceto `health`, que retorna
`false` para timeout/falha. A resposta de health exige `status: healthy` e um
`worker_id` não vazio, mas não comprova GPU pronta.

Cancelar HTTP não cancela inferência no servidor. Não há retry automático de POST.
O consumidor deverá limitar o tempo total de polling, pois o upstream pode manter
UID inexistente em `processing` e falha de textura em `texturing` indefinidamente.

## Contratos e limites

- UID: 1–128 caracteres alfanuméricos, `_` ou `-`, na submissão e na consulta.
- Estados aceitos: `processing`, `texturing`, `completed`, `error`.
- `completed` exige base64 e container GLB 2 válido. `error` exige `message`,
  retornada como mensagem genérica para não expor detalhes do serviço.
- GLB: assinatura, versão, comprimento, alinhamento/limites dos chunks e JSON
  inicial com `asset.version: 2.0`. Não é um validador completo de glTF, referências,
  geometria, texturas ou imprimibilidade. Um parser/validador e teste da malha real
  continuam necessários.
- Respostas binárias e JSON têm limite de leitura, inclusive sem Content-Length.

## Verificação reproduzível

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run lint
```

A suíte inclui rede indisponível, timeout antes/depois dos cabeçalhos,
cancelamento, HTTP de erro, JSON/UID/estados inválidos, base64/GLB corrompido e
limites de resposta. Todos usam respostas simuladas; o GLB de teste contém um
triângulo sintético. O workflow executa testes completos, TypeScript e build.

Na revisão local, `npm run lint` está bloqueado por ausência de
`eslint.config.js/mjs/cjs` no repositório. Corrigir essa configuração em trabalho
específico; não interpretar o CI verde como lint aprovado.

## Próxima etapa em ambiente privado

Fixar commit do servidor e revisão dos pesos; conferir licença e GPU. Testar
PNG/JPEG, base64/data URL, textura/fundo/seed, jobs inválidos, falha de GPU,
concorrência e recuperação. Guardar logs sem imagens/segredos e GLBs reais.
Depois validar a malha, dimensões, STL/3MF e fatiamento no Bambu Studio.
