import React, { useState, useEffect } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';

const statusOptions = [
  { value: 'pending', label: 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ' },
  { value: 'inprogress', label: 'เธเธณเธฅเธฑเธเธ—เธณ' },
  { value: 'pending_accept', label: 'เธฃเธญเธ•เธฃเธงเธเธฃเธฑเธ' },
  { value: 'done', label: 'เน€เธชเธฃเนเธเนเธฅเนเธง' },
];

const priorityOptions = [
  { value: 'low', label: 'เธ•เนเธณ' },
  { value: 'normal', label: 'เธเธเธ•เธด' },
  { value: 'high', label: 'เธชเธนเธ' },
];

export default function TaskForm({ task, onClose, onSaved }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'normal',
    due_date: task?.due_date || '',
    due_time: task?.due_time || '',
    assigned_to: task?.assigned_to || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/api/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเธทเนเธญเธเธฒเธ', 'error');
    setSaving(true);
    try {
      if (task) {
        await api.put(`/api/tasks/${task.id}`, form);
        toast('เธญเธฑเธเน€เธ”เธ—เธเธฒเธเธชเธณเน€เธฃเนเธ');
      } else {
        await api.post('/api/tasks', form);
        toast('เธชเธฃเนเธฒเธเธเธฒเธเธชเธณเน€เธฃเนเธ');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast(err.response?.data?.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{task ? 'โ๏ธ เนเธเนเนเธเธเธฒเธ' : 'โ• เธชเธฃเนเธฒเธเธเธฒเธเนเธซเธกเน'}</h3>
          <button className="btn-close" onClick={onClose}>ร—</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">เธเธทเนเธญเธเธฒเธ <span>*</span></label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="เธเธฃเธญเธเธเธทเนเธญเธเธฒเธ..." />
            </div>
            <div className="form-group">
              <label className="form-label">เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”</label>
              <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธญเธเธเธฒเธ..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เธชเธ–เธฒเธเธฐ</label>
                <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">เธเธงเธฒเธกเธชเธณเธเธฑเธ</label>
                <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เธงเธฑเธเธเธฃเธเธเธณเธซเธเธ”</label>
                <input type="date" className="form-input" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">เน€เธงเธฅเธฒ</label>
                <input type="time" className="form-input" value={form.due_time} onChange={e => set('due_time', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">เธกเธญเธเธซเธกเธฒเธขเนเธซเน</label>
              <select className="form-input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                <option value="">-- เนเธกเนเธฃเธฐเธเธธ --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.department})</option>)}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>เธขเธเน€เธฅเธดเธ</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : task ? '๐’พ เธเธฑเธเธ—เธถเธ' : 'โ… เธชเธฃเนเธฒเธเธเธฒเธ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

