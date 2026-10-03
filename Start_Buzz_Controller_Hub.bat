@echo off
setlocal
cd /d "%~dp0"
title BUZZ! Controller Hub

:: Add common Node.js install paths in case PATH was not refreshed
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

echo ================================================================
echo   BUZZ! Multi-Phone Controller Hub for PCSX2
echo ================================================================
echo.

:: Test Node.js
call node -v >nul 2>&1
if errorlevel 1 goto NODE_NOT_FOUND

echo [OK] Node.js detected: 
call node -v
echo.

:: Check if node_modules exists
if exist node_modules goto START_APP

echo [*] First-time setup: Installing required packages...
echo [*] This only takes a moment. Please wait...
echo.
call npm install
if errorlevel 1 goto INSTALL_FAILED

:START_APP
echo.
echo [*] Opening BUZZ! Dashboard at http://localhost:3000 ...
start http://localhost:3000

echo [*] Starting BUZZ! Server...
echo ----------------------------------------------------------------
call npm run dev
goto FINISH

:NODE_NOT_FOUND
echo [ERROR] Node.js was not found on your PC!
echo.
echo Please install Node.js (LTS version) from:
echo   https://nodejs.org/
echo.
echo During installation, make sure to check "Add to PATH".
echo If you just installed it, close and reopen this .bat file.
goto PAUSE_END

:INSTALL_FAILED
echo.
echo [ERROR] npm install encountered an error.
echo Try opening terminal in this folder and running: npm install
goto PAUSE_END

:FINISH
echo.
echo BUZZ! Server has stopped.

:PAUSE_END
echo.
echo Press any key to exit...
pause >nul