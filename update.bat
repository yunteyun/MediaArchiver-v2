@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "APP_EXE=MediaArchiver v2.exe"
set "APP_DIR=%~dp0"
set "ZIP_PATH=%~1"
set "MA_UPDATER_APP_EXE=%APP_EXE%"

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
set "MA_UPDATER_ZIP=%ZIP_PATH%"
set "MA_UPDATER_TEMP_DIR=%TEMP_DIR%"

echo [INFO] Removing download block from ZIP (if present)...
powershell -NoProfile -Command "try { Unblock-File -LiteralPath $env:MA_UPDATER_ZIP -ErrorAction SilentlyContinue } catch {}"

powershell -NoProfile -Command "Expand-Archive -LiteralPath $env:MA_UPDATER_ZIP -DestinationPath $env:MA_UPDATER_TEMP_DIR -Force"
if errorlevel 1 (
  echo [ERROR] Failed to extract update ZIP.
  rmdir /s /q "%TEMP_DIR%" >nul 2>&1
  echo Press any key to exit.
  pause
  exit /b 1
)

set "SRC_DIR="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$f=Get-ChildItem -LiteralPath $env:MA_UPDATER_TEMP_DIR -Recurse -Filter $env:MA_UPDATER_APP_EXE -File | Select-Object -First 1; if($f){ [Console]::Write($f.DirectoryName) }"`) do set "SRC_DIR=%%I"

if "%SRC_DIR%"=="" (
  echo [ERROR] Could not find %APP_EXE% inside ZIP.
  rmdir /s /q "%TEMP_DIR%" >nul 2>&1
  echo Press any key to exit.
  pause
  exit /b 1
)

set "MA_UPDATER_SRC_DIR=%SRC_DIR%"
echo [INFO] Removing download block from extracted files (if present)...
powershell -NoProfile -Command "try { Get-ChildItem -LiteralPath $env:MA_UPDATER_SRC_DIR -Recurse -File | Unblock-File -ErrorAction SilentlyContinue } catch {}"

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

set "MA_UPDATER_NEW_UPDATER=%SRC_DIR%\update.bat"
set "MA_UPDATER_TARGET_SCRIPT=%APP_DIR%update.bat"
set "MA_UPDATER_TARGET_EXE=%APP_DIR%%APP_EXE%"
set "HANDOFF_CMD=%TEMP%\MediaArchiverUpdateHandoff_%RANDOM%%RANDOM%.cmd"

(
  echo @echo off
  echo setlocal EnableExtensions
  echo ping 127.0.0.1 -n 2 ^>nul
  echo if exist "%%MA_UPDATER_NEW_UPDATER%%" copy /y "%%MA_UPDATER_NEW_UPDATER%%" "%%MA_UPDATER_TARGET_SCRIPT%%" ^>nul
  echo if exist "%%MA_UPDATER_TARGET_SCRIPT%%" powershell -NoProfile -Command "try { Unblock-File -LiteralPath $env:MA_UPDATER_TARGET_SCRIPT -ErrorAction SilentlyContinue } catch {}"
  echo if exist "%%MA_UPDATER_TARGET_EXE%%" start "" "%%MA_UPDATER_TARGET_EXE%%"
  echo rmdir /s /q "%%MA_UPDATER_TEMP_DIR%%" ^>nul 2^>^&1
  echo del "%%~f0" ^>nul 2^>^&1
) > "%HANDOFF_CMD%"

echo [INFO] Update complete. Launching app...
set "ELECTRON_RUN_AS_NODE="
set "ELECTRON_ENABLE_LOGGING="
set "ELECTRON_ENABLE_STACK_DUMPING="
set "NODE_OPTIONS="
start "" /min cmd /c ""%HANDOFF_CMD%""
exit /b 0
