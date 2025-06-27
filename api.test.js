const axios = require('axios');
const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, 'data.sample.json');

// 測試前重設 queue 狀態
beforeAll(() => {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  data.queue = [
    {
      id: 1,
      designerId: 1,
      serviceId: 1,
      type: 'onsite',
      status: 'waiting',
      number: 1,
      createdAt: new Date().toISOString(),
      userId: null
    }
  ];
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
});

describe('Queue API 測試', () => {
  it('新增 queue', async () => {
    const res = await axios.post('http://localhost:3001/api/queue', {
      designerId: 1,
      serviceId: 1,
      type: 'onsite'
    });
    expect(res.data).toHaveProperty('id');
    expect(res.data.status).toBe('waiting');
  });

  it('結束號碼', async () => {
    // 先將一筆 waiting 狀態改為 called
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const q = data.queue.find(q => q.designerId === 1 && q.status === 'waiting');
    if (q) q.status = 'called';
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    const res = await axios.post('http://localhost:3001/api/queue/done', { designerId: 1 });
    expect(res.data.status).toBe('done');
  });

  it('標記未到', async () => {
    // 先將一筆 waiting 狀態改為 called
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const q = data.queue.find(q => q.designerId === 1 && q.status === 'waiting');
    if (q) q.status = 'called';
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
    const res = await axios.post('http://localhost:3001/api/queue/absent', { designerId: 1 });
    expect(res.data.status).toBe('absent');
  });
}); 