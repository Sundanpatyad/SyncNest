export interface SqlBrowserAPI {
  openFileDialog: () => Promise<void>;
  openDatabase: (path: string) => Promise<{ success: boolean; error?: string }>;
  closeDatabase: () => Promise<{ success: boolean }>;
  getRecentFiles: () => Promise<string[] | {path: string, name: string}[]>;
  scanDatabases: () => Promise<{ databases: any[] }>;
  getTables: () => Promise<{ tables?: any[]; error?: string }>;
  getTableData: (opts: any) => Promise<any>;
  getTableSchema: (table: string) => Promise<any>;
  updateRow: (opts: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
  deleteRow: (opts: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
  runQuery: (sql: string) => Promise<any>;
  exportCsv: (opts: any) => Promise<any>;
  getDbInfo: () => Promise<any>;

  onDbOpened: (cb: (data: any) => void) => void;
  onDbClosed: (cb: () => void) => void;
  onDbError: (cb: (msg: string) => void) => void;
  onShowAbout: (cb: () => void) => void;
  onDbFileChanged: (cb: () => void) => void;
  onUpdateAvailable: (cb: () => void) => void;
  onUpdateDownloaded: (cb: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    sqlBrowser: SqlBrowserAPI;
  }
}
