import { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';

function Profile({ user, setUser }) {
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) setName(user.name);
    loadRecords();
  }, [user]);

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

  const handleCancelReservation = async (reservationId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(`/api/reservations/${reservationId}/cancel`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMsg('取消成功！');
      loadRecords();
    } catch (err) {
      setMsg('取消失敗');
    }
  };

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
        <h2>會員中心</h2>
        <p>管理您的個人資料與預約紀錄</p>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>個人資料</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="name">姓名</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            {showPassword ? (
              <div className="form-group">
                <label htmlFor="password">新密碼</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                />
                <button type="button" className="btn btn-secondary" style={{marginTop: '0.5em'}} onClick={() => { setShowPassword(false); setPassword(''); }}>取消</button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary" style={{marginBottom: '1em'}} onClick={() => setShowPassword(true)}>修改密碼</button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '儲存中...' : '儲存修改'}
            </button>
            {msg && (
              <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
                {msg}
              </div>
            )}
          </form>
        </div>

        <div className="profile-section">
          <h3>預約紀錄</h3>
          {records.length === 0 ? (
            <div className="empty-records">
              <p>尚無預約紀錄</p>
            </div>
          ) : (
            <div className="reservation-list">
              {records.map((r, i) => (
                <div key={i} className="reservation-item">
                  <div className="reservation-info">
                    <div><strong>設計師：</strong>{r.designerName}</div>
                    <div><strong>服務：</strong>{r.serviceName} (${r.servicePrice})</div>
                    <div><strong>日期：</strong>{r.date}</div>
                    <div><strong>時段：</strong>{r.time}</div>
                    <div><strong>狀態：</strong>
                      <span className={`status ${r.status}`}>
                        {r.status === 'booked' ? '已預約' : 
                         r.status === 'completed' ? '已完成' : 
                         r.status === 'cancelled' ? '已取消' : r.status}
                      </span>
                    </div>
                  </div>
                  {r.status === 'booked' && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleCancelReservation(r.id)}
                    >
                      取消預約
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