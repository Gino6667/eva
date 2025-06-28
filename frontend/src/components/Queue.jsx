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
    } catch (err) {
      setMsg(err.response?.data?.error || '排隊失敗');
    } finally {
      setLoading(false);
    }
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
          <Link to="/" className="btn btn-primary">回首頁</Link>
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
          <select 
            value={selectedDesigner} 
            onChange={e => setSelectedDesigner(e.target.value)}
            style={{width: '100%', padding: '8px'}}
          >
            <option value="">請選擇設計師</option>
            {designers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <h3 style={{marginTop: '2em'}}>步驟3：選擇服務項目</h3>
        <div style={{marginBottom: '1em'}}>
          <select 
            value={selectedService} 
            onChange={e => setSelectedService(e.target.value)}
            style={{width: '100%', padding: '8px'}}
          >
            <option value="">請選擇服務項目</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
            ))}
          </select>
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
    </div>
  );
}

export default Queue; 