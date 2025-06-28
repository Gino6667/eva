import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    membershipLevel: 'regular',
    totalVisits: 0,
    totalSpent: 0,
    lastVisit: '',
    notes: ''
  });

  // 模擬客戶數據
  useEffect(() => {
    const mockCustomers = [
      {
        id: 1,
        name: '張美玲',
        phone: '0912-345-678',
        email: 'meiling@email.com',
        membershipLevel: 'vip',
        totalVisits: 15,
        totalSpent: 25000,
        lastVisit: '2024-01-10',
        joinDate: '2023-03-15',
        status: 'active',
        notes: '喜歡染髮，偏好暖色系'
      },
      {
        id: 2,
        name: '李雅婷',
        phone: '0923-456-789',
        email: 'yating@email.com',
        membershipLevel: 'regular',
        totalVisits: 8,
        totalSpent: 12000,
        lastVisit: '2024-01-08',
        joinDate: '2023-06-20',
        status: 'active',
        notes: '定期修剪，喜歡簡約風格'
      },
      {
        id: 3,
        name: '王曉華',
        phone: '0934-567-890',
        email: 'xiaohua@email.com',
        membershipLevel: 'premium',
        totalVisits: 25,
        totalSpent: 45000,
        lastVisit: '2024-01-12',
        joinDate: '2022-11-10',
        status: 'active',
        notes: 'VIP客戶，喜歡嘗試新造型'
      },
      {
        id: 4,
        name: '陳淑芬',
        phone: '0945-678-901',
        email: 'shufen@email.com',
        membershipLevel: 'regular',
        totalVisits: 3,
        totalSpent: 5000,
        lastVisit: '2023-12-20',
        joinDate: '2023-10-05',
        status: 'inactive',
        notes: '新客戶，需要更多關懷'
      }
    ];
    setCustomers(mockCustomers);
  }, []);

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      alert('請填寫姓名和電話');
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

  const handleEditCustomer = () => {
    if (!editingCustomer.name || !editingCustomer.phone) {
      alert('請填寫姓名和電話');
      return;
    }

    setCustomers(customers.map(customer => 
      customer.id === editingCustomer.id ? editingCustomer : customer
    ));
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (id) => {
    if (window.confirm('確定要刪除此客戶嗎？')) {
      setCustomers(customers.filter(customer => customer.id !== id));
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone.includes(searchTerm) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getMembershipColor = (level) => {
    switch (level) {
      case 'vip': return '#ffd700';
      case 'premium': return '#c0c0c0';
      default: return '#cd7f32';
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>客戶管理</h1>
        <p>管理客戶資料、查看客戶歷史記錄、分析客戶行為</p>
      </div>

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
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="請輸入姓名"
              />
            </div>
            <div className="form-group">
              <label>電話 *</label>
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="請輸入電話"
              />
            </div>
            <div className="form-group">
              <label>信箱</label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                placeholder="請輸入信箱"
              />
            </div>
            <div className="form-group">
              <label>會員等級</label>
              <select 
                value={newCustomer.membershipLevel} 
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
              value={newCustomer.notes}
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
                value={editingCustomer.name}
                onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>電話 *</label>
              <input
                type="tel"
                value={editingCustomer.phone}
                onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>信箱</label>
              <input
                type="email"
                value={editingCustomer.email}
                onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>會員等級</label>
              <select 
                value={editingCustomer.membershipLevel} 
                onChange={(e) => setEditingCustomer({...editingCustomer, membershipLevel: e.target.value})}
              >
                <option value="regular">一般會員</option>
                <option value="premium">高級會員</option>
                <option value="vip">VIP會員</option>
              </select>
            </div>
            <div className="form-group">
              <label>狀態</label>
              <select 
                value={editingCustomer.status} 
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
                value={editingCustomer.totalSpent}
                onChange={(e) => setEditingCustomer({...editingCustomer, totalSpent: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="form-group">
            <label>備註</label>
            <textarea
              value={editingCustomer.notes}
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
              <th>會員等級</th>
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
                <td>
                  <span style={{ 
                    color: getMembershipColor(customer.membershipLevel),
                    fontWeight: 'bold'
                  }}>
                    {customer.membershipLevel === 'vip' ? 'VIP' : 
                     customer.membershipLevel === 'premium' ? '高級' : '一般'}
                  </span>
                </td>
                <td>${customer.totalSpent.toLocaleString()}</td>
                <td>{customer.lastVisit || '-'}</td>
                <td>
                  <span style={{ 
                    color: customer.status === 'active' ? '#28a745' : '#6c757d',
                    fontWeight: 'bold'
                  }}>
                    {customer.status === 'active' ? '活躍' : '非活躍'}
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