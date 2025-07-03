import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState({ finance: false });

  return (
    <div className="sidebar-bottom-bar">
      <ul className="sidebar-menu-bottom">
        <li onClick={() => navigate('/')}>首頁</li>
        <li onClick={() => navigate('/queue')}>現場排隊</li>
        <li onClick={() => navigate('/queue-progress')}>即時看板</li>
        <li onClick={() => navigate('/reservation')}>線上抽號</li>
        <li onClick={() => navigate('/profile')}>會員中心</li>
        <li>
          <button className="sidebar-logout-btn" onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}>
            登出
          </button>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar; 