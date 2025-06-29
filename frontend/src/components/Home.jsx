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

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="home">
      {/* 右上角登出按鈕 */}
      {user && (
        <button className="btn btn-logout" style={{position: 'absolute', top: 24, right: 32, zIndex: 10}} onClick={handleLogout}>
          登出
        </button>
      )}
      <div className="features">
        <Link to="/queue" className="feature-card primary feature-link">
          <div className="feature-icon">🎯</div>
          <h3>現場排隊</h3>
          <p>即時查看排隊狀況，快速抽號服務</p>
        </Link>
        <Link to="/reservation" className="feature-card primary feature-link">
          <div className="feature-icon">📅</div>
          <h3>線上預約</h3>
          <p>提前預約指定設計師，享受專屬服務</p>
        </Link>
        <Link to="/queue-progress" className="feature-card primary feature-link">
          <div className="feature-icon">🔍</div>
          <h3>即時看板</h3>
          <p>查詢您的排隊進度，掌握等待時間</p>
        </Link>
        {user && user.role !== 'admin' && (
          <Link to="/profile" className="feature-card primary feature-link">
            <div className="feature-icon">🏷️</div>
            <h3>會員中心</h3>
            <p>管理個人資料、預約與排隊紀錄</p>
          </Link>
        )}
      </div>
      {/* 新增首頁下方大按鈕區塊 */}
      <div className="home-action-bar">
        <Link to="/login?redirect=admin" className="home-action-btn">管理員/設計師登入</Link>
      </div>
    </div>
  );
}

export default Home; 