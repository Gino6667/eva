const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(cors({
  origin: ['https://gino6667.github.io', 'https://gino6667.github.io/eva'],
  credentials: true
}));
app.use(express.json());

const DATA_PATH = path.join(__dirname, 'data.json');
const git = simpleGit();
const JWT_SECRET = 'your_jwt_secret_key'; // 請改成安全的 key

async function setupGitConfig() {
  await git.addConfig('user.name', 'render-bot');
  await git.addConfig('user.email', 'render-bot@render.com');
}
setupGitConfig();

function getData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}
function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    // 僅在本地開發時才 push
    if (process.env.NODE_ENV !== 'production') {
      pushToGitHub();
    }
    return true;
  } catch (err) {
    console.error('寫入 data.json 失敗:', err);
    return false;
  }
}

async function pushToGitHub() {
  try {
    await git.add('./data.json');
    await git.commit('Update data');
    await git.push('origin', 'main');
  } catch (err) {
    console.error('Git push error:', err);
  }
}

function isToday(dateString) {
  const d = new Date(dateString)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isSameDay(dateString, y, m, d) {
  const dt = new Date(dateString)
  return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d
}

function isWithin3Months(dateString) {
  const dt = new Date(dateString)
  const now = new Date()
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
  return dt >= threeMonthsAgo && dt <= now
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 檢查 data.json 檔案狀態
app.get('/api/check-data', (req, res) => {
  try {
    const data = getData();
    const adminExists = data.users.find(u => u.phone === 'rowyha' && u.role === 'admin');
    
    res.json({
      status: 'ok',
      dataFileExists: true,
      adminAccountExists: !!adminExists,
      totalUsers: data.users.length,
      adminUser: adminExists ? {
        id: adminExists.id,
        phone: adminExists.phone,
        name: adminExists.name,
        role: adminExists.role
      } : null
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
      dataFileExists: false
    });
  }
});

app.get('/api/designers', (req, res) => {
  const data = getData();
  res.json(data.designers);
});

app.get('/api/services', (req, res) => {
  const data = getData();
  res.json(data.services);
});

app.get('/api/queue', (req, res) => {
  const data = getData();
  let result = data.queue.filter(q => isWithin3Months(q.createdAt));
  if (req.query.date) {
    const [y, m, d] = req.query.date.split('-').map(Number)
    const queryDate = new Date(req.query.date);
    const now = new Date();
    if (queryDate > now) {
      return res.json([]);
    }
    result = result.filter(q => isSameDay(q.createdAt, y, m, d))
  }
  res.json(result);
});

app.get('/api/reservations', (req, res) => {
  const data = getData();
  res.json(data.reservations);
});

app.get('/api/users', (req, res) => {
  const data = getData();
  res.json(data.users);
});

// 新增抽號
app.post('/api/queue', (req, res) => {
  const data = getData();
  let { designerId, serviceId, type, userId } = req.body;
  // 營業時間檢查
  const worktime = data.worktime || {};
  const now = new Date();
  const week = now.getDay();
  if (!worktime.openDays?.[week]) return res.status(400).json({ error: '非營業日不可抽號' });
  const open = worktime.openTimes?.[week]?.start;
  const close = worktime.openTimes?.[week]?.end;
  if (open && close) {
    const nowStr = now.toTimeString().slice(0,5);
    if (nowStr < open || nowStr >= close) {
      return res.status(400).json({ error: '非營業時間不可抽號' });
    }
  }
  // 若 designerId 為 0，優先分配空閒設計師，否則分配給 queue 最少的設計師
  if (designerId === 0 || designerId === '0') {
    let designers = data.designers.filter(d => !d.isPaused);
    if (designers.length > 0) {
      // 找出所有沒客人的設計師（沒有 waiting/called 狀態的 queue）
      const busyDesignerIds = data.queue.filter(q => q.status === 'waiting' || q.status === 'called').map(q => q.designerId);
      const freeDesigners = designers.filter(d => !busyDesignerIds.includes(d.id));
      let assignList = freeDesigners;
      if (assignList.length === 0) {
        // 輪流分配：找 queue 數量最少的設計師
        const queueCount = {};
        designers.forEach(d => { queueCount[d.id] = 0; });
        data.queue.forEach(q => { if (queueCount[q.designerId] !== undefined) queueCount[q.designerId]++; });
        const minCount = Math.min(...Object.values(queueCount));
        assignList = designers.filter(d => queueCount[d.id] === minCount);
      }
      // 多人同分時隨機選一位
      const randomIndex = Math.floor(Math.random() * assignList.length);
      designerId = assignList[randomIndex].id;
    }
  } else {
    // 指定設計師時，若該設計師 isPaused，則回傳錯誤
    const designer = data.designers.find(d => d.id === Number(designerId));
    if (designer && designer.isPaused) {
      return res.status(400).json({ error: '該設計師今日暫停接客' });
    }
  }
  // 只取今天的 queue 計算號碼
  const todayQueue = data.queue.filter(q => isToday(q.createdAt));
  const newId = data.queue.length ? Math.max(...data.queue.map(q => q.id)) + 1 : 1;
  const newNumber = todayQueue.length ? Math.max(...todayQueue.map(q => q.number)) + 1 : 1;
  const newQueue = {
    id: newId,
    designerId,
    serviceId,
    type, // 'onsite' or 'online'
    status: 'waiting',
    number: newNumber,
    createdAt: new Date().toISOString(),
    userId: userId || null
  };
  data.queue.push(newQueue);
  saveData(data);
  res.json(newQueue);
});

// 新增預約
app.post('/api/reservations', (req, res) => {
  const data = getData();
  const { designerId, serviceId, userId, date, time } = req.body;
  
  // 驗證必填欄位
  if (!designerId || !serviceId || !userId || !date || !time) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  
  // worktime 驗證
  const worktime = data.worktime || {};
  const dt = new Date(date);
  const week = dt.getDay();
  if (!worktime.openDays?.[week]) return res.status(400).json({ error: '非營業日不可預約' });
  
  const slotIdx = worktime.slotConfig?.[week]?.findIndex(slot => slot.enabled && slot.time === time);
  if (slotIdx === -1) return res.status(400).json({ error: '非開放時段不可預約' });
  if (!worktime.slotConfig[week][slotIdx].services[serviceId-1]) return res.status(400).json({ error: '該服務未開放' });
  
  // 檢查設計師是否可用
  const designer = data.designers.find(d => d.id === Number(designerId));
  if (!designer) return res.status(400).json({ error: '找不到設計師' });
  if (designer.isPaused) return res.status(400).json({ error: '該設計師暫停接客' });
  
  // 檢查是否已有預約（同一客戶同一時段）
  const existingReservation = data.reservations.find(r => 
    r.userId === Number(userId) && r.date === date && r.time === time && r.status !== 'cancelled'
  );
  if (existingReservation) return res.status(400).json({ error: '您已在此時段有預約' });
  
  // 檢查設計師是否已被預約（同一設計師同一時段）
  const designerBooked = data.reservations.find(r => 
    r.designerId === Number(designerId) && r.date === date && r.time === time && r.status !== 'cancelled'
  );
  if (designerBooked) return res.status(400).json({ error: '該設計師此時段已被預約' });
  
  // 椅子數量限制
  const reservedCount = data.reservations.filter(r => r.date === date && r.time === time && r.status !== 'cancelled').length;
  if (reservedCount >= worktime.slotConfig[week][slotIdx].seats) return res.status(400).json({ error: '該時段椅子已滿' });
  
  const newId = data.reservations.length ? Math.max(...data.reservations.map(r => r.id)) + 1 : 1;
  const newReservation = {
    id: newId,
    designerId: Number(designerId),
    serviceId: Number(serviceId),
    userId: Number(userId),
    date,
    time,
    status: 'booked',
    createdAt: new Date().toISOString()
  };
  data.reservations.push(newReservation);
  saveData(data);
  res.json(newReservation);
});

// 查詢預約（支援多種篩選）
app.get('/api/reservations', (req, res) => {
  const data = getData();
  let result = data.reservations;
  
  // 按日期篩選
  if (req.query.date) {
    result = result.filter(r => r.date === req.query.date);
  }
  
  // 按設計師篩選
  if (req.query.designerId) {
    result = result.filter(r => r.designerId === Number(req.query.designerId));
  }
  
  // 按狀態篩選
  if (req.query.status) {
    result = result.filter(r => r.status === req.query.status);
  }
  
  // 按用戶篩選
  if (req.query.userId) {
    result = result.filter(r => r.userId === Number(req.query.userId));
  }
  
  // 按時間範圍篩選
  if (req.query.startDate && req.query.endDate) {
    result = result.filter(r => r.date >= req.query.startDate && r.date <= req.query.endDate);
  }
  
  // 排序（預設按日期時間排序）
  result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  
  res.json(result);
});

// 查詢我的預約（需要登入）
app.get('/api/my-reservations', auth, (req, res) => {
  const data = getData();
  const userId = req.user.id;
  const result = data.reservations
    .filter(r => r.userId === userId)
    .map(r => {
      const designer = data.designers.find(d => d.id === r.designerId);
      const service = data.services.find(s => s.id === r.serviceId);
      return {
        ...r,
        designerName: designer?.name || '未知設計師',
        serviceName: service?.name || '未知服務',
        servicePrice: service?.price || 0
      };
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  res.json(result);
});

// 修改預約
app.patch('/api/reservations/:id', auth, (req, res) => {
  const data = getData();
  const reservationId = Number(req.params.id);
  const reservation = data.reservations.find(r => r.id === reservationId);
  
  if (!reservation) return res.status(404).json({ error: '找不到預約' });
  
  // 檢查權限（只能修改自己的預約）
  if (reservation.userId !== req.user.id) {
    return res.status(403).json({ error: '無權限修改此預約' });
  }
  
  // 只能修改未完成的預約
  if (reservation.status === 'completed' || reservation.status === 'cancelled') {
    return res.status(400).json({ error: '無法修改已完成的預約' });
  }
  
  const { designerId, serviceId, date, time } = req.body;
  
  // 如果要修改日期或時間，需要檢查衝突
  if ((date && date !== reservation.date) || (time && time !== reservation.time)) {
    const newDate = date || reservation.date;
    const newTime = time || reservation.time;
    
    // 檢查是否已有預約（同一客戶同一時段）
    const existingReservation = data.reservations.find(r => 
      r.id !== reservationId && r.userId === reservation.userId && 
      r.date === newDate && r.time === newTime && r.status !== 'cancelled'
    );
    if (existingReservation) return res.status(400).json({ error: '您已在此時段有預約' });
    
    // 檢查設計師是否已被預約（同一設計師同一時段）
    const newDesignerId = designerId || reservation.designerId;
    const designerBooked = data.reservations.find(r => 
      r.id !== reservationId && r.designerId === Number(newDesignerId) && 
      r.date === newDate && r.time === newTime && r.status !== 'cancelled'
    );
    if (designerBooked) return res.status(400).json({ error: '該設計師此時段已被預約' });
  }
  
  // 更新預約資料
  if (designerId !== undefined) reservation.designerId = Number(designerId);
  if (serviceId !== undefined) reservation.serviceId = Number(serviceId);
  if (date !== undefined) reservation.date = date;
  if (time !== undefined) reservation.time = time;
  
  reservation.updatedAt = new Date().toISOString();
  
  saveData(data);
  res.json(reservation);
});

// 取消預約
app.patch('/api/reservations/:id/cancel', auth, (req, res) => {
  const data = getData();
  const reservationId = Number(req.params.id);
  const reservation = data.reservations.find(r => r.id === reservationId);
  
  if (!reservation) return res.status(404).json({ error: '找不到預約' });
  
  // 檢查權限（只能取消自己的預約）
  if (reservation.userId !== req.user.id) {
    return res.status(403).json({ error: '無權限取消此預約' });
  }
  
  // 只能取消未完成的預約
  if (reservation.status === 'completed') {
    return res.status(400).json({ error: '無法取消已完成的預約' });
  }
  
  reservation.status = 'cancelled';
  reservation.cancelledAt = new Date().toISOString();
  
  saveData(data);
  res.json(reservation);
});

// 完成預約（管理員功能）
app.patch('/api/reservations/:id/complete', (req, res) => {
  const data = getData();
  const reservationId = Number(req.params.id);
  const reservation = data.reservations.find(r => r.id === reservationId);
  
  if (!reservation) return res.status(404).json({ error: '找不到預約' });
  
  if (reservation.status === 'cancelled') {
    return res.status(400).json({ error: '無法完成已取消的預約' });
  }
  
  reservation.status = 'completed';
  reservation.completedAt = new Date().toISOString();
  
  saveData(data);
  res.json(reservation);
});

// 查詢可預約時段
app.get('/api/available-slots', (req, res) => {
  const data = getData();
  const { date, designerId } = req.query;
  
  if (!date) return res.status(400).json({ error: '請指定日期' });
  
  const worktime = data.worktime || {};
  const dt = new Date(date);
  const week = dt.getDay();
  
  if (!worktime.openDays?.[week]) {
    return res.json([]); // 非營業日
  }
  
  const slots = worktime.slotConfig?.[week] || [];
  const availableSlots = [];
  
  slots.forEach(slot => {
    if (!slot.enabled) return;
    
    // 檢查該時段是否還有空位
    const reservedCount = data.reservations.filter(r => 
      r.date === date && r.time === slot.time && r.status !== 'cancelled'
    ).length;
    
    if (reservedCount < slot.seats) {
      const slotInfo = {
        time: slot.time,
        availableSeats: slot.seats - reservedCount,
        totalSeats: slot.seats,
        services: slot.services.map((enabled, index) => ({
          id: index + 1,
          name: data.services[index]?.name || `服務${index + 1}`,
          enabled: enabled
        })).filter(service => service.enabled)
      };
      
      // 如果指定設計師，檢查該設計師是否可用
      if (designerId) {
        const designer = data.designers.find(d => d.id === Number(designerId));
        if (designer && !designer.isPaused) {
          const designerBooked = data.reservations.find(r => 
            r.designerId === Number(designerId) && r.date === date && 
            r.time === slot.time && r.status !== 'cancelled'
          );
          if (!designerBooked) {
            availableSlots.push(slotInfo);
          }
        }
      } else {
        availableSlots.push(slotInfo);
      }
    }
  });
  
  res.json(availableSlots);
});

// 查詢會員資料
app.get('/api/profile', auth, (req, res) => {
  const data = getData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '找不到會員' });
  res.json({ id: user.id, email: user.email, name: user.name });
});

// 修改會員資料
app.post('/api/profile', auth, (req, res) => {
  const data = getData();
  const user = data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: '找不到會員' });
  
  const { name, password } = req.body;
  if (name) user.name = name;
  if (password) user.password = password;
  
  saveData(data);
  res.json({ id: user.id, email: user.email, name: user.name });
});

// 新增會員註冊
app.post('/api/register', (req, res) => {
  const data = getData();
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: '缺少欄位' });
  if (data.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email 已被註冊' });
  }
  const newId = data.users.length ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
  const newUser = { id: newId, email, password, name };
  data.users.push(newUser);
  saveData(data);
  // 自動登入
  const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
});

// 登入
app.post('/api/login', (req, res) => {
  const data = getData();
  const { email, phone, password } = req.body;
  
  // 支援使用 email 或 phone 登入
  let user;
  if (phone) {
    user = data.users.find(u => u.phone === phone && u.password === password);
  } else if (email) {
    user = data.users.find(u => u.email === email && u.password === password);
  }
  
  if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' });
  
  const token = jwt.sign({ 
    id: user.id, 
    email: user.email, 
    phone: user.phone,
    role: user.role 
  }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      phone: user.phone,
      name: user.name,
      role: user.role 
    } 
  });
});

// JWT 驗證中介層
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未登入' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'JWT 驗證失敗' });
  }
}

// 查詢會員資料
app.get('/api/users/:id', auth, (req, res) => {
  const data = getData();
  const user = data.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: '找不到會員' });
  res.json({ id: user.id, email: user.email, name: user.name });
});

// 修改會員資料
app.patch('/api/users/:id', auth, (req, res) => {
  const data = getData();
  const user = data.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: '找不到會員' });
  const { name, password } = req.body;
  if (name) user.name = name;
  if (password) user.password = password;
  saveData(data);
  res.json({ id: user.id, email: user.email, name: user.name });
});

// 叫號（將第一位 waiting 狀態改為 called）
app.post('/api/queue/call', (req, res) => {
  const data = getData();
  const first = data.queue.find(q => q.status === 'waiting');
  if (first) {
    first.status = 'called';
    saveData(data);
    return res.json(first);
  }
  res.status(404).json({ error: '無等待中號碼' });
});

// 完成（將指定設計師第一位 called 狀態改為 done，並自動叫下一位）
app.post('/api/queue/done', (req, res) => {
  const data = getData();
  const { designerId } = req.body;
  const first = data.queue.find(q => q.designerId === designerId && q.status === 'called');
  if (first) {
    first.status = 'done';
    // 自動叫下一位
    const next = data.queue.find(q => q.designerId === designerId && q.status === 'waiting');
    if (next) next.status = 'called';
    saveData(data);
    return res.json(first);
  }
  res.status(404).json({ error: '無已叫號號碼' });
});

// 標記未到（absent，並自動叫下一位）
app.post('/api/queue/absent', (req, res) => {
  const data = getData();
  const { designerId } = req.body;
  // 找到該設計師第一個叫號或等待中的 queue
  const first = data.queue.find(q => q.designerId === designerId && (q.status === 'called' || q.status === 'waiting'));
  if (first) {
    first.status = 'absent';
    // 自動叫下一位
    const next = data.queue.find(q => q.designerId === designerId && q.status === 'waiting');
    if (next) next.status = 'called';
    saveData(data);
    return res.json(first);
  }
  res.status(404).json({ error: '無可標記未到的號碼' });
});

// 新增設計師
app.post('/api/designers', (req, res) => {
  const data = getData();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '請輸入設計師名稱' });
  const newId = data.designers.length ? Math.max(...data.designers.map(d => d.id)) + 1 : 1;
  const newDesigner = { id: newId, name };
  data.designers.push(newDesigner);
  saveData(data);
  res.json(newDesigner);
});

// 刪除設計師
app.delete('/api/designers/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const index = data.designers.findIndex(d => d.id === id);
  if (index === -1) return res.status(404).json({ error: '找不到設計師' });
  data.designers.splice(index, 1);
  if (!saveData(data)) return res.status(500).json({ error: '寫入檔案失敗' });
  res.json({ success: true });
});

// 新增服務項目
app.post('/api/services', (req, res) => {
  const data = getData();
  const { name, price } = req.body;
  if (!name) return res.status(400).json({ error: '請輸入服務名稱' });
  const newId = data.services.length ? Math.max(...data.services.map(s => s.id)) + 1 : 1;
  const newService = { id: newId, name, price: typeof price === 'number' ? price : 0 };
  data.services.push(newService);
  saveData(data);
  res.json(newService);
});

// 刪除服務項目
app.delete('/api/services/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const index = data.services.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: '找不到服務項目' });
  data.services.splice(index, 1);
  if (!saveData(data)) return res.status(500).json({ error: '寫入檔案失敗' });
  res.json({ success: true });
});

// 設定設計師休假狀態
app.patch('/api/designers/:id/resting', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const { isResting } = req.body;
  const designer = data.designers.find(d => d.id === id);
  if (!designer) return res.status(404).json({ error: '找不到設計師' });
  designer.isResting = !!isResting;
  saveData(data);
  res.json({ success: true, isResting: designer.isResting });
});

// 新增設計師暫停狀態 API
app.patch('/api/designers/:id/pause', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const { isPaused } = req.body;
  const designer = data.designers.find(d => d.id === id);
  if (!designer) return res.status(404).json({ error: '找不到設計師' });
  designer.isPaused = !!isPaused;
  saveData(data);
  res.json({ success: true, isPaused: designer.isPaused });
});

// 修改 queue 的設計師
app.patch('/api/queue/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const { designerId } = req.body;
  const queueItem = data.queue.find(q => q.id === id);
  if (!queueItem) return res.status(404).json({ error: '找不到該號碼' });
  queueItem.designerId = designerId;
  saveData(data);
  res.json(queueItem);
});

app.get('/api/queue/user/:userId', (req, res) => {
  const data = getData();
  const userId = Number(req.params.userId);
  // 僅回傳近三個月該 userId 的 queue
  const result = data.queue.filter(q => q.userId === userId && isWithin3Months(q.createdAt));
  res.json(result);
});

// 讀取 worktime 設定
app.get('/api/worktime', (req, res) => {
  const data = getData();
  res.json(data.worktime || {});
});

// 儲存 worktime 設定
app.post('/api/worktime', (req, res) => {
  const data = getData();
  data.worktime = req.body;
  saveData(data);
  res.json({ success: true });
});

// 營業額統計
app.get('/api/reports/revenue', (req, res) => {
  const data = getData();
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '請指定日期範圍' });
  }
  
  // 篩選時間範圍內的預約
  const reservations = data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate && r.status === 'completed'
  );
  
  const revenueData = {};
  
  reservations.forEach(reservation => {
    const service = data.services.find(s => s.id === reservation.serviceId);
    const amount = service?.price || 0;
    
    let key;
    switch (groupBy) {
      case 'day':
        key = reservation.date;
        break;
      case 'week':
        const date = new Date(reservation.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = reservation.date.substring(0, 7); // YYYY-MM
        break;
      default:
        key = reservation.date;
    }
    
    if (!revenueData[key]) {
      revenueData[key] = {
        date: key,
        revenue: 0,
        count: 0,
        services: {}
      };
    }
    
    revenueData[key].revenue += amount;
    revenueData[key].count += 1;
    
    const serviceName = service?.name || '未知服務';
    if (!revenueData[key].services[serviceName]) {
      revenueData[key].services[serviceName] = { count: 0, revenue: 0 };
    }
    revenueData[key].services[serviceName].count += 1;
    revenueData[key].services[serviceName].revenue += amount;
  });
  
  const result = Object.values(revenueData).sort((a, b) => a.date.localeCompare(b.date));
  
  res.json({
    summary: {
      totalRevenue: result.reduce((sum, item) => sum + item.revenue, 0),
      totalCount: result.reduce((sum, item) => sum + item.count, 0),
      averageRevenue: result.length > 0 ? result.reduce((sum, item) => sum + item.revenue, 0) / result.length : 0
    },
    data: result
  });
});

// 客戶流量分析
app.get('/api/reports/traffic', (req, res) => {
  const data = getData();
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '請指定日期範圍' });
  }
  
  // 篩選時間範圍內的預約和排隊
  const reservations = data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate
  );
  
  const queueData = data.queue.filter(q => {
    const queueDate = q.createdAt.split('T')[0];
    return queueDate >= startDate && queueDate <= endDate;
  });
  
  const trafficData = {};
  
  // 處理預約數據
  reservations.forEach(reservation => {
    let key;
    switch (groupBy) {
      case 'day':
        key = reservation.date;
        break;
      case 'week':
        const date = new Date(reservation.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = reservation.date.substring(0, 7);
        break;
      default:
        key = reservation.date;
    }
    
    if (!trafficData[key]) {
      trafficData[key] = {
        date: key,
        reservations: { total: 0, completed: 0, cancelled: 0 },
        queue: { total: 0, completed: 0, absent: 0 },
        uniqueCustomers: new Set()
      };
    }
    
    trafficData[key].reservations.total += 1;
    if (reservation.status === 'completed') {
      trafficData[key].reservations.completed += 1;
    } else if (reservation.status === 'cancelled') {
      trafficData[key].reservations.cancelled += 1;
    }
    
    trafficData[key].uniqueCustomers.add(reservation.userId);
  });
  
  // 處理排隊數據
  queueData.forEach(queue => {
    const queueDate = queue.createdAt.split('T')[0];
    let key;
    switch (groupBy) {
      case 'day':
        key = queueDate;
        break;
      case 'week':
        const date = new Date(queueDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = queueDate.substring(0, 7);
        break;
      default:
        key = queueDate;
    }
    
    if (!trafficData[key]) {
      trafficData[key] = {
        date: key,
        reservations: { total: 0, completed: 0, cancelled: 0 },
        queue: { total: 0, completed: 0, absent: 0 },
        uniqueCustomers: new Set()
      };
    }
    
    trafficData[key].queue.total += 1;
    if (queue.status === 'done') {
      trafficData[key].queue.completed += 1;
    } else if (queue.status === 'absent') {
      trafficData[key].queue.absent += 1;
    }
    
    if (queue.userId) {
      trafficData[key].uniqueCustomers.add(queue.userId);
    }
  });
  
  // 轉換 Set 為數量
  const result = Object.values(trafficData).map(item => ({
    ...item,
    uniqueCustomers: item.uniqueCustomers.size
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  res.json({
    summary: {
      totalReservations: result.reduce((sum, item) => sum + item.reservations.total, 0),
      totalQueue: result.reduce((sum, item) => sum + item.queue.total, 0),
      totalCustomers: result.reduce((sum, item) => sum + item.uniqueCustomers, 0),
      avgReservationsPerDay: result.length > 0 ? result.reduce((sum, item) => sum + item.reservations.total, 0) / result.length : 0,
      avgQueuePerDay: result.length > 0 ? result.reduce((sum, item) => sum + item.queue.total, 0) / result.length : 0
    },
    data: result
  });
});

// 設計師績效報表
app.get('/api/reports/designer-performance', (req, res) => {
  const data = getData();
  const { startDate, endDate, designerId } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '請指定日期範圍' });
  }
  
  // 篩選時間範圍內的預約
  const reservations = data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate
  );
  
  // 篩選時間範圍內的排隊
  const queueData = data.queue.filter(q => {
    const queueDate = q.createdAt.split('T')[0];
    return queueDate >= startDate && queueDate <= endDate;
  });
  
  const designerStats = {};
  
  // 初始化所有設計師的統計資料
  data.designers.forEach(designer => {
    if (designerId && designer.id !== Number(designerId)) return;
    
    designerStats[designer.id] = {
      designerId: designer.id,
      designerName: designer.name,
      reservations: {
        total: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0
      },
      queue: {
        total: 0,
        completed: 0,
        absent: 0
      },
      services: {},
      dailyStats: {}
    };
  });
  
  // 統計預約數據
  reservations.forEach(reservation => {
    if (designerId && reservation.designerId !== Number(designerId)) return;
    
    const stats = designerStats[reservation.designerId];
    if (!stats) return;
    
    const service = data.services.find(s => s.id === reservation.serviceId);
    const amount = service?.price || 0;
    
    stats.reservations.total += 1;
    if (reservation.status === 'completed') {
      stats.reservations.completed += 1;
      stats.reservations.revenue += amount;
    } else if (reservation.status === 'cancelled') {
      stats.reservations.cancelled += 1;
    }
    
    // 服務統計
    const serviceName = service?.name || '未知服務';
    if (!stats.services[serviceName]) {
      stats.services[serviceName] = { count: 0, revenue: 0 };
    }
    if (reservation.status === 'completed') {
      stats.services[serviceName].count += 1;
      stats.services[serviceName].revenue += amount;
    }
    
    // 每日統計
    if (!stats.dailyStats[reservation.date]) {
      stats.dailyStats[reservation.date] = { reservations: 0, revenue: 0 };
    }
    stats.dailyStats[reservation.date].reservations += 1;
    if (reservation.status === 'completed') {
      stats.dailyStats[reservation.date].revenue += amount;
    }
  });
  
  // 統計排隊數據
  queueData.forEach(queue => {
    if (designerId && queue.designerId !== Number(designerId)) return;
    
    const stats = designerStats[queue.designerId];
    if (!stats) return;
    
    stats.queue.total += 1;
    if (queue.status === 'done') {
      stats.queue.completed += 1;
    } else if (queue.status === 'absent') {
      stats.queue.absent += 1;
    }
  });
  
  // 轉換為陣列並計算績效指標
  const result = Object.values(designerStats).map(stats => {
    const completionRate = stats.reservations.total > 0 ? 
      (stats.reservations.completed / stats.reservations.total * 100).toFixed(1) : 0;
    
    const avgRevenue = stats.reservations.completed > 0 ? 
      (stats.reservations.revenue / stats.reservations.completed).toFixed(0) : 0;
    
    const queueCompletionRate = stats.queue.total > 0 ? 
      (stats.queue.completed / stats.queue.total * 100).toFixed(1) : 0;
    
    return {
      ...stats,
      performance: {
        completionRate: parseFloat(completionRate),
        avgRevenue: parseFloat(avgRevenue),
        queueCompletionRate: parseFloat(queueCompletionRate),
        totalWorkload: stats.reservations.total + stats.queue.total
      }
    };
  });
  
  res.json({
    summary: {
      totalDesigners: result.length,
      totalRevenue: result.reduce((sum, item) => sum + item.reservations.revenue, 0),
      totalReservations: result.reduce((sum, item) => sum + item.reservations.total, 0),
      avgCompletionRate: result.length > 0 ? 
        result.reduce((sum, item) => sum + item.performance.completionRate, 0) / result.length : 0
    },
    data: result
  });
});

// 熱門時段分析
app.get('/api/reports/popular-times', (req, res) => {
  const data = getData();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '請指定日期範圍' });
  }
  
  // 篩選時間範圍內的預約
  const reservations = data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate && r.status === 'completed'
  );
  
  const timeStats = {};
  
  reservations.forEach(reservation => {
    if (!timeStats[reservation.time]) {
      timeStats[reservation.time] = {
        time: reservation.time,
        count: 0,
        revenue: 0,
        services: {}
      };
    }
    
    const service = data.services.find(s => s.id === reservation.serviceId);
    const amount = service?.price || 0;
    
    timeStats[reservation.time].count += 1;
    timeStats[reservation.time].revenue += amount;
    
    const serviceName = service?.name || '未知服務';
    if (!timeStats[reservation.time].services[serviceName]) {
      timeStats[reservation.time].services[serviceName] = { count: 0, revenue: 0 };
    }
    timeStats[reservation.time].services[serviceName].count += 1;
    timeStats[reservation.time].services[serviceName].revenue += amount;
  });
  
  const result = Object.values(timeStats)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map(item => ({
      ...item,
      avgRevenue: item.count > 0 ? (item.revenue / item.count).toFixed(0) : 0
    }));
  
  res.json({
    summary: {
      totalBookings: result.reduce((sum, item) => sum + item.count, 0),
      totalRevenue: result.reduce((sum, item) => sum + item.revenue, 0),
      mostPopularTime: result.length > 0 ? 
        result.reduce((max, item) => item.count > max.count ? item : max) : null
    },
    data: result
  });
});

// 熱門服務分析
app.get('/api/reports/popular-services', (req, res) => {
  const data = getData();
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '請指定日期範圍' });
  }
  
  // 篩選時間範圍內的預約
  const reservations = data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate && r.status === 'completed'
  );
  
  const serviceStats = {};
  
  reservations.forEach(reservation => {
    const service = data.services.find(s => s.id === reservation.serviceId);
    if (!service) return;
    
    if (!serviceStats[service.id]) {
      serviceStats[service.id] = {
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        count: 0,
        revenue: 0,
        designers: {}
      };
    }
    
    serviceStats[service.id].count += 1;
    serviceStats[service.id].revenue += service.price;
    
    const designer = data.designers.find(d => d.id === reservation.designerId);
    const designerName = designer?.name || '未知設計師';
    if (!serviceStats[service.id].designers[designerName]) {
      serviceStats[service.id].designers[designerName] = 0;
    }
    serviceStats[service.id].designers[designerName] += 1;
  });
  
  const result = Object.values(serviceStats)
    .sort((a, b) => b.count - a.count)
    .map(item => ({
      ...item,
      avgRevenue: item.count > 0 ? (item.revenue / item.count).toFixed(0) : 0
    }));
  
  res.json({
    summary: {
      totalServices: result.length,
      totalBookings: result.reduce((sum, item) => sum + item.count, 0),
      totalRevenue: result.reduce((sum, item) => sum + item.revenue, 0),
      mostPopularService: result.length > 0 ? result[0] : null
    },
    data: result
  });
});

// ==================== 通知系統 ====================

// 發送通知
app.post('/api/notifications/send', (req, res) => {
  const data = getData();
  const { type, title, message, targetUsers, targetDesigners } = req.body;
  
  if (!type || !title || !message) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  
  const newId = data.notifications ? Math.max(...data.notifications.map(n => n.id)) + 1 : 1;
  const notification = {
    id: newId,
    type, // 'system', 'reservation', 'queue', 'reminder'
    title,
    message,
    targetUsers: targetUsers || [],
    targetDesigners: targetDesigners || [],
    createdAt: new Date().toISOString(),
    status: 'sent'
  };
  
  if (!data.notifications) data.notifications = [];
  data.notifications.push(notification);
  saveData(data);
  
  res.json(notification);
});

// 查詢通知
app.get('/api/notifications', (req, res) => {
  const data = getData();
  const { userId, designerId, type, status } = req.query;
  
  let notifications = data.notifications || [];
  
  if (userId) {
    notifications = notifications.filter(n => 
      n.targetUsers.includes(Number(userId)) || n.targetUsers.length === 0
    );
  }
  
  if (designerId) {
    notifications = notifications.filter(n => 
      n.targetDesigners.includes(Number(designerId)) || n.targetDesigners.length === 0
    );
  }
  
  if (type) {
    notifications = notifications.filter(n => n.type === type);
  }
  
  if (status) {
    notifications = notifications.filter(n => n.status === status);
  }
  
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(notifications);
});

// 標記通知為已讀
app.patch('/api/notifications/:id/read', auth, (req, res) => {
  const data = getData();
  const notificationId = Number(req.params.id);
  const notification = data.notifications?.find(n => n.id === notificationId);
  
  if (!notification) {
    return res.status(404).json({ error: '找不到通知' });
  }
  
  notification.readBy = notification.readBy || [];
  if (!notification.readBy.includes(req.user.id)) {
    notification.readBy.push(req.user.id);
  }
  
  saveData(data);
  res.json(notification);
});

// 預約提醒（自動觸發）
app.post('/api/notifications/reservation-reminder', (req, res) => {
  const data = getData();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const tomorrowReservations = data.reservations.filter(r => 
    r.date === tomorrowStr && r.status === 'booked'
  );
  
  const notifications = [];
  
  tomorrowReservations.forEach(reservation => {
    const user = data.users.find(u => u.id === reservation.userId);
    const designer = data.designers.find(d => d.id === reservation.designerId);
    const service = data.services.find(s => s.id === reservation.serviceId);
    
    if (user) {
      const notification = {
        id: Date.now() + Math.random(),
        type: 'reminder',
        title: '預約提醒',
        message: `您明天 ${reservation.time} 有預約 ${service?.name || '服務'}，設計師：${designer?.name || '未指定'}`,
        targetUsers: [reservation.userId],
        targetDesigners: [reservation.designerId],
        createdAt: new Date().toISOString(),
        status: 'sent'
      };
      
      if (!data.notifications) data.notifications = [];
      data.notifications.push(notification);
      notifications.push(notification);
    }
  });
  
  saveData(data);
  res.json({ sent: notifications.length });
});

// ==================== 客戶管理系統 ====================

// 客戶資料查詢
app.get('/api/customers', (req, res) => {
  const data = getData();
  const { search, level, startDate, endDate } = req.query;
  
  let customers = data.users.map(user => {
    // 計算客戶統計資料
    const reservations = data.reservations.filter(r => r.userId === user.id);
    const completedReservations = reservations.filter(r => r.status === 'completed');
    const totalSpent = completedReservations.reduce((sum, r) => {
      const service = data.services.find(s => s.id === r.serviceId);
      return sum + (service?.price || 0);
    }, 0);
    
    // 計算客戶等級
    let level = '一般客戶';
    if (totalSpent >= 10000) level = 'VIP客戶';
    else if (totalSpent >= 5000) level = '黃金客戶';
    else if (totalSpent >= 2000) level = '白銀客戶';
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      level,
      totalReservations: reservations.length,
      completedReservations: completedReservations.length,
      totalSpent,
      lastVisit: completedReservations.length > 0 ? 
        completedReservations[completedReservations.length - 1].date : null,
      createdAt: user.createdAt || new Date().toISOString()
    };
  });
  
  // 篩選
  if (search) {
    customers = customers.filter(c => 
      c.name.includes(search) || c.email.includes(search)
    );
  }
  
  if (level) {
    customers = customers.filter(c => c.level === level);
  }
  
  if (startDate && endDate) {
    customers = customers.filter(c => 
      c.lastVisit && c.lastVisit >= startDate && c.lastVisit <= endDate
    );
  }
  
  customers.sort((a, b) => b.totalSpent - a.totalSpent);
  
  res.json(customers);
});

// 客戶詳細資料
app.get('/api/customers/:id', (req, res) => {
  const data = getData();
  const customerId = Number(req.params.id);
  const user = data.users.find(u => u.id === customerId);
  
  if (!user) {
    return res.status(404).json({ error: '找不到客戶' });
  }
  
  const reservations = data.reservations.filter(r => r.userId === customerId);
  const completedReservations = reservations.filter(r => r.status === 'completed');
  const cancelledReservations = reservations.filter(r => r.status === 'cancelled');
  
  const customerData = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    birthday: user.birthday || '',
    preferences: user.preferences || {},
    totalReservations: reservations.length,
    completedReservations: completedReservations.length,
    cancelledReservations: cancelledReservations.length,
    totalSpent: completedReservations.reduce((sum, r) => {
      const service = data.services.find(s => s.id === r.serviceId);
      return sum + (service?.price || 0);
    }, 0),
    favoriteServices: getFavoriteServices(completedReservations, data.services),
    favoriteDesigners: getFavoriteDesigners(completedReservations, data.designers),
    reservationHistory: reservations.map(r => ({
      ...r,
      serviceName: data.services.find(s => s.id === r.serviceId)?.name,
      designerName: data.designers.find(d => d.id === r.designerId)?.name
    })).sort((a, b) => b.date.localeCompare(a.date))
  };
  
  res.json(customerData);
});

// 更新客戶資料
app.patch('/api/customers/:id', auth, (req, res) => {
  const data = getData();
  const customerId = Number(req.params.id);
  const user = data.users.find(u => u.id === customerId);
  
  if (!user) {
    return res.status(404).json({ error: '找不到客戶' });
  }
  
  const { name, phone, address, birthday, preferences } = req.body;
  
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = address;
  if (birthday) user.birthday = birthday;
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  
  saveData(data);
  res.json(user);
});

// 客戶生日提醒
app.get('/api/customers/birthday-reminders', (req, res) => {
  const data = getData();
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  const birthdayCustomers = data.users.filter(user => {
    if (!user.birthday) return false;
    const [birthMonth, birthDay] = user.birthday.split('-').map(Number);
    return birthMonth === month && birthDay === day;
  });
  
  res.json(birthdayCustomers);
});

// ==================== 財務管理系統 ====================

// 收入記錄
app.post('/api/finance/income', (req, res) => {
  const data = getData();
  const { amount, type, description, reservationId, designerId } = req.body;
  
  if (!amount || !type) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  
  const newId = data.finance?.income ? Math.max(...data.finance.income.map(i => i.id)) + 1 : 1;
  const income = {
    id: newId,
    amount: Number(amount),
    type, // 'reservation', 'service', 'other'
    description: description || '',
    reservationId: reservationId ? Number(reservationId) : null,
    designerId: designerId ? Number(designerId) : null,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  if (!data.finance) data.finance = {};
  if (!data.finance.income) data.finance.income = [];
  data.finance.income.push(income);
  
  saveData(data);
  res.json(income);
});

// 支出記錄
app.post('/api/finance/expense', (req, res) => {
  const data = getData();
  const { amount, category, description, supplier } = req.body;
  
  if (!amount || !category) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  
  const newId = data.finance?.expense ? Math.max(...data.finance.expense.map(e => e.id)) + 1 : 1;
  const expense = {
    id: newId,
    amount: Number(amount),
    category, // 'supplies', 'rent', 'utilities', 'salary', 'other'
    description: description || '',
    supplier: supplier || '',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  
  if (!data.finance) data.finance = {};
  if (!data.finance.expense) data.finance.expense = [];
  data.finance.expense.push(expense);
  
  saveData(data);
  res.json(expense);
});

// 財務報表
app.get('/api/finance/report', (req, res) => {
  const data = getData();
  const { startDate, endDate } = req.query;
  
  const income = data.finance?.income || [];
  const expense = data.finance?.expense || [];
  
  let filteredIncome = income;
  let filteredExpense = expense;
  
  if (startDate && endDate) {
    filteredIncome = income.filter(i => i.date >= startDate && i.date <= endDate);
    filteredExpense = expense.filter(e => e.date >= startDate && e.date <= endDate);
  }
  
  const totalIncome = filteredIncome.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = filteredExpense.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpense;
  
  // 按類別統計
  const incomeByType = {};
  const expenseByCategory = {};
  
  filteredIncome.forEach(i => {
    incomeByType[i.type] = (incomeByType[i.type] || 0) + i.amount;
  });
  
  filteredExpense.forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });
  
  res.json({
    summary: {
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin: totalIncome > 0 ? (netProfit / totalIncome * 100).toFixed(2) : 0
    },
    incomeByType,
    expenseByCategory,
    income: filteredIncome,
    expense: filteredExpense
  });
});

// 設計師抽成計算
app.get('/api/finance/designer-commission', (req, res) => {
  const data = getData();
  const { startDate, endDate, designerId } = req.query;
  
  let reservations = data.reservations.filter(r => 
    r.status === 'completed' && r.date >= startDate && r.date <= endDate
  );
  
  if (designerId) {
    reservations = reservations.filter(r => r.designerId === Number(designerId));
  }
  
  const commissionData = {};
  
  reservations.forEach(reservation => {
    const service = data.services.find(s => s.id === reservation.serviceId);
    const designer = data.designers.find(d => d.id === reservation.designerId);
    
    if (!service || !designer) return;
    
    const commissionRate = designer.commissionRate || 0.3; // 預設30%
    const commission = service.price * commissionRate;
    
    if (!commissionData[designer.id]) {
      commissionData[designer.id] = {
        designerId: designer.id,
        designerName: designer.name,
        totalRevenue: 0,
        totalCommission: 0,
        reservationCount: 0
      };
    }
    
    commissionData[designer.id].totalRevenue += service.price;
    commissionData[designer.id].totalCommission += commission;
    commissionData[designer.id].reservationCount += 1;
  });
  
  const result = Object.values(commissionData);
  
  res.json({
    summary: {
      totalRevenue: result.reduce((sum, d) => sum + d.totalRevenue, 0),
      totalCommission: result.reduce((sum, d) => sum + d.totalCommission, 0),
      totalReservations: result.reduce((sum, d) => sum + d.reservationCount, 0)
    },
    data: result
  });
});

// ==================== 設計師管理系統 ====================

// 設計師詳細資料
app.get('/api/designers/:id/profile', (req, res) => {
  const data = getData();
  const designerId = Number(req.params.id);
  const designer = data.designers.find(d => d.id === designerId);
  
  if (!designer) {
    return res.status(404).json({ error: '找不到設計師' });
  }
  
  // 計算設計師統計資料
  const reservations = data.reservations.filter(r => r.designerId === designerId);
  const completedReservations = reservations.filter(r => r.status === 'completed');
  const queueData = data.queue.filter(q => q.designerId === designerId);
  
  const designerProfile = {
    ...designer,
    totalReservations: reservations.length,
    completedReservations: completedReservations.length,
    totalRevenue: completedReservations.reduce((sum, r) => {
      const service = data.services.find(s => s.id === r.serviceId);
      return sum + (service?.price || 0);
    }, 0),
    averageRating: designer.ratings ? 
      (designer.ratings.reduce((sum, r) => sum + r.rating, 0) / designer.ratings.length).toFixed(1) : 0,
    totalRatings: designer.ratings ? designer.ratings.length : 0,
    currentQueue: queueData.filter(q => q.status === 'waiting' || q.status === 'called').length,
    schedule: designer.schedule || {},
    skills: designer.skills || [],
    experience: designer.experience || '',
    education: designer.education || '',
    certifications: designer.certifications || []
  };
  
  res.json(designerProfile);
});

// 更新設計師資料
app.patch('/api/designers/:id/profile', (req, res) => {
  const data = getData();
  const designerId = Number(req.params.id);
  const designer = data.designers.find(d => d.id === designerId);
  
  if (!designer) {
    return res.status(404).json({ error: '找不到設計師' });
  }
  
  const { 
    name, phone, email, experience, education, skills, 
    certifications, schedule, commissionRate, bio 
  } = req.body;
  
  if (name) designer.name = name;
  if (phone) designer.phone = phone;
  if (email) designer.email = email;
  if (experience) designer.experience = experience;
  if (education) designer.education = education;
  if (skills) designer.skills = skills;
  if (certifications) designer.certifications = certifications;
  if (schedule) designer.schedule = schedule;
  if (commissionRate !== undefined) designer.commissionRate = Number(commissionRate);
  if (bio) designer.bio = bio;
  
  saveData(data);
  res.json(designer);
});

// 設計師排班管理
app.post('/api/designers/:id/schedule', (req, res) => {
  const data = getData();
  const designerId = Number(req.params.id);
  const designer = data.designers.find(d => d.id === designerId);
  
  if (!designer) {
    return res.status(404).json({ error: '找不到設計師' });
  }
  
  const { date, startTime, endTime, status } = req.body;
  
  if (!date || !startTime || !endTime || !status) {
    return res.status(400).json({ error: '缺少必要欄位' });
  }
  
  if (!designer.schedule) designer.schedule = {};
  if (!designer.schedule[date]) designer.schedule[date] = [];
  
  const scheduleEntry = {
    id: Date.now(),
    startTime,
    endTime,
    status, // 'working', 'break', 'off'
    createdAt: new Date().toISOString()
  };
  
  designer.schedule[date].push(scheduleEntry);
  
  saveData(data);
  res.json(scheduleEntry);
});

// 設計師評價
app.post('/api/designers/:id/rating', auth, (req, res) => {
  const data = getData();
  const designerId = Number(req.params.id);
  const designer = data.designers.find(d => d.id === designerId);
  
  if (!designer) {
    return res.status(404).json({ error: '找不到設計師' });
  }
  
  const { rating, comment, reservationId } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '評分必須在1-5之間' });
  }
  
  if (!designer.ratings) designer.ratings = [];
  
  const newRating = {
    id: Date.now(),
    userId: req.user.id,
    rating: Number(rating),
    comment: comment || '',
    reservationId: reservationId ? Number(reservationId) : null,
    createdAt: new Date().toISOString()
  };
  
  designer.ratings.push(newRating);
  
  saveData(data);
  res.json(newRating);
});

// 設計師評價查詢
app.get('/api/designers/:id/ratings', (req, res) => {
  const data = getData();
  const designerId = Number(req.params.id);
  const designer = data.designers.find(d => d.id === designerId);
  
  if (!designer) {
    return res.status(404).json({ error: '找不到設計師' });
  }
  
  const ratings = (designer.ratings || []).map(rating => {
    const user = data.users.find(u => u.id === rating.userId);
    return {
      ...rating,
      userName: user?.name || '匿名用戶'
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(ratings);
});

// 輔助函數
function getFavoriteServices(reservations, services) {
  const serviceCount = {};
  reservations.forEach(r => {
    const service = services.find(s => s.id === r.serviceId);
    if (service) {
      serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
    }
  });
  
  return Object.entries(serviceCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
}

function getFavoriteDesigners(reservations, designers) {
  const designerCount = {};
  reservations.forEach(r => {
    const designer = designers.find(d => d.id === r.designerId);
    if (designer) {
      designerCount[designer.name] = (designerCount[designer.name] || 0) + 1;
    }
  });
  
  return Object.entries(designerCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));
}

// === LINE 登入 callback API ===
const axios = require('axios');

app.get('/api/line/callback', async (req, res) => {
  const { code } = req.query;
  const client_id = '2007657170';
  const client_secret = '59ce418bc196c809a6f0064ebc895062';
  const redirect_uri = 'https://eva-36bg.onrender.com/api/line/callback';

  if (!code) {
    console.error('❌ 缺少授權碼');
    return res.status(400).json({ error: '缺少授權碼' });
  }

  try {
    console.log('✅ 開始與 LINE 交換 access token');

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);
    params.append('client_id', client_id);
    params.append('client_secret', client_secret);

    const tokenRes = await axios.post('https://api.line.me/oauth2/v2.1/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const access_token = tokenRes.data.access_token;
    console.log('✅ 成功取得 access token');

    // 取得用戶資料
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userProfile = profileRes.data;
    console.log('✅ 使用者資料：', userProfile);

    // 可導向到前端或顯示歡迎畫面
    return res.send(`<h2>歡迎回來，${userProfile.displayName}</h2>`);

  } catch (err) {
    console.error('❌ 處理錯誤：', err.response?.data || err.message);
    return res.status(500).send('LINE 登入流程失敗');
  }
});

    
    // 檢查用戶是否已存在
    const data = getData();
    let user = data.users.find(u => u.lineId === lineProfile.userId);
    
    if (!user) {
      // 建立新用戶
      const newUserId = data.users.length ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
      user = {
        id: newUserId,
        name: lineProfile.displayName,
        email: lineProfile.email || '',
        phone: '',
        lineId: lineProfile.userId,
        linePicture: lineProfile.pictureUrl,
        createdAt: new Date().toISOString(),
        role: 'customer'
      };
      data.users.push(user);
      saveData(data);
      console.log('建立新用戶:', user.id);
    } else {
      console.log('找到現有用戶:', user.id);
    }

    // 生成 JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 檢查 state 參數，判斷是否需要重定向到 queue
    let redirectUrl = `https://gino6667.github.io/eva/login?token=${token}&success=true`;
    if (req.query.state === 'eva_login_queue') {
      redirectUrl = `https://gino6667.github.io/eva/login?token=${token}&success=true&redirect=queue`;
    } else if (req.query.state === 'eva_login_reservation') {
      redirectUrl = `https://gino6667.github.io/eva/login?token=${token}&success=true&redirect=reservation`;
    }

    console.log('重定向到:', redirectUrl);
    // 重導向到前端並帶上 token
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('LINE 登入錯誤:', err.response?.data || err.message);
    res.redirect(`https://gino6667.github.io/eva/login?error=line_login_failed`);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 排隊進度查詢 API
app.get('/api/queue/progress', (req, res) => {
  try {
    const data = getData();
    const { number, date } = req.query;
    
    if (!number) {
      return res.status(400).json({ error: '請提供號碼' });
    }
    
    // 如果沒有指定日期，使用今天
    const queryDate = date || new Date().toISOString().split('T')[0];
    const [year, month, day] = queryDate.split('-').map(Number);
    
    // 篩選指定日期的排隊資料
    const dayQueue = data.queue.filter(q => isSameDay(q.createdAt, year, month, day));
    
    // 找到指定號碼的排隊記錄
    const targetQueue = dayQueue.find(q => q.number === Number(number));
    
    if (!targetQueue) {
      return res.status(404).json({ 
        error: '找不到該號碼的排隊記錄',
        message: '請確認號碼是否正確，或該號碼可能已完成服務'
      });
    }
    
    // 計算該號碼在當天所有 waiting 狀態中的位置
    const waitingQueue = dayQueue.filter(q => q.status === 'waiting');
    const position = waitingQueue.findIndex(q => q.number === Number(number)) + 1;
    
    // 獲取相關資訊
    const designer = data.designers.find(d => d.id === targetQueue.designerId);
    const service = data.services.find(s => s.id === targetQueue.serviceId);
    
    // 計算預估等待時間（假設每個服務平均 30 分鐘）
    const estimatedWaitTime = position * 30; // 分鐘
    
    // 獲取當前正在服務的號碼
    const currentServing = dayQueue.filter(q => q.status === 'called');
    
    const result = {
      queueInfo: {
        id: targetQueue.id,
        number: targetQueue.number,
        status: targetQueue.status,
        type: targetQueue.type,
        createdAt: targetQueue.createdAt
      },
      designer: designer ? {
        id: designer.id,
        name: designer.name,
        isPaused: designer.isPaused || false
      } : null,
      service: service ? {
        id: service.id,
        name: service.name,
        price: service.price
      } : null,
      progress: {
        position: position,
        totalWaiting: waitingQueue.length,
        estimatedWaitMinutes: estimatedWaitTime,
        status: targetQueue.status
      },
      currentServing: currentServing.map(q => ({
        number: q.number,
        designerId: q.designerId,
        designerName: data.designers.find(d => d.id === q.designerId)?.name || '未知設計師'
      })),
      date: queryDate
    };
    
    res.json(result);
  } catch (err) {
    console.error('查詢排隊進度時發生錯誤:', err);
    res.status(500).json({ error: '查詢失敗，請稍後再試' });
  }
});

// 查詢今日排隊統計
app.get('/api/queue/today-stats', (req, res) => {
  try {
    const data = getData();
    const today = new Date();
    const [year, month, day] = [today.getFullYear(), today.getMonth() + 1, today.getDate()];
    
    // 篩選今日的排隊資料
    const todayQueue = data.queue.filter(q => isSameDay(q.createdAt, year, month, day));
    
    // 按狀態統計
    const stats = {
      total: todayQueue.length,
      waiting: todayQueue.filter(q => q.status === 'waiting').length,
      called: todayQueue.filter(q => q.status === 'called').length,
      done: todayQueue.filter(q => q.status === 'done').length,
      absent: todayQueue.filter(q => q.status === 'absent').length
    };
    
    // 按設計師統計
    const designerStats = {};
    data.designers.forEach(designer => {
      const designerQueue = todayQueue.filter(q => q.designerId === designer.id);
      designerStats[designer.id] = {
        name: designer.name,
        total: designerQueue.length,
        waiting: designerQueue.filter(q => q.status === 'waiting').length,
        called: designerQueue.filter(q => q.status === 'called').length,
        done: designerQueue.filter(q => q.status === 'done').length,
        isPaused: designer.isPaused || false
      };
    });
    
    // 當前正在服務的號碼
    const currentServing = todayQueue
      .filter(q => q.status === 'called')
      .map(q => ({
        number: q.number,
        designerId: q.designerId,
        designerName: data.designers.find(d => d.id === q.designerId)?.name || '未知設計師',
        serviceName: data.services.find(s => s.id === q.serviceId)?.name || '未知服務'
      }));
    
    res.json({
      date: today.toISOString().split('T')[0],
      stats,
      designerStats,
      currentServing
    });
  } catch (err) {
    console.error('查詢今日統計時發生錯誤:', err);
    res.status(500).json({ error: '查詢失敗，請稍後再試' });
  }
});

// 設計師調整客人 API
app.post('/api/queue/transfer', (req, res) => {
  const data = getData();
  const { queueId, fromDesignerId, toDesignerId, reason } = req.body;
  
  // 驗證參數
  if (!queueId || !fromDesignerId || !toDesignerId) {
    return res.status(400).json({ error: '缺少必要參數' });
  }
  
  if (fromDesignerId === toDesignerId) {
    return res.status(400).json({ error: '無法調整給同一位設計師' });
  }
  
  // 查找排隊項目
  const queueItem = data.queue.find(q => q.id === Number(queueId));
  if (!queueItem) {
    return res.status(404).json({ error: '找不到該排隊項目' });
  }
  
  // 驗證設計師是否存在
  const fromDesigner = data.designers.find(d => d.id === Number(fromDesignerId));
  const toDesigner = data.designers.find(d => d.id === Number(toDesignerId));
  
  if (!fromDesigner || !toDesigner) {
    return res.status(404).json({ error: '找不到指定的設計師' });
  }
  
  // 檢查目標設計師是否暫停接客
  if (toDesigner.isPaused) {
    return res.status(400).json({ error: '目標設計師目前暫停接客' });
  }
  
  // 記錄調整歷史
  if (!data.queueTransfers) {
    data.queueTransfers = [];
  }
  
  const transferRecord = {
    id: data.queueTransfers.length + 1,
    queueId: Number(queueId),
    fromDesignerId: Number(fromDesignerId),
    toDesignerId: Number(toDesignerId),
    reason: reason || '設計師調整',
    transferredAt: new Date().toISOString(),
    status: 'transferred'
  };
  
  data.queueTransfers.push(transferRecord);
  
  // 更新排隊項目
  queueItem.designerId = Number(toDesignerId);
  queueItem.transferredAt = new Date().toISOString();
  queueItem.transferReason = reason || '設計師調整';
  
  saveData(data);
  
  res.json({
    success: true,
    message: '客人調整成功',
    queueItem,
    transferRecord
  });
});

// 獲取調整歷史
app.get('/api/queue/transfers', (req, res) => {
  const data = getData();
  const transfers = data.queueTransfers || [];
  
  // 如果有日期篩選
  if (req.query.date) {
    const [y, m, d] = req.query.date.split('-').map(Number);
    const filteredTransfers = transfers.filter(t => {
      const transferDate = new Date(t.transferredAt);
      return transferDate.getFullYear() === y && 
             transferDate.getMonth() + 1 === m && 
             transferDate.getDate() === d;
    });
    return res.json(filteredTransfers);
  }
  
  res.json(transfers);
});

// 獲取設計師的排隊狀況
app.get('/api/queue/designer/:designerId', (req, res) => {
  const data = getData();
  const designerId = Number(req.params.designerId);
  
  // 獲取今日該設計師的排隊項目
  const todayQueue = data.queue.filter(q => 
    q.designerId === designerId && 
    isToday(q.createdAt) &&
    (q.status === 'waiting' || q.status === 'called')
  );
  
  // 按狀態分組
  const waiting = todayQueue.filter(q => q.status === 'waiting');
  const called = todayQueue.filter(q => q.status === 'called');
  
  res.json({
    designerId,
    waiting: waiting.length,
    called: called.length,
    total: todayQueue.length,
    queueItems: todayQueue
  });
});