# Expressinho IA — TripoSR local (experimento)

Objetivo: transformar **uma imagem** em um modelo **GLB** com o TripoSR de codigo aberto,
sem usar a API paga do Tripo. O Expressinho/Blender continua responsavel por corrigir,
achatar, simplificar e preparar o modelo para impressao.

## Antes de instalar: avaliar o PC

Abra o PowerShell na raiz deste projeto e rode:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\expressinho_hardware.ps1
```

Envie ao assistente apenas o nome da placa e a memoria reportada.
O TripoSR original pede **cerca de 6 GB de VRAM** na configuracao padrao e recomenda
**NVIDIA/CUDA**. GTX 1660 de 6 GB pode ser testada, mas sem garantia; RX 580 e
outras AMD nao oferecem o mesmo caminho CUDA e podem exigir outro setup/CPU,
muito mais lento. **Nao instale dependencias pesadas antes desse diagnostico.**

## Instalacao manual opcional (somente depois de verificar a GPU)

Use uma pasta sua, **nao** `C:\Windows\System32`. No PowerShell:

```powershell
mkdir "$HOME\Documents\Expressinho-Modelos" -Force
cd "$HOME\Documents\Expressinho-Modelos"
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip setuptools
```

Instale o PyTorch compatível com sua GPU e CUDA conforme
https://pytorch.org/get-started/locally/ (nao fornecemos um comando CUDA
universal). Depois:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Se instalar dependencias falhar, pare e compartilhe o erro; nao experimente
diversas versoes de CUDA ao acaso. O codigo do TripoSR pode precisar de ajustes
para bibliotecas modernas/Windows.

## Configurar a ponte do Expressinho

Na mesma janela que vai iniciar a **ponte Blender**, configure os caminhos
usando a instalacao real (os comandos abaixo usam a pasta sugerida acima):

```powershell
$env:EXPRESSARTE_TRIPOSR_DIR = "$HOME\Documents\Expressinho-Modelos\TripoSR"
$env:EXPRESSARTE_TRIPOSR_PYTHON = "$HOME\Documents\Expressinho-Modelos\TripoSR\.venv\Scripts\python.exe"
$env:EXPRESSARTE_TRIPOSR_DEVICE = "cuda:0"
```

Entao, na raiz do repositorio Express'Arte Studio:

```powershell
py -3 .\scripts\blender_bridge.py
```

O navegador mostra em **Criar com Expressinho → TripoSR local**:
**Verificar motor** e **Gerar GLB local da imagem**.

O status `configured` significa somente que os caminhos existem. **Nao**
prova que as bibliotecas, GPU e pesos estao prontos: essa validacao exige um
teste real. O primeiro teste pode baixar pesos do Hugging Face, consumindo
internet/disco, mas **nao** creditos do Tripo Studio/API.

## Saida e limites

- Entrada: PNG, JPEG ou WebP, ate 5 MB.
- Saida: GLB baixavel, ate 50 MB. O modelo **nao e exportado diretamente
  como STL** nem inserido automaticamente no viewport nesta primeira fase.
- Importar GLB no Blender; conferir orientacao, dimensoes, geometria traseira e
  malha. Um GLB gerado **nao e necessariamente pronto para impressao**.
- Este caminho aceita apenas **imagem**: o texto do formulario nao controla
  a inferencia TripoSR nesta versao.
- A ponte ou o Expressinho nao executam scripts enviados pelo usuario.
- Nao precisa criar chave de API nem conectar Tripo CLI.

## O que falta

1. Confirmar que a configuracao funciona no Windows/Blender 5.2 do usuario.
2. Conectar o GLB como objeto editavel ao viewport do Studio.
3. Usar autoavaliacao e ferramentas Blender para corrigir verso/espessura,
   separar corpos e preparar o STL.
4. Avaliar suporte a imagem + descricao em um motor local mais moderno.

Referencia: https://github.com/VAST-AI-Research/TripoSR (MIT conforme README).
