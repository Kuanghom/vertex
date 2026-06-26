const util = require('./util');
const redis = require('./redis');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PROMO_LABELS = {
  free: '免费',
  '2xfree': '2X免费',
  '2x': '2X',
  '50%': '50%',
  '30%': '30%',
  '2x50%': '2X50%',
  normal: '普通'
};

const PROMO_TYPES = ['free', '2xfree', '2x', '50%', '30%', '2x50%'];

const TEMPLATE_SUPPORT = {
  nexusphp: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  mteam: ['free', '50%', '30%'],
  opencd: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  ttg: ['free', '30%', '50%'],
  u2: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hdbits: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hdarea: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  byr: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hhanclub: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hudbt: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  putao: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hares: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  bitporn: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  hdcity: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  luminance: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  dstudio: ['free', '2xfree', '2x', '50%', '30%', '2x50%'],
  custom: PROMO_TYPES
};

const HOST_TEMPLATE = {
  'pt.btschool.club': 'nexusphp',
  'hdhome.org': 'nexusphp',
  'springsunday.net': 'nexusphp',
  'hdsky.me': 'nexusphp',
  'hdsky.my': 'nexusphp',
  'ourbits.club': 'nexusphp',
  'chdbits.co': 'nexusphp',
  'ptchdbits.co': 'nexusphp',
  'audiences.me': 'nexusphp',
  'www.hddolby.com': 'nexusphp',
  'pthome.net': 'nexusphp',
  'pt.soulvoice.club': 'nexusphp',
  'et8.org': 'nexusphp',
  'hdfans.org': 'nexusphp',
  'www.nicept.net': 'nexusphp',
  'discfan.net': 'nexusphp',
  'piggo.me': 'nexusphp',
  'hdatmos.club': 'nexusphp',
  'pt.msg.vg': 'nexusphp',
  'sharkpt.net': 'nexusphp',
  'azusa.wiki': 'nexusphp',
  'kamept.com': 'nexusphp',
  'pt.eastgame.org': 'nexusphp',
  'pt.0ff.cc': 'nexusphp',
  'wintersakura.net': 'nexusphp',
  'open.cd': 'opencd',
  'www.open.cd': 'opencd',
  'totheglory.im': 'ttg',
  'u2.dmhy.org': 'u2',
  'hdbits.org': 'hdbits',
  'www.hdarea.co': 'hdarea',
  'www.hdarea.club': 'hdarea',
  'hdarea.club': 'hdarea',
  'byr.pt': 'byr',
  'hhanclub.net': 'hhanclub',
  'zeus.hamsters.space': 'hudbt',
  'hudbt.hust.edu.cn': 'hudbt',
  'bitporn.eu': 'bitporn',
  'pt.sjtu.edu.cn': 'putao',
  'hdcity.leniter.org': 'hdcity',
  'hdcity.city': 'hdcity',
  'www.empornium.is': 'luminance',
  'www.empornium.sx': 'luminance',
  'www.pixelcove.me': 'luminance',
  'www.cathode-ray.tube': 'luminance',
  'dstudio.me': 'dstudio',
  'club.hares.top': 'hares'
};

const NEXUSPHP_CLASS_MAP = {
  twouphalfdown: '2x50%',
  twoupfree: '2xfree',
  halfdown: '50%',
  thirtiedown: '30%',
  thirtypercent: '30%',
  twoup: '2x',
  free: 'free'
};

const normalizeScrapeCookie = function (url, cookie) {
  if (!cookie) return cookie;
  const host = new URL(url).host;
  if (host === 'u2.dmhy.org' && !String(cookie).includes('=')) {
    return `nexusphp_u2=${cookie}`;
  }
  return cookie;
};

const getU2PromoCell = function (d) {
  const promoImg = d.querySelector(
    'td.rowfollow img.pro_free, td.rowfollow img.pro_free2up, td.rowfollow img.pro_2up, ' +
    'td.rowfollow img.pro_50pctdown, td.rowfollow img.pro_30pctdown, td.rowfollow img.pro_50pctdown2up, ' +
    'td.rowfollow img.pro_custom'
  );
  if (promoImg) {
    return promoImg.closest('td.rowfollow');
  }
  const promoLink = d.querySelector('td.rowfollow a[href*="promotion.php?action=torrent"]');
  if (promoLink) {
    return promoLink.closest('td.rowfollow');
  }
  return null;
};

const parseU2Ratio = function (cell, className) {
  const img = cell.querySelector(`img.${className}`);
  if (!img) return null;
  const next = img.nextElementSibling;
  if (next && next.tagName === 'B') {
    const match = next.textContent.match(/([0.]+)X/i);
    return match ? parseFloat(match[1]) : null;
  }
  return null;
};

const parseU2CustomPromo = function (cell) {
  const up = parseU2Ratio(cell, 'arrowup');
  const down = parseU2Ratio(cell, 'arrowdown');
  if (down !== null && down <= 0) return 'free';
  if (up !== null && up >= 2 && down !== null && down >= 0.49 && down <= 0.51) return '2x50%';
  if (up !== null && up >= 2 && down !== null && down <= 0) return '2xfree';
  if (down !== null && down <= 0.3) return '30%';
  if (down !== null && down <= 0.5) return '50%';
  if (up !== null && up >= 2) return '2x';
  return 'normal';
};

const parseU2PromoFromCell = function (cell) {
  if (!cell) return 'normal';
  const classOrder = [
    ['pro_50pctdown2up', '2x50%'],
    ['pro_free2up', '2xfree'],
    ['pro_50pctdown', '50%'],
    ['pro_30pctdown', '30%'],
    ['pro_2up', '2x'],
    ['pro_free', 'free']
  ];
  for (const [cls, type] of classOrder) {
    if (cell.querySelector(`img.${cls}`)) return type;
  }
  if (cell.querySelector('img.pro_custom')) {
    return parseU2CustomPromo(cell);
  }
  const down = parseU2Ratio(cell, 'arrowdown');
  if (down !== null && down <= 0) return 'free';
  return 'normal';
};

const getBody = async function (url, cookie) {
  const _cookie = normalizeScrapeCookie(url, cookie);
  let body;
  const cache = await redis.get(`vertex:scrape:${url}`);
  if (cache) {
    body = cache;
  } else {
    body = (await util.requestPromise({
      url,
      headers: { cookie: _cookie }
    }, true)).body;
    await redis.setWithExpire(`vertex:scrape:${url}`, body, 40);
  }
  return body;
};

const getDocument = async function (url, cookie) {
  const body = await getBody(url, cookie);
  const dom = new JSDOM(body, { url });
  return dom.window.document;
};

const assertLoggedIn = function (d) {
  const body = d.body.innerHTML;
  if (body.indexOf('必须在登录后才能访问') !== -1 || body.indexOf('用户名：') !== -1 || body.indexOf('login.php') !== -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
};

const assertNexusLoggedIn = function (d) {
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
};

const normalizePromoType = function (value) {
  if (!value) return 'normal';
  const str = String(value).trim().toLowerCase();
  const alias = {
    '免费': 'free',
    '2x免费': '2xfree',
    '2xfree': '2xfree',
    '2x': '2x',
    '50%': '50%',
    '30%': '30%',
    '2x50%': '2x50%',
    '2x 50%': '2x50%',
    normal: 'normal',
    '普通': 'normal'
  };
  return alias[str] || alias[value] || (PROMO_TYPES.includes(str) ? str : 'normal');
};

const promoFromNexusClass = function (className) {
  return NEXUSPHP_CLASS_MAP[className] || 'normal';
};

const detectNexusPHP = async function (url, cookie, selector) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const state = d.querySelector(selector);
  return promoFromNexusClass(state?.className || '');
};

const detectMTeam = async function (url, cookie) {
  const tid = url.match(/\/(\d+)/)[1];
  const { body } = await util.requestPromise({
    url: 'https://api.m-team.cc/api/torrent/detail',
    method: 'POST',
    headers: { 'x-api-key': cookie },
    formData: { id: tid },
    json: true
  });
  if (!body.data) {
    throw new Error('疑似登录状态失效, 请检查 Api Key');
  }
  const discount = body.data.status?.discount || '';
  if (String(discount).indexOf('FREE') !== -1) return 'free';
  if (String(discount).indexOf('PERCENT_50') !== -1) return '50%';
  if (String(discount).indexOf('PERCENT_70') !== -1) return '30%';
  return 'normal';
};

const detectOpencd = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const map = {
    pro_50pctdown2up: '2x50%',
    pro_free2up: '2xfree',
    pro_50pctdown: '50%',
    pro_30pctdown: '30%',
    pro_2up: '2x',
    pro_free: 'free'
  };
  const state = d.querySelector('div[class=title] img[class]');
  return map[state?.className] || 'normal';
};

const detectTTG = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const icons = {
    'ico_free.gif': 'free',
    'ico_30.gif': '30%',
    'ico_half.gif': '50%'
  };
  for (const [icon, type] of Object.entries(icons)) {
    if (d.querySelector(`img.topic[src="/pic/${icon}"], img.checkable_IMG[src="/pic/${icon}"]`)) {
      return type;
    }
  }
  const html = d.body.innerHTML;
  if (/2X.*免费|不计上传.*免费/i.test(html)) return '2xfree';
  if (/仅计上传|2X.*上传/i.test(html)) return '2x';
  if (/2X.*50%|50%.*2X/i.test(html)) return '2x50%';
  return 'normal';
};

const detectU2 = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  return parseU2PromoFromCell(getU2PromoCell(d));
};

const detectHDBits = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const has = (cls) => !!d.querySelector(`span.tag.${cls}`);
  if (has('freeleech') && has('doubleup')) return '2xfree';
  if (has('halfleech') && has('doubleup')) return '2x50%';
  if (has('freeleech')) return 'free';
  if (has('halfleech')) return '50%';
  if (has('thirtyleech') || /30%/.test(d.body.innerHTML)) return '30%';
  if (has('doubleup')) return '2x';
  return 'normal';
};

const detectHHanClub = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const map = {
    '2x50': '2x50%',
    '2xfree': '2xfree',
    '50': '50%',
    '30': '30%',
    '2x': '2x',
    free: 'free'
  };
  for (const [suffix, type] of Object.entries(map)) {
    if (d.querySelector(`.promotion-tag-${suffix}, .promotion-tag.promotion-tag-${suffix}`)) {
      return type;
    }
  }
  const tag = d.querySelector('.promotion-tag');
  if (tag && (tag.className || '').includes('free')) return 'free';
  return 'normal';
};

const detectHUDBT = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const map = {
    twouphalfdown: '2x50%',
    twoupfree: '2xfree',
    halfdown: '50%',
    thirtiedown: '30%',
    thirtypercent: '30%',
    twoup: '2x',
    free: 'free'
  };
  for (const [cls, type] of Object.entries(map)) {
    if (d.querySelector(`div[class=minor-list] img[class=${cls}]`)) {
      return type;
    }
  }
  return 'normal';
};

const detectBitPorn = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertNexusLoggedIn(d);
  const texts = Array.from(d.querySelectorAll('span.stic2')).map(el => el.textContent.trim());
  const map = {
    '2X 50%': '2x50%',
    '2X Free': '2xfree',
    '50% Off': '50%',
    '50%': '50%',
    '30%': '30%',
    '2X': '2x',
    Free: 'free'
  };
  for (const text of texts) {
    if (map[text]) return map[text];
  }
  return 'normal';
};

const detectLuminance = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('nav_userinfo') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const alts = Array.from(d.querySelectorAll('img[alt]')).map(i => i.getAttribute('alt') || '');
  const has = (re) => alts.some(a => re.test(a));
  if (has(/Freeleech/i) && has(/Double|2x/i)) return '2xfree';
  if (has(/50%|Partial/i) && has(/Double|2x/i)) return '2x50%';
  if (has(/Freeleech/i)) return 'free';
  if (has(/50%|Partial Freeleech/i)) return '50%';
  if (has(/30%/i)) return '30%';
  if (has(/Double Upload|2x/i)) return '2x';
  return 'normal';
};

const detectDepthStudio = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);
  for (const [cls, type] of Object.entries(NEXUSPHP_CLASS_MAP)) {
    if (d.querySelector(`.details-title font.${cls}, #top font.${cls}`)) {
      return type;
    }
  }
  if (d.body.innerHTML.indexOf('全站 [Free] 生效中') !== -1) return 'free';
  return 'normal';
};

const TEMPLATE_DETECTORS = {
  nexusphp: (url, cookie) => detectNexusPHP(url, cookie, '#top font[class], #top span[class]'),
  mteam: detectMTeam,
  opencd: detectOpencd,
  ttg: detectTTG,
  u2: detectU2,
  hdbits: detectHDBits,
  hdarea: (url, cookie) => detectNexusPHP(url, cookie, 'h1#top font[class]'),
  byr: (url, cookie) => detectNexusPHP(url, cookie, '#share .free, #share font[class]'),
  hhanclub: detectHHanClub,
  hudbt: detectHUDBT,
  putao: (url, cookie) => detectNexusPHP(url, cookie, 'b font[class]'),
  hares: (url, cookie) => detectNexusPHP(url, cookie, 'b font[class]'),
  bitporn: detectBitPorn,
  hdcity: async function (url, cookie) {
    const d = await getDocument(url, cookie);
    assertNexusLoggedIn(d);
    for (const [cls, type] of Object.entries(NEXUSPHP_CLASS_MAP)) {
      if (d.querySelector(`font.${cls}`)) return type;
    }
    return 'normal';
  },
  luminance: detectLuminance,
  dstudio: detectDepthStudio
};

const resolveHostTemplate = function (host) {
  if (host.includes('m-team')) return 'mteam';
  return HOST_TEMPLATE[host] || null;
};

const getExtensionPromoConfig = function (host) {
  const scriptDir = path.join(__dirname, '../data/script');
  if (!fs.existsSync(scriptDir)) return null;
  const scripts = fs.readdirSync(scriptDir)
    .filter(file => path.extname(file) === '.json')
    .map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(scriptDir, file), { encoding: 'utf-8' }));
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .filter(script => script.enable && script.scriptType === 'scrape')
    .filter(script => (script.siteHost || '').split(',').map(i => i.trim().toLowerCase()).indexOf(host.toLowerCase()) !== -1);
  return scripts[0] || null;
};

exports.PROMO_LABELS = PROMO_LABELS;
exports.PROMO_TYPES = PROMO_TYPES;
exports.TEMPLATE_SUPPORT = TEMPLATE_SUPPORT;

exports.getHostTemplate = function (host) {
  const ext = getExtensionPromoConfig(host);
  if (ext?.promoTemplate) return ext.promoTemplate;
  return resolveHostTemplate(host);
};

exports.getPromoSupport = function (host) {
  const ext = getExtensionPromoConfig(host);
  if (ext?.promoScript) return [...PROMO_TYPES];
  if (ext?.promoTemplate) return TEMPLATE_SUPPORT[ext.promoTemplate] || [];
  const template = resolveHostTemplate(host);
  return template ? (TEMPLATE_SUPPORT[template] || []) : [];
};

exports.formatPromo = function (type) {
  const key = normalizePromoType(type);
  return {
    type: key,
    label: PROMO_LABELS[key] || key
  };
};

exports.detectByTemplate = async function (template, url, cookie) {
  const fn = TEMPLATE_DETECTORS[template];
  if (!fn) {
    throw new Error(`未知优惠检测模板: ${template}`);
  }
  return normalizePromoType(await fn(url, cookie));
};

exports.detect = async function (url, cookie, customFn) {
  const host = new URL(url).host;
  logger.info('[scrape] 开始检测优惠:', host, url);
  if (customFn) {
    const result = normalizePromoType(await customFn());
    logger.info('[scrape] 扩展脚本检测优惠结果:', host, url, result);
    return result;
  }
  const ext = getExtensionPromoConfig(host);
  if (ext?.promoScript) {
    throw new Error('扩展脚本优惠检测需由 scrape.js 执行');
  }
  if (ext?.promoTemplate && ext.promoTemplate !== 'custom') {
    const result = await exports.detectByTemplate(ext.promoTemplate, url, cookie);
    logger.info('[scrape] 扩展模板检测优惠结果:', host, ext.promoTemplate, url, result);
    return result;
  }
  const template = resolveHostTemplate(host);
  if (!template) {
    throw new Error(`暂不支持 ${host} 抓取优惠, 请在站点扩展中配置模板或脚本`);
  }
  const result = await exports.detectByTemplate(template, url, cookie);
  logger.info('[scrape] 内置模板检测优惠结果:', host, template, url, result);
  return result;
};

exports.matchTypes = function (promoType, types) {
  if (!types || types.length === 0) return true;
  return types.indexOf(normalizePromoType(promoType)) !== -1;
};

exports.normalizeScrapeCookie = normalizeScrapeCookie;
exports.getU2PromoCell = getU2PromoCell;
exports.parseU2PromoFromCell = parseU2PromoFromCell;
exports.getDocument = getDocument;
