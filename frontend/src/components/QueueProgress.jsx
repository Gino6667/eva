import { useState, useEffect } from 'react';
import axios from 'axios';
import './QueueProgress.css';

function QueueProgress() {
  const [number, setNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [todayStats, setTodayStats] = useState(null);
  const [userQueue, setUserQueue] = useState([]);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  });

  // 載入今日統計
  useEffect(() => {
    loadTodayStats();
    // 會員自動查詢今日抽號
    if (user) {
      loadUserQueue();
    }
  }, [user, date]);

  const loadTodayStats = async () => {
    try {
      const response = await axios.get('/api/queue/today-stats');
      setTodayStats(response.data);
    } catch (err) {
      console.error('載入今日統計失敗:', err);
    }
  };

  const loadUserQueue = async () => {
    try {
      const res = await axios.get(`/api/queue/user/${user.id}`);
      // 只顯示今日的號碼
      const today = date;
      setUserQueue(res.data.filter(q => q.createdAt.slice(0,10) === today));
    } catch (err) {
      setUserQueue([]);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!number.trim()) {
      setError('請輸入號碼');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(null);

    try {
      const response = await axios.get('/api/queue/progress', {
        params: { number: number.trim(), date }
      });
      setProgress(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(err.response.data.message || '找不到該號碼的排隊記錄');
      } else {
        setError('查詢失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'waiting': return '等待中';
      case 'called': return '已叫號';
      case 'done': return '已完成';
      case 'absent': return '未到';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return '#ff9800';
      case 'called': return '#2196f3';
      case 'done': return '#4caf50';
      case 'absent': return '#f44336';
      default: return '#666';
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} 分鐘`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  };

  return (
    <div className="queue-progress-container">
      <div className="queue-progress-card">
        <h2>排隊進度查詢</h2>
        {/* 會員今日抽號自動顯示 */}
        {user && userQueue.length > 0 && (
          <div className="user-queue-list">
            <div style={{marginBottom: '0.5em', fontWeight: 500}}>您今日抽到的號碼：</div>
            <div style={{display: 'flex', gap: '0.5em', flexWrap: 'wrap'}}>
              {userQueue.map(q => (
                <button
                  key={q.id}
                  className="user-queue-btn"
                  onClick={() => { setNumber(q.number); setDate(q.createdAt.slice(0,10)); setProgress(null); setError(''); }}
                  style={{
                    background: '#333d38',
                    border: '2px solid #2196f3',
                    borderRadius: '8px',
                    padding: '0.5em 1em',
                    fontWeight: 600,
                    color: '#2196f3',
                    cursor: 'pointer',
                    fontSize: '1.1em',
                  }}
                >
                  #{q.number}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 今日統計 */}
        {todayStats && (
          <div className="today-stats">
            <h3>今日統計</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{todayStats.stats.total}</span>
                <span className="stat-label">總號碼</span>
              </div>
              <div className="stat-item">
                <span className="stat-number waiting">{todayStats.stats.waiting}</span>
                <span className="stat-label">等待中</span>
              </div>
              <div className="stat-item">
                <span className="stat-number called">{todayStats.stats.called}</span>
                <span className="stat-label">已叫號</span>
              </div>
              <div className="stat-item">
                <span className="stat-number done">{todayStats.stats.done}</span>
                <span className="stat-label">已完成</span>
              </div>
            </div>
            
            {/* 當前正在服務 */}
            {todayStats.currentServing.length > 0 && (
              <div className="current-serving">
                <h4>當前正在服務</h4>
                <div className="serving-list">
                  {todayStats.currentServing.map((item, index) => (
                    <div key={index} className="serving-item">
                      <span className="number">#{item.number}</span>
                      <span className="designer">{item.designerName}</span>
                      <span className="service">{item.serviceName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 查詢表單 */}
        {/*
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="number">號碼</label>
            <input
              type="number"
              id="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="請輸入您的號碼"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="date">日期</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? '查詢中...' : '查詢進度'}
          </button>
        </form>
        */}

        {/* 錯誤訊息 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* 查詢結果 */}
        {progress && (
          <div className="progress-result">
            <h3>查詢結果</h3>
            
            <div className="queue-info">
              <div className="info-header">
                <span className="queue-number">#{progress.queueInfo.number}</span>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(progress.queueInfo.status) }}
                >
                  {getStatusText(progress.queueInfo.status)}
                </span>
              </div>
              
              <div className="info-details">
                <div className="detail-item">
                  <span className="label">設計師：</span>
                  <span className="value">{progress.designer?.name || '未指定'}</span>
                  {progress.designer?.isPaused && (
                    <span className="paused-badge">暫停中</span>
                  )}
                </div>
                
                <div className="detail-item">
                  <span className="label">服務項目：</span>
                  <span className="value">{progress.service?.name || '未知服務'}</span>
                </div>
                
                <div className="detail-item">
                  <span className="label">排隊類型：</span>
                  <span className="value">
                    {progress.queueInfo.type === 'onsite' ? '現場排隊' : '線上排隊'}
                  </span>
                </div>
                
                <div className="detail-item">
                  <span className="label">抽號時間：</span>
                  <span className="value">
                    {new Date(progress.queueInfo.createdAt).toLocaleString('zh-TW')}
                  </span>
                </div>
              </div>
            </div>

            {/* 進度資訊 */}
            {progress.progress.status === 'waiting' && (
              <div className="progress-info">
                <h4>等待進度</h4>
                <div className="progress-details">
                  <div className="progress-item">
                    <span className="label">目前位置：</span>
                    <span className="value">第 {progress.progress.position} 位</span>
                  </div>
                  
                  <div className="progress-item">
                    <span className="label">等待人數：</span>
                    <span className="value">{progress.progress.totalWaiting} 人</span>
                  </div>
                  
                  <div className="progress-item">
                    <span className="label">預估等待時間：</span>
                    <span className="value">{formatTime(progress.progress.estimatedWaitMinutes)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 當前正在服務的號碼 */}
            {progress.currentServing.length > 0 && (
              <div className="current-serving-result">
                <h4>當前正在服務</h4>
                <div className="serving-list">
                  {progress.currentServing.map((item, index) => (
                    <div key={index} className="serving-item">
                      <span className="number">#{item.number}</span>
                      <span className="designer">{item.designerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueProgress; 