# Express'Arte OrcaSlicer MCP

Servidor MCP local para controlar operações seguras do OrcaSlicer no Windows. Ele roda por **stdio** e deve ser registrado em um host MCP local (por exemplo, Claude Desktop, Cursor ou outro cliente compatível).

> Importante: este servidor MCP disponibiliza ferramentas para um assistente/host MCP. Ele não conecta diretamente uma página web hospedada ao computador. Para o Express'Arte Studio no navegador controlar o OrcaSlicer, será necessária uma ponte HTTP local adicional, com autenticação e validação de origem.

## Requisitos

- Windows 10/11
- Node.js 20 ou superior
- OrcaSlicer instalado
- Perfil Bambu Lab A1 configurado no OrcaSlicer

## Instalação

No PowerShell, a partir da pasta do repositório:

```powershell
cd .\scripts\orcaslicer-mcp
npm install
npm test
```

## Ferramentas MCP

- `orcaslicer_status`: verifica o executável e as opções CLI.
- `orcaslicer_list_profiles`: lista perfis locais de máquina, filamento e processo.
- `orcaslicer_open_model`: abre STL/3MF/OBJ/AMF/STEP para revisão visual.
- `orcaslicer_slice_export_3mf`: fatia e exporta um 3MF para uma pasta local.

O servidor usa o perfil atualmente salvo no OrcaSlicer. Antes do primeiro fatiamento, confirme na interface do OrcaSlicer que a máquina ativa é **Bambu Lab A1**, com o bico e o filamento corretos.

## Configuração do host MCP

Copie o bloco de `mcpServers` do arquivo `mcp-config.example.json` para a configuração do seu host e substitua o caminho de exemplo pelo caminho real do repositório no computador.

O executável padrão é:

```text
C:\Program Files\OrcaSlicer\orca-slicer.exe
```

Se estiver em outro local, defina a variável `ORCASLICER_EXE` na configuração do host.

## Segurança e limites desta versão

- Executa o OrcaSlicer com argumentos separados; não usa shell para montar comandos.
- Aceita somente formatos 3D listados no código.
- Não envia arquivos pela rede, não acessa credenciais Bambu e **não inicia impressão**.
- A exportação 3MF deve ser aberta e conferida visualmente antes de imprimir.
- O fatiamento depende dos perfis atualmente salvos no OrcaSlicer; o servidor ainda não seleciona automaticamente bico, filamento ou preset por trabalho.
- A ponte HTTP para comunicação direta com a interface web do Express'Arte Studio é uma etapa separada e ainda não está implementada.
