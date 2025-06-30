import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
    notes: '',
    services: []
  });

  // 服務項目相關狀態
  const [services, setServices] = useState([]);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    duration: '',
    description: '',
    status: 'active'
  });

  // 載入設計師資料
  useEffect(() => {
    loadDesigners();
  }, []);

  const loadDesigners = async () => {
    try {
      const res = await axios.get('/api/designers');
      setDesigners(res.data);
    } catch (err) {
      console.error('載入設計師失敗:', err);
      setDesigners([]);
    }
  };

  const handleAddDesigner = async () => {
    if (!newDesigner.name) {
      alert('請填寫姓名');
      return;
    }

    if (!newDesigner.services || newDesigner.services.length === 0) {
      alert('請至少選擇一個服務項目');
      return;
    }

    try {
      const res = await axios.post('/api/designers', {
        name: newDesigner.name,
        services: newDesigner.services
      });
      
      // 重新載入設計師資料
      loadDesigners();
      
      setNewDesigner({
        name: '',
        phone: '',
        email: '',
        specialty: '',
        experience: '',
        hourlyRate: '',
        status: 'active',
        notes: '',
        services: []
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('新增設計師失敗:', err);
      alert('新增設計師失敗');
    }
  };

  const handleEditDesigner = async () => {
    if (!editingDesigner.name) {
      alert('請填寫姓名');
      return;
    }

    if (!editingDesigner.services || editingDesigner.services.length === 0) {
      alert('請至少選擇一個服務項目');
      return;
    }

    try {
      await axios.patch(`/api/designers/${editingDesigner.id}/profile`, {
        name: editingDesigner.name,
        services: editingDesigner.services
      });
      
      // 如果狀態有變更，呼叫暫停 API
      if (editingDesigner.isPaused !== undefined) {
        await axios.patch(`/api/designers/${editingDesigner.id}/pause`, {
          isPaused: editingDesigner.isPaused
        });
      }
      
      // 重新載入設計師資料
      loadDesigners();
      setEditingDesigner(null);
    } catch (err) {
      console.error('編輯設計師失敗:', err);
      alert('編輯設計師失敗');
    }
  };

  const handleDeleteDesigner = async (id) => {
    if (window.confirm('確定要刪除此設計師嗎？')) {
      try {
        await axios.delete(`/api/designers/${id}`);
        // 重新載入設計師資料
        loadDesigners();
      } catch (err) {
        console.error('刪除設計師失敗:', err);
        alert('刪除設計師失敗');
      }
    }
  };

  // 載入服務列表
  const loadServices = async () => {
    try {
      const res = await axios.get('/api/services');
      setServices(res.data);
    } catch (err) {
      setServices([]);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // 服務項目相關處理函數
  const handleAddService = async () => {
    if (!newService.name || !newService.price || !newService.duration) {
      alert('請填寫服務名稱、價格和時長');
      return;
    }
    try {
      await axios.post('/api/services', {
        name: newService.name,
        price: parseFloat(newService.price),
        duration: parseInt(newService.duration)
      });
      loadServices();
      setNewService({ name: '', price: '', duration: '', description: '', status: 'active' });
      setShowServiceForm(false);
    } catch (err) {
      alert('新增服務失敗');
    }
  };

  const handleEditService = async () => {
    if (!editingService.name || !editingService.price || !editingService.duration) {
      alert('請填寫服務名稱、價格和時長');
      return;
    }
    try {
      await axios.patch(`/api/services/${editingService.id}`, {
        name: editingService.name,
        price: parseFloat(editingService.price),
        duration: parseInt(editingService.duration),
        status: editingService.status
      });
      loadServices();
      setEditingService(null);
    } catch (err) {
      alert('編輯服務失敗');
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('確定要刪除此服務項目嗎？')) {
      try {
        await axios.delete(`/api/services/${id}`);
        loadServices();
      } catch (err) {
        alert('刪除服務失敗');
      }
    }
  };

  const filteredDesigners = designers.filter(designer => {
    const matchesSearch = designer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (designer.phone || '').includes(searchTerm) ||
                         (designer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (designer.specialty || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (designer.isPaused ? 'inactive' : 'active') === filterStatus;
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
        <h1>新增/刪除設計師及服務項目</h1>
        <p>管理設計師帳號、服務項目設定、權限控制</p>
      </div>

      {/* 設計師統計 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">{designers.length}</div>
          <div className="label">總設計師數</div>
        </div>
        <div className="stat-card">
          <div className="number">{designers.filter(d => !d.isPaused).length}</div>
          <div className="label">在職設計師</div>
        </div>
        <div className="stat-card">
          <div className="number">${designers.reduce((sum, d) => sum + (d.totalRevenue || 0), 0).toLocaleString()}</div>
          <div className="label">總營收</div>
        </div>
        <div className="stat-card">
          <div className="number">
            {designers.length > 0 
              ? (designers.reduce((sum, d) => sum + (d.rating || 0), 0) / designers.length).toFixed(1)
              : '0.0'
            }
          </div>
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
          className={`admin-btn ${activeTab === 'services' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('services')}
        >
          服務項目管理
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
                    placeholder="請輸入設計師姓名"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>可提供的服務 *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {services.map(service => (
                    <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={newDesigner.services ? newDesigner.services.includes(service.id) : false}
                        onChange={(e) => {
                          const currentServices = newDesigner.services || [];
                          if (e.target.checked) {
                            setNewDesigner({
                              ...newDesigner,
                              services: [...currentServices, service.id]
                            });
                          } else {
                            setNewDesigner({
                              ...newDesigner,
                              services: currentServices.filter(id => id !== service.id)
                            });
                          }
                        }}
                      />
                      {service.name} (${service.price})
                    </label>
                  ))}
                </div>
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
              <h3>編輯設計師</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>姓名 *</label>
                  <input
                    type="text"
                    value={editingDesigner.name}
                    onChange={(e) => setEditingDesigner({...editingDesigner, name: e.target.value})}
                    placeholder="請輸入設計師姓名"
                  />
                </div>
                <div className="form-group">
                  <label>狀態</label>
                  <select 
                    value={editingDesigner.isPaused ? 'paused' : 'active'} 
                    onChange={(e) => setEditingDesigner({...editingDesigner, isPaused: e.target.value === 'paused'})}
                  >
                    <option value="active">正常</option>
                    <option value="paused">暫停</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>可提供的服務 *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {services.map(service => (
                    <label key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={editingDesigner.services ? editingDesigner.services.includes(service.id) : false}
                        onChange={(e) => {
                          const currentServices = editingDesigner.services || [];
                          if (e.target.checked) {
                            setEditingDesigner({
                              ...editingDesigner,
                              services: [...currentServices, service.id]
                            });
                          } else {
                            setEditingDesigner({
                              ...editingDesigner,
                              services: currentServices.filter(id => id !== service.id)
                            });
                          }
                        }}
                      />
                      {service.name} (${service.price})
                    </label>
                  ))}
                </div>
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
                  <th>服務項目</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDesigners.map(designer => (
                  <tr key={designer.id}>
                    <td style={{ fontWeight: 'bold' }}>{designer.name}</td>
                    <td>
                      {designer.services ? 
                        designer.services.map(serviceId => {
                          const service = services.find(s => s.id === serviceId);
                          return service ? service.name : '未知服務';
                        }).join(', ') 
                        : '無指定服務'
                      }
                    </td>
                    <td>
                      <span style={{ 
                        color: designer.isPaused ? '#dc3545' : '#28a745',
                        fontWeight: 'bold'
                      }}>
                        {designer.isPaused ? '暫停中' : '正常'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="admin-btn admin-btn-warning" 
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => { console.log('編輯按鈕點擊', designer); setEditingDesigner(designer); }}
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

      {/* 服務項目管理 */}
      {activeTab === 'services' && (
        <div>
          <div className="admin-filters" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <button 
              className="admin-btn admin-btn-success"
              onClick={() => setShowServiceForm(true)}
            >
              新增服務項目
            </button>
          </div>
          {/* 新增服務項目表單 */}
          {showServiceForm && (
            <div className="admin-form">
              <h3>新增服務項目</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>服務名稱 *</label>
                  <input
                    type="text"
                    value={newService?.name ?? ''}
                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                    placeholder="請輸入服務名稱"
                  />
                </div>
                <div className="form-group">
                  <label>價格 *</label>
                  <input
                    type="number"
                    value={newService?.price ?? ''}
                    onChange={(e) => setNewService({...newService, price: e.target.value})}
                    placeholder="請輸入價格"
                  />
                </div>
                <div className="form-group">
                  <label>時長(分鐘) *</label>
                  <input
                    type="number"
                    value={newService?.duration ?? ''}
                    onChange={(e) => setNewService({...newService, duration: e.target.value})}
                    placeholder="請輸入時長"
                  />
                </div>
                <div className="form-group">
                  <label>狀態</label>
                  <select 
                    value={newService?.status ?? 'active'} 
                    onChange={(e) => setNewService({...newService, status: e.target.value})}
                  >
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={handleAddService}>
                  新增
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowServiceForm(false)}>
                  取消
                </button>
              </div>
            </div>
          )}
          {/* 編輯服務項目表單 */}
          {editingService && (
            <div className="admin-form">
              <h3>編輯服務項目</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>服務名稱 *</label>
                  <input
                    type="text"
                    value={editingService?.name ?? ''}
                    onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>價格 *</label>
                  <input
                    type="number"
                    value={editingService?.price ?? ''}
                    onChange={e => setEditingService({...editingService, price: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>時長(分鐘) *</label>
                  <input
                    type="number"
                    value={editingService?.duration ?? ''}
                    onChange={(e) => setEditingService({...editingService, duration: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>狀態</label>
                  <select 
                    value={editingService?.status ?? 'active'} 
                    onChange={(e) => setEditingService({...editingService, status: e.target.value})}
                  >
                    <option value="active">啟用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={handleEditService}>
                  儲存
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setEditingService(null)}>
                  取消
                </button>
              </div>
            </div>
          )}
          <div className="service-card-list">
            {services.map(service => (
              <div key={service.id} className="service-card-horizontal">
                <div className="service-card-row"><b>服務名稱：</b>{service.name}</div>
                <div className="service-card-row"><b>價格：</b>${service.price}</div>
                <div className="service-card-row"><b>時長：</b>{service.duration || 60}分鐘</div>
                <div className="service-card-row"><b>狀態：</b>
                  <span style={{ color: (service.status || 'active') === 'active' ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>
                    {(service.status || 'active') === 'active' ? '啟用' : '停用'}
                  </span>
                </div>
                <div className="service-card-actions">
                  <button 
                    className="admin-btn admin-btn-warning" 
                    style={{ fontSize: '0.9rem', marginRight: '8px' }}
                    onClick={() => {
                      const { category, ...serviceWithoutCategory } = service;
                      setEditingService(serviceWithoutCategory);
                    }}
                  >編輯</button>
                  <button 
                    className="admin-btn admin-btn-danger" 
                    style={{ fontSize: '0.9rem' }}
                    onClick={() => handleDeleteService(service.id)}
                  >刪除</button>
                </div>
              </div>
            ))}
          </div>
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