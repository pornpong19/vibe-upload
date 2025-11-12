@echo off
echo Starting Vibe Upload Application...
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo node_modules not found. Installing dependencies...
    call npm install
    echo.
)

REM Start the Electron application
echo Launching application...
call npm start

pause
