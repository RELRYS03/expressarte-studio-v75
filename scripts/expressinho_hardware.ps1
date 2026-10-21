# Diagnostico de hardware para decidir se vale instalar TripoSR.
# Nao instala programas nem envia informacoes para a rede.
$ErrorActionPreference = "Continue"
Write-Host "=== Expressinho IA: verificacao de hardware local ===" -ForegroundColor Cyan
$ram = Get-CimInstance Win32_ComputerSystem
if ($ram) {
  Write-Host ("Memoria RAM instalada: {0:N1} GB" -f ($ram.TotalPhysicalMemory / 1GB))
}
Write-Host "Placas de video detectadas:"
$controllers = Get-CimInstance Win32_VideoController
foreach ($gpu in $controllers) {
  Write-Host (" - {0}" -f $gpu.Name)
  if ($gpu.AdapterRAM -gt 0) {
    Write-Host ("   Memoria reportada pelo Windows: {0:N1} GB (pode ser imprecisa)" -f ($gpu.AdapterRAM / 1GB))
  }
}
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  Write-Host "Diagnostico NVIDIA:"
  & nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
} else {
  Write-Host "nvidia-smi indisponivel. Se voce usa AMD, TripoSR pode exigir CPU ou ajustes adicionais."
}
Write-Host "Interpretacao: TripoSR original recomenda aproximadamente 6 GB de VRAM no modo padrao."
Write-Host "Este diagnostico nao instala TripoSR e nao garante compatibilidade."
