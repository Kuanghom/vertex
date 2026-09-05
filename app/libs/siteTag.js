const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const util = require('./util');

const DATA_PATH = path.join(__dirname, '../data/site-tag.json');
const DEFAULT_PATH = path.join(__dirname, '../config_backup/site-tag-default.json');
const LEGACY_DEFAULT_PATH = path.join(__dirname, '../config/site-tag-default.json');

let cachedConfig = null;
let hostIndex = null;

function normalizeHost (host) {
  if (!host) return '';
  return String(host).replace(/^www\./, '').toLowerCase().split(':')[0];
}

function siteKey (name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNameList (value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value).split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
}

function parseHostList (value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeHost).filter(Boolean);
  return String(value).split(/[\n,;]+/).map(item => normalizeHost(item.trim())).filter(Boolean);
}

function hostsRelated (a, b) {
  a = normalizeHost(a);
  b = normalizeHost(b);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith('.' + b) || b.endsWith('.' + a)) return true;
  const aRoot = a.split('.').slice(-2).join('.');
  const bRoot = b.split('.').slice(-2).join('.');
  return aRoot === bRoot;
}

function extractHostFromUrl (input) {
  if (!input) return '';
  try {
    return normalizeHost(new URL(input.startsWith('http') ? input : `https://${input}`).hostname);
  } catch (e) {
    return normalizeHost(String(input).split('/')[0]);
  }
}

function loadDefaultConfig () {
  for (const filePath of [DEFAULT_PATH, LEGACY_DEFAULT_PATH]) {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  }
  logger.warn('站点标签默认配置不存在, 使用空配置');
  return { enabled: true, items: [] };
}

function ensureDataFile () {
  if (!fs.existsSync(DATA_PATH)) {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(loadDefaultConfig(), null, 2));
  }
}

function normalizeItem (item) {
  return {
    id: item.id,
    name: item.name || '',
    tag: item.tag || '',
    siteHosts: parseHostList(item.siteHosts),
    trackerHosts: parseHostList(item.trackerHosts),
    vertexNames: parseNameList(item.vertexNames),
    enabled: item.enabled !== false
  };
}

function buildHostIndex (config) {
  const index = new Map();
  const add = (host, item) => {
    if (!host) return;
    if (!index.has(host)) index.set(host, []);
    const list = index.get(host);
    if (!list.some(entry => entry.id === item.id)) list.push(item);
  };
  for (const rawItem of config.items || []) {
    const item = normalizeItem(rawItem);
    if (!item.enabled || !item.tag) continue;
    item.siteHosts.forEach(host => add(host, item));
    item.trackerHosts.forEach(host => add(host, item));
  }
  return index;
}

function getConfig () {
  ensureDataFile();
  if (!cachedConfig) {
    cachedConfig = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    if (!cachedConfig.items) cachedConfig.items = [];
    cachedConfig.enabled = cachedConfig.enabled !== false;
    hostIndex = buildHostIndex(cachedConfig);
  }
  return cachedConfig;
}

function reloadConfig () {
  cachedConfig = null;
  hostIndex = null;
  return getConfig();
}

function saveConfig (config) {
  ensureDataFile();
  fs.writeFileSync(DATA_PATH, JSON.stringify(config, null, 2));
  reloadConfig();
}

function findByVertexName (siteName) {
  if (!siteName) return null;
  const key = siteKey(siteName);
  for (const rawItem of getConfig().items || []) {
    const item = normalizeItem(rawItem);
    if (!item.enabled || !item.tag) continue;
    if (item.vertexNames.some(name => siteKey(name) === key || name === siteName)) return item;
    if (siteKey(item.name.split(/\s*-\s*/)[0]) === key) return item;
  }
  if (global.SITE && global.SITE.siteUrlMap && global.SITE.siteUrlMap[siteName]) {
    const host = extractHostFromUrl(global.SITE.siteUrlMap[siteName]);
    return findByHost(host);
  }
  return null;
}

function findByHost (host) {
  host = normalizeHost(host);
  if (!host || !hostIndex) return null;
  const direct = hostIndex.get(host);
  if (direct && direct.length) return direct[0];
  for (const [indexedHost, items] of hostIndex.entries()) {
    if (hostsRelated(host, indexedHost)) return items[0];
  }
  return null;
}

function parseAnnounceFromBuffer (buffer) {
  try {
    const bencode = require('bencode');
    const torrent = bencode.decode(buffer);
    const announces = [];
    if (torrent.announce) announces.push(String(torrent.announce));
    if (torrent['announce-list']) {
      for (const tier of torrent['announce-list']) {
        for (const item of tier) announces.push(String(item));
      }
    }
    return announces.map(extractHostFromUrl).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function parseAnnounceFromFile (filepath) {
  if (!filepath || !fs.existsSync(filepath)) return [];
  return parseAnnounceFromBuffer(fs.readFileSync(filepath));
}

exports.getConfig = getConfig;
exports.reloadConfig = reloadConfig;
exports.saveConfig = saveConfig;
exports.loadDefaultConfig = loadDefaultConfig;
exports.parseHostList = parseHostList;
exports.parseNameList = parseNameList;
exports.normalizeItem = normalizeItem;
exports.parseAnnounceFromFile = parseAnnounceFromFile;

function isValidInfoHash (hash) {
  return /^[a-f0-9]{40}$/i.test(String(hash || ''));
}

function normalizeTorrentName (name) {
  return String(name || '').trim();
}

async function resolveTargetHash (client, hash, context = {}) {
  const normalizedHash = isValidInfoHash(hash) ? String(hash).toLowerCase() : '';
  const maxAttempts = 15;

  for (let i = 0; i < maxAttempts; i += 1) {
    if (client.maindata && client.maindata.torrents) {
      if (normalizedHash) {
        const byHash = client.maindata.torrents.find(item => item.hash === normalizedHash);
        if (byHash) return byHash.hash;
      }
      const name = normalizeTorrentName(context.name);
      if (name) {
        const byName = client.maindata.torrents.find(item => {
          if (normalizeTorrentName(item.name) !== name) return false;
          return !context.size || +item.size === +context.size;
        });
        if (byName) return byName.hash;
      }
    }
    if (i < maxAttempts - 1) {
      await util.sleep(1000);
      await client.getMaindata();
    }
  }

  if (normalizedHash) return normalizedHash;
  return client.resolveTorrentHash(context);
}

exports.resolveSiteTag = function (context = {}) {
  const config = getConfig();
  if (!config.enabled) return '';

  if (context.site) {
    const byVertex = findByVertexName(context.site);
    if (byVertex) return byVertex.tag;
  }

  const hosts = [];
  if (context.link) hosts.push(extractHostFromUrl(context.link));
  if (context.url) hosts.push(extractHostFromUrl(context.url));
  if (context.rssHost) hosts.push(normalizeHost(context.rssHost));
  if (context.announce) {
    if (Array.isArray(context.announce)) {
      context.announce.forEach(item => hosts.push(extractHostFromUrl(item)));
    } else {
      hosts.push(extractHostFromUrl(context.announce));
    }
  }
  if (context.filepath) {
    parseAnnounceFromFile(context.filepath).forEach(host => hosts.push(host));
  }

  for (const host of hosts) {
    const item = findByHost(host);
    if (item) return item.tag;
  }

  return '';
};

exports.resolveTagsToApply = function (context = {}, options = {}) {
  const customTags = parseNameList(options.customTags);
  const autoSiteTag = options.autoSiteTag !== false;
  const tagsToApply = [...customTags];

  if (autoSiteTag) {
    const siteTagName = exports.resolveSiteTag(context);
    if (siteTagName && !tagsToApply.includes(siteTagName)) {
      tagsToApply.push(siteTagName);
    }
  }

  return tagsToApply;
};

exports.applyTorrentTagsToClient = async function (client, hash, context = {}, options = {}) {
  if (!client || client._client.type !== 'qBittorrent') return;

  const tagsToApply = exports.resolveTagsToApply(context, options);
  if (!tagsToApply.length) return;

  const targetHash = await resolveTargetHash(client, hash, context);
  if (!targetHash) {
    logger.warn('下载器', client.alias, '未能解析 hash, 跳过标签:', tagsToApply.join(','), context.name || '');
    return;
  }

  for (const tag of tagsToApply) {
    try {
      await client.addTorrentTag(targetHash, tag);
      logger.info('下载器', client.alias, '已添加标签:', tag, targetHash.substring(0, 8));
    } catch (e) {
      logger.error('下载器', client.alias, '添加标签失败:', tag, targetHash.substring(0, 8), e.message);
    }
  }
};

exports.applySiteTagToClient = async function (client, hash, context = {}) {
  await exports.applyTorrentTagsToClient(client, hash, context, { autoSiteTag: true });
};
