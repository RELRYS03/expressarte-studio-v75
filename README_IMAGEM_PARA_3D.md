# Executar e publicar o Express’Arte Studio

## Validar antes de publicar

Use Node.js 22.12 ou superior (Node 24 também foi validado).

```bash
npm ci
npm test
npm run build
node scripts/smoke-production.mjs
```

O teste de produção importa o Worker compilado e verifica autenticação e renderização das oito páginas. Não testa WebGL, serviços de IA externos ou Blender instalado no Windows.

## Cloudflare Workers

Este aplicativo tem servidor e não deve ser publicado apenas como arquivos estáticos. O build gera `.output/server/wrangler.json`, o Worker e os arquivos públicos. No projeto Workers conectado ao GitHub, selecione a branch que será publicada e configure:

- Comando de build: `npm ci && npm run build`.
- Comando de deploy: `npx nitro deploy --prebuilt`.
- Diretório raiz: raiz do repositório.

Mantenha o nome/identidade do Worker existente ao configurar a publicação. Não crie outra aplicação para corrigir uma implantação existente.

### Acesso privado da equipe

Configure no ambiente de execução do Worker os segredos `TEAM_PASSWORD` (24 a 256 bytes UTF-8) e `SESSION_SECRET` (pelo menos 32 bytes UTF-8), com valores diferentes, fortes e aleatórios. Não coloque segredos no GitHub, no código ou em variáveis `VITE_*`.

Sem esses segredos, a resposta 503 é intencional. Com os segredos configurados, a página inicial redireciona para `/__auth/login`. A sessão dura oito horas.

`PUBLIC_ACCESS=true` desativa a senha compartilhada para todo o aplicativo. Use somente se a decisão for disponibilizar acesso público; não é necessário para corrigir a autenticação.

Após publicar, verifique login, `/studio`, catálogo e calculadora no endereço real. Projetos e catálogo continuam locais ao navegador. O Blender requer a ponte executando no computador do usuário; publicar o site não instala Blender nem configura APIs de IA.

## Erro 503 com segredos já configurados

Nitro encaminha as variáveis Cloudflare em `request.runtime.cloudflare.env` para o renderizador SSR. `src/server.ts` precisa resolver esse contexto antes de chamar a autenticação. Os testes `runtime-context.test.ts` e `scripts/smoke-production.mjs` cobrem essa integração.
