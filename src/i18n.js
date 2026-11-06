(function (root) {
  'use strict';
  const zh = {
    'Loading…': '正在读取…',
    'Data table': '数据表格',
    'Table settings': '表格设置',
    'Worksheet': '工作表',
    'First row as header': '首行作为表头',
    'CSV encoding': 'CSV 编码',
    'Pagination': '翻页',
    'Previous': '上一页',
    'Next': '下一页',
    '200 rows per page': '每页 200 行',
    'Table actions': '表格操作',
    'Reset sort and filters': '重置排序和筛选',
    'Reload file': '重新读取文件',
    'Table Preview · Read-only': '表格预览 · 只读',
    'Resize column {column}': '调整 {column} 列宽度',
    'Drag to resize; focus and use Left/Right arrow keys': '拖动调整列宽；聚焦后用左右方向键调整',
    'Invalid filter in column {column}: {error}. Showing the last valid results.': '{column} 列筛选无效：{error}；当前仍显示上次有效结果。',
    '{sheet} · {columns} columns · {matched} / {total} rows match': '{sheet} · {columns} 列 · 匹配 {matched} / {total} 行',
    'Page {page} / {pages}': '{page} / {pages} 页',
    'No worksheets to display.': '没有可显示的工作表。',
    'Row': '行号',
    'Filter': '筛选',
    'Click to cycle: ascending, descending, original order': '点击切换：升序、降序、原始顺序',
    'Text /regex/ >=number': '文本 /正则/ >=数值',
    'Text contains; regex: /^Ceric\\./i; numbers: <0.05, >=1e-5, =0, !=0': '文本包含匹配；正则如 /^Ceric\\./i；数值如 <0.05、>=1e-5、=0、!=0',
    'Filter column {column}': '筛选 {column} 列',
    'Partial preview: up to 50,000 rows and 200 columns per sheet, and 200,000 cells per file. Sorting and filtering apply only to loaded data.': '仅加载部分数据：最多每表 50,000 行、200 列，全文件 200,000 个单元格。排序和筛选仅适用于已加载部分。',
    'Use /pattern/ or /pattern/i for a regular expression.': '正则格式应为 /表达式/ 或 /表达式/i',
    'Only the i, m, s and u regex flags are supported.': '正则标志仅支持 i、m、s、u',
    'Invalid regular expression. Check the pattern and flags.': '正则表达式无效，请检查表达式和标志。',
    'Use a finite numeric threshold, such as >0.05 or <=1e-5.': '阈值应为有限数值，例如 >0.05 或 <=1e-5',
    'The file exceeds the 20 MiB preview limit. Please split it first.': '文件超过 20 MiB 预览上限，请先拆分文件。',
    'Preview failed: {error}': '预览失败：{error}',
    'The parser stopped. The file may be too large.': '解析进程已停止，文件可能过大。',
    'Parsing exceeded 15 seconds. Please use a smaller file.': '解析超过 15 秒，请先缩小文件。',
    'Cannot read the file: {error}. For CSV, try a different encoding. For XLSX, check that the file is not encrypted or damaged.': '无法读取文件：{error}。CSV 请尝试切换编码；XLSX 请确认文件未加密且未损坏。'
  };
  function createTranslator(language = 'en') {
    const chinese = /^zh(?:-|$)/i.test(language);
    return (message, values = {}) => (chinese ? zh[message] ?? message : message)
      .replace(/\{(\w+)\}/g, (placeholder, key) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
  }
  const api = { createTranslator };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TableI18n = api;
})(globalThis);
