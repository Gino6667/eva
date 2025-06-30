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
  const [designers, setDesigners] = useState([]);
  const [currentServing, setCurrentServing] = useState([]);
  const [nextInQueue, setNextInQueue] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadTodayStats();
    loadDesigners();
    loadCurrentServing();
    loadNextInQueue();
    if (user) {
      loadUserQueue();
    }
    // 每分鐘自動更新服務狀態
    const interval = setInterval(() => {
      loadCurrentServing();
      loadNextInQueue();
    }, 60000);
    // 新增 queue-updated 事件監聽
    const reload = () => { if (user) loadUserQueue(); };
    window.addEventListener('queue-updated', reload);
    
    // 監聽設計師狀態變更事件
    const handleDesignerStateChange = () => {
      console.log('QueueProgress: 收到設計師狀態變更事件，重新載入資料');
      loadDesigners();
      loadCurrentServing();
      loadNextInQueue();
    };
    
    window.addEventListener('designer-state-changed', handleDesignerStateChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('queue-updated', reload);
      window.removeEventListener('designer-state-changed', handleDesignerStateChange);
    };
  }, [user, date]);

  const loadTodayStats = async () => {
    try {
      const response = await axios.get('/api/queue/today-stats');
      setTodayStats(response.data);
    } catch (err) {
      console.error('載入今日統計失敗:', err);
    }
  };

  const loadDesigners = async () => {
    try {
      const res = await axios.get('/api/designers');
      setDesigners(res.data);
    } catch (err) {
      console.error('載入設計師失敗:', err);
    }
  };

  const loadCurrentServing = async () => {
    try {
      const res = await axios.get('/api/queue/today-stats');
      setCurrentServing(res.data.currentServing || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('載入當前服務狀態失敗:', err);
    }
  };

  const loadNextInQueue = async () => {
    try {
      const res = await axios.get('/api/queue/next-in-queue');
      setNextInQueue(res.data || []);
    } catch (err) {
      console.error('載入下一位客人資訊失敗:', err);
      setNextInQueue([]);
    }
  };

  const loadUserQueue = async () => {
    try {
      console.log('載入會員號碼，用戶ID:', user.id);
      const res = await axios.get(`/api/queue/user/${user.id}`);
      console.log('會員號碼API回應:', res.data);
      // 只顯示今日且未取消的號碼
      const today = date;
      const todayQueues = res.data.filter(q => q.createdAt.slice(0,10) === today && q.status !== 'cancelled');
      console.log('今日號碼:', todayQueues);
      setUserQueue(todayQueues);
    } catch (err) {
      console.error('載入會員號碼失敗:', err);
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
        <h2>即時看板</h2>
        {/* 除錯資訊 */}
        {user && (
          <div style={{marginBottom: '1rem', padding: '0.5rem', background: 'transparent', borderRadius: '8px', fontSize: '0.9rem'}}>
            <div>會員狀態: {user.name}（已登入）</div>
            <div>今日日期: {date}</div>
          </div>
        )}
        
        {/* 會員今日抽號自動顯示 */}
        {user && userQueue.length > 0 && (
          <div className="user-queue-list" style={{marginBottom: '2rem', padding: '1rem', background: 'rgba(33, 150, 243, 0.07)', borderRadius: '12px', border: '2px solid #f7ab5e'}}>
            <div style={{marginBottom: '0.5em', fontWeight: 500, color: '#f7ab5e', fontSize: '1.1rem'}}>您今日抽到的號碼：</div>
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
                  <span className="user-queue-number">{q.number} 號</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* 會員但沒有號碼的提示 */}
        {user && userQueue.length === 0 && (
          <div style={{marginBottom: '2rem', padding: '1rem', background: 'rgba(33, 150, 243, 0.07)', borderRadius: '12px', border: '2px solid #ffc107', textAlign: 'center'}}>
            <div style={{color: '#f7ab5e', fontWeight: 500}}>您今日還沒有抽號</div>
            <div style={{color: '#f7ab5e', fontSize: '0.9rem', marginTop: '0.5rem'}}>請前往現場排隊或線上預約抽號</div>
          </div>
        )}
        {/* 即時看板卡片區塊 */}
        <div className="serving-header">
          <div className="update-info">
            <span>最後更新: {lastUpdate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
        <div className="serving-grid serving-grid-progress">
          {designers.filter(designer => designer.name !== '不指定').map(designer => {
            const serving = currentServing.find(s => s.designerId === designer.id);
            const next = nextInQueue.find(n => n.designerId === designer.id);
            return (
              <div key={designer.id} className="serving-card-progress">
                <div className="designer-header">
                  <span className="designer-title">設計師 <b>{designer.name}</b></span>
                </div>
                <div className="card-main-row">
                  <div className="card-col card-col-now">
                    <div className="col-label">目前號碼</div>
                    <div className="col-number now-number">
                      {serving ? (
                        <>
                          {serving.number}
                          <div className="col-service">{serving.serviceName || ''}</div>
                        </>
                      ) : (
                        <>
                          -
                          <div className="col-service"></div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="card-col card-col-next">
                    <div className="col-label">下一號</div>
                    <div className="col-number next-number">
                      {next ? (
                        <>
                          {next.number}
                          <div className="col-service">{next.serviceName || ''}</div>
                        </>
                      ) : (
                        <>
                          -
                          <div className="col-service"></div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {currentServing.length === 0 && (
          <div className="no-serving">
            <p>目前沒有設計師在服務中</p>
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
