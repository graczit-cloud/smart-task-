import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import Users from './pages/Users';
import Settings from './pages/Settings';
import TaskForm from './components/TaskForm';

const pageTitles = {
  dashboard: 'กระดานงาน',
  'my-tasks': 'งานของฉัน',
  created: 'งานที่ฉันสั่ง',
  assigned: 'งานที่ได้รับมอบหมาย',
  'all-tasks': 'งานทั้งหมด',
  users: 'ผู้ใช้งาน',
  settings: 'ตั้งค่าระบบ',
};

const pageSubtitles = {
  dashboard: 'ภาพรวมงานทั้งหมด - งานเร่งด่วน - งานสำคัญสูง',
  'my-tasks': 'งานที่เกี่ยวข้องกับฉัน',
  created: 'งานที่ฉันเป็นผู้มอบหมาย',
  assigned: 'งานที่ได้รับมอบหมายมาให้',
  'all-tasks': 'งานทั้งหมดในระบบ',
  users: 'จัดการผู้ใช้งานในระบบ',
  settings: 'ตั้งค่าบัญชีและระบบ',
};

function AppInner() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [refresh, setRefresh] = useState(0);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="loading"><div className="spinner" /><p>กำลังโหลดระบบ...</p></div>
    </div>
  );

  if (!user) return <Login />;

  const renderPage = () => {
    if (page === 'dashboard') return <Dashboard key={refresh} onCreateTask={() => setShowCreate(true)} />;
    if (['my-tasks', 'created', 'assigned', 'all-tasks'].includes(page)) return <TaskList key={`${page}-${refresh}`} pageKey={page} />;
    if (page === 'users') return <Users />;
    if (page === 'settings') return <Settings />;
    return null;
  };

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} />
      <main className="main">
        <div className="topbar">
          <div>
            <div className="breadcrumb">
              <span>หน้าหลัก</span>
              <span>›</span>
              <span className="current">{pageTitles[page]}</span>
            </div>
            <div className="page-subtitle">{pageSubtitles[page]}</div>
          </div>
          <div className="topbar-actions">
            <button className="btn-primary" onClick={() => setShowCreate(true)}>➕ สร้างงาน</button>
            <button className="btn-secondary" onClick={() => setRefresh(r => r + 1)}>🔄</button>
          </div>
        </div>
        <div className="page-content">
          {renderPage()}
        </div>
      </main>

      {showCreate && (
        <TaskForm onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); setRefresh(r => r + 1); }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AuthProvider>
  );
}
