import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="icon">✅</div>
          <h1>Smart Task</h1>
          <p>ระบบจัดการงานออนไลน์</p>
        </div>
        <div className="login-form">
          <h2>เข้าสู่ระบบ</h2>
          {error && <div className="error-msg">⚠️ {error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">ชื่อผู้ใช้</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="กรอกชื่อผู้ใช้" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" />
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : '🔐 เข้าสู่ระบบ'}
            </button>
          </form>
          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            บัญชีเริ่มต้น: <strong>admin</strong> / <strong>admin1234</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
