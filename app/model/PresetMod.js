const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const util = require('../libs/util');
const DeleteRuleMod = require('./DeleteRuleMod');
const RssRuleMod = require('./RssRuleMod');
const RaceRuleMod = require('./RaceRuleMod');
const RssMod = require('./RssMod');
const ClientMod = require('./ClientMod');

const deleteRuleMod = new DeleteRuleMod();
const rssRuleMod = new RssRuleMod();
const raceRuleMod = new RaceRuleMod();
const rssMod = new RssMod();
const clientMod = new ClientMod();

const CATALOG_PATH = path.join(__dirname, '../presets/catalog.json');

const KIND_TITLE = {
  delete: '删种规则',
  rss: 'RSS 规则',
  select: '选种规则',
  task: 'RSS 任务',
  client: '下载器'
};

function loadCatalog () {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, { encoding: 'utf-8' }));
}

function existingList (kind) {
  try {
    if (kind === 'delete') return util.listDeleteRule();
    if (kind === 'rss') return util.listRssRule();
    if (kind === 'select') return util.listRaceRule();
    if (kind === 'task') return util.listRss();
    if (kind === 'client') return util.listClient();
  } catch (e) {
    return [];
  }
  return [];
}

function findByAlias (kind, alias) {
  const name = String(alias || '').trim();
  return existingList(kind).find(item => String(item.alias || '').trim() === name);
}

const RSS_URL_HINT = '增加你的RSS地址';

function cleanPayload (payload) {
  const out = { ...(payload || {}) };
  Object.keys(out).forEach((key) => {
    if (key.charAt(0) === '_') delete out[key];
  });
  delete out.id;
  delete out.used;
  return out;
}

function hintRssUrls (urls) {
  const list = Array.isArray(urls) ? urls.map(url => String(url || '').trim()).filter(Boolean) : [];
  const kept = list.filter(url => !/^https?:\/\//i.test(url));
  return kept.length ? kept : [RSS_URL_HINT];
}

function applyTaskDefaults (body) {
  body.enable = false;
  body.clientSortBy = body.clientSortBy || 'leechingCount';
  body.allocateRule = body.allocateRule || 'builtin:original';
  body.rssUrls = hintRssUrls(body.rssUrls);
  body.cookie = '';
  body.clientArr = [];
  body.reseedClients = [];
  body.sameServerClients = [];
  return body;
}

function fillExistingTask (task) {
  if (!task || !task.id) return false;
  let changed = false;
  const next = { ...task };
  if (!next.clientSortBy) {
    next.clientSortBy = 'leechingCount';
    changed = true;
  }
  if (!next.allocateRule) {
    next.allocateRule = 'builtin:original';
    changed = true;
  }
  const urls = Array.isArray(next.rssUrls) ? next.rssUrls.map(url => String(url || '').trim()).filter(Boolean) : [];
  if (!urls.length) {
    next.rssUrls = [RSS_URL_HINT];
    changed = true;
  }
  if (changed) rssMod.modify(next);
  return changed;
}

function fillExistingSelect (rule) {
  if (!rule || !rule.id) return false;
  let changed = false;
  const next = { ...rule };
  if (!next.sortBy) {
    next.sortBy = 'time';
    changed = true;
  }
  if (!next.sortType) {
    next.sortType = 'desc';
    changed = true;
  }
  if (changed) raceRuleMod.modify(next);
  return changed;
}

function addKind (kind, payload) {
  const body = cleanPayload(payload);
  if (kind === 'delete') {
    deleteRuleMod.add(body);
  } else if (kind === 'rss') {
    rssRuleMod.add(body);
  } else if (kind === 'select') {
    if (!body.sortBy) body.sortBy = 'time';
    if (!body.sortType) body.sortType = 'desc';
    raceRuleMod.add(body);
  } else if (kind === 'task') {
    applyTaskDefaults(body);
    rssMod.add(body);
  } else if (kind === 'client') {
    body.enable = false;
    body.host = '';
    body.port = '';
    body.username = '';
    body.password = '';
    body.clientUrl = '';
    clientMod.add(body);
  }
  const created = findByAlias(kind, body.alias);
  return created && created.id;
}

class PresetMod {
  catalog () {
    const catalog = loadCatalog();
    const items = (catalog.items || []).map((item) => {
      const hit = findByAlias(item.kind, item.alias);
      const rules = (item.ruleIds || []).map((rid) => {
        const rule = (catalog.items || []).find(row => row.id === rid);
        return rule ? { id: rule.id, alias: rule.alias, kind: rule.kind } : { id: rid, alias: rid };
      });
      return {
        id: item.id,
        kind: item.kind,
        alias: item.alias,
        hint: item.hint || '',
        tags: item.tags || [],
        ruleIds: item.ruleIds || [],
        rules,
        exists: !!hit
      };
    });
    return {
      packs: catalog.packs || {},
      groups: catalog.groups || [],
      items
    };
  }

  apply (options) {
    const catalog = loadCatalog();
    const byId = {};
    (catalog.items || []).forEach((item) => { byId[item.id] = item; });

    let wanted = [];
    if (options.pack === 'recommended' || options.pack === 'all') {
      const ids = (catalog.packs || {})[options.pack] || [];
      wanted = ids.map(id => ({ id, ruleIds: (byId[id] && byId[id].ruleIds) || [] }));
    } else {
      wanted = options.items || [];
    }
    if (!wanted.length) {
      throw new Error('没有要导入的条目');
    }

    const idMap = {};
    const created = [];
    const reused = [];

    const ensure = (presetId) => {
      if (idMap[presetId]) return idMap[presetId];
      const item = byId[presetId];
      if (!item) return '';
      const hit = findByAlias(item.kind, item.alias);
      if (hit) {
        if (item.kind === 'task') fillExistingTask(hit);
        if (item.kind === 'select') fillExistingSelect(hit);
        idMap[presetId] = hit.id;
        reused.push({ kind: item.kind, alias: item.alias, id: hit.id });
        return hit.id;
      }
      const payload = { ...(item.payload || {}) };
      if (item.kind === 'task') {
        const accept = (payload._acceptPreset || []).filter(id => !options.ruleFilter || options.ruleFilter[item.id] == null || (options.ruleFilter[item.id] || []).indexOf(id) !== -1);
        const reject = (payload._rejectPreset || []).filter(id => !options.ruleFilter || options.ruleFilter[item.id] == null || (options.ruleFilter[item.id] || []).indexOf(id) !== -1);
        const pick = (wanted.find(row => row.id === item.id) || {}).ruleIds;
        const allow = pick && pick.length ? pick : accept.concat(reject);
        payload.acceptRules = accept.filter(id => allow.indexOf(id) !== -1).map(ensure).filter(Boolean);
        payload.rejectRules = reject.filter(id => allow.indexOf(id) !== -1).map(ensure).filter(Boolean);
      }
      if (item.kind === 'client') {
        const pick = (wanted.find(row => row.id === item.id) || {}).ruleIds;
        const deletes = payload._deletePreset || [];
        const rejects = payload._rejectDeletePreset || [];
        const allow = pick && pick.length ? pick : deletes.concat(rejects);
        payload.deleteRules = deletes.filter(id => allow.indexOf(id) !== -1).map(ensure).filter(Boolean);
        payload.rejectDeleteRules = rejects.filter(id => allow.indexOf(id) !== -1).map(ensure).filter(Boolean);
      }
      const newId = addKind(item.kind, payload);
      idMap[presetId] = newId;
      created.push({ kind: item.kind, alias: item.alias, id: newId });
      return newId;
    };

    const ruleIds = new Set();
    wanted.forEach((row) => {
      const item = byId[row.id];
      if (!item) return;
      if (['delete', 'rss', 'select'].indexOf(item.kind) !== -1) ruleIds.add(item.id);
      (row.ruleIds || item.ruleIds || []).forEach((id) => ruleIds.add(id));
    });
    ruleIds.forEach(ensure);
    wanted.forEach((row) => {
      const item = byId[row.id];
      if (!item) return;
      if (item.kind === 'task' || item.kind === 'client') ensure(item.id);
    });

    existingList('task').forEach(fillExistingTask);
    existingList('select').forEach(fillExistingSelect);

    return {
      created,
      reused,
      message: `导入完成：新增 ${created.length} 条，已有 ${reused.length} 条复用。任务和下载器未启用，地址账号可以后再填。`
    };
  }

  previewImport (file) {
    const files = this._readArchive(file);
    const groups = { delete: [], rss: [], select: [], task: [], client: [] };
    Object.keys(files).forEach((name) => {
      const kind = this._kindFromPath(name);
      if (!kind) return;
      let data;
      try {
        data = JSON.parse(files[name]);
      } catch (e) {
        return;
      }
      if (!data || typeof data !== 'object') return;
      const sensitive = !!(data.cookie || data.password || (Array.isArray(data.rssUrls) && data.rssUrls.length));
      groups[kind].push({
        source: name,
        kind,
        alias: data.alias || path.basename(name, '.json'),
        hint: sensitive ? '含地址或密钥，导入时会清空' : '',
        sensitive
      });
    });
    const total = Object.keys(groups).reduce((n, kind) => n + groups[kind].length, 0);
    if (!total) {
      const names = Object.keys(files);
      const official = names.some((name) => /(^|\/)vertex\/(data|db|config)(\/|$)/.test(name.replace(/\\/g, '/')));
      if (official) {
        throw new Error('这是 Vertex 整机备份，但 data/rule、data/rss、data/client 里没有 JSON。当前这份备份是空实例，不能当规则包导入。请到「设置 → 备份还原」整包恢复，或从有规则的机器重新导出后再试。');
      }
      throw new Error('压缩包里没有可导入的规则、任务或下载器。需要包含 data/rule、data/rss、data/client 下的 json。');
    }
    return groups;
  }

  importSelected (options) {
    const files = this._readArchive(options.file);
    const selected = new Set(options.sources || []);
    const created = [];
    const reused = [];
    const idMap = {};

    const rows = [];
    Object.keys(files).forEach((name) => {
      if (selected.size && !selected.has(name)) return;
      const kind = this._kindFromPath(name);
      if (!kind) return;
      let data;
      try {
        data = JSON.parse(files[name]);
      } catch (e) {
        return;
      }
      rows.push({ kind, name, data });
    });

    const ensureArchiveRule = (kind, oldId, data) => {
      const key = kind + ':' + oldId;
      if (idMap[key]) return idMap[key];
      const hit = findByAlias(kind, data.alias);
      if (hit) {
        idMap[key] = hit.id;
        reused.push({ kind, alias: data.alias, id: hit.id });
        return hit.id;
      }
      const payload = { ...data };
      delete payload.id;
      if (payload.code) {
        payload.code = String(payload.code)
          .replace(/https?:\/\/localhost:\d+/g, '')
          .replace(/apiToken\s*=\s*["'][^"']*["']/g, 'apiToken = ""');
      }
      const newId = addKind(kind, payload);
      idMap[key] = newId;
      created.push({ kind, alias: data.alias, id: newId });
      return newId;
    };

    rows.filter(row => ['delete', 'rss', 'select'].indexOf(row.kind) !== -1).forEach((row) => {
      ensureArchiveRule(row.kind, row.data.id, row.data);
    });
    rows.filter(row => row.kind === 'task' || row.kind === 'client').forEach((row) => {
      const data = { ...row.data };
      if (row.kind === 'task') {
        data.acceptRules = (data.acceptRules || []).map((id) => {
          const src = rows.find(r => r.kind === 'rss' && r.data.id === id);
          return src ? ensureArchiveRule('rss', id, src.data) : '';
        }).filter(Boolean);
        data.rejectRules = (data.rejectRules || []).map((id) => {
          const src = rows.find(r => r.kind === 'rss' && r.data.id === id);
          return src ? ensureArchiveRule('rss', id, src.data) : '';
        }).filter(Boolean);
        applyTaskDefaults(data);
      }
      if (row.kind === 'client') {
        data.deleteRules = (data.deleteRules || []).map((id) => {
          const src = rows.find(r => r.kind === 'delete' && r.data.id === id);
          return src ? ensureArchiveRule('delete', id, src.data) : '';
        }).filter(Boolean);
        data.rejectDeleteRules = (data.rejectDeleteRules || []).map((id) => {
          const src = rows.find(r => r.kind === 'delete' && r.data.id === id);
          return src ? ensureArchiveRule('delete', id, src.data) : '';
        }).filter(Boolean);
        data.enable = false;
        data.host = '';
        data.port = '';
        data.username = '';
        data.password = '';
      }
      const hit = findByAlias(row.kind, data.alias);
      if (hit) {
        if (row.kind === 'task') fillExistingTask(hit);
        reused.push({ kind: row.kind, alias: data.alias, id: hit.id });
        return;
      }
      const newId = addKind(row.kind, data);
      created.push({ kind: row.kind, alias: data.alias, id: newId });
    });

    existingList('task').forEach(fillExistingTask);
    existingList('select').forEach(fillExistingSelect);

    return {
      created,
      reused,
      message: `导入完成：新增 ${created.length} 条，已有 ${reused.length} 条复用。`
    };
  }

  _kindFromPath (name) {
    const n = name.replace(/\\/g, '/');
    if (/\/rule\/delete\/[^/]+\.json$/.test(n)) return 'delete';
    if (/\/rule\/rss\/[^/]+\.json$/.test(n)) return 'rss';
    if (/\/rule\/race\/[^/]+\.json$/.test(n)) return 'select';
    if (/\/data\/rss\/[^/]+\.json$/.test(n) && n.indexOf('/rule/rss/') === -1) return 'task';
    if (/\/data\/client\/[^/]+\.json$/.test(n)) return 'client';
    return '';
  }

  _readArchive (file) {
    const filePath = file.path || file.originalFilename;
    const filename = String(file.originalFilename || file.name || filePath || '').toLowerCase();
    const buf = fs.readFileSync(filePath);
    if (buf[0] === 0x50 && buf[1] === 0x4b) {
      return this._readZip(buf);
    }
    const gzip = (buf[0] === 0x1f && buf[1] === 0x8b) || /\.(tar\.gz|tgz)$/.test(filename);
    if (!gzip && !/\.tar$/.test(filename)) {
      throw new Error('请上传 zip 或 tar.gz 备份');
    }
    const tmp = path.join('/tmp', 'vertex-preset-' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    try {
      require('tar').x({
        sync: true,
        gzip,
        file: filePath,
        cwd: tmp
      });
      return this._walkJson(tmp, tmp);
    } finally {
      try {
        fs.rmSync(tmp, { recursive: true, force: true });
      } catch (e) {}
    }
  }

  _walkJson (root, dir, out) {
    out = out || {};
    fs.readdirSync(dir).forEach((name) => {
      const full = path.join(dir, name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (fs.statSync(full).isDirectory()) {
        this._walkJson(root, full, out);
      } else if (name.endsWith('.json')) {
        out[rel] = fs.readFileSync(full, { encoding: 'utf-8' });
      }
    });
    return out;
  }

  _readZip (buf) {
    const files = {};
    let offset = 0;
    while (offset + 30 <= buf.length) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) break;
      const method = buf.readUInt16LE(offset + 8);
      const flags = buf.readUInt16LE(offset + 6);
      if (flags & 0x0008) break;
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
      const start = offset + 30 + nameLen + extraLen;
      const data = buf.slice(start, start + compSize);
      offset = start + compSize;
      if (!name.endsWith('.json')) continue;
      try {
        const raw = method === 0 ? data : zlib.inflateRawSync(data);
        files[name] = raw.toString('utf8');
      } catch (e) {}
    }
    return files;
  }
}

PresetMod.KIND_TITLE = KIND_TITLE;
module.exports = PresetMod;
