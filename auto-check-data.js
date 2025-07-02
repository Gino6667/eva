const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

function isValidQueue(q) {
  return q.userId && (q.status === 'done') && q.createdAt && new Date(q.createdAt) > new Date('2023-01-01');
}
function isValidReservation(r) {
  return r.userId && (r.status === 'completed') && r.date && new Date(r.date) > new Date('2023-01-01');
}

const validQueues = (data.queue || []).filter(isValidQueue);
const validReservations = (data.reservations || []).filter(isValidReservation);

console.log('有效 queue 筆數:', validQueues.length);
validQueues.forEach(q => {
  console.log(`queue: userId=${q.userId}, status=${q.status}, createdAt=${q.createdAt}`);
});

console.log('有效 reservation 筆數:', validReservations.length);
validReservations.forEach(r => {
  console.log(`reservation: userId=${r.userId}, status=${r.status}, date=${r.date}`);
});

const allDates = [
  ...validQueues.map(q => q.createdAt),
  ...validReservations.map(r => r.date)
].map(d => new Date(d)).filter(d => !isNaN(d));

if (allDates.length > 0) {
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  console.log('最早日期:', minDate.toISOString().split('T')[0]);
  console.log('最晚日期:', maxDate.toISOString().split('T')[0]);
  console.log('建議查詢區間：', minDate.toISOString().split('T')[0], '~', maxDate.toISOString().split('T')[0]);
} else {
  console.log('找不到有效的 queue 或 reservation 日期');
} 