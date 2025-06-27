import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 設定 axios 預設 baseURL
axios.defaults.baseURL = 'https://eva-36bg.onrender.com';

function App() {
  return (
    <Router basename="/eva">
      <div className="App">
        <header className="header">
          <h1>美髮沙龍管理系統</h1>
          <nav>
            <a href="/">首頁</a>
            <a href="/queue">現場排隊</a>
            <a href="/worktime">工作時間設定</a>
            <a href="/admin">管理員</a>
          </nav>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/worktime" element={<Worktime />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>&copy; 2025 美髮沙龍管理系統</p>
        </footer>
      </div>
    </Router>
  );
}

// 首頁組件
function Home() {
  return (
    <div className="home">
      <h2>歡迎使用美髮沙龍管理系統</h2>
      <div className="features">
        <div className="feature-card">
          <h3>現場排隊</h3>
          <p>管理顧客現場排隊狀況</p>
          <a href="/queue" className="btn">進入排隊</a>
        </div>
        <div className="feature-card">
          <h3>工作時間設定</h3>
          <p>設定營業時間和時段</p>
          <a href="/worktime" className="btn">設定時間</a>
        </div>
        <div className="feature-card">
          <h3>管理員功能</h3>
          <p>系統管理和資料維護</p>
          <a href="/admin" className="btn">管理功能</a>
        </div>
      </div>
    </div>
  );
}

// 排隊組件
function Queue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const response = await axios.get('/api/queue');
      setQueue(response.data);
      setLoading(false);
    } catch (err) {
      console.error('載入排隊資料失敗:', err);
      setLoading(false);
    }
  };

  const addToQueue = async () => {
    try {
      await axios.post('/api/queue', {
        name: `顧客${Date.now()}`,
        phone: '0900000000'
      });
      loadQueue();
    } catch (err) {
      console.error('加入排隊失敗:', err);
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="queue">
      <h2>現場排隊管理</h2>
      <button onClick={addToQueue} className="btn">新增排隊</button>
      <div className="queue-list">
        {queue.map((item, index) => (
          <div key={index} className="queue-item">
            <span>#{index + 1}</span>
            <span>{item.name}</span>
            <span>{item.phone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 工作時間設定組件
function Worktime() {
  const [worktime, setWorktime] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorktime();
  }, []);

  const loadWorktime = async () => {
    try {
      const response = await axios.get('/api/worktime');
      setWorktime(response.data);
      setLoading(false);
    } catch (err) {
      console.error('載入工作時間失敗:', err);
      setLoading(false);
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="worktime">
      <h2>工作時間設定</h2>
      <p>工作時間設定功能開發中...</p>
    </div>
  );
}

// 管理員組件
function Admin() {
  return (
    <div className="admin">
      <h2>管理員功能</h2>
      <p>管理員功能開發中...</p>
    </div>
  );
}

export default App;
