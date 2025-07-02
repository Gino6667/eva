import { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';

function Profile({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [records, setRecords] = useState([]);
  const [queueRecords, setQueueRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
    loadRecords();
    loadQueueRecords();
  }, [user]);

  useEffect(() => {
    const reload = () => {
      loadRecords();
      loadQueueRecords();
    };
    window.addEventListener('queue-updated', reload);
    return () => window.removeEventListener('queue-updated', reload);
  }, []);

  const loadRecords = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get('/api/my-reservations', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setRecords(res.data);
    } catch (err) {
      console.error('載入預約紀錄失敗:', err);
    }
  };

  const loadQueueRecords = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get('/api/my-queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQueueRecords(res.data);
    } catch (err) {
      setQueueRecords([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const token = localStorage.getItem('token');
    try {
      await axios.post('/api/profile', { name, password }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMsg('修改成功！');
      setUser({ ...user, name });
    } catch (err) {
      setMsg('修改失敗');
    } finally {
      setLoading(false);
    }
  };

  // 統一的取消功能 - 支援預約和現場排隊
  const handleCancel = async (type, id) => {
    const token = localStorage.getItem('token');
    try {
      if (type === 'reservation') {
        await axios.patch(`/api/reservations/${id}/cancel`, {}, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
      } else if (type === 'queue') {
        await axios.patch(`/api/queue/${id}/cancel`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setMsg('取消成功！');
      loadRecords();
      loadQueueRecords();
      window.dispatchEvent(new Event('queue-updated'));
    } catch (err) {
      setMsg('取消失敗');
    }
  };

  // 獲取狀態顯示文字
  const getStatusText = (status, type) => {
    if (type === 'reservation') {
      return status === 'booked' ? '已預約' : 
             status === 'completed' ? '已完成' : 
             status === 'cancelled' ? '已取消' : status;
    } else {
      return status === 'waiting' ? '等待中' : 
             status === 'called' ? '已叫號' : 
             status === 'done' ? '已完成' : 
             status === 'cancelled' ? '已取消' : status;
    }
  };

  // 獲取狀態 CSS 類別
  const getStatusClass = (status) => {
    return `status ${status}`;
  };

  // 檢查是否可以取消
  const canCancel = (item, type) => {
    if (type === 'reservation') {
      return item.status === 'booked';
    } else {
      return item.status === 'waiting';
    }
  };

  // 合併並排序所有服務紀錄
  const getAllRecords = () => {
    const allRecords = [];
    const today = new Date().toISOString().split('T')[0]; // 取得今天的日期 YYYY-MM-DD
    
    // 添加線上抽號紀錄（只顯示今天的）
    records.forEach(r => {
      if (r.date === today) {
        allRecords.push({
          ...r,
          type: 'reservation',
          sortTime: new Date(`${r.date} ${r.time}`).getTime(),
          displayTime: `${r.date} ${r.time}`
        });
      }
    });
    
    // 添加現場排隊紀錄（只顯示今天的）
    queueRecords.forEach(q => {
      const queueDate = new Date(q.createdAt).toISOString().split('T')[0];
      if (queueDate === today) {
        allRecords.push({
          ...q,
          type: 'queue',
          sortTime: new Date(q.createdAt).getTime(),
          displayTime: new Date(q.createdAt).toLocaleString('zh-TW')
        });
      }
    });
    
    // 按時間排序（最新的在前）
    return allRecords.sort((a, b) => b.sortTime - a.sortTime);
  };

  const sortedRecords = getAllRecords();

  if (!user) {
    return (
      <div className="profile-container">
        <div className="auth-card">
          <h2>請先登入</h2>
          <p>您需要登入才能查看會員中心</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5em 0', fontWeight: 700 }}>會員中心</h2>
        <p>管理您的個人資料與服務紀錄</p>
      </div>

      <div className="profile-content" style={{display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap'}}>
        <div className="profile-section" style={{flex: '1 1 320px', minWidth: 320, maxWidth: 400, background: '#38413c', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px #0002'}}>
          <h3 style={{marginBottom: '1.5rem', color: '#f7ab5e'}}>個人資料</h3>
          <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              <label htmlFor="name" style={{fontWeight: 600, color: '#f7ab5e'}}>姓名</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="請輸入姓名"
                style={{padding: '0.75em', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1em'}}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
              style={{padding: '0.9em', fontSize: '1.1em', fontWeight: 600, marginTop: '1em'}}
            >
              {loading ? '儲存中...' : '儲存修改'}
            </button>
            {showPassword ? (
              <div className="form-group" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <label htmlFor="password" style={{fontWeight: 600, color: '#f7ab5e'}}>新密碼</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                  style={{padding: '0.75em', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1.1em'}}
                />
                <button type="button" className="btn btn-secondary" style={{marginTop: '0.5em', alignSelf: 'flex-end'}} onClick={() => { setShowPassword(false); setPassword(''); }}>取消</button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary" style={{marginBottom: '1em', alignSelf: 'flex-start'}} onClick={() => setShowPassword(true)}>修改密碼</button>
            )}
            {msg && (
              <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`} style={{marginTop: '1em', fontWeight: 600, color: msg.includes('成功') ? '#4caf50' : '#f44336', background: '#fff3', padding: '0.75em', borderRadius: '6px', textAlign: 'center'}}>
                {msg}
              </div>
            )}
          </form>
        </div>

        <div className="profile-section" style={{flex: '2 1 480px', minWidth: 320, background: '#2e3531', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px #0002'}}>
          <h3 style={{marginBottom: '1.5rem', color: '#f7ab5e'}}>今日服務紀錄</h3>
          {sortedRecords.length === 0 ? (
            <div className="empty-records" style={{color: '#f7ab5e', textAlign: 'center', fontStyle: 'italic'}}>
              <p>今日尚無服務紀錄</p>
            </div>
          ) : (
            <div className="service-list" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              {sortedRecords.map((r, i) => (
                <div key={`service-${i}`} className={`service-item ${r.type === 'reservation' ? 'reservation-item' : 'queue-item'} ${r.status === 'cancelled' ? 'cancelled-item' : ''}`} style={{background: '#fff1', borderRadius: '8px', padding: '1.2em', boxShadow: '0 1px 4px #0001'}}>
                  <div className="service-type-badge" style={{fontWeight: 600, color: '#fff', background: r.type === 'reservation' ? '#2196f3' : '#ff9800', borderRadius: '4px', padding: '0.2em 0.8em', display: 'inline-block', marginBottom: '0.5em'}}>{r.type === 'reservation' ? '線上抽號' : '現場排隊'}</div>
                  <div className="service-info" style={{display: 'flex', flexWrap: 'wrap', gap: '1.2em'}}>
                    <div><strong>設計師：</strong><span>{r.designerName}</span></div>
                    <div><strong>服務：</strong><span>{r.serviceName} {r.servicePrice ? `($${r.servicePrice})` : ''}</span></div>
                    <div><strong>{r.type === 'reservation' ? '抽號編號' : '號碼牌'}：</strong><span>{r.type === 'reservation' ? r.id : r.number}</span></div>
                    <div><strong>{r.type === 'reservation' ? '抽號時間' : '抽號時間'}：</strong><span>{r.displayTime}</span></div>
                    <div><strong>狀態：</strong>
                      <span className={getStatusClass(r.status)}>
                        {getStatusText(r.status, r.type)}
                      </span>
                    </div>
                  </div>
                  {canCancel(r, r.type) && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleCancel(r.type, r.id)}
                      style={{marginTop: '1em'}}
                    >
                      {r.type === 'reservation' ? '取消抽號' : '取消排隊'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile; 