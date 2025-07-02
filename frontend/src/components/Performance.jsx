import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Admin.css';

const serviceIcons = {
  '染髮': '🎨',
  '燙髮': '💈',
  '洗吹剪': '✂️',
  '平頭/國小下/後面推平': '👦',
  // 可依實際服務名稱補充
};

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

function Performance() {
  const [designers, setDesigners] = useState([]);
  const [queue, setQueue] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('summary'); // summary:總表, designerId:個人
  const [period, setPeriod] = useState('day');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    axios.get('/api/designers').then(res => setDesigners(res.data)).catch(()=>setDesigners([]));
    axios.get('/api/queue').then(res => setQueue(Array.isArray(res.data) ? res.data : [])).catch(()=>setQueue([]));
    axios.get('/api/transactions').then(res => setTransactions(Array.isArray(res.data) ? res.data : [])).catch(()=>setTransactions([]));
    axios.get('/api/services').then(res => setServices(res.data)).catch(()=>setServices([]));
    axios.get('/api/reservations').then(res => setReservations(Array.isArray(res.data) ? res.data : [])).catch(()=>setReservations([]));
  }, []);

  // 計算區間起訖日
  useEffect(() => {
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
      default:
        start = end;
    }
    setStartDate(start);
    setEndDate(end);
  }, [period]);

  // 篩選區間按鈕
  const periodTabs = [
    { id: 'day', name: '日' },
    { id: 'week', name: '週' },
    { id: 'month', name: '月' }
  ];

  // 區間內資料過濾
  const inRange = (dateStr) => dateStr >= startDate && dateStr <= endDate;

  // 取得服務名稱
  const getServiceName = (id) => services.find(s => s.id == id)?.name || '未知服務';
  // 取得服務icon
  const getServiceIcon = (name) => serviceIcons[name] || '🛠️';

  // 取得該設計師所有服務明細
  //  const getServiceDetails = (designerId) => {
  //    return transactions.filter(t =>
  //      t.type === 'income' &&
  //      t.designerId == designerId &&
  //      (
  //        t.category === 'service' ||
  //        t.category === '服務' ||
  //        t.category === '服務收入' ||
  //        (t.category !== 'product' && t.category !== '產品' && t.category !== 'product-sale')
  //      )
  //    ).map(t => ({
  //      date: t.date,
  //      name: t.serviceId ? getServiceName(t.serviceId) : (t.description || ''),
  //      amount: t.amount,
  //      serviceId: t.serviceId
  //    }));
  //  };

  // 依服務類別分組
  //  const getServiceStatsByType = (designerId) => {
  //    const details = getServiceDetails(designerId);
  //    const stats = {};
  //    details.forEach(d => {
  //      if (!stats[d.name]) stats[d.name] = { count: 0, total: 0, serviceId: d.serviceId };
  //      stats[d.name].count++;
  //      stats[d.name].total += Number(d.amount);
  //    });
  //    return stats;
  //  };

  // 取得產品銷售明細
  //  const getProductDetails = (designerId) => {
  //    return transactions.filter(t => t.category==='product' && t.designerId==designerId)
  //      .map(t => ({
  //        date: t.date,
  //        name: t.productId ? (products.find(p=>p.id==t.productId)?.name||'未知產品') : (t.description ? t.description.replace(/產品銷售：|（設計師：.*?）/g, '') : ''),
  //        amount: t.amount
  //      }));
  //  };

  // 產品銷售統計
  //  const getProductStats = (designerId) => {
  //    const details = getProductDetails(designerId);
  //    return {
  //      count: details.length,
  //      total: details.reduce((sum, t) => sum + Number(t.amount), 0),
  //      kinds: [...new Set(details.map(t=>t.name))].length
  //    };
  //  };

  // 與 Reports 完全一致的統計
  // 依設計師 id 過濾
  const designerFilter = (designerId, targetId) => !targetId || String(designerId) === String(targetId);
  // summary 卡片統計（依區間）
  const totalServiceCount = queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0])).length + reservations.filter(r => r.status === 'completed' && inRange(r.date)).length;
  const totalServiceAmount = queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0])).reduce((sum, q) => {
    const service = services.find(s => s.id === q.serviceId);
    return sum + (service?.price || 0);
  }, 0) +
    reservations.filter(r => r.status === 'completed' && inRange(r.date)).reduce((sum, r) => {
      const service = services.find(s => s.id === r.serviceId);
      return sum + (service?.price || 0);
    }, 0);
  const totalProductAmount = transactions.filter(t => t.category === 'product' && inRange(t.date)).reduce((sum, t) => sum + Number(t.amount), 0);
  const totalProductKinds = new Set(transactions.filter(t => t.category === 'product' && inRange(t.date)).map(t => t.productId)).size;

  // UI
  return (
    <div className="admin-container" style={{background:'#181c1f',minHeight:'100vh',padding:'2em 0'}}>
      <h2 className="reports-title">設計師個人業績</h2>
      {/* 分頁與篩選列 */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'1.2em',marginBottom:'2em',alignItems:'center',justifyContent:'center',background:'#232a2b',borderRadius:'12px',padding:'1.2em 2em',boxShadow:'0 2px 12px #0004'}}>
        <button className={`btn ${activeTab==='summary'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab('summary')}>總表</button>
        {designers.map(d => (
          <button key={d.id} className={`btn ${activeTab===d.id?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab(d.id)}>{d.name}</button>
        ))}
        <span style={{marginLeft:'2em',color:'#f7ab5e',fontWeight:700}}>區間：</span>
        {periodTabs.map(tab => (
          <button key={tab.id} className={period===tab.id?'active':''} style={{padding:'0.4em 1.1em',fontSize:'1em',borderRadius:'6px',border:'none',background:period===tab.id?'#f7ab5e':'#232a2b',color:period===tab.id?'#232a2b':'#f7ab5e',fontWeight:700,cursor:'pointer',boxShadow:period===tab.id?'0 2px 8px #f7ab5e44':'none'}} onClick={() => setPeriod(tab.id)}>{tab.name}</button>
        ))}
        {(period==='day'||period==='week'||period==='month') && (
          <span style={{marginLeft:'1em',color:'#f7ab5e',fontWeight:700,fontSize:'1.1em'}}>
            日期：{startDate}{period==='day' ? '' : ` ~ ${endDate}`}
          </span>
        )}
      </div>
      {/* summary分頁 */}
      {activeTab==='summary' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'1.5em',margin:'0 auto',maxWidth:'1200px',marginBottom:'2em'}}>
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>服務總次數</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{totalServiceCount}</div></div>
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>服務總金額</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{totalServiceAmount.toLocaleString()}</div></div>
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>銷售產品種類</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{totalProductKinds}</div></div>
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>產品總金額</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{totalProductAmount.toLocaleString()}</div></div>
          </div>
          <div style={{marginBottom:'2em',background:'#232a2b',borderRadius:'12px',padding:'1.5em',boxShadow:'0 2px 12px #0004'}}>
            <h2 style={{color:'#f7ab5e',marginBottom:'1em'}}>設計師業績總表</h2>
            <table style={{width:'100%',background:'none',color:'#f7ab5e',borderRadius:'10px',overflow:'hidden'}}>
              <thead>
                <tr>
                  <th>設計師</th>
                  <th>完成服務數</th>
                  <th>服務總金額</th>
                  <th>銷售產品種類</th>
                  <th>產品總金額</th>
                </tr>
              </thead>
              <tbody>
                {designers.map(designer => {
                  // 完成服務數
                  const finishedServiceCount = queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && String(q.designerId) === String(designer.id)).length
                    + reservations.filter(r => r.status === 'completed' && inRange(r.date) && String(r.designerId) === String(designer.id)).length;
                  // 服務總金額
                  const finishedServiceAmount = queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && String(q.designerId) === String(designer.id)).reduce((sum, q) => {
                    const service = services.find(s => s.id === q.serviceId);
                    return sum + (service?.price || 0);
                  }, 0) +
                    reservations.filter(r => r.status === 'completed' && inRange(r.date) && String(r.designerId) === String(designer.id)).reduce((sum, r) => {
                      const service = services.find(s => s.id === r.serviceId);
                      return sum + (service?.price || 0);
                    }, 0);
                  // 產品種類
                  const productKinds = new Set(transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(designer.id)).map(t => t.productId)).size;
                  // 產品總金額
                  const productTotal = transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(designer.id)).reduce((sum, t) => sum + Number(t.amount), 0);
                  return (
                    <tr key={designer.id} style={{background:'#232a2b'}}>
                      <td>{designer.name}</td>
                      <td>{finishedServiceCount}</td>
                      <td>${finishedServiceAmount.toLocaleString()}</td>
                      <td>{productKinds}</td>
                      <td>${productTotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* 個人分頁 */}
      {activeTab!=='summary' && (
        <div style={{padding:'2em',background:'#232a2b',borderRadius:'12px',maxWidth:'1200px',margin:'0 auto'}}>
          <h2 style={{color:'#f7ab5e',marginBottom:'1.5em',fontWeight:800}}>{designers.find(d=>d.id===activeTab)?.name} 的業績總覽</h2>
          {/* 個人總業績卡片 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1.5em',marginBottom:'2em'}}>
            {/* 服務總次數 */}
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>服務總次數</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && String(q.designerId) === String(activeTab)).length + reservations.filter(r => r.status === 'completed' && inRange(r.date) && String(r.designerId) === String(activeTab)).length}</div></div>
            {/* 服務總金額 */}
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>服務總金額</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{(
              queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && String(q.designerId) === String(activeTab)).reduce((sum, q) => {
                const service = services.find(s => s.id === q.serviceId);
                return sum + (service?.price || 0);
              }, 0) +
              reservations.filter(r => r.status === 'completed' && inRange(r.date) && String(r.designerId) === String(activeTab)).reduce((sum, r) => {
                const service = services.find(s => s.id === r.serviceId);
                return sum + (service?.price || 0);
              }, 0)
            ).toLocaleString()}</div></div>
            {/* 產品總金額 */}
            <div style={cardStyle}><div style={{fontSize:'1.1em',color:'#f7ab5e'}}>產品總金額</div><div style={{fontSize:'2em',margin:'0.3em 0'}}>{transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(activeTab)).reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString()}</div></div>
          </div>
          {/* 服務統計 */}
          <h3 style={{color:'#f7ab5e',margin:'1.5em 0 0.7em'}}>服務類型統計</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'1.2em',marginBottom:'2em'}}>
            {(() => {
              // 統計服務類型
              const serviceCount = {};
              queue.filter(q => q.status === 'done' && inRange(q.createdAt.split('T')[0]) && String(q.designerId) === String(activeTab)).forEach(q => {
                const service = services.find(s => s.id === q.serviceId);
                const name = service ? service.name : `ID:${q.serviceId}`;
                serviceCount[name] = (serviceCount[name] || 0) + 1;
              });
              reservations.filter(r => r.status === 'completed' && inRange(r.date) && String(r.designerId) === String(activeTab)).forEach(r => {
                const service = services.find(s => s.id === r.serviceId);
                const name = service ? service.name : `ID:${r.serviceId}`;
                serviceCount[name] = (serviceCount[name] || 0) + 1;
              });
              return Object.entries(serviceCount).length > 0 ? Object.entries(serviceCount).map(([name, count]) => (
                <div key={name} style={{background:'#333d38',borderRadius:'10px',padding:'1.5em',boxShadow:'0 2px 12px #0002',textAlign:'center'}}>
                  <div style={{fontWeight:700,fontSize:'1.2em',margin:'0.5em 0'}}>{name}</div>
                  <div>完成次數：<b>{count}</b></div>
                </div>
              )) : <div style={{color:'#f7ab5e'}}>尚無服務紀錄</div>;
            })()}
          </div>
          {/* 產品統計 */}
          <h3 style={{color:'#f7ab5e',margin:'1.5em 0 0.7em'}}>產品銷售統計</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'1.2em'}}>
            <div style={{background:'#333d38',borderRadius:'10px',padding:'1.5em',boxShadow:'0 2px 12px #0002',textAlign:'center'}}>
              <div style={{fontWeight:700,fontSize:'1.2em',margin:'0.5em 0'}}>銷售產品種類：{new Set(transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(activeTab)).map(t => t.productId)).size}</div>
              <div>銷售總數：<b>{transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(activeTab)).length}</b></div>
              <div>總金額：<b>{transactions.filter(t => t.category === 'product' && inRange(t.date) && String(t.designerId) === String(activeTab)).reduce((sum, t) => sum + Number(t.amount), 0).toLocaleString()}</b></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Performance; 