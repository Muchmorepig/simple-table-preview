const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { createTranslator } = require('../src/i18n');

test('Chinese locale variants, English fallback and literal interpolation', () => {
  for (const language of ['zh', 'zh-cn', 'zh-TW', 'ZH-Hans']) assert.equal(createTranslator(language)('Next'), '下一页');
  for (const language of ['en', 'en-US', 'de', undefined]) assert.equal(createTranslator(language)('Next'), 'Next');
  assert.equal(createTranslator('zh-cn')('Resize column {column}', { column: '$&{x}' }), '调整 $&{x} 列宽度');
  assert.equal(createTranslator('zh-cn')('Unknown message'), 'Unknown message');
});

test('worker decoding failures use the selected language', async () => {
  for (const language of ['en', 'zh-cn']) {
    const result = await new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../src/worker.js'), {
        workerData: { bytes: Buffer.from([0xff]), csv: true, encoding: 'utf-8', language }
      });
      worker.once('message', resolve);
      worker.once('error', reject);
    });
    assert.match(result.error, language === 'en' ? /^Cannot read the file:/ : /^无法读取文件：/);
  }
});

test('every literal UI message and filter error has a Chinese translation', () => {
  const t = createTranslator('zh-cn');
  for (const file of ['src/extension.js', 'src/worker.js', 'src/table.js', 'media/viewer.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const match of source.matchAll(/(?:\bt\(|new Error\()('(?:\\.|[^'\\])*')/g)) {
      const message = JSON.parse('"' + match[1].slice(1, -1).replace(/"/g, '\\"') + '"');
      assert.notEqual(t(message), message, `${file}: missing translation for ${message}`);
    }
  }
});
