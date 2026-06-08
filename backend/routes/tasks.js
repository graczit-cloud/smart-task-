const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const taskWithUsers = `
  SELECT t.*,
    u1.name as creator_name, u1.department as creator_dept,
    u2.name as assignee_name, u2.department as assignee_dept
  FROM tasks t
  LEFT JOIN users u1 ON t.created_by = u1.id
  LEFT JOIN users u2 ON t.assigned_to = u2.id
`;

router.get('/', (req, res) => {
  const { status, priority, scope } = req.query;
  let where = [];
  let params = [];

  if (scope === 'mine') {
    where.push('t.assigned_to = ?'); params.push(req.user.id);
  } else if (scope === 'created') {
    where.push('t.created_by = ?'); params.push(req.user.id);
  } else if (req.user.role !== 'admin') {
    where.push('(t.created_by = ? OR t.assigned_to = ?)');
    params.push(req.user.id, req.user.id);
  }

  if (status) { where.push('t.status = ?'); params.push(status); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }

  const sql = taskWithUsers + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY t.created_at DESC';
  const tasks = db.prepare(sql).all(...params);
  res.json(tasks);
});

router.get('/stats', (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const uid = req.user.id;

  const base = isAdmin ? '' : 'WHERE created_by = ? OR assigned_to = ?';
  const params = isAdmin ? [] : [uid, uid];

  const total = db.prepare(`SELECT COUNT(*) as c FROM tasks ${base}`).get(...params).c;
  const pending = db.prepare(`SELECT COUNT(*) as c FROM tasks ${base ? base + ' AND' : 'WHERE'} status = 'pending'`).get(...params).c;
  const inprogress = db.prepare(`SELECT COUNT(*) as c FROM tasks ${base ? base + ' AND' : 'WHERE'} status = 'inprogress'`).get(...params).c;
  const done = db.prepare(`SELECT COUNT(*) as c FROM tasks ${base ? base + ' AND' : 'WHERE'} status = 'done'`).get(...params).c;

  const today = new Date().toISOString().split('T')[0];
  const overdueParam = isAdmin ? [today] : [uid, uid, today];
  const overdueBase = isAdmin ? '' : 'AND (created_by = ? OR assigned_to = ?)';
  const overdue = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE status != 'done' AND due_date < ? ${overdueBase}`).get(...overdueParam).c;

  const pending_accept = db.prepare(`SELECT COUNT(*) as c FROM tasks ${base ? base + ' AND' : 'WHERE'} status = 'pending_accept'`).get(...params).c;

  res.json({ total, pending, inprogress, done, overdue, pending_accept });
});

router.get('/urgent', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  const uid = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let where = `t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date <= ?`;
  let params = [in3days];
  if (!isAdmin) { where += ' AND (t.created_by = ? OR t.assigned_to = ?)'; params.push(uid, uid); }

  const tasks = db.prepare(`${taskWithUsers} WHERE ${where} ORDER BY t.due_date ASC LIMIT 10`).all(...params);
  res.json(tasks);
});

router.get('/high-priority', (req, res) => {
  const uid = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let where = `t.priority = 'high' AND t.status != 'done'`;
  let params = [];
  if (!isAdmin) { where += ' AND (t.created_by = ? OR t.assigned_to = ?)'; params.push(uid, uid); }

  const tasks = db.prepare(`${taskWithUsers} WHERE ${where} ORDER BY t.due_date ASC LIMIT 10`).all(...params);
  res.json(tasks);
});

router.get('/:id', (req, res) => {
  const task = db.prepare(`${taskWithUsers} WHERE t.id = ?`).get(req.params.id);
  if (!task) return res.status(404).json({ message: 'ไม่พบงาน' });
  const comments = db.prepare(`
    SELECT tc.*, u.name as user_name FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    WHERE tc.task_id = ? ORDER BY tc.created_at ASC
  `).all(task.id);
  res.json({ ...task, comments });
});

router.post('/', (req, res) => {
  const { title, description, status, priority, due_date, due_time, assigned_to } = req.body;
  if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่องาน' });

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, due_date, due_time, created_by, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', status || 'pending', priority || 'normal', due_date || null, due_time || null, req.user.id, assigned_to || null);

  const task = db.prepare(`${taskWithUsers} WHERE t.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(task);
});

router.put('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ message: 'ไม่พบงาน' });

  const { title, description, status, priority, due_date, due_time, assigned_to } = req.body;
  db.prepare(`
    UPDATE tasks SET title=?, description=?, status=?, priority=?, due_date=?, due_time=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title ?? task.title, description ?? task.description, status ?? task.status, priority ?? task.priority,
    due_date !== undefined ? due_date : task.due_date, due_time !== undefined ? due_time : task.due_time,
    assigned_to !== undefined ? assigned_to : task.assigned_to, req.params.id);

  res.json(db.prepare(`${taskWithUsers} WHERE t.id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ message: 'ไม่พบงาน' });
  if (task.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบงานนี้' });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'ลบงานสำเร็จ' });
});

router.post('/:id/comments', (req, res) => {
  const { comment } = req.body;
  if (!comment) return res.status(400).json({ message: 'กรุณากรอกความคิดเห็น' });
  const result = db.prepare('INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)').run(req.params.id, req.user.id, comment);
  const c = db.prepare(`SELECT tc.*, u.name as user_name FROM task_comments tc JOIN users u ON tc.user_id = u.id WHERE tc.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(c);
});

module.exports = router;
