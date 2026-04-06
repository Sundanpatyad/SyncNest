/* ════════════════════════════════════════════════════════════
   SYNCNEST v2 — APP CONTROLLER
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
  rows: [],
  queryResults: null,
  dbName: null,
  viewMode: 'table', // 'table' | 'document'
  // Edit modal
  editRow: null,   // the original row object being edited
  editRowIndex: null,   // index in State.rows
  pkColumn: null,   // best-guess primary key column name
  deleteConfirming: false,
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  welcomeScreen: $('welcome-screen'),
  app: $('app'),
  btnOpenWelcome: $('btn-open-welcome'),
  dropZone: $('drop-zone'),
  recentSection: $('recent-files-section'),
  recentList: $('recent-list'),
  btnOpenSidebar: $('btn-open-sidebar'),
  sidebarDbName: $('sidebar-db-name'),
  sidebarDbMeta: $('sidebar-db-meta'),
  tableSearch: $('table-search'),
  tableList: $('table-list'),
  btnQueryEditor: $('btn-query-editor'),
  btnCloseDb: $('btn-close-db'),
  btnRefreshTables: $('btn-refresh-tables'),
  breadcrumbDb: $('breadcrumb-db'),
  breadcrumbSep: $('breadcrumb-sep'),
  breadcrumbTable: $('breadcrumb-table'),
  toolbarActions: $('toolbar-actions'),
  dataSearch: $('data-search'),
  btnRefresh: $('btn-refresh'),
  btnSchema: $('btn-schema'),
  btnExport: $('btn-export'),
  btnViewTable: $('btn-view-table'),
  btnViewDoc: $('btn-view-doc'),
  emptyState: $('empty-state'),
  dataView: $('data-view'),
  schemaView: $('schema-view'),
  queryView: $('query-view'),
  tableStats: $('table-stats'),
  tableStatsBadge: $('table-stats-badge'),
  tableWrapper: $('table-wrapper'),
  documentWrapper: $('document-wrapper'),
  dataThead: $('data-thead'),
  dataTbody: $('data-tbody'),
  tableLoading: $('table-loading'),
  pagination: $('pagination'),
  schemaTitle: $('schema-title'),
  schemaBody: $('schema-body'),
  btnCloseSchema: $('btn-close-schema'),
  btnCloseSchemaTop: $('btn-close-schema-top'),
  schemaColChip: $('schema-col-chip'),
  schemaColCount: $('schema-col-count'),
  schemaIdxChip: $('schema-idx-chip'),
  schemaIdxCount: $('schema-idx-count'),
  btnRunQuery: $('btn-run-query'),
  btnCloseQuery: $('btn-close-query'),
  btnExportQuery: $('btn-export-query'),
  queryResultsBody: $('query-results-body'),
  resultsTitle: $('results-title'),
  btnOpenEditorEmpty: $('btn-open-editor-empty'),
  aboutModal: $('about-modal'),
  btnCloseAbout: $('btn-close-about'),
  toastContainer: $('toast-container'),
  // Discovery UI (now in modal)
  discoverModal: $('discover-modal'),
  btnShowDiscover: $('btn-show-discover'),
  btnCloseDiscover: $('btn-close-discover'),
  btnCloseDiscoverFooter: $('btn-close-discover-footer'),
  discoverSearch: $('discover-search'),
  discoveryList: $('discovery-list'),
  scanBadge: $('scan-badge'),
  btnRescan: $('btn-rescan'),
  discoverCount: $('discover-count'),
  // Edit modal
  editModal: $('edit-modal'),
  editModalTitle: $('edit-modal-title'),
  editModalBody: $('edit-modal-body'),
  btnCloseEditModal: $('btn-close-edit-modal'),
  btnUpdateRow: $('btn-update-row'),
  btnDeleteRow: $('btn-delete-row'),
  btnCancelEdit: $('btn-cancel-edit'),
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function guessType(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return 'bool';
  if (typeof val === 'number') return 'number';
  // Date heuristic
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return 'date';
  return 'string';
}

function formatTableCell(val) {
  if (val === null || val === undefined) return '<span class="cell-null">NULL</span>';
  if (typeof val === 'number') return '<span class="cell-number">' + val + '</span>';
  if (typeof val === 'boolean') return '<span class="cell-boolean">' + val + '</span>';
  const s = String(val);
  return esc(s.length > 200 ? s.slice(0, 200) + '…' : s);
}

function tryParseJson(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  return null;
}

function formatDocVal(val) {
  const type = guessType(val);
  let display = '';
  if (type === 'null') display = '<span class="doc-val-null">null</span>';
  else if (type === 'number') display = '<span class="doc-val-number">' + val + '</span>';
  else if (type === 'bool') display = '<span class="doc-val-bool">' + val + '</span>';
  else if (type === 'date') display = '<span class="doc-val-date">"' + esc(String(val)) + '"</span>';
  else {
    const s = String(val);
    display = '<span class="doc-val-string">"' + esc(s) + '"</span>';
  }
  return display;
}

function buildFieldNode(key, val) {
  let parsedJson = null;
  if (typeof val === 'string') {
    parsedJson = tryParseJson(val);
  } else if (typeof val === 'object' && val !== null) {
    parsedJson = val; // Just in case it's a native object already inside another JSON
  }

  if (parsedJson !== null) {
    return buildNestedNode(key, parsedJson);
  }

  const container = document.createElement('div');
  container.className = 'doc-field';

  const keyEl = document.createElement('span');
  keyEl.className = 'doc-field-key';
  keyEl.textContent = key;
  keyEl.title = key;

  const colonEl = document.createElement('span');
  colonEl.className = 'doc-field-colon';
  colonEl.textContent = ' :';

  const valEl = document.createElement('span');
  valEl.className = 'doc-field-val';
  valEl.innerHTML = formatDocVal(val);

  container.appendChild(keyEl);
  container.appendChild(colonEl);
  container.appendChild(valEl);
  return container;
}

function buildNestedNode(key, obj) {
  const container = document.createElement('div');
  container.className = 'doc-field-nested-wrapper';

  const header = document.createElement('div');
  header.className = 'doc-field doc-collapsible';

  const keyEl = document.createElement('span');
  keyEl.className = 'doc-field-key';
  keyEl.textContent = key;
  keyEl.title = key;

  const colonEl = document.createElement('span');
  colonEl.className = 'doc-field-colon';
  colonEl.textContent = ' :';

  const isArray = Array.isArray(obj);
  const keys = isArray ? obj : Object.keys(obj);
  const count = keys.length;

  const summaryEl = document.createElement('span');
  summaryEl.className = 'doc-val-summary';
  if (count === 0) {
    summaryEl.textContent = isArray ? 'Array (empty)' : 'Object (empty)';
    header.classList.remove('doc-collapsible'); // Remove collapsible if empty
    header.style.paddingLeft = '31px'; // Compensate for missing caret
  } else {
    summaryEl.textContent = isArray ? `Array (${count})` : `Object {${count}}`;
  }

  header.appendChild(keyEl);
  header.appendChild(colonEl);
  header.appendChild(summaryEl);
  container.appendChild(header);

  if (count > 0) {
    const content = document.createElement('div');
    content.className = 'doc-nested-content';

    if (isArray) {
      obj.forEach((item, index) => {
        content.appendChild(buildFieldNode(index.toString(), item));
      });
    } else {
      Object.keys(obj).forEach(k => {
        content.appendChild(buildFieldNode(k, obj[k]));
      });
    }
    container.appendChild(content);

    header.addEventListener('click', (e) => {
      e.stopPropagation();
      header.classList.toggle('open');
      content.classList.toggle('open');
    });
  }

  return container;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type, duration) {
  type = type || 'info'; duration = duration || 3000;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.innerHTML = '<span>' + (icons[type] || '•') + '</span><span>' + esc(message) + '</span>';
  el.toastContainer.appendChild(t);
  setTimeout(function () {
    t.classList.add('toast-out');
    setTimeout(function () { t.remove(); }, 300);
  }, duration);
}

// ─── CodeMirror ───────────────────────────────────────────────────────────────
let editor = null;
function initEditor() {
  if (editor) return;
  editor = CodeMirror($('codemirror-container'), {
    mode: 'text/x-sql', theme: 'dracula',
    lineNumbers: true, matchBrackets: true, tabSize: 2,
    extraKeys: { 'Ctrl-Enter': runQuery, 'Cmd-Enter': runQuery },
    value: 'SELECT * FROM users LIMIT 100;',
  });
}

// ─── Views ────────────────────────────────────────────────────────────────────
function showView(view) {
  el.emptyState.style.display = 'none';
  el.dataView.style.display = 'none';
  el.schemaView.style.display = 'none';
  el.queryView.style.display = 'none';
  el.toolbarActions.style.display = 'none';
  if (view === 'empty') { el.emptyState.style.display = 'flex'; }
  if (view === 'data') { el.dataView.style.display = 'flex'; el.toolbarActions.style.display = 'flex'; }
  if (view === 'schema') { el.schemaView.style.display = 'flex'; el.toolbarActions.style.display = 'flex'; }
  if (view === 'query') { el.queryView.style.display = 'flex'; initEditor(); }
}
function showApp() { el.welcomeScreen.style.display = 'none'; el.app.style.display = 'flex'; showView('empty'); }

// ─── Welcome & Recent ─────────────────────────────────────────────────────────
function showWelcome() {
  el.emptyState.style.display = 'flex';
  el.dataView.style.display = 'none';
  el.schemaView.style.display = 'none';
  el.queryView.style.display = 'none';
  el.toolbarActions.style.visibility = 'hidden';
  el.breadcrumbDb.textContent = '';
  el.breadcrumbTable.textContent = '';
  el.breadcrumbSep.style.display = 'none';
  el.welcomeScreen.style.display = 'flex';
  el.app.style.display = 'none';
  loadRecentFiles();

  // Trigger local databases background scan
  if (!_allDiscoveredDbs.length) {
    runScanning();
  } else {
    renderDiscoveryCards(_allDiscoveredDbs);
  }
}

async function loadRecentFiles() {
  const files = await window.sqlBrowser.getRecentFiles();
  el.recentList.innerHTML = '';
  if (files && files.length > 0) {
    el.recentSection.style.display = 'block';
    files.forEach(function (f) {
      const filePath = typeof f === 'string' ? f : f.path;
      const fileName = typeof f === 'string' ? filePath.split(/[/\\]/).pop() : f.name;
      const li = document.createElement('li');
      li.className = 'recent-item';
      li.innerHTML = '<div class="recent-file-info"><div class="recent-file-name">' + esc(fileName) + '</div><div class="recent-file-path">&lrm;' + esc(filePath) + '</div></div>';
      li.addEventListener('click', function () { window.sqlBrowser.openDatabase(filePath); });
      el.recentList.appendChild(li);
    });
  } else {
    el.recentSection.style.display = 'none';
  }
}

// ─── DB Auto-Discovery Modal ─────────────────────────────────────────────────
let _allDiscoveredDbs = [];

function openDiscoverModal() {
  el.discoverModal.style.display = 'flex';
  el.discoverSearch.value = '';
  // Only scan if list is empty or shows scanning state
  if (!_allDiscoveredDbs.length) {
    el.discoveryList.innerHTML = '<div class="discovery-scanning"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div><span>Scanning for databases…</span></div>';
    el.discoverCount.textContent = '';
    runScanning();
  } else {
    renderDiscoveryCards(_allDiscoveredDbs);
  }
}

function closeDiscoverModal() {
  el.discoverModal.style.display = 'none';
}

async function runScanning() {
  el.scanBadge.style.display = 'inline-flex';
  const result = await window.sqlBrowser.scanDatabases();
  el.scanBadge.style.display = 'none';
  _allDiscoveredDbs = (result && result.databases) ? result.databases : [];
  renderDiscoveryCards(_allDiscoveredDbs);
}

function renderDiscoveryCards(dbs) {
  const query = el.discoverSearch ? el.discoverSearch.value.trim().toLowerCase() : '';
  const filtered = query ? dbs.filter(db =>
    db.name.toLowerCase().includes(query) ||
    (db.appName && db.appName.toLowerCase().includes(query)) ||
    db.path.toLowerCase().includes(query)
  ) : dbs;

  el.discoverCount.textContent = filtered.length + ' database' + (filtered.length !== 1 ? 's' : '') + ' found';

  if (!filtered.length) {
    el.discoveryList.innerHTML =
      '<div class="discovery-empty">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>' +
      (query ? 'No databases matching "' + esc(query) + '"' : 'No databases found automatically.') +
      '</div>';
    return;
  }

  el.discoveryList.innerHTML = '';
  filtered.forEach(db => {
    const tpl = document.getElementById('discovery-card-template');
    const card = tpl.content.firstElementChild.cloneNode(true);

    // Set Name
    const nameEl = card.querySelector('.dc-name');
    nameEl.textContent = db.name;
    nameEl.title = db.name;

    // Set Source Badge
    card.querySelector('.dc-source-badge').textContent = db.source;

    // Set Path with RTL truncation trick protection
    const pathEl = card.querySelector('.dc-path');
    pathEl.innerHTML = '&lrm;' + esc(db.path);
    pathEl.title = db.path;

    card.addEventListener('click', () => {
      window.sqlBrowser.openDatabase(db.path);
      closeDiscoverModal();
    });
    el.discoveryList.appendChild(card);
  });
}

// Discover modal wiring
if (el.btnShowDiscover) {
  el.btnShowDiscover.addEventListener('click', openDiscoverModal);
}
if (el.btnCloseDiscover) {
  el.btnCloseDiscover.addEventListener('click', closeDiscoverModal);
}
if (el.btnCloseDiscoverFooter) {
  el.btnCloseDiscoverFooter.addEventListener('click', closeDiscoverModal);
}
if (el.discoverModal) {
  el.discoverModal.addEventListener('click', function (e) {
    if (e.target === el.discoverModal) closeDiscoverModal();
  });
}
if (el.discoverSearch) {
  el.discoverSearch.addEventListener('input', function () {
    renderDiscoveryCards(_allDiscoveredDbs);
  });
}
if (el.btnRescan) {
  el.btnRescan.addEventListener('click', () => {
    _allDiscoveredDbs = [];
    el.discoveryList.innerHTML = '<div class="discovery-scanning"><div class="spinner" style="width:20px;height:20px;border-width:2px"></div><span>Scanning filesystem…</span></div>';
    el.discoverCount.textContent = '';
    runScanning();
  });
}

// ─── View mode toggle (Table / Document) ──────────────────────────────────────
function setViewMode(mode) {
  State.viewMode = mode;
  el.btnViewTable.classList.toggle('active', mode === 'table');
  el.btnViewDoc.classList.toggle('active', mode === 'document');
  el.tableWrapper.style.display = mode === 'table' ? 'block' : 'none';
  el.documentWrapper.style.display = mode === 'document' ? 'grid' : 'none';
  if (State.rows.length > 0) {
    if (mode === 'table') renderTableBody(State.rows, State.columns);
    else renderDocumentView(State.rows, State.columns);
  }
}

el.btnViewTable.addEventListener('click', function () { setViewMode('table'); });
el.btnViewDoc.addEventListener('click', function () { setViewMode('document'); });

// ─── Recent Files ─────────────────────────────────────────────────────────────
el.recentList.addEventListener('click', function (e) {
  const li = e.target.closest('li[data-fp]');
  if (li) window.sqlBrowser.openDatabase(li.dataset.fp);
});

// ─── DB Events ────────────────────────────────────────────────────────────────
window.sqlBrowser.onDbOpened(function (data) {
  State.dbName = data.name; State.currentTable = null; State.currentPage = 1;
  el.sidebarDbName.textContent = data.name;
  el.breadcrumbDb.textContent = data.name;
  window.sqlBrowser.getDbInfo().then(function (info) {
    if (!info.error) {
      const kb = (info.size / 1024).toFixed(1);
      el.sidebarDbMeta.innerHTML = '<span class="db-status-dot"></span>' + info.tableCount + ' tables · ' + kb + ' KB';
    }
  });
  renderTableList(data.tables);
  showApp(); showView('empty');
  showToast('Opened ' + data.name, 'success');
});

window.sqlBrowser.onDbClosed(function () {
  State.currentTable = null; State.dbName = null;
  el.sidebarDbName.textContent = 'No database open';
  el.sidebarDbMeta.innerHTML = '';
  el.tableList.innerHTML = '<li class="table-list-empty">Open a database to view tables</li>';
  el.breadcrumbDb.textContent = '';
  el.breadcrumbSep.style.display = 'none';
  el.breadcrumbTable.textContent = '';
  showWelcome(); showToast('Database closed', 'info');
});

window.sqlBrowser.onDbError(function (msg) { showToast('Error: ' + msg, 'error'); });
window.sqlBrowser.onShowAbout(function () { el.aboutModal.style.display = 'flex'; });

window.sqlBrowser.onDbFileChanged(async function () {
  showToast('Database written to by external app — reloading data', 'info');
  if (State.currentTable) {
    await loadTableData();
  }
});

// ─── Table List ───────────────────────────────────────────────────────────────
function renderTableList(tables) {
  el.tableList.innerHTML = '';
  if (!tables || !tables.length) {
    el.tableList.innerHTML = '<li class="table-list-empty">No tables found</li>';
    return;
  }
  tables.forEach(function (t) {
    const li = document.createElement('li');
    li.className = 'table-item'; li.dataset.table = t.name;
    li.innerHTML =
      '<span class="table-item-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></span>' +
      '<span class="table-item-name">' + esc(t.name) + '</span>' +
      '<span class="table-item-count">' + t.rowCount.toLocaleString() + '</span>';
    el.tableList.appendChild(li);
  });
}

el.tableList.addEventListener('click', function (e) {
  const item = e.target.closest('.table-item[data-table]');
  if (item) selectTable(item.dataset.table);
});

el.btnRefreshTables.addEventListener('click', async function () {
  if (!State.dbName) return;
  const btn = el.btnRefreshTables;
  btn.classList.add('spinning');
  const result = await window.sqlBrowser.getTables();
  setTimeout(function () { btn.classList.remove('spinning'); }, 650);
  if (result && result.tables) {
    renderTableList(result.tables);
    showToast('Tables refreshed', 'info');
  }
});

el.tableSearch.addEventListener('input', function () {
  const q = el.tableSearch.value.trim().toLowerCase();
  document.querySelectorAll('.table-item').forEach(function (li) {
    li.style.display = li.dataset.table.toLowerCase().includes(q) ? '' : 'none';
  });
});

// ─── Select Table ─────────────────────────────────────────────────────────────
async function selectTable(tableName) {
  console.log('[App] selectTable:', tableName);
  State.currentTable = tableName; State.currentPage = 1;
  State.sortCol = null; State.sortDir = 'asc';
  State.searchQuery = ''; el.dataSearch.value = '';

  document.querySelectorAll('.table-item').forEach(function (li) {
    li.classList.toggle('active', li.dataset.table === tableName);
  });
  el.breadcrumbSep.style.display = 'inline';
  el.breadcrumbTable.textContent = tableName;

  showView('data');
  await loadTableData();
}

// ─── Load Table Data ──────────────────────────────────────────────────────────
async function loadTableData() {
  if (!State.currentTable) return;
  el.tableLoading.style.display = 'flex';

  const result = await window.sqlBrowser.getTableData({
    table: State.currentTable, page: State.currentPage, pageSize: State.pageSize,
    sortCol: State.sortCol, sortDir: State.sortDir, search: State.searchQuery,
  });

  el.tableLoading.style.display = 'none';
  console.log('[App] getTableData result:', result);

  if (result.error) { showToast(result.error, 'error'); return; }

  State.columns = result.columns;
  State.rows = result.rows;
  State.totalRows = result.total;

  renderTableStats(result.total, result.page, result.pageSize);
  renderPagination(result.total, result.page, result.pageSize);

  if (State.viewMode === 'table') {
    renderTableHeader(result.columns);
    renderTableBody(result.rows, result.columns);
  } else {
    renderDocumentView(result.rows, result.columns);
  }
}

// ─── Table View ───────────────────────────────────────────────────────────────
function renderTableHeader(columns) {
  el.dataThead.innerHTML = '';
  const tr = document.createElement('tr');
  const rowNum = document.createElement('th');
  rowNum.style.cssText = 'width:40px;text-align:center';
  rowNum.textContent = '#'; tr.appendChild(rowNum);
  columns.forEach(function (c) {
    const th = document.createElement('th');
    th.dataset.col = c.name;
    const isSorted = State.sortCol === c.name;
    if (isSorted) th.className = 'sort-' + State.sortDir;
    const arrow = isSorted ? (State.sortDir === 'asc' ? '↑' : '↓') : '↕';
    th.innerHTML = '<div class="th-content">' + esc(c.name) + ' <span class="sort-icon">' + arrow + '</span></div>';
    tr.appendChild(th);
  });
  el.dataThead.appendChild(tr);
}

el.dataThead.addEventListener('click', async function (e) {
  const th = e.target.closest('th[data-col]');
  if (!th) return;
  const col = th.dataset.col;
  if (State.sortCol === col) State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
  else { State.sortCol = col; State.sortDir = 'asc'; }
  State.currentPage = 1;
  await loadTableData();
});

function renderTableBody(rows, columns) {
  el.dataTbody.innerHTML = '';
  if (!rows || !rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = columns.length + 1;
    td.style.cssText = 'text-align:center;padding:48px;color:var(--text-muted);font-style:italic';
    td.textContent = 'No data found'; tr.appendChild(td); el.dataTbody.appendChild(tr); return;
  }
  const offset = (State.currentPage - 1) * State.pageSize;
  rows.forEach(function (row, i) {
    const tr = document.createElement('tr');
    tr.title = 'Click to edit this row';
    const numTd = document.createElement('td');
    numTd.style.cssText = 'text-align:center;color:var(--text-muted);font-size:11px;user-select:none';
    numTd.textContent = offset + i + 1; tr.appendChild(numTd);
    columns.forEach(function (c, ci) {
      const td = document.createElement('td');
      const val = row[c.name];
      td.title = String(val !== null && val !== undefined ? val : '');
      td.innerHTML = formatTableCell(val);
      // Add edit affordance on last column
      if (ci === columns.length - 1) {
        const editBtn = document.createElement('button');
        editBtn.className = 'row-edit-btn';
        editBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit';
        editBtn.addEventListener('click', function (e) { e.stopPropagation(); openEditModal(row, i); });
        td.appendChild(editBtn);
      }
      tr.appendChild(td);
    });
    tr.addEventListener('click', function () { openEditModal(row, i); });
    el.dataTbody.appendChild(tr);
  });
}

// ─── Document View ────────────────────────────────────────────────────────────
function renderDocumentView(rows, columns) {
  el.documentWrapper.innerHTML = '';
  if (!rows || !rows.length) {
    el.documentWrapper.innerHTML = '<div style="padding:48px;color:var(--text-muted);font-style:italic;text-align:center">No documents found</div>';
    return;
  }
  const offset = (State.currentPage - 1) * State.pageSize;

  rows.forEach(function (row, i) {
    const card = document.createElement('div');
    card.className = 'doc-card';
    card.style.animationDelay = Math.min(i * 0.03, 0.3) + 's';

    columns.forEach(function (c) {
      card.appendChild(buildFieldNode(c.name, row[c.name]));
    });

    el.documentWrapper.appendChild(card);
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function renderTableStats(total, page, pageSize) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  el.tableStats.textContent = 'Showing ' + start.toLocaleString() + '–' + end.toLocaleString() + ' of ' + total.toLocaleString() + ' rows' + (State.searchQuery ? ' · "' + State.searchQuery + '"' : '');
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  el.pagination.innerHTML = '';

  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:8px';
  const info = document.createElement('span'); info.className = 'pagination-info'; info.textContent = 'Page ' + page + ' of ' + totalPages; left.appendChild(info);
  const sel = document.createElement('select'); sel.className = 'page-size-select';
  [25, 50, 100, 250].forEach(function (n) { const o = document.createElement('option'); o.value = n; o.textContent = n + '/page'; if (n === pageSize) o.selected = true; sel.appendChild(o); });
  sel.addEventListener('change', async function () { State.pageSize = parseInt(this.value); State.currentPage = 1; await loadTableData(); });
  left.appendChild(sel); el.pagination.appendChild(left);

  const ctrl = document.createElement('div'); ctrl.className = 'pagination-controls';
  function mkBtn(label, pg, disabled) {
    const b = document.createElement('button'); b.className = 'page-btn' + (pg === page ? ' active' : '');
    b.textContent = label; b.disabled = disabled;
    b.addEventListener('click', async function () { if (pg < 1 || pg > totalPages || pg === State.currentPage) return; State.currentPage = pg; await loadTableData(); });
    return b;
  }
  ctrl.appendChild(mkBtn('«', 1, page === 1)); ctrl.appendChild(mkBtn('‹', page - 1, page === 1));
  getPagesToShow(page, totalPages).forEach(function (p) {
    if (p === '…') { const s = document.createElement('span'); s.style.cssText = 'padding:0 5px;color:var(--text-muted)'; s.textContent = '…'; ctrl.appendChild(s); }
    else ctrl.appendChild(mkBtn(p, p, false));
  });
  ctrl.appendChild(mkBtn('›', page + 1, page === totalPages)); ctrl.appendChild(mkBtn('»', totalPages, page === totalPages));
  el.pagination.appendChild(ctrl);
}
function getPagesToShow(c, t) {
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  if (c <= 4) return [1, 2, 3, 4, 5, '…', t];
  if (c >= t - 3) return [1, '…', t - 4, t - 3, t - 2, t - 1, t];
  return [1, '…', c - 1, c, c + 1, '…', t];
}

// ─── Search ───────────────────────────────────────────────────────────────────
var searchDebounce;
el.dataSearch.addEventListener('input', function () {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async function () { State.searchQuery = el.dataSearch.value.trim(); State.currentPage = 1; await loadTableData(); }, 350);
});

// ─── Refresh ──────────────────────────────────────────────────────────────────
el.btnRefresh.addEventListener('click', async function () { await loadTableData(); showToast('Refreshed', 'info'); });

// ─── Schema View ──────────────────────────────────────────────────────────────
el.btnSchema.addEventListener('click', async function () {
  if (!State.currentTable) return;
  const schema = await window.sqlBrowser.getTableSchema(State.currentTable);
  if (schema.error) { showToast(schema.error, 'error'); return; }
  el.schemaTitle.textContent = State.currentTable;

  if (schema.columns && schema.columns.length > 0) {
    el.schemaColChip.style.display = 'inline-flex';
    el.schemaColCount.textContent = schema.columns.length;
  } else {
    el.schemaColChip.style.display = 'none';
  }

  if (schema.indexes && schema.indexes.length > 0) {
    el.schemaIdxChip.style.display = 'inline-flex';
    el.schemaIdxCount.textContent = schema.indexes.length;
  } else {
    el.schemaIdxChip.style.display = 'none';
  }

  let html = '<div><div class="schema-section-title">Columns (' + schema.columns.length + ')</div>';
  html += '<table class="schema-table"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Nullable</th><th>Default</th><th>Key</th></tr></thead><tbody>';
  schema.columns.forEach(function (c) {
    html += '<tr><td style="color:var(--text-muted)">' + (c.cid + 1) + '</td><td style="font-weight:600">' + esc(c.name) + '</td>' +
      '<td><span class="schema-type-badge">' + esc(c.type || 'ANY') + '</span></td>' +
      '<td>' + (c.notnull ? '<span style="color:var(--rose)">NOT NULL</span>' : '<span style="color:var(--text-muted)">NULL</span>') + '</td>' +
      '<td style="color:var(--text-muted);font-family:monospace">' + (c.dflt_value !== null ? esc(String(c.dflt_value)) : '—') + '</td>' +
      '<td>' + (c.pk ? '<span class="schema-pk">PK</span>' : '') + '</td></tr>';
  });
  html += '</tbody></table></div>';
  if (schema.indexes && schema.indexes.length) {
    html += '<div><div class="schema-section-title">Indexes (' + schema.indexes.length + ')</div><table class="schema-table"><thead><tr><th>Name</th><th>Unique</th></tr></thead><tbody>';
    schema.indexes.forEach(function (idx) { html += '<tr><td>' + esc(idx.name) + '</td><td>' + (idx.unique ? '<span style="color:var(--emerald)">✓ Unique</span>' : '—') + '</td></tr>'; });
    html += '</tbody></table></div>';
  }
  html += '<div><div class="schema-section-title">CREATE Statement</div><pre class="schema-sql">' + esc(schema.createSql || '') + '</pre></div>';
  el.schemaBody.innerHTML = html;
  el.schemaBody.innerHTML = html;
  showView('schema');
});

function closeSchemaView() { if (State.currentTable) showView('data'); else showView('empty'); }
if (el.btnCloseSchema) el.btnCloseSchema.addEventListener('click', closeSchemaView);
if (el.btnCloseSchemaTop) el.btnCloseSchemaTop.addEventListener('click', closeSchemaView);

// ─── Export CSV ───────────────────────────────────────────────────────────────
function buildCsv(headers, rows) {
  function e(v) { if (v === null || v === undefined) return ''; const s = String(v); if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'; return s; }
  const lines = [headers.map(e).join(',')];
  rows.forEach(function (r) { lines.push(headers.map(function (h) { return e(r[h]); }).join(',')); });
  return lines.join('\r\n');
}
el.btnExport.addEventListener('click', async function () {
  if (!State.currentTable) return;
  const all = await window.sqlBrowser.getTableData({ table: State.currentTable, page: 1, pageSize: 999999, sortCol: State.sortCol, sortDir: State.sortDir, search: State.searchQuery });
  if (all.error) { showToast(all.error, 'error'); return; }
  const csv = buildCsv(all.columns.map(function (c) { return c.name; }), all.rows);
  const result = await window.sqlBrowser.exportCsv({ data: csv, filename: State.currentTable + '.csv' });
  if (result.success) showToast('Exported to CSV!', 'success');
  else if (!result.canceled) showToast(result.error, 'error');
});

// ─── SQL Query Editor ─────────────────────────────────────────────────────────
el.btnQueryEditor.addEventListener('click', openQueryEditor);
el.btnOpenEditorEmpty.addEventListener('click', openQueryEditor);
function openQueryEditor() { showView('query'); setTimeout(function () { if (editor) editor.refresh(); }, 100); }
el.btnCloseQuery.addEventListener('click', function () { if (State.currentTable) showView('data'); else showView('empty'); });

async function runQuery() {
  if (!editor) return;
  const sql = editor.getSelection() || editor.getValue();
  if (!sql.trim()) return;
  el.queryResultsBody.innerHTML = '<div class="results-empty"><div class="spinner" style="width:22px;height:22px"></div></div>';
  el.btnExportQuery.style.display = 'none'; el.resultsTitle.textContent = 'Running…';
  const result = await window.sqlBrowser.runQuery(sql.trim());
  if (result.error) {
    el.resultsTitle.textContent = 'Error';
    el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card error"><div class="results-card-icon">⚠️</div><h3>' + esc(result.error) + '</h3></div></div>';
    return;
  }
  if (result.type === 'write') {
    el.resultsTitle.textContent = 'Done (' + result.elapsed + 'ms)';
    el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card success"><div class="results-card-icon">✅</div><h3>' + result.changes + ' row' + (result.changes !== 1 ? 's' : '') + ' affected</h3><p>' + result.elapsed + 'ms</p></div></div>';
    window.sqlBrowser.getTables().then(function (r) { if (r.tables) renderTableList(r.tables); });
    return;
  }
  State.queryResults = result;
  el.resultsTitle.textContent = result.rowCount.toLocaleString() + ' row' + (result.rowCount !== 1 ? 's' : '') + ' · ' + result.elapsed + 'ms';
  el.btnExportQuery.style.display = result.rowCount > 0 ? 'inline-flex' : 'none';
  if (!result.rowCount) { el.queryResultsBody.innerHTML = '<div class="results-message"><div class="results-card success"><div class="results-card-icon">🔍</div><h3>No results</h3><p>0 rows in ' + result.elapsed + 'ms</p></div></div>'; return; }
  const cols = result.columns;
  let t = '<table class="query-result-table"><thead><tr><th style="width:40px;text-align:center">#</th>';
  cols.forEach(function (c) { t += '<th>' + esc(c.name) + '</th>'; });
  t += '</tr></thead><tbody>';
  result.rows.forEach(function (row, i) {
    t += '<tr><td style="text-align:center;color:var(--text-muted);font-size:11px">' + (i + 1) + '</td>';
    cols.forEach(function (c) { t += '<td>' + formatTableCell(row[c.name]) + '</td>'; });
    t += '</tr>';
  });
  t += '</tbody></table>';
  el.queryResultsBody.innerHTML = t;
}
el.btnRunQuery.addEventListener('click', runQuery);
el.btnExportQuery.addEventListener('click', async function () {
  if (!State.queryResults) return;
  const cols = State.queryResults.columns.map(function (c) { return c.name; });
  const csv = buildCsv(cols, State.queryResults.rows);
  const result = await window.sqlBrowser.exportCsv({ data: csv, filename: 'query_result.csv' });
  if (result.success) showToast('Exported!', 'success');
  else if (!result.canceled) showToast(result.error, 'error');
});

// ─── Open / Close ─────────────────────────────────────────────────────────────
el.btnOpenWelcome.addEventListener('click', function () { window.sqlBrowser.openFileDialog(); });
el.btnOpenSidebar.addEventListener('click', function () { window.sqlBrowser.openFileDialog(); });
el.btnCloseDb.addEventListener('click', function () { window.sqlBrowser.closeDatabase(); });

// ─── Drag & Drop ─────────────────────────────────────────────────────────────
el.dropZone.addEventListener('dragover', function (e) { e.preventDefault(); el.dropZone.classList.add('drag-over'); });
el.dropZone.addEventListener('dragleave', function () { el.dropZone.classList.remove('drag-over'); });
el.dropZone.addEventListener('drop', function (e) { e.preventDefault(); el.dropZone.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f && f.path) window.sqlBrowser.openDatabase(f.path); });
document.addEventListener('dragover', function (e) { e.preventDefault(); });
document.addEventListener('drop', function (e) { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.path) window.sqlBrowser.openDatabase(f.path); });

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function guessPkColumn(columns) {
  // Try 'id', then first column with 'id' in name, then first column
  const lower = columns.map(c => c.name.toLowerCase());
  if (lower.includes('id')) return columns[lower.indexOf('id')].name;
  const idCol = lower.findIndex(n => n.endsWith('id') || n.startsWith('id'));
  if (idCol !== -1) return columns[idCol].name;
  return columns.length ? columns[0].name : null;
}

function openEditModal(row, rowIndex) {
  State.editRow = row;
  State.editRowIndex = rowIndex;
  State.pkColumn = guessPkColumn(State.columns);
  State.deleteConfirming = false;
  el.btnDeleteRow.classList.remove('confirming');
  el.btnDeleteRow.textContent = '';
  el.btnDeleteRow.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete Row';

  const pkVal = State.pkColumn ? row[State.pkColumn] : '?';
  el.editModalTitle.textContent = 'Edit Row' + (State.pkColumn ? ' — ' + State.pkColumn + ': ' + pkVal : '');

  // Build form fields
  el.editModalBody.innerHTML = '';
  State.columns.forEach(function (c) {
    const val = row[c.name];
    const isNull = val === null || val === undefined;
    const row_ = document.createElement('div');
    row_.className = 'edit-field-row';
    const lbl = document.createElement('label');
    lbl.className = 'edit-field-label';
    lbl.htmlFor = 'edit-field-' + c.name;
    lbl.innerHTML = esc(c.name) + (isNull ? '<span class="edit-field-null-tag">NULL</span>' : '');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'edit-field-input' + (isNull ? ' is-null' : '');
    inp.id = 'edit-field-' + c.name;
    inp.dataset.col = c.name;
    inp.value = isNull ? '' : String(val);
    inp.placeholder = isNull ? 'NULL' : '';
    inp.addEventListener('input', function () {
      lbl.innerHTML = esc(c.name); // clear null badge on edit
      inp.classList.remove('is-null');
    });
    row_.appendChild(lbl);
    row_.appendChild(inp);
    el.editModalBody.appendChild(row_);
  });

  el.editModal.style.display = 'flex';
}

function closeEditModal() {
  el.editModal.style.display = 'none';
  State.editRow = null;
  State.editRowIndex = null;
  State.deleteConfirming = false;
}

el.btnCloseEditModal.addEventListener('click', closeEditModal);
el.btnCancelEdit.addEventListener('click', closeEditModal);
el.editModal.addEventListener('click', function (e) { if (e.target === el.editModal) closeEditModal(); });

el.btnUpdateRow.addEventListener('click', async function () {
  if (!State.editRow || !State.pkColumn) {
    showToast('Cannot identify primary key for update', 'error');
    return;
  }
  // Collect edited values from inputs
  const updates = {};
  el.editModalBody.querySelectorAll('.edit-field-input').forEach(function (inp) {
    const col = inp.dataset.col;
    const originalVal = State.editRow[col];
    const isNullOriginal = originalVal === null || originalVal === undefined;
    const inputVal = inp.value;
    // If input is empty and was originally NULL, keep NULL, else use string
    if (inputVal === '' && isNullOriginal && inp.classList.contains('is-null')) {
      updates[col] = null;
    } else {
      updates[col] = inputVal;
    }
  });

  const pkVal = State.editRow[State.pkColumn];
  const result = await window.sqlBrowser.updateRow({
    table: State.currentTable,
    pkColumn: State.pkColumn,
    pkValue: pkVal,
    updates,
  });

  if (result && result.error) {
    showToast('Update failed: ' + result.error, 'error');
    return;
  }
  showToast('Row updated successfully', 'success');
  closeEditModal();
  await loadTableData();
});

el.btnDeleteRow.addEventListener('click', async function () {
  if (!State.deleteConfirming) {
    // First click — enter confirm state
    State.deleteConfirming = true;
    el.btnDeleteRow.classList.add('confirming');
    el.btnDeleteRow.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Confirm Delete?';
    setTimeout(function () {
      // Auto-revert if user doesn't confirm
      if (State.deleteConfirming) {
        State.deleteConfirming = false;
        el.btnDeleteRow.classList.remove('confirming');
        el.btnDeleteRow.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> Delete Row';
      }
    }, 3000);
    return;
  }
  // Second click — actually delete
  if (!State.editRow || !State.pkColumn) {
    showToast('Cannot identify primary key for delete', 'error');
    return;
  }
  const pkVal = State.editRow[State.pkColumn];
  const result = await window.sqlBrowser.deleteRow({
    table: State.currentTable,
    pkColumn: State.pkColumn,
    pkValue: pkVal,
  });
  if (result && result.error) {
    showToast('Delete failed: ' + result.error, 'error');
    return;
  }
  showToast('Row deleted', 'info');
  closeEditModal();
  await loadTableData();
});

// ─── About ────────────────────────────────────────────────────────────────────
el.btnCloseAbout.addEventListener('click', function () { el.aboutModal.style.display = 'none'; });
el.aboutModal.addEventListener('click', function (e) { if (e.target === el.aboutModal) el.aboutModal.style.display = 'none'; });

// ─── Init ─────────────────────────────────────────────────────────────────────
showWelcome();
