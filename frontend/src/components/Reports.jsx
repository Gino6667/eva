import { useState, useEffect } from 'react';
import axios from 'axios';
import './Reports.css';

// 卡片統一樣式
const cardStyle = {
  background:'#232a2b',
  borderRadius:'14px',
  boxShadow:'0 2px 12px #0004',
  padding:'1.5em 1.2em',
  minWidth:'90px',
  textAlign:'center',
  fontWeight:700,
  fontSize:'1.1em',
  color:'#fff',
  display:'flex',
  flexDirection:'column',
  alignItems:'center',
  justifyContent:'center',
};

function Reports() {
  const [queue, setQueue] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [services, setServices] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRange, setCustomRange] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState('all');

  // 篩選區間按鈕
  const periodTabs = [
    { id: 'day', name: '日' },
    { id: 'week', name: '週' },
    { id: 'month', name: '月' },
    { id: '3months', name: '3個月' },
    { id: 'halfyear', name: '半年' }
  ];

  // 計算區間起訖日
  useEffect(() => {
    if (customRange) return; // 若為自訂區間則不自動計算
      const today = new Date();
      let start, end;
      end = today.toISOString().split('T')[0];
      switch (period) {
        case 'day':
          start = end;
          break;
        case 'week': {
          const first = new Date(today);
          first.setDate(today.getDate() - today.getDay() + 1); // 週一
          start = first.toISOString().split('T')[0];
          break;
        }
        case 'month': {
          const first = new Date(today.getFullYear(), today.getMonth(), 1);
          start = first.toISOString().split('T')[0];
          break;
        }
      case '3months': {
        const first = new Date(today);
        first.setMonth(today.getMonth() - 2);
        first.setDate(1);
          start = first.toISOString().split('T')[0];
          break;
        }
        case 'halfyear': {
          const first = new Date(today);
          first.setMonth(today.getMonth() - 5);
          first.setDate(1);
          start = first.toISOString().split('T')[0];
          break;
        }
        default:
          start = end;
      }
      setStartDate(start);
      setEndDate(end);
  }, [period, customRange]);

  useEffect(() => {
    async function fetchAll() {
    setLoading(true);
    try {
        const [q, t, d, s, r] = await Promise.all([
          axios.get('/api/queue'),
          axios.get('/api/transactions'),
          axios.get('/api/designers'),
          axios.get('/api/services'),
          axios.get('/api/reservations'),
        ]);
        setQueue(Array.isArray(q.data) ? q.data : []);
        setTransactions(Array.isArray(t.data) ? t.data : []);
        setDesigners(Array.isArray(d.data) ? d.data : []);
        setServices(Array.isArray(s.data) ? s.data : []);
        setReservations(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
    }
    fetchAll();
  }, []);

  // 篩選資料在區間內且設計師
  const inRange = (dateStr) => dateStr >= startDate && dateStr <= endDate;
  const designerFilter = (designerId) => selectedDesigner === 'all' || String(designerId) === String(selectedDesigner);

  // 合併 queue/reservations，根據 userId+serviceId+date 去重
  const merged = [
    ...queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && designerFilter(q.designerId)).map(q => ({
      userId: q.userId,
      serviceId: q.serviceId,
      designerId: q.designerId,
      date: q.createdAt.split('T')[0],
      price: services.find(s => s.id === q.serviceId)?.price || 0,
      type: q.type || 'onsite',
      source: 'queue',
    })),
    ...reservations.filter(r => r.status === 'completed' && inRange(r.date) && designerFilter(r.designerId)).map(r => ({
      userId: r.userId,
      serviceId: r.serviceId,
      designerId: r.designerId,
      date: r.date,
      price: services.find(s => s.id === r.serviceId)?.price || 0,
      type: r.type || 'online',
      source: 'reservation',
    }))
  ];
  // 用 Map 去重
  const uniqueMap = new Map();
  merged.forEach(item => {
    const key = `${item.userId || ''}_${item.serviceId}_${item.date}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  });
  const uniqueList = Array.from(uniqueMap.values());

  // 報表統計全部改用 uniqueList
  const totalRevenue = uniqueList.reduce((sum, item) => sum + item.price, 0)
    + transactions.filter(t => t.category === 'product' && inRange(t.date) && designerFilter(t.designerId)).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalServiceCount = uniqueList.length;
  const totalCustomers = uniqueList.length;
  const totalProductAmount = transactions.filter(t => t.category === 'product' && inRange(t.date) && designerFilter(t.designerId)).reduce((sum, t) => sum + Number(t.amount), 0);

  // 指定/未指定設計師
  const isUnspecified = v => v === undefined || v === null || v === '' || v === 0 || v === '0' || v === -1 || v === 'unassigned';
  const specified = {};
  let unspecifiedCount = 0;
  uniqueList.forEach(item => {
    if (isUnspecified(item.designerId)) {
      unspecifiedCount++;
    } else {
      const d = designers.find(d => d.id === item.designerId);
      const name = d ? d.name : `ID:${item.designerId}`;
      specified[name] = (specified[name] || 0) + 1;
    }
  });
  const hasSpecified = Object.keys(specified).length > 0;

  // 各服務完成次數
  const serviceCount = {};
  uniqueList.forEach(item => {
    const service = services.find(s => s.id === item.serviceId);
    const name = service ? service.name : `ID:${item.serviceId}`;
    serviceCount[name] = (serviceCount[name] || 0) + 1;
  });

  // 完成服務的客人來源
  const onlineDone = uniqueList.filter(item => item.type === 'online').length;
  const onsiteDone = uniqueList.filter(item => item.type === 'onsite').length;

  const formatCurrency = (amount) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(amount);

  return (
    <div className="reports-root" style={{background:'#181c1f',minHeight:'100vh',padding:'2em 0'}}>
      <h2 style={{color:'#f7ab5e',marginBottom:'1.5em',fontWeight:900,letterSpacing:'0.1em',fontSize:'1.5em',textAlign:'center'}}>營運報表總覽</h2>
      {/* 篩選列 */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'1.2em',marginBottom:'2em',alignItems:'center',justifyContent:'center',background:'#232a2b',borderRadius:'12px',padding:'1.2em 2em',boxShadow:'0 2px 12px #0004'}}>
        <div style={{display:'flex',alignItems:'center',gap:'1.2em'}}>
          {periodTabs.map(tab => (
            <button key={tab.id} className={period===tab.id&&!customRange?'active':''} style={{padding:'0.5em 1.3em',fontSize:'1.1em',borderRadius:'8px',border:'none',background:period===tab.id&&!customRange?'#f7ab5e':'#232a2b',color:period===tab.id&&!customRange?'#232a2b':'#f7ab5e',fontWeight:800,cursor:'pointer',boxShadow:period===tab.id&&!customRange?'0 2px 8px #f7ab5e44':'none',transition:'all 0.2s'}} onClick={()=>{setPeriod(tab.id);setCustomRange(false);}}>{tab.name}</button>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'1.2em',marginLeft:'2em'}}>
          <span style={{color:'#f7ab5e',fontWeight:700}}>區間：</span>
          <input type="date" value={startDate} max={endDate} onChange={e=>{setStartDate(e.target.value);setCustomRange(true);setPeriod('custom');}} style={{marginRight:'0.5em',background:'#232a2b',color:'#f7ab5e',border:'1px solid #f7ab5e',borderRadius:'6px',padding:'0.3em 0.7em',fontSize:'1em'}} />
          <span style={{color:'#f7ab5e',fontWeight:700}}>~</span>
          <input type="date" value={endDate} min={startDate} onChange={e=>{setEndDate(e.target.value);setCustomRange(true);setPeriod('custom');}} style={{marginLeft:'0.5em',background:'#232a2b',color:'#f7ab5e',border:'1px solid #f7ab5e',borderRadius:'6px',padding:'0.3em 0.7em',fontSize:'1em'}} />
          <span style={{marginLeft:'1.5em',color:'#f7ab5e',fontWeight:700}}>設計師：</span>
          <select value={selectedDesigner} onChange={e=>setSelectedDesigner(e.target.value)} style={{background:'#232a2b',color:'#f7ab5e',border:'1px solid #f7ab5e',borderRadius:'6px',padding:'0.3em 0.7em',fontSize:'1em'}}>
            <option value="all">全部</option>
            {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      {loading ? <div style={{color:'#f7ab5e',textAlign:'center',fontSize:'1.3em'}}>載入中...</div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'1.5em',margin:'0 auto',maxWidth:'1600px',marginBottom:'2em'}}>
          <div className="summary-card" style={cardStyle}>
            <div className="summary-title">完成服務總次數</div>
            <div className="summary-value">{totalServiceCount}</div>
            <div style={{marginTop:'0.7em',fontWeight:600,color:'#f7ab5e',fontSize:'1.08em'}}>各服務完成次數</div>
            <ul style={{margin:'0.5em 0 0 1.5em',color:'#f7ab5e',fontSize:'1.05em',textAlign:'left'}}>
              {Object.entries(serviceCount).map(([name, count]) => (
                <li key={name}>{name}：{count} 次</li>
              ))}
            </ul>
        </div>
          <div className="summary-card" style={cardStyle}>
            <div className="summary-title">總營業額</div>
            <div className="summary-value">{formatCurrency(totalRevenue)}</div>
        </div>
          <div className="summary-card" style={cardStyle}>
            <div className="summary-title">產品總銷售額</div>
            <div className="summary-value">{formatCurrency(totalProductAmount)}</div>
        </div>
          <div className="summary-card" style={cardStyle}>
            <div className="summary-title">總客流</div>
            <div className="summary-value">{totalCustomers} 人</div>
      </div>
          <div className="summary-card" style={{...cardStyle,background:'#232a2b',color:'#f7ab5e'}}>
            <div className="summary-title">完成服務的客人來源</div>
            <div className="summary-value" style={{fontSize:'1.3em',margin:'0.7em 0'}}>
              <span style={{marginRight:'1.2em'}}>線上 <b style={{color:'#ffb74d'}}>{onlineDone}</b> 人</span>
              <span>現場 <b style={{color:'#4dd0e1'}}>{onsiteDone}</b> 人</span>
        </div>
      </div>
          <div className="summary-card" style={{...cardStyle}}>
            <div className="summary-title">指定設計師</div>
            {!hasSpecified ? <div style={{color:'#f7ab5e'}}>無指定設計師紀錄</div> : (
              <ul style={{margin:'0.7em 0 0 1.5em',color:'#f7ab5e',fontSize:'1.1em'}}>
                {Object.entries(specified).map(([name, count]) => (
                  <li key={name}>{name}：{count} 次</li>
                ))}
              </ul>
            )}
            <div style={{marginTop:'0.7em',color:'#fff',fontWeight:600}}>未指定設計師：{unspecifiedCount} 次</div>
      </div>
        </div>
      )}
    </div>
  );
}

export default Reports; 