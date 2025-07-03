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
  const [accountInput, setAccountInput] = useState('');

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
    
    // 管理員/設計師登入使用帳號密碼
    if (redirect === 'admin') {
      if (!account || !password) {
        setMsg('請填寫帳號和密碼');
        setLoading(false);
        return;
      }
      try {
        // 只傳 phone + password
        const loginData = { phone: account, password };
        const res = await axios.post('/api/login', loginData);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
        setMsg('登入成功！');
        setTimeout(() => {
          if (res.data.user.role === 'admin' || res.data.user.role === 'designer') {
            navigate('/admin');
          } else {
            alert('只有管理員或設計師可以進入管理系統');
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
    if (!accountInput) {
      setMsg('請填寫信箱或手機號碼');
      setLoading(false);
      return;
    }
    try {
      // 只傳 email+password 或 phone+password
      const loginData = { password };
      if (accountInput.includes('@')) {
        loginData.email = accountInput;
      } else {
        loginData.phone = accountInput;
      }
      const res = await axios.post('/api/login', loginData);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setMsg('登入成功！');
      setTimeout(() => {
        if (res.data.user.role === 'admin' || res.data.user.role === 'designer') {
          navigate('/admin');
        } else if (redirect === 'queue') {
          navigate('/queue');
        } else if (redirect === 'reservation') {
          navigate('/reservation');
        } else {
          navigate('/profile');
        }
      }, 800);
    } catch (err) {
      setMsg('登入失敗，請檢查帳號密碼');
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
        <h2>{isAdminLogin ? '管理員/設計師登入' : '會員登入'}</h2>
        <form onSubmit={handleLogin}>
          {isAdminLogin ? (
            // 管理員/設計師登入表單
            <>
              <div className="form-group">
                <label htmlFor="account">帳號</label>
                <input
                  type="text"
                  id="account"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder="請輸入管理員或設計師帳號"
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
                <label htmlFor="accountInput">信箱/手機號碼</label>
                <input
                  type="text"
                  id="accountInput"
                  value={accountInput}
                  onChange={e => setAccountInput(e.target.value)}
                  placeholder="請輸入信箱或手機號碼"
                  autoComplete="username"
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
          
          <div className="button-group" style={{ display: 'flex', justifyContent: 'center', gap: '3em', marginBottom: '0.5em' }}>
            {redirect && (
              <button 
                type="button"
                onClick={handleGoBack}
                className="btn btn-secondary"
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '1.5em' }}>
            <a
              href={`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=2007657170&redirect_uri=https%3A%2F%2Feva-36bg.onrender.com%2Fapi%2Fline%2Fcallback&state=${redirect === 'queue' ? 'eva_login_queue' : redirect === 'reservation' ? 'eva_login_reservation' : 'eva_login'}&scope=profile%20openid%20email`}
              className="line-login-btn"
              style={{ minWidth: 160 }}
            >
              使用 LINE 登入
            </a>
            <button
              className="login-register-btn"
              style={{ minWidth: 160 }}
              onClick={() => navigate(redirect ? `/register?redirect=${redirect}` : '/register')}
              type="button"
            >
              註冊會員
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default Login;
