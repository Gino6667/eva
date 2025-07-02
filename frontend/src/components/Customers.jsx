import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import axios from 'axios';

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
      axios.get('/api/users')
        .then(res => {
          const onlyCustomers = filterOnlyCustomers(res.data);
          setCustomers(onlyCustomers);
        })
        .catch(() => setCustomers([]));
  }, []);

  const handleAddCustomer = () => {
    if (!newCustomer.name || (!newCustomer.phone && !newCustomer.email)) {
      alert('請填寫姓名，且電話或信箱至少填寫一項');
      return;
    }

    const customer = {
      id: Date.now(),
      ...newCustomer,
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      totalVisits: parseInt(newCustomer.totalVisits) || 0,
      totalSpent: parseFloat(newCustomer.totalSpent) || 0
    };

    setCustomers([customer, ...customers]);

    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      membershipLevel: 'regular',
      totalVisits: 0,
      totalSpent: 0,
      lastVisit: '',
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer.name || !editingCustomer.phone) {
      alert('請填寫姓名和電話');
      return;
    }
    try {
      // 判斷是否為正式會員（id 為 10 位數以下的數字）
      if (typeof editingCustomer.id === 'number' && editingCustomer.id.toString().length < 10) {
        const token = localStorage.getItem('token');
        await axios.patch(`/api/users/${editingCustomer.id}`, editingCustomer, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      const updatedCustomers = customers.map(customer => 
      customer.id === editingCustomer.id ? editingCustomer : customer
      );
      setCustomers(updatedCustomers);
    } catch (err) {
      alert('更新失敗，請稍後再試');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('確定要刪除此客戶嗎？')) {
      // 判斷是否為測試會員（id 為 10 位數以上的數字）
      if (typeof id === 'number' && id.toString().length >= 10) {
        const updated = customers.filter(customer => customer.id !== id);
        setCustomers(updated);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const updated = customers.filter(customer => customer.id !== id);
        setCustomers(updated);
      } catch (err) {
        alert('刪除失敗，請稍後再試');
      }
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && customer.status === 'active') ||
      (filterStatus === 'inactive' && customer.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 新增測試會員
  const handleAddTestMembers = () => {
    const defaultMembers = [
      {
        id: Date.now(),
        name: '王小明',
        phone: '0912345678',
        email: 'xiaoming@example.com',
        totalVisits: 12,
        totalSpent: 15000,
        lastVisit: '2024-06-01',
        joinDate: '2023-10-10',
        status: 'active',
        notes: '常客，偏好燙髮'
      },
      {
        id: Date.now() + 1,
        name: '陳美麗',
        phone: '0922333444',
        email: 'meili@example.com',
        totalVisits: 8,
        totalSpent: 9000,
        lastVisit: '2024-05-28',
        joinDate: '2024-01-15',
        status: 'active',
        notes: '喜歡護髮'
      },
      {
        id: Date.now() + 2,
        name: '林大華',
        phone: '0933555666',
        email: 'dahua@example.com',
        totalVisits: 5,
        totalSpent: 4000,
        lastVisit: '2024-05-20',
        joinDate: '2024-03-05',
        status: 'active',
        notes: '新會員'
      }
    ];
    const existPhones = customers.map(c => c.phone);
    const existEmails = customers.map(c => c.email);
    const toAdd = defaultMembers.filter(m => !existPhones.includes(m.phone) && !existEmails.includes(m.email));
    const merged = [...customers, ...toAdd];
    setCustomers(merged);
  };

  // 過濾只顯示客戶（非設計師/管理員）
  const filterOnlyCustomers = (list) =>
    list.filter(c => !c.role || c.role === 'customer');

  return (
    <div className="admin-container">
      <h2 className="reports-title">顧客管理</h2>

      {/* 客戶統計 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{customers.length}</div>
          <div className="label">總客戶數</div>
        </div>
        <div className="stat-card">
          <div className="number">{customers.filter(c => c.status === 'active').length}</div>
          <div className="label">活躍客戶</div>
        </div>
        <div className="stat-card">
          <div className="number">{customers.filter(c => c.membershipLevel === 'vip').length}</div>
          <div className="label">VIP客戶</div>
        </div>
        <div className="stat-card">
          <div className="number">${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}</div>
          <div className="label">總消費金額</div>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="admin-filters">
        <input
          type="text"
          placeholder="搜尋客戶姓名、電話或信箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">所有狀態</option>
          <option value="active">活躍</option>
          <option value="inactive">非活躍</option>
        </select>
        <button 
          className="admin-btn admin-btn-success"
          onClick={() => setShowAddForm(true)}
        >
          新增客戶
        </button>
        <button className="admin-btn admin-btn-secondary" onClick={handleAddTestMembers} style={{marginLeft:'1rem'}}>一鍵新增3位測試會員</button>
      </div>

      {/* 新增客戶表單 */}
      {showAddForm && (
        <div className="admin-form">
          <h3>新增客戶</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>姓名 *</label>
              <input
                type="text"
                value={newCustomer.name || ''}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="請輸入姓名"
              />
            </div>
            <div className="form-group">
              <label>電話 *</label>
              <input
                type="tel"
                value={newCustomer.phone || ''}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="請輸入電話"
              />
            </div>
            <div className="form-group">
              <label>信箱</label>
              <input
                type="email"
                value={newCustomer.email || ''}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="請輸入信箱"
              />
            </div>
            <div className="form-group">
              <label>會員等級</label>
              <select 
                value={newCustomer.membershipLevel || ''} 
                onChange={(e) => setNewCustomer({...newCustomer, membershipLevel: e.target.value})}
              >
                <option value="regular">一般會員</option>
                <option value="premium">高級會員</option>
                <option value="vip">VIP會員</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>備註</label>
            <textarea
              value={newCustomer.notes || ''}
              onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
              placeholder="請輸入備註"
              rows="3"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="admin-btn admin-btn-success" onClick={handleAddCustomer}>
              新增
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={() => setShowAddForm(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 編輯客戶表單 */}
      {editingCustomer && (
        <div className="admin-form">
          <h3>編輯客戶資料</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label>姓名 *</label>
              <input
                type="text"
                value={editingCustomer.name || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>電話 *</label>
              <input
                type="tel"
                value={editingCustomer.phone || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>信箱</label>
              <input
                type="email"
                value={editingCustomer.email || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>狀態</label>
              <select 
                value={editingCustomer.status || ''} 
                onChange={(e) => setEditingCustomer({...editingCustomer, status: e.target.value})}
              >
                <option value="active">活躍</option>
                <option value="inactive">非活躍</option>
              </select>
            </div>
            <div className="form-group">
              <label>總消費金額</label>
              <input
                type="number"
                value={editingCustomer.totalSpent || ''}
                onChange={(e) => setEditingCustomer({...editingCustomer, totalSpent: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="form-group">
            <label>備註</label>
            <textarea
              value={editingCustomer.notes || ''}
              onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})}
              rows="3"
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="admin-btn admin-btn-success" onClick={handleEditCustomer}>
              儲存
            </button>
            <button className="admin-btn admin-btn-secondary" onClick={() => setEditingCustomer(null)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 客戶列表 */}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>電話</th>
              <th>信箱</th>
              <th>總消費</th>
              <th>最後到訪</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map(customer => (
              <tr key={customer.id}>
                <td style={{ fontWeight: 'bold' }}>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.email || '-'}</td>
                <td>${(Number(customer.totalSpent) || 0).toLocaleString()}</td>
                <td>{customer.lastVisit || '-'}</td>
                <td>
                  <span style={{ 
                    color: customer.status === 'active' ? '#28a745' : customer.status === 'inactive' ? '#6c757d' : '#888',
                    fontWeight: 'bold'
                  }}>
                    {customer.status === 'active'
                      ? '活躍'
                      : customer.status === 'inactive'
                        ? '非活躍'
                        : '-'}
                  </span>
                </td>
                <td>
                  <button 
                    className="admin-btn admin-btn-warning" 
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => setEditingCustomer(customer)}
                  >
                    編輯
                  </button>
                  <button 
                    className="admin-btn admin-btn-danger" 
                    style={{ fontSize: '0.8rem' }}
                    onClick={() => handleDeleteCustomer(customer.id)}
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            上一頁
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={currentPage === page ? 'active' : ''}
            >
              {page}
            </button>
          ))}
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            下一頁
          </button>
        </div>
      )}

      {/* 返回按鈕 */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button className="admin-btn admin-btn-secondary" onClick={() => navigate('/admin')}>
          返回管理後台
        </button>
      </div>
    </div>
  );
}

export default Customers; 