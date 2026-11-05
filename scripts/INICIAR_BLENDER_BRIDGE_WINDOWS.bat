@echo off
setlocal
cd /d "%~dp0\.."
if not defined EXPRESSARTE_BLENDER_EXE set "EXPRESSARTE_BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
if not exist "%EXPRESSARTE_BLENDER_EXE%" (
  echo [ERRO] Blender 5.2 nao encontrado: %EXPRESSARTE_BLENDER_EXE%
  echo Ajuste EXPRESSARTE_BLENDER_EXE para o caminho correto.
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 scripts\blender_bridge.py
) else (
  python scripts\blender_bridge.py
)
if errorlevel 1 pause
