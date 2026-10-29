# Operações sólidas locais

Manifold 3.5.4 (https://github.com/elalish/manifold), Apache-2.0, fixado no
package.json e package-lock.json. Licença distribuída em
public/licenses/manifold-3d.txt. O código de integração é próprio; o binário WASM
vem do pacote npm fixado, é empacotado pelo Vite e servido pelo próprio Studio.
Nenhum STL é enviado a um serviço remoto por estas operações.

Após abrir um STL, use **Corte fechado no navegador** ou **União sólida no
navegador** no painel de edição. A união usa as coordenadas originais do segundo
STL, sem reposicionamento automático. Corpos separados continuam separados.
O resultado substitui a malha somente quando válido e pode ser desfeito pelo
controle existente. O agrupamento e o corte aberto anteriores continuam disponíveis,
assim como a ponte Blender.

O motor exige sólidos fechados, orientados e com volume positivo. A união de
vértices coincidentes resolve a representação STL, mas não é reparação de furos.
Limites: 20 MB por arquivo, 200.000 triângulos por entrada, 400.000 no resultado,
60 segundos por operação. O Worker é encerrado após conclusão, erro ou timeout.
A interface bloqueia edições concorrentes enquanto o Worker opera.

## Validação

- `npm ci`
- `npm test`: motor WASM real, volume e fechamento das arestas de cortes X/Y/Z
  nos dois sentidos; união de corpos sobrepostos e separados; rejeição de
  entrada aberta, coordenadas inválidas, plano inválido e resultado vazio.
- `npx tsc --noEmit`
- `npm run build`: deve emitir o Worker e manifold WASM em assets.
- Teste de ciclo de vida do cliente: conclusão, erro do motor, falha de carga e timeout.
- Conferência visual automatizada não executada: download do Chromium pelo Playwright
  retornou arquivo inválido neste ambiente.
- `npm run lint`: bloqueado no baseline pela falta de eslint.config.*.

Antes do merge: abrir dois STLs reais no Windows/Chrome e no navegador móvel;
verificar corte, união, desfazer e exportar STL; importar os resultados no Bambu
Studio, conferir unidades em mm, superfícies, volumes e fatiamento. Ensaiar
malhas próximas ao limite e confirmar mensagem de erro sem perder o original.
O teste geométrico não certifica imprimibilidade nem substitui o fatiador.

## Meshseal: próxima integração, ainda não habilitada

Fonte MIT: https://github.com/jkavalik/meshseal. A implementação WASM upstream
exige Emscripten, CMake e compilação do alvo wasm/meshseal_wasm.cpp. Este ambiente
não tem emcc. Não incorporamos uma demonstração remota mutável nem anunciamos
reparação automática no Mesh Doctor.

Para integrar: fixar SHA upstream, compilar em CI com versão fixada do Emscripten,
publicar JS/WASM e licença junto do app, adaptar o contrato em Worker separado,
e comparar entrada/saída em um corpus STL com furos, faces duplicadas,
componentes desconectados e auto-interseções. Mostrar alterações e permitir
aceitar ou descartar; nunca substituir silenciosamente o arquivo original.
Validar os resultados com Manifold e Bambu Studio, incluindo falhas e timeout.
Manifold não substitui essa reparação.

REA pode auxiliar a revisão estática no Windows. A tentativa anterior neste
ambiente falhou na verificação de propriedade de processos (`capability_unavailable`);
não se considera essa análise executada nem se contorna a proteção.
