# 使用官方 Node.js 映像檔
FROM node:18-alpine as build

# 設定工作目錄
WORKDIR /app

# 複製 package.json 與安裝依賴
COPY package*.json ./
RUN npm install

# 複製前端與後端程式碼
COPY . .

# 前端建置
WORKDIR /app/frontend
RUN npm install && npm run build

# 回到根目錄
WORKDIR /app

# 暴露後端埠口
EXPOSE 3000

# 啟動後端
CMD ["node", "index.js"] 