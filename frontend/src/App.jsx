import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 直接引入所有組件
import Home from './components/Home';
import Queue from './components/Queue';
import QueueProgress from './components/QueueProgress';
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
        <header className="header">
          <div className="header-content">
            <h1>美髮沙龍管理系統</h1>
            <nav className="nav-menu">
              <Link to="/" className="nav-link">首頁</Link>
              <Link to="/queue" className="nav-link">現場排隊</Link>
              <Link to="/queue-progress" className="nav-link">排隊查詢</Link>
              <Link to="/reservation" className="nav-link">線上預約</Link>
              {user ? (
                <>
                  <Link to="/profile" className="nav-link">會員中心</Link>
                  <button className="btn btn-logout" onClick={handleLogout}>登出</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-link">登入</Link>
                  <Link to="/register" className="nav-link">註冊</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/queue-progress" element={<QueueProgress />} />
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
