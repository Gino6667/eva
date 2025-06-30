@echo off
chcp 65001 >nul
echo ========================================
echo 美髮沙龍管理系統 - 一鍵啟動前後端
echo ========================================
echo.

REM 啟動後端
start "" cmd /k "cd /d C:\Users\voice\Desktop\new && npm install && npm run server"

REM 啟動前端
start "" cmd /k "cd /d C:\Users\voice\Desktop\new\frontend && npm install && npm run dev"

REM 等待前端啟動
timeout /t 5 >nul

REM 自動開啟瀏覽器
start http://localhost:5173

echo.
echo ========================================
echo 前端：http://localhost:5173
echo 後端：http://localhost:3001
echo ========================================
pause