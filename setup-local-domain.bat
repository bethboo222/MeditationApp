@echo off
REM Script to set up TCDFYPmeditaionApp.com domain for localhost development on Windows
REM This adds the domain to your hosts file

set DOMAIN=TCDFYPmeditaionApp.com
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts

echo Setting up %DOMAIN% to point to localhost...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

REM Check if entry already exists
findstr /C:"%DOMAIN%" %HOSTS_FILE% >nul 2>&1
if %errorLevel% equ 0 (
    echo Entry for %DOMAIN% already exists in %HOSTS_FILE%
    echo Current entry:
    findstr /C:"%DOMAIN%" %HOSTS_FILE%
) else (
    echo Adding %DOMAIN% to %HOSTS_FILE%...
    echo 127.0.0.1    %DOMAIN% >> %HOSTS_FILE%
    echo Successfully added %DOMAIN% to hosts file
)

echo.
echo You can now access the app at:
echo   Frontend: http://%DOMAIN%:5173
echo   Backend API: http://%DOMAIN%:8080
echo.
pause
