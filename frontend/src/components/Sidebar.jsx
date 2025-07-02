import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState({ finance: false });

  return (
    <div className="sidebar">
      <ul className="sidebar-menu">
        <li>
          <div className="sidebar-menu-title" onClick={() => setOpenMenu(m => ({ ...m, finance: !m.finance }))}>
            <span>💰 財務管理</span>
            <span className="sidebar-arrow">{openMenu.finance ? '▼' : '▶'}</span>
          </div>
          {openMenu.finance && (
            <ul className="sidebar-submenu">
              {/* 這裡可擴充其他主選單 */}
            </ul>
          )}
        </li>
        {/* 這裡可擴充其他主選單 */}
      </ul>
    </div>
  );
}

export default Sidebar; 