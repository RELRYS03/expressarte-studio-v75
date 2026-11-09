param(
    [switch]$StartBridge
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$aiRoot = "C:\ExpressArte-AI"
$venvPython = Join-Path $aiRoot "venv\Scripts\python.exe"
$blender = "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

Write-Host "=== EXPRESS'ARTE STUDIO 3D — SETUP WINDOWS ===" -ForegroundColor Cyan

if (-not (Get-Command py.exe -ErrorAction SilentlyContinue)) {
    throw "Python Launcher não encontrado. Instale Python 3.11 x64: winget install -e --id Python.Python.3.11"
}

& py -3.11 --version
if ($LASTEXITCODE -ne 0) {
    throw "Python 3.11 não encontrado pelo launcher py."
}

$pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
if ($pythonCommand -and ($pythonCommand.Source -like "*WindowsApps*")) {
    Write-Warning "python.exe aponta para o alias da Microsoft Store. Desative python.exe/python3.exe em Configurações > Aplicativos > Aliases de execução."
    Write-Host "Abrir configuração: Start-Process ms-settings:appsfeatures-appaliases"
}

$gpuNames = @(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name })
if (-not $gpuNames.Count) {
    throw "Nenhuma GPU foi identificada pelo Windows."
}
$gpuNames | ForEach-Object { Write-Host "GPU: $_" }

if ($gpuNames -match "NVIDIA") {
    throw "GPU NVIDIA detectada. Este setup foi definido para o hardware AMD RX 580/DirectML; não instale CUDA automaticamente."
}
if (-not ($gpuNames -match "AMD|Radeon|Intel|Arc")) {
    throw "GPU fora do alvo DirectML deste setup. Interrompido sem instalar dependências."
}

if (-not (Test-Path $venvPython)) {
    New-Item -ItemType Directory -Force $aiRoot | Out-Null
    & py -3.11 -m venv (Join-Path $aiRoot "venv")
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar o ambiente virtual." }
}

$directmlPackage = & $venvPython -m pip show onnxruntime-directml 2>$null
if (-not $directmlPackage) {
    $cpuPackage = & $venvPython -m pip show onnxruntime 2>$null
    if ($cpuPackage) {
        & $venvPython -m pip uninstall -y onnxruntime
        if ($LASTEXITCODE -ne 0) { throw "Falha ao remover ONNX Runtime CPU conflitante." }
    }
    & $venvPython -m pip install "onnxruntime-directml==1.24.4"
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar ONNX Runtime DirectML." }
}

$providersJson = & $venvPython -c "import json,onnxruntime as ort; print(json.dumps({'version':ort.__version__,'providers':ort.get_available_providers()}))"
if ($LASTEXITCODE -ne 0) { throw "ONNX Runtime não pôde ser importado pelo venv." }
$runtime = $providersJson | ConvertFrom-Json
if ($runtime.providers -notcontains "DmlExecutionProvider") {
    throw "DmlExecutionProvider não aparece no runtime. Nenhum motor de IA foi iniciado."
}

if (-not (Test-Path $blender)) {
    throw "Blender 5.2 não encontrado: $blender"
}

$env:EXPRESSARTE_AI_PYTHON = $venvPython
$env:EXPRESSARTE_BLENDER_EXE = $blender

Write-Host "Python IA: $venvPython"
Write-Host "ONNX Runtime: $($runtime.version)"
Write-Host "Providers: $($runtime.providers -join ', ')"
Write-Host "Blender: $blender"
Write-Host "Backend selecionado: ONNX Runtime + DirectML"

if ($StartBridge) {
    $listener = Get-NetTCPConnection -LocalPort 8766 -State Listen -ErrorAction SilentlyContinue
    if (-not $listener) {
        Start-Process -FilePath "py.exe" -ArgumentList @("-3.11", "scripts\blender_bridge.py") -WorkingDirectory $repoRoot
        Write-Host "Aguardando a ponte Blender responder..."
        $bridgeReady = $false
        for ($attempt = 0; $attempt -lt 15; $attempt++) {
            try {
                $null = Invoke-RestMethod -Uri "http://127.0.0.1:8766/v1/health" -Method Get -TimeoutSec 2
                $bridgeReady = $true
                break
            } catch {
                Start-Sleep -Seconds 1
            }
        }
        if (-not $bridgeReady) {
            throw "A ponte não respondeu na porta 8766. Confira o terminal do Blender Bridge."
        }
        Write-Host "Ponte Blender pronta em http://127.0.0.1:8766"
    } else {
        Write-Host "Ponte já está escutando na porta 8766."
    }
} else {
    Write-Host "Para iniciar a ponte: py -3.11 scripts\blender_bridge.py"
}

Write-Host "Setup concluído. Nenhum peso de IA foi baixado." -ForegroundColor Green
