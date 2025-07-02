import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Queue.css';
import useAvailableServices from '../hooks/useAvailableServices';
import useAvailableDesigners from '../hooks/useAvailableDesigners';

function Queue() {
  const [isMember, setIsMember] = useState(null);
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
  const [countdown, setCountdown] = useState(10);
  const [currentServing, setCurrentServing] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [todayStats, setTodayStats] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDesigners();
    loadServices();
    loadWorktime();
    loadCurrentServing();
    
    // 每分鐘自動更新服務狀態
    const interval = setInterval(() => {
      loadCurrentServing();
    }, 60000);
    
    // 監聽設計師狀態變更事件
    const handleDesignerStateChange = () => {
      console.log('Queue: 收到設計師狀態變更事件，重新載入設計師資料');
      loadDesigners();
      loadCurrentServing();
    };
    
    window.addEventListener('designer-state-changed', handleDesignerStateChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('designer-state-changed', handleDesignerStateChange);
    };
  }, []);

  useEffect(() => {
    currentServing.forEach(s => {
      if (!s.serviceId) {
        console.warn('currentServing 缺少 serviceId:', s);
      }
    });
  }, [currentServing]);

  useEffect(() => {
    // 若登入狀態改變且在 queue 頁面，自動選擇會員
    if (user) {
      setIsMember(true);
    }
  }, [user]);

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

  // 檢查是否在營業時間內
  const isWithinBusinessHours = () => {
    if (!worktime) return true;
    
    const now = new Date();
    const week = now.getDay();
    
    // 檢查是否為營業日
    if (!worktime.openDays?.[week]) {
      return { valid: false, reason: '今日非營業日' };
    }
    
    // 檢查是否在營業時間內
    const openTime = worktime.openTimes?.[week];
    if (openTime?.start && openTime?.end) {
      const nowStr = now.toTimeString().slice(0, 5);
      if (nowStr < openTime.start || nowStr >= openTime.end) {
        return { valid: false, reason: `營業時間為 ${openTime.start} - ${openTime.end}` };
      }
    }
    
    return { valid: true };
  };

  const availableDesigners = useAvailableDesigners(designers);
  const availableServices = useAvailableServices(services, designers, selectedDesigner);

  const handleMemberSelect = () => {
    setIsMember(true);
    if (!user) {
      navigate('/login?redirect=queue');
    } else {
      // 已登入會員自動選擇會員按鈕並停留在 queue
      setIsMember(true);
      navigate('/queue');
    }
  };

  const handleQueue = async () => {
    if (isMember === null) {
      setMsg('請選擇訪客或會員');
      return;
    }
    if (isMember && !user) {
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
    // debug log
    console.log('送出 queue:', {
      designerId: selectedDesigner,
      serviceId: selectedService,
      userId: user?.id
    });

    // 檢查營業時間
    const businessHoursCheck = isWithinBusinessHours();
    if (!businessHoursCheck.valid) {
      setMsg('非常抱歉!  今日非營業日無法提供抽號服務 !!');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      let userId = null;
      if (isMember && user) userId = user.id;
      const res = await axios.post('/api/queue', {
        designerId: selectedDesigner,
        serviceId: selectedService,
        type: 'onsite',
        userId
      });
      setQueueResult(res.data.data);
      
      // 立即更新服務狀態
      loadCurrentServing();
      
      // 10秒後自動返回現場排隊頁面並登出會員
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setQueueResult(null);
            setSelectedDesigner('');
            setSelectedService('');
            setIsMember(null);
            // 自動登出會員
            localStorage.removeItem('token');
            setUser(null);
            navigate('/queue');
            window.location.reload();
            return 10;
          }
          return prev - 1;
        });
      }, 1000);

      if (isMember && user) {
        window.dispatchEvent(new Event('queue-updated'));
      }
    } catch (err) {
      setMsg(err.response?.data?.error || '排隊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDesignerSelect = (designerId) => {
    setSelectedDesigner(Number(designerId));
    setSelectedService('');
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
    const service = services.find(s => s.id === selectedService);
    return service ? `${service.name} - $${service.price}` : '';
  };

  // 檢查營業狀態並顯示提示
  const getBusinessStatusMessage = () => {
    if (!worktime) return null;
    
    const businessHoursCheck = isWithinBusinessHours();
    if (!businessHoursCheck.valid) {
      return (
        <div className="business-status-message" style={{ fontSize: '1rem', padding: '0.3em 1em' }}>
          <p>⚠️ {businessHoursCheck.reason}</p>
        </div>
      );
    }
    
    const now = new Date();
    const week = now.getDay();
    const openTime = worktime.openTimes?.[week];
    if (openTime?.start && openTime?.end) {
      return (
        <div className="business-status-message" style={{ fontSize: '1rem', padding: '0.3em 1em' }}>
          <p>✅ 營業中 - 今日營業時間：{openTime.start} - {openTime.end}</p>
        </div>
      );
    }
    
    return null;
  };

  const businessStatusMessage = getBusinessStatusMessage();

  const getServiceName = (serviceId) => {
    if (!serviceId) return '未知服務';
    // 先從 services 陣列找
    const found = services.find(s => String(s.id) === String(serviceId));
    if (found && found.name) return found.name;
    // fallback 對照表
    const serviceNames = {
      1: '洗剪吹',
      2: '染髮',
      3: '燙髮'
    };
    if (serviceNames[String(serviceId)]) return serviceNames[String(serviceId)];
    // 最後才顯示未知服務
    return '未知服務';
  };

  if (queueResult) {
    return (
      <div className="queue-container">
        <div className="queue-header">
          <h2>現場排隊</h2>
          <p>抽號成功！</p>
        </div>
        <div className="queue-step" style={{textAlign:'center'}}>
          <h3>抽號成功！</h3>
          <p style={{fontSize:'1.5em', fontWeight:'bold'}}>您的號碼是：<span style={{fontWeight: 'bold', fontSize: '2em', color: '#ff9800'}}>{queueResult.number}</span></p>
          <p>設計師：{getSelectedDesignerName() || queueResult.designerName || '—'}</p>
          <p>服務項目：{getSelectedServiceName() || queueResult.serviceName || '—'}</p>
          <p style={{fontSize:'1.2em'}}>請留意叫號，謝謝！</p>
          <p style={{fontSize:'1.2em', marginTop:'1em'}}>{countdown} 秒後自動返回現場排隊並且登出會員</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              localStorage.removeItem('token');
              setUser(null);
              navigate('/queue');
              window.location.reload();
            }}
          >返回現場排隊並且登出會員</button>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-page-2col">
      <div className="queue-title-area">
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5em 0', fontWeight: 700 }}>現場排隊</h2>
      </div>
      <div className="queue-2col-main">
        {/* 左欄：服務狀態 */}
        <div className="queue-col queue-col-left">
          <div className="current-serving">
            {businessStatusMessage && (
              <div className="business-status-message" style={{ fontSize: '0.8rem', padding: '0.15em 0.6em' }}>
                {businessStatusMessage.props.children}
              </div>
            )}
            <h3>當前服務狀態</h3>
            <div className="serving-grid">
              {currentServing
                .filter(serving => serving.serviceId !== undefined && serving.serviceId !== null && serving.serviceId !== 0)
                .map(serving => {
                  const designer = designers.find(d => d.id === serving.designerId);
                  const service = services.find(s => String(s.id) === String(serving.serviceId));
                  let estWait = null;
                  if (todayStats && designer) {
                    const waitingCount = todayStats[designer.id]?.waiting || 0;
                    const serviceIds = designer.services || [];
                    const durations = serviceIds.map(sid => services.find(s => s.id === sid)?.duration || 60);
                    const avgDuration = durations.length ? (durations.reduce((a,b)=>a+b,0)/durations.length) : 60;
                    estWait = waitingCount * avgDuration;
                  }
                  if (!service && getServiceName(serving.serviceId) === '未知服務') {
                    console.warn('找不到服務名稱，serviceId:', serving.serviceId, '所有 services:', services);
                  }
                  return (
                    <div key={serving.designerId} className="serving-item">
                      <div className="designer-name">{designer?.name || '未知設計師'}</div>
                      <div className="current-number">{serving.number} 號</div>
                      <div className="service-name">
                        {serving.serviceName
                          || (service ? service.name : getServiceName(serving.serviceId))
                          || '未知服務'}
                      </div>
                      {estWait !== null && (
                        <div className="est-wait-time" style={{color:'#f7ab5e',marginTop:'0.5em',fontWeight:500}}>
                          預估等待時間：約 {Math.round(estWait)} 分鐘
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="last-update">最後更新：{lastUpdate.toLocaleTimeString()}</div>
          </div>
        </div>
        {/* 右欄：步驟表單 */}
        <div className="queue-col queue-col-right">
          <div className="queue-desc">請選擇您的身份並選擇設計師與服務項目</div>
          {msg && <div className="message">{msg}</div>}
          <div className="queue-step">
            <h3>步驟 1：選擇身份</h3>
            <div className="member-selection">
              <button className={`btn${isMember === false ? ' btn-primary selected' : ' btn-secondary'}`} onClick={() => setIsMember(false)}>訪客</button>
              <button className={`btn${isMember === true ? ' btn-primary selected' : ' btn-secondary'}`} onClick={handleMemberSelect}>會員</button>
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
              {loading ? '處理中...' : '抽號'}
            </button>
          </div>
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
      {showServiceModal && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇服務項目{selectedDesigner === 0 ? '（不指定設計師）' : selectedDesigner !== '' ? ' - ' + getSelectedDesignerName() : ''}</h3>
            <div className="designer-grid">
              {availableServices.map(service => (
                <button
                  key={service.id}
                  className={`designer-item${selectedService === service.id ? ' selected' : ''}`}
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
      )}
    </div>
  );
}

export default Queue;