import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
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
  
  // 新增後台帳號狀態
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'designer' // 預設為設計師角色
  });
  const [accountMessage, setAccountMessage] = useState('');
  
  // 帳號列表狀態
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const token = localStorage.getItem('token');
  const user = useMemo(() => {
    if (token) {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch {}
    }
    return null;
  }, [token]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'designer')) {
      alert('只有管理員或設計師可以進入此頁面');
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
    
    // 只有管理員才能載入設計師帳號列表
    if (user.role === 'admin') {
      loadAccounts(); // 載入所有後台帳號
    } else if (user.role === 'designer') {
      // 設計師也可以載入帳號列表
      loadAccounts();
    }
  }, [navigate, user]);

  // 載入所有後台帳號（設計師和管理員）
  const loadAccounts = async () => {
    console.log('開始載入帳號...');
    setLoadingAccounts(true);
    try {
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 只篩選出設計師帳號，不顯示管理員
      const backendAccounts = response.data.filter(user => 
        user.role === 'designer'
      );
      
      setAccounts(backendAccounts);
    } catch (error) {
      console.error('載入帳號失敗:', error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // 新增後台帳號處理函數
  const handleAddAccount = async (e) => {
    e.preventDefault();
    setAccountMessage('');
    
    if (!newAccount.name || !newAccount.password) {
      setAccountMessage('請填寫姓名和密碼');
      return;
    }
    
    try {
      // 使用註冊 API 新增後台帳號
      await axios.post('/api/register', newAccount, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAccountMessage('新增後台帳號成功！');
      setNewAccount({ name: '', email: '', phone: '', password: '', role: 'designer' });
      
      // 重新載入帳號列表
      loadAccounts();
    } catch (error) {
      setAccountMessage(error.response?.data?.error || '新增失敗');
    }
  };

  // 刪除帳號
  const handleDeleteAccount = async (id) => {
    if (!window.confirm('確定要刪除此帳號嗎？此操作無法復原。')) {
      return;
    }
    
    try {
      await axios.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAccountMessage('刪除帳號成功！');
      loadAccounts(); // 重新載入帳號列表
    } catch (error) {
      setAccountMessage(error.response?.data?.error || '刪除失敗');
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  // 側邊欄選單項目 - 根據角色顯示不同選項
  const getSidebarItems = () => {
    const baseItems = [
      // { path: '', icon: '🏠', label: '儀表板', active: location.pathname === '/admin' },
      { path: 'queue-progress', icon: '📋', label: '即時看板', active: location.pathname === '/admin/queue-progress' },
      { path: 'queue', icon: '🎯', label: '現場排隊', active: location.pathname === '/admin/queue' },
    ];

    // 只有管理員或設計師才顯示客人調整
    // if (user?.role === 'admin' || user?.role === 'designer') {
    //   baseItems.push({ path: 'queue-transfer', icon: '🔄', label: '客人調整', active: location.pathname === '/admin/queue-transfer' });
    // }

    // 只有管理員才顯示管理功能
    if (user?.role === 'admin') {
      baseItems.push(
        { path: 'worktime', icon: '⏰', label: '工作時間設定', active: location.pathname === '/admin/worktime' },
        { path: 'reports', icon: '📊', label: '報表統計', active: location.pathname === '/admin/reports' },
        { path: 'customers', icon: '👥', label: '客戶管理', active: location.pathname === '/admin/customers' },
        { path: 'finance', icon: '💰', label: '財務管理', active: location.pathname === '/admin/finance' },
        { path: 'designers-list', icon: '👤', label: '設計師管理', active: location.pathname === '/admin/designers-list' },
        { path: 'designers', icon: '✂️', label: '新增/刪除設計師及服務項目', active: location.pathname === '/admin/designers' },
        { path: 'profile', icon: '⚙️', label: '系統設定', active: location.pathname === '/admin/profile' },
        { path: 'add-account', icon: '👤➕', label: '新增後台帳號', active: false, special: true }
      );
    } else if (user?.role === 'designer') {
      // 設計師專用功能
      // baseItems.push(
      //   { path: 'profile', icon: '👤', label: '個人資料', active: location.pathname === '/admin/profile' }
      // );
    }

    return baseItems;
  };

  const sidebarItems = getSidebarItems();

  return (
    <div className="admin-layout">
      {/* 側邊欄 */}
      <aside className={`admin-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2 style={{display: sidebarCollapsed ? 'none' : 'block'}}>{user?.role === 'admin' ? '後台管理' : '設計師後台'}</h2>
          <p style={{display: sidebarCollapsed ? 'none' : 'block'}}>歡迎，{user?.name || (user?.role === 'admin' ? '管理員' : '設計師')}</p>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item.path}
              className={`sidebar-item ${item.active ? 'active' : ''}`}
              onClick={() => {
                if (item.special) {
                  // 特殊按鈕處理
                  if (item.path === 'add-account') {
                    setShowAccountForm(true);
                  }
                } else {
                  // 一般導航處理
                  handleNavigation(item.path);
                }
              }}
              style={sidebarCollapsed ? {justifyContent: 'center'} : {}}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer" style={sidebarCollapsed ? {justifyContent: 'center'} : {}}>
          <button className="logout-btn" onClick={handleLogout} style={sidebarCollapsed ? {justifyContent: 'center'} : {}}>
            <span className="sidebar-icon">🚪</span>
            {!sidebarCollapsed && <span className="sidebar-label">登出</span>}
          </button>
        </div>
        {/* 方向鍵摺疊按鈕 */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '24px',
            border: 'none',
            background: '#f7ab5e',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10
          }}
          aria-label={sidebarCollapsed ? "展開側邊欄" : "收合側邊欄"}
        >
          <span style={{fontSize: '12px', color: '#fff', fontWeight: 'bold'}}>
            {sidebarCollapsed ? '>' : '<'}
          </span>
        </button>
      </aside>
      {/* 主要內容區域 */}
      <main className="admin-main">
        {showAccountForm ? (
          <div className="admin-container">
            <div className="admin-header">
              <h1>新增後台帳號</h1>
              <p>新增管理員或設計師帳號</p>
            </div>
            {accountMessage && (
              <div className={`message ${accountMessage.includes('成功') ? 'success' : 'error'}`}>{accountMessage}</div>
            )}
            <div className="admin-form">
              <form onSubmit={handleAddAccount}>
                <div className="form-row">
                  <div className="form-group">
                    <label>姓名 *</label>
                    <input type="text" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} required placeholder="請輸入姓名" />
                  </div>
                  <div className="form-group">
                    <label>密碼 *</label>
                    <input type="password" value={newAccount.password} onChange={e => setNewAccount({...newAccount, password: e.target.value})} required placeholder="請輸入密碼" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>信箱（選填）</label>
                    <input type="email" value={newAccount.email} onChange={e => setNewAccount({...newAccount, email: e.target.value})} placeholder="請輸入信箱" />
                  </div>
                  <div className="form-group">
                    <label>手機號碼（選填）</label>
                    <input type="tel" value={newAccount.phone} onChange={e => setNewAccount({...newAccount, phone: e.target.value})} placeholder="請輸入手機號碼" />
                  </div>
                </div>
                <div className="form-group">
                  <label>角色 *</label>
                  <select value={newAccount.role} onChange={e => setNewAccount({...newAccount, role: e.target.value})} required>
                    <option value="designer">設計師</option>
                    <option value="admin">管理員</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="submit" className="admin-btn admin-btn-primary">新增帳號</button>
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={() => {
                    setShowAccountForm(false);
                    setAccountMessage('');
                    setNewAccount({ name: '', email: '', phone: '', password: '', role: 'designer' });
                  }}>取消</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}

export default Admin; 