import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './QueueTransfer.css';

function QueueTransfer() {
  const [designers, setDesigners] = useState([]);
  const [todayQueue, setTodayQueue] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [targetDesigner, setTargetDesigner] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [transferHistory, setTransferHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [worktime, setWorktime] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showDesignerModal, setShowDesignerModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    let user = null;
    if (token) {
      try {
        user = JSON.parse(atob(token.split('.')[1]));
      } catch {}
    }
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
    loadWorktime();
    loadQueueData();
    
    // 監聽設計師狀態變更事件
    const handleDesignerStateChange = () => {
      console.log('QueueTransfer: 收到設計師狀態變更事件，重新載入資料');
      loadData();
      loadQueueData();
    };
    
    window.addEventListener('designer-state-changed', handleDesignerStateChange);
    
    return () => {
      window.removeEventListener('designer-state-changed', handleDesignerStateChange);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [designersRes, queueRes, transfersRes] = await Promise.all([
        axios.get('/api/designers'),
        axios.get(`/api/queue?date=${today}`),
        axios.get('/api/queue/transfers')
      ]);
      
      setDesigners(designersRes.data);
      setTodayQueue(queueRes.data.filter(q => q.status === 'waiting' || q.status === 'called'));
      setTransferHistory(transfersRes.data);
    } catch (error) {
      console.error('載入資料失敗:', error);
      setMessage('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadWorktime = async () => {
    try {
      const res = await axios.get('/api/worktime');
      setWorktime(res.data);
    } catch (err) {
      console.error('載入工作時間失敗:', err);
    }
  };

  const loadQueueData = async () => {
    try {
      const res = await axios.get('/api/queue/today');
      setQueueData(res.data);
    } catch (err) {
      console.error('載入排隊資料失敗:', err);
    }
  };

  // 檢查是否在營業時間內
  const isWithinBusinessHours = () => {
    if (!worktime) return true;
    
    const now = new Date();
    const week = now.getDay();
    
    // 檢查是否為營業日
    if (!worktime.openDays?.[week]) {
      return { valid: false, reason: '今日非營業日' };
    }
    
    // 檢查是否在營業時間內
    const openTime = worktime.openTimes?.[week];
    if (openTime?.start && openTime?.end) {
      const nowStr = now.toTimeString().slice(0, 5);
      if (nowStr < openTime.start || nowStr >= openTime.end) {
        return { valid: false, reason: `營業時間為 ${openTime.start} - ${openTime.end}` };
      }
    }
    
    return { valid: true };
  };

  // 過濾可用的設計師（排除暫停的設計師）
  const getAvailableDesigners = () => {
    return designers.filter(designer => !designer.isPaused);
  };

  // 過濾可轉移的客人（排除已服務完成的）
  const getTransferableCustomers = () => {
    return queueData.filter(customer => 
      customer.status === 'waiting' || customer.status === 'called'
    );
  };

  const handleTransfer = async () => {
    if (!selectedDesigner) {
      setMessage('請選擇目標設計師');
      return;
    }
    if (!selectedCustomer) {
      setMessage('請選擇要轉移的客人');
      return;
    }

    // 檢查營業時間
    const businessHoursCheck = isWithinBusinessHours();
    if (!businessHoursCheck.valid) {
      setMessage(businessHoursCheck.reason);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await axios.post('/api/queue/transfer', {
        customerId: selectedCustomer,
        targetDesignerId: selectedDesigner
      });
      
      setMessage('客人轉移成功！');
      setSelectedDesigner('');
      setSelectedCustomer('');
      
      // 重新載入資料
      loadQueueData();
      
      // 發送設計師狀態變更事件
      window.dispatchEvent(new Event('designer-state-changed'));
      
      // 3秒後清除成功訊息
      setTimeout(() => {
        setMessage('');
      }, 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || '轉移失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDesignerSelect = (designerId) => {
    setSelectedDesigner(designerId);
    setShowDesignerModal(false);
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomer(customerId);
    setShowCustomerModal(false);
  };

  const getSelectedDesignerName = () => {
    const designer = designers.find(d => d.id === selectedDesigner);
    return designer ? designer.name : '';
  };

  const getSelectedCustomerInfo = () => {
    const customer = queueData.find(c => c.id === selectedCustomer);
    if (!customer) return '';
    
    const designer = designers.find(d => d.id === customer.designerId);
    const statusText = customer.status === 'waiting' ? '等待中' : 
                      customer.status === 'called' ? '已叫號' : 
                      customer.status === 'serving' ? '服務中' : '已完成';
    
    return `${customer.number}號 - ${designer?.name || '未知設計師'} (${statusText})`;
  };

  // 檢查營業狀態並顯示提示
  const getBusinessStatusMessage = () => {
    if (!worktime) return null;
    
    const businessHoursCheck = isWithinBusinessHours();
    if (!businessHoursCheck.valid) {
      return (
        <div className="business-status-message">
          <p>⚠️ {businessHoursCheck.reason}</p>
        </div>
      );
    }
    
    const now = new Date();
    const week = now.getDay();
    const openTime = worktime.openTimes?.[week];
    if (openTime?.start && openTime?.end) {
      return (
        <div className="business-status-message">
          <p>✅ 營業中 - 今日營業時間：{openTime.start} - {openTime.end}</p>
        </div>
      );
    }
    
    return null;
  };

  const availableDesigners = getAvailableDesigners();
  const transferableCustomers = getTransferableCustomers();
  const businessStatusMessage = getBusinessStatusMessage();

  return (
    <div className="queue-transfer-container">
      <div className="transfer-header">
        <h1>設計師調整客人</h1>
        <p>管理今日排隊客人的設計師分配</p>
      </div>

      {businessStatusMessage}

      {message && (
        <div className={`message ${message.includes('成功') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="transfer-content">
        {/* 今日排隊列表 */}
        <div className="queue-section">
          <div className="section-header">
            <h3>今日排隊客人</h3>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? '隱藏調整歷史' : '顯示調整歷史'}
            </button>
          </div>

          {loading ? (
            <div className="loading">載入中...</div>
          ) : (
            <div className="queue-list">
              {todayQueue.filter(q => (q.status === 'waiting' || q.status === 'called') && q.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).map(queue => (
                <div 
                  key={queue.id} 
                  className={`queue-item ${selectedQueue?.id === queue.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQueue(queue)}
                >
                  <div className="queue-number">#{queue.number}</div>
                  <div className="queue-info">
                    <div className="queue-details">
                      <span className="designer-name">
                        設計師: {getSelectedDesignerName()}
                      </span>
                      <span className="service-name">
                        服務: {getServiceName(queue.serviceId)}
                      </span>
                      <span className="queue-time">
                        時間: {formatTime(queue.createdAt)}
                      </span>
                    </div>
                    <div className={`queue-status ${getStatusClass(queue.status)}`}>
                      {getStatusText(queue.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 調整表單 */}
        {selectedQueue && (
          <div className="transfer-form">
            <h3>調整客人</h3>
            <div className="selected-queue-info">
              <p><strong>選擇的客人:</strong> #{selectedQueue.number} - {getSelectedDesignerName()}</p>
              <p><strong>服務:</strong> {getServiceName(selectedQueue.serviceId)}</p>
              <p><strong>狀態:</strong> {getStatusText(selectedQueue.status)}</p>
            </div>

            <div className="form-group">
              <label>調整至設計師:</label>
              <select 
                value={selectedDesigner} 
                onChange={(e) => setSelectedDesigner(e.target.value)}
                className="form-control"
              >
                <option value="">請選擇設計師</option>
                {availableDesigners.map(designer => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>調整原因 (選填):</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="請輸入調整原因..."
                className="form-control"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-primary"
                onClick={handleTransfer}
                disabled={loading || !selectedDesigner || !selectedCustomer || availableDesigners.length === 0 || transferableCustomers.length === 0}
              >
                {loading ? '處理中...' : '確認轉移'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedQueue(null);
                  setSelectedDesigner('');
                  setSelectedCustomer('');
                  setReason('');
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 調整歷史 */}
        {showHistory && (
          <div className="transfer-history">
            <h3>調整歷史</h3>
            {transferHistory.length === 0 ? (
              <p className="no-data">目前沒有調整記錄</p>
            ) : (
              <div className="history-list">
                {transferHistory.slice(0, 10).map(transfer => (
                  <div key={transfer.id} className="history-item">
                    <div className="history-info">
                      <span className="history-queue">#{transfer.queueId}</span>
                      <span className="history-arrow">→</span>
                      <span className="history-from">{getSelectedDesignerName()}</span>
                      <span className="history-arrow">→</span>
                      <span className="history-to">{getSelectedDesignerName()}</span>
                    </div>
                    <div className="history-details">
                      <span className="history-reason">{transfer.reason}</span>
                      <span className="history-time">{formatTime(transfer.transferredAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 設計師選擇彈窗 */}
      {showDesignerModal && (
        <div className="modal-overlay" onClick={() => setShowDesignerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇目標設計師</h3>
            <div className="designer-grid">
              {availableDesigners.map(designer => (
                <button
                  key={designer.id}
                  className="designer-item"
                  onClick={() => handleDesignerSelect(designer.id)}
                >
                  {designer.name}
                </button>
              ))}
            </div>
            {availableDesigners.length === 0 && (
              <p>目前沒有可用的設計師</p>
            )}
          </div>
        </div>
      )}

      {/* 客人選擇彈窗 */}
      {showCustomerModal && (
        <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>選擇要轉移的客人</h3>
            <div className="customer-grid">
              {transferableCustomers.map(customer => {
                const designer = designers.find(d => d.id === customer.designerId);
                const statusText = customer.status === 'waiting' ? '等待中' : 
                                  customer.status === 'called' ? '已叫號' : '服務中';
                return (
                  <button
                    key={customer.id}
                    className="customer-item"
                    onClick={() => handleCustomerSelect(customer.id)}
                  >
                    <div className="customer-number">#{customer.number}</div>
                    <div className="customer-designer">{designer?.name || '未知設計師'}</div>
                    <div className="customer-status">{statusText}</div>
                  </button>
                );
              })}
            </div>
            {transferableCustomers.length === 0 && (
              <p>目前沒有可轉移的客人</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default QueueTransfer; 