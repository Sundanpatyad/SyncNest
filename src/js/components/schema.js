// ─── Schema View ──────────────────────────────────────────────────────────────
el.btnSchema.addEventListener('click', async function () {
  if (!State.currentTable) return;
  const schema = await window.sqlBrowser.getTableSchema(State.currentTable);
  if (schema.error) { window.showToast(schema.error, 'error'); return; }
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
  
  window.showView('schema');
});

window.closeSchemaView = function() { 
  if (State.currentTable) window.showView('data'); 
  else window.showView('empty'); 
};
if (el.btnCloseSchema) el.btnCloseSchema.addEventListener('click', window.closeSchemaView);
if (el.btnCloseSchemaTop) el.btnCloseSchemaTop.addEventListener('click', window.closeSchemaView);
