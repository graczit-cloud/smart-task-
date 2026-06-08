const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

async function enrichTask(doc) {
  const data = { id: doc.id, ...doc.data() };
  // fetch creator
  if (data.created_by) {
    try {
      const u = await db.collection('users').doc(data.created_by).get();
      if (u.exists) { data.creator_name = u.data().name; data.creator_dept = u.data().department; }
    } catch {}
  }
  // fetch assignee
  if (data.assigned_to) {
    try {
      const u = await db.collection('users').doc(data.assigned_to).get();
      if (u.exists) { data.assignee_name = u.data().name; data.assignee_dept = u.data().department; }
    } catch {}
  }
  return data;
}

router.get('/stats', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let query = db.collection('tasks');
    const snap = await query.get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!isAdmin) tasks = tasks.filter(t => t.created_by === req.user.id || t.assigned_to === req.user.id);
    const today = new Date().toISOString().split('T')[0];
    res.json({
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length,
      pending_accept: tasks.filter(t => t.status === 'pending_accept').length,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/urgent', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
    const snap = await db.collection('tasks').get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (req.user.role !== 'admin') tasks = tasks.filter(t => t.created_by === req.user.id || t.assigned_to === req.user.id);
    tasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date <= in3days);
    tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
    const enriched = await Promise.all(tasks.slice(0, 10).map(t => enrichTask({ id: t.id, data: () => t })));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/high-priority', async (req, res) => {
  try {
    const snap = await db.collection('tasks').where('priority', '==', 'high').get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (req.user.role !== 'admin') tasks = tasks.filter(t => t.created_by === req.user.id || t.assigned_to === req.user.id);
    tasks = tasks.filter(t => t.status !== 'done');
    tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    const enriched = await Promise.all(tasks.slice(0, 10).map(t => enrichTask({ id: t.id, data: () => t })));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { scope, status, priority } = req.query;
    let query = db.collection('tasks');
    if (priority) query = query.where('priority', '==', priority);
    if (status) query = query.where('status', '==', status);
    const snap = await query.orderBy('createdAt', 'desc').get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (scope === 'mine' || scope === 'assigned') tasks = tasks.filter(t => t.assigned_to === req.user.id);
    else if (scope === 'created') tasks = tasks.filter(t => t.created_by === req.user.id);
    else if (req.user.role !== 'admin') tasks = tasks.filter(t => t.created_by === req.user.id || t.assigned_to === req.user.id);
    const enriched = await Promise.all(tasks.map(t => enrichTask({ id: t.id, data: () => t })));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('tasks').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'ไม่พบงาน' });
    const task = await enrichTask(doc);
    const commSnap = await db.collection('tasks').doc(req.params.id).collection('comments').orderBy('createdAt').get();
    const comments = await Promise.all(commSnap.docs.map(async c => {
      const data = { id: c.id, ...c.data() };
      try { const u = await db.collection('users').doc(data.user_id).get(); if (u.exists) data.user_name = u.data().name; } catch {}
      return data;
    }));
    res.json({ ...task, comments });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, due_date, due_time, assigned_to } = req.body;
    if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่องาน' });
    const ref = await db.collection('tasks').add({
      title, description: description || '',
      status: status || 'pending', priority: priority || 'normal',
      due_date: due_date || null, due_time: due_time || null,
      created_by: req.user.id, assigned_to: assigned_to || null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    const doc = await ref.get();
    res.status(201).json(await enrichTask(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, due_date, due_time, assigned_to } = req.body;
    const update = { updatedAt: new Date().toISOString() };
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    if (due_date !== undefined) update.due_date = due_date;
    if (due_time !== undefined) update.due_time = due_time;
    if (assigned_to !== undefined) update.assigned_to = assigned_to;
    await db.collection('tasks').doc(req.params.id).update(update);
    const doc = await db.collection('tasks').doc(req.params.id).get();
    res.json(await enrichTask(doc));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await db.collection('tasks').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ message: 'ไม่พบงาน' });
    if (doc.data().created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    await db.collection('tasks').doc(req.params.id).delete();
    res.json({ message: 'ลบงานสำเร็จ' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(400).json({ message: 'กรุณากรอกความคิดเห็น' });
    const ref = await db.collection('tasks').doc(req.params.id).collection('comments').add({ user_id: req.user.id, comment, createdAt: new Date().toISOString() });
    const c = await ref.get();
    const data = { id: c.id, ...c.data() };
    try { const u = await db.collection('users').doc(req.user.id).get(); if (u.exists) data.user_name = u.data().name; } catch {}
    res.status(201).json(data);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
