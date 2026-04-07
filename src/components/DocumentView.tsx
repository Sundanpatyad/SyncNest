import React, { useState } from 'react';
import { Edit, ChevronRight, ChevronDown } from 'lucide-react';
import { esc, guessType, tryParseJson } from '../utils';

interface DocumentViewProps {
  rows: any[];
  columns: any[];
  page: number;
  pageSize: number;
  onEditRow: (row: any, index: number) => void;
}

const formatDocVal = (val: any) => {
  const type = guessType(val);
  if (type === 'null') return <span className="doc-val-null">null</span>;
  if (type === 'number') return <span className="doc-val-number">{val}</span>;
  if (type === 'bool') return <span className="doc-val-bool">{String(val)}</span>;
  if (type === 'date') return <span className="doc-val-date">"{String(val)}"</span>;
  const s = String(val);
  return <span className="doc-val-string">"{s}"</span>;
};

const FieldNode: React.FC<{ name: string; value: any }> = ({ name, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  const parsedJson = tryParseJson(value);

  if (parsedJson !== null) {
    const isArray = Array.isArray(parsedJson);
    const count = isArray ? parsedJson.length : Object.keys(parsedJson).length;

    if (count === 0) {
      return (
        <div className="doc-field" style={{ paddingLeft: '31px' }}>
          <span className="doc-field-key" title={name}>{name}</span>
          <span className="doc-field-colon"> :</span>
          <span className="doc-val-summary">
            {isArray ? 'Array (empty)' : 'Object (empty)'}
          </span>
        </div>
      );
    }

    return (
      <div className="doc-field-nested-wrapper">
        <div 
          className={`doc-field doc-collapsible ${isOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <span className="doc-field-key" title={name}>{name}</span>
          <span className="doc-field-colon"> :</span>
          <span className="doc-val-summary">
            {isArray ? `Array (${count})` : `Object {${count}}`}
          </span>
          {isOpen ? <ChevronDown size={14} strokeWidth={2.5} style={{ marginLeft: '4px', opacity: 0.5 }} /> : <ChevronRight size={14} strokeWidth={2.5} style={{ marginLeft: '4px', opacity: 0.5 }} />}
        </div>
        {isOpen && (
          <div className={`doc-nested-content ${isOpen ? 'open' : ''}`}>
            {isArray ? (
              parsedJson.map((item: any, i: number) => (
                <FieldNode key={i} name={String(i)} value={item} />
              ))
            ) : (
              Object.entries(parsedJson).map(([k, v]) => (
                <FieldNode key={k} name={k} value={v} />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="doc-field">
      <span className="doc-field-key" title={name}>{name}</span>
      <span className="doc-field-colon"> :</span>
      <span className="doc-field-val">
        {formatDocVal(value)}
      </span>
    </div>
  );
};

const DocumentView: React.FC<DocumentViewProps> = ({
  rows,
  columns,
  onEditRow,
}) => {
  if (rows.length === 0) {
    return (
      <div className="document-wrapper">
        <div style={{ padding: '48px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
          No documents found
        </div>
      </div>
    );
  }

  return (
    <div className="document-wrapper">
      {rows.map((row, i) => (
        <div 
          key={i} 
          className="doc-card"
          style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button 
              className="btn-ghost btn-sm" 
              style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '4px 8px' }}
              onClick={(e) => {
                e.stopPropagation();
                onEditRow(row, i);
              }}
            >
              <Edit size={12} strokeWidth={2} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> 
              <span style={{ verticalAlign: 'middle' }}>Edit Record</span>
            </button>
          </div>
          {columns.map((c) => (
            <FieldNode key={c.name} name={c.name} value={row[c.name]} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default DocumentView;
