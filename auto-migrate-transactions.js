// 自動補齊 transactions designerId/serviceId/productId 並檢查
const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, 'data.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const designers = data.designers || [];
const services = data.services || [];
const products = data.products || [];
const transactions = data.transactions || [];

function findDesignerIdByName(name) {
  const d = designers.find(d => d.name === name);
  return d ? d.id : null;
}
function findServiceIdByName(name) {
  const s = services.find(s => s.name === name);
  return s ? s.id : null;
}
function findProductIdByName(name) {
  const p = products.find(p => p.name === name);
  return p ? p.id : null;
}

let updated = 0;
let report = [];

for (const t of transactions) {
  // 補 designerId
  if (!t.designerId) {
    // 從 description 反查設計師
    const match = t.description && t.description.match(/設計師：([^）]+)/);
    if (match) {
      const id = findDesignerIdByName(match[1]);
      if (id) {
        t.designerId = id;
        updated++;
        report.push(`補齊 designerId: ${id} for transaction ${t.id}`);
      }
    }
  }
  // 補 productId
  if (t.category === 'product' && !t.productId) {
    // 從 description 反查產品
    const match = t.description && t.description.match(/產品銷售：([^（]+)/);
    if (match) {
      const id = findProductIdByName(match[1]);
      if (id) {
        t.productId = id;
        updated++;
        report.push(`補齊 productId: ${id} for transaction ${t.id}`);
      }
    }
  }
  // 補 serviceId
  if ((t.category === 'service' || t.category === '服務' || t.category === '服務收入') && !t.serviceId) {
    // 從 description 反查服務
    const match = t.description && t.description.match(/([\u4e00-\u9fa5A-Za-z0-9]+)$/);
    if (match) {
      const id = findServiceIdByName(match[1]);
      if (id) {
        t.serviceId = id;
        updated++;
        report.push(`補齊 serviceId: ${id} for transaction ${t.id}`);
      }
    }
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`已補齊 ${updated} 筆交易資料`);
if (report.length) console.log(report.join('\n'));

// 檢查所有交易資料
let missing = [];
for (const t of transactions) {
  if ((t.category === 'product' && (!t.designerId || !t.productId)) ||
      ((t.category === 'service' || t.category === '服務' || t.category === '服務收入') && (!t.designerId || !t.serviceId))) {
    missing.push(t);
  }
}
if (missing.length) {
  console.log(`\n以下交易仍缺少必要 id：`);
  for (const t of missing) {
    console.log(`id:${t.id} type:${t.type} category:${t.category} description:${t.description}`);
  }
} else {
  console.log('\n所有交易資料已補齊，業績表將正確顯示！');
} 