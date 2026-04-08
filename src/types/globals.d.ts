/// <reference types="vite/client" />

declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface Window {
  sqlBrowser: {
    // File operations
    openFileDialog: () => Promise<void>;
    openDatabase: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    closeDatabase: () => Promise<void>;
    getRecentFiles: () => Promise<string[] | {path: string, name: string}[]>;

    // Auto-discovery
    scanDatabases: () => Promise<{ databases: any[] }>;

    // Table operations
    getTables: () => Promise<{ tables?: any[]; error?: string }>;
    getTableSchema: (tableName: string) => Promise<any>;
    getTableData: (opts: any) => Promise<any>;

    // Edit / Delete rows
    updateRow: (opts: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
    deleteRow: (opts: any) => Promise<{ success: boolean; changes?: number; error?: string }>;
    addRow: (tableName: string, data: any) => Promise<any>;
    getRelations: () => Promise<any>;

    // Query
    runQuery: (sql: string) => Promise<any>;

    // Export
    exportCsv: (opts: any) => Promise<any>;

    // DB info
    getDbInfo: () => Promise<any>;

    // Event listeners
    onDbOpened: (callback: (data: any) => void) => void;
    onDbClosed: (callback: () => void) => void;
    onDbError: (callback: (error: string) => void) => void;
    onShowAbout: (callback: () => void) => void;
    onDbFileChanged: (callback: () => void) => void;
    onUpdateAvailable: (callback: () => void) => void;
    onUpdateDownloaded: (callback: () => void) => void;

    // Remove listeners
    removeAllListeners: (channel: string) => void;
  };
}
