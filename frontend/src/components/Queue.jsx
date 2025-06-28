import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './Queue.css';

function Queue() {
  const [step, setStep] = useState(1);
  const [isMember, setIsMember] = useState(null);
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  });
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
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

  const handleNext = () => {
    if (step === 1) {
      if (isMember === null) {
        setMsg('請選擇訪客或會員');
        return;
      }
      if (isMember && !user) {
        setMsg('請先登入會員');
        return;
      }
    }
    if (step === 2 && !selectedDesigner) {
      setMsg('請選擇設計師');
      return;
    }
    if (step === 3 && !selectedService) {
      setMsg('請選擇服務項目');
      return;
    }
    setMsg('');
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleQueue = async () => {
    setLoading(true);
    setMsg('');
    try {
      let userId = null;
      if (isMember && user) userId = user.id;
      const res = await axios.post('/api/queue', {
        designerId: selectedDesigner,
        serviceId: selectedService,
        type: 'onsite',
        userId,
        guestName: !isMember && guestName ? guestName : undefined,
        guestPhone: !isMember && guestPhone ? guestPhone : undefined
      });
      setQueueResult(res.data);
      setStep(4);
    } catch (err) {
      setMsg(err.response?.data?.error || '排隊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleLineLogin = () => {
    const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=l2007657170&redirect_uri=https://eva-36bg.onrender.com/api/line/callback&state=eva_login_queue&scope=profile%20openid%20email`;
    window.location.href = lineLoginUrl;
  };

  return (
    <div className="queue-container">
      <div className="queue-header">
        <h2>現場排隊</h2>
        <p>依步驟完成現場排隊登記</p>
      </div>
      {step === 1 && (
        <div className="queue-step">
          <h3>步驟1：選擇訪客或會員</h3>
          <div style={{marginBottom: '1em'}}>
            <button className={`btn ${isMember === false ? 'btn-primary' : ''}`} onClick={() => setIsMember(false)}>訪客</button>
            <button className={`btn ${isMember === true ? 'btn-primary' : ''}`} onClick={handleMemberSelect} style={{marginLeft: '1em'}}>會員</button>
          </div>
          {isMember === false && (
            <div style={{marginBottom: '1em'}}>
              <p style={{color: '#666', fontSize: '0.9em', marginBottom: '0.5em'}}>
                可選擇性輸入個人資料（非必填）
              </p>
              <input 
                type="text" 
                placeholder="姓名（選填）" 
                value={guestName} 
                onChange={e => setGuestName(e.target.value)} 
                style={{marginRight: '1em'}} 
              />
              <input 
                type="text" 
                placeholder="電話（選填）" 
                value={guestPhone} 
                onChange={e => setGuestPhone(e.target.value)} 
              />
            </div>
          )}
          {isMember === true && !user && (
            <div style={{marginBottom: '1em'}}>
              <p>請選擇登入方式：</p>
              <div style={{marginBottom: '1em'}}>
                <button 
                  className="btn btn-line" 
                  onClick={handleLineLogin}
                  style={{
                    background: '#06C755', 
                    color: '#fff', 
                    padding: '10px 20px', 
                    borderRadius: '4px', 
                    border: 'none',
                    fontWeight: 'bold',
                    marginRight: '1em'
                  }}
                >
                  LINE 登入
                </button>
                <Link to="/login" className="btn btn-secondary">一般登入</Link>
              </div>
              <div style={{marginTop: '1em', padding: '1em', background: '#f5f5f5', borderRadius: '4px'}}>
                <h4 style={{margin: '0 0 0.5em 0', color: '#333'}}>LINE 登入說明：</h4>
                <ol style={{margin: '0', paddingLeft: '1.5em', color: '#666'}}>
                  <li>點擊「LINE 登入」按鈕</li>
                  <li>使用 LINE App 掃描 QR Code</li>
                  <li>授權登入後自動返回</li>
                  <li>完成會員身份驗證</li>
                </ol>
              </div>
            </div>
          )}
          {isMember === true && user && (
            <div style={{marginBottom: '1em', padding: '1em', background: '#e8f5e8', borderRadius: '4px'}}>
              <p style={{margin: '0', color: '#2d5a2d'}}>
                ✓ 已登入會員：{user.name}
              </p>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleNext}>下一步</button>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}
      {step === 2 && (
        <div className="queue-step">
          <h3>步驟2：選擇設計師</h3>
          <select value={selectedDesigner} onChange={e => setSelectedDesigner(e.target.value)}>
            <option value="">請選擇設計師</option>
            {designers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div style={{marginTop: '1em'}}>
            <button className="btn btn-secondary" onClick={handlePrev}>上一步</button>
            <button className="btn btn-primary" onClick={handleNext} style={{marginLeft: '1em'}}>下一步</button>
          </div>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}
      {step === 3 && (
        <div className="queue-step">
          <h3>步驟3：選擇服務項目</h3>
          <select value={selectedService} onChange={e => setSelectedService(e.target.value)}>
            <option value="">請選擇服務項目</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} - ${s.price}</option>
            ))}
          </select>
          <div style={{marginTop: '1em'}}>
            <button className="btn btn-secondary" onClick={handlePrev}>上一步</button>
            <button className="btn btn-primary" onClick={handleQueue} style={{marginLeft: '1em'}} disabled={loading}>{loading ? '送出中...' : '送出排隊'}</button>
          </div>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}
      {step === 4 && queueResult && (
        <div className="queue-step">
          <h3>排隊成功！</h3>
          <p>您的號碼牌：<span style={{fontWeight: 'bold', fontSize: '1.5em'}}>{queueResult.number}</span></p>
          <p>請留意現場叫號或手機通知。</p>
          <Link to="/" className="btn btn-primary">回首頁</Link>
        </div>
      )}
    </div>
  );
}

export default Queue; 