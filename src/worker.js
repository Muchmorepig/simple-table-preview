const { parentPort, workerData } = require('node:worker_threads');
const { parse } = require('./parse');
const { createTranslator } = require('./i18n');
const t = createTranslator(workerData.language);
try {
  parentPort.postMessage({ data: parse(workerData.bytes, workerData.csv, workerData.encoding, workerData.separator) });
} catch (error) {
  parentPort.postMessage({ error: t('Cannot read the file: {error}. For CSV/TSV, try a different encoding. For XLSX, check that the file is not encrypted or damaged.', { error: error.message }) });
}
