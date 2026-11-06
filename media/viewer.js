'use strict';
const vscode = acquireVsCodeApi();
const $ = id => document.getElementById(id);
const t = TableI18n.createTranslator(document.documentElement.lang);
let data, current, filters = [], sort = null, page = 0, indices = [], loading = true;
const pageSize = 200;
const columnWidths = new WeakMap();
function resizeHandle(column, index, widths) {
  const handle = document.createElement('span');
  handle.className = 'column-resizer';
  handle.tabIndex = 0;
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', t('Resize column {column}', { column: columnName(index) }));
  handle.setAttribute('aria-valuemin', '80');
  handle.setAttribute('aria-valuemax', '1600');
  handle.setAttribute('aria-valuenow', widths[index]);
  handle.title = t('Drag to resize; focus and use Left/Right arrow keys');
  const setWidth = width => {
    widths[index] = Math.max(80, Math.min(1600, width));
    column.style.width = `${widths[index]}px`;
    $('table').style.width = `${64 + widths.reduce((sum, value) => sum + value, 0)}px`;
    handle.setAttribute('aria-valuenow', widths[index]);
  };
  let drag;
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = { x: event.clientX, width: widths[index], id: event.pointerId };
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing');
  });
  handle.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) setWidth(drag.width + event.clientX - drag.x);
  });
  const endDrag = () => { drag = undefined; document.body.classList.remove('resizing'); };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
  handle.addEventListener('lostpointercapture', endDrag);
  handle.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setWidth(widths[index] + (event.key === 'ArrowLeft' ? -10 : 10));
  });
  return handle;
}
function columnName(index) {
  let name = '';
  for (index++; index; index = Math.floor((index - 1) / 26)) name = String.fromCharCode(65 + (index - 1) % 26) + name;
  return name;
}
function cell(tag, text) {
  const node = document.createElement(tag);
  node.textContent = String(text ?? '');
  return node;
}
function update() {
  if (!current || loading) return;
  let invalid = false;
  $('head').querySelectorAll('input').forEach((input, column) => {
    try {
      TableData.compileFilter(filters[column]);
      input.removeAttribute('aria-invalid');
      input.setCustomValidity('');
    } catch (error) {
      input.setAttribute('aria-invalid', 'true');
      input.setCustomValidity(t(error.message));
      if (!invalid) $('status').textContent = t('Invalid filter in column {column}: {error}. Showing the last valid results.', { column: columnName(column), error: t(error.message) });
      invalid = true;
    }
  });
  if (invalid) return;
  indices = TableData.selectRows(current.rows, $('header').checked, filters, sort);
  page = Math.min(page, Math.max(0, Math.ceil(indices.length / pageSize) - 1));
  $('body').replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const row of indices.slice(page * pageSize, (page + 1) * pageSize)) {
    const tr = document.createElement('tr');
    tr.append(cell('th', row + 1));
    for (let c = 0; c < current.columns; c++) {
      const td = cell('td', current.rows[row][c]);
      td.title = td.textContent;
      tr.append(td);
    }
    fragment.append(tr);
  }
  $('body').append(fragment);
  $('status').textContent = t('{sheet} · {columns} columns · {matched} / {total} rows match', { sheet: current.name, columns: current.columns, matched: indices.length, total: Math.max(0, current.rows.length - ($('header').checked ? 1 : 0)) });
  $('page').textContent = t('Page {page} / {pages}', { page: indices.length ? page + 1 : 0, pages: Math.ceil(indices.length / pageSize) });
  $('previous').disabled = page === 0;
  $('next').disabled = (page + 1) * pageSize >= indices.length;
  $('head').querySelectorAll('th[data-column]').forEach(th => {
    const c = Number(th.dataset.column);
    th.setAttribute('aria-sort', sort?.column === c ? (sort.direction === 1 ? 'ascending' : 'descending') : 'none');
    th.querySelector('button').textContent = `${$('header').checked ? current.rows[0]?.[c] || columnName(c) : columnName(c)}${sort?.column === c ? (sort.direction === 1 ? ' ↑' : ' ↓') : ''}`;
  });
}
function build() {
  filters = []; sort = null; page = 0;
  current = data.sheets[Number($('sheet').value)];
  $('head').replaceChildren();
  $('columns').replaceChildren();
  if (!current) { $('status').textContent = t('No worksheets to display.'); return; }
  if (!columnWidths.has(current)) columnWidths.set(current, Array(current.columns).fill(180));
  const widths = columnWidths.get(current);
  const rowColumn = document.createElement('col');
  rowColumn.style.width = '64px';
  $('columns').append(rowColumn);
  $('table').style.width = `${64 + widths.reduce((sum, width) => sum + width, 0)}px`;
  const titles = document.createElement('tr');
  const inputs = document.createElement('tr');
  titles.append(cell('th', t('Row')));
  inputs.append(cell('th', t('Filter')));
  for (let c = 0; c < current.columns; c++) {
    const th = document.createElement('th');
    th.scope = 'col'; th.dataset.column = c;
    const button = document.createElement('button');
    button.title = t('Click to cycle: ascending, descending, original order');
    button.addEventListener('click', () => {
      sort = sort?.column === c ? (sort.direction === 1 ? { column: c, direction: -1 } : null) : { column: c, direction: 1 };
      page = 0; update();
    });
    const column = document.createElement('col');
    column.style.width = `${widths[c]}px`;
    $('columns').append(column);
    th.append(button, resizeHandle(column, c, widths)); titles.append(th);
    const filterCell = document.createElement('th');
    const input = document.createElement('input');
    input.type = 'search'; input.placeholder = t('Text /regex/ >=number');
    input.title = t('Text contains; regex: /^Ceric\\./i; numbers: <0.05, >=1e-5, =0, !=0');
    input.setAttribute('aria-label', t('Filter column {column}', { column: columnName(c) }));
    input.addEventListener('input', () => { filters[c] = input.value; page = 0; update(); });
    filterCell.append(input); inputs.append(filterCell);
  }
  $('head').append(titles, inputs);
  $('warning').hidden = !current.truncated;
  $('warning').textContent = t('Partial preview: up to 50,000 rows and 200 columns per sheet, and 200,000 cells per file. Sorting and filtering apply only to loaded data.');
  update();
}
function load() {
  loading = true;
  $('status').textContent = t('Loading…');
  $('head').replaceChildren(); $('body').replaceChildren();
  $('warning').hidden = true;
  $('page').textContent = '';
  for (const id of ['sheet', 'header', 'reset', 'previous', 'next']) $(id).disabled = true;
  vscode.postMessage({ type: 'load', encoding: $('encoding').value });
}
window.addEventListener('message', event => {
  loading = false;
  if (event.data.error) { $('status').textContent = event.data.error; return; }
  data = event.data.data;
  $('sheet').replaceChildren(...data.sheets.map((sheet, index) => {
    const option = cell('option', sheet.name); option.value = index; return option;
  }));
  $('header').checked = data.csv;
  $('encodingLabel').hidden = !data.csv;
  for (const id of ['sheet', 'header', 'reset']) $(id).disabled = false;
  build();
});
$('sheet').addEventListener('change', build);
$('header').addEventListener('change', build);
$('reset').addEventListener('click', build);
$('reload').addEventListener('click', load);
$('encoding').addEventListener('change', load);
$('previous').addEventListener('click', () => { page--; update(); $('grid').scrollTop = 0; });
$('next').addEventListener('click', () => { page++; update(); $('grid').scrollTop = 0; });
load();
