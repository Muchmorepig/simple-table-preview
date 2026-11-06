const { test } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { parse } = require('../src/parse');
const { compare, selectRows, compileFilter } = require('../src/table');

test('regex filters support anchors, flags, escaped slashes and combined thresholds', () => {
  const rows = [['gene', 'p'], ['Ceric.09G1', '2e-100'], ['ceric.09G2', 0.1], ['Ceric.10G1', 0.01]];
  assert.deepEqual(selectRows(rows, true, ['/^Ceric\\.09/'], null), [1]);
  assert.deepEqual(selectRows(rows, true, ['/^ceric\\.09/i', '<0.05'], null), [1]);
  assert.equal(compileFilter('/a\\/b/')('a/b'), true);
  assert.equal(compileFilter('/^second/m')('first\nsecond'), true);
  for (const filter of ['/unfinished', '/[/', '/x/g', '/x/ii']) assert.throws(() => compileFilter(filter));
});

test('numeric comparisons exclude blanks, nonnumeric and nonfinite values', () => {
  const values = [-2, 0, '0', ' 1e-100 ', 0.05, '2', '', ' ', null, 'NA', false, Infinity, '0xff'];
  const matching = filter => values.filter(compileFilter(filter));
  assert.deepEqual(matching('<0'), [-2]);
  assert.deepEqual(matching('<=0'), [-2, 0, '0']);
  assert.deepEqual(matching('>0.05'), ['2']);
  assert.deepEqual(matching('>= 0.05'), [0.05, '2']);
  assert.deepEqual(matching('=0'), [0, '0']);
  assert.deepEqual(matching('==0'), [0, '0']);
  assert.deepEqual(matching('!=0'), [-2, ' 1e-100 ', 0.05, '2']);
  assert.deepEqual(matching('<=1e-99'), [-2, 0, '0', ' 1e-100 ']);
  for (const filter of ['>', '>=oops', '<Infinity', '=1e999']) assert.throws(() => compileFilter(filter));
});

test('numeric scientific notation, combined filters, stable order and no mutation', () => {
  const rows = [['gene', 'p'], ['g2', '1e-20'], ['g1', '2e-100'], ['g2', '1e-20'], ['g3', '']];
  const original = JSON.stringify(rows);
  assert.deepEqual(selectRows(rows, true, [], { column: 1, direction: 1 }), [2, 1, 3, 4]);
  assert.deepEqual(selectRows(rows, true, ['G2', '20'], null), [1, 3]);
  assert.deepEqual(selectRows(rows, false, [], null), [0, 1, 2, 3, 4]);
  assert.equal(compare('10', '2'), 8);
  assert.equal(JSON.stringify(rows), original);
});
test('CSV preserves strings, BOM, quotes, embedded newlines, Chinese and formulas as text', () => {
  const text = '\ufeffname,value\r\n"中文,基因","line1\nline2"\r\n001,=1+1\r\n';
  const result = parse(Buffer.from(text), true);
  assert.deepEqual(result.sheets[0].rows, [['name', 'value'], ['中文,基因', 'line1\nline2'], ['001', '=1+1']]);
  assert.equal(result.sheets[0].truncated, false);
  assert.equal(parse(Buffer.from('列\t值\n甲\t1'), true).sheets[0].columns, 2);
  assert.equal(parse(Buffer.from('列,值\n甲,1', 'utf16le'), true, 'utf-16le').sheets[0].rows[1][0], '甲');
});
test('XLSX sheets, numeric values, cached formulas and empty sheets', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['gene', 'value'], ['g1', 2e-100]]);
  sheet.C2 = { t: 'n', f: '1+1', v: 2 }; sheet['!ref'] = 'A1:C2';
  XLSX.utils.book_append_sheet(workbook, sheet, '标记基因');
  XLSX.utils.book_append_sheet(workbook, {}, '空表');
  const result = parse(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), false);
  assert.equal(result.sheets[0].rows[1][1], 2e-100);
  assert.equal(result.sheets[0].rows[1][2], 2);
  assert.deepEqual(result.sheets[1].rows, []);
});
test('preview limits are explicit', () => {
  const result = parse(Buffer.from('a,b,c,d,e\n'.repeat(41000)), true);
  assert.equal(result.sheets[0].rows.length, 40000);
  assert.equal(result.sheets[0].truncated, true);
});
