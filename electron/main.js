const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db = null;
let SQL = null;
let currentDbPath = null;
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');

// ─── Pre-load sql.js engine once at startup ───────────────────────────────────
const initSqlJs = require('sql.js');
initSqlJs().then(instance => {
  SQL = instance;
  console.log('[SQL Browser] sql.js engine loaded ✓');
}).catch(err => {
  console.error('[SQL Browser] FATAL: sql.js failed to load:', err);
});

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open DevTools for debugging — comment out after fixing
    mainWindow.webContents.openDevTools();
  });

  buildMenu();
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    { label: 'File', submenu: [
      { label: 'Open Database...', accelerator: 'CmdOrCtrl+O', click: () => openFileDialog() },
      { type: 'separator' },
      { label: 'Close Database', click: () => closeDatabase() },
      { type: 'separator' },
      { role: 'quit' },
    ]},
    { label: 'View', submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ]},
    { label: 'Help', submenu: [
      { label: 'About SyncNest', click: () => mainWindow.webContents.send('show-about') },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Recent Files ─────────────────────────────────────────────────────────────
function getRecentFiles() {
  try {
    if (fs.existsSync(recentFilesPath)) {
      return JSON.parse(fs.readFileSync(recentFilesPath, 'utf8')).filter(f => fs.existsSync(f));
    }
  } catch (e) {}
  return [];
}

function addRecentFile(filePath) {
  let recent = getRecentFiles();
  recent = [filePath, ...recent.filter(f => f !== filePath)].slice(0, 10);
  try { fs.writeFileSync(recentFilesPath, JSON.stringify(recent)); } catch(e){}
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
function execRows(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function execScalar(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) stmt.bind(params);
  let val = null;
  if (stmt.step()) {
    const obj = stmt.getAsObject();
    val = obj[Object.keys(obj)[0]];
  }
  stmt.free();
  return val;
}

function getTablesInfo() {
  if (!db) return [];
  const res = db.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
  if (!res.length) return [];
  return res[0].values.map(v => {
    const name = v[0];
    let rowCount = 0;
    try { rowCount = execScalar(`SELECT COUNT(*) FROM "${name}"`); } catch(e) {}
    return { name, rowCount };
  });
}

// ─── Open / Close DB ──────────────────────────────────────────────────────────
function closeDatabase() {
  if (db) {
    try { db.close(); } catch(e) {}
    db = null;
    currentDbPath = null;
    mainWindow.webContents.send('db-closed');
    console.log('[SQL Browser] Database closed');
  }
}

function openDatabase(filePath) {
  console.log('[SQL Browser] Opening DB:', filePath);

  if (!SQL) {
    const msg = 'Database engine is still loading, please try again in a moment.';
    mainWindow.webContents.send('db-error', msg);
    return { success: false, error: msg };
  }

  if (!fs.existsSync(filePath)) {
    const msg = `File not found: ${filePath}`;
    mainWindow.webContents.send('db-error', msg);
    return { success: false, error: msg };
  }

  // Close existing db first (silently, then reopen)
  if (db) {
    try { db.close(); } catch(e) {}
    db = null;
    currentDbPath = null;
    mainWindow.webContents.send('db-closed');
  }

  try {
    const filebuffer = fs.readFileSync(filePath);
    db = new SQL.Database(filebuffer);
    currentDbPath = filePath;
    addRecentFile(filePath);

    const tables = getTablesInfo();
    console.log('[SQL Browser] Tables found:', tables.map(t => t.name));

    mainWindow.webContents.send('db-opened', {
      path: filePath,
      name: path.basename(filePath),
      tables,
    });
    return { success: true };
  } catch (err) {
    console.error('[SQL Browser] Error opening DB:', err);
    mainWindow.webContents.send('db-error', err.message);
    return { success: false, error: err.message };
  }
}

async function openFileDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Open SQLite Database',
    filters: [
      { name: 'SQLite Databases', extensions: ['db', 'sqlite', 'sqlite3', 'db3', 's3db', 'sl3'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (!canceled && filePaths.length > 0) openDatabase(filePaths[0]);
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog',  async () => openFileDialog());
ipcMain.handle('open-database',     (_, fp) => openDatabase(fp));
ipcMain.handle('close-database',    () => { closeDatabase(); return { success: true }; });
ipcMain.handle('get-recent-files',  () => getRecentFiles());

ipcMain.handle('get-tables', () => {
  if (!db) return { error: 'No database open' };
  return { tables: getTablesInfo() };
});

ipcMain.handle('get-table-data', (_, { table, page, pageSize, sortCol, sortDir, search }) => {
  if (!db) return { error: 'No database open' };
  console.log('[SQL Browser] get-table-data:', table, 'page:', page);
  try {
    const offset = (page - 1) * pageSize;

    // Column names from PRAGMA
    const pragmaRows = execRows(`PRAGMA table_info("${table}")`);
    const cols = pragmaRows.map(r => ({ name: r.name }));
    console.log('[SQL Browser] Columns:', cols.map(c => c.name));

    // Search filter
    let whereClause = '';
    let params = [];
    if (search && search.trim()) {
      const conditions = cols.map(c => `CAST("${c.name}" AS TEXT) LIKE ?`).join(' OR ');
      whereClause = `WHERE ${conditions}`;
      params = cols.map(() => `%${search.trim()}%`);
    }

    // Total count
    const total = execScalar(`SELECT COUNT(*) FROM "${table}" ${whereClause}`, params) || 0;
    console.log('[SQL Browser] Total rows:', total);

    // Order
    const orderClause = sortCol
      ? `ORDER BY "${sortCol}" ${sortDir === 'desc' ? 'DESC' : 'ASC'}`
      : '';

    // Fetch rows
    const rows = execRows(
      `SELECT * FROM "${table}" ${whereClause} ${orderClause} LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    console.log('[SQL Browser] Rows fetched:', rows.length);

    return { columns: cols, rows, total, page, pageSize };
  } catch (err) {
    console.error('[SQL Browser] get-table-data error:', err);
    return { error: err.message };
  }
});

ipcMain.handle('get-table-schema', (_, table) => {
  if (!db) return { error: 'No database open' };
  try {
    const columns = execRows(`PRAGMA table_info("${table}")`);
    const indexes = execRows(`PRAGMA index_list("${table}")`);
    const res = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`, [table]);
    const createSql = (res.length && res[0].values.length) ? res[0].values[0][0] : '';
    return { columns, indexes, createSql };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('run-query', (_, sql) => {
  if (!db) return { error: 'No database open' };
  try {
    const start = Date.now();
    const res = db.exec(sql);
    const elapsed = Date.now() - start;
    if (res.length) {
      const columns = res[0].columns.map(name => ({ name }));
      const rows = res[0].values.map(row => {
        const obj = {};
        res[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      });
      return { type: 'select', columns, rows, rowCount: rows.length, elapsed };
    } else {
      return { type: 'write', changes: db.getRowsModified(), elapsed };
    }
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('export-csv', async (_, { data, filename }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export as CSV',
    defaultPath: filename || 'export.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });
  if (canceled) return { canceled: true };
  try {
    fs.writeFileSync(filePath, data, 'utf8');
    shell.showItemInFolder(filePath);
    return { success: true, filePath };
  } catch (err) {
    return { error: err.message };
  }
});

// ─── Update Row ───────────────────────────────────────────────────────────────
ipcMain.handle('update-row', (_, { table, pkColumn, pkValue, updates }) => {
  if (!db) return { error: 'No database open' };
  try {
    const setClauses = Object.keys(updates)
      .map(col => `"${col}" = ?`)
      .join(', ');
    const values = Object.values(updates);
    values.push(pkValue);
    db.run(`UPDATE "${table}" SET ${setClauses} WHERE "${pkColumn}" = ?`, values);
    // Persist change back to file
    if (currentDbPath) {
      const data = db.export();
      fs.writeFileSync(currentDbPath, Buffer.from(data));
    }
    return { success: true, changes: db.getRowsModified() };
  } catch (err) {
    console.error('[SyncNest] update-row error:', err);
    return { error: err.message };
  }
});

// ─── Delete Row ───────────────────────────────────────────────────────────────
ipcMain.handle('delete-row', (_, { table, pkColumn, pkValue }) => {
  if (!db) return { error: 'No database open' };
  try {
    db.run(`DELETE FROM "${table}" WHERE "${pkColumn}" = ?`, [pkValue]);
    // Persist change back to file
    if (currentDbPath) {
      const data = db.export();
      fs.writeFileSync(currentDbPath, Buffer.from(data));
    }
    return { success: true, changes: db.getRowsModified() };
  } catch (err) {
    console.error('[SyncNest] delete-row error:', err);
    return { error: err.message };
  }
});

ipcMain.handle('get-db-info', () => {
  if (!db) return { error: 'No database open' };
  try {
    const stats = fs.statSync(currentDbPath);
    const tableCount = execScalar(`SELECT COUNT(*) FROM sqlite_master WHERE type='table'`) || 0;
    const viewCount  = execScalar(`SELECT COUNT(*) FROM sqlite_master WHERE type='view'`)  || 0;
    const res = db.exec(`SELECT sqlite_version()`);
    const sqliteVersion = res.length ? res[0].values[0][0] : 'Unknown';
    return { path: currentDbPath, name: path.basename(currentDbPath),
      size: stats.size, modified: stats.mtime, tableCount, viewCount, sqliteVersion };
  } catch (err) {
    return { error: err.message };
  }
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (db) try { db.close(); } catch(e) {}
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
