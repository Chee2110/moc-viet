@echo off
chcp 65001 >nul
echo.
echo  =====================================================
echo   Moc Viet - He thong thuong mai dien tu
echo   Database: PostgreSQL
echo  =====================================================
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo [LOI] Node.js chua duoc cai dat!
  echo Tai tai: https://nodejs.org
  pause & exit /b 1
)

REM Check .env
if not exist ".env" (
  echo [LOI] Khong tim thay file .env
  echo Sao chep .env.example thanh .env roi dien thong tin PostgreSQL
  copy .env.example .env >nul
  echo Da tao .env tu .env.example - Vui long chinh sua mat khau PostgreSQL
  notepad .env
  pause & exit /b 1
)

echo [1/2] Dang cai dat thu vien npm...
call npm install
if %ERRORLEVEL% neq 0 ( echo [LOI] npm install that bai! & pause & exit /b 1 )

echo.
echo [2/2] Khoi dong Moc Viet server...
echo.
echo  --------------------------------------------------
echo   Truoc khi chay, dam bao:
echo   1. PostgreSQL dang chay tren may tinh
echo   2. Da tao database "mocviet":
echo      psql -U postgres -c "CREATE DATABASE mocviet;"
echo   3. File .env da co thong tin ket noi dung
echo  --------------------------------------------------
echo.
echo  Website: http://localhost:3000
echo  De dung : Nhan Ctrl+C
echo.

node server.js
pause
