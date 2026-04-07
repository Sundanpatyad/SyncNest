// ─── SQL Query Editor ─────────────────────────────────────────────────────────
el.btnQueryEditor.addEventListener('click', openQueryEditor);
el.btnOpenEditorEmpty.addEventListener('click', openQueryEditor);
function openQueryEditor() { window.showView('query'); setTimeout(function () { if (window.editor) window.editor.refresh(); }, 100); }
el.btnCloseQuery.addEventListener('click', function () { if (State.currentTable) window.showView('data'); else window.showView('empty'); });

window.runQuery = async function runQuery() {
  if (!window.editor) return;
  const sql = window.editor.getSelection() || window.editor.getValue();
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
    window.sqlBrowser.getTables().then(function (r) { if (r.tables) window.renderTableList(r.tables); });
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
el.btnRunQuery.addEventListener('click', window.runQuery);
el.btnExportQuery.addEventListener('click', async function () {
  if (!State.queryResults) return;
  const cols = State.queryResults.columns.map(function (c) { return c.name; });
  const csv = window.buildCsv(cols, State.queryResults.rows);
  const result = await window.sqlBrowser.exportCsv({ data: csv, filename: 'query_result.csv' });
  if (result.success) window.showToast('Exported!', 'success');
  else if (!result.canceled) window.showToast(result.error, 'error');
});
