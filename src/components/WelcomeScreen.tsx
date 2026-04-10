import React, { useState, useEffect } from 'react';
import { FolderOpen, Database, RefreshCw, Search, FileCode, ChevronRight, Globe } from 'lucide-react';

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

const images = [
  { src: 'src/assets/image1.jpg', title: 'Powerful Database Management', subtitle: 'Manage SQLite databases with ease' },
  { src: 'src/assets/image2.jpg', title: 'Fast & Efficient', subtitle: 'Lightning-fast queries and data operations' },
  { src: 'src/assets/image3.jpg', title: 'Beautiful Interface', subtitle: 'Clean, modern design for better productivity' }
];

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenDatabase }) => {
  const [discoveredDbs, setDiscoveredDbs] = useState<DiscoveredDb[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentImage, setCurrentImage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    runScanning();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
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
      {/* Left Side - Image Carousel */}
      <div className="welcome-left">
        <div className="welcome-left-logo">
          <img src="src/assets/icon.png" alt="SyncNest" className="logo-icon" />
          <span>SyncNest</span>
        </div>
        <button
          className="welcome-visit-btn"
          onClick={() => window.open('https://github.com/Sundanpatyad/SyncNest', '_blank')}
        >
          <Globe size={14} />
          Visit Website
        </button>
        <div className="welcome-carousel">
          {images.map((img, index) => (
            <img
              key={img.src}
              src={img.src}
              alt={`Slide ${index + 1}`}
              className={index === currentImage ? 'active' : ''}
            />
          ))}
        </div>
        <div className="welcome-carousel-text">
          <h2>{images[currentImage].title}</h2>
          <p>{images[currentImage].subtitle}</p>
        </div>
        <div className="welcome-left-dots">
          {images.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentImage ? 'active' : ''}`}
              onClick={() => setCurrentImage(index)}
            />
          ))}
        </div>
      </div>

      {/* Right Side - Content */}
      <div className="welcome-right">
        <div className="welcome-right-header">
          <h1>Open Database</h1>
          <p>Select a database to get started</p>
        </div>

        <div className="welcome-actions">
          <button
            className="btn-primary btn-large"
            onClick={() => window.sqlBrowser.openFileDialog()}
          >
            <FolderOpen size={16} strokeWidth={2} />
            Browse File
          </button>

          <div className="divider">
            <span>Or select from local databases</span>
          </div>

          <div className="local-dbs-section">
            <div className="local-dbs-header">
              <span className="local-dbs-title">
                <Database size={14} />
                Local Databases ({filteredDbs.length})
              </span>
              <button
                className="rescan-btn"
                onClick={runScanning}
                disabled={isScanning}
                title="Refresh"
              >
                <RefreshCw size={14} className={isScanning ? 'spinning' : ''} />
              </button>
            </div>

            <div className="local-dbs-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search databases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={`local-dbs-list ${showAll ? 'expanded' : ''}`}>
              {isScanning && discoveredDbs.length === 0 ? (
                <div className="db-item scanning">Scanning...</div>
              ) : filteredDbs.length === 0 ? (
                <div className="db-item empty">
                  {searchQuery ? 'No matches found' : 'No databases found'}
                </div>
              ) : (
                (showAll ? filteredDbs : filteredDbs.slice(0, 5)).map((db) => (
                  <div
                    key={db.path}
                    className="db-item"
                    onClick={() => onOpenDatabase(db.path)}
                  >
                    <div className="db-item-info">
                      <span className="db-item-name">{db.name}</span>
                      <span className="db-item-source">{db.source}</span>
                    </div>
                    <ChevronRight size={14} />
                  </div>
                ))
              )}
              {filteredDbs.length > 5 && !showAll && (
                <div className="db-item more" onClick={() => setShowAll(true)}>
                  +{filteredDbs.length - 5} more databases
                </div>
              )}
              {showAll && filteredDbs.length > 5 && (
                <div className="db-item more" onClick={() => setShowAll(false)}>
                  Show less
                </div>
              )}
            </div>
          </div>

          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileCode size={18} />
            <p>Drop a <strong>.db</strong> or <strong>.sqlite</strong> file here</p>
          </div>
        </div>

        <div className="welcome-byline">
          <img src="src/assets/author.jpg" alt="Sundan Sharma" className="author-avatar" />
          <span>Created by <strong>Sundan Sharma</strong></span>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
