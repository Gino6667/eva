import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Home.css';

function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 檢查用戶登入狀態
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userData = JSON.parse(atob(token.split('.')[1]));
        setUser(userData);
      } catch (error) {
        console.error('Token解析失敗:', error);
        localStorage.removeItem('token');
      }
    }
  }, []);

  const handleAdminClick = () => {
    if (!user) {
      // 未登入，導向登入頁面
      navigate('/login?redirect=admin');
    } else if (user.role === 'admin') {
      // 已登入且為管理員，導向管理員頁面
      navigate('/admin');
    } else {
      // 已登入但不是管理員
      alert('只有管理員可以進入管理系統');
    }
  };

  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">歡迎來到美髮沙龍</h1>
        <p className="hero-subtitle highlight">專業的髮型設計，讓您展現最美的一面</p>
        <div className="hero-buttons">
          <Link to="/queue" className="btn btn-primary">現場排隊</Link>
          <Link to="/reservation" className="btn btn-secondary">線上預約</Link>
        </div>
      </div>
      
      <div className="features">
        <div className="feature-card primary">
          <div className="feature-icon">🎯</div>
          <h3>現場排隊</h3>
          <p>即時查看排隊狀況，快速抽號服務</p>
          <Link to="/queue" className="btn btn-primary">立即排隊</Link>
        </div>
        
        <div className="feature-card primary">
          <div className="feature-icon">📅</div>
          <h3>線上預約</h3>
          <p>提前預約指定設計師，享受專屬服務</p>
          <Link to="/reservation" className="btn btn-primary">立即預約</Link>
        </div>
        
        <div className="feature-card primary">
          <div className="feature-icon">🔍</div>
          <h3>排隊查詢</h3>
          <p>查詢您的排隊進度，掌握等待時間</p>
          <Link to="/queue-progress" className="btn btn-primary">查詢進度</Link>
        </div>
      </div>

      {/* 管理員入口 */}
      <div className="admin-section">
        <div className="admin-card">
          <div className="admin-icon">⚙️</div>
          <h3>管理員功能</h3>
          <p>系統管理、報表統計、客戶管理等後台功能</p>
          <button onClick={handleAdminClick} className="btn btn-admin">
            {user?.role === 'admin' ? '進入管理系統' : '管理員登入'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home; 