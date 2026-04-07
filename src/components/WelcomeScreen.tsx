import React, { useState, useEffect } from 'react';
import { FolderOpen, Database, RefreshCw, Search, FileCode, ChevronDown, X } from 'lucide-react';

interface DiscoveredDb {
  path: string;
  name: string;
  source: string;
  appName?: string;
  device?: string;
  modified: string;
  modifiedMs: number;
}

interface WelcomeScreenProps {
  onOpenDatabase: (path: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenDatabase }) => {
  const [discoveredDbs, setDiscoveredDbs] = useState<DiscoveredDb[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    runScanning();
  }, []);

  const runScanning = async () => {
    setIsScanning(true);
    const result = await window.sqlBrowser.scanDatabases();
    setDiscoveredDbs(result.databases || []);
    setIsScanning(false);
  };

  const filteredDbs = searchQuery
    ? discoveredDbs.filter(db =>
      db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (db.appName && db.appName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      db.path.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : discoveredDbs;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && (file as any).path) {
      onOpenDatabase((file as any).path);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-bg-glow"></div>
      <div className="welcome-wrap">
        {/* Main Card */}
        <div className="welcome-card">
          <div className="welcome-logo">
            <div className="logo-icon">
              <Database size={32} color="rgba(255,255,255,0.9)" />
            </div>
            <div className="logo-text">
              <h1>SyncNest</h1>
              <p>Local Database Explorer</p>
            </div>
          </div>

          <div className="welcome-divider"></div>

          <div className="welcome-actions">
            <button
              className="btn-primary btn-large"
              onClick={() => window.sqlBrowser.openFileDialog()}
            >
              <FolderOpen size={15} strokeWidth={2.2} style={{ marginRight: '8px' }} />
              Open Database File
            </button>

            <button
              className="btn-secondary btn-large"
              onClick={() => setIsModalOpen(true)}
            >
              <Database size={15} strokeWidth={2.2} style={{ marginRight: '8px' }} />
              Local Databases
              <ChevronDown size={14} style={{ marginLeft: '6px' }} />
            </button>

            <div
              className="drop-zone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileCode size={18} strokeWidth={1.5} style={{ opacity: 0.5, color: '#4fc1ff' }} />
              <p>Drop a <strong>.db</strong> or <strong>.sqlite</strong> file here</p>
            </div>
          </div>

          <p className="welcome-byline">Created by <strong>Sundan Sharma</strong></p>
        </div>
      </div>

      {/* Database Modal */}
      {isModalOpen && (
        <div className="db-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <div className="db-modal-title">
                <Database size={16} />
                Local Databases
                {isScanning && (
                  <span className="scan-badge-inline">
                    <span className="scan-dot"></span>
                  </span>
                )}
              </div>
              <div className="db-modal-header-right">
                <span className="db-modal-count">
                  {filteredDbs.length} database{filteredDbs.length !== 1 ? 's' : ''} found
                </span>
                <button
                  className="db-modal-rescan-btn"
                  onClick={runScanning}
                  title="Re-scan"
                  disabled={isScanning}
                >
                  <RefreshCw size={14} strokeWidth={2.5} className={isScanning ? 'spinning' : ''} />
                </button>
                <button
                  className="db-modal-close-btn"
                  onClick={() => setIsModalOpen(false)}
                  title="Close"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="db-modal-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Filter databases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>

            <div className="db-modal-list">
              {isScanning && discoveredDbs.length === 0 ? (
                <div className="discovery-scanning">
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  <span>Scanning...</span>
                </div>
              ) : filteredDbs.length === 0 ? (
                <div className="discovery-empty">
                  <Database size={32} opacity={0.25} />
                  {searchQuery ? `No databases matching "${searchQuery}"` : 'No databases found automatically.'}
                </div>
              ) : (
                filteredDbs.map((db) => (
                  <div
                    key={db.path}
                    className="discovery-card"
                    onClick={() => {
                      onOpenDatabase(db.path);
                      setIsModalOpen(false);
                    }}
                  >
                    <div className="dc-info">
                      <div className="dc-top">
                        <div className="dc-name" title={db.name}>{db.name}</div>
                        <div className="dc-source-badge">{db.source}</div>
                      </div>
                      <div className="dc-path-wrapper">
                        <div className="dc-path" title={db.path}>{db.path}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
