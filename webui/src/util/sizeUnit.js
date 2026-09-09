const FACTOR = {
  Byte: 1,
  KiB: 1024,
  MiB: 1024 * 1024,
  GiB: 1024 * 1024 * 1024,
  TiB: 1024 * 1024 * 1024 * 1024
};

const TIME_FACTOR = {
  s: 1,
  m: 60,
  h: 3600
};

export const SPEED_UNITS = [
  { value: 'Byte', label: 'Byte/s' },
  { value: 'KiB', label: 'KiB/s' },
  { value: 'MiB', label: 'MiB/s' },
  { value: 'GiB', label: 'GiB/s' }
];

export const SIZE_UNITS = [
  { value: 'Byte', label: 'Byte' },
  { value: 'KiB', label: 'KiB' },
  { value: 'MiB', label: 'MiB' },
  { value: 'GiB', label: 'GiB' },
  { value: 'TiB', label: 'TiB' }
];

export const TIME_UNITS = [
  { value: 's', label: '秒' },
  { value: 'm', label: '分' },
  { value: 'h', label: '时' }
];

const SIZE_CONDITION_KEYS = new Set([
  'size', 'totalSize', 'completed', 'downloaded', 'uploaded', 'freeSpace'
]);

const SPEED_CONDITION_KEYS = new Set([
  'uploadSpeed', 'downloadSpeed', 'globalUploadSpeed', 'globalDownloadSpeed'
]);

const TIME_CONDITION_KEYS = new Set([
  'addedTime', 'completedTime', 'secondFromZero', 'time'
]);

export function unitFactor (unit) {
  return FACTOR[unit] || TIME_FACTOR[unit] || 1;
}

export function conditionKind (key) {
  if (SIZE_CONDITION_KEYS.has(key)) return 'size';
  if (SPEED_CONDITION_KEYS.has(key)) return 'speed';
  if (TIME_CONDITION_KEYS.has(key)) return 'time';
  return '';
}

export function defaultUnit (kind) {
  if (kind === 'size') return 'GiB';
  if (kind === 'speed') return 'MiB';
  if (kind === 'time') return 's';
  return '';
}

export function unitsFor (key) {
  const kind = conditionKind(key);
  if (kind === 'size') return SIZE_UNITS;
  if (kind === 'speed') return SPEED_UNITS;
  if (kind === 'time') return TIME_UNITS;
  return [];
}

function divides (n, f) {
  if (!f) return false;
  const q = n / f;
  return Number.isFinite(q) && Math.abs(q - Math.round(q)) < 1e-9;
}

function productOf (compact) {
  if (!/^[-+]?\d+(?:\.\d+)?(?:\*[-+]?\d+(?:\.\d+)?)+$/.test(compact)) return null;
  const parts = compact.split('*').map(Number);
  if (!parts.every(Number.isFinite)) return null;
  return parts.reduce((a, b) => a * b, 1);
}

export function toBytes (value, unit) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(n * unitFactor(unit));
}

export function fromBytes (bytes, preferUnit) {
  if (bytes === '' || bytes == null) {
    return { value: '', unit: preferUnit || 'KiB' };
  }
  const n = Number(bytes);
  if (!Number.isFinite(n)) {
    return { value: String(bytes), unit: preferUnit || 'KiB' };
  }
  if (n === 0) {
    return { value: '0', unit: preferUnit || 'KiB' };
  }
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  for (const u of ['TiB', 'GiB', 'MiB', 'KiB']) {
    if (abs >= FACTOR[u] && divides(abs, FACTOR[u])) {
      return { value: sign + String(abs / FACTOR[u]), unit: u };
    }
  }
  return { value: String(n), unit: 'Byte' };
}

export function parseSizeExpr (raw, preferUnit = 'MiB') {
  if (raw == null || raw === '') return { value: '', unit: preferUnit };
  const compact = String(raw).replace(/\s/g, '');
  const prod = productOf(compact);
  if (prod != null) return fromBytes(prod, preferUnit);
  const n = Number(compact);
  if (Number.isFinite(n)) return fromBytes(n, preferUnit);
  return { value: String(raw), unit: preferUnit };
}

export function toSizeExpr (value, unit) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const suffix = {
    KiB: '*1024',
    MiB: '*1024*1024',
    GiB: '*1024*1024*1024',
    TiB: '*1024*1024*1024*1024'
  };
  if (!unit || unit === 'Byte') return String(n);
  return `${n}${suffix[unit] || ''}`;
}

export function parseTimeExpr (raw) {
  if (raw == null || raw === '') return { value: '', unit: 's' };
  const compact = String(raw).replace(/\s/g, '');
  const prod = productOf(compact);
  const seconds = prod != null ? prod : Number(compact);
  if (!Number.isFinite(seconds)) return { value: String(raw), unit: 's' };
  if (seconds === 0) return { value: '0', unit: 's' };
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? '-' : '';
  if (divides(abs, 3600)) return { value: sign + String(abs / 3600), unit: 'h' };
  if (divides(abs, 60)) return { value: sign + String(abs / 60), unit: 'm' };
  return { value: String(seconds), unit: 's' };
}

export function toTimeExpr (value, unit) {
  if (value === '' || value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (unit === 'h') return `${n}*3600`;
  if (unit === 'm') return `${n}*60`;
  return String(n);
}
