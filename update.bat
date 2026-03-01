@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_EXE=MediaArchiver v2.exe"
set "APP_DIR=%~dp0"
set "ZIP_PATH=%~1"

echo ==========================================
echo MediaArchiver Update Tool
echo ==========================================
echo 1) Select the new release ZIP when asked.
echo 2) The app will be closed automatically.
echo 3) Files will be updated and app will relaunch.
echo.

if not exist "%APP_DIR%%APP_EXE%" (
  echo [ERROR] %APP_EXE% was not found in this folder.
  echo Run update.bat from the folder where %APP_EXE% exists.
  pause
  exit /b 1
)

if "%ZIP_PATH%"=="" (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.OpenFileDialog; $d.Filter='ZIP files (*.zip)|*.zip'; $d.Title='Select update ZIP'; if($d.ShowDialog() -eq 'OK'){ $d.FileName }"`) do set "ZIP_PATH=%%I"
)

if "%ZIP_PATH%"=="" (
  echo [INFO] Update canceled.
  echo Press any key to exit.
  pause >nul
  exit /b 0
)

if not exist "%ZIP_PATH%" (
  echo [ERROR] ZIP file not found: %ZIP_PATH%
  echo Press any key to exit.
  pause
  exit /b 1
)

set "TEMP_DIR=%TEMP%\MediaArchiverUpdate_%RANDOM%%RANDOM%"
mkdir "%TEMP_DIR%" >nul 2>&1

powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP_PATH%' -DestinationPath '%TEMP_DIR%' -Force" 
if errorlevel 1 (
  echo [ERROR] Failed to extract update ZIP.
  rmdir /s /q "%TEMP_DIR%" >nul 2>&1
  echo Press any key to exit.
  pause
  exit /b 1
)

set "SRC_DIR="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$f=Get-ChildItem -Path '%TEMP_DIR%' -Recurse -Filter '%APP_EXE%' -File | Select-Object -First 1; if($f){ $f.DirectoryName }"`) do set "SRC_DIR=%%I"

if "%SRC_DIR%"=="" (
  echo [ERROR] Could not find %APP_EXE% inside ZIP.
  rmdir /s /q "%TEMP_DIR%" >nul 2>&1
  echo Press any key to exit.
  pause
  exit /b 1
)

echo [INFO] Closing running app (if any)...
taskkill /IM "%APP_EXE%" /F >nul 2>&1

echo [INFO] Copying updated files...
rem NOTE: Do not overwrite the running updater script itself.
rem Overwriting update.bat while cmd.exe is still executing it can break the remaining steps.
rem NOTE: APP_DIR ends with "\" (%~dp0). For robocopy, quoted trailing "\" can break arg parsing.
rem Use "%APP_DIR%." to avoid the trailing-backslash quote edge case while keeping the same directory.
robocopy "%SRC_DIR%" "%APP_DIR%." /E /XF "update.bat" /R:1 /W:1 /NFL /NDL /NJH /NJS /NP >nul
set "RC=%ERRORLEVEL%"

if %RC% GEQ 8 (
  echo [ERROR] Update copy failed ^(robocopy=%RC%^).
  rmdir /s /q "%TEMP_DIR%" >nul 2>&1
  echo Press any key to exit.
  pause
  exit /b 1
)

rmdir /s /q "%TEMP_DIR%" >nul 2>&1

echo [INFO] Update complete. Launching app...
start "" "%APP_DIR%%APP_EXE%"
exit /b 0
