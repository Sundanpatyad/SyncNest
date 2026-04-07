// ─── ER Diagram / Relations View ─────────────────────────────────────────────
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

let _erPos = {};
let _erFKs = {};
let _erSchemas = {};

window.openRelationsView = async function openRelationsView() {
  window.showView('relations');
  await renderRelationsView();
}

async function renderRelationsView() {
  const canvas  = document.getElementById('relations-canvas');
  const svg     = document.getElementById('relations-svg');
  const loading = document.getElementById('relations-loading');
  if (!canvas || !svg) return;

  canvas.innerHTML = '';
  _erPos = {}; _erFKs = {}; _erSchemas = {};

  if (!State.dbName) {
    canvas.innerHTML = '<div class="er-empty">Open a database first.</div>';
    return;
  }

  if (loading) loading.style.display = 'flex';

  const tablesResult = await window.sqlBrowser.getTables();
  const tables = (tablesResult && tablesResult.tables) ? tablesResult.tables : [];

  if (!tables.length) {
    if (loading) loading.style.display = 'none';
    canvas.innerHTML = '<div class="er-empty">No tables found.</div>';
    return;
  }

  // Fetch schema + FK list for each table
  for (const t of tables) {
    try {
      const s = await window.sqlBrowser.getTableSchema(t.name);
      _erSchemas[t.name] = s || { columns: [] };
    } catch(e) { _erSchemas[t.name] = { columns: [] }; }
    try {
      const safe = t.name.replace(/"/g, '""');
      const r = await window.sqlBrowser.runQuery('PRAGMA foreign_key_list("' + safe + '")');
      if (r && !r.error && r.rows && r.rows.length) {
        _erFKs[t.name] = r.rows.map(function(row) {
          return { from: row.from, toTable: row.table, to: row.to || row.from };
        });
      }
    } catch(e) {}
  }

  if (loading) loading.style.display = 'none';

  // Tree-like layout using topological sort logic
  const graph = {};
  const inDegree = {};
  
  tables.forEach(function(t) {
    graph[t.name] = [];
    inDegree[t.name] = 0;
  });

  // Build edges: referenced table (PK) -> referencing table (FK) (Parent -> Child)
  Object.keys(_erFKs).forEach(function(fromTable) {
    (_erFKs[fromTable] || []).forEach(function(fk) {
      var toTable = fk.toTable;
      if (graph[toTable] && graph[fromTable]) {
        if (toTable !== fromTable && !graph[toTable].includes(fromTable)) {
           graph[toTable].push(fromTable);
           inDegree[fromTable] = (inDegree[fromTable] || 0) + 1;
        }
      }
    });
  });

  const levels = {};
  let currentLevel = 0;
  let queue = Object.keys(inDegree).filter(function(t) { return inDegree[t] === 0; });
  const processed = new Set();
  
  while (queue.length > 0) {
    const nextQueue = [];
    queue.forEach(function(node) {
      levels[node] = currentLevel;
      processed.add(node);
      graph[node].forEach(function(child) {
        inDegree[child]--;
        if (inDegree[child] === 0) {
           nextQueue.push(child);
        }
      });
    });
    // Cycle escape hatch
    if (currentLevel > tables.length) break;
    queue = nextQueue;
    currentLevel++;
  }

  // Put cycles or disconnected components at the end
  tables.forEach(function(t) {
    if (!processed.has(t.name)) {
      levels[t.name] = currentLevel;
    }
  });

  const currentY = {};
  tables.forEach(function(t) {
    const lvl = levels[t.name] || 0;
    if (currentY[lvl] === undefined) {
      currentY[lvl] = 40; // initial top margin
    }
    _erPos[t.name] = { 
      x: 60 + lvl * (ER_CARD_W + 120), 
      y: currentY[lvl]
    };
    const schemaLen = _erSchemas[t.name].columns ? _erSchemas[t.name].columns.length : 0;
    const cardHeight = schemaLen * ER_COL_H + ER_HEADER_H;
    currentY[lvl] += cardHeight + 40; // 40px vertical gap
  });

  // Render cards
  tables.forEach(function(t, i) { _erRenderCard(t.name, i, canvas, svg); });

  // Draw lines after DOM settles
  setTimeout(function() { _erDrawLines(svg); }, 60);
}

function _erColY(tableName, colName) {
  var schema = _erSchemas[tableName];
  var cols = (schema && schema.columns) ? schema.columns : [];
  var idx = cols.findIndex(function(c) { return c.name === colName; });
  return _erPos[tableName].y + ER_HEADER_H + (idx >= 0 ? idx : 0) * ER_COL_H + ER_COL_H / 2;
}

function _erRenderCard(tableName, colorIdx, canvas, svg) {
  var schema = _erSchemas[tableName] || { columns: [] };
  var pos    = _erPos[tableName];
  var color  = ER_COLORS[colorIdx % ER_COLORS.length];
  var fkCols = new Set((_erFKs[tableName] || []).map(function(f){ return f.from; }));

  var card = document.createElement('div');
  card.className = 'er-card';
  card.id = 'er-card-' + tableName;
  card.style.left = pos.x + 'px';
  card.style.top  = pos.y + 'px';

  var hdr = document.createElement('div');
  hdr.className = 'er-card-header';
  hdr.style.cssText = 'background:' + color.bg + ';border-bottom:1px solid ' + color.border + ';color:' + color.text;
  hdr.textContent = tableName;
  card.appendChild(hdr);

  (schema.columns || []).forEach(function(col) {
    var isPk = col.pk === 1 || col.pk === true;
    var isFk = fkCols.has(col.name);
    var row  = document.createElement('div');
    row.className = 'er-col-row' + (isPk ? ' er-row-pk' : '') + (isFk ? ' er-row-fk' : '');
    row.dataset.col = col.name;

    var icon = document.createElement('span');
    icon.className = 'er-col-icon' + (isPk ? ' er-pk' : '') + (isFk ? ' er-fk' : '');
    icon.textContent = isPk ? '#' : (isFk ? '⇢' : 'T');

    var name = document.createElement('span');
    name.className = 'er-col-name';
    name.textContent = col.name;
    name.title = col.name + (col.type ? ' (' + col.type + ')' : '');

    row.appendChild(icon);
    row.appendChild(name);

    if (isFk) {
      var dot = document.createElement('span');
      dot.className = 'er-conn-dot er-conn-dot-right';
      row.appendChild(dot);
    }
    if (isPk) {
      var dot2 = document.createElement('span');
      dot2.className = 'er-conn-dot er-conn-dot-left';
      row.appendChild(dot2);
    }
    card.appendChild(row);
  });

  canvas.appendChild(card);
  _erMakeDraggable(card, tableName, svg);
}

function _erMakeDraggable(card, tableName, svg) {
  card.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    var wrap = document.getElementById('relations-canvas-wrap');
    var rect = wrap.getBoundingClientRect();
    var offX = (e.clientX - rect.left + wrap.scrollLeft) - _erPos[tableName].x;
    var offY = (e.clientY - rect.top  + wrap.scrollTop)  - _erPos[tableName].y;
    card.classList.add('dragging');

    function onMove(ev) {
      var nx = Math.max(0, ev.clientX - rect.left + wrap.scrollLeft - offX);
      var ny = Math.max(0, ev.clientY - rect.top  + wrap.scrollTop  - offY);
      _erPos[tableName] = { x: nx, y: ny };
      card.style.left = nx + 'px';
      card.style.top  = ny + 'px';
      _erDrawLines(svg);
    }
    function onUp() {
      card.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _erDrawLines(svg) {
  svg.innerHTML = '<defs>' +
    '<marker id="er-dot" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">' +
    '<circle cx="3" cy="3" r="2.2" fill="rgba(140,150,175,0.7)"/></marker>' +
    '</defs>';

  Object.keys(_erFKs).forEach(function(fromTable) {
    (_erFKs[fromTable] || []).forEach(function(fk) {
      var toTable = fk.toTable;
      if (!_erPos[fromTable] || !_erPos[toTable]) return;

      var p1x = _erPos[toTable].x;
      var p2x = _erPos[fromTable].x;

      var startX, startY, endX, endY;
      
      // Draw from left-most table to right-most table dynamically
      if (p1x <= p2x) {
         // PK (toTable) is left of FK (fromTable)
         startX = p1x + ER_CARD_W; // exit from right
         startY = _erColY(toTable, fk.to);
         endX   = p2x;             // enter from left
         endY   = _erColY(fromTable, fk.from);
      } else {
         // FK (fromTable) is left of PK (toTable)
         startX = p2x + ER_CARD_W; // exit from right
         startY = _erColY(fromTable, fk.from);
         endX   = p1x;             // enter from left
         endY   = _erColY(toTable, fk.to);
      }

      var dx = Math.max(Math.abs(endX - startX) * 0.45, 60);

      var d = 'M ' + startX + ' ' + startY +
              ' C ' + (startX + dx) + ' ' + startY +
              ', '  + (endX - dx) + ' ' + endY +
              ', '  + endX + ' ' + endY;

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(140,150,175,0.5)');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('marker-start', 'url(#er-dot)');
      path.setAttribute('marker-end',   'url(#er-dot)');
      svg.appendChild(path);
    });
  });
}

// Wire up Relations buttons
var _btnRelations = document.getElementById('btn-relations');
if (_btnRelations) {
  _btnRelations.addEventListener('click', function() {
    if (!State.dbName) { window.showToast('Open a database first', 'info'); return; }
    window.openRelationsView();
  });
}
var _btnCloseRelations = document.getElementById('btn-close-relations');
if (_btnCloseRelations) {
  _btnCloseRelations.addEventListener('click', function() {
    if (State.currentTable) window.showView('data'); else window.showView('empty');
  });
}
var _btnResetEr = document.getElementById('btn-reset-er-layout');
if (_btnResetEr) {
  _btnResetEr.addEventListener('click', function() {
    _erPos = {};
    renderRelationsView();
  });
}
