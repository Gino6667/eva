const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));
const services = data.services || [];
const reservations = data.reservations || [];

const valid = reservations.filter(r => r.status === 'completed' && r.serviceId && services.find(s => s.id === r.serviceId));

console.log('有效 completed reservation 筆數:', valid.length);
let total = 0;
const allDates = valid.map(r => new Date(r.date)).filter(d => !isNaN(d));
valid.forEach(r => {
  const service = services.find(s => s.id === r.serviceId);
  const price = service ? service.price : 0;
  total += price;
  console.log(`日期: ${r.date}, 服務: ${service ? service.name : '未知'}, 金額: ${price}`);
});
console.log('總營業額:', total);
if (allDates.length > 0) {
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  console.log('建議查詢區間:', minDate.toISOString().split('T')[0], '~', maxDate.toISOString().split('T')[0]);
} else {
  console.log('找不到有效的 completed reservation 日期');
} 