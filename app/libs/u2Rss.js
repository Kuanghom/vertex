const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');
const logger = require('./logger');
const redis = require('./redis');
const util = require('./util');

const SETTING_PATH = path.join(__dirname, '../data/setting/u2-rss-setting.json');

const DEFAULT_MAXIMUM = 10;
const DETAIL_CACHE_TTL = 7200;
const FEED_CACHE_TTL = 50;
const DETAIL_CONCURRENCY = 6;
const DETAIL_CACHE_PREFIX = 'vertex:u2-rss:detail:';

const DEFAULT_SETTING = {
  enable: true,
  alias: 'U2 魔法 RSS',
  kysdDomain: 'https://u2.kysdm.com',
  webDomain: 'https://u2.dmhy.org',
  uid: '',
  apiToken: '',
  cookie: '',
  passkey: '',
  maximum: DEFAULT_MAXIMUM,
  promotionType: '魔法',
  minUpRate: 1,
  maxDownRate: 0,
  forAllOnly: true,
  ignoreUserNames: [],
  torrentMinSize: 0,
  torrentMaxSize: 0,
  maxSeeders: 0,
  preferApi: true,
  rssToken: ''
};

const normalizeDomain = (domain) => (domain || '').replace(/\/+$/, '');

const logRequest = function (label, url, extra = '') {
  const suffix = extra ? ` | ${extra}` : '';
  logger.info(`[u2-rss] 请求 ${label}: ${url}${suffix}`);
};

const maskUrlSecret = function (url, secret) {
  if (!secret || !url) return url;
  return String(url).split(secret).join('***');
};

const canUseApi = function (setting) {
  return !!(setting.preferApi && setting.uid && setting.apiToken);
};

const getMaximum = function (setting) {
  const maximum = +setting.maximum;
  return maximum > 0 ? maximum : DEFAULT_MAXIMUM;
};

const mapPool = async function (items, concurrency, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
};

const escapeXml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const wrapCdata = (value) => `<![CDATA[${String(value || '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

const isTorrentDetailLink = (href) => {
  if (!href) return false;
  return /(?:^|\/)details\.php\?id=\d+/i.test(href) && !/userdetails\.php/i.test(href);
};

const formatSizeText = (size) => {
  const bytes = +size || 0;
  if (!bytes) return '-';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const parseRatio = (ratioText) => {
  const text = String(ratioText || '').replace(/\s+/g, '');
  const match = text.match(/([\d.]+)\/([\d.]+)/) || text.match(/上傳([\d.]+)下載([\d.]+)/) || text.match(/上传([\d.]+)下载([\d.]+)/);
  if (!match) {
    return { upRate: null, downRate: null };
  }
  return {
    upRate: +match[1],
    downRate: +match[2]
  };
};

const DEFAULT_RATE = { upRate: 1, downRate: 1 };

const FIXED_RATE_MAP = {
  Promotion: [1, 1],
  '2X Free': [2, 0],
  FREE: [1, 0],
  '2X': [2, 1]
};

const parseUniversalXRate = (freeTdElm, className) => {
  const img = freeTdElm.querySelector(`img.${className}`);
  if (!img) return 1;
  const next = img.nextElementSibling;
  if (!next) return 1;
  const num = parseFloat(String(next.textContent || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(num) ? num : 1;
};

const parseTorrentRate = (freeInfo, freeTdElm) => {
  const info = String(freeInfo || '').trim();
  if (!info) return { ...DEFAULT_RATE };
  if (info.includes('%')) {
    const match = info.match(/(\d+\.?\d*)%/);
    return { upRate: 1, downRate: match ? +match[1] / 100 : 1 };
  }
  if (FIXED_RATE_MAP[info]) {
    let upRate = FIXED_RATE_MAP[info][0];
    let downRate = FIXED_RATE_MAP[info][1];
    if (info === 'Promotion' && freeTdElm) {
      upRate = parseUniversalXRate(freeTdElm, 'arrowup');
      downRate = parseUniversalXRate(freeTdElm, 'arrowdown');
    }
    return { upRate, downRate };
  }
  return { ...DEFAULT_RATE };
};

const parseTorrentRateFromDocument = (document) => {
  let freeTd = null;
  for (const td of document.querySelectorAll('td.rowhead')) {
    if (/流量優惠|流量优惠/.test(td.textContent || '')) {
      freeTd = td.nextElementSibling;
      break;
    }
  }
  if (!freeTd) return { ...DEFAULT_RATE };
  const faqLink = [...freeTd.querySelectorAll('a.faqlink')].find((a) => /優惠歷史|优惠历史/.test(a.textContent || ''));
  let freeText = '';
  if (faqLink?.previousSibling) {
    freeText = (faqLink.previousSibling.textContent || '').trim();
  }
  const imgElm = freeTd.querySelector('img');
  if (!imgElm || /普通/.test(freeText)) {
    return { ...DEFAULT_RATE };
  }
  return parseTorrentRate(imgElm.getAttribute('alt') || '', freeTd);
};

const formatStackedRatio = (upRate, downRate) => {
  if (upRate == null || downRate == null) return '';
  return `${Number(upRate).toFixed(2)} / ${Number(downRate).toFixed(2)}`;
};

const parseSizeToBytes = (sizeText) => {
  const text = String(sizeText || '').trim();
  if (!text) return 0;
  const match = text.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB|B)/i);
  if (!match) return 0;
  const unitMap = {
    B: 1,
    KIB: 1024,
    KB: 1000,
    MIB: 1024 ** 2,
    MB: 1000 ** 2,
    GIB: 1024 ** 3,
    GB: 1000 ** 3,
    TIB: 1024 ** 4,
    TB: 1000 ** 4
  };
  const unit = unitMap[match[2].toUpperCase()] || 1;
  return Math.round(+match[1] * unit);
};

const loadSetting = function () {
  if (!fs.existsSync(SETTING_PATH)) {
    const setting = { ...DEFAULT_SETTING, rssToken: crypto.randomBytes(16).toString('hex') };
    fs.mkdirSync(path.dirname(SETTING_PATH), { recursive: true });
    fs.writeFileSync(SETTING_PATH, JSON.stringify(setting, null, 2));
    return setting;
  }
  const setting = { ...DEFAULT_SETTING, ...JSON.parse(fs.readFileSync(SETTING_PATH, { encoding: 'utf-8' })) };
  if (!setting.rssToken) {
    setting.rssToken = crypto.randomBytes(16).toString('hex');
    saveSetting(setting);
  }
  return setting;
};

const saveSetting = function (setting) {
  fs.mkdirSync(path.dirname(SETTING_PATH), { recursive: true });
  fs.writeFileSync(SETTING_PATH, JSON.stringify(setting, null, 2));
  return setting;
};

const mapApiPromotion = (item) => ({
  promotionId: item.promotion_id || item.promotionId,
  torrentId: item.torrent_id || item.torrentId,
  torrentName: item.torrent_name || item.torrentName,
  promotionType: item.promotion_type || item.promotionType,
  userName: item.user_name || item.userName,
  createdTime: item.created_time || item.createdTime,
  expirationTime: item.expiration_time || item.expirationTime,
  ratio: item.ratio,
  forUserName: item.for_user_name || item.forUserName,
  source: 'api'
});

const fetchPromotionsFromApi = async function (setting) {
  const kysdDomain = normalizeDomain(setting.kysdDomain);
  if (!setting.uid || !setting.apiToken) {
    throw new Error('API 模式需要填写 UID 和 API Token');
  }
  const url = `${kysdDomain}/api/v1/promotion?uid=${encodeURIComponent(setting.uid)}&token=${encodeURIComponent(setting.apiToken)}&scope=public&maximum=${getMaximum(setting)}`;
  logRequest('魔法 API 魔法列表', maskUrlSecret(url, setting.apiToken), `maximum=${getMaximum(setting)}`);
  const { body } = await util.requestPromise({ url, json: true });
  const state = body?.state;
  if (+state !== 200 && state !== '200') {
    throw new Error(`魔法 API 返回异常: ${body?.msg || state || 'unknown'}`);
  }
  const list = body?.data?.promotion || [];
  const promotions = list.map(mapApiPromotion).sort((a, b) => +b.promotionId - +a.promotionId);
  logger.info('[u2-rss] 魔法 API 魔法列表响应: count=', promotions.length);
  return promotions;
};

const extractShoutboxKey = function (html) {
  const match = html.match(/logout\.php\?key=([a-f0-9]+)/i) ||
    html.match(/shoutbox\.php\?action=fetch(?:&amp;|&)key=([a-f0-9]+)/i);
  return match ? match[1] : '';
};

const parseShoutboxPromotions = function (html, maximum = DEFAULT_MAXIMUM) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const items = [];
  const seen = new Set();
  for (const row of document.querySelectorAll('td.shoutrow div')) {
    const text = row.textContent || '';
    if (!/完成了/.test(text) || !/details\.php\?id=/.test(row.innerHTML)) {
      continue;
    }
    const detailLinks = [...row.querySelectorAll('a[href*="details.php?id="]')]
      .filter(link => isTorrentDetailLink(link.getAttribute('href')));
    const detailLink = detailLinks[detailLinks.length - 1] || detailLinks[0];
    const promotionLink = row.querySelector('a[href*="promotion.php?action=detail"]');
    const userLink = row.querySelector('a[href*="userdetails.php?id="]');
    const timeEl = row.querySelector('time');
    if (!detailLink) continue;
    const torrentId = +(detailLink.getAttribute('href').match(/id=(\d+)/) || [])[1];
    const promotionHref = promotionLink?.getAttribute('href') || '';
    const dedupeKey = `${torrentId}:${promotionHref}:${timeEl?.getAttribute('title') || ''}`;
    if (!torrentId || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const ratioText = promotionLink ? promotionLink.textContent : '';
    const ratio = parseRatio(ratioText);
    items.push({
      promotionId: promotionLink ? +(promotionLink.getAttribute('href').match(/id=(\d+)/) || [])[1] : torrentId,
      torrentId,
      torrentName: detailLink.textContent.trim(),
      promotionType: /管理/.test(text) ? '管理' : '魔法',
      userName: userLink ? userLink.textContent.trim() : '',
      createdTime: timeEl?.getAttribute('title') || '',
      expirationTime: '',
      ratio: ratio.upRate == null ? '' : `${ratio.upRate.toFixed(2)} / ${ratio.downRate.toFixed(2)}`,
      forUserName: '所有人',
      source: 'shoutbox'
    });
  }
  return items.slice(0, +maximum || DEFAULT_MAXIMUM);
};

const fetchPromotionsFromShoutbox = async function (setting) {
  const webDomain = normalizeDomain(setting.webDomain);
  if (!setting.cookie) {
    throw new Error('Cookie 兜底模式需要填写 Cookie');
  }
  const headers = {
    cookie: setting.cookie,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
  };
  const homeUrl = `${webDomain}/`;
  logRequest('站点首页(解析群聊 key)', homeUrl);
  const { body: homeBody } = await util.requestPromise({ url: homeUrl, headers }, true);
  const key = extractShoutboxKey(homeBody);
  if (!key) {
    throw new Error('无法从 U2 首页解析群聊 key，请检查 Cookie 是否有效');
  }
  logger.info('[u2-rss] 群聊 key 解析成功');
  const shoutboxUrl = `${webDomain}/shoutbox.php?action=fetch&key=${key}`;
  logRequest('群聊区兜底', shoutboxUrl);
  const { body: shoutboxBody } = await util.requestPromise({ url: shoutboxUrl, headers }, true);
  if (/Bad Request/i.test(shoutboxBody)) {
    throw new Error('群聊区请求失败 (Bad Request)，请检查 Cookie 或稍后重试');
  }
  const items = parseShoutboxPromotions(shoutboxBody, getMaximum(setting));
  logger.info('[u2-rss] 群聊区兜底响应: count=', items.length);
  return items;
};

const fetchPromotionSummaryByApi = async function (setting, torrentId) {
  const kysdDomain = normalizeDomain(setting.kysdDomain);
  if (!setting.uid || !setting.apiToken) {
    return null;
  }
  const url = `${kysdDomain}/api/v2/promotions/summary?torrent_id=${torrentId}&valid_uid=${encodeURIComponent(setting.uid)}`;
  logRequest('魔法 API 叠加倍率', url, `torrentId=${torrentId}`);
  const { body } = await util.requestPromise({
    url,
    headers: {
      Authorization: `Bearer ${setting.apiToken}`
    },
    json: true
  });
  const summary = body?.data?.summary;
  if (!summary?.ratio) {
    logger.info('[u2-rss] 魔法 API 叠加倍率响应: torrentId=', torrentId, 'empty');
    return null;
  }
  const ratio = parseRatio(summary.ratio);
  logger.info('[u2-rss] 魔法 API 叠加倍率响应: torrentId=', torrentId, 'ratio=', summary.ratio);
  return ratio;
};

const fetchTorrentDetailByApi = async function (setting, torrentId) {
  const kysdDomain = normalizeDomain(setting.kysdDomain);
  const summaryRatio = await fetchPromotionSummaryByApi(setting, torrentId);
  if (!summaryRatio || summaryRatio.upRate == null) {
    return null;
  }
  const url = `${kysdDomain}/api/v2/torrents/${torrentId}`;
  logRequest('魔法 API 种子详情', url, `torrentId=${torrentId}`);
  const { body } = await util.requestPromise({
    url,
    headers: {
      Authorization: `Bearer ${setting.apiToken}`
    },
    json: true
  });
  const torrent = body?.data?.torrent || body?.torrent;
  if (!torrent) {
    logger.info('[u2-rss] 魔法 API 种子详情响应: torrentId=', torrentId, 'empty');
    return null;
  }
  logger.info('[u2-rss] 魔法 API 种子详情响应: torrentId=', torrentId, 'title=', torrent.title || torrent.torrent_name || torrent.torrentName || '-');
  return {
    torrentName: torrent.title || torrent.torrent_name || torrent.torrentName || '',
    subtitle: torrent.subtitle || torrent.torrent_subtitle || '',
    category: torrent.category || torrent.torrent_type || '',
    size: torrent.torrent_size || torrent.torrentSize || 0,
    seeders: torrent.seeders || 0,
    pubTime: torrent.uploaded_at || torrent.uploadedAt,
    upRate: summaryRatio.upRate,
    downRate: summaryRatio.downRate
  };
};

const fetchTorrentDetailByCookie = async function (setting, torrentId) {
  const webDomain = normalizeDomain(setting.webDomain);
  const url = `${webDomain}/details.php?id=${torrentId}&hits=1`;
  logRequest('种子详情页(Cookie)', url, `torrentId=${torrentId}`);
  const { body } = await util.requestPromise({
    url,
    headers: {
      cookie: setting.cookie,
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
    }
  }, true);
  const dom = new JSDOM(body, { url });
  const document = dom.window.document;
  const torrentName = document.querySelector('td#outer>h1#top')?.textContent?.trim() || '';
  let subtitle = '';
  for (const td of document.querySelectorAll('td.rowhead')) {
    if (/副标题|副標題/.test(td.textContent || '')) {
      subtitle = (td.nextElementSibling?.textContent || '').trim();
      break;
    }
  }
  let infoElm = null;
  for (const td of document.querySelectorAll('td.rowhead')) {
    if (/基本資訊|基本信息/.test(td.textContent || '')) {
      infoElm = td.nextElementSibling;
      break;
    }
  }
  let sizeText = '';
  let torrentType = '';
  if (infoElm) {
    for (const b of infoElm.querySelectorAll('b')) {
      if (/大小/.test(b.textContent || '')) {
        sizeText = (b.nextSibling && b.nextSibling.textContent) || '';
      }
      if (/類型|类型/.test(b.textContent || '')) {
        torrentType = (b.nextSibling && b.nextSibling.textContent) || '';
      }
    }
  }
  let uploadTimeElm = null;
  if (infoElm) {
    for (const b of infoElm.querySelectorAll('b')) {
      if (/發佈時間|发布时间|發布時間/.test(b.textContent || '')) {
        uploadTimeElm = b.nextElementSibling;
        break;
      }
    }
  }
  uploadTimeElm = uploadTimeElm || infoElm?.querySelector('time');
  const peercountElm = document.querySelector('div#peercount');
  let seedersText = '0';
  if (peercountElm) {
    for (const b of peercountElm.querySelectorAll('b')) {
      if (/做种者|做種者/.test(b.textContent || '')) {
        seedersText = b.textContent || '0';
        break;
      }
    }
  }
  const rate = parseTorrentRateFromDocument(document);
  const result = {
    torrentName,
    subtitle,
    category: (torrentType || '').trim(),
    size: parseSizeToBytes(sizeText),
    seeders: +String(seedersText).replace(/[^\d]/g, '') || 0,
    pubTime: uploadTimeElm?.getAttribute('title') || uploadTimeElm?.textContent || '',
    upRate: rate.upRate,
    downRate: rate.downRate
  };
  logger.info('[u2-rss] 种子详情页(Cookie)响应: torrentId=', torrentId, 'title=', result.torrentName || '-', 'size=', result.size, 'seeders=', result.seeders, 'ratio=', formatStackedRatio(rate.upRate, rate.downRate));
  return result;
};

const getCachedTorrentDetail = async function (torrentId) {
  const raw = await redis.get(`${DETAIL_CACHE_PREFIX}${torrentId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const setCachedTorrentDetail = async function (torrentId, detail) {
  if (!detail) return;
  await redis.setWithExpire(`${DETAIL_CACHE_PREFIX}${torrentId}`, JSON.stringify(detail), DETAIL_CACHE_TTL);
};

const fetchTorrentDetail = async function (setting, torrentId) {
  const cached = await getCachedTorrentDetail(torrentId);
  if (cached) {
    logger.info('[u2-rss] 使用缓存种子详情: torrentId=', torrentId);
    return cached;
  }

  let detail = null;
  const useApi = !!(setting.preferApi && setting.apiToken);
  if (useApi) {
    try {
      detail = await fetchTorrentDetailByApi(setting, torrentId);
    } catch (e) {
      logger.warn('[u2-rss] API 获取种子详情失败:', torrentId, e.message);
    }
  }
  if (setting.cookie && !detail) {
    try {
      detail = await fetchTorrentDetailByCookie(setting, torrentId);
    } catch (e) {
      logger.warn('[u2-rss] Cookie 获取种子详情失败:', torrentId, e.message);
    }
  } else if (detail) {
    logger.info('[u2-rss] API 种子详情已足够, 跳过 Cookie 详情: torrentId=', torrentId);
  }

  if (detail) {
    await setCachedTorrentDetail(torrentId, detail);
  }
  return detail;
};

const enrichPromotion = async function (setting, item) {
  const webDomain = normalizeDomain(setting.webDomain);
  const detail = await fetchTorrentDetail(setting, item.torrentId);
  const fallbackRatio = parseRatio(item.ratio);
  const upRate = detail?.upRate ?? fallbackRatio.upRate;
  const downRate = detail?.downRate ?? fallbackRatio.downRate;
  const createdMoment = item.createdTime ? moment(item.createdTime) : moment();
  const pubMoment = detail?.pubTime ? moment(detail.pubTime) : createdMoment;
  const torrentName = (detail?.torrentName || item.torrentName || '').trim();
  const subtitle = (detail?.subtitle || '').trim();
  const category = (detail?.category || '').trim();
  return {
    ...item,
    torrentName: torrentName || item.torrentName,
    subtitle,
    category,
    upRate,
    downRate,
    ratio: formatStackedRatio(upRate, downRate) || item.ratio,
    size: detail?.size || 0,
    seeders: detail?.seeders || 0,
    pubTime: pubMoment.isValid() ? pubMoment.unix() : moment().unix(),
    link: `${webDomain}/details.php?id=${item.torrentId}`,
    downloadUrl: setting.passkey ? `${webDomain}/download.php?id=${item.torrentId}&passkey=${setting.passkey}` : `${webDomain}/download.php?id=${item.torrentId}`,
    guid: `u2-${item.promotionId || item.torrentId}-${item.torrentId}`
  };
};

const shouldIncludePromotion = function (setting, item) {
  if (setting.promotionType && item.promotionType !== setting.promotionType) {
    return false;
  }
  if (setting.forAllOnly && item.forUserName && !/所有人/.test(String(item.forUserName).replace(/\[\/i\]|\[i\]/g, ''))) {
    return false;
  }
  if ((setting.ignoreUserNames || []).includes(item.userName)) {
    return false;
  }
  return true;
};

const shouldIncludeDetail = function (setting, item) {
  if (item.upRate != null && item.upRate < +setting.minUpRate) {
    return false;
  }
  if (item.downRate != null && item.downRate > +setting.maxDownRate) {
    return false;
  }
  if (+setting.torrentMinSize > 0 && item.size > 0 && item.size < +setting.torrentMinSize) {
    return false;
  }
  if (+setting.torrentMaxSize > 0 && item.size > 0 && item.size > +setting.torrentMaxSize) {
    return false;
  }
  if (+setting.maxSeeders > 0 && item.seeders > +setting.maxSeeders) {
    return false;
  }
  return true;
};

const shouldInclude = function (setting, item) {
  return shouldIncludePromotion(setting, item) && shouldIncludeDetail(setting, item);
};

const buildRssXml = function (setting, items) {
  const webDomain = normalizeDomain(setting.webDomain);
  const channelTitle = setting.alias || 'U2 魔法 RSS';
  const now = moment().utcOffset(8).format('ddd, DD MMM YYYY HH:mm:ss ZZ');
  const rows = items.map(item => {
    const titleParts = [];
    if (item.category) titleParts.push(`[${item.category}]`);
    titleParts.push(item.torrentName || `Torrent #${item.torrentId}`);
    if (item.subtitle) titleParts.push(item.subtitle);
    titleParts.push(`| 魔法使: ${item.userName || '-'} | UP ${item.upRate ?? '?'} / DN ${item.downRate ?? '?'}`);
    const title = titleParts.join('');
    const description = [
      `魔法使: ${item.userName || '-'}`,
      `类型: ${item.promotionType || '-'}`,
      `倍率: ${formatStackedRatio(item.upRate, item.downRate) || item.ratio || '-'}`,
      `做种: ${item.seeders || 0}`,
      `大小: ${formatSizeText(item.size)}`,
      item.createdTime ? `魔法时间: ${item.createdTime}` : '',
      item.expirationTime ? `到期时间: ${item.expirationTime}` : '',
      `<br /><a href="${item.link}">查看详情</a>`
    ].filter(Boolean).join('<br />');
    const pubDate = moment.unix(item.pubTime).utcOffset(8).format('ddd, DD MMM YYYY HH:mm:ss ZZ');
    const commentsUrl = `${item.link}&cmtpage=0#startcomments`;
    const host = webDomain.replace(/^https?:\/\//i, '').split('/')[0] || 'u2.dmhy.org';
    return [
      '<item>',
      `\t\t<title>${wrapCdata(title)}</title>`,
      `\t\t<link>${escapeXml(item.link)}</link>`,
      `\t\t<description>${wrapCdata(description)}</description>`,
      `\t\t<author>${escapeXml(`${item.userName || 'anonymous'}@${host} (${item.userName || 'anonymous'})`)}</author>`,
      item.category ? `\t\t<category domain="${escapeXml(`${webDomain}/torrents.php`)}">${wrapCdata(item.category)}</category>` : '',
      `\t\t<comments>${wrapCdata(commentsUrl)}</comments>`,
      `\t\t<enclosure url="${escapeXml(item.downloadUrl)}" length="${item.size || 0}" type="application/x-bittorrent" />`,
      `\t\t<guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
      `\t\t<pubDate>${escapeXml(pubDate)}</pubDate>`,
      '\t</item>'
    ].filter(Boolean).join('\n');
  }).join('\n');
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<rss version="2.0">',
    '<channel>',
    `\t\t<title>${escapeXml(channelTitle)}</title>`,
    `\t\t<link>${wrapCdata(webDomain)}</link>`,
    `\t\t<description>${wrapCdata(`${channelTitle} - U2 魔法 RSS by Vertex`)}</description>`,
    '\t\t<language>zh-cn</language>',
    `\t\t<copyright>Copyright (c) U2 ${moment().format('YYYY')}, all rights reserved</copyright>`,
    `\t\t<pubDate>${escapeXml(now)}</pubDate>`,
    '\t\t<generator>Vertex U2 RSS Generator</generator>',
    `\t\t<docs>${wrapCdata('http://www.rssboard.org/rss-specification')}</docs>`,
    '\t\t<ttl>60</ttl>',
    rows,
    '</channel>',
    '</rss>'
  ].join('\n');
};

const getPromotions = async function (setting) {
  let promotions = [];
  let source = 'api';
  const maximum = getMaximum(setting);
  logger.info('[u2-rss] 开始获取魔法列表: preferApi=', setting.preferApi, 'uid=', setting.uid || '-', 'maximum=', maximum);
  if (canUseApi(setting)) {
    try {
      promotions = await fetchPromotionsFromApi(setting);
      logger.info('[u2-rss] 魔法 API 获取成功: count=', promotions.length);
    } catch (e) {
      logger.warn('[u2-rss] 魔法 API 失败, 尝试群聊区兜底:', e.message);
      promotions = await fetchPromotionsFromShoutbox(setting);
      source = 'shoutbox';
    }
  } else {
    logger.info('[u2-rss] 跳过魔法 API, 使用群聊区兜底');
    promotions = await fetchPromotionsFromShoutbox(setting);
    source = 'shoutbox';
  }
  logger.info('[u2-rss] 魔法列表获取完成: source=', source, 'count=', promotions.length);
  return { promotions, source };
};

const generateFeed = async function (setting, options = {}) {
  if (!setting.enable) {
    throw new Error('U2 RSS 未启用');
  }
  const cacheKey = `vertex:u2-rss:feed:${setting.rssToken}`;
  const useFeedCache = !options.skipCache;
  if (useFeedCache) {
    const cache = await redis.get(cacheKey);
    if (cache) {
      const count = (cache.match(/<item>/g) || []).length;
      logger.info('[u2-rss] 使用订阅 Feed 缓存: count=', count, 'ttlSec=', FEED_CACHE_TTL);
      return { xml: cache, cached: true, source: 'cache', count };
    }
  } else {
    logger.info('[u2-rss] 预览模式: 跳过 Feed 缓存读取');
  }
  logger.info('[u2-rss] 开始生成 Feed, detailConcurrency=', DETAIL_CONCURRENCY);
  const { promotions, source } = await getPromotions(setting);
  const needDetailFilter = +setting.torrentMinSize > 0 || +setting.torrentMaxSize > 0 || +setting.maxSeeders > 0;
  const candidates = promotions.filter((promotion) => shouldIncludePromotion(setting, promotion));
  const skippedBeforeDetail = promotions.length - candidates.length;
  logger.info('[u2-rss] 列表预过滤: raw=', promotions.length, 'candidate=', candidates.length, 'skipped=', skippedBeforeDetail, 'needDetailFilter=', needDetailFilter);

  const enrichedItems = await mapPool(candidates, DETAIL_CONCURRENCY, async (promotion) => {
    logger.info('[u2-rss] 处理魔法项: torrentId=', promotion.torrentId, 'name=', promotion.torrentName || '-', 'source=', promotion.source || source);
    try {
      return await enrichPromotion(setting, promotion);
    } catch (e) {
      logger.warn('[u2-rss] 处理魔法项失败:', promotion.torrentId, e.message);
      return null;
    }
  });

  const enriched = [];
  let filteredAfterDetail = 0;
  for (const item of enrichedItems) {
    if (!item) continue;
    if (shouldIncludeDetail(setting, item)) {
      enriched.push(item);
    } else {
        filteredAfterDetail += 1;
        logger.info('[u2-rss] 详情后过滤: torrentId=', item.torrentId, 'up=', item.upRate, 'down=', item.downRate, 'size=', item.size, 'seeders=', item.seeders);
    }
  }

  const xml = buildRssXml(setting, enriched);
  if (useFeedCache) {
    await redis.setWithExpire(cacheKey, xml, FEED_CACHE_TTL);
    logger.info('[u2-rss] 已写入订阅 Feed 缓存: ttlSec=', FEED_CACHE_TTL);
  } else {
    logger.info('[u2-rss] 预览模式: 不写入 Feed 缓存');
  }
  logger.info('[u2-rss] Feed 生成完成: source=', source, 'included=', enriched.length, 'filteredBeforeDetail=', skippedBeforeDetail, 'filteredAfterDetail=', filteredAfterDetail);
  return { xml, cached: false, source, count: enriched.length, items: enriched.slice(0, 20) };
};

const maskSecret = function (value) {
  if (!value) return '';
  const str = String(value);
  if (str.length <= 6) return '***';
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
};

const isSecretUnchanged = function (submitted, actual) {
  if (!actual) return !submitted;
  if (submitted === actual) return true;
  if (submitted === '***') return true;
  if (submitted === maskSecret(actual)) return true;
  return false;
};

const getPublicSetting = function (setting) {
  return {
    ...setting,
    apiToken: maskSecret(setting.apiToken),
    cookie: maskSecret(setting.cookie),
    passkey: maskSecret(setting.passkey)
  };
};

const buildRssUrl = function (setting, req) {
  const proto = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host || 'localhost';
  return `${proto}://${host}/api/openapi/${setting.rssToken}/u2-rss`;
};

exports.loadSetting = loadSetting;
exports.saveSetting = saveSetting;
exports.generateFeed = generateFeed;
exports.getPublicSetting = getPublicSetting;
exports.maskSecret = maskSecret;
exports.isSecretUnchanged = isSecretUnchanged;
exports.buildRssUrl = buildRssUrl;
exports.parseRatio = parseRatio;
