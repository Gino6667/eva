import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 處理 LINE 登入回調
  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    const redirect = searchParams.get('redirect');

    if (token && success === 'true') {
      // LINE 登入成功
      localStorage.setItem('token', token);
      setUser({ token }); // 暫時設定，稍後會從 profile API 取得完整資料
      setMsg('LINE 登入成功！');
      setTimeout(() => {
        if (redirect === 'queue') {
          navigate('/queue');
        } else if (redirect === 'reservation') {
          navigate('/reservation');
        } else if (redirect === 'admin') {
          // LINE登入需要額外檢查用戶角色
          navigate('/admin');
        } else {
          navigate('/profile');
        }
      }, 800);
    } else if (error === 'line_login_failed') {
      setMsg('LINE 登入失敗，請稍後再試');
    }
  }, [searchParams, setUser, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    const redirect = searchParams.get('redirect');
    
    // 管理員登入使用帳號密碼
    if (redirect === 'admin') {
      if (!account || !password) {
        setMsg('請填寫帳號和密碼');
        setLoading(false);
        return;
      }
      
      try {
        const loginData = { 
          phone: account, // 管理員帳號使用phone欄位
          password 
        };

        const res = await axios.post('/api/login', loginData);
        localStorage.setItem('token', res.data.token);
        
        setUser(res.data.user);
        setMsg('登入成功！');
        
        setTimeout(() => {
          if (res.data.user.role === 'admin') {
            navigate('/admin');
          } else {
            alert('只有管理員可以進入管理系統');
            navigate('/profile');
          }
        }, 800);
      } catch (err) {
        setMsg('登入失敗，請檢查帳號密碼');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 一般會員登入
    if (!email && !phone) {
      setMsg('請填寫手機號碼或信箱至少一項');
      setLoading(false);
      return;
    }

    try {
      const loginData = { password };
      if (email) {
        loginData.email = email;
      } else {
        loginData.phone = phone;
      }

      const res = await axios.post('/api/login', loginData);
      localStorage.setItem('token', res.data.token);
      
      setUser(res.data.user);
      setMsg('登入成功！');
      
      setTimeout(() => {
        if (redirect === 'queue') {
          navigate('/queue');
        } else if (redirect === 'reservation') {
          navigate('/reservation');
        } else if (res.data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/profile');
        }
      }, 800);
    } catch (err) {
      setMsg('登入失敗，請檢查帳號密碼');
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
    } else if (redirect === 'admin') {
      navigate('/');
    } else {
      navigate('/');
    }
  };

  const redirect = searchParams.get('redirect');
  const isAdminLogin = redirect === 'admin';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isAdminLogin ? '管理員登入' : '會員登入'}</h2>
        <form onSubmit={handleLogin}>
          {isAdminLogin ? (
            // 管理員登入表單
            <>
              <div className="form-group">
                <label htmlFor="account">帳號</label>
                <input
                  type="text"
                  id="account"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder="請輸入管理員帳號"
                  required
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
            </>
          ) : (
            // 一般會員登入表單
            <>
              <div className="form-group">
                <label htmlFor="email">信箱 (選填)</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="請輸入信箱"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">手機號碼 (選填)</label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="請輸入手機號碼"
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
              <div style={{ 
                background: '#f8f9fa', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                marginBottom: '1rem',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <strong>注意：</strong>信箱和手機號碼至少需要填寫一項
              </div>
            </>
          )}
          
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
              {loading ? '登入中...' : '登入'}
            </button>
          </div>
          {msg && (
            <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}
        </form>
        
        {!isAdminLogin && (
          <a href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=l2007657170&redirect_uri=https://eva-36bg.onrender.com/api/line/callback&state=${redirect === 'queue' ? 'eva_login_queue' : redirect === 'reservation' ? 'eva_login_reservation' : redirect === 'admin' ? 'eva_login_admin' : 'eva_login'}&scope=profile%20openid%20email`} className="btn btn-line" style={{marginTop: '1em', display: 'inline-block', background: '#06C755', color: '#fff', padding: '10px 20px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold'}}>
            使用 LINE 登入
          </a>
        )}
        <div className="login-extra-bar">
          <button className="login-reserve-btn" onClick={() => navigate('/reservation')}>
            還不是會員？立即註冊享受線上預約
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;