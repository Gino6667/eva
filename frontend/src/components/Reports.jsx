import { useState, useEffect } from 'react';
import axios from 'axios';
import './Reports.css';

function Reports() {
  const [activeTab, setActiveTab] = useState('revenue');
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const end = new Date();
    setEndDate(end.toISOString().split('T')[0]);
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

  // 渲染營業額統計摘要
  const renderRevenueSummary = () => (
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
      {reportData.summary.designerStats && (
        <>
          <div className="summary-card">
            <h4>指定設計師</h4>
            <div className="summary-value count">
              {reportData.summary.designerStats.specified.count} 
              <span className="percentage">({reportData.summary.designerStats.specified.percentage}%)</span>
            </div>
            <div className="summary-subtitle">
              {formatCurrency(reportData.summary.designerStats.specified.revenue)}
            </div>
          </div>
          <div className="summary-card">
            <h4>未指定設計師</h4>
            <div className="summary-value count">
              {reportData.summary.designerStats.unspecified.count}
              <span className="percentage">({reportData.summary.designerStats.unspecified.percentage}%)</span>
            </div>
            <div className="summary-subtitle">
              {formatCurrency(reportData.summary.designerStats.unspecified.revenue)}
            </div>
          </div>
          {reportData.summary.designerStats.list && reportData.summary.designerStats.list.length > 0 && (
            <div className="designer-list">
              <h4 style={{marginTop: '1rem', color: '#f7ab5e'}}>各設計師被指定統計</h4>
              <table className="designer-table">
                <thead>
                  <tr>
                    <th>設計師</th>
                    <th>被指定次數</th>
                    <th>營業額</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.summary.designerStats.list.map(d => (
                    <tr key={d.designerId}>
                      <td>{d.designerName}</td>
                      <td>{d.count}</td>
                      <td>{formatCurrency(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );

  // 渲染客戶流量摘要
  const renderTrafficSummary = () => (
    <>
      <div className="summary-card">
        <h4>總客戶數</h4>
        <div className="summary-value count">
          {reportData.summary.uniqueCustomers}
        </div>
      </div>
      <div className="summary-card">
        <h4>總預約數</h4>
        <div className="summary-value count">
          {reportData.summary.totalReservations}
        </div>
      </div>
      <div className="summary-card">
        <h4>總排隊數</h4>
        <div className="summary-value count">
          {reportData.summary.totalQueue}
        </div>
      </div>
    </>
  );

  // 渲染設計師績效摘要
  const renderDesignerSummary = () => (
    <>
      <div className="summary-card">
        <h4>設計師數</h4>
        <div className="summary-value count">
          {reportData.summary.totalDesigners}
        </div>
      </div>
      <div className="summary-card">
        <h4>總營業額</h4>
        <div className="summary-value revenue">
          {formatCurrency(reportData.summary.totalRevenue)}
        </div>
      </div>
      <div className="summary-card">
        <h4>平均完成率</h4>
        <div className="summary-value average">
          {reportData.summary.avgCompletionRate}%
        </div>
      </div>
    </>
  );

  // 渲染熱門時段摘要
  const renderPopularTimesSummary = () => (
    <>
      <div className="summary-card">
        <h4>總預約數</h4>
        <div className="summary-value count">
          {reportData.summary.totalBookings}
        </div>
      </div>
      <div className="summary-card">
        <h4>總營業額</h4>
        <div className="summary-value revenue">
          {formatCurrency(reportData.summary.totalRevenue)}
        </div>
      </div>
      <div className="summary-card">
        <h4>最熱門時段</h4>
        <div className="summary-value average">
          {reportData.summary.mostPopularTime?.time || '無'}
        </div>
      </div>
    </>
  );

  // 渲染熱門服務摘要
  const renderPopularServicesSummary = () => (
    <>
      <div className="summary-card">
        <h4>服務種類</h4>
        <div className="summary-value count">
          {reportData.summary.totalServices}
        </div>
      </div>
      <div className="summary-card">
        <h4>總預約數</h4>
        <div className="summary-value count">
          {reportData.summary.totalBookings}
        </div>
      </div>
      <div className="summary-card">
        <h4>總營業額</h4>
        <div className="summary-value revenue">
          {formatCurrency(reportData.summary.totalRevenue)}
        </div>
      </div>
    </>
  );

  // 渲染營業額詳細資料
  const renderRevenueDetails = () => (
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>營業額</th>
          <th>預約數</th>
          <th>指定設計師</th>
          <th>未指定設計師</th>
        </tr>
      </thead>
      <tbody>
        {reportData.data.map((item, index) => (
          <tr key={index}>
            <td>{formatDate(item.date)}</td>
            <td className="revenue">{formatCurrency(item.revenue)}</td>
            <td>{item.count}</td>
            <td>
              {item.designerStats?.specified.count || 0}
              <span className="percentage">
                ({item.designerStats?.specified.count > 0 ? 
                  Math.round((item.designerStats.specified.count / item.count) * 100) : 0}%)
              </span>
            </td>
            <td>
              {item.designerStats?.unspecified.count || 0}
              <span className="percentage">
                ({item.designerStats?.unspecified.count > 0 ? 
                  Math.round((item.designerStats.unspecified.count / item.count) * 100) : 0}%)
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 渲染客戶流量詳細資料
  const renderTrafficDetails = () => (
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>預約數</th>
          <th>排隊數</th>
          <th>完成數</th>
          <th>取消數</th>
        </tr>
      </thead>
      <tbody>
        {reportData.data.map((item, index) => (
          <tr key={index}>
            <td>{formatDate(item.date)}</td>
            <td>{item.reservations.total}</td>
            <td>{item.queue.total}</td>
            <td>{item.reservations.completed + item.queue.completed}</td>
            <td>{item.reservations.cancelled + item.queue.absent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 渲染設計師績效詳細資料
  const renderDesignerDetails = () => (
    <table>
      <thead>
        <tr>
          <th>設計師</th>
          <th>預約數</th>
          <th>完成數</th>
          <th>營業額</th>
          <th>完成率</th>
        </tr>
      </thead>
      <tbody>
        {reportData.data.map((item, index) => (
          <tr key={index}>
            <td>{item.designerName}</td>
            <td>{item.reservations?.total ?? 0}</td>
            <td>{item.reservations?.completed ?? 0}</td>
            <td className="revenue">{formatCurrency(item.reservations?.revenue ?? 0)}</td>
            <td>{item.performance?.completionRate ?? 0}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 渲染熱門時段詳細資料
  const renderPopularTimesDetails = () => (
    <table>
      <thead>
        <tr>
          <th>時段</th>
          <th>預約數</th>
          <th>營業額</th>
          <th>平均營業額</th>
        </tr>
      </thead>
      <tbody>
        {reportData.data.map((item, index) => (
          <tr key={index}>
            <td>{item.time}</td>
            <td>{item.count}</td>
            <td className="revenue">{formatCurrency(item.revenue)}</td>
            <td>{formatCurrency(item.avgRevenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 渲染熱門服務詳細資料
  const renderPopularServicesDetails = () => (
    <table>
      <thead>
        <tr>
          <th>服務</th>
          <th>價格</th>
          <th>預約數</th>
          <th>營業額</th>
          <th>平均營業額</th>
        </tr>
      </thead>
      <tbody>
        {reportData.data.map((item, index) => (
          <tr key={index}>
            <td>{item.serviceName}</td>
            <td>{formatCurrency(item.price)}</td>
            <td>{item.count}</td>
            <td className="revenue">{formatCurrency(item.revenue)}</td>
            <td>{formatCurrency(item.avgRevenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 根據標籤頁渲染對應的摘要
  const renderSummary = () => {
    switch (activeTab) {
      case 'revenue':
        return renderRevenueSummary();
      case 'traffic':
        return renderTrafficSummary();
      case 'designer-performance':
        return renderDesignerSummary();
      case 'popular-times':
        return renderPopularTimesSummary();
      case 'popular-services':
        return renderPopularServicesSummary();
      default:
        return null;
    }
  };

  // 根據標籤頁渲染對應的詳細資料
  const renderDetails = () => {
    switch (activeTab) {
      case 'revenue':
        return renderRevenueDetails();
      case 'traffic':
        return renderTrafficDetails();
      case 'designer-performance':
        return renderDesignerDetails();
      case 'popular-times':
        return renderPopularTimesDetails();
      case 'popular-services':
        return renderPopularServicesDetails();
      default:
        return null;
    }
  };

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
              {renderSummary()}
            </div>
            
            <div className="report-details">
              <h4>詳細資料</h4>
              <div className="data-table">
                {renderDetails()}
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