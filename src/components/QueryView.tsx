import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Download, Terminal, Bot } from 'lucide-react';
import { AISidebar } from './AISidebar';

interface QueryViewProps {
  onClose: () => void;
  onRefreshTables: () => void;
}

const formatTableCell = (val: any) => {
  if (val === null || val === undefined) return <span className="cell-null">NULL</span>;
  if (typeof val === 'number') return <span className="cell-number">{val}</span>;
  if (typeof val === 'boolean') return <span className="cell-boolean">{String(val)}</span>;
  const s = String(val);
  return s.length > 200 ? s.slice(0, 200) + '…' : s;
};

const QueryView: React.FC<QueryViewProps> = ({ onClose, onRefreshTables }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear any existing editor instance
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Basic CodeMirror initialization as done in the original
    if (containerRef.current && (window as any).CodeMirror) {
      const CodeMirror = (window as any).CodeMirror;
      editorRef.current = CodeMirror(containerRef.current, {
        mode: 'text/x-sql',
        theme: 'dracula',
        lineNumbers: true,
        matchBrackets: true,
        tabSize: 2,
        value: query,
        extraKeys: { 
          'Ctrl-Enter': () => handleRunQuery(), 
          'Cmd-Enter': () => handleRunQuery() 
        },
      });

      editorRef.current.on('change', (cm: any) => {
        setQuery(cm.getValue());
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea && editorRef.current.toTextArea();
      }
    };
  }, []);

  const handleAddQueryFromAI = (aiQuery: string) => {
    if (editorRef.current) {
      const currentQuery = editorRef.current.getValue();
      const newQuery = currentQuery ? currentQuery + '\n\n' + aiQuery : aiQuery;
      editorRef.current.setValue(newQuery);
      setQuery(newQuery);
    }
  };

  const handleRunQuery = async () => {
    const sql = editorRef.current ? editorRef.current.getSelection() || editorRef.current.getValue() : query;
    if (!sql.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults(null);
    
    const result = await window.sqlBrowser.runQuery(sql.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setResults(result);
    if (result.type === 'write') {
      onRefreshTables();
    }
  };

  const handleExport = async () => {
    if (!results || !results.rows) return;
    
    const csvHeaders = results.columns.map((c: any) => c.name);
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
      ...results.rows.map((r: any) => csvHeaders.map((h: string) => escCsv(r[h])).join(','))
    ];
    
    const exportResult = await window.sqlBrowser.exportCsv({
      data: csvLines.join('\r\n'),
      filename: 'query_result.csv'
    });

    if (exportResult.success) {
      // Toast would be nice but App handles those.
    }
  };

  return (
    <div className="query-view" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="query-editor-panel">
        <div className="query-toolbar">
          <span className="panel-title">
            <Terminal size={13} style={{ marginRight: '8px' }} />
            SQL Editor
          </span>
          <div className="query-toolbar-right">
            <button 
              className="btn-ai-sidebar btn-sm" 
              onClick={() => setShowAISidebar(!showAISidebar)}
            >
              <Bot size={14} />
              AI Assistant
            </button>
            <span className="query-hint">Ctrl+Enter to run</span>
            <button className="btn-primary btn-sm" onClick={handleRunQuery} disabled={isLoading}>
              <Play size={12} fill="currentColor" style={{ marginRight: '5px' }} />
              Run
            </button>
            <button className="btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div ref={containerRef} id="codemirror-container"></div>
      </div>

      {/* AI Sidebar */}
      {showAISidebar && (
        <div className="ai-sidebar-container">
          <AISidebar onAddQuery={handleAddQueryFromAI} />
        </div>
      )}

      <div className="query-results-panel">
        <div className="results-toolbar">
          <span className="panel-title">
            {isLoading ? 'Running…' : results ? (
              results.type === 'write' ? 'Done' : `${results.rowCount.toLocaleString()} row${results.rowCount !== 1 ? 's' : ''} · ${results.elapsed}ms`
            ) : error ? 'Error' : 'Results'}
          </span>
          {results && results.type === 'select' && results.rowCount > 0 && (
            <button className="btn-secondary btn-sm" onClick={handleExport}>
              <Download size={11} style={{ marginRight: '5px' }} />
              Export CSV
            </button>
          )}
        </div>
        <div className="query-results-body">
          {isLoading ? (
            <div className="results-empty">
              <div className="spinner" style={{ width: '22px', height: '22px' }}></div>
            </div>
          ) : error ? (
            <div className="results-message">
              <div className="results-card error">
                <div className="results-card-icon">⚠️</div>
                <h3>{error}</h3>
              </div>
            </div>
          ) : results ? (
            results.type === 'write' ? (
              <div className="results-message">
                <div className="results-card success">
                  <div className="results-card-icon">✅</div>
                  <h3>{results.changes} row{results.changes !== 1 ? 's' : ''} affected</h3>
                  <p>{results.elapsed}ms</p>
                </div>
              </div>
            ) : results.rowCount === 0 ? (
              <div className="results-message">
                <div className="results-card success">
                  <div className="results-card-icon">🔍</div>
                  <h3>No results</h3>
                  <p>0 rows in {results.elapsed}ms</p>
                </div>
              </div>
            ) : (
              <table className="query-result-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    {results.columns.map((c: any) => <th key={c.name}>{c.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>{i + 1}</td>
                      {results.columns.map((c: any) => (
                        <td key={c.name}>{formatTableCell(row[c.name])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="results-empty">Run a query to see results here</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryView;
