import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  let user = null;
  if (token) {
    try {
      user = JSON.parse(atob(token.split('.')[1]));
    } catch {}
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      alert('只有管理員可以進入此頁面');
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="admin-container" style={{maxWidth: 800, margin: '2rem auto', padding: '2rem', background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
      <h2>管理員後台</h2>
      <p>歡迎，管理員！請選擇要管理的功能：</p>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '2rem'}}>
        <a href="/customers" className="btn btn-secondary">客戶管理</a>
        <a href="/designers" className="btn btn-secondary">設計師管理</a>
        <a href="/queue" className="btn btn-secondary">現場排隊管理</a>
        <a href="/reservation" className="btn btn-secondary">預約管理</a>
        <a href="/reports" className="btn btn-secondary">報表統計</a>
        <a href="/worktime" className="btn btn-secondary">營業時間設定</a>
        {/* 你可以在這裡繼續新增更多管理員功能入口 */}
      </div>
    </div>
  );
}

export default Admin; 