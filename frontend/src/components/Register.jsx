import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

function Register({ setUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      await axios.post('/api/register', { name, email, password });
      const res = await axios.post('/api/login', { email, password });
      localStorage.setItem('token', res.data.token);
      const profile = await axios.get('/api/profile', { 
        headers: { Authorization: `Bearer ${res.data.token}` } 
      });
      setUser(profile.data);
      setMsg('註冊成功！');
      
      // 檢查是否有重定向參數
      const redirect = searchParams.get('redirect');
      setTimeout(() => {
        if (redirect === 'queue') {
          navigate('/queue');
        } else if (redirect === 'reservation') {
          navigate('/reservation');
        } else {
          navigate('/profile');
        }
      }, 800);
    } catch (err) {
      setMsg('註冊失敗，Email 可能已被註冊');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    const redirect = searchParams.get('redirect');
    if (redirect === 'queue') {
      navigate('/queue');
    } else if (redirect === 'reservation') {
      navigate('/reservation');
    } else {
      navigate('/');
    }
  };

  const redirect = searchParams.get('redirect');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>會員註冊</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="請輸入姓名"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="請輸入Email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密碼</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="請輸入密碼"
            />
          </div>
          <div className="button-group">
            {redirect && (
              <button 
                type="button"
                onClick={handleGoBack}
                className="btn btn-secondary"
                style={{marginRight: '1em'}}
              >
                返回
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '註冊中...' : '註冊'}
            </button>
          </div>
          {msg && (
            <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Register;