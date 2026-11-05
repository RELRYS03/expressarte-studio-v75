@echo off
setlocal
set "MW_VENV=%USERPROFILE%\mesh-workbench-venv"
if exist "%MW_VENV%\Scripts\activate.bat" call "%MW_VENV%\Scripts\activate.bat"
if not defined EXPRESSARTE_BLENDER_EXE set "EXPRESSARTE_BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
where mesh-workbench >nul 2>nul
if errorlevel 1 (
  echo [ERRO] mesh-workbench nao encontrado no PATH.
  echo Instale no ambiente virtual conforme docs\MESH_WORKBENCH_INTEGRATION.md
  pause
  exit /b 1
)
if not exist "%EXPRESSARTE_BLENDER_EXE%" (
  echo [ERRO] Blender nao encontrado: %EXPRESSARTE_BLENDER_EXE%
  echo Ajuste EXPRESSARTE_BLENDER_EXE para o caminho correto.
  pause
  exit /b 1
)
python "%~dp0mesh_workbench_bridge.py"
pause
