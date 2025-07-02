import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Control() {
  const [accountMessage, setAccountMessage] = useState('');
  const [newAccount, setNewAccount] = useState({ name: '', password: '', role: 'designer' });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAccount, setEditAccount] = useState({});
  const token = localStorage.getItem('token');

  // 載入設計師帳號
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setAccounts(res.data.filter(u => u.role === 'designer'));
    } catch (e) {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/register', newAccount);
      setAccountMessage('新增後台帳號成功！');
      setNewAccount({ name: '', password: '', role: 'designer' });
      loadAccounts();
    } catch (error) {
      setAccountMessage(error.response?.data?.error || '新增失敗');
    }
  };

  // 編輯
  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setEditAccount({ ...acc, password: '' }); // 密碼預設空
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditAccount(prev => ({ ...prev, [name]: value }));
  };
  const handleEditSave = async () => {
    try {
      const updateData = { ...editAccount };
      if (!updateData.password) delete updateData.password; // 不改密碼時不送
      await axios.put(`/api/users/${editingId}`, updateData);
      setEditingId(null);
      setEditAccount({});
      setAccountMessage('帳號更新成功！');
      loadAccounts();
    } catch (e) {
      setAccountMessage('帳號更新失敗');
    }
  };
  const handleEditCancel = () => {
    setEditingId(null);
    setEditAccount({});
  };

  return (
    <div className="admin-container">
      <h2 className="reports-title">權限管理</h2>
      {accountMessage && (
        <div className={`message ${accountMessage.includes('成功') ? 'success' : 'error'}`}>{accountMessage}</div>
      )}
      <div className="admin-form">
        <form onSubmit={handleAddAccount}>
          <div className="form-row">
            <div className="form-group">
              <label>帳號 *</label>
              <input type="text" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} required placeholder="請輸入帳號" />
            </div>
            <div className="form-group">
              <label>密碼 *</label>
              <input type="password" value={newAccount.password} onChange={e => setNewAccount({...newAccount, password: e.target.value})} required placeholder="請輸入密碼" />
            </div>
          </div>
          <div className="form-group">
            <label>角色 *</label>
            <select value={newAccount.role} onChange={e => setNewAccount({...newAccount, role: e.target.value})} required disabled>
              <option value="designer">設計師</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="admin-btn admin-btn-primary">新增帳號</button>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => {
              setAccountMessage('');
              setNewAccount({ name: '', password: '', role: 'designer' });
            }}>清除</button>
          </div>
        </form>
      </div>
      <hr style={{margin:'2rem 0'}} />
      <h2>設計師帳號列表</h2>
      {loading ? <div>載入中...</div> : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>帳號</th>
              <th>密碼</th>
              <th>角色</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id}>
                {editingId === acc.id ? (
                  <>
                    <td><input name="name" value={editAccount.name} onChange={handleEditChange} /></td>
                    <td>{acc.email || acc.phone || ''}</td>
                    <td><input name="password" value={editAccount.password || ''} onChange={handleEditChange} /></td>
                    <td>設計師</td>
                    <td>
                      <button className="admin-btn admin-btn-primary" onClick={handleEditSave} type="button">儲存</button>
                      <button className="admin-btn admin-btn-secondary" onClick={handleEditCancel} type="button">取消</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{acc.name}</td>
                    <td>{acc.email || acc.phone || ''}</td>
                    <td>{acc.password || ''}</td>
                    <td>設計師</td>
                    <td>
                      <button className="admin-btn admin-btn-success" onClick={()=>handleEdit(acc)} type="button">編輯</button>
                      <button className="admin-btn admin-btn-danger" onClick={async()=>{
                        if(window.confirm('確定要刪除這個帳號嗎？')){
                          await axios.delete(`/api/users/${acc.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          loadAccounts();
                        }
                      }} type="button">刪除</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Control; 