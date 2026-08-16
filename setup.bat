@echo off
REM RealtorAI Automated Setup - Windows Batch File
REM This script runs the PowerShell setup script with proper permissions

setlocal enabledelayedexpansion

echo.
echo ===================================
echo RealtorAI Automated Setup
echo ===================================
echo.
echo Checking for Administrator privileges...

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script must run as Administrator!
    echo.
    echo Steps to fix:
    echo 1. Close this window
    echo 2. Find this file: setup.bat
    echo 3. Right-click it
    echo 4. Click "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo OK! Running with Administrator privileges.
echo.

REM Run the PowerShell script
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\setup.ps1'"

pause
