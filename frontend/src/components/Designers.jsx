import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Designers() {
  const navigate = useNavigate();
  const [designers, setDesigners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDesigner, setEditingDesigner] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  
  const [newDesigner, setNewDesigner] = useState({
    name: '',
    phone: '',
    email: '',
    specialty: '',
    experience: '',
    hourlyRate: '',
    status: 'active',
    notes: ''
  });

  // 模擬設計師數據
  useEffect(() => {
    const mockDesigners = [
      {
        id: 1,
        name: '林美華',
        phone: '0911-111-111',
        email: 'meihua@salon.com',
        specialty: '染髮、燙髮',
        experience: '8年',
        hourlyRate: 800,
        status: 'active',
        joinDate: '2020-03-15',
        totalCustomers: 156,
        totalRevenue: 125000,
        rating: 4.8,
        notes: '擅長日系染髮，客戶評價很高'
      },
      {
        id: 2,
        name: '王雅婷',
        phone: '0922-222-222',
        email: 'yating@salon.com',
        specialty: '剪髮、造型',
        experience: '5年',
        hourlyRate: 600,
        status: 'active',
        joinDate: '2021-06-20',
        totalCustomers: 98,
        totalRevenue: 78000,
        rating: 4.6,
        notes: '擅長短髮造型，年輕客戶居多'
      },
      {
        id: 3,
        name: '張曉雯',
        phone: '0933-333-333',
        email: 'xiaowen@salon.com',
        specialty: '燙髮、護理',
        experience: '10年',
        hourlyRate: 1000,
        status: 'active',
        joinDate: '2018-11-10',
        totalCustomers: 203,
        totalRevenue: 180000,
        rating: 4.9,
        notes: '資深設計師，擅長各種燙髮技術'
      },
      {
        id: 4,
        name: '陳淑芬',
        phone: '0944-444-444',
        email: 'shufen@salon.com',
        specialty: '染髮、護理',
        experience: '3年',
        hourlyRate: 500,
        status: 'inactive',
        joinDate: '2022-01-05',
        totalCustomers: 45,
        totalRevenue: 22000,
        rating: 4.3,
        notes: '新進設計師，正在培訓中'
      }
    ];
    setDesigners(mockDesigners);
  }, []);

  const handleAddDesigner = () => {
    if (!newDesigner.name || !newDesigner.phone) {
      alert('請填寫姓名和電話');
      return;
    }

    const designer = {
      id: Date.now(),
      ...newDesigner,
      joinDate: new Date().toISOString().split('T')[0],
      totalCustomers: 0,
      totalRevenue: 0,
      rating: 0,
      hourlyRate: parseFloat(newDesigner.hourlyRate) || 0
    };

    setDesigners([designer, ...designers]);
    setNewDesigner({
      name: '',
      phone: '',
      email: '',
      specialty: '',
      experience: '',
      hourlyRate: '',
      status: 'active',
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleEditDesigner = () => {
    if (!editingDesigner.name || !editingDesigner.phone) {
      alert('請填寫姓名和電話');
      return;
    }

    setDesigners(designers.map(designer => 
      designer.id === editingDesigner.id ? editingDesigner : designer
    ));
    setEditingDesigner(null);
  };

  const handleDeleteDesigner = (id) => {
    if (window.confirm('確定要刪除此設計師嗎？')) {
      setDesigners(designers.filter(designer => designer.id !== id));
    }
  };

  const filteredDesigners = designers.filter(designer => {
    const matchesSearch = designer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         designer.phone.includes(searchTerm) ||
                         designer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         designer.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || designer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDesigners.length / itemsPerPage);
  const paginatedDesigners = filteredDesigners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>設計師管理</h1>
        <p>管理設計師資料、排班設定、績效統計</p>
      </div>

      {/* 設計師統計 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{designers.length}</div>
          <div className="label">總設計師數</div>
        </div>
        <div className="stat-card">
          <div className="number">{designers.filter(d => d.status === 'active').length}</div>
          <div className="label">在職設計師</div>
        </div>
        <div className="stat-card">
          <div className="number">${designers.reduce((sum, d) => sum + d.totalRevenue, 0).toLocaleString()}</div>
          <div className="label">總營收</div>
        </div>
        <div className="stat-card">
          <div className="number">{(designers.reduce((sum, d) => sum + d.rating, 0) / designers.length).toFixed(1)}</div>
          <div className="label">平均評分</div>
        </div>
      </div>

      {/* 標籤頁 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`admin-btn ${activeTab === 'list' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('list')}
        >
          設計師列表
        </button>
        <button 
          className={`admin-btn ${activeTab === 'schedule' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('schedule')}
        >
          排班管理
        </button>
        <button 
          className={`admin-btn ${activeTab === 'performance' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('performance')}
        >
          績效統計
        </button>
      </div>

      {/* 設計師列表 */}
      {activeTab === 'list' && (
        <div>
          {/* 搜尋和篩選 */}
          <div className="admin-filters">
            <input
              type="text"
              placeholder="搜尋設計師姓名、電話、專長..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">所有狀態</option>
              <option value="active">在職</option>
              <option value="inactive">離職</option>
            </select>
            <button 
              className="admin-btn admin-btn-success"
              onClick={() => setShowAddForm(true)}
            >
              新增設計師
            </button>
          </div>

          {/* 新增設計師表單 */}
          {showAddForm && (
            <div className="admin-form">
              <h3>新增設計師</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={newDesigner.name}
                    onChange={(e) => setNewDesigner({...newDesigner, name: e.target.value})}
                    placeholder="請輸入姓名"
                  />
                </div>
                <div className="form-group">
                  <label>電話 *</label>
                  <input
                    type="tel"
                    value={newDesigner.phone}
                    onChange={(e) => setNewDesigner({...newDesigner, phone: e.target.value})}
                    placeholder="請輸入電話"
                  />
                </div>
                <div className="form-group">
                  <label>信箱</label>
                  <input
                    type="email"
                    value={newDesigner.email}
                    onChange={(e) => setNewDesigner({...newDesigner, email: e.target.value})}
                    placeholder="請輸入信箱"
                  />
                </div>
                <div className="form-group">
                  <label>專長</label>
                  <input
                    type="text"
                    value={newDesigner.specialty}
                    onChange={(e) => setNewDesigner({...newDesigner, specialty: e.target.value})}
                    placeholder="請輸入專長"
                  />
                </div>
                <div className="form-group">
                  <label>經驗年資</label>
                  <input
                    type="text"
                    value={newDesigner.experience}
                    onChange={(e) => setNewDesigner({...newDesigner, experience: e.target.value})}
                    placeholder="請輸入經驗年資"
                  />
                </div>
                <div className="form-group">
                  <label>時薪</label>
                  <input
                    type="number"
                    value={newDesigner.hourlyRate}
                    onChange={(e) => setNewDesigner({...newDesigner, hourlyRate: e.target.value})}
                    placeholder="請輸入時薪"
                  />
                </div>
                <div className="form-group">
                  <label>狀態</label>
                  <select 
                    value={newDesigner.status} 
                    onChange={(e) => setNewDesigner({...newDesigner, status: e.target.value})}
                  >
                    <option value="active">在職</option>
                    <option value="inactive">離職</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>備註</label>
                <textarea
                  value={newDesigner.notes}
                  onChange={(e) => setNewDesigner({...newDesigner, notes: e.target.value})}
                  placeholder="請輸入備註"
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={handleAddDesigner}>
                  新增
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowAddForm(false)}>
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 編輯設計師表單 */}
          {editingDesigner && (
            <div className="admin-form">
              <h3>編輯設計師資料</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={editingDesigner.name}
                    onChange={(e) => setEditingDesigner({...editingDesigner, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>電話 *</label>
                  <input
                    type="tel"
                    value={editingDesigner.phone}
                    onChange={(e) => setEditingDesigner({...editingDesigner, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>信箱</label>
                  <input
                    type="email"
                    value={editingDesigner.email}
                    onChange={(e) => setEditingDesigner({...editingDesigner, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>專長</label>
                  <input
                    type="text"
                    value={editingDesigner.specialty}
                    onChange={(e) => setEditingDesigner({...editingDesigner, specialty: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>經驗年資</label>
                  <input
                    type="text"
                    value={editingDesigner.experience}
                    onChange={(e) => setEditingDesigner({...editingDesigner, experience: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>時薪</label>
                  <input
                    type="number"
                    value={editingDesigner.hourlyRate}
                    onChange={(e) => setEditingDesigner({...editingDesigner, hourlyRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>狀態</label>
                  <select 
                    value={editingDesigner.status} 
                    onChange={(e) => setEditingDesigner({...editingDesigner, status: e.target.value})}
                  >
                    <option value="active">在職</option>
                    <option value="inactive">離職</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>備註</label>
                <textarea
                  value={editingDesigner.notes}
                  onChange={(e) => setEditingDesigner({...editingDesigner, notes: e.target.value})}
                  rows="3"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={handleEditDesigner}>
                  儲存
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setEditingDesigner(null)}>
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 設計師列表表格 */}
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>電話</th>
                  <th>專長</th>
                  <th>經驗</th>
                  <th>時薪</th>
                  <th>客戶數</th>
                  <th>總營收</th>
                  <th>評分</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDesigners.map(designer => (
                  <tr key={designer.id}>
                    <td style={{ fontWeight: 'bold' }}>{designer.name}</td>
                    <td>{designer.phone}</td>
                    <td>{designer.specialty}</td>
                    <td>{designer.experience}</td>
                    <td>${designer.hourlyRate}</td>
                    <td>{designer.totalCustomers}</td>
                    <td>${designer.totalRevenue.toLocaleString()}</td>
                    <td>
                      <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                        ⭐ {designer.rating}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        color: designer.status === 'active' ? '#28a745' : '#6c757d',
                        fontWeight: 'bold'
                      }}>
                        {designer.status === 'active' ? '在職' : '離職'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="admin-btn admin-btn-warning" 
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => setEditingDesigner(designer)}
                      >
                        編輯
                      </button>
                      <button 
                        className="admin-btn admin-btn-danger" 
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => handleDeleteDesigner(designer.id)}
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
        </div>
      )}

      {/* 排班管理 */}
      {activeTab === 'schedule' && (
        <div className="admin-form">
          <h3>排班管理</h3>
          <p>排班管理功能正在開發中...</p>
        </div>
      )}

      {/* 績效統計 */}
      {activeTab === 'performance' && (
        <div className="admin-form">
          <h3>績效統計</h3>
          <p>績效統計功能正在開發中...</p>
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

export default Designers; 