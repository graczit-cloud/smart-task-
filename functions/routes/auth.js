const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'smart-task-secret-2024';

// Seed admin on first use
async function ensureAdmin() {
  const snap = await db.collection('users').where('username', '==', 'admin').get();
  if (snap.empty) {
    const hashed = bcrypt.hashSync('admin1234', 10);
    await db.collection('users').add({
      username: 'admin', password: hashed,
      name: 'สุนทร วิริยะพันธ์', role: 'admin',
      department: 'หน่วยงานสาธารณสุข',
      createdAt: new Date().toISOString()
    });
  }
}
ensureAdmin().catch(console.error);

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

    const snap = await db.collection('users').where('username', '==', username).get();
    if (snap.empty) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const doc = snap.docs[0];
    const user = { id: doc.id, ...doc.data() };
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role, department: user.department } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.user.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    const { password, ...data } = doc.data();
    res.json({ id: doc.id, ...data });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
