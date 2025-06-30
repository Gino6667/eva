import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Admin.css';

function DesignersList() {
  const [designers, setDesigners] = useState([]);
  const [currentServing, setCurrentServing] = useState([]);
  const [nextInQueue, setNextInQueue] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedDesignerForTransfer, setSelectedDesignerForTransfer] = useState(null);
  const [todayQueue, setTodayQueue] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [targetDesigner, setTargetDesigner] = useState('');
  const [reason, setReason] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [designerStates, setDesignerStates] = useState({});

  // 載入資料
  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 60000); // 每分鐘自動刷新
    
    // 監聽設計師狀態變更事件
    const handleDesignerStateChange = () => {
      console.log('收到設計師狀態變更事件，重新載入資料');
      loadAll();
    };
    
    // 監聽排隊狀態變更事件
    const handleQueueUpdate = () => {
      console.log('收到排隊狀態變更事件，重新載入資料');
      loadAll();
    };
    
    window.addEventListener('designer-state-changed', handleDesignerStateChange);
    window.addEventListener('queue-updated', handleQueueUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('designer-state-changed', handleDesignerStateChange);
      window.removeEventListener('queue-updated', handleQueueUpdate);
    };
  }, []);

  const loadAll = async () => {
    try {
      const [dRes, cRes, nRes] = await Promise.all([
        axios.get('/api/designers'),
        axios.get('/api/queue/today-stats'),
        axios.get('/api/queue/next-in-queue'),
      ]);
      setDesigners(dRes.data);
      setCurrentServing(cRes.data.currentServing || []);
      setNextInQueue(nRes.data || []);
      
      // 同步後端設計師狀態到本地狀態
      const backendDesigners = dRes.data;
      setDesignerStates(prev => {
        const newStates = { ...prev };
        backendDesigners.forEach(designer => {
          if (designer.isPaused) {
            // 如果後端顯示暫停，檢查是否為休假狀態
            // 這裡可以根據實際需求調整邏輯
            if (!newStates[designer.id]) {
              newStates[designer.id] = {};
            }
            // 預設為暫停接單狀態，除非明確標記為休假
            if (!newStates[designer.id].isOnVacation) {
              newStates[designer.id].isPaused = true;
            }
          } else {
            // 如果後端顯示未暫停，清除所有暫停狀態
            if (newStates[designer.id]) {
              newStates[designer.id].isPaused = false;
              newStates[designer.id].isOnVacation = false;
            }
          }
        });
        return newStates;
      });
      
      // 載入今日排隊資料
      loadTodayQueue();
    } catch (e) {
      // 假資料
      setDesigners([
        { id: 1, name: '小美' },
        { id: 2, name: '阿強' },
        { id: 3, name: '小華' },
      ]);
      setCurrentServing([]);
      setNextInQueue([]);
    }
  };

  // 載入今日排隊資料
  const loadTodayQueue = async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      const today = new Date().toISOString().split('T')[0];
      const todayQueues = data.filter(q => 
        q.createdAt.startsWith(today) && 
        (q.status === 'waiting' || q.status === 'called')
      );
      setTodayQueue(todayQueues);
    } catch (error) {
      console.error('載入今日排隊失敗:', error);
    }
  };

  // 整合資料
  const getCardData = (designer) => {
    const serving = currentServing.find(s => s.designerId === designer.id);
    const next = nextInQueue.find(n => n.designerId === designer.id);
    return {
      currentNumber: serving?.number ?? '-',
      currentService: serving?.serviceName ?? '-',
      nextNumber: next?.number ?? '-',
      nextService: next?.serviceName ?? '-',
      status: serving ? 'serving' : 'rest',
    };
  };

  // 開啟調整客人彈窗
  const openTransferModal = (designer) => {
    setSelectedDesignerForTransfer(designer);
    setShowTransferModal(true);
    loadTodayQueue();
  };

  // 處理客人轉移
  const handleTransfer = async () => {
    if (!selectedQueue || !targetDesigner) {
      setTransferMessage('請選擇客人和目標設計師');
      return;
    }

    if (selectedQueue.designerId === Number(targetDesigner)) {
      setTransferMessage('無法調整給同一位設計師');
      return;
    }

    try {
      setTransferLoading(true);
      const response = await fetch('/api/queue/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queueId: selectedQueue.id,
          fromDesignerId: selectedQueue.designerId,
          toDesignerId: Number(targetDesigner),
          reason: reason || '設計師調整'
        })
      });

      if (response.ok) {
        setTransferMessage('客人調整成功！');
        setSelectedQueue(null);
        setTargetDesigner('');
        setReason('');
        // 重新載入資料
        loadAll();
        loadTodayQueue();
        // 發送設計師狀態變更事件
        window.dispatchEvent(new CustomEvent('designer-state-changed', {
          detail: { 
            action: 'transfer', 
            fromDesignerId: selectedQueue.designerId, 
            toDesignerId: Number(targetDesigner),
            queueId: selectedQueue.id
          }
        }));
      } else {
        const error = await response.json();
        setTransferMessage(error.error || '調整失敗');
      }
    } catch (error) {
      console.error('API 呼叫錯誤:', error);
      setTransferMessage('調整失敗');
    } finally {
      setTransferLoading(false);
    }
  };

  // 獲取設計師名稱
  const getDesignerName = (designerId) => {
    const designer = designers.find(d => d.id === designerId);
    return designer ? designer.name : '未知設計師';
  };

  // 獲取服務名稱
  const getServiceName = (serviceId) => {
    const serviceNames = {
      1: '洗剪吹',
      2: '染髮',
      3: '燙髮'
    };
    return serviceNames[serviceId] || '未知服務';
  };

  // 格式化時間
  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 獲取狀態文字
  const getStatusText = (status) => {
    const statusMap = {
      'waiting': '等待中',
      'called': '已叫號',
      'done': '已完成',
      'absent': '過號'
    };
    return statusMap[status] || status;
  };

  // 處理按鈕動作
  const handleAction = async (designer, action) => {
    console.log(`${action} - 設計師: ${designer.name}`);
    
    if (action === '調整客人') {
      openTransferModal(designer);
      return;
    }
    
    if (action === '休假中') {
      try {
        const response = await fetch(`/api/designers/${designer.id}/pause`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isPaused: true })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('設計師休假狀態已更新:', result);
          // 更新本地狀態
          setDesignerStates(prev => ({
            ...prev,
            [designer.id]: { ...prev[designer.id], isOnVacation: true }
          }));
          // 重新載入設計師資料以同步狀態
          loadAll();
          // 發送設計師狀態變更事件
          window.dispatchEvent(new CustomEvent('designer-state-changed', {
            detail: { designerId: designer.id, action: 'vacation', isPaused: true }
          }));
        } else {
          console.error('更新設計師休假狀態失敗');
        }
      } catch (error) {
        console.error('API 呼叫錯誤:', error);
      }
      return;
    }
    
    if (action === '恢復上線') {
      try {
        const response = await fetch(`/api/designers/${designer.id}/pause`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isPaused: false })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('設計師休假狀態已更新:', result);
          // 更新本地狀態
          setDesignerStates(prev => ({
            ...prev,
            [designer.id]: { ...prev[designer.id], isOnVacation: false }
          }));
          // 重新載入設計師資料以同步狀態
          loadAll();
          // 發送設計師狀態變更事件
          window.dispatchEvent(new CustomEvent('designer-state-changed', {
            detail: { designerId: designer.id, action: 'unvacation', isPaused: false }
          }));
        } else {
          console.error('更新設計師休假狀態失敗');
        }
      } catch (error) {
        console.error('API 呼叫錯誤:', error);
      }
      return;
    }
    
    if (action === '暫停接單') {
      try {
        const response = await fetch(`/api/designers/${designer.id}/pause`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isPaused: true })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('設計師暫停接單狀態已更新:', result);
          // 更新本地狀態
          setDesignerStates(prev => ({
            ...prev,
            [designer.id]: { ...prev[designer.id], isPaused: true }
          }));
          // 重新載入設計師資料以同步狀態
          loadAll();
          // 發送設計師狀態變更事件
          window.dispatchEvent(new CustomEvent('designer-state-changed', {
            detail: { designerId: designer.id, action: 'pause', isPaused: true }
          }));
        } else {
          console.error('更新設計師暫停接單狀態失敗');
        }
      } catch (error) {
        console.error('API 呼叫錯誤:', error);
      }
      return;
    }
    
    if (action === '恢復接單') {
      try {
        const response = await fetch(`/api/designers/${designer.id}/pause`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isPaused: false })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('設計師恢復接單狀態已更新:', result);
          // 更新本地狀態
          setDesignerStates(prev => ({
            ...prev,
            [designer.id]: { ...prev[designer.id], isPaused: false }
          }));
          // 重新載入設計師資料以同步狀態
          loadAll();
          // 發送設計師狀態變更事件
          window.dispatchEvent(new CustomEvent('designer-state-changed', {
            detail: { designerId: designer.id, action: 'unpause', isPaused: false }
          }));
        } else {
          console.error('更新設計師恢復接單狀態失敗');
        }
      } catch (error) {
        console.error('API 呼叫錯誤:', error);
      }
      return;
    }
    
    if (action === '報到') {
      console.log(`設計師 ${designer.name} 的客人報到`);
      // 從今日排隊中找到該設計師的 waiting 狀態客人
      const waitingCustomer = todayQueue.find(q => 
        q.designerId === designer.id && 
        q.status === 'waiting'
      );
      
      if (waitingCustomer) {
        // 呼叫後端 API 處理報到
        try {
          const response = await axios.post('/api/queue/checkin', {
            designerId: designer.id,
            number: waitingCustomer.number
          });
          
          if (response.data.success) {
            console.log('報到成功:', response.data);
            // 重新載入資料
            loadAll();
            loadTodayQueue();
            // 發送狀態變更事件
            window.dispatchEvent(new CustomEvent('queue-updated'));
          } else {
            console.error('報到失敗:', response.data);
          }
        } catch (err) {
          console.error('報到 API 失敗', err);
          if (err.response) {
            console.error('錯誤狀態:', err.response.status);
            console.error('錯誤訊息:', err.response.data);
          }
        }
      } else {
        console.log('該設計師沒有等待中的客人');
      }
    }
    
    if (action === '過號') {
      // 找到下一位客人
      const nextCustomer = nextInQueue.find(n => n.designerId === designer.id);
      if (nextCustomer && nextCustomer.id) {
        try {
          // 呼叫後端 API 將該客人設為過號
          await axios.patch(`/api/queue/${nextCustomer.id}/absent`);
          // 重新載入資料
          loadAll();
          loadTodayQueue();
          window.dispatchEvent(new CustomEvent('queue-updated'));
        } catch (err) {
          console.error('過號 API 失敗', err);
        }
      } else {
        console.warn('找不到下一位客人或 id 為 undefined，無法過號');
      }
      return;
    }
    
    if (action === '結束') {
      console.log(`設計師 ${designer.name} 結束當前服務`);
      
      // 找到該設計師目前正在服務的客人
      const servingCustomer = currentServing.find(s => s.designerId === designer.id);
      
      if (servingCustomer) {
        try {
          // 呼叫後端 API 完成服務
          const response = await axios.patch(`/api/queue/${servingCustomer.id}/complete`, {
            designerId: designer.id,
            number: servingCustomer.number
          });
          
          if (response.data.success) {
            console.log('服務完成成功:', response.data);
            // 重新載入資料
            loadAll();
            loadTodayQueue();
            // 發送狀態變更事件
            window.dispatchEvent(new CustomEvent('queue-updated'));
          } else {
            console.error('服務完成失敗:', response.data);
          }
        } catch (err) {
          console.error('完成服務 API 失敗', err);
          // 如果 API 失敗，至少更新前端狀態
          setCurrentServing(prev => prev.filter(s => s.designerId !== designer.id));
          window.dispatchEvent(new CustomEvent('queue-updated'));
        }
      } else {
        console.log('該設計師沒有正在服務的客人');
        // 清除目前服務狀態
        setCurrentServing(prev => prev.filter(s => s.designerId !== designer.id));
        window.dispatchEvent(new CustomEvent('queue-updated'));
      }
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>設計師管理</h1>
        <p>可直接操作設計師狀態與客人流程</p>
      </div>
      <div className="serving-grid serving-grid-progress">
        {designers.filter(designer => designer.name !== '不指定').map(designer => {
          const card = getCardData(designer);
          const isPaused = designer.isPaused;
          const designerState = designerStates[designer.id] || {};
          const isOnVacation = designerState.isOnVacation;
          const isPausedOrder = designerState.isPaused;
          
          return (
            <div key={designer.id} className="serving-card-progress" style={{minWidth:900, maxWidth:1200, width:'100%', position:'relative'}}>
              <div className="designer-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span className="designer-title">設計師 <b>{designer.name}</b></span>
                <div style={{display:'flex',gap:'0.5em'}}>
                  <button className="admin-btn" style={{color:'#333',fontWeight:600,fontSize:'1em'}} onClick={()=>handleAction(designer,'調整客人')} title="調整客人">📖</button>
                  <button className="admin-btn" style={{color:'#ff9800',fontWeight:600,fontSize:'1em'}} onClick={()=>handleAction(designer, isPausedOrder ? '恢復接單' : '暫停接單')} title={isPausedOrder ? '恢復接單' : '暫停接單'}>⏸️</button>
                  {isOnVacation ? (
                    <button className="admin-btn" style={{color:'#2196f3',fontWeight:600,fontSize:'1em'}} onClick={()=>handleAction(designer,'恢復上線')} title="恢復上線">🏖️</button>
                  ) : (
                    <button className="admin-btn" style={{color:'#2196f3',fontWeight:600,fontSize:'1em'}} onClick={()=>handleAction(designer,'休假中')} title="休假中">🏖️</button>
                  )}
                </div>
              </div>
              <div className="card-main-row" style={{display:'flex',gap:'0',borderTop:'1px solid #e0e0e0',marginTop:'1em'}}>
                <div className="card-col card-col-now" style={{flex:1,padding:'1em',borderRight:'1px solid #e0e0e0',textAlign:'center',background:'transparent',minHeight:'160px'}}>
                  <div className="col-label" style={{fontWeight:600,marginBottom:'0.5em'}}>目前號碼</div>
                  <div className="col-number now-number" style={{fontSize:'2em',fontWeight:700,background:'transparent',boxShadow:'none',color:'#ff9800'}}>{card.currentNumber}</div>
                  <div className="col-service" style={{fontSize:'1em',color:'#ff9800',marginTop:'0.3em'}}>{card.currentService}</div>
                  <button className="admin-btn" style={{marginTop:'0.7em'}} onClick={()=>handleAction(designer,'結束')}>結束</button>
                </div>
                <div className="card-col card-col-next" style={{flex:1,padding:'1em',textAlign:'center',background:'transparent',minHeight:'160px'}}>
                  <div className="col-label" style={{fontWeight:600,marginBottom:'0.5em'}}>下一位</div>
                  <div className="col-number next-number" style={{fontSize:'2em',fontWeight:700,color:'#ff9800'}}>{card.nextNumber}</div>
                  <div className="col-service" style={{fontSize:'1em',color:'#f7ab5e',marginTop:'0.3em'}}>{card.nextService}</div>
                  <div style={{marginTop:'0.7em', display:'flex', gap:'0.5em', justifyContent:'center'}}>
                    <button className="admin-btn" onClick={()=>handleAction(designer,'報到')}>報到</button>
                    <button className="admin-btn" onClick={()=>handleAction(designer,'過號')}>過號</button>
                  </div>
                </div>
              </div>
              <div style={{marginTop:'1.2em', display:'flex', flexWrap:'wrap', gap:'0.5em', justifyContent:'center'}}>
                {/* 報到、過號按鈕已移至下一位區塊 */}
              </div>
              {isOnVacation && (
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(255,152,0,0.45)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2em',fontWeight:900,color:'#fff',letterSpacing:'4px',pointerEvents:'none',borderRadius:'18px',textShadow:'0 2px 16px #333d38cc'}}>
                  休假中
                </div>
              )}
              {isPausedOrder && !isOnVacation && (
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(120,120,120,0.45)',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2em',fontWeight:900,color:'#fff',letterSpacing:'4px',pointerEvents:'none',borderRadius:'18px',textShadow:'0 2px 16px #333d38cc'}}>
                  暫時停止服務
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 客人轉移彈窗 */}
      {showTransferModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#333d38',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #f7ab5e',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f7ab5e'
            }}>
              <h3 style={{margin: 0, color: '#f7ab5e', fontSize: '1.5rem'}}>
                調整客人 - {selectedDesignerForTransfer?.name}
              </h3>
              <button 
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedDesignerForTransfer(null);
                  setSelectedQueue(null);
                  setTargetDesigner('');
                  setReason('');
                  setTransferMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#f7ab5e',
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>

            {transferMessage && (
              <div style={{
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                background: '#4a5a4f',
                color: '#f7ab5e',
                border: '1px solid #f7ab5e'
              }}>
                {transferMessage}
              </div>
            )}

            <div style={{display: 'grid', gap: '2rem'}}>
              {/* 今日排隊列表 */}
              <div>
                <h4 style={{color: '#f7ab5e', marginBottom: '1rem'}}>今日排隊客人</h4>
                <div style={{maxHeight: '300px', overflow: 'auto'}}>
                  {todayQueue.length === 0 ? (
                    <p style={{color: '#f7ab5e', textAlign: 'center', fontStyle: 'italic'}}>
                      目前沒有等待中的客人
                    </p>
                  ) : (
                    <div style={{display: 'grid', gap: '0.5rem'}}>
                      {todayQueue.map(queue => (
                        <div 
                          key={queue.id} 
                          onClick={() => setSelectedQueue(queue)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            border: `2px solid ${selectedQueue?.id === queue.id ? '#f7ab5e' : '#e9ecef'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            background: selectedQueue?.id === queue.id ? '#4a5a4f' : '#333d38'
                          }}
                        >
                          <div style={{
                            background: '#007bff',
                            color: '#f7ab5e',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontWeight: '600',
                            marginRight: '1rem',
                            minWidth: '60px',
                            textAlign: 'center'
                          }}>
                            #{queue.number}
                          </div>
                          <div style={{flex: 1}}>
                            <div style={{color: '#f7ab5e', fontSize: '0.9rem'}}>
                              設計師: {getDesignerName(queue.designerId)}
                            </div>
                            <div style={{color: '#f7ab5e', fontSize: '0.9rem'}}>
                              服務: {getServiceName(queue.serviceId)}
                            </div>
                            <div style={{color: '#f7ab5e', fontSize: '0.9rem'}}>
                              時間: {formatTime(queue.createdAt)}
                            </div>
                          </div>
                          <div style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            background: '#4a5a4f',
                            color: '#f7ab5e',
                            border: '1px solid #f7ab5e'
                          }}>
                            {getStatusText(queue.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 調整表單 */}
              {selectedQueue && (
                <div style={{
                  background: '#4a5a4f',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '1px solid #f7ab5e'
                }}>
                  <h4 style={{color: '#f7ab5e', marginBottom: '1rem'}}>調整客人</h4>
                  <div style={{marginBottom: '1rem', padding: '1rem', background: '#333d38', borderRadius: '8px'}}>
                    <p style={{margin: '0', color: '#f7ab5e'}}>
                      <strong>選擇的客人:</strong> #{selectedQueue.number} - {getDesignerName(selectedQueue.designerId)}
                    </p>
                    <p style={{margin: '0', color: '#f7ab5e'}}>
                      <strong>服務:</strong> {getServiceName(selectedQueue.serviceId)}
                    </p>
                    <p style={{margin: '0', color: '#f7ab5e'}}>
                      <strong>狀態:</strong> {getStatusText(selectedQueue.status)}
                    </p>
                  </div>

                  <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: '#f7ab5e', fontWeight: '500'}}>
                      調整至設計師:
                    </label>
                    <select 
                      value={targetDesigner} 
                      onChange={(e) => setTargetDesigner(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        background: '#333d38',
                        color: '#f7ab5e'
                      }}
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

                  <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', color: '#f7ab5e', fontWeight: '500'}}>
                      調整原因 (選填):
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="請輸入調整原因..."
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        background: '#333d38',
                        color: '#f7ab5e',
                        resize: 'vertical',
                        minHeight: '100px'
                      }}
                    />
                  </div>

                  <div style={{display: 'flex', gap: '1rem'}}>
                    <button 
                      onClick={handleTransfer}
                      disabled={transferLoading || !targetDesigner}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: transferLoading || !targetDesigner ? '#6c757d' : '#007bff',
                        color: '#f7ab5e',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: transferLoading || !targetDesigner ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      {transferLoading ? '調整中...' : '確認調整'}
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedQueue(null);
                        setTargetDesigner('');
                        setReason('');
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#6c757d',
                        color: '#f7ab5e',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: '500'
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignersList; 