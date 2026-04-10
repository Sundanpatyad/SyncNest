import React, { useState, useEffect, useCallback, useRef } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import TableView from './components/TableView';
import DocumentView from './components/DocumentView';
import Pagination from './components/Pagination';
import EditRowModal from './components/EditRowModal';
import AboutModal from './components/AboutModal';
import SchemaView from './components/SchemaView';
import QueryView from './components/QueryView';
import RelationsView from './components/RelationsView';
import TabStrip from './components/TabStrip';
import { Database } from 'lucide-react';

// --- Types ---
interface TableInfo {
  name: string;
  rowCount: number;
}

interface DBInfo {
  tableCount: number;
  sizeKb: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Tab {
  id: string;
  title: string;
  type: 'table' | 'query' | 'relations' | 'schema' | 'empty';
  tableName?: string;
}

const App: React.FC = () => {
  // --- Global State ---
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [dbName, setDbName] = useState<string | null>(null);
  const [dbMeta, setDbMeta] = useState<DBInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  
  // --- Tab State ---
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  
  // --- View State ---
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'document'>('table');
  const [activeView, setActiveView] = useState<'empty' | 'data' | 'schema' | 'query' | 'relations'>('empty');
  
  // --- Table Data State ---
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Modals State ---
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<{ row: any; index: number } | null>(null);
  const [pkColumn, setPkColumn] = useState<string | null>(null);
  
  // --- Toasts ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastsRef = useRef(toasts);
  toastsRef.current = toasts;

  // --- Helpers ---
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Refs for loadTableData to avoid dependency changes
  const tableDataStateRef = useRef({
    currentPage,
    pageSize,
    sortCol,
    sortDir,
    searchQuery,
    currentTable
  });
  tableDataStateRef.current = { currentPage, pageSize, sortCol, sortDir, searchQuery, currentTable };

  const guessPkColumn = (cols: any[]) => {
    const realPk = cols.find(c => c.pk === 1 || c.pk === true);
    if (realPk) return realPk.name;
    const lower = cols.map(c => c.name.toLowerCase());
    if (lower.includes('id')) return cols[lower.indexOf('id')].name;
    const idCol = lower.findIndex(n => n.endsWith('id') || n.startsWith('id'));
    if (idCol !== -1) return cols[idCol].name;
    return cols.length ? cols[0].name : null;
  };

  // Debounce ref for loadTableData
  const loadTableDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTableData = useCallback(async (options: any = {}) => {
    if (!tableDataStateRef.current.currentTable) return;
    
    // Clear any pending load
    if (loadTableDataTimeoutRef.current) {
      clearTimeout(loadTableDataTimeoutRef.current);
    }

    setIsLoading(true);
    const state = tableDataStateRef.current;
    
    const params = {
      table: state.currentTable!,
      page: options.page || state.currentPage,
      pageSize: options.pageSize || state.pageSize,
      sortCol: (options.sortCol !== undefined ? options.sortCol : state.sortCol) ?? undefined,
      sortDir: (options.sortDir !== undefined ? options.sortDir : state.sortDir) ?? undefined,
      search: options.search !== undefined ? options.search : state.searchQuery,
    };

    const result = await window.sqlBrowser.getTableData(params);
    setIsLoading(false);

    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    setColumns(result.columns);
    setRows(result.rows);
    setTotalRows(result.total);
    setPkColumn(guessPkColumn(result.columns));
  }, [showToast]); // Only depend on showToast which is stable

  const selectTable = async (tableName: string) => {
    const tabId = `table-${tableName}`;
    const existingTab = tabs.find(t => t.id === tabId);
    
    if (!existingTab) {
      const newTab: Tab = {
        id: tabId,
        title: tableName,
        type: 'table',
        tableName: tableName
      };
      setTabs([...tabs, newTab]);
    }
    
    setActiveTabId(tabId);
    setCurrentTable(tableName);
    setCurrentPage(1);
    setSortCol(null);
    setSortDir('asc');
    setSearchQuery('');
    setActiveView('data');
  };

  const closeTab = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    if (activeTabId === id) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        switchTab(lastTab.id);
      } else {
        setActiveTabId(null);
        setCurrentTable(null);
        setActiveView('empty');
      }
    }
  };

  const switchTab = (id: string, overrideType?: 'table' | 'query' | 'relations', overrideTableName?: string) => {
    const tab = tabs.find(t => t.id === id);
    const type = overrideType || tab?.type;
    const tableName = overrideTableName || tab?.tableName;

    if (!type && !overrideType) return;
    
    setActiveTabId(id);
    if (type === 'table') {
      setCurrentTable(tableName || null);
      setActiveView('data');
    } else if (type === 'query') {
      setCurrentTable(null);
      setActiveView('query');
    } else if (type === 'relations') {
      setCurrentTable(null);
      setActiveView('relations');
    }
  };

  const openQueryTab = () => {
    const id = 'query-editor';
    if (!tabs.find(t => t.id === id)) {
      setTabs([...tabs, { id, title: 'SQL Editor', type: 'query' }]);
    }
    switchTab(id, 'query');
  };

  const openRelationsTab = () => {
    const id = 'relations-view';
    if (!tabs.find(t => t.id === id)) {
      setTabs([...tabs, { id, title: 'Relations', type: 'relations' }]);
    }
    switchTab(id, 'relations');
  };

  const refreshTables = async () => {
    const result = await window.sqlBrowser.getTables();
    if (result && result.tables) {
      setTables(result.tables);
    }
  };

  const closeDatabase = async () => {
    await window.sqlBrowser.closeDatabase();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        window.sqlBrowser.openFileDialog();
      }
      if (e.key === 'F5') {
        e.preventDefault();
        if (currentTable) loadTableData();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTable, loadTableData]);

  // Store callbacks in refs to avoid re-registering listeners
  const callbacksRef = useRef({
    loadTableData,
    showToast,
    currentTable
  });
  callbacksRef.current = { loadTableData, showToast, currentTable };

  useEffect(() => {
    // DB Events - use refs to access latest callbacks without re-registering
    window.sqlBrowser.onDbOpened(async (data: any) => {
      // Batch state updates - React 18+ auto-batches, for older versions use unstable_batchedUpdates
      const batchedUpdates = (React as any).unstable_batchedUpdates || ((fn: Function) => fn());
      batchedUpdates(() => {
        setDbName(data.name);
        setTables(data.tables);
        setTabs([]);
        setActiveTabId(null);
        setCurrentTable(null);
        setActiveView('empty');
        setIsAppVisible(true);
      });
      
      const info = await window.sqlBrowser.getDbInfo();
      if (!info.error) {
        setDbMeta({
          tableCount: info.tableCount,
          sizeKb: (info.size / 1024).toFixed(1)
        });
      }
      callbacksRef.current.showToast(`Opened ${data.name}`, 'success');
    });

    window.sqlBrowser.onDbClosed(() => {
      setDbName(null);
      setDbMeta(null);
      setTables([]);
      setTabs([]);
      setActiveTabId(null);
      setCurrentTable(null);
      setActiveView('empty');
      setIsAppVisible(false);
      callbacksRef.current.showToast('Database closed', 'info');
    });

    window.sqlBrowser.onDbError((msg: string) => callbacksRef.current.showToast(`Error: ${msg}`, 'error'));
    window.sqlBrowser.onShowAbout(() => setIsAboutOpen(true));
    window.sqlBrowser.onDbFileChanged(() => {
      callbacksRef.current.showToast('External change detected - reloading', 'info');
      if (callbacksRef.current.currentTable) {
        callbacksRef.current.loadTableData();
      }
    });

    // Only remove listeners on unmount
    return () => {
      window.sqlBrowser.removeAllListeners('db-opened');
      window.sqlBrowser.removeAllListeners('db-closed');
      window.sqlBrowser.removeAllListeners('db-error');
      window.sqlBrowser.removeAllListeners('show-about');
      window.sqlBrowser.removeAllListeners('db-file-changed');
    };
  }, []); // Empty deps - only register once

  // Optimized data loading - debounced and with proper cleanup
  useEffect(() => {
    if (!currentTable) return;
    
    // Debounce the load to avoid multiple rapid calls
    if (loadTableDataTimeoutRef.current) {
      clearTimeout(loadTableDataTimeoutRef.current);
    }
    
    loadTableDataTimeoutRef.current = setTimeout(() => {
      loadTableData();
    }, 50); // Small debounce to batch rapid changes
    
    return () => {
      if (loadTableDataTimeoutRef.current) {
        clearTimeout(loadTableDataTimeoutRef.current);
      }
    };
  }, [currentTable, currentPage, pageSize, sortCol, sortDir, searchQuery]); // Remove loadTableData from deps

  // --- Handlers ---
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleUpdateRow = async (updates: any) => {
    if (!editingRow || !pkColumn || !currentTable) return;
    const result = await window.sqlBrowser.updateRow({
      table: currentTable!,
      pkColumn: pkColumn!,
      pkValue: editingRow.row[pkColumn!],
      updates
    });

    if (result.error) {
      showToast(`Update failed: ${result.error}`, 'error');
    } else {
      showToast('Row updated successfully', 'success');
      setEditingRow(null);
      loadTableData();
    }
  };

  const handleDeleteRow = async () => {
    if (!editingRow || !pkColumn || !currentTable) return;
    const result = await window.sqlBrowser.deleteRow({
      table: currentTable!,
      pkColumn: pkColumn!,
      pkValue: editingRow.row[pkColumn!]
    });

    if (result.error) {
      showToast(`Delete failed: ${result.error}`, 'error');
    } else {
      showToast('Row deleted', 'info');
      setEditingRow(null);
      loadTableData();
    }
  };

  const handleExport = async () => {
    if (!currentTable) return;
    const all = await window.sqlBrowser.getTableData({
      table: currentTable!,
      page: 1,
      pageSize: 999999,
      sortCol: sortCol ?? undefined,
      sortDir: sortDir ?? undefined,
      search: searchQuery
    });
    
    if (all.error) {
      showToast(all.error, 'error');
      return;
    }

    const csvHeaders = all.columns.map((c: any) => c.name);
    const escCsv = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [
      csvHeaders.map(escCsv).join(','),
      ...all.rows.map((r: any) => csvHeaders.map((h: string) => escCsv(r[h])).join(','))
    ];
    
    const result = await window.sqlBrowser.exportCsv({
      data: csvLines.join('\r\n'),
      filename: `${currentTable}.csv`
    });

    if (result.success) showToast('Exported to CSV!', 'success');
    else if (!result.canceled) showToast(result.error, 'error');
  };

  if (!isAppVisible) {
    return <WelcomeScreen onOpenDatabase={(path) => window.sqlBrowser.openDatabase(path)} />;
  }

  return (
    <div className="app">
      <Sidebar 
        dbName={dbName}
        dbMeta={dbMeta}
        tables={tables}
        currentTable={currentTable}
        onSelectTable={selectTable}
        onRefreshTables={refreshTables}
        onOpenQueryEditor={openQueryTab}
        onOpenRelations={openRelationsTab}
        onCloseDatabase={closeDatabase}
      />

      <main className="main-content">
        <TabStrip 
          tabs={tabs} 
          activeTabId={activeTabId} 
          onSwitchTab={switchTab} 
          onCloseTab={closeTab} 
        />
        <Toolbar 
          dbName={dbName}
          tableName={currentTable}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={() => loadTableData()}
          onShowSchema={() => setActiveView('schema')}
          onExport={handleExport}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {activeView === 'empty' && (
          <div className="empty-state">
            <div className="empty-icon">
              <Database size={60} strokeWidth={0.8} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2>No table selected</h2>
            <p>Choose a table from the sidebar to explore your data, or open the SQL editor to run a custom query.</p>
            <button className="btn-primary" onClick={() => setActiveView('query')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              Open SQL Editor
            </button>
          </div>
        )}

        {activeView === 'data' && (
          <div className="data-view">
            <div className="table-stats-bar">
              <span className="table-stats-text">
                Showing {((currentPage - 1) * pageSize + 1).toLocaleString()}–{Math.min(currentPage * pageSize, totalRows).toLocaleString()} of {totalRows.toLocaleString()} rows
                {searchQuery && ` · "${searchQuery}"`}
              </span>
              <span className="table-stats-badge">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                </svg>
                {isLoading ? 'Loading...' : 'Ready'}
              </span>
            </div>

            {viewMode === 'table' ? (
              <TableView 
                columns={columns}
                rows={rows}
                total={totalRows}
                page={currentPage}
                pageSize={pageSize}
                sortCol={sortCol}
                sortDir={sortDir}
                onSort={handleSort}
                onEditRow={(row, index) => setEditingRow({ row, index })}
                isLoading={isLoading}
              />
            ) : (
              <DocumentView 
                rows={rows}
                columns={columns}
                page={currentPage}
                pageSize={pageSize}
                onEditRow={(row, index) => setEditingRow({ row, index })}
              />
            )}

            <Pagination 
              total={totalRows}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            />
          </div>
        )}

        {activeView === 'schema' && currentTable && (
          <SchemaView tableName={currentTable} onClose={() => setActiveView('data')} />
        )}

        {activeView === 'query' && (
          <QueryView onClose={() => setActiveView(currentTable ? 'data' : 'empty')} onRefreshTables={refreshTables} />
        )}

        {activeView === 'relations' && (
          <RelationsView dbName={dbName} onClose={() => setActiveView(currentTable ? 'data' : 'empty')} />
        )}
      </main>

      {/* --- Modals --- */}
      <EditRowModal 
        isOpen={!!editingRow}
        onClose={() => setEditingRow(null)}
        row={editingRow?.row}
        columns={columns}
        pkColumn={pkColumn}
        onUpdate={handleUpdateRow}
        onDelete={handleDeleteRow}
      />

      <AboutModal 
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* --- Toasts --- */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
