# Express'Arte Studio — instruções compartilhadas para agentes

## Objetivo
Entregar melhorias reais e verificáveis no Studio 3D Express'Arte, sem recriar módulos existentes. Este arquivo orienta Codex, OpenCode e outras ferramentas que reconheçam AGENTS.md; não instala modelos ou altera o ChatGPT.

## Arquitetura e trabalho existente
- Aplicação: React 19, TypeScript, Three.js, TanStack Start e Vite.
- Cena 3D: `src/components/studio/ModelScene.tsx`.
- Operações de malha: `src/lib/studio/mesh-editing.ts` e controles em `src/components/studio/StudioApp.tsx`.
- Preserve catálogo, calculadora, comunidade, projetos, Mesh Doctor e ponte local com Blender.
- Não afirme que RK10, conexão multiagente, comunidade pública ou reparação automática já funcionam: confirme no código e em testes.

## Prioridades
1. Corrigir profundidade da grade e posicionamento de objetos na mesa Bambu A1 (256 x 256 x 256 mm).
2. Seleção com o mouse, mover, girar, escalar, propriedades X/Y/Z em milímetros e desfazer/refazer.
3. Fluxos parametrizados de chaveiros, nomes em relevo, argolas, textos e exportação STL/3MF, avaliando licenças externas.
4. Integrações de IA só depois de haver tarefas específicas, autorização e testes reproduzíveis.

## Disciplina de execução
- Antes de editar, leia o código envolvido e procure funções existentes que possam ser reaproveitadas.
- Faça mudanças pequenas por branch/PR; não substitua a arquitetura ou a identidade visual sem pedido.
- Não sobrescreva dados do usuário em localStorage ou %LOCALAPPDATA% nem inclua credenciais no repositório.
- Nunca execute shell, acesse arquivos locais ou faça deploy a partir de comandos gerados por IA sem autorização explícita.
- Para cada alteração comportamental, acrescente ou ajuste testes; execute `npm run test`, `npm run build`, `npm run lint` quando o ambiente permitir.
- Relate claramente o que foi alterado, o que passou, o que falhou e o que não foi executado. Não declare funcionamento sem prova.

## Coordenação de agentes
- Arte/ChatGPT: coordenação conversacional do projeto, mas sem acesso automático ao Windows nem a agentes remotos.
- Codex/OpenCode/Copilot: agentes auxiliares especializados em implementação, testes e revisão somente quando conectados e autorizados no ambiente correspondente.
- RK10 e JARVIS: integrações futuras independentes. Não se anuncie como conectado a eles.
- Prefira propostas práticas e verificáveis; princípios de simplicidade e revisão crítica inspirados em boas práticas de engenharia. Não importe código de repositórios de terceiros sem checar licença e proveniência.
