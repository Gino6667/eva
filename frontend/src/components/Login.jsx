import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await axios.post('/api/login', { email, password });
      localStorage.setItem('token', res.data.token);
      const profile = await axios.get('/api/profile', { 
        headers: { Authorization: `Bearer ${res.data.token}` } 
      });
      setUser(profile.data);
      setMsg('登入成功！');
      setTimeout(() => navigate('/profile'), 800);
    } catch (err) {
      setMsg('登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>會員登入</h2>
        <form onSubmit={handleLogin}>
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
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
          {msg && (
            <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}
        </form>
        <a href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=l2007657170&redirect_uri=https://eva-36bg.onrender.com/api/line/callback&state=eva_login&scope=profile%20openid%20email`} className="btn btn-line" style={{marginTop: '1em', display: 'inline-block', background: '#06C755', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold'}}>
          使用 LINE 登入
        </a>
      </div>
    </div>
  );
}

export default Login; 