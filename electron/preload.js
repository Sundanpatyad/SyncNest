const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sqlBrowser', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openDatabase: (path) => ipcRenderer.invoke('open-database', path),
  closeDatabase: () => ipcRenderer.invoke('close-database'),
  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),

  // Table operations
  getTables: () => ipcRenderer.invoke('get-tables'),
  getTableData: (opts) => ipcRenderer.invoke('get-table-data', opts),
  getTableSchema: (table) => ipcRenderer.invoke('get-table-schema', table),

  // Query
  runQuery: (sql) => ipcRenderer.invoke('run-query', sql),

  // Export
  exportCsv: (opts) => ipcRenderer.invoke('export-csv', opts),

  // DB info
  getDbInfo: () => ipcRenderer.invoke('get-db-info'),

  // Event listeners
  onDbOpened: (cb) => ipcRenderer.on('db-opened', (_, data) => cb(data)),
  onDbClosed: (cb) => ipcRenderer.on('db-closed', () => cb()),
  onDbError: (cb) => ipcRenderer.on('db-error', (_, msg) => cb(msg)),
  onShowAbout: (cb) => ipcRenderer.on('show-about', () => cb()),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
