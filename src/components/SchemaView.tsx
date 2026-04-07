import React, { useState, useEffect } from 'react';
import { ChevronLeft, Columns, Activity, X } from 'lucide-react';
import { esc } from '../utils';

interface SchemaViewProps {
  tableName: string;
  onClose: () => void;
}

interface TableSchema {
  columns: any[];
  indexes: any[];
  createSql: string;
}

const SchemaView: React.FC<SchemaViewProps> = ({ tableName, onClose }) => {
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoading(true);
      const result = await window.sqlBrowser.getTableSchema(tableName);
      if (!result.error) {
        setSchema(result);
      }
      setIsLoading(false);
    };
    fetchSchema();
  }, [tableName]);

  if (isLoading) {
    return (
      <div className="schema-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!schema) return null;

  return (
    <div className="schema-view" style={{ display: 'flex' }}>
      <div className="schema-header-bar">
        <div className="schema-header-left">
          <button className="schema-back-btn" onClick={onClose} title="Back to data view">
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
          <div className="schema-header-icon">
            <Columns size={14} />
          </div>
          <div className="schema-header-info">
            <span className="schema-header-label">Schema</span>
            <span className="schema-header-table">{tableName}</span>
          </div>
        </div>
        <div className="schema-header-right">
          {schema.columns.length > 0 && (
            <span className="schema-stat-chip">
              <Columns size={10} strokeWidth={2.5} style={{ marginRight: '4px' }} />
              {schema.columns.length} columns
            </span>
          )}
          {schema.indexes.length > 0 && (
            <span className="schema-stat-chip schema-stat-chip-idx">
              <Activity size={10} strokeWidth={2.5} style={{ marginRight: '4px' }} />
              {schema.indexes.length} indexes
            </span>
          )}
          <button className="action-btn" onClick={onClose} title="Close schema">
            <X size={12} strokeWidth={2.5} style={{ marginRight: '4px' }} />
            Close
          </button>
        </div>
      </div>

      <div className="schema-body">
        <div>
          <div className="schema-section-title">Columns ({schema.columns.length})</div>
          <table className="schema-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Type</th>
                <th>Nullable</th>
                <th>Default</th>
                <th>Key</th>
              </tr>
            </thead>
            <tbody>
              {schema.columns.map((c) => (
                <tr key={c.name}>
                  <td style={{ color: 'var(--text-muted)' }}>{c.cid + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className="schema-type-badge">{c.type || 'ANY'}</span>
                  </td>
                  <td>
                    {c.notnull ? (
                      <span style={{ color: 'var(--rose)' }}>NOT NULL</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>NULL</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {c.dflt_value !== null ? String(c.dflt_value) : '—'}
                  </td>
                  <td>{c.pk ? <span className="schema-pk">PK</span> : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {schema.indexes.length > 0 && (
          <div>
            <div className="schema-section-title">Indexes ({schema.indexes.length})</div>
            <table className="schema-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unique</th>
                </tr>
              </thead>
              <tbody>
                {schema.indexes.map((idx) => (
                  <tr key={idx.name}>
                    <td>{idx.name}</td>
                    <td>
                      {idx.unique ? (
                        <span style={{ color: 'var(--emerald)' }}>✓ Unique</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div className="schema-section-title">CREATE Statement</div>
          <pre className="schema-sql">{schema.createSql || ''}</pre>
        </div>
      </div>
    </div>
  );
};

export default SchemaView;
