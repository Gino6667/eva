# 美髮沙龍管理系統

## 專案簡介
本專案為美髮沙龍前後台管理系統，支援設計師管理、排隊抽號、預約、財務報表、會員管理等功能，前端採用 React + Vite，後端為 Node.js/Express，資料以 data.json 儲存。

## 目錄結構
```
new/
  ├── backend/           # 後端 API 相關程式
  ├── frontend/          # 前端 React 專案
  ├── data.json          # 全域資料來源
  ├── index.js           # 主要後端 API 入口
  ├── package.json       # 專案依賴
  └── ...
```

## 啟動方式
1. 安裝依賴：`npm install`
2. 啟動後端：`node index.js`
3. 啟動前端：`cd frontend && npm install && npm run dev`

## 主要功能
- 設計師管理、服務設定
- 線上/現場排隊抽號、預約
- 排隊進度查詢、調整客人
- 財務管理、報表統計
- 會員登入、資料管理

## API 文件範例
- `POST /api/queue`：抽號
- `GET /api/queue/today-stats`：查詢今日排隊狀態
- `PATCH /api/reservations/:id`：修改預約
- `POST /api/services`：新增服務
- ...（詳見 index.js 註解）

## 資料結構說明
- designers: 設計師陣列，欄位有 id, name, services, isPaused ...
- services: 服務項目陣列，欄位有 id, name, price, duration, status ...
- queue: 排隊資料陣列，欄位有 id, designerId, serviceId, status, createdAt, userId, number ...
- 其他：users, reservations, transactions, worktime ...

## 維護與貢獻
- 請遵循 eslint/prettier 格式化規範
- 重要邏輯請加註解
- 歡迎 issue/PR 