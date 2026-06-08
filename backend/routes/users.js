const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, department, created_at FROM users ORDER BY name').all();
  res.json(users);
});

router.post('/', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  const { username, password, name, role, department } = req.body;
  if (!username || !password || !name) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });

  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, name, role, department) VALUES (?, ?, ?, ?, ?)').run(username, hashed, name, role || 'user', department || '');
  const user = db.prepare('SELECT id, username, name, role, department, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  const { name, role, department, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

  const newPassword = password ? bcrypt.hashSync(password, 10) : user.password;
  const newRole = req.user.role === 'admin' ? (role || user.role) : user.role;
  db.prepare('UPDATE users SET name=?, role=?, department=?, password=? WHERE id=?')
    .run(name || user.name, newRole, department !== undefined ? department : user.department, newPassword, req.params.id);

  res.json(db.prepare('SELECT id, username, name, role, department, created_at FROM users WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ message: 'ไม่สามารถลบตัวเองได้' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'ลบผู้ใช้สำเร็จ' });
});

module.exports = router;
