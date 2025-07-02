const fs = require('fs');
const path = require('path');

// 支援的日期欄位
const dateFields = [
  'date',
  'createdAt',
  'completedAt',
  'absentAt',
  'transferredAt',
];

// 取得今天（台灣時區）
function getToday() {
  const now = new Date();
  // 轉為台灣時區
  const tw = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const yyyy = tw.getFullYear();
  const mm = String(tw.getMonth() + 1).padStart(2, '0');
  const dd = String(tw.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 判斷是否為未來日期
function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const today = new Date(getToday());
  const d = new Date(dateStr);
  return d > today;
}

// 修正日期格式
function fixDate(dateStr, field) {
  const today = getToday();
  if (field === 'date') return today;
  // 其他欄位保留時間格式
  const now = new Date();
  const tw = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  return tw.toISOString();
}

// 遞迴修正物件
function fixObject(obj, filePath, logs, parentKey = '') {
  let changed = false;
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        if (fixObject(item, filePath, logs, parentKey + `[${idx}]`)) changed = true;
      }
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      if (dateFields.includes(key) && typeof obj[key] === 'string' && isFutureDate(obj[key])) {
        const old = obj[key];
        obj[key] = fixDate(obj[key], key);
        logs.push(`修正 ${filePath} ${parentKey ? parentKey + '.' : ''}${key}: ${old} → ${obj[key]}`);
        changed = true;
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (fixObject(obj[key], filePath, logs, parentKey ? parentKey + '.' + key : key)) changed = true;
      }
    }
  }
  return changed;
}

// 遞迴搜尋所有 json 檔案
function findJsonFiles(dir, result = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    // 略過 node_modules 目錄
    if (fullPath.includes('node_modules')) continue;
    if (fs.statSync(fullPath).isDirectory()) {
      findJsonFiles(fullPath, result);
    } else if (file.endsWith('.json')) {
      result.push(fullPath);
    }
  }
  return result;
}

function main() {
  const root = process.cwd();
  const jsonFiles = findJsonFiles(root);
  let totalChanged = 0;
  for (const file of jsonFiles) {
    let raw;
    try {
      raw = fs.readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`無法讀取 ${file}`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // 跳過無法 parse 的 json
      continue;
    }
    const logs = [];
    if (fixObject(data, file, logs)) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
      logs.forEach(log => console.log(log));
      totalChanged++;
    }
  }
  if (totalChanged === 0) {
    console.log('所有 json 檔案日期都正常');
  } else {
    console.log(`共修正 ${totalChanged} 個檔案`);
  }
}

main(); 