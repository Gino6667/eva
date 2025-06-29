import { useEffect, useState } from 'react';
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
      loadDesignerAccounts();
    }
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

  // 側邊欄選單項目 - 根據角色顯示不同選項
  const getSidebarItems = () => {
    const baseItems = [
      { path: '/admin', icon: '🏠', label: '儀表板', active: location.pathname === '/admin' },
      { path: '/queue-progress', icon: '📋', label: '即時看板', active: location.pathname === '/queue-progress' },
      { path: '/queue', icon: '🎯', label: '排隊管理', active: location.pathname === '/queue' },
      { path: '/reservation', icon: '📅', label: '預約管理', active: location.pathname === '/reservation' },
    ];

    // 只有管理員或設計師才顯示客人調整
    if (user?.role === 'admin' || user?.role === 'designer') {
      baseItems.push({ path: '/queue-transfer', icon: '🔄', label: '客人調整', active: location.pathname === '/queue-transfer' });
    }

    // 只有管理員才顯示管理功能
    if (user?.role === 'admin') {
      baseItems.push(
        { path: '/worktime', icon: '⏰', label: '工作時間設定', active: location.pathname === '/worktime' },
        { path: '/reports', icon: '📊', label: '報表統計', active: location.pathname === '/reports' },
        { path: '/customers', icon: '👥', label: '客戶管理', active: location.pathname === '/customers' },
        { path: '/finance', icon: '💰', label: '財務管理', active: location.pathname === '/finance' },
        { path: '/designers', icon: '✂️', label: '設計師管理', active: location.pathname === '/designers' },
        { path: '/profile', icon: '⚙️', label: '系統設定', active: location.pathname === '/profile' }
      );
    } else if (user?.role === 'designer') {
      // 設計師專用功能
      baseItems.push(
        { path: '/profile', icon: '👤', label: '個人資料', active: location.pathname === '/profile' }
      );
    }

    return baseItems;
  };

  const sidebarItems = getSidebarItems();

  return (
    <div className="admin-layout">
      {/* 黑色 YouTube 風格側邊欄 */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>{user?.role === 'admin' ? '管理後台' : '設計師後台'}</h2>
          <p>歡迎，{user?.name || (user?.role === 'admin' ? '管理員' : '設計師')}</p>
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
        <Outlet />
      </main>
    </div>
  );
}

export default Admin; 