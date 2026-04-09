import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

// ─── Firewall & Network Noise Suppression ─────────────────────────────────────
// Disable common Chromium features that trigger Windows Firewall prompts
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
app.commandLine.appendSwitch('disable-device-discovery-notifications');
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('remote-debugging-port', '0');

let mainWindow: BrowserWindow | null = null;
let db: any = null;
let currentDbPath: string | null = null;
const recentFilesPath = path.join(app.getPath('userData'), 'recent-files.json');

// ─── Pre-load sql.js engine once at startup ───────────────────────────────────

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    icon: path.join(__dirname, '../src/assets/icon.png'),
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide default menu bar for clean, professional UI
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Check for updates
    autoUpdater.checkForUpdatesAndNotify();
  });
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'File', submenu: [
        { label: 'Open Database...', accelerator: 'CmdOrCtrl+O', click: () => openFileDialog() },
        { type: 'separator' },
        { label: 'Close Database', click: () => closeDatabase() },
        { type: 'separator' },
        { role: 'quit' },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View', submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ]
    },
    {
      label: 'Help', submenu: [
        { label: 'About SyncNest', click: () => mainWindow.webContents.send('show-about') },
      ]
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── Recent Files ─────────────────────────────────────────────────────────────
function getRecentFiles() {
  try {
    if (fs.existsSync(recentFilesPath)) {
      return JSON.parse(fs.readFileSync(recentFilesPath, 'utf8')).filter(f => fs.existsSync(f));
    }
  } catch (e) { }
  return [];
}

function addRecentFile(filePath) {
  let recent = getRecentFiles();
  recent = [filePath, ...recent.filter(f => f !== filePath)].slice(0, 10);
  try { fs.writeFileSync(recentFilesPath, JSON.stringify(recent)); } catch (e) { }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
function execRows(sql, params) {
  return db.prepare(sql).all(params || []);
}

function execScalar(sql, params) {
  const row = db.prepare(sql).get(params || []);
  if (!row) return null;
  return row[Object.keys(row)[0]];
}

function getTablesInfo() {
  if (!db) return [];
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
  return tables.map(row => {
    const name = row.name;
    let rowCount = 0;
    try { rowCount = execScalar(`SELECT COUNT(*) FROM "${name}"`); } catch (e) { }
    return { name, rowCount };
  });
}

// ─── DB Scanner + File Watcher ────────────────────────────────────────────────
const HOME = os.homedir();
const PLATFORM = process.platform;
const DB_EXTS = new Set(['.db', '.sqlite', '.sqlite3', '.db3', '.s3db', '.sl3']);
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.npm', '.yarn', 'cache', 'Cache', 'Caches',
  'Logs', 'logs', 'Temp', 'temp', 'tmp', '__pycache__', 'vendor',
  'Windows', 'Microsoft', 'Google', 'Mozilla',
]);

let isScanning = false;
let dbWatcher = null;
let watchTimer = null;

function isSqliteFile(fp) {
  try {
    const fd = fs.openSync(fp, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    return buf.slice(0, 15).toString('latin1') === 'SQLite format 3';
  } catch (e) { return false; }
}

function scanDir(dir, maxDepth, depth, source, results) {
  if (depth > maxDepth) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name.startsWith('.') && depth > 0) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      scanDir(full, maxDepth, depth + 1, source, results);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!DB_EXTS.has(ext)) continue;
      try {
        const st = fs.statSync(full);
        if (st.size < 100 || !isSqliteFile(full)) continue;
        results.push({
          path: full, name: e.name, size: st.size, source,
          device: null, appName: null,
          modified: st.mtime.toISOString(), modifiedMs: st.mtimeMs
        });
      } catch (e2) { }
    }
  }
}

function scanIosSimulator(results) {
  const devicesRoot = path.join(HOME, 'Library/Developer/CoreSimulator/Devices');
  if (!fs.existsSync(devicesRoot)) return;
  let deviceDirs;
  try { deviceDirs = fs.readdirSync(devicesRoot); } catch (e) { return; }

  for (const deviceId of deviceDirs) {
    const devicePath = path.join(devicesRoot, deviceId);
    let deviceName = 'Simulator';
    try {
      const plist = fs.readFileSync(path.join(devicePath, 'device.plist'), 'utf8');
      const m = plist.match(/<key>name<\/key>\s*<string>([^<]+)<\/string>/);
      if (m) deviceName = m[1];
    } catch (e) { }

    // Build app-id → app-name map
    const appNameMap = {};
    try {
      const bundleRoot = path.join(devicePath, 'data/Containers/Bundle/Application');
      if (fs.existsSync(bundleRoot)) {
        for (const bundleId of fs.readdirSync(bundleRoot)) {
          try {
            const dotApp = fs.readdirSync(path.join(bundleRoot, bundleId)).find(f => f.endsWith('.app'));
            if (dotApp) appNameMap[bundleId] = dotApp.replace('.app', '');
          } catch (e) { }
        }
      }
    } catch (e) { }

    const appsRoot = path.join(devicePath, 'data/Containers/Data/Application');
    if (!fs.existsSync(appsRoot)) continue;
    let appIds;
    try { appIds = fs.readdirSync(appsRoot); } catch (e) { continue; }

    for (const appId of appIds) {
      const appPath = path.join(appsRoot, appId);
      for (const sub of ['Documents', 'Library', 'Library/LocalDatabase', 'tmp']) {
        const subPath = path.join(appPath, sub);
        if (!fs.existsSync(subPath)) continue;
        let files;
        try { files = fs.readdirSync(subPath); } catch (e) { continue; }
        for (const file of files) {
          if (!DB_EXTS.has(path.extname(file).toLowerCase())) continue;
          const full = path.join(subPath, file);
          try {
            const st = fs.statSync(full);
            if (st.size < 100 || !isSqliteFile(full)) continue;
            results.push({
              path: full, name: file, size: st.size,
              source: 'iOS Simulator',
              device: deviceName,
              appName: appNameMap[appId] || appId.slice(0, 8),
              modified: st.mtime.toISOString(), modifiedMs: st.mtimeMs,
            });
          } catch (e) { }
        }
      }
    }
  }
}

function scanAndroidEmulator(results) {
  const avdRoot = path.join(HOME, '.android', 'avd');
  if (!fs.existsSync(avdRoot)) return;
  let avds;
  try { avds = fs.readdirSync(avdRoot); } catch (e) { return; }
  for (const avd of avds) {
    if (!avd.endsWith('.avd')) continue;
    const dbRoot = path.join(avdRoot, avd, 'data', 'data');
    if (!fs.existsSync(dbRoot)) continue;
    let packages;
    try { packages = fs.readdirSync(dbRoot); } catch (e) { continue; }
    for (const pkg of packages) {
      const dbDir = path.join(dbRoot, pkg, 'databases');
      if (!fs.existsSync(dbDir)) continue;
      let files;
      try { files = fs.readdirSync(dbDir); } catch (e) { continue; }
      for (const file of files) {
        if (!DB_EXTS.has(path.extname(file).toLowerCase())) continue;
        const full = path.join(dbDir, file);
        try {
          const st = fs.statSync(full);
          if (st.size < 100 || !isSqliteFile(full)) continue;
          results.push({
            path: full, name: file, size: st.size,
            source: 'Android Emulator',
            device: avd.replace('.avd', ''),
            appName: pkg,
            modified: st.mtime.toISOString(), modifiedMs: st.mtimeMs,
          });
        } catch (e) { }
      }
    }
  }
}

function scanForDatabases() {
  if (isScanning) return { databases: [], scanning: true };
  isScanning = true;
  const results = [];
  try {
    if (PLATFORM === 'darwin') scanIosSimulator(results);
    scanAndroidEmulator(results);
    const generalPaths = PLATFORM === 'darwin'
      ? [
        { root: path.join(HOME, 'Desktop'), depth: 3, source: 'Desktop' },
        { root: path.join(HOME, 'Documents'), depth: 4, source: 'Documents' },
        { root: path.join(HOME, 'Downloads'), depth: 3, source: 'Downloads' },
        { root: path.join(HOME, 'Developer'), depth: 4, source: 'Developer' },
        { root: path.join(HOME, 'Projects'), depth: 4, source: 'Projects' },
        { root: path.join(HOME, 'Library/Application Support'), depth: 4, source: 'App Support' },
      ]
      : [
        { root: path.join(HOME, 'Desktop'), depth: 3, source: 'Desktop' },
        { root: path.join(HOME, 'Documents'), depth: 4, source: 'Documents' },
        { root: path.join(HOME, 'Downloads'), depth: 3, source: 'Downloads' },
        { root: path.join(HOME, 'source'), depth: 4, source: 'Projects' },
        { root: path.join(HOME, 'Projects'), depth: 4, source: 'Projects' },
        { root: path.join(HOME, 'repos'), depth: 4, source: 'Projects' },
        { root: process.env.APPDATA || '', depth: 3, source: 'AppData (Roaming)' },
        { root: process.env.LOCALAPPDATA || '', depth: 3, source: 'AppData (Local)' },
      ];
    for (const p of generalPaths) {
      if (!p.root || !fs.existsSync(p.root)) continue;
      scanDir(p.root, p.depth, 0, p.source, results);
    }
  } catch (e) { console.error('[SyncNest] scan error:', e); }

  const seen = new Set();
  const unique = results.filter(r => { if (seen.has(r.path)) return false; seen.add(r.path); return true; });
  unique.sort((a, b) => b.modifiedMs - a.modifiedMs);
  isScanning = false;
  console.log(`[SyncNest] Scan complete — ${unique.length} database(s) found`);
  return { databases: unique };
}

function stopFileWatcher() {
  clearTimeout(watchTimer);
  if (dbWatcher) { try { dbWatcher.close(); } catch (e) { } dbWatcher = null; }
}

function startFileWatcher(filePath) {
  stopFileWatcher();
  try {
    dbWatcher = fs.watch(filePath, (eventType) => {
      if (eventType !== 'change') return;
      clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        try {
          if (!fs.existsSync(filePath)) return;
          const newDb = new Database(filePath, { fileMustExist: true });
          if (db) try { db.close(); } catch (e) { }
          db = newDb;
          console.log('[SyncNest] DB reloaded — external change detected');
          if (mainWindow) mainWindow.webContents.send('db-file-changed');
        } catch (err) { console.error('[SyncNest] watch reload error:', err); }
      }, 600);
    });
    console.log('[SyncNest] Watching for changes:', filePath);
  } catch (e) { console.error('[SyncNest] Cannot watch file:', e); }
}

// ─── Open / Close DB ──────────────────────────────────────────────────────────
function closeDatabase() {
  stopFileWatcher();
  if (db) {
    try { db.close(); } catch (e) { }
    db = null;
    currentDbPath = null;
    mainWindow.webContents.send('db-closed');
    console.log('[SyncNest] Database closed');
  }
}

function openDatabase(filePath) {
  console.log('[SyncNest] Opening DB:', filePath);

  if (false) {
    const msg = 'Database engine is still loading, please try again in a moment.';
    mainWindow.webContents.send('db-error', msg);
    return { success: false, error: msg };
  }

  if (!fs.existsSync(filePath)) {
    const msg = `File not found: ${filePath}`;
    mainWindow.webContents.send('db-error', msg);
    return { success: false, error: msg };
  }

  // Close existing db + watcher first
  stopFileWatcher();
  if (db) {
    try { db.close(); } catch (e) { }
    db = null;
    currentDbPath = null;
    mainWindow.webContents.send('db-closed');
  }

  try {
    db = new Database(filePath, { fileMustExist: true });
    currentDbPath = filePath;
    addRecentFile(filePath);
    startFileWatcher(filePath);   // ◀ watch for external changes

    const tables = getTablesInfo();
    console.log('[SyncNest] Tables found:', tables.map(t => t.name));

    mainWindow.webContents.send('db-opened', {
      path: filePath,
      name: path.basename(filePath),
      tables,
    });
    return { success: true };
  } catch (err) {
    console.error('[SyncNest] Error opening DB:', err);
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
ipcMain.handle('open-file-dialog', async () => openFileDialog());
ipcMain.handle('open-database', (_, fp) => openDatabase(fp));
ipcMain.handle('close-database', () => { closeDatabase(); return { success: true }; });
ipcMain.handle('get-recent-files', () => getRecentFiles());

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
    const cols = pragmaRows.map(r => ({ name: r.name, pk: r.pk }));
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
    const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get([table]);
    const createSql = row ? row.sql : '';
    return { columns, indexes, createSql };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('run-query', (_, sql) => {
  if (!db) return { error: 'No database open' };
  try {
    const start = Date.now();
    const stmt = db.prepare(sql);
    let elapsed = 0;
    if (stmt.reader) {
      const rows = stmt.all();
      elapsed = Date.now() - start;
      let columns = rows.length ? Object.keys(rows[0]).map(n => ({ name: n })) : [];
      if (!columns.length && stmt.columns) {
         try { columns = stmt.columns().map(c => ({ name: c.name })); } catch(e){}
      }
      return { type: 'select', columns, rows, rowCount: rows.length, elapsed };
    } else {
      const info = stmt.run();
      elapsed = Date.now() - start;
      return { type: 'write', changes: info.changes, elapsed };
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
    const info = db.prepare(`UPDATE "${table}" SET ${setClauses} WHERE "${pkColumn}" = ?`).run(values);
    return { success: true, changes: info.changes };
  } catch (err) {
    console.error('[SyncNest] update-row error:', err);
    return { error: err.message };
  }
});

// ─── Delete Row ───────────────────────────────────────────────────────────────
ipcMain.handle('delete-row', (_, { table, pkColumn, pkValue }) => {
  if (!db) return { error: 'No database open' };
  try {
    const info = db.prepare(`DELETE FROM "${table}" WHERE "${pkColumn}" = ?`).run([pkValue]);
    return { success: true, changes: info.changes };
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
    const viewCount = execScalar(`SELECT COUNT(*) FROM sqlite_master WHERE type='view'`) || 0;
    const sqliteVersion = execScalar(`SELECT sqlite_version()`);
    return {
      path: currentDbPath, name: path.basename(currentDbPath),
      size: stats.size, modified: stats.mtime, tableCount, viewCount, sqliteVersion
    };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('scan-databases', () => scanForDatabases());

// ─── Auto-Updater Events ──────────────────────────────────────────────────────
autoUpdater.on('update-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded');
});

autoUpdater.on('error', (err) => {
  console.error('[SyncNest] Update error:', err);
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopFileWatcher();
  if (db) try { db.close(); } catch (e) { }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
