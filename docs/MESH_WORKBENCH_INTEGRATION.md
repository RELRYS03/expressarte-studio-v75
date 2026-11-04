# Mesh Workbench — integração local Express'Arte

## Estado desta etapa

A interface do editor STL agora possui **Diagnóstico Mesh Workbench**. A análise é somente leitura: envia uma cópia STL da geometria atual para a ponte local e apresenta vértices, arestas, faces, arestas de borda, arestas não-manifold e validade numérica. O arquivo/objeto aberto no Studio não é substituído.

A ponte usa o CLI oficial `mesh-workbench run` e o Blender instalado localmente. Ela aceita apenas um STL limitado a 20 MB e executa uma receita fixa de importação + inspeção. O navegador não pode enviar receitas, caminhos, scripts ou comandos arbitrários.

## Instalação no Windows (uma vez)

PowerShell:

```powershell
py -3.11 -m venv "$env:USERPROFILE\mesh-workbench-venv"
& "$env:USERPROFILE\mesh-workbench-venv\Scripts\Activate.ps1"
git clone https://github.com/shakystar/mesh-workbench.git "$env:USERPROFILE\mesh-workbench"
Set-Location "$env:USERPROFILE\mesh-workbench"
python -m pip install -e .
```

Instale Blender 5.2.2 LTS. Se estiver em outro local, defina `EXPRESSARTE_BLENDER_EXE` para o caminho do executável.

## Iniciar a ponte

No repositório Express'Arte Studio, execute:

```powershell
.scripts\INICIAR_MESH_WORKBENCH_BRIDGE_WINDOWS.bat
```

A ponte escuta somente em `127.0.0.1:8767`. Mantenha a janela aberta enquanto usar o Studio. O serviço existente do Blender em `127.0.0.1:8766` continua separado e inalterado.

Verifique:

```powershell
Invoke-RestMethod http://127.0.0.1:8767/v1/health
```

A resposta deve indicar `available: true`, `meshWorkbench: true` e `blender: true`.

## Uso no Studio

1. Abra Studio 3D e importe um STL.
2. No painel direito, localize **Diagnóstico Mesh Workbench**.
3. Aguarde a análise e confira os contadores de topologia.
4. Compare com o Mesh Doctor e, depois, com o Bambu Studio.

Interpretação básica:
- `boundary_edges > 0`: existem bordas abertas.
- `nonmanifold_edges > 0`: há arestas não-manifold; isso pode indicar defeitos de topologia.
- `finite = false`: há coordenadas inválidas.
- Zero nesses indicadores é evidência útil, mas não certifica sozinho que o modelo seja imprimível nem detecta toda colisão/interseção.

## Limites e segurança

- Esta etapa implementa diagnóstico, não reparo automático.
- O diagnóstico não altera a malha importada, nem chama serviços remotos.
- Arquivos temporários e saídas são isolados em diretório temporário e removidos ao encerrar a execução.
- Limite de entrada: 20 MB; timeout: 180 segundos.
- A ponte deve permanecer local; não exponha a porta 8767 na rede.
- O upstream Mesh Workbench é MIT, mas a instalação é independente do repositório Express'Arte.
- Testes reais em Windows e fatiamento no Bambu Studio ainda são obrigatórios antes do merge.
