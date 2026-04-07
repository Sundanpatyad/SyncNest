import React from 'react';
import { Edit } from 'lucide-react';

interface Column {
  name: string;
  pk?: boolean | number;
}

interface TableViewProps {
  columns: Column[];
  rows: any[];
  total: number;
  page: number;
  pageSize: number;
  sortCol: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (col: string) => void;
  onEditRow: (row: any, index: number) => void;
  isLoading: boolean;
}

const TableView: React.FC<TableViewProps> = ({
  columns,
  rows,
  page,
  pageSize,
  sortCol,
  sortDir,
  onSort,
  onEditRow,
  isLoading,
}) => {
  const formatTableCell = (val: any) => {
    if (val === null || val === undefined) return <span className="cell-null">NULL</span>;
    if (typeof val === 'number') return <span className="cell-number">{val}</span>;
    if (typeof val === 'boolean') return <span className="cell-boolean">{String(val)}</span>;
    const s = String(val);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  };

  const offset = (page - 1) * pageSize;

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
            {columns.map((c) => {
              const isSorted = sortCol === c.name;
              const arrow = isSorted ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
              return (
                <th 
                  key={c.name} 
                  onClick={() => onSort(c.name)}
                  className={isSorted ? `sort-${sortDir}` : ''}
                >
                  <div className="th-content">
                    {c.name} <span className="sort-icon">{arrow}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length + 1} 
                style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontStyle: 'italic' }}
              >
                {isLoading ? 'Loading data...' : 'No data found'}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr 
                key={i} 
                onClick={() => onEditRow(row, i)}
                title="Click to edit this row"
              >
                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', userSelect: 'none' }}>
                  {offset + i + 1}
                </td>
                {columns.map((c, ci) => (
                  <td 
                    key={c.name} 
                    title={String(row[c.name] !== null && row[c.name] !== undefined ? row[c.name] : '')}
                  >
                    {formatTableCell(row[c.name])}
                    {ci === columns.length - 1 && (
                      <button 
                        className="row-edit-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRow(row, i);
                        }}
                      >
                        <Edit size={11} strokeWidth={2} style={{ marginRight: '4px' }} /> 
                        Edit
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {isLoading && (
        <div className="table-loading">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default TableView;
