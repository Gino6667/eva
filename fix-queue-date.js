const fs = require('fs');
const path = 'data.json';
const d = JSON.parse(fs.readFileSync(path));
const today = new Date().toISOString().slice(0, 10);
let changed = 0;

d.queue.forEach(q => {
  if (q.createdAt && q.createdAt.slice(0, 10) > today) {
    q.createdAt = today + 'T09:00:00.000Z';
    changed++;
  }
  if (q.absentAt && q.absentAt.slice(0, 10) > today) {
    q.absentAt = today + 'T09:00:00.000Z';
    changed++;
  }
});

if (changed) {
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log('已修正 ' + changed + ' 筆 future date');
} else {
  console.log('無需修正');
} 