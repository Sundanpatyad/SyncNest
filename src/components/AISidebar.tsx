import React, { useState } from 'react';
import { Sparkles, Clock, Copy, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useAIQuery } from '../hooks/useAIQuery';

interface QueryHistory {
  id: string;
  prompt: string;
  query: string;
  timestamp: Date;
}

interface AISidebarProps {
  onAddQuery: (query: string) => void;
}

export const AISidebar: React.FC<AISidebarProps> = ({ onAddQuery }) => {
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());

  const { generateQuery, isGenerating, error } = useAIQuery({
    onSuccess: (generatedQuery) => {
      const newHistoryItem: QueryHistory = {
        id: Date.now().toString(),
        prompt,
        query: generatedQuery,
        timestamp: new Date()
      };
      setHistory(prev => [newHistoryItem, ...prev]);
      
      // Automatically add to editor
      onAddQuery(generatedQuery);
      setPrompt('');
    },
    onError: () => {
      // Error handling is done in the hook
    }
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await generateQuery(prompt);
  };

  const handleCopyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const toggleQueryExpanded = (id: string) => {
    setExpandedQueries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="ai-sidebar">
      {/* Header */}
      <div className="ai-sidebar-header">
        <div className="ai-sidebar-title">
          <Sparkles size={16} />
          AI SQL Assistant
        </div>
        <div className="ai-sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <Sparkles size={14} />
            Generate
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={14} />
            History ({history.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="ai-sidebar-content">
        {activeTab === 'generate' ? (
          <div className="generate-section">
            <div className="prompt-input-container">
              <textarea
                className="prompt-input"
                placeholder="Describe what you want to query...&#10;&#10;Example:&#10;• Get all users from California&#10;• Show top 10 products by sales&#10;• Find orders placed this month"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <button
                className="generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <div className="loading-spinner" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isGenerating ? 'Generating...' : 'Generate SQL'}
              </button>
            </div>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="help-text">
              Press <kbd>Ctrl+Enter</kbd> to generate
            </div>
          </div>
        ) : (
          <div className="history-section">
            {history.length === 0 ? (
              <div className="empty-history">
                <Clock size={24} />
                <p>No query history yet</p>
                <small>Generate some queries to see them here</small>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-header">
                      <button
                        className="expand-btn"
                        onClick={() => toggleQueryExpanded(item.id)}
                      >
                        {expandedQueries.has(item.id) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                      <div className="history-prompt">
                        {item.prompt}
                      </div>
                      <div className="history-time">
                        {formatTime(item.timestamp)}
                      </div>
                    </div>
                    
                    {expandedQueries.has(item.id) && (
                      <div className="history-query">
                        <pre className="query-preview">{item.query}</pre>
                        <div className="query-actions">
                          <button
                            className="action-btn copy-btn"
                            onClick={() => handleCopyQuery(item.query)}
                            title="Copy to clipboard"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteHistory(item.id)}
                            title="Delete from history"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
