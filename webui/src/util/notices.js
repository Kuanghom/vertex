import { reactive } from 'vue';

const KEY = 'vertex-notices';
const LIMIT = 40;

function load () {
  try {
    const rows = JSON.parse(sessionStorage.getItem(KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

function persist (items) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
  } catch (e) {}
}

function partText (item) {
  if (item == null) return '';
  if (typeof item === 'object') {
    return String(item.message || item.code || item.description || '').trim();
  }
  return String(item).trim();
}

function fingerprint (title, body) {
  return title + '\n' + body;
}

export function formatError (error) {
  const parts = Array.isArray(error) ? error.map(partText).filter(Boolean) : [partText(error)].filter(Boolean);
  const group = parts[0] || '系统';
  const title = parts.length > 1 ? parts.slice(0, 2).join(' · ') : group;
  const body = parts.length > 2 ? parts.slice(2).join('，') : (parts[1] || parts[0] || '发生错误');
  return { group, title, body };
}

export const noticeBox = reactive({
  items: load()
});

export function ingestHealth (health) {
  const issues = health && health.issues;
  if (!issues || !issues.length) return;
  const now = Date.now();
  const next = noticeBox.items.slice();
  issues.forEach((issue) => {
    const title = issue.title || issue.group || '健康检查';
    const body = issue.body || '';
    const fp = fingerprint('health:' + title, body);
    const dup = next.find(item => item.fp === fp);
    if (dup) {
      dup.count = (dup.count || 1) + 1;
      dup.time = now;
      dup.href = issue.href || dup.href;
      next.splice(next.indexOf(dup), 1);
      next.unshift(dup);
      return;
    }
    next.unshift({
      id: now + '-' + Math.random().toString(36).slice(2, 8),
      group: issue.group || '健康',
      title,
      body,
      href: issue.href,
      fp,
      time: now,
      read: false,
      count: 1
    });
  });
  noticeBox.items = next.slice(0, LIMIT);
  persist(noticeBox.items);
}

export function ingestErrors (errors) {
  if (!errors || !errors.length) return;
  const now = Date.now();
  const next = noticeBox.items.slice();
  errors.forEach((error) => {
    const row = formatError(error);
    const fp = fingerprint(row.title, row.body);
    const dup = next.find(item => item.fp === fp);
    if (dup) {
      dup.count = (dup.count || 1) + 1;
      dup.time = now;
      dup.read = false;
      next.splice(next.indexOf(dup), 1);
      next.unshift(dup);
      return;
    }
    next.unshift({
      id: now + '-' + Math.random().toString(36).slice(2, 8),
      group: row.group,
      title: row.title,
      body: row.body,
      fp,
      time: now,
      read: false,
      count: 1
    });
  });
  noticeBox.items = next.slice(0, LIMIT);
  persist(noticeBox.items);
}

export function markAllRead () {
  let changed = false;
  noticeBox.items.forEach((item) => {
    if (!item.read) {
      item.read = true;
      changed = true;
    }
  });
  if (changed) persist(noticeBox.items);
}

export function removeNotice (id) {
  noticeBox.items = noticeBox.items.filter(item => item.id !== id);
  persist(noticeBox.items);
}

export function clearNotices () {
  noticeBox.items = [];
  persist(noticeBox.items);
}

export function unreadCount () {
  return noticeBox.items.filter(item => !item.read).length;
}
