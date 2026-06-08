import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'user', department: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get('/api/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ username: '', password: '', name: '', role: 'user', department: '' }); setShowModal(true); };
  const openEdit = (u) => { setEditing(u); setForm({ username: u.username, password: '', name: u.name, role: u.role, department: u.department }); setShowModal(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, form);
        toast('เธญเธฑเธเน€เธ”เธ—เธเธนเนเนเธเนเธชเธณเน€เธฃเนเธ');
      } else {
        await api.post('/api/users', form);
        toast('เน€เธเธดเนเธกเธเธนเนเนเธเนเธชเธณเน€เธฃเนเธ');
      }
      load(); setShowModal(false);
    } catch (err) { toast(err.response?.data?.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”', 'error'); }
    finally { setSaving(false); }
  };

  const del = async (u) => {
    if (!confirm(`เธขเธทเธเธขเธฑเธเธฅเธเธเธนเนเนเธเน "${u.name}"?`)) return;
    try { await api.delete(`/api/users/${u.id}`); toast('เธฅเธเธเธนเนเนเธเนเธชเธณเน€เธฃเนเธ'); load(); }
    catch (err) { toast(err.response?.data?.message || 'เธฅเธเนเธกเนเธชเธณเน€เธฃเนเธ', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" onClick={openCreate}>โ• เน€เธเธดเนเธกเธเธนเนเนเธเน</button>
      </div>

      <div className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ</th><th>เธเธทเนเธญเธเธนเนเนเธเน</th><th>เธซเธเนเธงเธขเธเธฒเธ</th><th>เธเธ—เธเธฒเธ—</th><th>เธงเธฑเธเธ—เธตเนเธชเธฃเนเธฒเธ</th><th>เธเธฑเธ”เธเธฒเธฃ</th></tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, background: u.role === 'admin' ? 'var(--accent)' : 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                        {u.id === me?.id && <span className="chip chip-blue" style={{ fontSize: 11 }}>เธเธธเธ“</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.username}</td>
                  <td style={{ fontSize: 13 }}>{u.department || '-'}</td>
                  <td>
                    <span className={`chip ${u.role === 'admin' ? 'chip-orange' : 'chip-gray'}`}>
                      {u.role === 'admin' ? '๐‘‘ เธเธนเนเธ”เธนเนเธฅ' : '๐‘ค เธเธนเนเนเธเน'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13 }}>{new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => openEdit(u)}>โ๏ธ</button>
                      {u.id !== me?.id && (
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => del(u)}>๐—‘๏ธ</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'โ๏ธ เนเธเนเนเธเธเธนเนเนเธเน' : 'โ• เน€เธเธดเนเธกเธเธนเนเนเธเนเนเธซเธกเน'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>ร—</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ <span>*</span></label>
                  <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เธเธทเนเธญเธเธนเนเนเธเน <span>*</span></label>
                    <input className="form-input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="username" disabled={!!editing} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เธฃเธซเธฑเธชเธเนเธฒเธ {editing && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(เน€เธงเนเธเธงเนเธฒเธเธ–เนเธฒเนเธกเนเน€เธเธฅเธตเนเธขเธ)</span>}</label>
                    <input type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="เธฃเธซเธฑเธชเธเนเธฒเธ" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">เธซเธเนเธงเธขเธเธฒเธ</label>
                    <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="เธซเธเนเธงเธขเธเธฒเธ/เนเธเธเธ" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เธเธ—เธเธฒเธ—</label>
                    <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                      <option value="user">เธเธนเนเนเธเนเธเธฒเธ</option>
                      <option value="admin">เธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>เธขเธเน€เธฅเธดเธ</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : '๐’พ เธเธฑเธเธ—เธถเธ'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

