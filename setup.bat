@echo off
echo 🚀 Negotiation Engine - Automated Setup
echo ========================================

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo ✓ Node.js found
echo ✓ npm found

REM Setup Backend
echo.
echo Setting up backend...
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Backend setup failed
    exit /b 1
)
echo ✓ Backend dependencies installed

REM Setup Frontend
echo.
echo Setting up frontend...
cd ..\client
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Frontend setup failed
    exit /b 1
)
echo ✓ Frontend dependencies installed

echo.
echo ✓ Setup complete!
echo.
echo Next steps:
echo 1. Open Terminal 1: cd server ^&^& npm start
echo 2. Open Terminal 2: cd client ^&^& npm start
echo 3. Access the app at http://localhost:3000
pause
