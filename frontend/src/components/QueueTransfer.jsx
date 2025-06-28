import { useState, useEffect } from 'react';
import axios from 'axios';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [designersRes, queueRes, transfersRes] = await Promise.all([
        axios.get('/api/designers'),
        axios.get('/api/queue'),
        axios.get('/api/queue/transfers')
      ]);
      
      setDesigners(designersRes.data);
      setTodayQueue(queueRes.data.filter(q => 
        q.status === 'waiting' || q.status === 'called'
      ));
      setTransferHistory(transfersRes.data);
    } catch (error) {
      console.error('載入資料失敗:', error);
      setMessage('載入資料失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedQueue || !targetDesigner) {
      setMessage('請選擇客人和目標設計師');
      return;
    }

    if (selectedQueue.designerId === Number(targetDesigner)) {
      setMessage('無法調整給同一位設計師');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/queue/transfer', {
        queueId: selectedQueue.id,
        fromDesignerId: selectedQueue.designerId,
        toDesignerId: Number(targetDesigner),
        reason: reason || '設計師調整'
      });

      setMessage('客人調整成功！');
      setSelectedQueue(null);
      setTargetDesigner('');
      setReason('');
      
      // 重新載入資料
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.error || '調整失敗');
    } finally {
      setLoading(false);
    }
  };

  const getDesignerName = (designerId) => {
    const designer = designers.find(d => d.id === designerId);
    return designer ? designer.name : '未知設計師';
  };

  const getServiceName = (serviceId) => {
    // 這裡可以從 services 資料中獲取服務名稱
    const serviceNames = {
      1: '洗剪吹',
      2: '染髮',
      3: '燙髮'
    };
    return serviceNames[serviceId] || '未知服務';
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      'waiting': '等待中',
      'called': '已叫號',
      'done': '已完成',
      'absent': '未到'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'waiting': 'status-waiting',
      'called': 'status-called',
      'done': 'status-done',
      'absent': 'status-absent'
    };
    return classMap[status] || '';
  };

  return (
    <div className="queue-transfer-container">
      <div className="transfer-header">
        <h1>設計師調整客人</h1>
        <p>管理今日排隊客人的設計師分配</p>
      </div>

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
              {todayQueue.length === 0 ? (
                <p className="no-data">目前沒有等待中的客人</p>
              ) : (
                todayQueue.map(queue => (
                  <div 
                    key={queue.id} 
                    className={`queue-item ${selectedQueue?.id === queue.id ? 'selected' : ''}`}
                    onClick={() => setSelectedQueue(queue)}
                  >
                    <div className="queue-number">#{queue.number}</div>
                    <div className="queue-info">
                      <div className="queue-details">
                        <span className="designer-name">
                          設計師: {getDesignerName(queue.designerId)}
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
                ))
              )}
            </div>
          )}
        </div>

        {/* 調整表單 */}
        {selectedQueue && (
          <div className="transfer-form">
            <h3>調整客人</h3>
            <div className="selected-queue-info">
              <p><strong>選擇的客人:</strong> #{selectedQueue.number} - {getDesignerName(selectedQueue.designerId)}</p>
              <p><strong>服務:</strong> {getServiceName(selectedQueue.serviceId)}</p>
              <p><strong>狀態:</strong> {getStatusText(selectedQueue.status)}</p>
            </div>

            <div className="form-group">
              <label>調整至設計師:</label>
              <select 
                value={targetDesigner} 
                onChange={(e) => setTargetDesigner(e.target.value)}
                className="form-control"
              >
                <option value="">請選擇設計師</option>
                {designers
                  .filter(d => d.id !== selectedQueue.designerId && !d.isPaused)
                  .map(designer => (
                    <option key={designer.id} value={designer.id}>
                      {designer.name}
                    </option>
                  ))
                }
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
                disabled={loading || !targetDesigner}
              >
                {loading ? '調整中...' : '確認調整'}
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedQueue(null);
                  setTargetDesigner('');
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
                      <span className="history-from">{getDesignerName(transfer.fromDesignerId)}</span>
                      <span className="history-arrow">→</span>
                      <span className="history-to">{getDesignerName(transfer.toDesignerId)}</span>
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
    </div>
  );
}

export default QueueTransfer; 