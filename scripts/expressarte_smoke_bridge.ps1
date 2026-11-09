param(
    [ValidateSet("circulo", "coracao")]
    [string]$Shape = "circulo",
    [ValidateRange(30, 150)]
    [double]$WidthMm = 45,
    [ValidateLength(1, 30)]
    [string]$Name = "EXPRESSARTE",
    [string]$OutputDir = "C:\ExpressArte-AI\output"
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:8766"

$status = Invoke-RestMethod -Uri "$baseUrl/v1/engine/status" -Method Get
if (-not $status.blender.available) {
    throw "Blender 5.2 não está disponível na ponte local."
}

$providers = @($status.onnxRuntime.providers)
if ($providers -contains "DmlExecutionProvider") {
    Write-Host "IA local: ONNX Runtime DirectML disponível." -ForegroundColor Green
} else {
    Write-Warning "Blender está disponível, mas DirectML não foi detectado pelo venv."
}

$body = @{
    kind = "chaveiro"
    widthMm = $WidthMm
    shape = $Shape
    name = $Name
} | ConvertTo-Json -Compress

$result = Invoke-RestMethod -Uri "$baseUrl/v1/create-keychain" -Method Post -ContentType "application/json" -Body $body

if (-not $result.ok -or -not $result.stlBase64 -or -not $result.blendBase64) {
    throw "A ponte não retornou STL e BLEND válidos."
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$safeName = [regex]::Replace($Name, '[^\p{L}\p{N}_-]', '_')
$stlPath = Join-Path $OutputDir "$safeName.stl"
$blendPath = Join-Path $OutputDir "$safeName.blend"

[System.IO.File]::WriteAllBytes($stlPath, [Convert]::FromBase64String($result.stlBase64))
[System.IO.File]::WriteAllBytes($blendPath, [Convert]::FromBase64String($result.blendBase64))

Write-Host "CHAVEIRO GERADO PELO BLENDER 5.2" -ForegroundColor Green
Write-Host "STL:   $stlPath"
Write-Host "BLEND: $blendPath"
Write-Host "Geometria paramétrica local concluída."
Write-Host "Nota: este smoke test valida a ponte Blender + runtime DirectML; não executa um modelo neural de IA."
