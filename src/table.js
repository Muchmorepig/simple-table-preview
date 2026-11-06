(function (root) {
  'use strict';
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const numeric = value => (typeof value === 'number' || (typeof value === 'string' && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) && Number.isFinite(Number(value));
  function compare(a, b) {
    if (a == null || a === '') return b == null || b === '' ? 0 : 1;
    if (b == null || b === '') return -1;
    if (numeric(a) && numeric(b)) return Number(a) - Number(b);
    return collator.compare(String(a), String(b));
  }
  function compileFilter(filter) {
    if (!filter) return () => true;
    if (filter.startsWith('/')) {
      const end = filter.lastIndexOf('/');
      if (end === 0) throw new Error('Use /pattern/ or /pattern/i for a regular expression.');
      const flags = filter.slice(end + 1);
      if (!/^[imsu]*$/.test(flags)) throw new Error('Only the i, m, s and u regex flags are supported.');
      // shortcut: native regex runs synchronously; move filtering to a cancellable worker for costly patterns.
      let expression;
      try { expression = new RegExp(filter.slice(1, end), flags); }
      catch { throw new Error('Invalid regular expression. Check the pattern and flags.'); }
      return value => expression.test(String(value ?? ''));
    }
    const threshold = filter.trim().match(/^(<=|>=|!=|==|=|<|>)\s*(.*)$/);
    if (threshold) {
      if (!numeric(threshold[2])) throw new Error('Use a finite numeric threshold, such as >0.05 or <=1e-5.');
      const limit = Number(threshold[2]);
      return value => {
        if (!numeric(value)) return false;
        const number = Number(value);
        switch (threshold[1]) {
          case '<': return number < limit;
          case '<=': return number <= limit;
          case '>': return number > limit;
          case '>=': return number >= limit;
          case '!=': return number !== limit;
          default: return number === limit;
        }
      };
    }
    const text = filter.toLocaleLowerCase();
    return value => String(value ?? '').toLocaleLowerCase().includes(text);
  }
  function selectRows(rows, header, filters, sort) {
    const predicates = filters.map(compileFilter);
    const selected = [];
    for (let i = header ? 1 : 0; i < rows.length; i++) {
      if (predicates.every((predicate, column) => predicate(rows[i][column]))) selected.push(i);
    }
    if (sort) selected.sort((a, b) => compare(rows[a][sort.column], rows[b][sort.column]) * sort.direction || a - b);
    return selected;
  }
  const api = { compare, selectRows, compileFilter };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TableData = api;
})(globalThis);
