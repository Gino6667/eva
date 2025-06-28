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
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>現場排隊</h3>
          <p>即時查看排隊狀況，快速抽號服務</p>
          <Link to="/queue" className="btn">立即排隊</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>線上預約</h3>
          <p>提前預約指定設計師，享受專屬服務</p>
          <Link to="/reservation" className="btn">立即預約</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">⏰</div>
          <h3>營業時間</h3>
          <p>查看最新營業時間與服務時段</p>
          <Link to="/worktime" className="btn">查看時間</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h3>報表統計</h3>
          <p>詳細的營業數據分析與績效報表</p>
          <Link to="/reports" className="btn">查看報表</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">🔔</div>
          <h3>通知系統</h3>
          <p>自動通知提醒，掌握最新動態</p>
          <Link to="/notifications" className="btn">查看通知</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">👥</div>
          <h3>客戶管理</h3>
          <p>完整的客戶資料與消費紀錄管理</p>
          <Link to="/customers" className="btn">管理客戶</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">💰</div>
          <h3>財務管理</h3>
          <p>收入支出記錄與財務分析</p>
          <Link to="/finance" className="btn">財務管理</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">✂️</div>
          <h3>設計師管理</h3>
          <p>設計師檔案、排班與績效管理</p>
          <Link to="/designers" className="btn">管理設計師</Link>
        </div>
        
        <div className="feature-card">
          <div className="feature-icon">⚙️</div>
          <h3>管理功能</h3>
          <p>管理員專用功能，系統管理與監控</p>
          <button onClick={handleAdminClick} className="btn">管理系統</button>
        </div>
      </div>
    </div>
  );
}

export default Home; 