import React from 'react';
import { RefreshCw, LayoutGrid, FileText, Download, Database } from 'lucide-react';

interface ToolbarProps {
  dbName: string | null;
  tableName: string | null;
  viewMode: 'table' | 'document';
  onViewModeChange: (mode: 'table' | 'document') => void;
  onRefresh: () => void;
  onShowSchema: () => void;
  onExport: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  dbName,
  tableName,
  viewMode,
  onViewModeChange,
  onRefresh,
  onShowSchema,
  onExport,
  searchQuery,
  onSearchChange,
}) => {
  if (!dbName) return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="breadcrumb">
          <span className="breadcrumb-db">No database open</span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="breadcrumb">
            <span className="breadcrumb-db">{dbName}</span>
            {tableName && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span className="breadcrumb-table">{tableName}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {tableName && (
        <div className="action-bar">
          <div className="action-bar-left">
            <div className="view-toggle">
              <button 
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => onViewModeChange('table')}
                title="Table View"
              >
                <LayoutGrid size={12} />
                Table
              </button>
              <button 
                className={`view-toggle-btn ${viewMode === 'document' ? 'active' : ''}`}
                onClick={() => onViewModeChange('document')}
                title="Document View"
              >
                <FileText size={12} />
                Document
              </button>
            </div>

            <div className="action-bar-divider"></div>

            <div className="action-search-wrap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity={0.5}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search rows…" 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          <div className="action-bar-right">
            <button className="action-btn" onClick={onRefresh} title="Reload current table data">
              <RefreshCw size={13} style={{ marginRight: '5px' }} />
              Refresh
            </button>
            <button className="action-btn" onClick={onShowSchema} title="View table schema">
              <Database size={13} style={{ marginRight: '5px' }} />
              Schema
            </button>
            <div className="action-bar-divider"></div>
            <button className="action-btn action-btn-primary" onClick={onExport} title="Export table to CSV">
              <Download size={13} style={{ marginRight: '5px' }} />
              Export CSV
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;
