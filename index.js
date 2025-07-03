const express = require('express');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
app.use(express.json());

// 簡化的 CORS 處理
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://gino6667.github.io'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const DATA_PATH = path.join(__dirname, 'data.json');
const git = simpleGit();
const JWT_SECRET = 'your_jwt_secret_key'; // 請改成安全的 key

async function setupGitConfig() {
  await git.addConfig('user.name', 'render-bot');
  await git.addConfig('user.email', 'render-bot@render.com');
}
setupGitConfig();

function getData() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  // 自動將跨日未服務完的 queue 標記為 absent
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  if (Array.isArray(data.queue)) {
    data.queue.forEach(q => {
      if (
        q.status !== 'done' &&
        q.status !== 'absent' &&
        !q.createdAt.startsWith(today)
      ) {
        q.status = 'absent';
        changed = true;
      }
    });
    if (changed) saveData(data);
  }
  return data;
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
    // 用台灣時區比對 createdAt 日期（正確寫法）
    result = result.filter(q => {
      const twDateStr = new Date(q.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
      return twDateStr === req.query.date;
    });
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
app.post('/api/queue', async (req, res) => {
  try {
    // 資料驗證
    if (typeof req.body.designerId !== 'number' || typeof req.body.serviceId !== 'number') {
      return res.status(400).json({ success: false, error: 'designerId/serviceId 必須為數字' });
    }
    const data = getData();
    let { designerId, serviceId, userId, type } = req.body;
    // 第一次遇到 0 時自動分配設計師
    if (designerId === 0 || designerId === '0') {
      // 只分配有提供該服務的設計師
      let designers = data.designers.filter(d => !d.isPaused && d.services && d.services.includes(Number(serviceId)));
      if (designers.length > 0) {
        const busyDesignerIds = data.queue.filter(q => q.status === 'waiting' || q.status === 'called').map(q => q.designerId);
        const freeDesigners = designers.filter(d => !busyDesignerIds.includes(d.id));
        let assignList = freeDesigners.length > 0 ? freeDesigners : designers.sort((a, b) => a.id - b.id);
        designerId = assignList[0].id;
      } else {
        return res.status(400).json({ error: '目前沒有可提供此服務的設計師' });
      }
    }
    if (Number(designerId) === 0 || Number(serviceId) === 0) {
      return res.status(400).json({ error: 'designerId 和 serviceId 必填且有效' });
    }
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
    // 只保留驗證區塊
    const designer = data.designers.find(d => d.id === Number(designerId));
    if (!designer) {
      return res.status(400).json({ error: '找不到設計師' });
    }
    if (designer.isPaused) {
      return res.status(400).json({ error: '該設計師今日暫停接客' });
    }
    if (!designer.services || !designer.services.includes(Number(serviceId))) {
      return res.status(400).json({ error: '該設計師未提供此服務' });
    }
    const todayQueue = data.queue.filter(q => isToday(q.createdAt));
    const newId = data.queue.length ? Math.max(...data.queue.map(q => q.id)) + 1 : 1;
    const newNumber = todayQueue.length ? Math.max(...todayQueue.map(q => q.number)) + 1 : 1;
    const todayStr = new Date().toISOString().slice(0, 10);
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
    // 防呆：如果 createdAt 不是今天，強制改為現在
    if (!newQueue.createdAt || typeof newQueue.createdAt !== 'string' || newQueue.createdAt.slice(0, 10) !== todayStr) {
      newQueue.createdAt = new Date().toISOString();
    }
    data.queue.push(newQueue);
    saveData(data);
    res.json({ success: true, data: newQueue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  try {
    console.log('收到註冊請求:', req.body);
    const data = getData();
    const { email, password, name, phone } = req.body;
    if (!password || !name) return res.status(400).json({ error: '缺少必要欄位' });
    if (email && data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email 已被註冊' });
    }
    if (phone && data.users.find(u => u.phone === phone)) {
      return res.status(400).json({ error: '手機號碼已被註冊' });
    }
    const newId = data.users.length ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const newUser = { 
      id: newId, 
      email, 
      phone,
      password, 
      name,
      role: 'customer'
    };
    data.users.push(newUser);
    console.log('準備寫入 data.json...');
    saveData(data);
    console.log('寫入成功');
    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 登入
app.post('/api/login', (req, res) => {
  console.log('login req.body:', req.body);
  const data = getData();
  const { email, phone, name, password } = req.body;
  let user;
  if (email) {
    user = data.users.find(u => u.email === email && u.password === password);
  }
  if (!user && phone) {
    user = data.users.find(u => u.phone === phone && u.password === password);
  }
  if (!user && name) {
    user = data.users.find(u => u.name === name && u.password === password);
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
  // 將 req.body 的所有欄位都更新到 user
  Object.assign(user, req.body);
  saveData(data);
  res.json(user);
});

// 刪除用戶
app.delete('/api/users/:id', auth, (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const index = data.users.findIndex(u => u.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: '找不到用戶' });
  }
  
  const user = data.users[index];
  
  // 防止刪除自己
  if (user.id === req.user.id) {
    return res.status(400).json({ error: '不能刪除自己的帳號' });
  }
  
  // 防止刪除最後一個管理員
  if (user.role === 'admin') {
    const adminCount = data.users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: '不能刪除最後一個管理員' });
    }
  }
  
  data.users.splice(index, 1);
  saveData(data);
  res.json({ success: true, message: '刪除用戶成功' });
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

// 完成（將指定設計師第一位 called 狀態改為 done，不自動叫下一位）
app.post('/api/queue/done', (req, res) => {
  const data = getData();
  const { designerId } = req.body;
  const first = data.queue.find(q => q.designerId === designerId && q.status === 'called');
  if (first) {
    first.status = 'done';
    // 不自動叫下一位
    saveData(data);
    return res.json(first);
  }
  res.status(404).json({ error: '無已叫號號碼' });
});

// 標記未到（absent，不自動叫下一位）
app.post('/api/queue/absent', (req, res) => {
  const data = getData();
  const { designerId } = req.body;
  // 找到該設計師第一個叫號或等待中的 queue
  const first = data.queue.find(q => q.designerId === designerId && (q.status === 'called' || q.status === 'waiting'));
  if (first) {
    first.status = 'absent';
    // 不自動叫下一位
    saveData(data);
    return res.json(first);
  }
  res.status(404).json({ error: '無可標記未到的號碼' });
});

// 新增設計師
app.post('/api/designers', (req, res) => {
  const data = getData();
  const { name, services } = req.body;
  if (!name) return res.status(400).json({ error: '請輸入設計師名稱' });
  const newId = data.designers.length ? Math.max(...data.designers.map(d => d.id)) + 1 : 1;
  const newDesigner = { 
    id: newId, 
    name,
    services: services || [1, 2, 3] // 預設提供所有服務
  };
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
  const { name, price, duration } = req.body;
  if (!name) return res.status(400).json({ error: '請輸入服務名稱' });
  const newId = data.services.length ? Math.max(...data.services.map(s => s.id)) + 1 : 1;
  const newService = { 
    id: newId, 
    name, 
    price: typeof price === 'number' ? price : 0,
    duration: typeof duration === 'number' ? duration : 60 // 預設 60 分鐘
  };
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
  // 新增：同步移除所有設計師的 services 陣列該 id
  data.designers.forEach(designer => {
    if (Array.isArray(designer.services)) {
      designer.services = designer.services.filter(sid => sid !== id);
    }
  });
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
  const { isPaused, isOnVacation } = req.body;
  const designer = data.designers.find(d => d.id === id);
  if (!designer) return res.status(404).json({ error: '找不到設計師' });
  if (isPaused !== undefined) designer.isPaused = !!isPaused;
  if (isOnVacation !== undefined) designer.isOnVacation = !!isOnVacation;
  saveData(data);
  res.json({ success: true, isPaused: designer.isPaused, isOnVacation: designer.isOnVacation });
});

// 修改 queue 的設計師
app.patch('/api/queue/:id', (req, res) => {
  const { serviceId } = req.body;
  if (serviceId === undefined || serviceId === 0) {
    return res.status(400).json({ error: 'serviceId 必填且有效' });
  }
  const data = getData();
  const id = Number(req.params.id);
  const queueItem = data.queue.find(q => q.id === id);
  if (!queueItem) return res.status(404).json({ error: '找不到該號碼' });
  queueItem.designerId = Number(req.body.designerId);
  saveData(data);
  res.json(queueItem);
});

// 取消現場排隊
app.patch('/api/queue/:id/cancel', auth, (req, res) => {
  const data = getData();
  const queueId = Number(req.params.id);
  const queueItem = data.queue.find(q => q.id === queueId);
  
  if (!queueItem) {
    return res.status(404).json({ error: '找不到該排隊項目' });
  }
  
  // 檢查權限（只能取消自己的排隊）
  if (queueItem.userId !== req.user.id) {
    return res.status(403).json({ error: '無權限取消此排隊' });
  }
  
  // 只能取消等待中的排隊
  if (queueItem.status !== 'waiting') {
    return res.status(400).json({ error: '只能取消等待中的排隊' });
  }
  
  queueItem.status = 'cancelled';
  queueItem.cancelledAt = new Date().toISOString();
  
  saveData(data);
  res.json(queueItem);
});

app.get('/api/queue/user/:userId', (req, res) => {
  const data = getData();
  const userId = Number(req.params.userId);
  const { date } = req.query;
  console.log('收到 date 參數:', date);
  let result = data.queue.filter(q => q.userId === userId && isWithin3Months(q.createdAt));
  if (date) {
    result = result.filter(q => q.createdAt.slice(0, 10) === date);
  }
  console.log('回傳 queue 筆數:', result.length);
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
  const reservations = data.reservations ? data.reservations.filter(r => 
    r.date >= startDate && r.date <= endDate && r.status === 'completed'
  ) : [];

  // 新增：篩選 queue 內已完成的服務
  const queueDone = (data.queue || []).filter(q => {
    const queueDate = q.createdAt ? q.createdAt.split('T')[0] : '';
    return queueDate >= startDate && queueDate <= endDate && q.status === 'done';
  }).map(q => ({
    designerId: q.designerId,
    serviceId: q.serviceId,
    date: q.createdAt ? q.createdAt.split('T')[0] : '',
    status: 'completed'
  }));

  // 合併 reservations + queueDone
  const allCompleted = [...reservations, ...queueDone];

  const revenueData = {};

  allCompleted.forEach(reservation => {
    const service = data.services.find(s => s.id === reservation.serviceId);
    const amount = service?.price || 0;
    let key;
    switch (groupBy) {
      case 'day':
        key = reservation.date;
        break;
      case 'week': {
        const date = new Date(reservation.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
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
        services: {},
        designerStats: {
          specified: { count: 0, revenue: 0 },
          unspecified: { count: 0, revenue: 0 }
        }
      };
    }
    revenueData[key].revenue += amount;
    revenueData[key].count += 1;
    // 統計指定設計師 vs 未指定設計師
    if (reservation.designerId) {
      revenueData[key].designerStats.specified.count += 1;
      revenueData[key].designerStats.specified.revenue += amount;
    } else {
      revenueData[key].designerStats.unspecified.count += 1;
      revenueData[key].designerStats.unspecified.revenue += amount;
    }
    const serviceName = service?.name || '未知服務';
    if (!revenueData[key].services[serviceName]) {
      revenueData[key].services[serviceName] = { count: 0, revenue: 0 };
    }
    revenueData[key].services[serviceName].count += 1;
    revenueData[key].services[serviceName].revenue += amount;
  });

  const result = Object.values(revenueData).sort((a, b) => a.date.localeCompare(b.date));

  // 計算總計統計
  const totalSpecified = result.reduce((sum, item) => sum + item.designerStats.specified.count, 0);
  const totalUnspecified = result.reduce((sum, item) => sum + item.designerStats.unspecified.count, 0);
  const totalSpecifiedRevenue = result.reduce((sum, item) => sum + item.designerStats.specified.revenue, 0);
  const totalUnspecifiedRevenue = result.reduce((sum, item) => sum + item.designerStats.unspecified.revenue, 0);

  // 統計每位被指定設計師的預約數與營業額
  const designerMap = {};
  allCompleted.forEach(reservation => {
    if (reservation.designerId) {
      const designer = data.designers.find(d => d.id === Number(reservation.designerId));
      const designerName = designer ? designer.name : `ID:${reservation.designerId}`;
      if (!designerMap[reservation.designerId]) {
        designerMap[reservation.designerId] = {
          designerId: reservation.designerId,
          designerName,
          count: 0,
          revenue: 0
        };
      }
      const service = data.services.find(s => s.id === reservation.serviceId);
      const amount = service?.price || 0;
      designerMap[reservation.designerId].count += 1;
      designerMap[reservation.designerId].revenue += amount;
    }
  });
  
  res.json({
    summary: {
      totalRevenue: result.reduce((sum, item) => sum + item.revenue, 0),
      totalCount: result.reduce((sum, item) => sum + item.count, 0),
      averageRevenue: result.length > 0 ? result.reduce((sum, item) => sum + item.revenue, 0) / result.length : 0,
      designerStats: {
        specified: {
          count: totalSpecified,
          revenue: totalSpecifiedRevenue,
          percentage: result.reduce((sum, item) => sum + item.count, 0) > 0 ? 
            Math.round((totalSpecified / result.reduce((sum, item) => sum + item.count, 0)) * 100) : 0
        },
        unspecified: {
          count: totalUnspecified,
          revenue: totalUnspecifiedRevenue,
          percentage: result.reduce((sum, item) => sum + item.count, 0) > 0 ? 
            Math.round((totalUnspecified / result.reduce((sum, item) => sum + item.count, 0)) * 100) : 0
        },
        list: Object.values(designerMap)
      }
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
  // 新增：用於計算區間唯一 user
  const uniqueUserSet = new Set();
  let totalServiceCount = 0;
  
  // 處理預約數據
  reservations.forEach(reservation => {
    let key;
    switch (groupBy) {
      case 'day':
        key = reservation.date;
        break;
      case 'week': {
        const date = new Date(reservation.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
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
      totalServiceCount += 1; // 完成服務次數
    } else if (reservation.status === 'cancelled') {
      trafficData[key].reservations.cancelled += 1;
    }
    
    trafficData[key].uniqueCustomers.add(reservation.userId);
    uniqueUserSet.add(reservation.userId); // 新增：區間唯一 user
  });
  
  // 處理排隊數據
  queueData.forEach(queue => {
    const queueDate = queue.createdAt.split('T')[0];
    let key;
    switch (groupBy) {
      case 'day':
        key = queueDate;
        break;
      case 'week': {
        const date = new Date(queueDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
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
      totalServiceCount += 1; // 完成服務次數
    } else if (queue.status === 'absent') {
      trafficData[key].queue.absent += 1;
    }
    
    if (queue.userId) {
      trafficData[key].uniqueCustomers.add(queue.userId);
      uniqueUserSet.add(queue.userId); // 新增：區間唯一 user
    }
  });
  
  // 轉換 Set 為數量
  const result = Object.values(trafficData).map(item => ({
    ...item,
    uniqueCustomers: item.uniqueCustomers.size
  })).sort((a, b) => a.date.localeCompare(b.date));
  
  // 新增：產品銷售統計
  const transactions = data.transactions || [];
  const productTransactions = transactions.filter(t => t.category === 'product');
  const totalProductAmount = productTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalProductCount = productTransactions.length;
  // 新增：設計師數
  const designerCount = data.designers ? data.designers.length : 0;

  res.json({
    summary: {
      totalReservations: result.reduce((sum, item) => sum + item.reservations.total, 0),
      totalQueue: result.reduce((sum, item) => sum + item.queue.total, 0),
      uniqueCustomers: uniqueUserSet.size, // 修正：區間唯一 user 數
      totalServiceCount, // 新增：完成服務總次數
      avgReservationsPerDay: result.length > 0 ? result.reduce((sum, item) => sum + item.reservations.total, 0) / result.length : 0,
      avgQueuePerDay: result.length > 0 ? result.reduce((sum, item) => sum + item.queue.total, 0) / result.length : 0,
      // 新增 summary 欄位
      designerCount,
      totalProductAmount,
      totalProductCount
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
    certifications, schedule, commissionRate, bio, services 
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
  if (services !== undefined) designer.services = services;
  
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

    const lineProfile = profileRes.data;
    console.log('✅ 使用者資料：', lineProfile);

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

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
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
    
    // 當前正在服務的號碼 + 過號名單
    const currentServing = todayQueue
      .filter(q => ['called', 'serving', 'absent'].includes(q.status))
      .map(q => ({
        id: q.id, // 加入 queueId
        number: q.number,
        designerId: q.designerId,
        designerName: data.designers.find(d => d.id === q.designerId)?.name || '未知設計師',
        serviceId: q.serviceId, // 新增這一行
        serviceName: data.services.find(s => s.id === q.serviceId)?.name || '未知服務',
        status: q.status // 新增 status 方便前端判斷
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

// 獲取下一位客人資訊
app.get('/api/queue/next-in-queue', (req, res) => {
  const data = getData();
  const today = new Date().toISOString().slice(0, 10);
  const todayQueue = data.queue.filter(q => q.createdAt.slice(0, 10) === today);

  // 依設計師分組
  const result = data.designers
    .filter(designer => designer.name !== '不指定')
    .map(designer => {
      // 取得該設計師所有 waiting 狀態的 queue
      const designerQueue = todayQueue.filter(q => q.designerId === designer.id && q.status === 'waiting');
      if (designerQueue.length === 0) return null;

      // 分成正常 waiting 與過號回來 waiting
      const normalWaiting = designerQueue.filter(q => !q.absentAt || (q.absentAt && !q.checkinAt));
      const returnedAbsent = designerQueue.filter(q => q.absentAt && q.checkinAt);
      // 依號碼排序
      normalWaiting.sort((a, b) => a.number - b.number);
      // 過號回來依報到時間排序
      returnedAbsent.sort((a, b) => new Date(a.checkinAt) - new Date(b.checkinAt));

      // 間隔插入
      const merged = [];
      let i = 0, j = 0;
      while (i < normalWaiting.length || j < returnedAbsent.length) {
        if (i < normalWaiting.length) {
          merged.push(normalWaiting[i]);
          i++;
        }
        if (j < returnedAbsent.length) {
          merged.push(returnedAbsent[j]);
          j++;
        }
      }
      // 取第一位作為 next-in-queue
      const next = merged[0];
      if (!next) return null;
      return {
        id: next.id, // 加入 id
        designerId: designer.id,
        designerName: designer.name,
        number: next.number,
        serviceId: next.serviceId,
        serviceName: data.services.find(s => s.id === Number(next.serviceId))?.name || '未知服務',
        createdAt: next.createdAt
      };
    })
    .filter(item => item !== null);

  
  res.json(result);
});

// 查詢我的現場排隊紀錄（需要登入）
app.get('/api/my-queue', auth, (req, res) => {
  const data = getData();
  const userId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const result = (data.queue || [])
    .filter(q => q.userId === userId && q.createdAt.slice(0, 10) === today)
    .map(q => ({
      ...q,
      designerName: data.designers.find(d => d.id === q.designerId)?.name || '未知設計師',
      serviceName: data.services.find(s => s.id === q.serviceId)?.name || '未知服務'
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(result);
});

// 會員取消自己的現場排隊
app.patch('/api/queue/:id/cancel', auth, (req, res) => {
  const data = getData();
  const queueId = Number(req.params.id);
  const queueItem = (data.queue || []).find(q => q.id === queueId);
  if (!queueItem) return res.status(404).json({ error: '找不到該號碼' });
  if (queueItem.userId !== req.user.id) return res.status(403).json({ error: '無權限取消此號碼' });
  if (queueItem.status !== 'waiting') return res.status(400).json({ error: '僅可取消等待中的號碼' });
  queueItem.status = 'cancelled';
  queueItem.cancelledAt = new Date().toISOString();
  saveData(data);
  res.json(queueItem);
});

// 報到 API
app.post('/api/queue/checkin', (req, res) => {
  const data = getData();
  const { designerId, number } = req.body;

  // 找到該設計師的 waiting 狀態、號碼最小的客人
  const queueItem = data.queue.find(q =>
    q.designerId === Number(designerId) &&
    q.number === Number(number) &&
    q.status === 'waiting'
  );

  if (!queueItem) {
    return res.status(404).json({ error: '找不到該客人或已非等待狀態' });
  }

  // 將該客人狀態設為 serving
  queueItem.status = 'serving';
  queueItem.checkinAt = new Date().toISOString();

  saveData(data);

  res.json({ success: true, queueItem });
});

// 編輯服務項目
app.patch('/api/services/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const service = data.services.find(s => s.id === id);
  if (!service) return res.status(404).json({ error: '找不到服務項目' });
  const { name, price, duration, status } = req.body;
  if (name) service.name = name;
  if (price !== undefined) service.price = price;
  if (duration !== undefined) service.duration = duration;
  if (status) service.status = status; // 新增這一行
  saveData(data);
  res.json(service);
});

// ==================== 財務交易資料 API ====================

// 取得所有交易（支援 type、search、分頁）
app.get('/api/transactions', (req, res) => {
  const data = getData();
  res.json(data.transactions || []);
});

// 新增交易
app.post('/api/transactions', (req, res) => {
  const { type, amount, description, category, date, customer, designerId, productId, serviceId } = req.body;
  if (!type || !amount || !category || !date) return res.status(400).json({ success: false, error: '缺少必要欄位' });
  const data = readData();
  if (!data.transactions) data.transactions = [];
  const newTransaction = { id: Date.now(), type, amount, description, category, date, customer, designerId, productId, serviceId };
  data.transactions.push(newTransaction);
  writeData(data);
  res.json({ success: true, data: newTransaction });
});

// 編輯交易
app.patch('/api/transactions/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const transaction = data.transactions.find(t => t.id === id);
  if (!transaction) return res.status(404).json({ error: '找不到交易紀錄' });
  Object.assign(transaction, req.body);
  saveData(data);
  res.json(transaction);
});

// 刪除交易
app.delete('/api/transactions/:id', (req, res) => {
  const data = getData();
  const id = Number(req.params.id);
  const idx = data.transactions.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: '找不到交易紀錄' });
  data.transactions.splice(idx, 1);
  saveData(data);
  res.json({ success: true });
});

// 完成服務 API
app.patch('/api/queue/:id/complete', (req, res) => {
  const data = getData();
  const queueId = Number(req.params.id);
  const { designerId, number } = req.body;
  
  // 找到對應的排隊項目
  const queueItem = data.queue.find(q => q.id === queueId);
  
  if (!queueItem) {
    return res.status(404).json({ error: '找不到該排隊項目' });
  }
  
  // 驗證設計師和號碼是否匹配
  if (queueItem.designerId !== Number(designerId) || queueItem.number !== Number(number)) {
    return res.status(400).json({ error: '設計師或號碼不匹配' });
  }
  
  // 將狀態改為完成
  queueItem.status = 'done';
  queueItem.completedAt = new Date().toISOString();

  // 方案一：自動新增 reservation 並設為 completed
  if (queueItem.userId) {
    const dateObj = new Date(queueItem.createdAt);
    const date = dateObj.toISOString().split('T')[0];
    const time = '09:00'; // 預設時間
    const newId = data.reservations.length ? Math.max(...data.reservations.map(r => r.id)) + 1 : 1;
    const newReservation = {
      id: newId,
      designerId: queueItem.designerId,
      serviceId: queueItem.serviceId,
      userId: queueItem.userId,
      date,
      time,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    data.reservations.push(newReservation);
  }

  saveData(data);
  
  res.json({ 
    success: true, 
    message: '服務完成',
    queueItem 
  });
});

// 過號 API
app.patch('/api/queue/:id/absent', (req, res) => {
  const data = getData();
  const queueId = Number(req.params.id);
  const queueItem = data.queue.find(q => q.id === queueId);
  if (!queueItem) {
    return res.status(404).json({ error: '找不到該排隊項目' });
  }
  queueItem.status = 'absent';
  // 強制寫入台灣今天日期
  const now = new Date();
  const tw = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const todayISOString = tw.toISOString();
  console.log('[DEBUG] absentAt 寫入:', todayISOString);
  queueItem.absentAt = todayISOString;
  queueItem.createdAt = todayISOString;
  saveData(data);
  res.json({ success: true, queueItem });
});

function clearOldQueue(data) {
  const now = new Date();
  data.queue = data.queue.filter(q => {
    const created = new Date(q.createdAt);
    const diffMonth = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    return diffMonth < 12;
  });
}

// 在 getData() 之後自動清理 queue
const originalGetData = getData;
getData = function() {
  const data = originalGetData();
  clearOldQueue(data);
  return data;
};

// 查詢所有交易紀錄
app.get('/api/transactions', (req, res) => {
  const data = getData();
  res.json(data.transactions || []);
});

// 新增一筆交易紀錄
app.post('/api/transactions', (req, res) => {
  try {
    const data = getData();
    const { type, amount, description, category, date, customer } = req.body;
    if (!type || !amount || !description || !date) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    const newTransaction = {
      id: data.transactions && data.transactions.length ? Math.max(...data.transactions.map(t => t.id)) + 1 : 1,
      type,
      amount: parseFloat(amount),
      description,
      category,
      date,
      customer: customer || ''
    };
    if (!data.transactions) data.transactions = [];
    data.transactions.push(newTransaction);
    saveData(data);
    res.json(newTransaction);
  } catch (err) {
    res.status(500).json({ error: '新增交易失敗' });
  }
});

// 路由註冊結束後
require('./swagger')(app);

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// 取得所有產品
app.get('/api/products', (req, res) => {
  const data = readData();
  res.json(data.products || []);
});

// 新增產品
app.post('/api/products', (req, res) => {
  const { name, price, stock } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, error: '缺少必要欄位' });
  const data = readData();
  if (!data.products) data.products = [];
  const newProduct = { id: Date.now(), name, price, stock };
  data.products.push(newProduct);
  writeData(data);
  res.json({ success: true, data: newProduct });
});

// 刪除產品
app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  if (!data.products) data.products = [];
  const idx = data.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: '找不到產品' });
  const deleted = data.products.splice(idx, 1)[0];
  writeData(data);
  res.json({ success: true, data: deleted });
});

// 取得 queue 和 reservations 的最早與最晚日期
app.get('/api/reports/date-range', (req, res) => {
  const data = getData();
  const queueDates = (data.queue || []).map(q => q.createdAt && new Date(q.createdAt)).filter(d => d && !isNaN(d));
  const reservationDates = (data.reservations || []).map(r => r.date && new Date(r.date)).filter(d => d && !isNaN(d));
  const allDates = [...queueDates, ...reservationDates];
  if (allDates.length === 0) {
    return res.json({ minDate: null, maxDate: null });
  }
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  res.json({
    minDate: minDate.toISOString().split('T')[0],
    maxDate: maxDate.toISOString().split('T')[0]
  });
});

// 過號報到（absent checkin）API
app.post('/api/queue/:id/checkin', (req, res) => {
  const data = getData();
  const queueId = Number(req.params.id);
  const queueItem = data.queue.find(q => q.id === queueId);
  if (!queueItem) {
    return res.status(404).json({ error: '找不到該排隊項目' });
  }
  if (queueItem.status !== 'absent') {
    return res.status(400).json({ error: '僅能對過號狀態進行報到' });
  }
  queueItem.status = 'waiting';
  queueItem.checkinAt = new Date().toISOString();
  saveData(data);
  res.json({ success: true, queueItem });
});

console.log('[DEBUG] 目前後端實際讀取的 data.json 路徑:', DATA_PATH);