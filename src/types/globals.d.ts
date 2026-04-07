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
    getTableData: (tableName: string, page: number, pageSize: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC', filter?: string) => Promise<any>;
    updateRow: (tableName: string, pkColumn: string, pkValue: any, updates: any) => Promise<any>;
    deleteRow: (tableName: string, pkColumn: string, pkValue: any) => Promise<any>;
    addRow: (tableName: string, data: any) => Promise<any>;
    getRelations: () => Promise<any>;
    onDbOpened: (callback: (data: any) => void) => void;
    onDbClosed: (callback: () => void) => void;
    onDbError: (callback: (error: string) => void) => void;
    runQuery: (sql: string) => Promise<any>;
    exportCsv: (options: { data: string; filename: string }) => Promise<any>;
  };
}
