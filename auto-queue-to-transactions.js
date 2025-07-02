// queue/reservation 轉交易資料
const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, 'data.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const queues = data.queue || [];
const services = data.services || [];
const transactions = data.transactions || [];

function findServiceNameById(id) {
  const s = services.find(s => s.id == id);
  return s ? s.name : '未知服務';
}
function findServicePriceById(id) {
  const s = services.find(s => s.id == id);
  return s ? s.price : 0;
}

let added = 0;
let report = [];

for (const q of queues) {
  if (q.status === 'done') {
    // 檢查 transactions 是否已存在對應 queue 的交易（用 designerId, serviceId, date 判斷）
    const exist = transactions.find(t =>
      t.designerId == q.designerId &&
      t.serviceId == q.serviceId &&
      t.date === (q.completedAt ? q.completedAt.slice(0,10) : (q.createdAt ? q.createdAt.slice(0,10) : ''))
    );
    if (!exist) {
      const date = q.completedAt ? q.completedAt.slice(0,10) : (q.createdAt ? q.createdAt.slice(0,10) : '');
      const serviceName = findServiceNameById(q.serviceId);
      const price = findServicePriceById(q.serviceId);
      const newTransaction = {
        id: Date.now() + Math.floor(Math.random()*100000),
        type: 'income',
        amount: price,
        description: serviceName,
        category: 'service',
        date,
        designerId: q.designerId,
        serviceId: q.serviceId,
        customer: q.userId || ''
      };
      transactions.push(newTransaction);
      added++;
      report.push(`新增交易：設計師${q.designerId} 服務${q.serviceId} 日期${date}`);
    }
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`已新增 ${added} 筆 queue 轉交易資料`);
if (report.length) console.log(report.join('\n')); 