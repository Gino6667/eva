import { useState, useEffect } from 'react';
import axios from 'axios';
import './Worktime.css';

function Worktime() {
  const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  const [worktime, setWorktime] = useState({ 
    openDays: Array(7).fill(true), 
    openTimes: Array(7).fill({start: '09:00', end: '18:00'}), 
    slotConfig: Array(7).fill([]) 
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadWorktime();
    loadServices();
  }, []);

  const loadWorktime = async () => {
    try {
      const response = await axios.get('/api/worktime');
      let wt = response.data || {};
      if (!wt.openDays) wt.openDays = Array(7).fill(true);
      if (!wt.openTimes) wt.openTimes = Array(7).fill({start: '09:00', end: '18:00'});
      if (!wt.slotConfig) wt.slotConfig = Array(7).fill([]);
      setWorktime(wt);
    } catch (err) {
      console.error('載入工作時間失敗:', err);
      setWorktime({ 
        openDays: Array(7).fill(true), 
        openTimes: Array(7).fill({start: '09:00', end: '18:00'}), 
        slotConfig: Array(7).fill([]) 
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await axios.get('/api/services');
      setServices(response.data || []);
    } catch (err) {
      console.error('載入服務失敗:', err);
      setServices([]);
    }
  };

  const handleDayChange = (i) => {
    const openDays = [...worktime.openDays];
    openDays[i] = !openDays[i];
    setWorktime({ ...worktime, openDays });
  };

  const handleTimeChange = (i, type, value) => {
    const openTimes = worktime.openTimes.map((t, idx) => 
      idx === i ? { ...t, [type]: value } : t
    );
    setWorktime({ ...worktime, openTimes });
  };

  const handleSlotChange = (dayIdx, slotIdx, key, value) => {
    const slotConfig = worktime.slotConfig.map((slots, d) => {
      if (d !== dayIdx) return slots;
      return slots.map((slot, s) => 
        s === slotIdx ? { ...slot, [key]: value } : slot
      );
    });
    setWorktime({ ...worktime, slotConfig });
  };

  const handleServiceChange = (dayIdx, slotIdx, serviceIdx) => {
    const slotConfig = worktime.slotConfig.map((slots, d) => {
      if (d !== dayIdx) return slots;
      return slots.map((slot, s) => {
        if (s !== slotIdx) return slot;
        const servicesArr = slot.services ? [...slot.services] : Array(services.length).fill(false);
        servicesArr[serviceIdx] = !servicesArr[serviceIdx];
        return { ...slot, services: servicesArr };
      });
    });
    setWorktime({ ...worktime, slotConfig });
  };

  const addSlot = (dayIdx) => {
    const slotConfig = worktime.slotConfig.map((slots, d) => {
      if (d !== dayIdx) return slots;
      return [...slots, { 
        enabled: true, 
        seats: 5, 
        services: Array(services.length).fill(true) 
      }];
    });
    setWorktime({ ...worktime, slotConfig });
  };

  const removeSlot = (dayIdx, slotIdx) => {
    const slotConfig = worktime.slotConfig.map((slots, d) => {
      if (d !== dayIdx) return slots;
      return slots.filter((_, s) => s !== slotIdx);
    });
    setWorktime({ ...worktime, slotConfig });
  };

  const saveWorktime = async () => {
    setSaving(true);
    setMsg('');
    try {
      await axios.post('/api/worktime', worktime);
      setMsg('儲存成功！');
    } catch (err) {
      setMsg('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="worktime-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="worktime-container">
      <div className="worktime-header">
        <h2 className="reports-title">出勤管理</h2>
        <p>設定每日營業時間與服務時段</p>
      </div>

      <div className="worktime-content">
        <div className="worktime-table-container">
          <table className="worktime-table">
            <thead>
              <tr>
                <th>星期</th>
                <th>營業狀態</th>
                <th>開始時間</th>
                <th>結束時間</th>
                <th>時段設定</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day, i) => (
                <tr key={i} className={!worktime.openDays[i] ? 'closed-day' : ''}>
                  <td className="day-name">{day}</td>
                  <td className="status-cell">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={worktime.openDays[i]} 
                        onChange={() => handleDayChange(i)} 
                      />
                      <span className="toggle-slider"></span>
                      <span className="status-text">
                        {worktime.openDays[i] ? '營業中' : '休息日'}
                      </span>
                    </label>
                  </td>
                  <td className="time-cell">
                    <input 
                      type="time" 
                      value={worktime.openTimes[i]?.start || '09:00'} 
                      onChange={e => handleTimeChange(i, 'start', e.target.value)}
                      disabled={!worktime.openDays[i]}
                      className="time-input"
                    />
                  </td>
                  <td className="time-cell">
                    <input 
                      type="time" 
                      value={worktime.openTimes[i]?.end || '18:00'} 
                      onChange={e => handleTimeChange(i, 'end', e.target.value)}
                      disabled={!worktime.openDays[i]}
                      className="time-input"
                    />
                  </td>
                  <td className="slots-cell">
                    {worktime.openDays[i] ? (
                      <div className="slots-container">
                        {(worktime.slotConfig[i] || []).map((slot, j) => (
                          <div key={j} className="slot-card">
                            <div className="slot-header">
                              <div className="slot-title">
                                <input 
                                  type="checkbox" 
                                  checked={slot.enabled} 
                                  onChange={e => handleSlotChange(i, j, 'enabled', e.target.checked)} 
                                  className="slot-toggle"
                                />
                                <span>時段 {j + 1}</span>
                              </div>
                              <button 
                                onClick={() => removeSlot(i, j)}
                                className="remove-btn"
                                title="刪除時段"
                              >
                                ×
                              </button>
                            </div>
                            
                            {slot.enabled && (
                              <div className="slot-content">
                                <div className="seats-setting">
                                  <label>座位數：</label>
                                  <input 
                                    type="number" 
                                    min={1} 
                                    max={20} 
                                    value={slot.seats || 5} 
                                    onChange={e => handleSlotChange(i, j, 'seats', Number(e.target.value))} 
                                    className="seats-input"
                                  />
                                </div>
                                
                                <div className="services-section">
                                  <label>提供服務：</label>
                                  <div className="services-grid">
                                    {services.map((s, k) => (
                                      <label key={k} className="service-item">
                                        <input 
                                          type="checkbox" 
                                          checked={slot.services?.[k] || false} 
                                          onChange={() => handleServiceChange(i, j, k)} 
                                        />
                                        <span>{s.name}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        <button 
                          onClick={() => addSlot(i)}
                          className="add-slot-btn"
                        >
                          + 新增時段
                        </button>
                      </div>
                    ) : (
                      <div className="closed-message">
                        <span>休息日</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="worktime-actions">
          <button 
            className="save-button" 
            onClick={saveWorktime} 
            disabled={saving}
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
          {msg && (
            <div className={`message ${msg.includes('成功') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Worktime; 