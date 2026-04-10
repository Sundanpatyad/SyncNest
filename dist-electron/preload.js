let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("sqlBrowser", {
	openFileDialog: () => electron.ipcRenderer.invoke("open-file-dialog"),
	openDatabase: (path) => electron.ipcRenderer.invoke("open-database", path),
	closeDatabase: () => electron.ipcRenderer.invoke("close-database"),
	getRecentFiles: () => electron.ipcRenderer.invoke("get-recent-files"),
	scanDatabases: () => electron.ipcRenderer.invoke("scan-databases"),
	getTables: () => electron.ipcRenderer.invoke("get-tables"),
	getTableData: (opts) => electron.ipcRenderer.invoke("get-table-data", opts),
	getTableSchema: (table) => electron.ipcRenderer.invoke("get-table-schema", table),
	updateRow: (opts) => electron.ipcRenderer.invoke("update-row", opts),
	deleteRow: (opts) => electron.ipcRenderer.invoke("delete-row", opts),
	runQuery: (sql) => electron.ipcRenderer.invoke("run-query", sql),
	exportCsv: (opts) => electron.ipcRenderer.invoke("export-csv", opts),
	getDbInfo: () => electron.ipcRenderer.invoke("get-db-info"),
	onDbOpened: (cb) => electron.ipcRenderer.on("db-opened", (_, data) => cb(data)),
	onDbClosed: (cb) => electron.ipcRenderer.on("db-closed", () => cb()),
	onDbError: (cb) => electron.ipcRenderer.on("db-error", (_, msg) => cb(msg)),
	onShowAbout: (cb) => electron.ipcRenderer.on("show-about", () => cb()),
	onDbFileChanged: (cb) => electron.ipcRenderer.on("db-file-changed", () => cb()),
	onUpdateAvailable: (cb) => electron.ipcRenderer.on("update-available", () => cb()),
	onUpdateDownloaded: (cb) => electron.ipcRenderer.on("update-downloaded", () => cb()),
	removeAllListeners: (channel) => electron.ipcRenderer.removeAllListeners(channel)
});
//#endregion
