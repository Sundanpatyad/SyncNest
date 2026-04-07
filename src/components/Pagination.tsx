import React from 'react';

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPagesToShow = (c: number, t: number) => {
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    if (c <= 4) return [1, 2, 3, 4, 5, '…', t];
    if (c >= t - 3) return [1, '…', t - 4, t - 3, t - 2, t - 1, t];
    return [1, '…', c - 1, c, c + 1, '…', t];
  };

  const pages = getPagesToShow(page, totalPages);

  return (
    <div className="pagination">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="pagination-info">Page {page} of {totalPages}</span>
        <select 
          className="page-size-select" 
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
        >
          {[25, 50, 100, 250].map(n => (
            <option key={n} value={n}>{n}/page</option>
          ))}
        </select>
      </div>

      <div className="pagination-controls">
        <button 
          className="page-btn" 
          disabled={page === 1}
          onClick={() => onPageChange(1)}
        >
          «
        </button>
        <button 
          className="page-btn" 
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        
        {pages.map((p, i) => (
          p === '…' ? (
            <span key={`dots-${i}`} style={{ padding: '0 5px', color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button 
              key={p} 
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          )
        ))}

        <button 
          className="page-btn" 
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
        <button 
          className="page-btn" 
          disabled={page === totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          »
        </button>
      </div>
    </div>
  );
};

export default Pagination;
