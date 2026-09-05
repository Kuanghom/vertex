const LEVELS = {
  debug: { key: 'debug', label: 'DEBUG' },
  info: { key: 'info', label: 'INFO' },
  warn: { key: 'warn', label: 'WARN' },
  error: { key: 'error', label: 'ERROR' }
};

const QB_TYPE = {
  1: 'info',
  2: 'info',
  4: 'warn',
  8: 'error'
};

export const LEVEL_OPTIONS = [
  { value: '', label: '全部级别' },
  { value: 'debug', label: 'DEBUG' },
  { value: 'info', label: 'INFO' },
  { value: 'warn', label: 'WARN' },
  { value: 'error', label: 'ERROR' }
];

export function levelMeta (key) {
  return LEVELS[key] || LEVELS.info;
}

function sourceName (raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const file = text.split(/\s+/)[0] || '';
  const parts = file.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || file;
}

function toMs (ts) {
  const n = Number(ts);
  if (!n) return 0;
  return n > 1e11 ? n : n * 1e3;
}

export function fromClientLogs (list) {
  return (list || []).map((row, i) => ({
    id: row.id != null ? String(row.id) : 'c' + i,
    ts: toMs(row.timestamp),
    level: QB_TYPE[row.type] || (row.type === 4 ? 'warn' : 'info'),
    source: '',
    message: String(row.message || '')
  }));
}

const VERTEX_LINE = /^\[(\d{4}-\d{2}-\d{2}T[\d:.+-]+)\]?\[(\w+)\s+([^\]]*)\]\s*(?:(\d+)\s+)?(?:\(([^)]+)\)\s+)?([\s\S]*)$/;

function normLevel (raw) {
  const key = String(raw || '').toLowerCase();
  if (key === 'warning' || key === 'warn') return 'warn';
  if (key === 'fatal' || key === 'critical' || key === 'error') return 'error';
  if (key === 'trace' || key === 'debug') return 'debug';
  return 'info';
}

export function parseVertexLog (raw) {
  const text = String(raw || '');
  const entries = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const m = VERTEX_LINE.exec(line);
    if (m) {
      const ts = Date.parse(m[1]) || 0;
      const level = normLevel(m[2]);
      const source = sourceName(m[5]);
      const message = m[6] || '';
      entries.push({
        id: [m[1], level, source, message.slice(0, 80)].join('|'),
        ts,
        level,
        source,
        message,
        stack: ''
      });
      return;
    }
    if (line && entries.length) {
      const last = entries[entries.length - 1];
      last.stack = last.stack ? last.stack + '\n' + line : line;
    }
  });
  return entries.reverse();
}

export function groupLogEntries (entries) {
  const groups = [];
  let current = null;
  (entries || []).forEach((row) => {
    const key = row.ts ? minuteKey(row.ts) : 'other';
    if (!current || current.key !== key) {
      current = { key, ts: row.ts, items: [] };
      groups.push(current);
    }
    current.items.push(row);
  });
  return groups;
}

function minuteKey (ts) {
  const d = new Date(ts);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes()
  ].join('-');
}

export function filterLogEntries (entries, opts) {
  const level = (opts && opts.level) || '';
  const q = String((opts && opts.query) || '').trim().toLowerCase();
  return (entries || []).filter((row) => {
    if (level && row.level !== level) return false;
    if (!q) return true;
    return String(row.message || '').toLowerCase().indexOf(q) !== -1 ||
      String(row.source || '').toLowerCase().indexOf(q) !== -1;
  });
}

export function countNewHead (prev, next) {
  if (!prev || !prev.length || !next || !next.length) return 0;
  const seen = {};
  prev.forEach((row) => {
    if (row && row.id != null) seen[row.id] = true;
  });
  let n = 0;
  for (let i = 0; i < next.length; i++) {
    const id = next[i] && next[i].id;
    if (id != null && seen[id]) break;
    n += 1;
  }
  return n;
}
