import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Reservation.css';

function Reservation() {
  const [step, setStep] = useState(1);
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
  const [reservationResult, setReservationResult] = useState(null);
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

  const handleNext = () => {
    if (step === 1) {
      if (!user) {
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

  const handleReservation = async () => {
    setLoading(true);
    setMsg('');
    try {
      const res = await axios.post('/api/reservations', {
        designerId: selectedDesigner,
        serviceId: selectedService,
        userId: user.id,
        date: new Date().toISOString().split('T')[0], // 今天
        time: '09:00' // 預設時間
      });
      setReservationResult(res.data);
      setStep(4);
    } catch (err) {
      setMsg(err.response?.data?.error || '預約失敗');
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

  return (
    <div className="reservation-container">
      <div className="reservation-header">
        <h2>線上預約</h2>
        <p>依步驟完成線上預約</p>
      </div>

      {step === 1 && (
        <div className="reservation-step">
          <h3>步驟1：會員登入</h3>
          {user ? (
            <div style={{marginBottom: '1em', padding: '1em', background: '#e8f5e8', borderRadius: '4px'}}>
              <p style={{margin: '0', color: '#2d5a2d'}}>
                ✓ 已登入會員：{user.name}
              </p>
            </div>
          ) : (
            <div style={{marginBottom: '1em'}}>
              <p>請先登入會員才能使用預約功能</p>
              <div style={{marginBottom: '1em'}}>
                <button className="btn btn-primary" onClick={handleLogin} style={{marginRight: '1em'}}>
                  登入會員
                </button>
                <button className="btn btn-secondary" onClick={handleRegister}>
                  註冊會員
                </button>
              </div>
              <div style={{marginTop: '1em', padding: '1em', background: '#f5f5f5', borderRadius: '4px'}}>
                <h4 style={{margin: '0 0 0.5em 0', color: '#333'}}>會員權益：</h4>
                <ul style={{margin: '0', paddingLeft: '1.5em', color: '#666'}}>
                  <li>線上預約服務</li>
                  <li>預約記錄查詢</li>
                  <li>會員專屬優惠</li>
                  <li>個人資料管理</li>
                </ul>
              </div>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleNext}>下一步</button>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}

      {step === 2 && (
        <div className="reservation-step">
          <h3>步驟2：選擇設計師</h3>
          <div style={{marginBottom: '1em'}}>
            <label style={{display: 'block', marginBottom: '0.5em', fontWeight: 'bold'}}>設計師：</label>
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
          <div style={{marginTop: '1em'}}>
            <button className="btn btn-secondary" onClick={handlePrev}>上一步</button>
            <button className="btn btn-primary" onClick={handleNext} style={{marginLeft: '1em'}}>下一步</button>
          </div>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}

      {step === 3 && (
        <div className="reservation-step">
          <h3>步驟3：選擇服務項目</h3>
          <div style={{marginBottom: '1em'}}>
            <label style={{display: 'block', marginBottom: '0.5em', fontWeight: 'bold'}}>服務項目：</label>
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
          <div style={{marginTop: '1em'}}>
            <button className="btn btn-secondary" onClick={handlePrev}>上一步</button>
            <button className="btn btn-primary" onClick={handleReservation} style={{marginLeft: '1em'}} disabled={loading}>
              {loading ? '送出中...' : '送出預約'}
            </button>
          </div>
          {msg && <div className="error-message">{msg}</div>}
        </div>
      )}

      {step === 4 && reservationResult && (
        <div className="reservation-step">
          <h3>預約成功！</h3>
          <p>您的預約已成功建立</p>
          <p>預約編號：<span style={{fontWeight: 'bold', fontSize: '1.2em'}}>{reservationResult.id}</span></p>
          <p>請留意手機簡訊或 Email 通知。</p>
          <Link to="/" className="btn btn-primary">回首頁</Link>
        </div>
      )}
    </div>
  );
}

export default Reservation; 