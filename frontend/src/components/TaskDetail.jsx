import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import TaskForm from './TaskForm';

const statusLabel = { pending: 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ', inprogress: 'เธเธณเธฅเธฑเธเธ—เธณ', done: 'เน€เธชเธฃเนเธเนเธฅเนเธง', pending_accept: 'เธฃเธญเธ•เธฃเธงเธเธฃเธฑเธ' };
const priorityLabel = { high: '๐”ฅ เธชเธนเธ', normal: '๐”ต เธเธเธ•เธด', low: '๐ข เธ•เนเธณ' };
const statusClass = { pending: 'status-pending', inprogress: 'status-inprogress', done: 'status-done', pending_accept: 'status-pending_accept' };

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TaskDetail({ taskId, onClose, onChanged }) {
  const { user } = useAuth();
  const toast = useToast();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/api/tasks/${taskId}`)
      .then(r => setTask(r.data))
      .catch(() => toast('เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [taskId]);

  const sendComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/tasks/${taskId}/comments`, { comment });
      setComment('');
      load();
    } catch { toast('เธชเนเธเธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธเนเธกเนเธชเธณเน€เธฃเนเธ', 'error'); }
    finally { setSending(false); }
  };

  const deleteTask = async () => {
    if (!confirm('เธขเธทเธเธขเธฑเธเธฅเธเธเธฒเธเธเธตเน?')) return;
    try {
      await api.delete(`/api/tasks/${taskId}`);
      toast('เธฅเธเธเธฒเธเธชเธณเน€เธฃเนเธ');
      onChanged();
      onClose();
    } catch (err) { toast(err.response?.data?.message || 'เธฅเธเนเธกเนเธชเธณเน€เธฃเนเธ', 'error'); }
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task?.due_date && task.due_date < today && task.status !== 'done';
  const canEdit = user?.role === 'admin' || task?.created_by === user?.id || task?.assigned_to === user?.id;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h3>๐“ เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธ</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {canEdit && <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setEditing(true)}>โ๏ธ เนเธเนเนเธ</button>}
            {(user?.role === 'admin' || task?.created_by === user?.id) && (
              <button className="btn-danger" style={{ padding: '6px 12px' }} onClick={deleteTask}>๐—‘๏ธ</button>
            )}
            <button className="btn-close" onClick={onClose}>ร—</button>
          </div>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading"><div className="spinner" /><p>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</p></div>
          ) : task ? (
            <>
              <div className="detail-header">
                <h2 className="detail-title">{task.title}</h2>
                <div className="detail-meta">
                  <span className={`status-badge ${statusClass[task.status]}`}>โ— {statusLabel[task.status]}</span>
                  <span className={`priority-badge priority-${task.priority}`}>{priorityLabel[task.priority]}</span>
                  {isOverdue && <span className="chip chip-orange">โ ๏ธ เน€เธเธดเธเธเธณเธซเธเธ”</span>}
                </div>
              </div>

              {task.description && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
                  {task.description}
                </div>
              )}

              <div className="info-grid">
                <div className="info-item">
                  <div className="info-label">๐“… เธงเธฑเธเธเธฃเธเธเธณเธซเธเธ”</div>
                  <div className="info-value" style={{ color: isOverdue ? 'var(--danger)' : undefined }}>
                    {task.due_date ? `${formatDate(task.due_date)}${task.due_time ? ' เน€เธงเธฅเธฒ ' + task.due_time + ' เธ.' : ''}` : '-'}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-label">๐‘ค เธเธนเนเธชเธฃเนเธฒเธ</div>
                  <div className="info-value">{task.creator_name || '-'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">๐“ เธกเธญเธเธซเธกเธฒเธขเนเธซเน</div>
                  <div className="info-value">{task.assignee_name || 'เธขเธฑเธเนเธกเนเธฃเธฐเธเธธ'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">๐• เธชเธฃเนเธฒเธเน€เธกเธทเนเธญ</div>
                  <div className="info-value">{formatDateTime(task.created_at)}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <h4 style={{ marginBottom: 12, fontSize: 15 }}>๐’ฌ เธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ ({task.comments?.length || 0})</h4>
                {task.comments?.length > 0 ? (
                  <div className="comment-list">
                    {task.comments.map(c => (
                      <div key={c.id} className="comment-item">
                        <div className="comment-avatar">{c.user_name?.charAt(0)}</div>
                        <div className="comment-bubble">
                          <div className="comment-author">{c.user_name}</div>
                          <div className="comment-text">{c.comment}</div>
                          <div className="comment-time">{formatDateTime(c.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>เธขเธฑเธเนเธกเนเธกเธตเธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ</p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="เน€เธเธตเธขเธเธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ..." onKeyDown={e => e.key === 'Enter' && sendComment()} />
                  <button className="btn-primary" onClick={sendComment} disabled={sending} style={{ whiteSpace: 'nowrap' }}>
                    {sending ? '...' : '๐“ฉ เธชเนเธ'}
                  </button>
                </div>
              </div>
            </>
          ) : <p>เนเธกเนเธเธเธเนเธญเธกเธนเธฅ</p>}
        </div>
      </div>

      {editing && task && (
        <TaskForm task={task} onClose={() => setEditing(false)} onSaved={() => { load(); onChanged(); }} />
      )}
    </div>
  );
}

