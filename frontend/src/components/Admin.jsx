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

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

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

  // 刪除帳號
  const handleDeleteAccount = async (id) => {
    if (!window.confirm('確定要刪除此帳號嗎？此操作無法復原。')) {
      return;
    }
    
    try {
      await axios.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      loadAccounts(); // 重新載入帳號列表
    } catch (error) {
      console.error('刪除帳號失敗:', error);
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
      { path: 'queue', icon: '🎯', label: '現場排隊', active: location.pathname === '/admin/queue' },
    ];

    // 只有管理員或設計師才顯示客人調整
    // if (user?.role === 'admin' || user?.role === 'designer') {
    //   baseItems.push({ path: 'queue-transfer', icon: '🔄', label: '客人調整', active: location.pathname === '/admin/queue-transfer' });
    // }

    // 只有管理員才顯示管理功能
    if (user?.role === 'admin') {
      baseItems.push(
        { path: 'designers-list', icon: '👤', label: '設計師管理', active: location.pathname === '/admin/designers-list' },
        { path: 'reports', icon: '📊', label: '報表統計', active: location.pathname === '/admin/reports' },
        { path: 'performance', icon: '📈', label: '業績表', active: location.pathname === '/admin/performance' },
        { path: 'customers', icon: '👥', label: '客戶管理', active: location.pathname === '/admin/customers' },
        { path: 'worktime', icon: '⏰', label: '工作時間設定', active: location.pathname === '/admin/worktime' },
        { path: 'designers', icon: '✂️', label: '新增/刪除設計師及服務產品', active: location.pathname === '/admin/designers' },
        { path: 'control', icon: '👤➕', label: '帳號控管', active: false, special: true }
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
      <aside className={`admin-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>{user?.role === 'admin' ? '後台管理' : '設計師後台'}</h2>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item, idx) => (
            <div
              key={item.path}
              className={`sidebar-item ${item.active ? 'active' : ''}`}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!sidebarCollapsed && <span className="sidebar-label">{item.label}</span>}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="sidebar-icon">🚪</span>
            {!sidebarCollapsed && <span className="sidebar-label">登出</span>}
          </button>
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "展開側邊欄" : "收合側邊欄"}
        >
          {sidebarCollapsed
            ? <span style={{fontSize: '1.5em', color: '#fff', fontWeight: 'bold'}}>▶</span>
            : <span style={{fontSize: '1.5em', color: '#fff', fontWeight: 'bold'}}>◀</span>
          }
        </button>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Admin; 