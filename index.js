const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: ['https://gino6667.github.io', 'https://gino6667.github.io/eva'],
  credentials: true
}));
app.use(express.json());

const DATA_PATH = path.join(__dirname, 'data.sample.json');
const git = simpleGit();
const JWT_SECRET = 'your_jwt_secret_key'; // 請改成安全的 key

function getData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}
function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    pushToGitHub();
    return true;
  } catch (err) {
    console.error('寫入 data.sample.json 失敗:', err);
    return false;
  }
}

async function pushToGitHub() {
  try {
    await git.add('./data.sample.json');
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
  // worktime 驗證
  const worktime = data.worktime || {};
  const dt = date ? new Date(date) : new Date();
  const week = dt.getDay();
  if (!worktime.openDays?.[week]) return res.status(400).json({ error: '非營業日不可預約' });
  const slotIdx = worktime.slotConfig?.[week]?.findIndex(slot => slot.enabled && slot.time === time);
  if (slotIdx === -1) return res.status(400).json({ error: '非開放時段不可預約' });
  if (!worktime.slotConfig[week][slotIdx].services[serviceId-1]) return res.status(400).json({ error: '該服務未開放' });
  // 椅子數量限制
  const reservedCount = data.reservations.filter(r => r.date === date && r.time === time).length;
  if (reservedCount >= worktime.slotConfig[week][slotIdx].seats) return res.status(400).json({ error: '該時段椅子已滿' });
  const newId = data.reservations.length ? Math.max(...data.reservations.map(r => r.id)) + 1 : 1;
  const newReservation = {
    id: newId,
    designerId,
    serviceId,
    userId,
    date,
    time,
    status: 'booked'
  };
  data.reservations.push(newReservation);
  saveData(data);
  res.json(newReservation);
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
  const { email, password } = req.body;
  const user = data.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: '帳號或密碼錯誤' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 