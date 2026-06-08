const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const snap = await db.collection('users').orderBy('name').get();
    const users = snap.docs.map(d => { const { password, ...data } = d.data(); return { id: d.id, ...data }; });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  try {
    const { username, password, name, role, department } = req.body;
    if (!username || !password || !name) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
    const existing = await db.collection('users').where('username', '==', username).get();
    if (!existing.empty) return res.status(409).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    const hashed = bcrypt.hashSync(password, 10);
    const ref = await db.collection('users').add({ username, password: hashed, name, role: role || 'user', department: department || '', createdAt: new Date().toISOString() });
    const doc = await ref.get();
    const { password: _, ...data } = doc.data();
    res.status(201).json({ id: doc.id, ...data });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  try {
    const { name, role, department, password } = req.body;
    const update = {};
    if (name) update.name = name;
    if (department !== undefined) update.department = department;
    if (req.user.role === 'admin' && role) update.role = role;
    if (password) update.password = bcrypt.hashSync(password, 10);
    await db.collection('users').doc(req.params.id).update(update);
    const doc = await db.collection('users').doc(req.params.id).get();
    const { password: _, ...data } = doc.data();
    res.json({ id: doc.id, ...data });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'ไม่สามารถลบตัวเองได้' });
  try {
    await db.collection('users').doc(req.params.id).delete();
    res.json({ message: 'ลบผู้ใช้สำเร็จ' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
