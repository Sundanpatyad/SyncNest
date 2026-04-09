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
    openDatabase: (filePath: string) => Promise<any>;
    closeDatabase: () => Promise<void>;
    getTables: () => Promise<any>;
    getTableSchema: (tableName: string) => Promise<any>;
    getTableData: (options: { table: string; page: number; pageSize: number; sortCol?: string | null; sortDir?: 'asc' | 'desc' | null; search?: string }) => Promise<any>;
    updateRow: (options: { table: string; pkColumn: string; pkValue: any; updates: any }) => Promise<any>;
    deleteRow: (options: { table: string; pkColumn: string; pkValue: any }) => Promise<any>;
    addRow: (tableName: string, data: any) => Promise<any>;
    getRelations: () => Promise<any>;
    onDbOpened: (callback: (data: any) => void) => void;
    onDbClosed: (callback: () => void) => void;
    onDbError: (callback: (error: string) => void) => void;
    onShowAbout: (callback: () => void) => void;
    onDbFileChanged: (callback: (filePath: string) => void) => void;
    removeAllListeners: (event: string) => void;
    runQuery: (sql: string) => Promise<any>;
    exportCsv: (options: { data: string; filename: string }) => Promise<any>;
    openFileDialog: () => Promise<any>;
    scanDatabases: () => Promise<any>;
    getDbInfo: () => Promise<any>;
  };
}
