import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDesigners: 0,
    totalReservations: 0,
    totalRevenue: 0
  });
  
  // 設計師權限管理狀態
  const [designerAccounts, setDesignerAccounts] = useState([]);
  const [showDesignerForm, setShowDesignerForm] = useState(false);
  const [newDesigner, setNewDesigner] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  
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
    
    // 載入設計師帳號列表
    loadDesignerAccounts();
  }, [navigate, user]);

  const loadDesignerAccounts = async () => {
    try {
      const response = await axios.get('/api/designer-accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDesignerAccounts(response.data);
    } catch (error) {
      console.error('載入設計師帳號失敗:', error);
    }
  };

  const handleAddDesigner = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!newDesigner.name || !newDesigner.password) {
      setMessage('請填寫姓名和密碼');
      return;
    }
    
    if (!newDesigner.email && !newDesigner.phone) {
      setMessage('請填寫信箱或手機號碼至少一項');
      return;
    }
    
    try {
      await axios.post('/api/designer-accounts', newDesigner, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('新增設計師帳號成功！');
      setNewDesigner({ name: '', email: '', phone: '', password: '' });
      setShowDesignerForm(false);
      loadDesignerAccounts();
    } catch (error) {
      setMessage(error.response?.data?.error || '新增失敗');
    }
  };

  const handleDeleteDesigner = async (id) => {
    if (!window.confirm('確定要刪除此設計師帳號嗎？')) {
      return;
    }
    
    try {
      await axios.delete(`/api/designer-accounts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('刪除設計師帳號成功！');
      loadDesignerAccounts();
    } catch (error) {
      setMessage(error.response?.data?.error || '刪除失敗');
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // 側邊欄選單項目
  const sidebarItems = [
    { path: '/admin', icon: '🏠', label: '儀表板', active: location.pathname === '/admin' },
    { path: '/worktime', icon: '⏰', label: '工作時間設定', active: location.pathname === '/worktime' },
    { path: '/reports', icon: '📊', label: '報表統計', active: location.pathname === '/reports' },
    { path: '/customers', icon: '👥', label: '客戶管理', active: location.pathname === '/customers' },
    { path: '/finance', icon: '💰', label: '財務管理', active: location.pathname === '/finance' },
    { path: '/designers', icon: '✂️', label: '設計師管理', active: location.pathname === '/designers' },
    { path: '/queue', icon: '🎯', label: '排隊管理', active: location.pathname === '/queue' },
    // 只有 admin 或 designer 才顯示客人調整
    ...(user?.role === 'admin' || user?.role === 'designer' ? [
      { path: '/queue-transfer', icon: '🔄', label: '客人調整', active: location.pathname === '/queue-transfer' }
    ] : []),
    { path: '/reservation', icon: '📅', label: '預約管理', active: location.pathname === '/reservation' },
    { path: '/queue-progress', icon: '📋', label: '排隊進度查詢', active: location.pathname === '/queue-progress' },
    { path: '/profile', icon: '⚙️', label: '系統設定', active: location.pathname === '/profile' }
  ];

  return (
    <div className="admin-layout">
      {/* 黑色 YouTube 風格側邊欄 */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>管理後台</h2>
          <p>歡迎，{user?.name || '管理員'}</p>
        </div>
        
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item.path}
              className={`sidebar-item ${item.active ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </div>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            <span className="sidebar-label">登出</span>
          </button>
        </div>
      </aside>

      {/* 主要內容區域 */}
      <main className="admin-main">
        <div className="admin-container">
          <div className="admin-header">
            <h1>管理員儀表板</h1>
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

          {/* 快速操作 */}
          <div className="admin-section">
            <h3>快速操作</h3>
            <div className="quick-actions">
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

          {/* 設計師權限管理 */}
          <div className="admin-section">
            <div className="section-header">
              <h3>設計師權限管理</h3>
              <button 
                className="admin-btn admin-btn-primary"
                onClick={() => setShowDesignerForm(!showDesignerForm)}
              >
                {showDesignerForm ? '取消' : '新增設計師帳號'}
              </button>
            </div>
            
            {message && (
              <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            
            {showDesignerForm && (
              <div className="admin-form">
                <form onSubmit={handleAddDesigner}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>姓名 *</label>
                      <input
                        type="text"
                        value={newDesigner.name}
                        onChange={e => setNewDesigner({...newDesigner, name: e.target.value})}
                        required
                        placeholder="請輸入姓名"
                      />
                    </div>
                    <div className="form-group">
                      <label>密碼 *</label>
                      <input
                        type="password"
                        value={newDesigner.password}
                        onChange={e => setNewDesigner({...newDesigner, password: e.target.value})}
                        required
                        placeholder="請輸入密碼"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>信箱</label>
                      <input
                        type="email"
                        value={newDesigner.email}
                        onChange={e => setNewDesigner({...newDesigner, email: e.target.value})}
                        placeholder="請輸入信箱"
                      />
                    </div>
                    <div className="form-group">
                      <label>手機號碼</label>
                      <input
                        type="tel"
                        value={newDesigner.phone}
                        onChange={e => setNewDesigner({...newDesigner, phone: e.target.value})}
                        placeholder="請輸入手機號碼"
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="admin-btn admin-btn-success">
                      新增帳號
                    </button>
                    <button 
                      type="button" 
                      className="admin-btn admin-btn-secondary"
                      onClick={() => setShowDesignerForm(false)}
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div className="designer-accounts-list">
              <h4>現有設計師帳號</h4>
              {designerAccounts.length === 0 ? (
                <p className="no-data">目前沒有設計師帳號</p>
              ) : (
                <div className="accounts-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>姓名</th>
                        <th>信箱</th>
                        <th>手機號碼</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designerAccounts.map(account => (
                        <tr key={account.id}>
                          <td>{account.id}</td>
                          <td>{account.name}</td>
                          <td>{account.email || '-'}</td>
                          <td>{account.phone || '-'}</td>
                          <td>
                            <button 
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleDeleteDesigner(account.id)}
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin; 