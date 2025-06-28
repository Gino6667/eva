import { useState, useEffect } from 'react';
import axios from 'axios';
import './Reports.css';

function Reports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReport();
    }
  }, [startDate, endDate, groupBy, activeTab]);

  const loadReport = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      let url = `/api/reports/${activeTab}`;
      const params = { startDate, endDate };
      if (activeTab === 'revenue' || activeTab === 'traffic') {
        params.groupBy = groupBy;
      }
      const res = await axios.get(url, { params });
      setReportData(res.data);
    } catch (err) {
      console.error('載入報表失敗:', err);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD'
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (groupBy === 'month') {
      const [year, month] = dateStr.split('-');
      return `${year}年${month}月`;
    }
    return dateStr;
  };

  const tabs = [
    { id: 'revenue', name: '營業額統計' },
    { id: 'traffic', name: '客戶流量' },
    { id: 'designer-performance', name: '設計師績效' },
    { id: 'popular-times', name: '熱門時段' },
    { id: 'popular-services', name: '熱門服務' }
  ];

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>報表統計</h2>
        <p>詳細的營業數據分析與績效報表</p>
      </div>

      <div className="reports-controls">
        <div className="date-controls">
          <div className="form-group">
            <label>開始日期</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>結束日期</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {(activeTab === 'revenue' || activeTab === 'traffic') && (
            <div className="form-group">
              <label>分組方式</label>
              <select 
                value={groupBy} 
                onChange={e => setGroupBy(e.target.value)}
              >
                <option value="day">按日</option>
                <option value="week">按週</option>
                <option value="month">按月</option>
              </select>
            </div>
          )}
        </div>

        <div className="tab-controls">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="reports-content">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>載入報表中...</p>
          </div>
        ) : reportData ? (
          <div className="report-data">
            <div className="report-summary">
              {activeTab === 'revenue' && (
                <>
                  <div className="summary-card">
                    <h4>總營業額</h4>
                    <div className="summary-value revenue">
                      {formatCurrency(reportData.summary.totalRevenue)}
                    </div>
                  </div>
                  <div className="summary-card">
                    <h4>總預約數</h4>
                    <div className="summary-value count">
                      {reportData.summary.totalCount}
                    </div>
                  </div>
                  <div className="summary-card">
                    <h4>平均營業額</h4>
                    <div className="summary-value average">
                      {formatCurrency(reportData.summary.averageRevenue)}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="report-details">
              <h4>詳細資料</h4>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>營業額</th>
                      <th>預約數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((item, index) => (
                      <tr key={index}>
                        <td>{formatDate(item.date)}</td>
                        <td className="revenue">{formatCurrency(item.revenue)}</td>
                        <td>{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">
            <p>無資料</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports; 