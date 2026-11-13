const vscode = require('vscode');
const { Worker } = require('node:worker_threads');
const { randomBytes } = require('node:crypto');
const path = require('node:path');
const { createTranslator } = require('./i18n');

function activate(context) {
  context.subscriptions.push(vscode.window.registerCustomEditorProvider('simpleTable.preview', {
    openCustomDocument: uri => ({ uri, dispose() {} }),
    resolveCustomEditor(document, panel) {
      const language = /^zh(?:-|$)/i.test(vscode.env.language) ? 'zh-CN' : 'en';
      const t = createTranslator(language);
      const webview = panel.webview;
      const media = vscode.Uri.joinPath(context.extensionUri, 'media');
      const src = vscode.Uri.joinPath(context.extensionUri, 'src');
      webview.options = { enableScripts: true, localResourceRoots: [media, src] };
      const nonce = randomBytes(16).toString('hex');
      const resource = (dir, file) => webview.asWebviewUri(vscode.Uri.joinPath(dir, file));
      let worker, timer, version = 0, disposed = false;
      function stop() {
        clearTimeout(timer);
        if (worker) void worker.terminate();
        worker = undefined;
      }
      const subscription = webview.onDidReceiveMessage(async message => {
        if (!message || message.type !== 'load' || !['utf-8', 'gb18030', 'utf-16le'].includes(message.encoding)) return;
        const request = ++version;
        stop();
        const send = data => { if (!disposed && request === version) void webview.postMessage(data); };
        try {
          const stat = await vscode.workspace.fs.stat(document.uri);
          if (stat.size > 20 * 1024 * 1024) throw new Error(t('The file exceeds the 20 MiB preview limit. Please split it first.'));
          const bytes = await vscode.workspace.fs.readFile(document.uri);
          if (disposed || request !== version) return;
          if (bytes.length > 20 * 1024 * 1024) throw new Error(t('The file exceeds the 20 MiB preview limit. Please split it first.'));
          worker = new Worker(path.join(__dirname, 'worker.js'), {
            workerData: { bytes, csv: /\.(csv|tsv)$/i.test(document.uri.path), separator: /\.tsv$/i.test(document.uri.path) ? '\t' : undefined, encoding: message.encoding, language },
            resourceLimits: { maxOldGenerationSizeMb: 256 }
          });
          let answered = false;
          worker.once('message', result => { answered = true; clearTimeout(timer); send(result); });
          worker.once('error', error => { answered = true; clearTimeout(timer); send({ error: t('Preview failed: {error}', { error: error.message }) }); });
          worker.once('exit', code => { if (!answered && code !== 0) send({ error: t('The parser stopped. The file may be too large.') }); });
          timer = setTimeout(() => { answered = true; stop(); send({ error: t('Parsing exceeded 15 seconds. Please use a smaller file.') }); }, 15000);
        } catch (error) { send({ error: t('Preview failed: {error}', { error: error.message }) }); }
      });
      panel.onDidDispose(() => { disposed = true; version++; stop(); subscription.dispose(); });
      webview.html = `<!doctype html><html lang="${language}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${resource(media, 'viewer.css')}"></head><body>
      <p id="status" role="status" aria-live="polite">${t('Loading…')}</p><p id="warning" role="alert" hidden></p>
      <main id="grid" tabindex="0" aria-label="${t('Data table')}"><table id="table"><colgroup id="columns"></colgroup><thead id="head"></thead><tbody id="body"></tbody></table></main>
      <footer>
      <div class="toolbar" role="group" aria-label="${t('Table settings')}"><label>${t('Worksheet')} <select id="sheet"></select></label><label><input type="checkbox" id="header">${t('First row as header')}</label><label id="encodingLabel">${t('CSV/TSV encoding')} <select id="encoding"><option value="utf-8">UTF-8</option><option value="gb18030">GB18030 / GBK</option><option value="utf-16le">UTF-16 LE</option></select></label></div>
      <nav class="pagination" aria-label="${t('Pagination')}"><button id="previous">${t('Previous')}</button><span id="page"></span><button id="next">${t('Next')}</button><span>${t('200 rows per page')}</span></nav>
      <div class="actions" role="group" aria-label="${t('Table actions')}"><button id="reset">${t('Reset sort and filters')}</button><button id="reload">${t('Reload file')}</button><span class="preview-label">${t('Table Preview · Read-only')}</span></div>
      </footer>
      <script nonce="${nonce}" src="${resource(src, 'i18n.js')}"></script><script nonce="${nonce}" src="${resource(src, 'table.js')}"></script><script nonce="${nonce}" src="${resource(media, 'viewer.js')}"></script></body></html>`;
    }
  }, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }));
}
module.exports = { activate };
