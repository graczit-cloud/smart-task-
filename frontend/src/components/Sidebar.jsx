import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { key: 'dashboard', label: 'กระดานงาน', icon: '⊞' },
];
const myWorkItems = [
  { key: 'my-tasks', label: 'งานของฉัน', icon: '✅' },
  { key: 'created', label: 'งานที่ฉันสั่ง', icon: '📤' },
  { key: 'assigned', label: 'งานที่ได้รับมอบหมาย', icon: '✔️' },
];
const allItems = [
  { key: 'all-tasks', label: 'งานทั้งหมด', icon: '≡' },
];
const adminItems = [
  { key: 'users', label: 'ผู้ใช้งาน', icon: '👤' },
  { key: 'settings', label: 'ตั้งค่าระบบ', icon: '⚙️' },
];

export default function Sidebar({ page, setPage }) {
  const { user, logout } = useAuth();
  const [adminOpen, setAdminOpen] = useState(true);

  const NavBtn = ({ item }) => (
    <button className={`nav-item ${page === item.key ? 'active' : ''}`} onClick={() => setPage(item.key)}>
      <span className="nav-icon">{item.icon}</span>
      {item.label}
    </button>
  );

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">✅</div>
        <h2>Smart Task</h2>
        <p>{user?.department || 'ระบบจัดการงาน'}</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => <NavBtn key={item.key} item={item} />)}

        <div className="nav-section-label">งานของฉัน</div>
        {myWorkItems.map(item => <NavBtn key={item.key} item={item} />)}

        <div className="nav-section-label">ภาพรวม</div>
        {allItems.map(item => <NavBtn key={item.key} item={item} />)}

        {user?.role === 'admin' && (
          <>
            <div className="nav-section-label">จัดการระบบ</div>
            <button className="nav-item" onClick={() => setAdminOpen(!adminOpen)}>
              <span className="nav-icon">⚙️</span>
              จัดการระบบ
              <span style={{ marginLeft: 'auto', fontSize: 12 }}>{adminOpen ? '▲' : '▼'}</span>
            </button>
            {adminOpen && (
              <div className="nav-sub">
                {adminItems.map(item => <NavBtn key={item.key} item={item} />)}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.name?.charAt(0)}</div>
        <div className="user-info">
          <div className="name">{user?.name}</div>
          <div className="role">{user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'}</div>
        </div>
      </div>
      <button className="btn-logout" onClick={logout}>
        ⬅ ออกจากระบบ
      </button>
    </div>
  );
}
