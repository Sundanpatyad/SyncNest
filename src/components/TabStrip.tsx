import React from 'react';
import { X, Table, Terminal, Share2 } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  type: 'table' | 'query' | 'relations' | 'schema' | 'empty';
  tableName?: string;
}

interface TabStripProps {
  tabs: Tab[];
  activeTabId: string | null;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, e?: React.MouseEvent) => void;
}

const TabStrip: React.FC<TabStripProps> = ({ tabs, activeTabId, onSwitchTab, onCloseTab }) => {
  if (tabs.length === 0) return null;

  return (
    <div className="tab-strip">
      <div className="tabs-container">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => onSwitchTab(tab.id)}
            data-title={tab.title}
          >
            <span className="tab-icon">
              {tab.type === 'table' && <Table size={12} />}
              {tab.type === 'query' && <Terminal size={12} />}
              {tab.type === 'relations' && <Share2 size={12} />}
            </span>
            <span className="tab-title" data-title={tab.title}>{tab.title}</span>
            <button
              className="tab-close-btn"
              onClick={(e) => onCloseTab(tab.id, e)}
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabStrip;
