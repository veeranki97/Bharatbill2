<<<<<<< HEAD
@echo off
cd /d "%~dp0"
if not exist "node_modules" exit /b
if not exist "dist\index.html" exit /b

:: Start node.js completely hidden (no window, no taskbar icon)
powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
=======
@echo off
cd /d "%~dp0"
if not exist "node_modules" exit /b
if not exist "dist\index.html" exit /b

:: Start node.js completely hidden (no window, no taskbar icon)
powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'server.js' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
>>>>>>> 220786aa899b015d11f2ba84918d4da2205a1d2b
