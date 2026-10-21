# Expressinho — texto → 3D e integração Tripo/Blender

## O que esta versão realmente faz

1. **Texto → personagem/modelo orgânico real:** API oficial Tripo v3 (H Series).
   Cria `task_id`, consulta progresso e disponibiliza GLB.
   **Exige saldo na conta da API** (créditos do Tripo Studio não são os mesmos).
2. **Texto → chaveiro simples:** ponte Blender local; base círculo/coração,
   argola e nome; gera STL e .blend editável sem usar Tripo.
   NÃO gera dragões e esculturas orgânicas nessa modalidade.
3. **GLB → Studio:** baixar GLB pela API usando só o `task_id` e hospedar
   temporariamente no navegador (IndexedDB); editor recebe malha, normaliza altura
   para 100 mm e permite transformações e exportação STL/OBJ/GLB.
   **Cores e texturas originais do GLB não são preservadas na malha de edição.**
   O original ainda pode ser baixado em GLB. Se tiver mais de 35 MB ou o link não for
   de um domínio Tripo permitido, baixe e inspecione no Blender ou tente Abrir GLB no Studio.
4. **Imagem → relevo, silhueta e litofania:** continua separada e preservada.

## Configurar chave com segurança

**A chave divulgada anteriormente deve ser revogada**, e substituída por nova em
https://platform.tripo3d.ai . Nunca envie a chave ao chat nem ao GitHub.

No PowerShell, para não gravar a chave no disco ou exibi-la em texto:

```powershell
cd "C:\Users\relry\Documents\ExpressArte-V75-GitHub"
$segredo = Read-Host "Nova chave Tripo API" -AsSecureString
$env:TRIPO_API_KEY = [System.Net.NetworkCredential]::new("", $segredo).Password
Remove-Variable segredo
node .\scripts\tripo_diagnose.mjs
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

As variáveis existem só nesta janela do PowerShell; reiniciar o terminal exige
configurar novamente. Para conveniência também há `.env.example` e `.env.local`
ignorado pelo Git. Não coloque chaves em `src/` ou no frontend.

## Sem gastar créditos: validar motor

```powershell
node .\scripts\tripo_diagnose.mjs
node .\scripts\tripo_diagnose.mjs task_SEU_ID_VALIDO
```

O primeiro comando consulta saldo. O segundo consulta uma tarefa existente.
Nenhum cria tarefa. Exibe apenas estado/erro e se há modelo, sem mostrar credencial
ou link assinado do resultado.

## Como usar

- Site: http://127.0.0.1:5173 → campo **Descreva o que quer criar em 3D**
- Escolha **Modelo completo com IA**. Verifique o saldo API, escolha qualidade,
  opção de impressão, autorize **uma** geração e clique em gerar.
- Exemplo: "Dragão azul celestial, personagem colecionável corpo inteiro, quatro
  patas, asas próximas ao corpo, sem cenário, forma fechada."
- Qualidade **detalhada** usa `geometry_quality:detailed` e
  `texture_quality:detailed` (se as texturas estiverem ativas).
- **Extrema** usa textura 8K `texture_quality:extreme`; pode cobrar créditos adicionais.
  Não corresponde a geometria mais alta do que `detailed`.
- **Para impressão 3D** desativa textura/PBR; cores não saem no STL. Verifique malha.
- Acompanhe o progresso até concluir; salve o GLB logo após a geração, porque os
  links externos são temporários. Não cria nova tarefa automaticamente em erros.
- Clique em **Abrir modelo 3D no editor** para transferir a malha. O GLB original
  continua disponível para baixar. **Atenção à escala:** o editor define a altura
  inicial em 100 mm, mas a IA não fornece garantia de dimensões reais.
- Para fallback, use **Abrir GLB** no editor e selecione o arquivo baixado.
- Revise no Blender/Bambu Studio: espessura, malhas desconectadas, vazios,
  encaixes, orientação e compatibilidade com impressão FDM.

## Blender local

Em outra janela do PowerShell na pasta do projeto:
```powershell
py -3 .\scripts\blender_bridge.py
```

Teste rápido: selecione **Chaveiro básico no Blender** e digite
"chaveiro de coração com nome EXPRESSARTE, 80 mm".
O STL abre no editor e o projeto .blend pode ser baixado.
Uma malha que parece unida não é necessariamente manifold.

## Limites e estado do projeto

- Não foi feita nenhuma geração externa paga nos testes automáticos.
- O TripoSR está opcional e ainda não validado na GPU AMD RX 580 do usuário.
- O Blender e o GLB ainda precisam de teste real em Windows/Bambu.
- Arquivos acima de 35 MB não entram automaticamente; arquivos com mais de
  ~2 milhões de triângulos exigem simplificação para editar.
- Não há garantia de qualidade física, precisão de letras nem resistência das argolas.
- A versão está numa **ramificação de teste**, não mesclada na principal.

Referências:
https://developers.tripo3d.ai/en/docs/generation-text-to-model/standard
https://developers.tripo3d.ai/en/docs/task-query
https://developers.tripo3d.ai/en/docs/account
