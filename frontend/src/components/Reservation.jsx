import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Reservation.css';

function Reservation() {
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
  const [showDesignerModal, setShowDesignerModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
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

  const handleReservation = async () => {
    if (!user) {
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
      const res = await axios.post('/api/reservations', {
        designerId: selectedDesigner,
        serviceId: selectedService,
        userId: user.id,
        date: new Date().toISOString().split('T')[0], // 今天
        time: '09:00' // 預設時間
      });
      setReservationResult(res.data);
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

  if (reservationResult) {
    return (
      <div className="reservation-container">
        <div className="reservation-header">
          <h2>線上預約</h2>
          <p>預約成功！</p>
        </div>
        <div className="reservation-step">
          <h3>預約成功！</h3>
          <p>您的預約已成功建立</p>
          <p>預約編號：<span style={{fontWeight: 'bold', fontSize: '1.2em'}}>{reservationResult.id}</span></p>
          <p>請留意手機簡訊或 Email 通知。</p>
          <Link to="/" className="btn btn-primary">回首頁</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-container">
      <div className="reservation-header">
        <h2>線上預約</h2>
        <p>完成以下步驟即可線上預約</p>
      </div>

      <div className="reservation-step">
        <h3>步驟1：會員登入</h3>
        {user ? (
          <div style={{marginBottom: '2em', padding: '1em', background: '#e8f5e8', borderRadius: '4px'}}>
            <p style={{margin: '0', color: '#2d5a2d'}}>
              ✓ 已登入會員：{user.name}
            </p>
          </div>
        ) : (
          <div style={{marginBottom: '2em'}}>
            <p>請先登入會員才能使用預約功能</p>
            <div style={{marginBottom: '1em'}}>
              <button className="btn btn-primary" onClick={handleLogin} style={{marginRight: '1em'}}>
                登入會員
              </button>
              <button className="btn btn-secondary" onClick={handleRegister}>
                註冊會員
              </button>
            </div>
            <a href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=l2007657170&redirect_uri=https://eva-36bg.onrender.com/api/line/callback&state=eva_login_reservation&scope=profile%20openid%20email`} className="btn btn-line" style={{marginTop: '1em', display: 'inline-block', background: '#06C755', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold'}}>
              使用 LINE 登入
            </a>
            <div style={{marginTop: '1em', padding: '1em', background: '#f5f5f5', borderRadius: '4px'}}>
              <h4 style={{margin: '0 0 0.5em 0', color: '#333'}}>會員權益：</h4>
              <ul style={{margin: '0', paddingLeft: '1.5em', color: '#666'}}>
                <li>線上預約服務</li>
                <li>預約記錄查詢</li>
              </ul>
            </div>
          </div>
        )}

        <h3>步驟2：選擇設計師</h3>
        <div style={{marginBottom: '2em'}}>
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

        <h3>步驟3：選擇服務項目</h3>
        <div style={{marginBottom: '2em'}}>
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

        <div style={{textAlign: 'center'}}>
          <button 
            className="btn btn-primary" 
            onClick={handleReservation} 
            disabled={loading}
            style={{fontSize: '1.1em', padding: '12px 24px'}}
          >
            {loading ? '送出中...' : '送出預約'}
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

export default Reservation; 