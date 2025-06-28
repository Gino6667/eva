import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Queue.css';

function Queue() {
  const [isMember, setIsMember] = useState(null);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  });
  const [designers, setDesigners] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueResult, setQueueResult] = useState(null);
  const [showDesignerModal, setShowDesignerModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    loadDesigners();
    loadServices();
  }, []);

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

  const handleMemberSelect = () => {
    setIsMember(true);
    if (!user) {
      navigate('/login?redirect=queue');
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
    if (!selectedDesigner) {
      setMsg('請選擇設計師');
      return;
    }
    if (!selectedService) {
      setMsg('請選擇服務項目');
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
      setQueueResult(res.data);
      
      // 10秒後自動返回現場排隊頁面
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setQueueResult(null);
            setSelectedDesigner('');
            setSelectedService('');
            setIsMember(null);
            setMsg('');
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setMsg(err.response?.data?.error || '排隊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDesignerSelect = (designerId) => {
    setSelectedDesigner(designerId);
    setShowDesignerModal(false);
  };

  const handleServiceSelect = (serviceId) => {
    setSelectedService(serviceId);
    setShowServiceModal(false);
  };

  const getSelectedDesignerName = () => {
    const designer = designers.find(d => d.id === selectedDesigner);
    return designer ? designer.name : '';
  };

  const getSelectedServiceName = () => {
    const service = services.find(s => s.id === selectedService);
    return service ? `${service.name} - $${service.price}` : '';
  };

  if (queueResult) {
    return (
      <div className="queue-container">
        <div className="queue-header">
          <h2>現場排隊</h2>
          <p>排隊成功！</p>
        </div>
        <div className="queue-step">
          <h3>排隊成功！</h3>
          <p>您的號碼牌：<span style={{fontWeight: 'bold', fontSize: '1.5em'}}>{queueResult.number}</span></p>
          <p>請留意現場叫號或手機通知。</p>
          <p style={{color: '#666', fontSize: '0.9em', marginTop: '1em'}}>
            {countdown} 秒後自動返回現場排隊頁面
          </p>
          <Link to="/" className="btn btn-primary" style={{marginTop: '1em'}}>回首頁</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-container">
      <div className="queue-header">
        <h2>現場排隊</h2>
        <p>完成以下步驟即可現場排隊</p>
      </div>

      <div className="queue-step">
        <h3>步驟1：選擇訪客或會員</h3>
        <div style={{marginBottom: '1em'}}>
          <button className={`btn ${isMember === false ? 'btn-primary' : ''}`} onClick={() => setIsMember(false)}>訪客</button>
          <button className={`btn ${isMember === true ? 'btn-primary' : ''}`} onClick={handleMemberSelect} style={{marginLeft: '1em'}}>會員</button>
        </div>
        {isMember === false && (
          <div style={{marginBottom: '1em'}}>
            <p style={{color: '#666', fontSize: '0.9em', marginBottom: '0.5em'}}>
              訪客排隊無需輸入個人資料
            </p>
          </div>
        )}
        {isMember === true && user && (
          <div style={{marginBottom: '1em', padding: '1em', background: '#e8f5e8', borderRadius: '4px'}}>
            <p style={{margin: '0', color: '#2d5a2d'}}>
              ✓ 已登入會員：{user.name}
            </p>
          </div>
        )}

        <h3 style={{marginTop: '2em'}}>步驟2：選擇設計師</h3>
        <div style={{marginBottom: '1em'}}>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowDesignerModal(true)}
            style={{
              width: '100%', 
              padding: '12px', 
              textAlign: 'left',
              background: selectedDesigner ? '#f8f9fa' : '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            {selectedDesigner ? getSelectedDesignerName() : '請選擇設計師'}
          </button>
        </div>

        <h3 style={{marginTop: '2em'}}>步驟3：選擇服務項目</h3>
        <div style={{marginBottom: '1em'}}>
          <button 
            className="btn btn-outline" 
            onClick={() => setShowServiceModal(true)}
            style={{
              width: '100%', 
              padding: '12px', 
              textAlign: 'left',
              background: selectedService ? '#f8f9fa' : '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            {selectedService ? getSelectedServiceName() : '請選擇服務項目'}
          </button>
        </div>

        <div style={{marginTop: '2em', textAlign: 'center'}}>
          <button 
            className="btn btn-primary" 
            onClick={handleQueue} 
            disabled={loading}
            style={{fontSize: '1.1em', padding: '12px 24px'}}
          >
            {loading ? '送出中...' : '送出排隊'}
          </button>
        </div>

        {msg && <div className="error-message" style={{marginTop: '1em', textAlign: 'center'}}>{msg}</div>}
      </div>

      {/* 選擇設計師彈窗 */}
      {showDesignerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span style={{fontSize: '2rem', marginRight: '0.5em', color: '#007bff'}}>👤</span>
              <h3 style={{color: '#007bff', fontWeight: 'bold', fontSize: '1.5rem', margin: 0}}>步驟2：選擇設計師</h3>
              <button className="modal-close" onClick={() => setShowDesignerModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {designers.map(d => (
                <div
                  key={d.id}
                  className={`modal-option${selectedDesigner === d.id ? ' selected' : ''}`}
                  onClick={() => handleDesignerSelect(d.id)}
                >
                  {d.name}
                  {d.isPaused && <span style={{color: '#f44336', marginLeft: 8}}>(暫停接客)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 選擇服務項目彈窗 */}
      {showServiceModal && (
        <div className="modal-overlay">
          <div className="modal-content service-modal">
            <div className="modal-header service-header">
              <span style={{fontSize: '2rem', marginRight: '0.5em', color: '#fff'}}>💇‍♂️</span>
              <h3 style={{color: '#fff', fontWeight: 'bold', fontSize: '1.5rem', margin: 0}}>步驟3：選擇服務項目</h3>
              <button className="modal-close" onClick={() => setShowServiceModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {services.map(s => (
                <div
                  key={s.id}
                  className={`modal-option service-option${selectedService === s.id ? ' selected' : ''}`}
                  onClick={() => handleServiceSelect(s.id)}
                >
                  {s.name} <span style={{color: '#888', fontSize: '0.95em'}}> ${s.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Queue; 