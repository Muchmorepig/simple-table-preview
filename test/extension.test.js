const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

test('readonly provider loads CSV through worker and rejects oversized files', async () => {
  let provider, receive, dispose;
  let size = 20;
  const messages = [];
  const fake = {
    env: { language: 'zh-cn' },
    Uri: { joinPath: (...parts) => parts.join('/') },
    workspace: { fs: { stat: async () => ({ size }), readFile: async () => Buffer.from('gene,p\ng1,1e-100') } },
    window: { registerCustomEditorProvider: (id, value) => { provider = value; return { dispose() {} }; } }
  };
  const original = Module._load;
  Module._load = function (id, ...args) { return id === 'vscode' ? fake : original.call(this, id, ...args); };
  try {
    require('../src/extension').activate({ subscriptions: [], extensionUri: path.resolve(__dirname, '..') });
  } finally { Module._load = original; }
  const panel = {
    webview: {
      cspSource: 'vscode-resource:', asWebviewUri: uri => uri,
      onDidReceiveMessage: fn => { receive = fn; return { dispose() {} }; },
      postMessage: message => { messages.push(message); return Promise.resolve(true); }
    },
    onDidDispose: fn => { dispose = fn; }
  };
  const document = provider.openCustomDocument({ path: '/sample.csv' });
  provider.resolveCustomEditor(document, panel);
  assert.match(panel.webview.html, /default-src 'none'/);
  const footer = panel.webview.html.split('<footer>')[1].split('</footer>')[0];
  for (const id of ['sheet', 'header', 'encoding', 'reset', 'reload', 'previous', 'next']) assert.ok(footer.includes(`id="${id}"`));
  assert.ok(footer.indexOf('id="sheet"') < footer.indexOf('id="previous"'));
  assert.ok(footer.indexOf('id="next"') < footer.indexOf('id="reset"'));
  assert.ok(panel.webview.html.indexOf('<main') < panel.webview.html.indexOf('<footer>'));
  assert.equal(provider.saveCustomDocument, undefined);
  try {
    await receive({ type: 'load', encoding: 'utf-8' });
    const deadline = Date.now() + 5000;
    while (messages.length === 0 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(messages[0].data.sheets[0].rows, [['gene', 'p'], ['g1', '1e-100']]);
    size = 21 * 1024 * 1024;
    await receive({ type: 'load', encoding: 'utf-8' });
    assert.match(messages[1].error, /20 MiB/);
    await receive({ type: 'load', encoding: 'invalid' });
    assert.equal(messages.length, 2);
  } finally { dispose(); }
});
