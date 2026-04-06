/* ════════════════════════════════════════════════════════════
   SQL BROWSER — MAIN APP CONTROLLER
   ════════════════════════════════════════════════════════════ */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
const State = {
  currentTable: null,
  currentPage: 1,
  pageSize: 50,
  sortCol: null,
  sortDir: 'asc',
  searchQuery: '',
  totalRows: 0,
  columns: [],
  queryResults: null,
  dbName: null,
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  welcomeScreen:      $('welcome-screen'),
  app:                $('app'),
  btnOpenWelcome:     $('btn-open-welcome'),
  dropZone:           $('drop-zone'),
  recentSection:      $('recent-files-section'),
  recentList:         $('recent-list'),
  btnOpenSidebar:     $('btn-open-sidebar'),
  sidebarDbName:      $('sidebar-db-name'),
  sidebarDbMeta:      $('sidebar-db-meta'),
  tableSearch:        $('table-search'),
  tableList:          $('table-list'),
  btnQueryEditor:     $('btn-query-editor'),
  btnCloseDb:         $('btn-close-db'),
  breadcrumbDb:       $('breadcrumb-db'),
  breadcrumbSep:      $('breadcrumb-sep'),
  breadcrumbTable:    $('breadcrumb-table'),
  toolbarActions:     $('toolbar-actions'),
  dataSearch:         $('data-search'),
  btnRefresh:         $('btn-refresh'),
  btnSchema:          $('btn-schema'),
  btnExport:          $('btn-export'),
  emptyState:         $('empty-state'),
  dataView:           $('data-view'),
  schemaView:         $('schema-view'),
  queryView:          $('query-view'),
  tableStats:         $('table-stats'),
  dataThead:          $('data-thead'),
  dataTbody:          $('data-tbody'),
  tableLoading:       $('table-loading'),
  pagination:         $('pagination'),
  schemaTitle:        $('schema-title'),
  schemaBody:         $('schema-body'),
  btnCloseSchema:     $('btn-close-schema'),
  btnRunQuery:        $('btn-run-query'),
  btnCloseQuery:      $('btn-close-query'),
  btnExportQuery:     $('btn-export-query'),
  queryResultsBody:   $('query-results-body'),
  resultsTitle:       $('results-title'),
  btnOpenEditorEmpty: $('btn-open-editor-empty'),
  aboutModal:         $('about-modal'),
  btnCloseAbout:      $('btn-close-about'),
  toastContainer:     $('toast-container'),
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatCell(val) {
  if (val === null || val === undefined) return '<span class="cell-null">NULL</span>';
  if (typeof val === 'number')  return '<span class="cell-number">' + val + '</span>';
  if (typeof val === 'boolean') return '<span class="cell-boolean">' + val + '</span>';
  const str = String(val);
  if (str.length > 200) return escHtml(str.slice(0, 200)) + '<span style="color:var(--text-muted)">…</span>';
  return escHtml(str);
}

// ─── CodeMirror Editor ────────────────────────────────────────────────────────
let editor = null;
function initEditor() {
  if (editor) return;
  editor = CodeMirror($('codemirror-container'), {
    mode: 'text/x-sql',
    theme: 'dracula',
    lineNumbers: true,
    matchBrackets: true,
    tabSize: 2,
    extraKeys: {
      'Ctrl-Enter': runQuery,
      'Cmd-Enter':  runQuery,
    },
    value: 'SELECT * FROM users LIMIT 100;',
  });
}

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(view) {
  el.emptyState.style.display     = 'none';
  el.dataView.style.display       = 'none';
  el.schemaView.style.display     = 'none';
  el.queryView.style.display      = 'none';
  el.toolbarActions.style.display = 'none';
  if (view === 'empty')  el.emptyState.style.display     = 'flex';
  if (view === 'data')  { el.dataView.style.display      = 'flex'; el.toolbarActions.style.display = 'flex'; }
  if (view === 'schema') el.schemaView.style.display     = 'flex';
  if (view === 'query') { el.queryView.style.display     = 'flex'; initEditor(); }
}
function showApp() {
  el.welcomeScreen.style.display = 'none';
  el.app.style.display           = 'flex';
  showView('empty');
}
function showWelcome() {
  el.welcomeScreen.style.display = 'flex';
  el.app.style.display           = 'none';
  loadRecentFiles();
}

// ─── Toasts ───────────────────────────────────────────────────────────────────
function showToast(message, type, duration) {
  type     = type     || 'info';
  duration = duration || 3000;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span>' + (icons[type] || '•') + '</span> <span>' + escHtml(message) + '</span>';
  el.toastContainer.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('toast-out');
    setTimeout(function() { toast.remove(); }, 300);
  }, duration);
}

// ─── Recent Files ─────────────────────────────────────────────────────────────
async function loadRecentFiles() {
  const files = await window.sqlBrowser.getRecentFiles();
  if (!files || files.length === 0) {
    el.recentSection.style.display = 'none';
    return;
  }
  el.recentSection.style.display = 'block';
  el.recentList.innerHTML = '';
  files.forEach(function(fp) {
    const name = fp.split(/[/\\]/).pop();
    const li = document.createElement('li');
    li.dataset.fp = fp;
    li.innerHTML =
      '<span class="recent-file-icon">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<ellipse cx="12" cy="5" rx="9" ry="3"/>' +
          '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>' +
          '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>' +
        '</svg>' +
      '</span>' +
      '<div class="recent-file-info">' +
        '<div class="recent-file-name">' + escHtml(name) + '</div>' +
        '<div class="recent-file-path">' + escHtml(fp)   + '</div>' +
      '</div>';
    el.recentList.appendChild(li);
  });
}

// Event delegation for recent file clicks
el.recentList.addEventListener('click', function(e) {
  const li = e.target.closest('li[data-fp]');
  if (li && li.dataset.fp) {
    window.sqlBrowser.openDatabase(li.dataset.fp);
  }
});

// ─── DB Events ────────────────────────────────────────────────────────────────
window.sqlBrowser.onDbOpened(function(data) {
  var name   = data.name;
  var tables = data.tables;
  State.dbName       = name;
  State.currentTable = null;
  State.currentPage  = 1;

  el.sidebarDbName.textContent = name;
  el.breadcrumbDb.textContent  = name;

  window.sqlBrowser.getDbInfo().then(function(info) {
    if (!info.error) {
      var kb = (info.size / 1024).toFixed(1);
      el.sidebarDbMeta.textContent = info.tableCount + ' tables · ' + kb + ' KB';
    }
  });

  renderTableList(tables);
  showApp();
  showView('empty');
  showToast('Opened ' + name, 'success');
});

window.sqlBrowser.onDbClosed(function() {
  State.currentTable = null;
  State.dbName       = null;
  el.sidebarDbName.textContent = 'No database';
  el.sidebarDbMeta.textContent = '';
  el.tableList.innerHTML       = '<li class="table-list-empty">Open a database to view tables</li>';
  el.breadcrumbDb.textContent  = '';
  el.breadcrumbSep.style.display   = 'none';
  el.breadcrumbTable.textContent   = '';
  showWelcome();
  showToast('Database closed', 'info');
});

window.sqlBrowser.onDbError(function(msg) {
  showToast('Error: ' + msg, 'error');
});

window.sqlBrowser.onShowAbout(function() {
  el.aboutModal.style.display = 'flex';
});

// ─── Table List ───────────────────────────────────────────────────────────────
function renderTableList(tables) {
  el.tableList.innerHTML = '';
  if (!tables || tables.length === 0) {
    el.tableList.innerHTML = '<li class="table-list-empty">No tables found</li>';
    return;
  }
  tables.forEach(function(t) {
    const li = document.createElement('li');
    li.className = 'table-item';
    li.dataset.table = t.name;
    li.innerHTML =
      '<span class="table-item-icon">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
          '<line x1="3" y1="9" x2="21" y2="9"/>' +
          '<line x1="3" y1="15" x2="21" y2="15"/>' +
          '<line x1="9" y1="3" x2="9" y2="21"/>' +
        '</svg>' +
      '</span>' +
      '<span class="table-item-name">' + escHtml(t.name) + '</span>' +
      '<span class="table-item-count">' + t.rowCount.toLocaleString() + '</span>';
    el.tableList.appendChild(li);
  });
}

// Event delegation — single listener handles all table clicks
el.tableList.addEventListener('click', function(e) {
  const item = e.target.closest('.table-item[data-table]');
  if (item) selectTable(item.dataset.table);
});

// Table search filter
el.tableSearch.addEventListener('input', function() {
  const q = el.tableSearch.value.trim().toLowerCase();
  document.querySelectorAll('.table-item').forEach(function(li) {
    li.style.display = li.dataset.table.toLowerCase().includes(q) ? '' : 'none';
  });
});

// ─── Select Table ─────────────────────────────────────────────────────────────
async function selectTable(tableName) {
  console.log('[Frontend] selectTable called:', tableName);
  State.currentTable = tableName;
  State.currentPage  = 1;
  State.sortCol      = null;
  State.sortDir      = 'asc';
  State.searchQuery  = '';
  el.dataSearch.value = '';

  document.querySelectorAll('.table-item').forEach(function(li) {
    li.classList.toggle('active', li.dataset.table === tableName);
  });

  el.breadcrumbSep.style.display  = 'inline';
  el.breadcrumbTable.textContent  = tableName;

  showView('data');
  await loadTableData();
}

// ─── Load Table Data ──────────────────────────────────────────────────────────
async function loadTableData() {
  if (!State.currentTable) return;
  console.log('[Frontend] loadTableData:', State.currentTable);
  el.tableLoading.style.display = 'flex';

  const result = await window.sqlBrowser.getTableData({
    table:    State.currentTable,
    page:     State.currentPage,
    pageSize: State.pageSize,
    sortCol:  State.sortCol,
    sortDir:  State.sortDir,
    search:   State.searchQuery,
  });

  console.log('[Frontend] getTableData result:', result);
  el.tableLoading.style.display = 'none';

  if (result.error) {
    showToast(result.error, 'error');
    return;
  }

  State.columns   = result.columns;
  State.totalRows = result.total;

  renderTableHeader(result.columns);
  renderTableBody(result.rows, result.columns);
  renderPagination(result.total, result.page, result.pageSize);
  renderTableStats(result.total, result.page, result.pageSize, result.rows.length);
}

// ─── Render Grid ──────────────────────────────────────────────────────────────
function renderTableHeader(columns) {
  el.dataThead.innerHTML = '';
  const tr = document.createElement('tr');

  const rowNumTh = document.createElement('th');
  rowNumTh.style.cssText = 'width:42px;text-align:center;color:var(--text-muted)';
  rowNumTh.textContent = '#';
  tr.appendChild(rowNumTh);

  columns.forEach(function(c) {
    const th = document.createElement('th');
    const isSorted = State.sortCol === c.name;
    if (isSorted) th.className = 'sort-' + State.sortDir;
    const arrow = isSorted ? (State.sortDir === 'asc' ? '↑' : '↓') : '↕';
    th.innerHTML = '<div class="th-content">' + escHtml(c.name) + ' <span class="sort-icon">' + arrow + '</span></div>';
    th.dataset.col = c.name;
    tr.appendChild(th);
  });

  el.dataThead.appendChild(tr);
}

// Sort on header click
el.dataThead.addEventListener('click', async function(e) {
  const th = e.target.closest('th[data-col]');
  if (!th) return;
  const col = th.dataset.col;
  if (State.sortCol === col) {
    State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    State.sortCol = col;
    State.sortDir = 'asc';
  }
  State.currentPage = 1;
  await loadTableData();
});

function renderTableBody(rows, columns) {
  el.dataTbody.innerHTML = '';
  if (!rows || rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length + 1;
    td.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-style:italic';
    td.textContent = 'No data found';
    tr.appendChild(td);
    el.dataTbody.appendChild(tr);
    return;
  }

  const offset = (State.currentPage - 1) * State.pageSize;
  rows.forEach(function(row, i) {
    const tr = document.createElement('tr');

    const numTd = document.createElement('td');
    numTd.style.cssText = 'text-align:center;color:var(--text-muted);font-size:11px;user-select:none';
    numTd.textContent = offset + i + 1;
    tr.appendChild(numTd);

    columns.forEach(function(c) {
      const td = document.createElement('td');
      const val = row[c.name];
      td.title = String(val !== null && val !== undefined ? val : '');
      td.innerHTML = formatCell(val);
      tr.appendChild(td);
    });

    el.dataTbody.appendChild(tr);
  });
}

function renderTableStats(total, page, pageSize, count) {
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  el.tableStats.textContent = 'Showing ' + start + '–' + end + ' of ' + total.toLocaleString() + ' rows' +
    (State.searchQuery ? ' · Filter: "' + State.searchQuery + '"' : '');
}

function renderPagination(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  el.pagination.innerHTML = '';

  // Left side — info + page size
  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:8px';

  const info = document.createElement('span');
  info.className = 'pagination-info';
  info.textContent = 'Page ' + page + ' of ' + totalPages;
  left.appendChild(info);

  const sel = document.createElement('select');
  sel.className = 'page-size-select';
  [25, 50, 100, 250, 500].forEach(function(n) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n + ' / page';
    if (n === pageSize) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', async function() {
    State.pageSize    = parseInt(this.value);
    State.currentPage = 1;
    await loadTableData();
  });
  left.appendChild(sel);
  el.pagination.appendChild(left);

  // Right side — buttons
  const controls = document.createElement('div');
  controls.className = 'pagination-controls';

  function mkBtn(label, targetPage, disabled) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (targetPage === page ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', async function() {
      if (targetPage < 1 || targetPage > totalPages || targetPage === State.currentPage) return;
      State.currentPage = targetPage;
      await loadTableData();
    });
    return btn;
  }

  controls.appendChild(mkBtn('«', 1,           page === 1));
  controls.appendChild(mkBtn('‹', page - 1,   page === 1));

  getPagesToShow(page, totalPages).forEach(function(p) {
    if (p === '…') {
      const span = document.createElement('span');
      span.style.cssText = 'padding:0 4px;color:var(--text-muted)';
      span.textContent = '…';
      controls.appendChild(span);
    } else {
      controls.appendChild(mkBtn(p, p, false));
    }
  });

  controls.appendChild(mkBtn('›', page + 1,       page === totalPages));
  controls.appendChild(mkBtn('»', totalPages, page === totalPages));

  el.pagination.appendChild(controls);
}

function getPagesToShow(current, total) {
  if (total <= 7) return Array.from({ length: total }, function(_, i) { return i + 1; });
  if (current <= 4)          return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3)  return [1, '…', total-4, total-3, total-2, total-1, total];
  return [1, '…', current-1, current, current+1, '…', total];
}

// ─── Search ───────────────────────────────────────────────────────────────────
var searchDebounce;
el.dataSearch.addEventListener('input', function() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async function() {
    State.searchQuery = el.dataSearch.value.trim();
    State.currentPage = 1;
    await loadTableData();
  }, 350);
});

// ─── Refresh ──────────────────────────────────────────────────────────────────
el.btnRefresh.addEventListener('click', async function() {
  await loadTableData();
  showToast('Refreshed', 'info');
});

// ─── Schema View ──────────────────────────────────────────────────────────────
el.btnSchema.addEventListener('click', async function() {
  if (!State.currentTable) return;
  const schema = await window.sqlBrowser.getTableSchema(State.currentTable);
  if (schema.error) { showToast(schema.error, 'error'); return; }

  el.schemaTitle.textContent = 'Schema: ' + State.currentTable;

  let html = '<div><div class="schema-section-title">Columns (' + schema.columns.length + ')</div>';
  html += '<table class="schema-table"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Nullable</th><th>Default</th><th>Key</th></tr></thead><tbody>';
  schema.columns.forEach(function(c) {
    html += '<tr>' +
      '<td style="color:var(--text-muted)">' + (c.cid + 1) + '</td>' +
      '<td style="font-weight:500">' + escHtml(c.name) + '</td>' +
      '<td><span class="schema-type-badge">' + escHtml(c.type || 'ANY') + '</span></td>' +
      '<td>' + (c.notnull ? '<span style="color:var(--red)">NOT NULL</span>' : '<span style="color:var(--text-muted)">NULL</span>') + '</td>' +
      '<td style="color:var(--text-muted);font-family:monospace">' + (c.dflt_value !== null ? escHtml(String(c.dflt_value)) : '—') + '</td>' +
      '<td>' + (c.pk ? '<span class="schema-pk">PK</span>' : '') + '</td>' +
      '</tr>';
  });
  html += '</tbody></table></div>';

  if (schema.indexes && schema.indexes.length > 0) {
    html += '<div><div class="schema-section-title">Indexes (' + schema.indexes.length + ')</div>';
    html += '<table class="schema-table"><thead><tr><th>Name</th><th>Unique</th></tr></thead><tbody>';
    schema.indexes.forEach(function(idx) {
      html += '<tr><td>' + escHtml(idx.name) + '</td><td>' + (idx.unique ? '<span style="color:var(--green)">✓ Unique</span>' : '—') + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  html += '<div><div class="schema-section-title">CREATE Statement</div>';
  html += '<pre class="schema-sql">' + escHtml(schema.createSql || '') + '</pre></div>';

  el.schemaBody.innerHTML = html;
  showView('schema');
});

el.btnCloseSchema.addEventListener('click', function() {
  if (State.currentTable) showView('data');
  else showView('empty');
});

// ─── Export ───────────────────────────────────────────────────────────────────
function buildCsv(headers, rows) {
  function esc(v) {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  const lines = [headers.map(esc).join(',')];
  rows.forEach(function(r) { lines.push(headers.map(function(h) { return esc(r[h]); }).join(',')); });
  return lines.join('\r\n');
}

el.btnExport.addEventListener('click', async function() {
  if (!State.currentTable) return;
  const all = await window.sqlBrowser.getTableData({
    table: State.currentTable, page: 1, pageSize: 999999,
    sortCol: State.sortCol, sortDir: State.sortDir, search: State.searchQuery,
  });
  if (all.error) { showToast(all.error, 'error'); return; }
  const csv = buildCsv(all.columns.map(function(c) { return c.name; }), all.rows);
  const result = await window.sqlBrowser.exportCsv({ data: csv, filename: State.currentTable + '.csv' });
  if (result.success) showToast('Exported to CSV!', 'success');
  else if (!result.canceled) showToast(result.error, 'error');
});

// ─── SQL Query Editor ─────────────────────────────────────────────────────────
el.btnQueryEditor.addEventListener('click',     openQueryEditor);
el.btnOpenEditorEmpty.addEventListener('click', openQueryEditor);
function openQueryEditor() {
  showView('query');
  setTimeout(function() { if (editor) editor.refresh(); }, 100);
}
el.btnCloseQuery.addEventListener('click', function() {
  if (State.currentTable) showView('data');
  else showView('empty');
});

async function runQuery() {
  if (!editor) return;
  const sql = editor.getSelection() || editor.getValue();
  if (!sql.trim()) return;

  el.queryResultsBody.innerHTML = '<div class="results-empty"><div class="spinner" style="width:24px;height:24px"></div></div>';
  el.btnExportQuery.style.display = 'none';
  el.resultsTitle.textContent     = 'Running…';

  const result = await window.sqlBrowser.runQuery(sql.trim());

  if (result.error) {
    el.resultsTitle.textContent = 'Error';
    el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card error"><div class="results-card-icon">⚠️</div><h3>' + escHtml(result.error) + '</h3></div></div>';
    return;
  }

  if (result.type === 'write') {
    el.resultsTitle.textContent = 'Done (' + result.elapsed + 'ms)';
    el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card success"><div class="results-card-icon">✅</div><h3>' + result.changes + ' row' + (result.changes !== 1 ? 's' : '') + ' affected</h3><p>Completed in ' + result.elapsed + 'ms</p></div></div>';
    window.sqlBrowser.getTables().then(function(r) { if (r.tables) renderTableList(r.tables); });
    return;
  }

  State.queryResults = result;
  el.resultsTitle.textContent = result.rowCount.toLocaleString() + ' row' + (result.rowCount !== 1 ? 's' : '') + ' · ' + result.elapsed + 'ms';
  el.btnExportQuery.style.display = result.rowCount > 0 ? 'inline-flex' : 'none';

  if (result.rowCount === 0) {
    el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card success"><div class="results-card-icon">🔍</div><h3>No results</h3><p>Returned 0 rows in ' + result.elapsed + 'ms</p></div></div>';
    return;
  }

  const cols = result.columns;
  let tableHtml = '<table class="query-result-table"><thead><tr><th style="width:42px;text-align:center;color:var(--text-muted)">#</th>';
  cols.forEach(function(c) { tableHtml += '<th>' + escHtml(c.name) + '</th>'; });
  tableHtml += '</tr></thead><tbody>';
  result.rows.forEach(function(row, i) {
    tableHtml += '<tr><td style="text-align:center;color:var(--text-muted);font-size:11px">' + (i + 1) + '</td>';
    cols.forEach(function(c) { tableHtml += '<td title="' + escAttr(String(row[c.name] !== null && row[c.name] !== undefined ? row[c.name] : '')) + '">' + formatCell(row[c.name]) + '</td>'; });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody></table>';
  el.queryResultsBody.innerHTML = tableHtml;
}

el.btnRunQuery.addEventListener('click', runQuery);

el.btnExportQuery.addEventListener('click', async function() {
  if (!State.queryResults) return;
  const cols   = State.queryResults.columns.map(function(c) { return c.name; });
  const csv    = buildCsv(cols, State.queryResults.rows);
  const result = await window.sqlBrowser.exportCsv({ data: csv, filename: 'query_result.csv' });
  if (result.success) showToast('Exported!', 'success');
  else if (!result.canceled) showToast(result.error, 'error');
});

// ─── Open / Close DB ──────────────────────────────────────────────────────────
el.btnOpenWelcome.addEventListener('click', function() { window.sqlBrowser.openFileDialog(); });
el.btnOpenSidebar.addEventListener('click', function() { window.sqlBrowser.openFileDialog(); });
el.btnCloseDb.addEventListener('click',     function() { window.sqlBrowser.closeDatabase(); });

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
el.dropZone.addEventListener('dragover', function(e) {
  e.preventDefault();
  el.dropZone.classList.add('drag-over');
});
el.dropZone.addEventListener('dragleave', function() {
  el.dropZone.classList.remove('drag-over');
});
el.dropZone.addEventListener('drop', function(e) {
  e.preventDefault();
  el.dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.path) window.sqlBrowser.openDatabase(file.path);
});
document.addEventListener('dragover', function(e) { e.preventDefault(); });
document.addEventListener('drop', function(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.path) window.sqlBrowser.openDatabase(file.path);
});

// ─── About Modal ──────────────────────────────────────────────────────────────
el.btnCloseAbout.addEventListener('click', function() { el.aboutModal.style.display = 'none'; });
el.aboutModal.addEventListener('click', function(e) {
  if (e.target === el.aboutModal) el.aboutModal.style.display = 'none';
});

// ─── Init ─────────────────────────────────────────────────────────────────────
showWelcome();
