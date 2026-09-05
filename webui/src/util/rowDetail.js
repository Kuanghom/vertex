import { reactive } from 'vue';

const SECRET = /password|privatekey|private_key|cookie|token|secret|otp|authkey/i;

export const rowDetail = reactive({
  visible: false,
  fields: []
});

const ALLOCATE_ALIAS = {
  'builtin:original': '原规则',
  'builtin:roundRobin': '轮询',
  'builtin:leastLeech': '最少下载任务',
  'builtin:mostSpace': '最大剩余空间',
  'builtin:leastLoad': '最低综合负载',
  'builtin:random': '随机'
};

export function showRowDetail (row, columns, options) {
  if (!row) return;
  const format = options && typeof options.format === 'function' ? options.format : null;
  const cols = (columns || []).filter((col) => {
    if (!col) return false;
    const key = String(col.dataIndex || col.key || '');
    const title = typeof col.title === 'string' ? col.title : '';
    if (title === '操作' || key === 'option') return false;
    if (SECRET.test(key)) return false;
    return !!key;
  });
  const fields = cols.map((col) => formatField(col, row, format)).filter(Boolean);
  if (!fields.length) {
    ['id', 'alias', 'name', 'host', 'enable', 'status'].forEach((key) => {
      if (row[key] == null || row[key] === '') return;
      fields.push(formatRaw(key, keyLabel(key), row[key]));
    });
  }
  rowDetail.fields = fields;
  rowDetail.visible = true;
}

export function closeRowDetail () {
  rowDetail.visible = false;
  rowDetail.fields = [];
}

function keyLabel (key) {
  return ({
    id: 'ID',
    alias: '别名',
    name: '名称',
    host: '域名/IP',
    enable: '启用',
    status: '状态'
  })[key] || key;
}

function formatField (col, row, format) {
  const key = String(col.dataIndex || col.key || '');
  const label = typeof col.title === 'string' && col.title ? col.title : keyLabel(key);
  if (format) {
    try {
      const custom = format(col, row, row[key]);
      if (custom != null && custom !== '') {
        if (typeof custom === 'object') return { key, label, ...custom };
        return { key, label, text: String(custom), tag: '' };
      }
    } catch (e) { /* fall through */ }
  }
  return formatRaw(key, label, row[key]);
}

function formatRaw (key, label, raw) {
  if (key === 'enable' || key === 'used' || key === 'pushNotify') {
    const on = !!raw;
    return { key, label, text: on ? '启用' : '禁用', tag: on ? 'ok' : 'bad' };
  }
  if (key === 'status') {
    const on = raw === true || raw === '正常' || raw === 1;
    return { key, label, text: on ? '正常' : '异常', tag: on ? 'ok' : 'bad' };
  }
  if (key === 'allocateRule') {
    return { key, label, text: ALLOCATE_ALIAS[raw || 'builtin:original'] || String(raw || '原规则'), tag: '' };
  }
  if (raw == null || raw === '') {
    return { key, label, text: '—', tag: '' };
  }
  if (typeof raw === 'boolean') {
    return { key, label, text: raw ? '是' : '否', tag: raw ? 'ok' : '' };
  }
  if (Array.isArray(raw)) {
    return { key, label, text: raw.length ? raw.join(' / ') : '—', tag: '' };
  }
  if (typeof raw === 'object') {
    return null;
  }
  return { key, label, text: String(raw), tag: '' };
}
