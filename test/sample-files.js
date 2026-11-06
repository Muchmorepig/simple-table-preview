// Local, opt-in fixture generation; source files are only read.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { parse } = require('../src/parse');
const { selectRows } = require('../src/table');
const source = process.argv[2];
if (!source) throw new Error('Usage: node test/sample-files.js /path/to/marker_wilcoxon_C1C2');
const target = path.join(__dirname, 'fixtures');
fs.mkdirSync(target, { recursive: true });
for (const extension of ['csv', 'xlsx']) {
  const input = fs.readFileSync(`${source}.${extension}`);
  const workbook = XLSX.read(input, { type: 'buffer', raw: extension === 'csv', sheetRows: 501 });
  const output = XLSX.utils.book_new();
  for (const name of workbook.SheetNames.slice(0, 3)) {
    const sheet = workbook.Sheets[name];
    delete sheet['!fullref'];
    XLSX.utils.book_append_sheet(output, sheet, name);
  }
  const file = path.join(target, `marker_sample.${extension}`);
  XLSX.writeFile(output, file, { bookType: extension });
  const parsed = parse(fs.readFileSync(file), extension === 'csv');
  for (const sheet of parsed.sheets) {
  const pColumn = sheet.rows[0].indexOf('pvals');
  const geneColumn = sheet.rows[0].indexOf('names');
  assert.ok(pColumn >= 0 && geneColumn >= 0);
  assert.ok(sheet.rows.length > 1 && sheet.rows.length <= 501);
  assert.equal(sheet.columns, extension === 'csv' ? 7 : 6);
  const indices = selectRows(sheet.rows, true, [], { column: pColumn, direction: 1 });
  for (let i = 1; i < indices.length; i++) assert.ok(Number(sheet.rows[indices[i - 1]][pColumn]) <= Number(sheet.rows[indices[i]][pColumn]));
  const filters = []; filters[geneColumn] = 'Ceric.';
  assert.equal(selectRows(sheet.rows, true, filters, null).length, sheet.rows.length - 1);
  console.log(`${extension}/${sheet.name}: ${sheet.rows.length - 1} rows, ${sheet.columns} columns; scientific sort and gene filter passed`);
  }
}
