import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
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

  const handleNext = () => {
    if (step === 1) {
      if (isMember === null) {
        setMsg('請選擇訪客或會員');
        return;
      }
      if (!isMember && (!guestName || !guestPhone)) {
        setMsg('請輸入姓名與電話');
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
        guestName: !isMember ? guestName : undefined,
        guestPhone: !isMember ? guestPhone : undefined
      });
      setQueueResult(res.data);
      setStep(4);
    } catch (err) {
      setMsg(err.response?.data?.error || '排隊失敗');
    } finally {
      setLoading(false);
    }
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
            <button className={`btn ${isMember === true ? 'btn-primary' : ''}`} onClick={() => setIsMember(true)} style={{marginLeft: '1em'}}>會員</button>
          </div>
          {isMember === false && (
            <div style={{marginBottom: '1em'}}>
              <input type="text" placeholder="姓名" value={guestName} onChange={e => setGuestName(e.target.value)} style={{marginRight: '1em'}} />
              <input type="text" placeholder="電話" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
            </div>
          )}
          {isMember === true && !user && (
            <div style={{marginBottom: '1em'}}>
              <p>請先登入會員</p>
              <Link to="/login" className="btn btn-secondary">前往登入</Link>
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