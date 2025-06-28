import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import './App.css';

// 設定 axios 預設 baseURL
axios.defaults.baseURL = 'https://eva-36bg.onrender.com';

// 懶加載組件以提升效能
const Home = lazy(() => import('./components/Home'));
const Queue = lazy(() => import('./components/Queue'));
const Reservation = lazy(() => import('./components/Reservation'));
const Worktime = lazy(() => import('./components/Worktime'));
const Reports = lazy(() => import('./components/Reports'));
const Notifications = lazy(() => import('./components/Notifications'));
const Customers = lazy(() => import('./components/Customers'));
const Finance = lazy(() => import('./components/Finance'));
const Designers = lazy(() => import('./components/Designers'));
const Admin = lazy(() => import('./components/Admin'));
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/Register'));
const Profile = lazy(() => import('./components/Profile'));

// 載入組件
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>載入中...</p>
  </div>
);

// 錯誤邊界組件
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div className="error-boundary">
        <h2>發生錯誤</h2>
        <p>請重新整理頁面或稍後再試</p>
        <button onClick={() => window.location.reload()} className="btn">
          重新整理
        </button>
      </div>
    );
  }
  
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return <LoadingSpinner />;
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
              <Link to="/reservation" className="nav-link">線上預約</Link>
              <Link to="/worktime" className="nav-link">工作時間設定</Link>
              <Link to="/reports" className="nav-link">報表統計</Link>
              <Link to="/notifications" className="nav-link">通知系統</Link>
              <Link to="/customers" className="nav-link">客戶管理</Link>
              <Link to="/finance" className="nav-link">財務管理</Link>
              <Link to="/designers" className="nav-link">設計師管理</Link>
              <Link to="/admin" className="nav-link">管理員</Link>
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
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/queue" element={<Queue />} />
                <Route path="/reservation" element={<Reservation />} />
                <Route path="/worktime" element={<Worktime />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/designers" element={<Designers />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/login" element={<Login setUser={setUser} />} />
                <Route path="/register" element={<Register setUser={setUser} />} />
                <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
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
