import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDesigners: 0,
    totalReservations: 0,
    totalRevenue: 0
  });
  
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
      return;
    }
    
    // 模擬載入統計數據
    setStats({
      totalCustomers: 156,
      totalDesigners: 8,
      totalReservations: 89,
      totalRevenue: 125000
    });
  }, [navigate, user]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>管理員後台</h1>
        <p>歡迎回來，{user?.name || '管理員'}！這裡是您的管理控制台</p>
      </div>

      {/* 統計卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{stats.totalCustomers}</div>
          <div className="label">總客戶數</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.totalDesigners}</div>
          <div className="label">設計師數量</div>
        </div>
        <div className="stat-card">
          <div className="number">{stats.totalReservations}</div>
          <div className="label">本月預約</div>
        </div>
        <div className="stat-card">
          <div className="number">${stats.totalRevenue.toLocaleString()}</div>
          <div className="label">本月營收</div>
        </div>
      </div>

      {/* 管理功能導航 */}
      <div className="admin-nav">
        <div className="admin-card" onClick={() => handleNavigation('/customers')}>
          <div className="icon">👥</div>
          <h3>客戶管理</h3>
          <p>管理客戶資料、查看客戶歷史記錄、客戶分析</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/designers')}>
          <div className="icon">👨‍🎨</div>
          <h3>設計師管理</h3>
          <p>管理設計師資料、排班設定、績效統計</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/finance')}>
          <div className="icon">💰</div>
          <h3>財務管理</h3>
          <p>收入支出記錄、財務報表、成本分析</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/queue')}>
          <div className="icon">📋</div>
          <h3>現場排隊</h3>
          <p>管理現場排隊狀況、即時監控</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/reservation')}>
          <div className="icon">📅</div>
          <h3>預約管理</h3>
          <p>查看所有預約、調整時段、客戶通知</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/reports')}>
          <div className="icon">📊</div>
          <h3>報表統計</h3>
          <p>營業報表、客戶分析、績效統計</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/worktime')}>
          <div className="icon">⏰</div>
          <h3>營業時間</h3>
          <p>設定營業時間、特殊時段、休假安排</p>
        </div>
        
        <div className="admin-card" onClick={() => handleNavigation('/profile')}>
          <div className="icon">⚙️</div>
          <h3>系統設定</h3>
          <p>系統參數、權限管理、備份還原</p>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="admin-form">
        <h3>快速操作</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="admin-btn admin-btn-primary" onClick={() => handleNavigation('/customers')}>
            新增客戶
          </button>
          <button className="admin-btn admin-btn-success" onClick={() => handleNavigation('/designers')}>
            新增設計師
          </button>
          <button className="admin-btn admin-btn-warning" onClick={() => handleNavigation('/reservation')}>
            查看今日預約
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={() => handleNavigation('/reports')}>
            生成報表
          </button>
        </div>
      </div>
    </div>
  );
}

export default Admin; 