import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Reservation.css';

function Reservation() {
  const [user] = useState(() => {
    const token = localStorage.getItem('token');
    return token ? JSON.parse(atob(token.split('.')[1])) : null;
  });
  const [designers, setDesigners] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDesigners();
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedDesigner]);

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

  const loadAvailableSlots = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const params = { date: selectedDate };
      if (selectedDesigner) params.designerId = selectedDesigner;
      const res = await axios.get('/api/available-slots', { params });
      setAvailableSlots(res.data);
    } catch (err) {
      console.error('載入可預約時段失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReservation = async (e) => {
    e.preventDefault();
    if (!user) {
      setMsg('請先登入');
      return;
    }
    if (!selectedDate || !selectedSlot || !selectedService) {
      setMsg('請填寫完整資料');
      return;
    }

    setLoading(true);
    setMsg('');
    try {
      await axios.post('/api/reservations', {
        designerId: selectedDesigner || 0,
        serviceId: selectedService,
        userId: user.id,
        date: selectedDate,
        time: selectedSlot
      });
      setMsg('預約成功！');
      setSelectedDate('');
      setSelectedDesigner('');
      setSelectedService('');
      setSelectedSlot('');
      setAvailableSlots([]);
    } catch (err) {
      setMsg(err.response?.data?.error || '預約失敗');
    } finally {
      setLoading(false);
    }
  };

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const dayName = dayNames[date.getDay()];
      options.push({
        value: dateStr,
        label: `${dateStr} (週${dayName})`
      });
    }
    return options;
  };

  if (!user) {
    const LINE_LOGIN_URL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=l2007657170&redirect_uri=https://eva-36bg.onrender.com/api/line/callback&state=eva_login&scope=profile%20openid%20email`;
    return (
      <div className="reservation-container">
        <div className="auth-card">
          <h2>線上預約</h2>
          <p>請先登入才能使用預約功能</p>
          <Link to="/login" className="btn btn-primary">前往登入</Link>
          <a href={LINE_LOGIN_URL} className="btn btn-line" style={{marginTop: '1em', display: 'inline-block', background: '#06C755', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold'}}>
            使用 LINE 登入
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="reservation-container">
      <div className="reservation-header">
        <h2>線上預約</h2>
        <p>選擇您喜歡的設計師與服務時段</p>
      </div>

      <form onSubmit={handleReservation} className="reservation-form">
        <div className="form-group">
          <label>預約日期</label>
          <select 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            required
          >
            <option value="">請選擇日期</option>
            {getDateOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>設計師（可選）</label>
          <select 
            value={selectedDesigner} 
            onChange={e => setSelectedDesigner(e.target.value)}
          >
            <option value="">不指定設計師</option>
            {designers.map(designer => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>服務項目</label>
          <select 
            value={selectedService} 
            onChange={e => setSelectedService(e.target.value)}
            required
          >
            <option value="">請選擇服務</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name} - ${service.price}
              </option>
            ))}
          </select>
        </div>

        {selectedDate && (
          <div className="form-group">
            <label>可預約時段</label>
            {loading ? (
              <div className="loading">載入中...</div>
            ) : availableSlots.length === 0 ? (
              <div className="no-slots">該日期無可預約時段</div>
            ) : (
              <div className="time-slots">
                {availableSlots.map(slot => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.time)}
                    className={`time-slot ${selectedSlot === slot.time ? 'selected' : ''}`}
                  >
                    {slot.time}<br/>
                    <small>剩餘 {slot.availableSeats} 位</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !selectedDate || !selectedSlot || !selectedService}
        >
          {loading ? '預約中...' : '確認預約'}
        </button>

        {msg && (
          <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}

export default Reservation; 