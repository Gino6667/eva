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
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentList, setAbsentList] = useState([]);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [absentMsg, setAbsentMsg] = useState('');
  const [confirmAbsentId, setConfirmAbsentId] = useState(null);
  const [confirmAbsentInfo, setConfirmAbsentInfo] = useState(null);
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

  // 過號報到處理（改為選擇列表）
  const handleAbsentCheckin = async () => {
    setAbsentMsg('');
    setAbsentLoading(true);
    setShowAbsentModal(true);
    try {
      // 用台灣時區取得今天日期
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
      const res = await axios.get(`/api/queue`);
      setAbsentList(res.data.filter(q => {
        if (q.status !== 'absent') return false;
        const created = new Date(q.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const absent = q.absentAt ? new Date(q.absentAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) : null;
        return created === today || absent === today;
      }));
    } catch (err) {
      setAbsentMsg('取得過號名單失敗');
    } finally {
      setAbsentLoading(false);
    }
  };
  const handleAbsentSubmit = async (queueId) => {
    setAbsentLoading(true);
    setAbsentMsg('');
    try {
      await axios.post(`/api/queue/${queueId}/checkin`);
      setShowAbsentModal(false);
      setAbsentList([]);
      setConfirmAbsentId(null);
      setConfirmAbsentInfo(null);
      setAbsentMsg('');
      loadCurrentServing();
    } catch (err) {
      setAbsentMsg(err.response?.data?.error || '報到失敗');
    } finally {
      setAbsentLoading(false);
    }
  };

  // 以設計師名字為唯一，只顯示第一筆 currentServing
  const servingByDesignerName = {};
  currentServing.forEach(s => {
    const designer = designers.find(d => d.id === s.designerId);
    if (designer && !servingByDesignerName[designer.name]) {
      servingByDesignerName[designer.name] = { serving: s, designer };
    }
  });
  const servingList = Object.values(servingByDesignerName);

  if (queueResult) {
    return (
      <div className="queue-container">
        <div className="queue-header">
          <h2 style={{fontSize: '0.8em'}}>現場排隊</h2>
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
    <div className="queue-page">
      <header className="queue-header queue-header-flex">
        <h1 style={{fontSize: '0.8em'}}>現場排隊</h1>
        <div className="absent-checkin-btn">
          <button onClick={handleAbsentCheckin}>過號報到</button>
        </div>
      </header>
      {showAbsentModal && (
        <div className="modal-overlay" onClick={() => setShowAbsentModal(false)}>
          <div
            className="modal-content absent-modal confirm-bg-all"
            style={{ maxWidth: '700px', background: '#333d38', color: '#fff' }}
          >
            <div className="absent-modal-header" style={{ background: '#333d38', color: '#fff' }}>
              {/* <span className="absent-modal-icon">⏰</span> */}
              <h3 style={{ color: '#fff', textAlign: 'center', fontSize: '2em', width: '100%', margin: 0 }}>過號報到</h3>
            </div>
            <div className="absent-modal-body" style={{ background: '#333d38', color: '#fff' }}>
              {absentLoading ? (
                <div className="absent-loading">載入中...</div>
              ) : absentList.length === 0 ? (
                <div className="absent-empty">今日沒有過號可報到</div>
              ) : (
                <div className="absent-list">
                  {absentList.map((q, idx) => (
                    <button
                      key={`absent-${q.id}-${idx}`}
                      className="absent-list-item"
                      onClick={() => {
                        setConfirmAbsentId(q.id);
                        setConfirmAbsentInfo({
                          number: q.number,
                          designer: designers.find(d=>d.id===q.designerId)?.name || '未知'
                        });
                      }}
                      disabled={absentLoading}
                      style={{ background: '#ffe082', color: '#333d38', fontWeight: 'bold' }}
                    >
                      <div className="absent-number" style={{ color: '#333d38' }}>{q.number} 號</div>
                      <div className="absent-designer" style={{ color: '#333d38' }}>設計師：{designers.find(d=>d.id===q.designerId)?.name || '未知'}</div>
                    </button>
                  ))}
                </div>
              )}
              {absentMsg && <div className="absent-msg" style={{ color: '#ff5252' }}>{absentMsg}</div>}
            </div>
            <div className="absent-modal-footer" style={{ background: '#333d38', color: '#fff', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={()=>setShowAbsentModal(false)} disabled={absentLoading} style={{background:'#fff',color:'#333d38',borderRadius:'8px',fontWeight:'bold', minWidth: '120px'}}>關閉</button>
            </div>
          </div>
        </div>
      )}
      {/* 二次確認彈窗 */}
      {confirmAbsentId && (
        <div className="modal-overlay" onClick={() => { setConfirmAbsentId(null); setConfirmAbsentInfo(null); }}>
          <div
            className="modal-content absent-modal confirm-bg-all"
            style={{ maxWidth: '340px', background: '#333d38', color: '#fff' }}
          >
            <div className="absent-modal-header confirm-bg" style={{ background: '#333d38', color: '#fff', justifyContent:'center', textAlign:'center' }}>
              <h3 style={{width:'100%',textAlign:'center',margin:'0 auto', color: '#fff'}}>過號報到</h3>
            </div>
            <div className="absent-modal-body" style={{ background: '#333d38', color: '#fff', textAlign:'center' }}>
              <div style={{fontSize:'1.2em',margin:'1.5em 0', color: '#fff'}}>
                號碼：<span style={{color:'#fff',fontWeight:'bold',fontSize:'2.2em'}}>{confirmAbsentInfo?.number}</span><br/>
                設計師：<span style={{color:'#fff'}}>{confirmAbsentInfo?.designer}</span>
              </div>
              <div className="absent-msg" style={{color:'#ff5252',fontSize:'1.4em'}}>此操作無法復原，請確定是否完成該號碼過號報到!!!</div>
            </div>
            <div className="absent-modal-footer" style={{ background: '#333d38', color: '#fff' }}>
              <button className="btn btn-secondary" onClick={()=>{ setConfirmAbsentId(null); setConfirmAbsentInfo(null); }} disabled={absentLoading}>取消</button>
              <button className="btn btn-primary" style={{background:'#fff',color:'#333d38',borderRadius:'8px',fontWeight:'bold'}} onClick={()=>handleAbsentSubmit(confirmAbsentId)} disabled={absentLoading}>確定</button>
            </div>
          </div>
        </div>
      )}
      <div className="queue-content">
        <section className="queue-status-panel">
          {businessStatusMessage}
          <div className="kanban-board">
            <h3 style={{margin:'0 0 0.5em 0',fontWeight:'bold',fontSize:'1.1em'}}>即時看板</h3>
            <div className="kanban-list">
              {designers.map((designer, idx) => {
                const serving = currentServing.find(s => s.designerId === designer.id);
                const service = serving ? services.find(sv => String(sv.id) === String(serving.serviceId)) : null;
                let estWait = null;
                if (todayStats && designer) {
                  const waitingCount = todayStats[designer.id]?.waiting || 0;
                  const serviceIds = designer.services || [];
                  const durations = serviceIds.map(sid => services.find(s => s.id === sid)?.duration || 60);
                  const avgDuration = durations.length ? (durations.reduce((a,b)=>a+b,0)/durations.length) : 60;
                  // 加 1，包含正在服務的客人
                  estWait = (waitingCount + 1) * avgDuration;
                }
                return (
                  <div key={`kanban-${designer.id}`} className="kanban-card">
                    <div className="kanban-designer">{designer.name}</div>
                    <div className="kanban-number">{serving ? `${serving.number} 號` : '暫無'}</div>
                    <div className="kanban-service">{serving && service ? service.name : '—'}</div>
                    <div className="kanban-wait">
                      預估等待：{
                        serving || (todayStats && todayStats[designer.id]?.waiting > 0)
                          ? (serving && estWait !== null ? `${Math.round(estWait)} 分鐘` : '—')
                          : '立刻'
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="queue-form-panel">
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
                className={`btn queue-main-btn btn-secondary${selectedDesigner !== '' ? ' selected' : ''}`}
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
              <button className={`btn queue-main-btn btn-secondary${selectedService ? ' selected' : ''}`} onClick={() => setShowServiceModal(true)} disabled={selectedDesigner === ''}>
                {selectedService ? getSelectedServiceName() : selectedDesigner !== '' ? '請選擇服務項目' : '請先選擇設計師'}
              </button>
              {selectedDesigner === '' && (
                <p className="service-hint">⚠️ 請先選擇設計師，才能選擇對應的服務項目</p>
              )}
            </div>
          </div>
          <div className="queue-step">
            <button className="btn queue-main-btn btn-primary" onClick={handleQueue} disabled={loading || selectedDesigner === '' || !selectedService || availableDesigners.length === 0}>
              {loading ? '處理中...' : '抽號'}
            </button>
          </div>
        </section>
      </div>
      {showDesignerModal && (
        <div className="modal-overlay" onClick={() => setShowDesignerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇設計師</h3>
            <div className="designer-grid">
              <button
                key="designer-0"
                className={`designer-item${selectedDesigner === 0 ? ' selected' : ''}`}
                onClick={() => handleDesignerSelect(0)}
              >
                不指定
              </button>
              {availableDesigners.map((designer, idx) => (
                <button
                  key={`designer-${designer.id}`}
                  className={`designer-item${selectedDesigner === designer.id ? ' selected' : ''}`}
                  onClick={() => handleDesignerSelect(designer.id)}
                >
                  {designer.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showServiceModal && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇服務項目</h3>
            <div className="service-grid">
              {availableServices.map((service, idx) => (
                <button
                  key={`service-${service.id}`}
                  className={`service-item${selectedService === service.id ? ' selected' : ''}`}
                  onClick={() => handleServiceSelect(service.id)}
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Queue;