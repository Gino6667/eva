import { BrowserRouter as Router, Routes, Route, Link, Outlet } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import './App.css';

// 直接引入所有組件
import Home from './components/Home';
import QueueProgress from './components/QueueProgress';
import QueueTransfer from './components/QueueTransfer';
import Worktime from './components/Worktime';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Designers from './components/Designers';
import Admin from './components/Admin';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Control from './components/Control';
import Performance from './components/Performance';

// 懶加載元件
const Queue = lazy(() => import('./components/Queue'));
const Reservation = lazy(() => import('./components/Reservation'));
const DesignersList = lazy(() => import('./components/DesignersList'));

// 設定 axios 預設 baseURL
axios.defaults.baseURL = import.meta.env.MODE === 'production' 
  ? 'https://eva-36bg.onrender.com' 
  : 'http://localhost:3001';
axios.defaults.withCredentials = false;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // 嘗試自動登入
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setUser(res.data);
          setLoading(false);
        })
        .catch(() => {
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 強制所有表格、表頭、儲存格套用主背景色
    const allCells = document.querySelectorAll('table, th, td');
    allCells.forEach(el => {
      el.style.background = '#363d39';
      el.style.color = '#fff';
      el.style.border = '1px solid #555';
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <Router basename={import.meta.env.MODE === 'production' ? '/eva' : '/'}>
      <div className="App">
        {/* 只有不是 admin 頁面時才顯示側邊欄 */}
        {!window.location.pathname.startsWith('/admin') && (
          <aside className={`sidebar-nav${sidebarCollapsed ? ' collapsed' : ''}`}>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(v => !v)}
              aria-label={sidebarCollapsed ? '展開選單' : '收合選單'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
            <nav className="nav-menu open">
              <Link to="/" className="nav-link" onClick={()=>setNavOpen(false)}>首頁</Link>
              <Link to="/queue" className="nav-link" onClick={()=>setNavOpen(false)}>現場排隊</Link>
              <Link to="/queue-progress" className="nav-link" onClick={()=>setNavOpen(false)}>即時看板</Link>
              <Link to="/reservation" className="nav-link" onClick={()=>setNavOpen(false)}>線上抽號</Link>
              {user ? (
                <>
                  {user.role !== 'admin' && (
                    <Link to="/profile" className="nav-link" onClick={()=>setNavOpen(false)}>會員中心</Link>
                  )}
                  <button className="btn btn-logout" onClick={()=>{handleLogout();setNavOpen(false);}}>登出</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link" onClick={()=>setNavOpen(false)}>登入</Link>
                </>
              )}
            </nav>
          </aside>
        )}
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <main className="main" style={{ flex: 1, marginLeft: sidebarCollapsed ? 48 : 180 }}>
          <Routes>
            <Route path="/" element={<Home />} />
              <Route path="/queue" element={<Suspense fallback={<div>載入中...</div>}>
                <Queue />
              </Suspense>} />
            <Route path="/queue-progress" element={<QueueProgress />} />
              <Route path="/reservation" element={<Suspense fallback={<div>載入中...</div>}>
                <Reservation />
              </Suspense>} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
            <Route path="/admin" element={<Admin />}>
              <Route index element={<Home />} />
              <Route path="queue-progress" element={<QueueProgress />} />
                <Route path="queue" element={<Suspense fallback={<div>載入中...</div>}>
                  <Queue />
                </Suspense>} />
                <Route path="reservation" element={<Suspense fallback={<div>載入中...</div>}>
                  <Reservation />
                </Suspense>} />
              <Route path="queue-transfer" element={<QueueTransfer />} />
              <Route path="worktime" element={<Worktime />} />
                <Route path="reports" element={<Suspense fallback={<div>載入中...</div>}>
                  <Reports />
                </Suspense>} />
              <Route path="customers" element={<Customers />} />
              <Route path="designers" element={<Designers />} />
                <Route path="designers-list" element={<Suspense fallback={<div>載入中...</div>}><DesignersList /></Suspense>} />
              <Route path="profile" element={<Profile user={user} setUser={setUser} />} />
                <Route path="control" element={<Control />} />
                <Route path="performance" element={<Performance />} />
            </Route>
          </Routes>
        </main>
        </div>
        <footer className="footer">
          <div className="footer-content">
            {/* <p>&copy; 2025 美髮沙龍管理系統</p> */}
            {/* <div className="footer-links">
              <a href="/privacy">隱私政策</a>
              <a href="/terms">使用條款</a>
              <a href="/contact">聯絡我們</a>
            </div> */}
            {/* <h1 style={{marginTop: '1em', textAlign: 'center'}}>美髮沙龍管理系統</h1> */}
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
