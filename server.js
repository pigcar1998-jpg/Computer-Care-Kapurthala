/* Computer Care local backend: static website + JSON database API. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const DB_DIR = path.join(ROOT, 'db');
const DB_FILE = path.join(DB_DIR, 'database.json');
const INITIAL_FILE = path.join(DB_DIR, 'initial-data.json');
const MAX_BODY = 25 * 1024 * 1024;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const STORAGE_ADAPTERS = [
  { id:'remote', title:'Remote Storage', group:'Remote', side:'Server', state:'Ready', format:'REST JSON' },
  { id:'local', title:'Local Storage', group:'Client-Side', side:'Browser', state:'Live', format:'JSON' },
  { id:'file', title:'File-Based Storage', group:'Flat Files', side:'Client/Server', state:'Live', format:'JSON' },
  { id:'cookies', title:'Cookies Storage', group:'Client-Side', side:'Browser', state:'Live', format:'Metadata' },
  { id:'session', title:'Session Storage', group:'Client-Side', side:'Browser', state:'Live', format:'JSON' },
  { id:'indexeddb', title:'Indexed DB', group:'Client-Side', side:'Browser', state:'Live', format:'Object store' },
  { id:'cache', title:'Cache API', group:'Client-Side', side:'Browser', state:'Live', format:'Response JSON' },
  { id:'server', title:'Server-Side - Backend + Database', group:'Server-Side', side:'Node.js', state:'Live', format:'db/database.json' },
  { id:'browser', title:'Client-Side - Browser-Based', group:'Client-Side', side:'Browser', state:'Live', format:'HTML/CSS/JS' },
  { id:'relational', title:'Relational Databases', group:'Database', side:'Server', state:'Blueprint', format:'MySQL schema' },
  { id:'nosql', title:'NoSQL Databases', group:'Database', side:'Server', state:'Blueprint', format:'MongoDB collections' },
  { id:'flat', title:'Flat Files', group:'Flat Files', side:'Client/Server', state:'Live', format:'JSON/CSV/XML' },
  { id:'cloudDb', title:'Cloud Databases', group:'Cloud', side:'Server', state:'Ready', format:'API adapter' },
  { id:'csvExcel', title:'CSV/Excel', group:'Exports', side:'Client/Server', state:'Live', format:'CSV/XLSX' },
  { id:'pdf', title:'PDF', group:'Exports', side:'Client', state:'Live', format:'Print/PDF' },
  { id:'jsonXml', title:'JSON/XML', group:'Exports', side:'Client/Server', state:'Live', format:'JSON/XML' },
  { id:'google', title:'Google Sheets / Google Drive', group:'Cloud APIs', side:'Remote', state:'Needs credentials', format:'OAuth/API' },
  { id:'dropbox', title:'Dropbox / OneDrive APIs', group:'Cloud APIs', side:'Remote', state:'Needs credentials', format:'OAuth/API' },
  { id:'restGraphql', title:'REST APIs / GraphQL APIs', group:'APIs', side:'Server', state:'Live', format:'REST/GraphQL' },
  { id:'specialized', title:'Specialized Storage', group:'Advanced', side:'Server', state:'Ready', format:'Adapter' },
  { id:'sessions', title:'Session Management Systems', group:'Security', side:'Browser/Server', state:'Live', format:'Session JSON' },
  { id:'blockchain', title:'Blockchain Storage', group:'Advanced', side:'Remote', state:'Blueprint', format:'Hash ledger' },
  { id:'object', title:'Object Storage', group:'Cloud', side:'Remote', state:'Ready', format:'Blob/object' },
  { id:'node', title:'Node.js Backend', group:'Technology', side:'Server', state:'Live', format:'HTTP API' },
  { id:'react', title:'React.js Frontend Adapter', group:'Technology', side:'Client', state:'Blueprint', format:'Component adapter' },
  { id:'python', title:'Python Utility Adapter', group:'Technology', side:'Server/Tools', state:'Blueprint', format:'CLI scripts' },
  { id:'mysql', title:'MySQL Adapter', group:'Technology', side:'Server', state:'Blueprint', format:'SQL tables' },
  { id:'mongodb', title:'MongoDB Adapter', group:'Technology', side:'Server', state:'Blueprint', format:'Collections' },
  { id:'exe', title:'EXE Desktop Package', group:'Packaging', side:'Desktop', state:'Blueprint', format:'Electron' },
  { id:'apk', title:'APK Mobile Package', group:'Packaging', side:'Android', state:'Blueprint', format:'Capacitor/PWA' },
];

const MYSQL_SCHEMA = `
CREATE TABLE students (id VARCHAR(40) PRIMARY KEY, name VARCHAR(160), mobile VARCHAR(30), email VARCHAR(160), course VARCHAR(160), batch_no VARCHAR(80), status VARCHAR(40), total_fees DECIMAL(12,2), raw_json JSON);
CREATE TABLE teachers (id VARCHAR(40) PRIMARY KEY, name VARCHAR(160), mobile VARCHAR(30), email VARCHAR(160), subject VARCHAR(160), salary DECIMAL(12,2), active BOOLEAN, raw_json JSON);
CREATE TABLE payments (id VARCHAR(80) PRIMARY KEY, student_id VARCHAR(40), payment_date DATE, amount DECIMAL(12,2), mode VARCHAR(60), note TEXT, raw_json JSON);
CREATE TABLE attendance (id BIGINT AUTO_INCREMENT PRIMARY KEY, month_key VARCHAR(7), person_id VARCHAR(40), day_no INT, status VARCHAR(4));
CREATE TABLE courses (id VARCHAR(40) PRIMARY KEY, name VARCHAR(160), duration VARCHAR(80), fees DECIMAL(12,2), raw_json JSON);
CREATE TABLE inquiries (id VARCHAR(40) PRIMARY KEY, name VARCHAR(160), mobile VARCHAR(30), course VARCHAR(160), batch_no VARCHAR(80), source VARCHAR(80), status VARCHAR(40), priority VARCHAR(20), inquiry_date DATE, follow_up_date DATE, raw_json JSON);
`.trim();

function ensureDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seed = fs.existsSync(INITIAL_FILE)
      ? JSON.parse(fs.readFileSync(INITIAL_FILE, 'utf8'))
      : {};
    seed._schema = seed._schema || 'computer-care-localstorage-v2';
    seed._updatedAt = seed._updatedAt || new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw || '{}');
}

function writeDb(data) {
  ensureDb();
  const payload = {
    ...(data || {}),
    _schema: (data && data._schema) || 'computer-care-localstorage-v2',
    _updatedAt: (data && data._updatedAt) || new Date().toISOString(),
  };
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, DB_FILE);
  return payload;
}

function requireOptional(name) {
  try { return require(name); } catch (err) { return null; }
}

function countPayments(fees) {
  return Object.values(fees || {}).reduce((sum, record) => {
    if (Array.isArray(record)) return sum + record.length;
    return sum + ((record && record.payments && record.payments.length) || 0);
  }, 0);
}

function getCollections(db) {
  return {
    students: db.cc_students || [],
    teachers: db.cc_teachers || [],
    courses: db.cc_courses || [],
    fees: db.cc_fees || {},
    attendance: db.cc_attendance || {},
    timetable: db.cc_timetable || {},
    topics: db.cc_topics || [],
    gallery: db.cc_gallery || [],
    tasks: db.cc_tasks || [],
    salary: db.cc_salary || {},
    notifications: db.cc_notifications || [],
    internships: db.cc_internships || [],
    inquiries: db.cc_inquiries || [],
    blog: db.cc_blog || [],
    teacherNotes: db.cc_teacher_notes || [],
    settings: db.cc_settings || {},
  };
}

function getDbSummary(db) {
  const c = getCollections(db);
  return {
    students: c.students.length,
    teachers: c.teachers.length,
    courses: c.courses.length,
    payments: countPayments(c.fees),
    attendanceMonths: Object.keys(c.attendance).length,
    topics: c.topics.length,
    tasks: c.tasks.length,
    internships: c.internships.length,
    inquiries: c.inquiries.length,
    notifications: c.notifications.length,
    updatedAt: db._updatedAt || null,
  };
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, headers, rows) {
  const body = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function studentCsvRows(db) {
  const c = getCollections(db);
  const headers = ['ID', 'Name', 'Father', 'Mobile', 'Email', 'Course', 'Batch', 'Status', 'Total Fees'];
  const rows = c.students.map(s => [s.id, s.name, s.fatherName, s.mobile, s.email, s.course, s.batchNo, s.courseStatus, s.totalFees || 0]);
  return { headers, rows };
}

function teacherCsvRows(db) {
  const c = getCollections(db);
  const headers = ['ID', 'Name', 'Qualification', 'Subject', 'Mobile', 'Email', 'Join Date', 'Salary', 'Active'];
  const rows = c.teachers.map(t => [t.id, t.name, t.qualification, t.subject, t.mobile, t.email, t.joinDate, t.salary || 0, t.active !== false]);
  return { headers, rows };
}

function feeCsvRows(db) {
  const c = getCollections(db);
  const students = new Map(c.students.map(s => [s.id, s]));
  const headers = ['Student ID', 'Student', 'Course', 'Date', 'Amount', 'Mode', 'Note'];
  const rows = [];
  Object.entries(c.fees).forEach(([studentId, record]) => {
    const student = students.get(studentId) || {};
    const payments = Array.isArray(record) ? record : ((record && record.payments) || []);
    payments.forEach(payment => rows.push([
      studentId,
      student.name || studentId,
      student.course || '',
      payment.date || '',
      payment.amount || 0,
      payment.mode || payment.method || 'Cash',
      payment.note || payment.remark || '',
    ]));
  });
  return { headers, rows };
}

function flattenObjectRows(value, prefix = '') {
  if (!value || typeof value !== 'object') return [[prefix, value]];
  return Object.entries(value).flatMap(([key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) return flattenObjectRows(child, next);
    return [[next, Array.isArray(child) ? JSON.stringify(child) : child]];
  });
}

function csvForCollection(db, collection) {
  const c = getCollections(db);
  if (collection === 'students') return studentCsvRows(db);
  if (collection === 'teachers') return teacherCsvRows(db);
  if (collection === 'fees') return feeCsvRows(db);
  if (Array.isArray(c[collection])) {
    const keys = Array.from(c[collection].reduce((set, item) => {
      Object.keys(item || {}).forEach(key => set.add(key));
      return set;
    }, new Set()));
    return { headers: keys.length ? keys : ['value'], rows: c[collection].map(item => keys.map(key => item && item[key])) };
  }
  return { headers: ['Key', 'Value'], rows: flattenObjectRows(c[collection] || {}) };
}

function normalizeExcelValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value ?? '';
}

function addWorkbookTable(workbook, name, columns, rows, tabColor = 'FF0F766E') {
  const ws = workbook.addWorksheet(name.slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    properties: { tabColor: { argb: tabColor } },
  });
  ws.mergeCells(1, 1, 1, columns.length);
  ws.mergeCells(2, 1, 2, columns.length);
  ws.getCell(1, 1).value = name;
  ws.getCell(1, 1).font = { name:'Aptos Display', bold:true, size:18, color:{ argb:'FFFFFFFF' } };
  ws.getCell(1, 1).alignment = { horizontal:'center', vertical:'middle', wrapText:true };
  ws.getCell(1, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0F172A' } };
  ws.getCell(2, 1).value = `${rows.length} record(s) | Exported ${new Date().toLocaleString()}`;
  ws.getCell(2, 1).alignment = { horizontal:'center', vertical:'middle', wrapText:true };
  ws.getCell(2, 1).fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF8FAFC' } };
  ws.getRow(4).values = columns.map(c => c.header);
  ws.getRow(4).eachCell(cell => {
    cell.font = { name:'Aptos', bold:true, color:{ argb:'FFFFFFFF' } };
    cell.alignment = { horizontal:'center', vertical:'middle', wrapText:true, textRotation:0 };
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF164E63' } };
    cell.border = workbookThinBorder();
  });
  rows.forEach((row, index) => {
    const excelRow = ws.addRow(columns.map(c => normalizeExcelValue(row[c.key])));
    excelRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];
      cell.alignment = { vertical:'top', wrapText:true };
      cell.border = workbookThinBorder();
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:index % 2 ? 'FFFFFFFF' : 'FFF8FAFC' } };
      if (col && col.numFmt) cell.numFmt = col.numFmt;
    });
  });
  if (!rows.length) {
    const empty = ws.addRow(['No records found']);
    ws.mergeCells(empty.number, 1, empty.number, columns.length);
  }
  ws.columns = columns.map(c => ({ width: c.width || 18 }));
  ws.views = [{ state:'frozen', ySplit:4 }];
  ws.autoFilter = { from:{ row:4, column:1 }, to:{ row:Math.max(5, rows.length + 4), column:columns.length } };
  ws.pageSetup.printTitlesRow = '1:4';
}

function workbookThinBorder() {
  const line = { style:'thin', color:{ argb:'FFE2E8F0' } };
  return { top:line, left:line, bottom:line, right:line };
}

function paymentsForWorkbook(db) {
  const c = getCollections(db);
  const students = new Map(c.students.map(s => [s.id, s]));
  const rows = [];
  Object.entries(c.fees).forEach(([studentId, record]) => {
    const student = students.get(studentId) || {};
    const payments = Array.isArray(record) ? record : ((record && record.payments) || []);
    if (!payments.length) rows.push({ studentId, studentName:student.name || studentId, course:student.course || '', amount:0, note:'No payments recorded' });
    payments.forEach(payment => rows.push({
      studentId,
      studentName: student.name || studentId,
      course: student.course || '',
      date: payment.date || '',
      amount: Number(payment.amount) || 0,
      mode: payment.mode || payment.method || 'Cash',
      note: payment.note || payment.remark || '',
    }));
  });
  return rows;
}

function attendanceForWorkbook(db) {
  const c = getCollections(db);
  const people = new Map([...c.students.map(s => [s.id, s.name]), ...c.teachers.map(t => [t.id, t.name])]);
  const rows = [];
  Object.entries(c.attendance).forEach(([month, records]) => {
    Object.entries(records || {}).forEach(([personId, days]) => {
      const values = Object.values(days || {});
      const present = values.filter(v => v === 'P').length;
      const absent = values.filter(v => v === 'A').length;
      const leave = values.filter(v => v === 'L').length;
      const total = present + absent + leave;
      rows.push({ month, personId, name:people.get(personId) || personId, present, absent, leave, percentage:total ? Math.round((present / total) * 100) : 0 });
    });
  });
  return rows;
}

async function buildMasterWorkbookBuffer(db) {
  const ExcelJS = requireOptional('exceljs');
  if (!ExcelJS) return null;
  const c = getCollections(db);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Computer Care Academy Management';
  workbook.created = new Date();
  workbook.modified = new Date();

  const dash = workbook.addWorksheet('Dashboard', { pageSetup:{ paperSize:9, orientation:'landscape', fitToPage:true, fitToWidth:1, fitToHeight:0 } });
  dash.mergeCells('A1:H1');
  dash.getCell('A1').value = 'Computer Care Academy - Master Data Dashboard';
  dash.getCell('A1').font = { name:'Aptos Display', size:18, bold:true, color:{ argb:'FFFFFFFF' } };
  dash.getCell('A1').alignment = { horizontal:'center' };
  dash.getCell('A1').fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0F172A' } };
  dash.getRow(3).values = ['Metric', 'Value', 'Metric', 'Value', 'Metric', 'Value'];
  const summary = getDbSummary(db);
  [
    ['Students', summary.students, 'Teachers', summary.teachers, 'Courses', summary.courses],
    ['Payments', summary.payments, 'Attendance Months', summary.attendanceMonths, 'Internships', summary.internships],
    ['Tasks', summary.tasks, 'Notifications', summary.notifications, 'Adapters', STORAGE_ADAPTERS.length],
  ].forEach(row => dash.addRow(row));
  dash.eachRow(row => row.eachCell(cell => { cell.border = workbookThinBorder(); cell.alignment = { wrapText:true, vertical:'middle' }; }));
  dash.columns = Array.from({ length:8 }, () => ({ width:20 }));

  addWorkbookTable(workbook, 'Students', [
    { header:'ID', key:'id', width:14 }, { header:'Name', key:'name', width:24 }, { header:'Father', key:'fatherName', width:22 },
    { header:'Mobile', key:'mobile', width:15 }, { header:'Email', key:'email', width:24 }, { header:'Course', key:'course', width:24 },
    { header:'Batch', key:'batchNo', width:14 }, { header:'Status', key:'courseStatus', width:14 }, { header:'Total Fees', key:'totalFees', width:13, numFmt:'#,##0' },
  ], c.students, 'FF2563EB');
  addWorkbookTable(workbook, 'Teachers', [
    { header:'ID', key:'id', width:14 }, { header:'Name', key:'name', width:24 }, { header:'Qualification', key:'qualification', width:18 },
    { header:'Subject', key:'subject', width:18 }, { header:'Mobile', key:'mobile', width:15 }, { header:'Email', key:'email', width:24 },
    { header:'Join Date', key:'joinDate', width:14 }, { header:'Salary', key:'salary', width:13, numFmt:'#,##0' }, { header:'Performance', key:'performance', width:16 },
  ], c.teachers, 'FF0F766E');
  addWorkbookTable(workbook, 'Fees', [
    { header:'Student ID', key:'studentId', width:14 }, { header:'Student', key:'studentName', width:24 }, { header:'Course', key:'course', width:24 },
    { header:'Date', key:'date', width:14 }, { header:'Amount', key:'amount', width:13, numFmt:'#,##0' }, { header:'Mode', key:'mode', width:14 }, { header:'Note', key:'note', width:34 },
  ], paymentsForWorkbook(db), 'FFF59E0B');
  addWorkbookTable(workbook, 'Attendance', [
    { header:'Month', key:'month', width:12 }, { header:'Person ID', key:'personId', width:14 }, { header:'Name', key:'name', width:24 },
    { header:'Present', key:'present', width:11 }, { header:'Absent', key:'absent', width:11 }, { header:'Leave', key:'leave', width:11 }, { header:'Percentage', key:'percentage', width:13, numFmt:'0"%"' },
  ], attendanceForWorkbook(db), 'FFDC2626');
  addWorkbookTable(workbook, 'Courses', [
    { header:'ID', key:'id', width:12 }, { header:'Name', key:'name', width:28 }, { header:'Duration', key:'duration', width:14 }, { header:'Fees', key:'fees', width:12, numFmt:'#,##0' }, { header:'Subcategories', key:'subcategories', width:44 },
  ], c.courses, 'FF2563EB');
  addWorkbookTable(workbook, 'Tasks', [
    { header:'ID', key:'id', width:16 }, { header:'Title', key:'title', width:28 }, { header:'Assigned To', key:'assignedTo', width:18 }, { header:'Status', key:'status', width:14 }, { header:'Priority', key:'priority', width:12 }, { header:'Description', key:'description', width:42 },
  ], c.tasks, 'FFF59E0B');
  addWorkbookTable(workbook, 'Internships', [
    { header:'ID', key:'id', width:16 }, { header:'Student', key:'studentName', width:24 }, { header:'Program', key:'program', width:28 }, { header:'Company', key:'company', width:24 }, { header:'Mentor', key:'mentor', width:22 }, { header:'Status', key:'status', width:14 },
  ], c.internships, 'FF2563EB');
  addWorkbookTable(workbook, 'Inquiries', [
    { header:'ID', key:'id', width:16 }, { header:'Name', key:'name', width:24 }, { header:'Mobile', key:'mobile', width:16 },
    { header:'Course', key:'course', width:28 }, { header:'Batch', key:'batchNo', width:14 }, { header:'Source', key:'source', width:16 },
    { header:'Status', key:'status', width:14 }, { header:'Priority', key:'priority', width:12 }, { header:'Follow Up', key:'followUpDate', width:14 },
  ], c.inquiries, 'FFDC2626');
  addWorkbookTable(workbook, 'Storage Map', [
    { header:'Storage Type', key:'title', width:30 }, { header:'Group', key:'group', width:20 }, { header:'Side', key:'side', width:18 }, { header:'State', key:'state', width:16 }, { header:'Format', key:'format', width:18 },
  ], STORAGE_ADAPTERS, 'FF0F766E');
  addWorkbookTable(workbook, 'Raw JSON', [
    { header:'Key', key:'key', width:28 }, { header:'JSON Value', key:'value', width:90 },
  ], Object.entries(db).map(([key, value]) => ({ key, value:JSON.stringify(value, null, 2) })), 'FF0F172A');

  return workbook.xlsx.writeBuffer();
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(res, requestPath) {
  const safePath = decodeURIComponent(requestPath.split('?')[0]);
  const filePath = path.normalize(path.join(ROOT, safePath === '/' ? 'index.html' : safePath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ['.html', '.css', '.js', '.json'].includes(ext) ? 'no-store' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/api/health') {
      const db = readDb();
      sendJson(res, 200, {
        ok: true,
        app: 'Computer Care Academy Backend',
        databaseFile: DB_FILE,
        updatedAt: db._updatedAt || null,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/storage/adapters') {
      const db = readDb();
      sendJson(res, 200, {
        ok: true,
        adapters: STORAGE_ADAPTERS,
        summary: getDbSummary(db),
        databaseFile: DB_FILE,
        updatedAt: db._updatedAt || null,
        technologies: {
          nodejs: 'live',
          reactjs: 'adapter-ready',
          mongodb: 'blueprint',
          mysql: 'blueprint',
          python: 'utility-ready',
          exe: 'electron-blueprint',
          apk: 'capacitor-pwa-blueprint',
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/storage/summary') {
      sendJson(res, 200, { ok: true, summary: getDbSummary(readDb()) });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/storage/schema/mysql') {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(MYSQL_SCHEMA + '\n');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/storage/schema/mongodb') {
      sendJson(res, 200, {
        ok: true,
        database: 'computerCareAcademy',
        collections: Object.keys(getCollections(readDb())).filter(key => key !== 'settings'),
        strategy: 'Mirror each existing cc_* JSON key as a MongoDB collection or keep one academy snapshot document for exact compatibility.',
      });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/export/csv/')) {
      const collection = url.pathname.split('/').pop();
      const csv = csvForCollection(readDb(), collection);
      sendCsv(res, `computer-care-${collection}-${new Date().toISOString().slice(0, 10)}.csv`, csv.headers, csv.rows);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/export/master.xlsx') {
      const buffer = await buildMasterWorkbookBuffer(readDb());
      if (!buffer) {
        sendJson(res, 501, {
          ok: false,
          error: 'ExcelJS dependency is not installed. Run npm install, then retry this export.',
        });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="computer-care-master-data-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        'Cache-Control': 'no-store',
      });
      res.end(Buffer.from(buffer));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/graphql') {
      const body = await readBody(req);
      const parsed = JSON.parse(body || '{}');
      const query = String(parsed.query || '').toLowerCase();
      const db = readDb();
      sendJson(res, 200, {
        data: {
          summary: getDbSummary(db),
          adapters: query.includes('adapter') ? STORAGE_ADAPTERS : undefined,
          database: query.includes('database') || query.includes('db') ? db : undefined,
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/db') {
      sendJson(res, 200, readDb());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/db/download') {
      const db = JSON.stringify(readDb(), null, 2);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="computer-care-database-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'no-store',
      });
      res.end(db);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/db') {
      const body = await readBody(req);
      const parsed = JSON.parse(body || '{}');
      const saved = writeDb(parsed);
      sendJson(res, 200, { ok: true, updatedAt: saved._updatedAt });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/storage/snapshot') {
      const body = await readBody(req);
      const parsed = JSON.parse(body || '{}');
      const saved = writeDb(parsed);
      sendJson(res, 200, { ok: true, updatedAt: saved._updatedAt, summary: getDbSummary(saved) });
      return;
    }

    serveStatic(res, url.pathname);
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
});

ensureDb();
server.listen(PORT, () => {
  console.log(`Computer Care backend running at http://localhost:${PORT}`);
  console.log(`Database file: ${DB_FILE}`);
});
