import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import TaskDetail from '../components/TaskDetail';
import TaskForm from '../components/TaskForm';

const today = new Date().toISOString().split('T')[0];
const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

function dueDateLabel(due_date, due_time) {
  if (!due_date) return null;
  const diff = Math.ceil((new Date(due_date) - new Date(today)) / 86400000);
  if (diff < 0) return { text: 'เน€เธเธดเธเธเธณเธซเธเธ”', cls: 'chip-orange' };
  if (diff === 0) return { text: 'เธงเธฑเธเธเธตเน', cls: 'chip-orange' };
  if (diff === 1) return { text: 'เธเธฃเธธเนเธเธเธตเน', cls: 'chip-orange' };
  return { text: `เธญเธตเธ ${diff} เธงเธฑเธ`, cls: 'chip-blue' };
}

function TaskCard({ task, onClick }) {
  const label = dueDateLabel(task.due_date);
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
  return (
    <div className={`task-card ${isOverdue ? 'overdue' : task.status === 'done' ? 'done' : ''}`} onClick={() => onClick(task.id)}>
      <div className="task-card-header">
        <div className="task-title">๐“ {task.title}</div>
        <span className={`priority-badge priority-${task.priority}`}>
          {task.priority === 'high' ? '๐”ฅ เธชเธนเธ' : task.priority === 'low' ? '๐ข เธ•เนเธณ' : '๐”ต เธเธเธ•เธด'}
        </span>
      </div>
      <div className="task-meta">
        {task.due_date && (
          <div className="task-meta-row">
            ๐“… {new Date(task.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
            {task.due_time && <span>โฐ {task.due_time} เธ.</span>}
            {label && <span className={`chip ${label.cls}`} style={{ fontSize: 11 }}>({label.text})</span>}
          </div>
        )}
        {task.assignee_name && <div className="task-meta-row">๐‘ค {task.assignee_name}</div>}
      </div>
    </div>
  );
}

export default function Dashboard({ onCreateTask }) {
  const [stats, setStats] = useState(null);
  const [urgent, setUrgent] = useState([]);
  const [highPriority, setHighPriority] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    api.get('/api/tasks/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/api/tasks/urgent').then(r => setUrgent(r.data)).catch(() => {});
    api.get('/api/tasks/high-priority').then(r => setHighPriority(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: 'เธเธฒเธเธ—เธฑเนเธเธซเธกเธ”', value: stats?.total ?? '-', icon: '๐“', cls: 'blue' },
    { label: 'เธฃเธญเธญเธขเธนเน', value: stats?.pending ?? '-', icon: 'โณ', cls: 'orange' },
    { label: 'เธเธณเธฅเธฑเธเธ—เธณ', value: stats?.inprogress ?? '-', icon: '๐”ต', cls: 'purple' },
    { label: 'เน€เธเธดเธเธเธณเธซเธเธ”', value: stats?.overdue ?? '-', icon: '๐”ด', cls: 'red' },
    { label: 'เน€เธชเธฃเนเธเนเธฅเนเธง', value: stats?.done ?? '-', icon: 'โ…', cls: 'green' },
    { label: 'เธเธฒเธเธ—เธตเนเธขเธฑเธเธเนเธฒเธเธญเธขเธนเน', value: stats?.pending_accept ?? '-', icon: '๐“ค', cls: 'pink' },
  ];

  return (
    <div>
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="number">{s.value}</div>
              <div className="label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="section-header">
          <div className="section-title">
            ๐”ฅ เธเธฒเธเน€เธฃเนเธเธ”เนเธงเธ <span className="badge">{urgent.length}</span>
          </div>
          <span className="section-hint">เน€เธเธดเธเธเธณเธซเธเธ” + เธเธฃเธเนเธ 3 เธงเธฑเธ</span>
        </div>
        {urgent.length > 0 ? (
          <div className="task-grid">
            {urgent.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedId} />)}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="icon">๐</div>
            <p>เนเธกเนเธกเธตเธเธฒเธเน€เธฃเนเธเธ”เนเธงเธ</p>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <div className="section-title">
            โญ เธเธฒเธเธชเธณเธเธฑเธเธชเธนเธ <span className="badge badge-blue">{highPriority.length}</span>
          </div>
          <span className="section-hint">Priority = เธชเธนเธ</span>
        </div>
        {highPriority.length > 0 ? (
          <div className="task-grid">
            {highPriority.map(t => <TaskCard key={t.id} task={t} onClick={setSelectedId} />)}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="icon">โจ</div>
            <p>เนเธกเนเธกเธตเธเธฒเธเธชเธณเธเธฑเธเธชเธนเธ</p>
          </div>
        )}
      </div>

      {selectedId && (
        <TaskDetail taskId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
      )}
      {showCreate && (
        <TaskForm onClose={() => setShowCreate(false)} onSaved={load} />
      )}
    </div>
  );
}

