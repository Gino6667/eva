import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 直接引入所有組件
import Home from './components/Home';
import Queue from './components/Queue';
import QueueProgress from './components/QueueProgress';
import QueueTransfer from './components/QueueTransfer';
import Reservation from './components/Reservation';
import Worktime from './components/Worktime';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Finance from './components/Finance';
import Designers from './components/Designers';
import Admin from './components/Admin';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';

// 設定 axios 預設 baseURL
axios.defaults.baseURL = 'https://eva-36bg.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
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
    <Router basename="/eva">
      <div className="App">
        {/* 只有不是 admin 頁面時才顯示 header */}
        {window.location.pathname !== '/eva/admin' && (
        <header className="header">
          <div className="header-content" style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',padding:'0 2vw',minHeight:'64px'}}>
            <div style={{flex:'0 0 auto',display:'flex',alignItems:'center'}}>
              <button className="nav-toggle" onClick={() => setNavOpen(v => !v)} aria-label="展開選單">☰</button>
            </div>
            <div style={{flex:'1 1 0',textAlign:'center'}}>
              <h1 style={{margin:0,padding:'16px 0 0 0',fontSize:'2rem',letterSpacing:'2px',color:'#f7ab5e',minWidth:0}}>美髮沙龍管理系統</h1>
            </div>
            <div style={{flex:'0 0 auto',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
              <nav className={`nav-menu${navOpen ? ' open' : ''}`}
                onMouseLeave={() => setNavOpen(false)}
              >
                <Link to="/" className="nav-link" onClick={()=>setNavOpen(false)}>首頁</Link>
                <Link to="/queue" className="nav-link" onClick={()=>setNavOpen(false)}>現場排隊</Link>
                <Link to="/queue-progress" className="nav-link" onClick={()=>setNavOpen(false)}>即時看板</Link>
                {/* <Link to="/queue-transfer" className="nav-link">轉移排隊</Link> */}
                <Link to="/reservation" className="nav-link" onClick={()=>setNavOpen(false)}>線上預約</Link>
                {user ? (
                  <>
                    {user.role !== 'admin' && (
                      <Link to="/profile" className="nav-link" onClick={()=>setNavOpen(false)}>會員中心</Link>
                    )}
                    <button className="btn btn-logout" onClick={()=>{handleLogout();setNavOpen(false);}}>登出</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="nav-link" onClick={()=>setNavOpen(false)}>會員登入/註冊</Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>
        )}
        
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/queue-progress" element={<QueueProgress />} />
            <Route path="/queue-transfer" element={<QueueTransfer />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/worktime" element={<Worktime />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/designers" element={<Designers />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <div className="footer-content">
            <p>&copy; 2025 美髮沙龍管理系統</p>
            <div className="footer-links">
              <a href="/privacy">隱私政策</a>
              <a href="/terms">使用條款</a>
              <a href="/contact">聯絡我們</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
