import React from 'react';
import { X, Database } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex' }}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>About SyncNest</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body about-body">
          <div className="about-logo">
            <div className="about-logo-icon">
              <Database size={34} fill="rgba(255,255,255,0.92)" stroke="none" />
            </div>
          </div>
          <h2>SyncNest</h2>
          <p className="about-version">Version 1.0.0 — Created by <strong>Sundan Sharma</strong></p>
          <p className="about-desc">A beautiful cross-platform SQLite browser. Open any local .db or .sqlite file and explore your data with Table or Document views. Edit and delete records inline.</p>
          <div className="about-features">
            <div className="about-feature">📂 Open any SQLite file</div>
            <div className="about-feature">📊 Table &amp; Document views</div>
            <div className="about-feature">🔍 SQL query editor</div>
            <div className="about-feature">📤 CSV export</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
