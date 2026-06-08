// ============================================================
// Smart Task - Google Apps Script Backend
// Deploy as: Web App > Anyone > Execute as Me
// ============================================================

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
const JWT_SECRET = PropertiesService.getScriptProperties().getProperty('JWT_SECRET') || 'smart-task-secret-2024';

// ---- CORS Helper ----
function makeResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ---- Sheet helpers ----
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Add headers
    const headers = {
      users: ['id','username','password','name','role','department','createdAt'],
      tasks: ['id','title','description','status','priority','due_date','due_time','created_by','assigned_to','createdAt','updatedAt'],
      comments: ['id','task_id','user_id','comment','createdAt']
    };
    if (headers[name]) sheet.appendRow(headers[name]);
  }
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function generateId() {
  return Utilities.getUuid();
}

// ---- Simple JWT ----
function signJWT(payload) {
  const header = Utilities.base64EncodeWebSafe(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 }));
  const sig = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(header + '.' + body, JWT_SECRET)
  );
  return header + '.' + body + '.' + sig;
}

function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1])).getDataAsString());
    if (payload.exp && Date.now() > payload.exp) return null;
    const expected = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(parts[0] + '.' + parts[1], JWT_SECRET)
    );
    if (expected !== parts[2]) return null;
    return payload;
  } catch(e) { return null; }
}

function hashPassword(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + JWT_SECRET);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function checkPassword(password, hash) {
  return hashPassword(password) === hash;
}

function getAuthUser(e) {
  const auth = (e.parameter.token) || '';
  if (!auth) return null;
  return verifyJWT(auth);
}

// ---- Init admin ----
function ensureAdmin() {
  const sheet = getSheet('users');
  const users = sheetToObjects(sheet);
  if (!users.find(u => u.username === 'admin')) {
    sheet.appendRow([generateId(), 'admin', hashPassword('admin1234'), 'สุนทร วิริยะพันธ์', 'admin', 'หน่วยงานสาธารณสุข', new Date().toISOString()]);
  }
}

// ============================================================
// MAIN ROUTER
// ============================================================
function doGet(e) {
  try {
    ensureAdmin();
    const path = e.parameter.path || '';
    const token = e.parameter.token || '';
    const user = token ? verifyJWT(token) : null;

    if (path === 'auth/me') return handleMe(user);
    if (path === 'tasks/stats') return handleStats(user);
    if (path === 'tasks/urgent') return handleUrgent(user);
    if (path === 'tasks/high-priority') return handleHighPriority(user);
    if (path.startsWith('tasks/') && path.split('/').length === 2) return handleGetTask(path.split('/')[1], user);
    if (path === 'tasks') return handleGetTasks(e, user);
    if (path === 'users') return handleGetUsers(user);

    return makeResponse({ message: 'Not found' }, 404);
  } catch(err) {
    return makeResponse({ message: err.message }, 500);
  }
}

function doPost(e) {
  try {
    ensureAdmin();
    const path = e.parameter.path || '';
    const body = JSON.parse(e.postData ? e.postData.contents : '{}');
    const token = e.parameter.token || body._token || '';
    const user = token ? verifyJWT(token) : null;
    const method = body._method || 'POST';

    if (path === 'auth/login') return handleLogin(body);

    if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);

    // Simulate PUT / DELETE
    if (method === 'DELETE') {
      if (path.startsWith('tasks/')) return handleDeleteTask(path.split('/')[1], user);
      if (path.startsWith('users/')) return handleDeleteUser(path.split('/')[1], user);
    }
    if (method === 'PUT') {
      if (path.startsWith('tasks/')) return handleUpdateTask(path.split('/')[1], body, user);
      if (path.startsWith('users/')) return handleUpdateUser(path.split('/')[1], body, user);
    }
    if (path === 'tasks') return handleCreateTask(body, user);
    if (path.match(/^tasks\/[^/]+\/comments$/)) return handleAddComment(path.split('/')[1], body, user);
    if (path === 'users') return handleCreateUser(body, user);

    return makeResponse({ message: 'Not found' }, 404);
  } catch(err) {
    return makeResponse({ message: err.message }, 500);
  }
}

// ============================================================
// AUTH
// ============================================================
function handleLogin(body) {
  const { username, password } = body;
  if (!username || !password) return makeResponse({ message: 'กรุณากรอกข้อมูลให้ครบ' }, 400);
  const users = sheetToObjects(getSheet('users'));
  const u = users.find(x => x.username === username);
  if (!u || !checkPassword(password, u.password)) return makeResponse({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401);
  const token = signJWT({ id: u.id, role: u.role });
  return makeResponse({ token, user: { id: u.id, name: u.name, username: u.username, role: u.role, department: u.department } });
}

function handleMe(user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  const users = sheetToObjects(getSheet('users'));
  const u = users.find(x => x.id === user.id);
  if (!u) return makeResponse({ message: 'ไม่พบผู้ใช้' }, 404);
  return makeResponse({ id: u.id, name: u.name, username: u.username, role: u.role, department: u.department });
}

// ============================================================
// USERS
// ============================================================
function handleGetUsers(user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  const users = sheetToObjects(getSheet('users')).map(u => ({ id: u.id, name: u.name, username: u.username, role: u.role, department: u.department, createdAt: u.createdAt }));
  users.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  return makeResponse(users);
}

function handleCreateUser(body, user) {
  if (user.role !== 'admin') return makeResponse({ message: 'ไม่มีสิทธิ์' }, 403);
  const { username, password, name, role, department } = body;
  if (!username || !password || !name) return makeResponse({ message: 'กรุณากรอกข้อมูลให้ครบ' }, 400);
  const users = sheetToObjects(getSheet('users'));
  if (users.find(u => u.username === username)) return makeResponse({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' }, 409);
  const newUser = { id: generateId(), username, password: hashPassword(password), name, role: role||'user', department: department||'', createdAt: new Date().toISOString() };
  getSheet('users').appendRow(Object.values(newUser));
  return makeResponse({ id: newUser.id, name: newUser.name, username: newUser.username, role: newUser.role, department: newUser.department, createdAt: newUser.createdAt });
}

function handleUpdateUser(id, body, user) {
  if (user.role !== 'admin' && user.id !== id) return makeResponse({ message: 'ไม่มีสิทธิ์' }, 403);
  const sheet = getSheet('users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowIdx = data.findIndex((r, i) => i > 0 && r[headers.indexOf('id')] === id);
  if (rowIdx === -1) return makeResponse({ message: 'ไม่พบผู้ใช้' }, 404);
  if (body.name) data[rowIdx][headers.indexOf('name')] = body.name;
  if (body.department !== undefined) data[rowIdx][headers.indexOf('department')] = body.department;
  if (user.role === 'admin' && body.role) data[rowIdx][headers.indexOf('role')] = body.role;
  if (body.password) data[rowIdx][headers.indexOf('password')] = hashPassword(body.password);
  sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([data[rowIdx]]);
  return makeResponse({ id, name: data[rowIdx][headers.indexOf('name')], role: data[rowIdx][headers.indexOf('role')], department: data[rowIdx][headers.indexOf('department')] });
}

function handleDeleteUser(id, user) {
  if (user.role !== 'admin') return makeResponse({ message: 'ไม่มีสิทธิ์' }, 403);
  if (id === user.id) return makeResponse({ message: 'ไม่สามารถลบตัวเองได้' }, 400);
  const sheet = getSheet('users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowIdx = data.findIndex((r, i) => i > 0 && r[headers.indexOf('id')] === id);
  if (rowIdx > 0) sheet.deleteRow(rowIdx + 1);
  return makeResponse({ message: 'ลบผู้ใช้สำเร็จ' });
}

// ============================================================
// TASKS
// ============================================================
function enrichTask(task) {
  const users = sheetToObjects(getSheet('users'));
  const creator = users.find(u => u.id === task.created_by);
  const assignee = users.find(u => u.id === task.assigned_to);
  return {
    ...task,
    creator_name: creator ? creator.name : '',
    creator_dept: creator ? creator.department : '',
    assignee_name: assignee ? assignee.name : '',
    assignee_dept: assignee ? assignee.department : '',
  };
}

function handleGetTasks(e, user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  const { scope, status, priority } = e.parameter;
  let tasks = sheetToObjects(getSheet('tasks'));
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  if (scope === 'mine' || scope === 'assigned') tasks = tasks.filter(t => t.assigned_to === user.id);
  else if (scope === 'created') tasks = tasks.filter(t => t.created_by === user.id);
  else if (user.role !== 'admin') tasks = tasks.filter(t => t.created_by === user.id || t.assigned_to === user.id);
  tasks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return makeResponse(tasks.map(enrichTask));
}

function handleGetTask(id, user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  const tasks = sheetToObjects(getSheet('tasks'));
  const task = tasks.find(t => t.id === id);
  if (!task) return makeResponse({ message: 'ไม่พบงาน' }, 404);
  const comments = sheetToObjects(getSheet('comments'))
    .filter(c => c.task_id === id)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const users = sheetToObjects(getSheet('users'));
  const enrichedComments = comments.map(c => ({ ...c, user_name: (users.find(u => u.id === c.user_id) || {}).name || '' }));
  return makeResponse({ ...enrichTask(task), comments: enrichedComments });
}

function handleStats(user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  let tasks = sheetToObjects(getSheet('tasks'));
  if (user.role !== 'admin') tasks = tasks.filter(t => t.created_by === user.id || t.assigned_to === user.id);
  const today = new Date().toISOString().split('T')[0];
  return makeResponse({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length,
    pending_accept: tasks.filter(t => t.status === 'pending_accept').length,
  });
}

function handleUrgent(user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  const in3days = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
  let tasks = sheetToObjects(getSheet('tasks'));
  if (user.role !== 'admin') tasks = tasks.filter(t => t.created_by === user.id || t.assigned_to === user.id);
  tasks = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date <= in3days);
  tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  return makeResponse(tasks.slice(0, 10).map(enrichTask));
}

function handleHighPriority(user) {
  if (!user) return makeResponse({ message: 'ไม่ได้เข้าสู่ระบบ' }, 401);
  let tasks = sheetToObjects(getSheet('tasks')).filter(t => t.priority === 'high' && t.status !== 'done');
  if (user.role !== 'admin') tasks = tasks.filter(t => t.created_by === user.id || t.assigned_to === user.id);
  tasks.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  return makeResponse(tasks.slice(0, 10).map(enrichTask));
}

function handleCreateTask(body, user) {
  const { title, description, status, priority, due_date, due_time, assigned_to } = body;
  if (!title) return makeResponse({ message: 'กรุณากรอกชื่องาน' }, 400);
  const now = new Date().toISOString();
  const task = { id: generateId(), title, description: description||'', status: status||'pending', priority: priority||'normal', due_date: due_date||'', due_time: due_time||'', created_by: user.id, assigned_to: assigned_to||'', createdAt: now, updatedAt: now };
  getSheet('tasks').appendRow(Object.values(task));
  return makeResponse(enrichTask(task));
}

function handleUpdateTask(id, body, user) {
  const sheet = getSheet('tasks');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowIdx = data.findIndex((r, i) => i > 0 && r[headers.indexOf('id')] === id);
  if (rowIdx === -1) return makeResponse({ message: 'ไม่พบงาน' }, 404);
  const fields = ['title','description','status','priority','due_date','due_time','assigned_to'];
  fields.forEach(f => { if (body[f] !== undefined) data[rowIdx][headers.indexOf(f)] = body[f]; });
  data[rowIdx][headers.indexOf('updatedAt')] = new Date().toISOString();
  sheet.getRange(rowIdx + 1, 1, 1, headers.length).setValues([data[rowIdx]]);
  const updated = {};
  headers.forEach((h, i) => updated[h] = data[rowIdx][i]);
  return makeResponse(enrichTask(updated));
}

function handleDeleteTask(id, user) {
  const sheet = getSheet('tasks');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rowIdx = data.findIndex((r, i) => i > 0 && r[headers.indexOf('id')] === id);
  if (rowIdx === -1) return makeResponse({ message: 'ไม่พบงาน' }, 404);
  if (data[rowIdx][headers.indexOf('created_by')] !== user.id && user.role !== 'admin') return makeResponse({ message: 'ไม่มีสิทธิ์' }, 403);
  sheet.deleteRow(rowIdx + 1);
  return makeResponse({ message: 'ลบงานสำเร็จ' });
}

function handleAddComment(taskId, body, user) {
  const { comment } = body;
  if (!comment) return makeResponse({ message: 'กรุณากรอกความคิดเห็น' }, 400);
  const now = new Date().toISOString();
  const c = { id: generateId(), task_id: taskId, user_id: user.id, comment, createdAt: now };
  getSheet('comments').appendRow(Object.values(c));
  const users = sheetToObjects(getSheet('users'));
  const u = users.find(x => x.id === user.id);
  return makeResponse({ ...c, user_name: u ? u.name : '' });
}
