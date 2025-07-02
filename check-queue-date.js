const fs = require('fs');
const path = 'data.json';
const d = JSON.parse(fs.readFileSync(path));
const today = new Date().toISOString().slice(0, 10);
let wrong = [];

d.queue.forEach(q => {
  if (q.createdAt && q.createdAt.slice(0, 10) > today) {
    wrong.push({ id: q.id, createdAt: q.createdAt });
  }
  if (q.absentAt && q.absentAt.slice(0, 10) > today) {
    wrong.push({ id: q.id, absentAt: q.absentAt });
  }
});

if (wrong.length) {
  console.log('有未來日期的 queue 項目:');
  console.log(JSON.stringify(wrong, null, 2));
} else {
  console.log('所有 queue 日期都正常');
} 