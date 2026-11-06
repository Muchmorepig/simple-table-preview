// Optional real-browser check: PLAYWRIGHT_MODULE=/path/to/playwright node test/browser-check.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const Module = require('node:module');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  let html, provider;
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
    const resources = ['/media/viewer.js', '/media/viewer.css', '/src/table.js', '/src/i18n.js'];
    if (!resources.includes(request.url)) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', request.url.endsWith('.css') ? 'text/css' : 'text/javascript');
    response.end(fs.readFileSync(path.join(root, request.url)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const original = Module._load;
  Module._load = function (id, ...args) {
    if (id === 'vscode') return {
      env: { language: process.env.TEST_LANGUAGE || 'en' },
      Uri: { joinPath: (...parts) => parts.join('/') },
      window: { registerCustomEditorProvider: (_, value) => { provider = value; } }
    };
    return original.call(this, id, ...args);
  };
  try { require('../src/extension').activate({ subscriptions: [], extensionUri: origin }); }
  finally { Module._load = original; }
  const webview = { cspSource: origin, asWebviewUri: value => value, onDidReceiveMessage: () => ({ dispose() {} }) };
  provider.resolveCustomEditor({ uri: { path: '/sample.csv' } }, { webview, onDidDispose() {} });
  html = webview.html;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium' });
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => { window.acquireVsCodeApi = () => ({ postMessage() {} }); });
    await page.goto(origin);
    const chinese = /^zh/i.test(process.env.TEST_LANGUAGE || 'en');
    assert.equal(await page.locator('#next').textContent(), chinese ? '下一页' : 'Next');
    assert.equal(await page.locator('html').getAttribute('lang'), chinese ? 'zh-CN' : 'en');
    await page.evaluate(() => {
      const rows = [['gene', 'p', 'note'], ...Array.from({ length: 450 }, (_, i) => [`Ceric.${i}`, i / 1000, 'long value '.repeat(30)])];
      window.dispatchEvent(new MessageEvent('message', { data: { data: { csv: true, sheets: [
        { name: 'C0', rows, columns: 3 }, { name: 'C1', rows, columns: 3 }
      ] } } }));
    });
    const widths = () => page.locator('#body tr').first().locator('td').evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
    await page.locator('#head input').first().fill('/[/');
    assert.match(await page.locator('#status').textContent(), chinese ? /正则表达式无效/ : /Invalid regular expression/);
    assert.equal(await page.locator('#body tr').count(), 200);
    await page.locator('#head input').first().fill('');
    assert.deepEqual(await widths(), [180, 180, 180]);
    const handle = page.getByRole('separator').first();
    const rect = await handle.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 120, rect.y + rect.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.deepEqual(await widths(), [300, 180, 180]);
    assert.equal(await page.locator('#head th[data-column]').first().getAttribute('aria-sort'), 'none');
    await handle.focus();
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await widths(), [290, 180, 180]);
    await page.locator('#next').click();
    assert.deepEqual(await widths(), [290, 180, 180]);
    await page.locator('#head input').first().fill('/^Ceric\\.2/');
    assert.deepEqual(await widths(), [290, 180, 180]);
    await page.locator('#reset').click();
    assert.deepEqual(await widths(), [290, 180, 180]);
    await page.locator('#sheet').selectOption('1');
    assert.deepEqual(await widths(), [180, 180, 180]);
    await page.locator('#sheet').selectOption('0');
    assert.deepEqual(await widths(), [290, 180, 180]);
    await handle.focus();
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await widths(), [80, 180, 180]);
    const headerWidth = await page.locator('#head th[data-column]').first().evaluate(th => th.getBoundingClientRect().width);
    assert.equal(headerWidth, 80);
    for (const width of [1200, 600, 380]) {
      await page.setViewportSize({ width, height: 800 });
      for (const id of ['sheet', 'header', 'encoding', 'previous', 'next', 'reset', 'reload']) {
        const box = await page.locator(`#${id}`).boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width && box.y + box.height <= 800, `${id} outside ${width}px viewport`);
      }
    }
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed (${process.env.TEST_LANGUAGE || 'en'}): localized UI/errors, drag/keyboard resize, alignment, preserved widths, toolbar at 1200/600/380px, no script/CSP errors.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
