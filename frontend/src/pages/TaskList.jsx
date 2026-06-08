import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import TaskDetail from '../components/TaskDetail';
import TaskForm from '../components/TaskForm';

const statusLabel = { pending: 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ', inprogress: 'เธเธณเธฅเธฑเธเธ—เธณ', done: 'เน€เธชเธฃเนเธเนเธฅเนเธง', pending_accept: 'เธฃเธญเธ•เธฃเธงเธเธฃเธฑเธ' };
const statusClass = { pending: 'status-pending', inprogress: 'status-inprogress', done: 'status-done', pending_accept: 'status-pending_accept' };
const priorityLabel = { high: '๐”ฅ เธชเธนเธ', normal: '๐”ต เธเธเธ•เธด', low: '๐ข เธ•เนเธณ' };

const scopeMap = {
  'my-tasks': { scope: 'mine', title: 'เธเธฒเธเธเธญเธเธเธฑเธ' },
  'created': { scope: 'created', title: 'เธเธฒเธเธ—เธตเนเธเธฑเธเธชเธฑเนเธ' },
  'assigned': { scope: 'mine', title: 'เธเธฒเธเธ—เธตเนเนเธ”เนเธฃเธฑเธเธกเธญเธเธซเธกเธฒเธข' },
  'all-tasks': { scope: 'all', title: 'เธเธฒเธเธ—เธฑเนเธเธซเธกเธ”' },
};

function formatDate(d) {
  if (!d) return '-';
  const today = new Date().toISOString().split('T')[0];
  const diff = Math.ceil((new Date(d) - new Date(today)) / 86400000);
  const base = new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  if (diff < 0) return <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{base} (เน€เธเธดเธเธเธณเธซเธเธ”)</span>;
  if (diff === 0) return <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{base} (เธงเธฑเธเธเธตเน)</span>;
  return base;
}

export default function TaskList({ pageKey, onCreateTask }) {
  const { user } = useAuth();
  const cfg = scopeMap[pageKey] || scopeMap['all-tasks'];
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (cfg.scope !== 'all') params.scope = cfg.scope;
    if (filter !== 'all') params.status = filter;
    api.get('/api/tasks', { params })
      .then(r => setTasks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cfg.scope, filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="filter-bar">
        {['all', 'pending', 'inprogress', 'pending_accept', 'done'].map(s => (
          <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {s === 'all' ? 'เธ—เธฑเนเธเธซเธกเธ”' : statusLabel[s]}
          </button>
        ))}
        <div className="search-box">
          <span>๐”</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="เธเนเธเธซเธฒเธเธฒเธ..." />
        </div>
        <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowCreate(true)}>
          โ• เธชเธฃเนเธฒเธเธเธฒเธ
        </button>
      </div>

      <div className="section">
        {loading ? (
          <div className="loading"><div className="spinner" /><p>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">๐“ญ</div>
            <p>เนเธกเนเธเธเธเธฒเธ{search ? `เธ—เธตเนเธเนเธเธซเธฒ "${search}"` : ''}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>เธเธทเนเธญเธเธฒเธ</th>
                  <th>เธชเธ–เธฒเธเธฐ</th>
                  <th>เธเธงเธฒเธกเธชเธณเธเธฑเธ</th>
                  <th>เธเธฃเธเธเธณเธซเธเธ”</th>
                  <th>เธกเธญเธเธซเธกเธฒเธขเนเธซเน</th>
                  <th>เธเธนเนเธชเธฃเนเธฒเธ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(t.id)}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                      {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.description.slice(0, 60)}{t.description.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td><span className={`status-badge ${statusClass[t.status]}`}>โ— {statusLabel[t.status]}</span></td>
                    <td><span className={`priority-badge priority-${t.priority}`}>{priorityLabel[t.priority]}</span></td>
                    <td style={{ fontSize: 13 }}>{formatDate(t.due_date)}{t.due_time ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>โฐ {t.due_time} เธ.</div> : null}</td>
                    <td style={{ fontSize: 13 }}>{t.assignee_name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                    <td style={{ fontSize: 13 }}>{t.creator_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && <TaskDetail taskId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />}
      {showCreate && <TaskForm onClose={() => setShowCreate(false)} onSaved={load} />}
    </div>
  );
}

