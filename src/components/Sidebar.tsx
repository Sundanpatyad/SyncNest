import React, { useState } from 'react';
import { Search, RefreshCw, FolderOpen, Terminal, Share2, X } from 'lucide-react';
import icon from '/icon.png';

interface TableInfo {
  name: string;
  rowCount: number;
}

interface SidebarProps {
  dbName: string | null;
  dbMeta: { tableCount: number; sizeKb: string } | null;
  tables: TableInfo[];
  currentTable: string | null;
  onSelectTable: (tableName: string) => void;
  onRefreshTables: () => void;
  onOpenQueryEditor: () => void;
  onOpenRelations: () => void;
  onCloseDatabase: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  dbName,
  dbMeta,
  tables,
  currentTable,
  onSelectTable,
  onRefreshTables,
  onOpenQueryEditor,
  onOpenRelations,
  onCloseDatabase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshTables();
    setTimeout(() => setIsRefreshing(false), 650);
  };

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src={icon} alt="SyncNest" className="sidebar-logo-img" />
          </div>
          <span className="sidebar-logo-text">SyncNest</span>
        </div>
        <button
          className="btn-icon"
          onClick={() => window.sqlBrowser.openFileDialog()}
          title="Open Database (Ctrl+O)"
        >
          <FolderOpen size={15} strokeWidth={2} />
        </button>
      </div>

      <div className="db-info-bar">
        <div className="db-name">{dbName || 'No database open'}</div>
        <div className="db-meta">
          {dbMeta && (
            <>
              <span className="db-status-dot"></span>
              {dbMeta.tableCount} tables · {dbMeta.sizeKb} KB
            </>
          )}
        </div>
      </div>

      <div className="sidebar-search">
        <Search size={13} strokeWidth={2} />
        <input
          type="text"
          placeholder="Filter tables…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">
          Tables
          <button
            className={`btn-icon sidebar-tables-refresh ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh table list"
          >
            <RefreshCw size={12} strokeWidth={2.5} />
          </button>
        </div>
        <ul className="table-list">
          {tables.length === 0 ? (
            <li className="table-list-empty">Open a database to view tables</li>
          ) : filteredTables.length === 0 ? (
            <li className="table-list-empty">No tables matching "{searchQuery}"</li>
          ) : (
            filteredTables.map((t) => (
              <li
                key={t.name}
                className={`table-item ${currentTable === t.name ? 'active' : ''}`}
                onClick={() => onSelectTable(t.name)}
              >
                <span className="table-item-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                </span>
                <span className="table-item-name">{t.name}</span>
                <span className="table-item-count">{t.rowCount.toLocaleString()}</span>
              </li>
            ))
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', gap: '5px', width: '100%', flexWrap: 'wrap' }}>
          <button
            className="btn-ghost btn-sm"
            style={{ flex: 1, minWidth: '60px' }}
            onClick={onOpenQueryEditor}
          >
            <Terminal size={13} style={{ marginRight: '5px' }} />
            Editor
          </button>
          <button
            className="btn-ghost btn-sm"
            style={{ flex: 1, minWidth: '60px' }}
            onClick={onOpenRelations}
          >
            <Share2 size={13} style={{ marginRight: '5px' }} />
            Relations
          </button>
          <button
            className="btn-ghost btn-sm"
            style={{ flex: 1, minWidth: '60px' }}
            onClick={onCloseDatabase}
          >
            <X size={13} style={{ marginRight: '5px' }} />
            Close
          </button>
        </div>
        <div style={{ width: '100%', textAlign: 'center', marginTop: '2px', fontSize: '10px', color: 'var(--text-muted)', padding: '4px 0' }}>
          Created by <strong>Sundan Sharma</strong>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
