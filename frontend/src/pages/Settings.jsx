import React, { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', department: user?.department || '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirm) return toast('เธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ•เธฃเธเธเธฑเธ', 'error');
    setSaving(true);
    try {
      const payload = { name: form.name, department: form.department };
      if (form.password) payload.password = form.password;
      await api.put(`/api/users/${user.id}`, payload);
      toast('เธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธชเธณเน€เธฃเนเธ');
      setForm(f => ({ ...f, password: '', confirm: '' }));
    } catch (err) { toast(err.response?.data?.message || 'เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="section">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>โ๏ธ เธ•เธฑเนเธเธเนเธฒเธเธฑเธเธเธตเธเธญเธเธเธฑเธ</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">เธเธทเนเธญเธเธนเนเนเธเน</label>
            <input className="form-input" value={user?.username} disabled style={{ background: '#f8fafc', color: 'var(--text-muted)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">เธซเธเนเธงเธขเธเธฒเธ</label>
            <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="เธซเธเนเธงเธขเธเธฒเธ/เนเธเธเธ" />
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธ (เน€เธงเนเธเธงเนเธฒเธเธ–เนเธฒเนเธกเนเธ•เนเธญเธเธเธฒเธฃเน€เธเธฅเธตเนเธขเธ)</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน</label>
                <input type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="เธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเน" />
              </div>
              <div className="form-group">
                <label className="form-label">เธขเธทเธเธขเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธ</label>
                <input type="password" className="form-input" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="เธขเธทเธเธขเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธ" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'เธเธณเธฅเธฑเธเธเธฑเธเธ—เธถเธ...' : '๐’พ เธเธฑเธเธ—เธถเธเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธ'}</button>
        </form>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>โน๏ธ เน€เธเธตเนเธขเธงเธเธฑเธเธฃเธฐเธเธ</h3>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <div>๐ข <strong>Smart Task</strong> โ€” เธฃเธฐเธเธเธเธฑเธ”เธเธฒเธฃเธเธฒเธเธญเธญเธเนเธฅเธเน</div>
          <div>๐“ฆ Version 1.0.0</div>
          <div>๐” เธเธ—เธเธฒเธ—เธเธญเธเธเธธเธ“: <strong>{user?.role === 'admin' ? 'เธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธ' : 'เธเธนเนเนเธเนเธเธฒเธ'}</strong></div>
        </div>
      </div>
    </div>
  );
}

