import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

function Finance() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newTransaction, setNewTransaction] = useState({
    type: 'income',
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  // 模擬財務數據
  const [financialStats, setFinancialStats] = useState({
    totalIncome: 125000,
    totalExpense: 45000,
    netProfit: 80000,
    monthlyGrowth: 12.5
  });

  useEffect(() => {
    // 模擬載入交易記錄
    const mockTransactions = [
      { id: 1, type: 'income', amount: 5000, description: '客戶預約費用', category: '服務收入', date: '2024-01-15', customer: '張小姐' },
      { id: 2, type: 'expense', amount: 1200, description: '美髮用品採購', category: '材料成本', date: '2024-01-14', customer: '' },
      { id: 3, type: 'income', amount: 3000, description: '會員卡充值', category: '預付收入', date: '2024-01-13', customer: '李小姐' },
      { id: 4, type: 'expense', amount: 800, description: '水電費', category: '營運成本', date: '2024-01-12', customer: '' },
      { id: 5, type: 'income', amount: 2500, description: '造型設計費用', category: '服務收入', date: '2024-01-11', customer: '王小姐' },
    ];
    setTransactions(mockTransactions);
  }, []);

  const handleAddTransaction = () => {
    if (!newTransaction.amount || !newTransaction.description) {
      alert('請填寫完整資訊');
      return;
    }

    const transaction = {
      id: Date.now(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount)
    };

    setTransactions([transaction, ...transactions]);
    setNewTransaction({
      type: 'income',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddForm(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>財務管理</h1>
        <p>管理收入支出、查看財務報表、分析營運狀況</p>
      </div>

      {/* 財務統計 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="number">${financialStats.totalIncome.toLocaleString()}</div>
          <div className="label">總收入</div>
        </div>
        <div className="stat-card">
          <div className="number">${financialStats.totalExpense.toLocaleString()}</div>
          <div className="label">總支出</div>
        </div>
        <div className="stat-card">
          <div className="number">${financialStats.netProfit.toLocaleString()}</div>
          <div className="label">淨利潤</div>
        </div>
        <div className="stat-card">
          <div className="number">+{financialStats.monthlyGrowth}%</div>
          <div className="label">月成長率</div>
        </div>
      </div>

      {/* 標籤頁 */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          className={`admin-btn ${activeTab === 'overview' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          財務概覽
        </button>
        <button 
          className={`admin-btn ${activeTab === 'transactions' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('transactions')}
        >
          交易記錄
        </button>
        <button 
          className={`admin-btn ${activeTab === 'reports' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          onClick={() => setActiveTab('reports')}
        >
          財務報表
        </button>
      </div>

      {/* 財務概覽 */}
      {activeTab === 'overview' && (
        <div className="admin-form">
          <h3>財務概覽</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4>收入分析</h4>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                <p>服務收入: ${(financialStats.totalIncome * 0.7).toLocaleString()}</p>
                <p>預付收入: ${(financialStats.totalIncome * 0.2).toLocaleString()}</p>
                <p>其他收入: ${(financialStats.totalIncome * 0.1).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <h4>支出分析</h4>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                <p>材料成本: ${(financialStats.totalExpense * 0.4).toLocaleString()}</p>
                <p>營運成本: ${(financialStats.totalExpense * 0.3).toLocaleString()}</p>
                <p>人事成本: ${(financialStats.totalExpense * 0.3).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 交易記錄 */}
      {activeTab === 'transactions' && (
        <div>
          {/* 搜尋和篩選 */}
          <div className="admin-filters">
            <input
              type="text"
              placeholder="搜尋交易記錄..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">所有類型</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
            </select>
            <button 
              className="admin-btn admin-btn-success"
              onClick={() => setShowAddForm(true)}
            >
              新增交易
            </button>
          </div>

          {/* 新增交易表單 */}
          {showAddForm && (
            <div className="admin-form">
              <h3>新增交易記錄</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>類型</label>
                  <select 
                    value={newTransaction.type} 
                    onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                  >
                    <option value="income">收入</option>
                    <option value="expense">支出</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>金額</label>
                  <input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                    placeholder="請輸入金額"
                  />
                </div>
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>類別</label>
                  <select 
                    value={newTransaction.category} 
                    onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                  >
                    <option value="">請選擇類別</option>
                    <option value="服務收入">服務收入</option>
                    <option value="預付收入">預付收入</option>
                    <option value="材料成本">材料成本</option>
                    <option value="營運成本">營運成本</option>
                    <option value="人事成本">人事成本</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>描述</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  placeholder="請輸入交易描述"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="admin-btn admin-btn-success" onClick={handleAddTransaction}>
                  新增
                </button>
                <button className="admin-btn admin-btn-secondary" onClick={() => setShowAddForm(false)}>
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 交易記錄表格 */}
          <div className="admin-table">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>類型</th>
                  <th>金額</th>
                  <th>類別</th>
                  <th>描述</th>
                  <th>客戶</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>
                      <span style={{ 
                        color: transaction.type === 'income' ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {transaction.type === 'income' ? '收入' : '支出'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>
                      ${transaction.amount.toLocaleString()}
                    </td>
                    <td>{transaction.category}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.customer || '-'}</td>
                    <td>
                      <button className="admin-btn admin-btn-warning" style={{ fontSize: '0.8rem' }}>
                        編輯
                      </button>
                      <button className="admin-btn admin-btn-danger" style={{ fontSize: '0.8rem' }}>
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

      {/* 財務報表 */}
      {activeTab === 'reports' && (
        <div className="admin-form">
          <h3>財務報表</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4>月度報表</h4>
              <button className="admin-btn admin-btn-primary">下載 PDF</button>
              <button className="admin-btn admin-btn-secondary">下載 Excel</button>
            </div>
            <div>
              <h4>年度報表</h4>
              <button className="admin-btn admin-btn-primary">下載 PDF</button>
              <button className="admin-btn admin-btn-secondary">下載 Excel</button>
            </div>
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

export default Finance; 