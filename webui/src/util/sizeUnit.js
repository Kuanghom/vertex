const FACTOR = {
  Byte: 1,
  KiB: 1024,
  MiB: 1024 * 1024,
  GiB: 1024 * 1024 * 1024,
  TiB: 1024 * 1024 * 1024 * 1024
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
  { value: 'GiB', label: 'GiB' }
];

export function unitFactor (unit) {
  return FACTOR[unit] || 1;
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
  if (!Number.isFinite(n) || n === 0) {
    return { value: '', unit: preferUnit || 'KiB' };
  }
  if (preferUnit && n % unitFactor(preferUnit) === 0) {
    return { value: String(n / unitFactor(preferUnit)), unit: preferUnit };
  }
  if (n % FACTOR.GiB === 0) return { value: String(n / FACTOR.GiB), unit: 'GiB' };
  if (n % FACTOR.MiB === 0) return { value: String(n / FACTOR.MiB), unit: 'MiB' };
  if (n % FACTOR.KiB === 0) return { value: String(n / FACTOR.KiB), unit: 'KiB' };
  return { value: String(n), unit: 'Byte' };
}

export function parseSizeExpr (raw) {
  if (raw == null || raw === '') return { value: '', unit: 'MiB' };
  const compact = String(raw).replace(/\s/g, '');
  const n = Number(compact);
  if (Number.isFinite(n)) return fromBytes(n, 'MiB');
  const gi = compact.match(/^(\d+(?:\.\d+)?)\*1024\*1024\*1024$/);
  if (gi) return { value: gi[1], unit: 'GiB' };
  const mi = compact.match(/^(\d+(?:\.\d+)?)\*1024\*1024$/);
  if (mi) return { value: mi[1], unit: 'MiB' };
  const ki = compact.match(/^(\d+(?:\.\d+)?)\*1024$/);
  if (ki) return { value: ki[1], unit: 'KiB' };
  return { value: String(raw), unit: 'Byte' };
}
