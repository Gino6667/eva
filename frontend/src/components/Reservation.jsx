import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Reservation.css';
import useAvailableServices from '../hooks/useAvailableServices';
import useAvailableDesigners from '../hooks/useAvailableDesigners';

function Reservation() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  });
  const [designers, setDesigners] = useState([]);
  const [services, setServices] = useState([]);
  const [worktime, setWorktime] = useState(null);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueResult, setQueueResult] = useState(null);
  const [showDesignerModal, setShowDesignerModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentServing, setCurrentServing] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isMember, setIsMember] = useState(true);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();
  const [userQueue, setUserQueue] = useState([]);
  const todayStr = new Date().toISOString().slice(0, 10);
  const filteredUserQueue = user ? userQueue.filter(q => q.createdAt.slice(0, 10) === todayStr && q.status !== 'done') : [];

  useEffect(() => {
    loadDesigners();
    loadServices();
    loadWorktime();
    loadCurrentServing();
    
    // 監聽設計師狀態變更事件
    const handleDesignerStateChange = () => {
      console.log('Reservation: 收到設計師狀態變更事件，重新載入設計師資料');
      loadDesigners();
    };
    
    window.addEventListener('designer-state-changed', handleDesignerStateChange);
    
    return () => {
      window.removeEventListener('designer-state-changed', handleDesignerStateChange);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadUserQueue = async () => {
      try {
        const res = await axios.get(`/api/queue/user/${user.id}?date=${todayStr}`);
        setUserQueue(res.data);
      } catch (err) {
        setUserQueue([]);
      }
    };
    loadUserQueue();
    // 監聽 queue-updated 事件
    const reload = () => { loadUserQueue(); };
    window.addEventListener('queue-updated', reload);
    return () => {
      window.removeEventListener('queue-updated', reload);
    };
  }, [user, todayStr]);

  const loadDesigners = async () => {
    try {
      const res = await axios.get('/api/designers');
      setDesigners(res.data);
    } catch (err) {
      console.error('載入設計師失敗:', err);
    }
  };

  const loadServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setServices(res.data);
    } catch (err) {
      console.error('載入服務失敗:', err);
    }
  };

  const loadWorktime = async () => {
    try {
      const res = await axios.get('/api/worktime');
      setWorktime(res.data);
    } catch (err) {
      console.error('載入工作時間失敗:', err);
    }
  };

  const loadCurrentServing = async () => {
    try {
      const res = await axios.get('/api/queue/today-stats');
      setCurrentServing(res.data.currentServing || []);
      setTodayStats(res.data.designerStats || null);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('載入當前服務狀態失敗:', err);
    }
  };

  // 檢查今天是否為營業日
  const isTodayBusinessDay = () => {
    if (!worktime) return true;
    const now = new Date();
    const week = now.getDay();
    return worktime.openDays?.[week] || false;
  };

  const availableDesigners = useAvailableDesigners(designers);
  const availableServices = useAvailableServices(services, designers, selectedDesigner);

  const handleQueue = async () => {
    if (!user) {
      setMsg('請先登入會員');
      return;
    }
    if (selectedDesigner === '') {
      setMsg('請選擇設計師');
      return;
    }
    if (!selectedService) {
      setMsg('請選擇服務項目');
      return;
    }
    // 自動加 log
    console.log({
      designerId: selectedDesigner,
      serviceId: selectedService,
      userId: user?.id
    });

    // 檢查今天是否為營業日
    if (!isTodayBusinessDay()) {
      setMsg('非常抱歉!  今日非營業日無法提供抽號服務 !!');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      const res = await axios.post('/api/queue', {
        designerId: Number(selectedDesigner),
        serviceId: Number(selectedService),
        userId: user.id,
        type: 'online'
      });
      setQueueResult(res.data.data);
    } catch (err) {
      setMsg(err.response?.data?.error || '抽號失敗');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login?redirect=reservation');
  };

  const handleRegister = () => {
    navigate('/register?redirect=reservation');
  };

  const handleDesignerSelect = (designerId) => {
    setSelectedDesigner(Number(designerId));
    setShowDesignerModal(false);
  };

  const handleServiceSelect = (serviceId) => {
    setSelectedService(Number(serviceId));
    setShowServiceModal(false);
  };

  const getSelectedDesignerName = () => {
    if (selectedDesigner === 0) return '不指定';
    const designer = designers.find(d => d.id === Number(selectedDesigner));
    return designer ? designer.name : '';
  };

  const getSelectedServiceName = () => {
    const service = services.find(s => String(s.id) === String(selectedService));
    return service ? `${service.name} - $${service.price}` : '';
  };

  // 格式化今天日期顯示
  const formatToday = () => {
    const date = new Date();
    const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return `${date.getMonth() + 1}/${date.getDate()} (${weekDays[date.getDay()]})`;
  };

  // 檢查營業狀態並顯示提示
  const getBusinessStatusMessage = () => {
    if (!worktime) return null;
    const now = new Date();
    const week = now.getDay();
    // 檢查是否為營業日
    if (!worktime.openDays?.[week]) {
      return (
        <div className="business-status-message">
          <p>⚠️ 今日非營業日</p>
        </div>
      );
    }
    // 檢查是否在營業時間內
    const openTime = worktime.openTimes?.[week];
    if (openTime?.start && openTime?.end) {
      return (
        <div className="business-status-message">
          <p>✅ 營業中 - 今日營業時間：{openTime.start} - {openTime.end}</p>
        </div>
      );
    }
    return null;
  };

  const businessStatusMessage = getBusinessStatusMessage();

  useEffect(() => {
    if (selectedService && !availableServices.some(s => String(s.id) === String(selectedService))) {
      setSelectedService('');
    }
  }, [selectedDesigner, services]);

  useEffect(() => {
    if (availableServices && selectedService && !availableServices.some(s => String(s.id) === String(selectedService))) {
      setSelectedService('');
    }
  }, [availableServices, selectedService]);

  const handleMemberSelect = () => {
    setIsMember(true);
    if (!user) {
      navigate('/login?redirect=reservation');
    }
  };

  if (queueResult) {
    return (
      <div id="reservation" className="reservation-container">
        <div className="reservation-header">
          <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5em 0', fontWeight: 700 }}>線上抽號</h2>
          <p>抽號成功！</p>
        </div>
        <div className="reservation-step">
          <h3>抽號成功！</h3>
          <div style={{ textAlign: 'center', padding: '2em 0' }}>
            <h2 style={{ fontWeight: 900, color: '#f7ab5e', marginBottom: '1em' }}>您已成功抽到號碼</h2>
            <div style={{ fontSize: '2.2em', fontWeight: 900, color: '#ff9800', marginBottom: '0.7em' }}>號碼：{queueResult.number}</div>
            <div style={{ fontSize: '1.2em', color: '#fff', marginBottom: '0.5em' }}>設計師：{getSelectedDesignerName() || queueResult.designerName || '—'}</div>
            <div style={{ fontSize: '1.2em', color: '#fff', marginBottom: '0.5em' }}>服務項目：{getSelectedServiceName() || queueResult.serviceName || '—'}</div>
            <div style={{ fontSize: '1.1em', color: '#fff', marginBottom: '0.5em' }}>抽號日期：{formatToday()}</div>
            <p style={{ fontSize: '1.1em', color: '#f7ab5e', margin: '1.2em 0 1.5em 0' }}>請留意叫號，或返回查看「即時看板」。</p>
            <div style={{marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', width: '100%'}}>
              <button className="btn btn-secondary" onClick={() => window.location.reload()} style={{textAlign: 'center', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto', display: 'block'}}>
                返回
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="reservation" className="reservation-container">
      <div className="reservation-header">
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5em 0', fontWeight: 700 }}>線上抽號(僅限當日抽號)</h2>
      </div>
      {user && filteredUserQueue.length > 0 && (
        <div className="user-queue-list new-user-queue-list" style={{marginBottom:'1em'}}>
          <div className="user-queue-title">您今日抽到的號碼：</div>
          <div className="user-queue-btns" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.2em',justifyItems:'center'}}>
            {filteredUserQueue.map(q => (
              <button
                key={q.id}
                className="user-queue-btn new-user-queue-btn"
                style={{borderRadius:'50%',width:'2.5em',height:'2.5em',fontSize:'1.1em',border:'2px solid #f7ab5e',background:'#fff',color:'#f7ab5e',fontWeight:700,overflow:'hidden'}}
                disabled
              >
                <span className="user-queue-number">{q.number}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {user && userQueue.length === 0 && (
        <div style={{marginBottom: '1em', padding: '1rem', background: 'rgba(33, 150, 243, 0.07)', borderRadius: '12px', border: '2px solid #ffc107', textAlign: 'center'}}>
          <div style={{color: '#f7ab5e', fontWeight: 500}}>您今日還沒有抽號</div>
          <div style={{color: '#f7ab5e', fontSize: '0.9rem', marginTop: '0.5rem'}}>請前往現場排隊或線上預約抽號</div>
        </div>
      )}
      <div className="kanban-board">
        {getBusinessStatusMessage()}
        <h3 style={{margin:'0.2em 0 0.5em 0',fontWeight:'bold',fontSize:'1.1em'}}>即時看板</h3>
        <div className="kanban-list">
          {designers.map((designer, idx) => {
            if (designer.isOnVacation) return null;
            const serving = currentServing.find(s => s.designerId === designer.id);
            const service = serving ? services.find(sv => String(sv.id) === String(serving.serviceId)) : null;
            let estWait = null;
            if (todayStats && designer) {
              const waitingCount = todayStats[designer.id]?.waiting || 0;
              const serviceIds = designer.services || [];
              const durations = serviceIds.map(sid => services.find(s => s.id === sid)?.duration || 60);
              const avgDuration = durations.length ? (durations.reduce((a,b)=>a+b,0)/durations.length) : 60;
              estWait = (waitingCount + 1) * avgDuration;
            }
            return (
              <div key={`kanban-${designer.id}`} className="kanban-card">
                <div className="kanban-designer">{designer.name}</div>
                <div className="kanban-number">{serving ? `${serving.number} 號` : '暫無'}</div>
                <div className="kanban-wait">
                  預估等待：{
                    designer.isPaused
                      ? '暫停服務'
                      : (serving || (todayStats && todayStats[designer.id]?.waiting > 0)
                          ? (serving && estWait !== null ? `${Math.round(estWait)} 分鐘` : '—')
                          : '立刻')
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 步驟欄回復為右側欄位 */}
      <div className="queue-col queue-col-right">
        <div className="queue-step">
          <h3>步驟 1：會員登入</h3>
          <div className="member-selection">
            {user ? (
              <button className="btn btn-primary member-logged-in" disabled>已登入會員</button>
            ) : (
              <button className="btn btn-primary" onClick={handleLogin}>註冊/登入會員</button>
            )}
          </div>
        </div>
        <div className="queue-step">
          <h3>步驟 2：選擇設計師</h3>
          <div className="designer-selection">
            <button
              className={`btn btn-secondary${selectedDesigner !== '' ? ' selected' : ''}`}
              onClick={() => setShowDesignerModal(true)}
            >
              {selectedDesigner !== '' ? getSelectedDesignerName() : '請選擇設計師'}
            </button>
            {availableDesigners.length === 0 && (
              <p className="no-available-designers">⚠️ 目前沒有可用的設計師（可能為非營業日或所有設計師暫停接單）</p>
            )}
          </div>
        </div>
        <div className="queue-step">
          <h3>步驟 3：選擇服務項目</h3>
          <div className="service-selection">
            <button className={`btn btn-secondary${selectedService ? ' selected' : ''}`} onClick={() => setShowServiceModal(true)} disabled={selectedDesigner === ''}>
              {selectedService ? getSelectedServiceName() : selectedDesigner !== '' ? '請選擇服務項目' : '請先選擇設計師'}
            </button>
            {selectedDesigner === '' && (
              <p className="service-hint">⚠️ 請先選擇設計師，才能選擇對應的服務項目</p>
            )}
          </div>
        </div>
        <div className="queue-step">
          <button className="btn btn-primary" onClick={handleQueue} disabled={loading || selectedDesigner === '' || !selectedService || availableDesigners.length === 0}>
            {loading ? '處理中...' : '確認抽號'}
          </button>
        </div>
      </div>

      {/* 設計師選擇彈窗 */}
      {showDesignerModal && (
        <div className="modal-overlay" onClick={() => setShowDesignerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇設計師</h3>
            <div className="designer-grid">
              <button
                key={0}
                className={`designer-item${selectedDesigner === 0 ? ' selected' : ''}`}
                onClick={() => handleDesignerSelect(0)}
              >
                不指定
              </button>
              {availableDesigners.map(designer => (
                <button
                  key={designer.id}
                  className={`designer-item${selectedDesigner === designer.id ? ' selected' : ''}`}
                  onClick={() => handleDesignerSelect(designer.id)}
                >
                  {designer.name}
                </button>
              ))}
            </div>
            {availableDesigners.length === 0 && (
              <p>目前沒有可用的設計師</p>
            )}
          </div>
        </div>
      )}

      {/* 服務選擇彈窗 */}
      {showServiceModal && (() => {
        const designer = designers.find(d => d.id === Number(selectedDesigner));
        console.log('designer.services:', designer?.services);
        console.log('services:', services);
        console.log('getAvailableServices:', availableServices);
        return (
          <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
            <div className="modal-content service-modal" onClick={e => e.stopPropagation()}>
              <h3>選擇服務項目</h3>
              <div className="service-grid">
                {availableServices.map(service => (
                  <button
                    key={service.id}
                    className={`service-item${selectedService === String(service.id) ? ' selected' : ''}`}
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <div>{service.name}</div>
                    <div>${service.price}</div>
                  </button>
                ))}
              </div>
              {availableServices.length === 0 && (
                <p>此設計師暫無可選服務</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* 錯誤訊息跳窗 */}
      {showErrorModal && (
        <div className="modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth:'350px',textAlign:'center'}}>
            <h3 style={{marginBottom:'1em'}}>抽號失敗</h3>
            <div style={{textAlign:'center', marginBottom:'0.5em'}}>
              <span style={{fontSize:'2.5em', color:'#d32f2f'}}>❌</span>
            </div>
            {msg && msg !== '抽號失敗' && (
              <div style={{marginBottom:'1em', fontSize:'1.3em', color:'#d32f2f', fontWeight:'bold'}}>
                {msg}
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setShowErrorModal(false)}>關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reservation; 