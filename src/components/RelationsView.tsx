import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Share2, RefreshCw, X } from 'lucide-react';

const ER_COLORS = [
  { bg: 'rgba(99,102,241,0.22)',  border: 'rgba(99,102,241,0.55)',  text: '#a5b4fc' },
  { bg: 'rgba(20,184,166,0.18)',  border: 'rgba(20,184,166,0.5)',   text: '#5eead4' },
  { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.5)',   text: '#fcd34d' },
  { bg: 'rgba(239,68,68,0.18)',  border: 'rgba(239,68,68,0.5)',    text: '#fca5a5' },
  { bg: 'rgba(139,92,246,0.22)', border: 'rgba(139,92,246,0.55)',  text: '#c4b5fd' },
  { bg: 'rgba(14,165,233,0.18)', border: 'rgba(14,165,233,0.5)',   text: '#7dd3fc' },
  { bg: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.5)',   text: '#f9a8d4' },
  { bg: 'rgba(132,204,22,0.15)', border: 'rgba(132,204,22,0.4)',   text: '#bef264' },
];

const ER_CARD_W = 224;
const ER_HEADER_H = 37;
const ER_COL_H = 27;

interface Relation {
  from: string;
  toTable: string;
  to: string;
}

interface TableSchema {
  name: string;
  columns: any[];
  fks: Relation[];
}

interface RelationsViewProps {
  onClose: () => void;
}

const RelationsView: React.FC<RelationsViewProps> = ({ onClose }) => {
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingTable = useRef<string | null>(null);
  const offset = useRef({ x: 0, y: 0 });

  const fetchRelations = useCallback(async () => {
    setIsLoading(true);
    const tablesResult = await window.sqlBrowser.getTables();
    const tables = tablesResult?.tables || [];
    
    if (tables.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchedSchemas: TableSchema[] = [];
    for (const t of tables) {
      const s = await window.sqlBrowser.getTableSchema(t.name);
      const safe = t.name.replace(/"/g, '""');
      const r = await window.sqlBrowser.runQuery(`PRAGMA foreign_key_list("${safe}")`);
      const fks = (r && !r.error && r.rows) ? r.rows.map((row: any) => ({
        from: row.from,
        toTable: row.table,
        to: row.to || row.from
      })) : [];
      
      fetchedSchemas.push({
        name: t.name,
        columns: s.columns || [],
        fks
      });
    }

    setSchemas(fetchedSchemas);
    calculateInitialLayout(fetchedSchemas);
    setIsLoading(false);
  }, []);

  const calculateInitialLayout = (data: TableSchema[]) => {
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    data.forEach(t => {
      graph[t.name] = [];
      inDegree[t.name] = 0;
    });

    data.forEach(t => {
      t.fks.forEach(fk => {
        if (graph[fk.toTable] && graph[t.name]) {
          if (fk.toTable !== t.name && !graph[fk.toTable].includes(t.name)) {
            graph[fk.toTable].push(t.name);
            inDegree[t.name] = (inDegree[t.name] || 0) + 1;
          }
        }
      });
    });

    const levels: Record<string, number> = {};
    let currentLevel = 0;
    let queue = Object.keys(inDegree).filter(t => inDegree[t] === 0);
    const processed = new Set();
    
    while (queue.length > 0) {
      const nextQueue: string[] = [];
      queue.forEach(node => {
        levels[node] = currentLevel;
        processed.add(node);
        graph[node].forEach(child => {
          inDegree[child]--;
          if (inDegree[child] === 0) nextQueue.push(child);
        });
      });
      queue = nextQueue;
      currentLevel++;
    }

    data.forEach(t => {
      if (!processed.has(t.name)) levels[t.name] = currentLevel;
    });

    const newPositions: Record<string, { x: number; y: number }> = {};
    const currentY: Record<number, number> = {};
    
    data.forEach(t => {
      const lvl = levels[t.name] || 0;
      if (currentY[lvl] === undefined) currentY[lvl] = 40;
      
      newPositions[t.name] = {
        x: 60 + lvl * (ER_CARD_W + 120),
        y: currentY[lvl]
      };
      
      const cardHeight = t.columns.length * ER_COL_H + ER_HEADER_H;
      currentY[lvl] += cardHeight + 40;
    });

    setPositions(newPositions);
  };

  useEffect(() => {
    fetchRelations();
  }, [fetchRelations]);

  const handleMouseDown = (e: React.MouseEvent, tableName: string) => {
    if (e.button !== 0) return;
    const wrap = e.currentTarget.closest('.relations-canvas-wrap');
    if (!wrap) return;
    
    const rect = wrap.getBoundingClientRect();
    const pos = positions[tableName];
    
    offset.current = {
      x: (e.clientX - rect.left + wrap.scrollLeft) - pos.x,
      y: (e.clientY - rect.top + wrap.scrollTop) - pos.y
    };
    
    draggingTable.current = tableName;
    
    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingTable.current) return;
      const nx = Math.max(0, ev.clientX - rect.left + wrap.scrollLeft - offset.current.x);
      const ny = Math.max(0, ev.clientY - rect.top + wrap.scrollTop - offset.current.y);
      
      setPositions(prev => ({
        ...prev,
        [draggingTable.current!]: { x: nx, y: ny }
      }));
    };

    const onMouseUp = () => {
      draggingTable.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const getColY = (tableName: string, colName: string) => {
    const table = schemas.find(s => s.name === tableName);
    const idx = table?.columns.findIndex(c => c.name === colName) ?? 0;
    return positions[tableName].y + ER_HEADER_H + (idx >= 0 ? idx : 0) * ER_COL_H + ER_COL_H / 2;
  };

  const renderLines = () => {
    const lines: React.ReactNode[] = [];
    
    schemas.forEach(t => {
      t.fks.forEach((fk, i) => {
        const fromTable = t.name;
        const toTable = fk.toTable;
        
        if (!positions[fromTable] || !positions[toTable]) return;

        const p1x = positions[toTable].x;
        const p2x = positions[fromTable].x;

        let startX, startY, endX, endY;
        
        if (p1x <= p2x) {
          startX = p1x + ER_CARD_W;
          startY = getColY(toTable, fk.to);
          endX = p2x;
          endY = getColY(fromTable, fk.from);
        } else {
          startX = p2x + ER_CARD_W;
          startY = getColY(fromTable, fk.from);
          endX = p1x;
          endY = getColY(toTable, fk.to);
        }

        const dx = Math.max(Math.abs(endX - startX) * 0.45, 60);
        const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        lines.push(
          <path 
            key={`${fromTable}-${toTable}-${i}`}
            d={d}
            fill="none"
            stroke="rgba(140,150,175,0.5)"
            strokeWidth="1.5"
            markerStart="url(#er-dot)"
            markerEnd="url(#er-dot)"
          />
        );
      });
    });

    return lines;
  };

  return (
    <div className="relations-view" style={{ display: 'flex' }}>
      <div className="relations-header">
        <div className="relations-header-left">
          <div className="relations-header-icon">
            <Share2 size={14} />
          </div>
          <div className="relations-header-info">
            <span className="relations-header-label">Diagram</span>
            <span className="relations-header-title">Entity Relationships</span>
          </div>
        </div>
        <div className="relations-header-right">
          <span className="relations-hint">Drag tables to rearrange · Scroll to explore</span>
          <button className="action-btn" onClick={() => calculateInitialLayout(schemas)} title="Reset layout">
            <RefreshCw size={12} strokeWidth={2.5} style={{ marginRight: '4px' }} />
            Reset
          </button>
          <button className="action-btn" onClick={onClose}>
            <X size={12} strokeWidth={2.5} style={{ marginRight: '4px' }} />
            Close
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="relations-loading" style={{ display: 'flex' }}>
          <div className="spinner"></div>
          <span>Building diagram…</span>
        </div>
      ) : schemas.length === 0 ? (
        <div className="er-empty">No tables found.</div>
      ) : (
        <div className="relations-canvas-wrap" id="relations-canvas-wrap">
          <svg className="relations-svg" id="relations-svg">
            <defs>
              <marker id="er-dot" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <circle cx="3" cy="3" r="2.2" fill="rgba(140,150,175,0.7)"/>
              </marker>
            </defs>
            {renderLines()}
          </svg>
          <div className="relations-canvas" ref={canvasRef}>
            {schemas.map((t, idx) => {
              const pos = positions[t.name] || { x: 0, y: 0 };
              const color = ER_COLORS[idx % ER_COLORS.length];
              const fkCols = new Set(t.fks.map(f => f.from));

              return (
                <div 
                  key={t.name}
                  className="er-card"
                  style={{ left: pos.x, top: pos.y }}
                  onMouseDown={(e) => handleMouseDown(e, t.name)}
                >
                  <div className="er-card-header" style={{ background: color.bg, borderBottom: `1px solid ${color.border}`, color: color.text }}>
                    {t.name}
                  </div>
                  {t.columns.map(col => {
                    const isPk = col.pk === 1 || col.pk === true;
                    const isFk = fkCols.has(col.name);
                    return (
                      <div 
                        key={col.name} 
                        className={`er-col-row ${isPk ? 'er-row-pk' : ''} ${isFk ? 'er-row-fk' : ''}`}
                      >
                        <span className={`er-col-icon ${isPk ? 'er-pk' : ''} ${isFk ? 'er-fk' : ''}`}>
                          {isPk ? '#' : (isFk ? '⇢' : 'T')}
                        </span>
                        <span className="er-col-name" title={col.name + (col.type ? ` (${col.type})` : '')}>
                          {col.name}
                        </span>
                        {isFk && <span className="er-conn-dot er-conn-dot-right" />}
                        {isPk && <span className="er-conn-dot er-conn-dot-left" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationsView;
