#!/bin/bash

# 前端建置
cd frontend
npm install
npm run build
cd ..

# 啟動 docker-compose（包含前後端）
docker-compose up -d --build

echo "本地開發環境已啟動：http://localhost:8080 (前端)  http://localhost:3000 (API)" 