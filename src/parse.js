const XLSX = require('xlsx');
const MAX_ROWS = 50000;
const MAX_COLUMNS = 200;
const MAX_CELLS = 200000;

function parse(bytes, csv, encoding = 'utf-8') {
  const input = csv ? new TextDecoder(encoding, { fatal: true }).decode(bytes) : bytes;
  const workbook = XLSX.read(input, { type: csv ? 'string' : 'buffer', raw: csv, sheetRows: MAX_ROWS, cellFormula: false, cellHTML: false });
  let remaining = MAX_CELLS;
  const sheets = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    if (!sheet['!ref']) return { name, rows: [], columns: 0, truncated: false };
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    const columns = Math.min(range.e.c + 1, MAX_COLUMNS);
    const count = Math.min(range.e.r + 1, MAX_ROWS, Math.floor(remaining / columns));
    const rows = [];
    for (let r = 0; r < count; r++) {
      const row = [];
      for (let c = 0; c < columns; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        row.push(cell ? (cell.t === 'n' ? cell.v : cell.w ?? cell.v ?? '') : '');
      }
      rows.push(row);
    }
    remaining -= count * columns;
    return { name, rows, columns, truncated: count < range.e.r + 1 || columns < range.e.c + 1 };
  });
  return { sheets, csv };
}
module.exports = { parse };
