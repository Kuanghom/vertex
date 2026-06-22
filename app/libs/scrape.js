const util = require('./util');
const redis = require('./redis');
const logger = require('./logger');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const getBody = async function (url, cookie) {
  let body;
  const cache = await redis.get(`vertex:scrape:${url}`);
  if (cache) {
    body = cache;
  } else {
    body = (await util.requestPromise({
      url,
      headers: {
        cookie
      }
    }, true)).body;
    await redis.setWithExpire(`vertex:scrape:${url}`, body, 40);
  }
  return body;
};

const getDocument = async function (url, cookie) {
  const body = await getBody(url, cookie);
  const dom = new JSDOM(body);
  return dom.window.document;
};

const assertLoggedIn = function (d) {
  const body = d.body.innerHTML;
  if (body.indexOf('必须在登录后才能访问') !== -1 || body.indexOf('用户名：') !== -1 || body.indexOf('login.php') !== -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
};

const formatLogArgs = function (args) {
  return args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
};

const createConsole = function (logs) {
  const push = (level, args) => {
    const message = formatLogArgs(args);
    logs.push({ level, message });
    if (level === 'error') {
      logger.error('[scrape]', message);
    } else if (level === 'warn') {
      logger.warn('[scrape]', message);
    } else {
      logger.info('[scrape]', message);
    }
  };
  return {
    log: (...args) => push('log', args),
    info: (...args) => push('info', args),
    warn: (...args) => push('warn', args),
    error: (...args) => push('error', args),
    debug: (...args) => push('debug', args)
  };
};

const evalScrapeFunction = function (scriptCode) {
  // eslint-disable-next-line no-eval
  let fn = eval(scriptCode);
  if (typeof fn !== 'function') {
    // eslint-disable-next-line no-eval
    fn = eval(`(${scriptCode})`);
  }
  if (typeof fn !== 'function') {
    throw new Error('脚本必须返回 async function');
  }
  return fn;
};

const buildScrapeContext = async function (url, cookie, logs, skipCache = false) {
  let body;
  if (skipCache) {
    body = (await util.requestPromise({
      url,
      headers: {
        cookie
      }
    }, true)).body;
  } else {
    body = await getBody(url, cookie);
  }
  const dom = new JSDOM(body);
  const host = new URL(url).host;
  return {
    url,
    cookie,
    host,
    body,
    document: dom.window.document,
    logger,
    util,
    console: createConsole(logs)
  };
};

const getScrapeScripts = function (host, type) {
  const scriptDir = path.join(__dirname, '../data/script');
  if (!fs.existsSync(scriptDir)) return [];
  return fs.readdirSync(scriptDir)
    .filter(file => path.extname(file) === '.json')
    .map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(scriptDir, file), { encoding: 'utf-8' }));
      } catch (e) {
        logger.error('读取抓取扩展脚本失败:', file, e.message);
        return null;
      }
    })
    .filter(Boolean)
    .filter(script => script.enable && script.scriptType === 'scrape')
    .filter(script => (script.siteHost || '').split(',').map(i => i.trim().toLowerCase()).indexOf(host.toLowerCase()) !== -1)
    .filter(script => !!script[`${type}Script`]);
};

const executeScrapeFunction = async function (fn, context) {
  const originalConsole = global.console;
  global.console = context.console;
  try {
    return await fn(context);
  } finally {
    global.console = originalConsole;
  }
};

const runScrapeScript = async function (type, url, cookie) {
  const host = new URL(url).host;
  const scripts = getScrapeScripts(host, type);
  if (scripts.length === 0) return null;
  const script = scripts[0];
  logger.info('使用抓取扩展脚本:', script.alias || script.id, host, type, url);
  const logs = [];
  const context = await buildScrapeContext(url, cookie, logs, false);
  const fn = evalScrapeFunction(script[`${type}Script`]);
  const result = !!await executeScrapeFunction(fn, context);
  logger.info('抓取扩展脚本结果:', script.alias || script.id, host, type, result);
  return result;
};

const debugScrapeScript = async function (type, url, cookie, scriptCode) {
  if (!scriptCode || !scriptCode.trim()) {
    throw new Error('脚本内容为空');
  }
  const logs = [];
  const context = await buildScrapeContext(url, cookie, logs, true);
  const fn = evalScrapeFunction(scriptCode);
  let result;
  try {
    result = !!await executeScrapeFunction(fn, context);
  } catch (e) {
    context.console.error(e.message || String(e));
    throw e;
  }
  return {
    result,
    logs
  };
};

const _free = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('#top font[class], #top span[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};

// cookie = apikey
const _freeMTeam = async function (url, cookie) {
  const tid = url.match(/\/(\d+)/)[1];
  // const host = new URL(url).host;
  const { body } = await util.requestPromise({
    url: 'https://api.m-team.cc/api/torrent/detail',
    method: 'POST',
    headers: {
      'x-api-key': cookie
    },
    formData: {
      id: tid
    },
    json: true
  });
  if (!body.data) {
    logger.error(body);
    throw new Error('疑似登录状态失效, 请检查 Api Key');
  }
  return body.data.status?.discount.indexOf('FREE') !== -1;
};

const _freeOpencd = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('div[class=title] img[class]');
  return state && ['pro_free', 'pro_free2up'].indexOf(state.className) !== -1;
};

// eslint-disable-next-line no-unused-vars
const _freeHDChina = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const tid = url.match(/id=(\d*)/)[1];
  const csrf = d.querySelector('meta[name=x-csrf]').content;
  const promotion = await util.requestPromise({
    url: 'https://hdchina.org/ajax_promotion.php',
    method: 'POST',
    headers: {
      cookie
    },
    formData: {
      'ids[]': tid,
      csrf
    },
    json: true
  });
  return promotion.body.message[tid].sp_state.indexOf('pro_free') !== -1 || promotion.body.message[tid].sp_state.indexOf('pro_twoupfree') !== -1;
};

const _freeToTheGlory = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('img[src="/pic/ico_free.gif"][class="topic"]');
  return state;
};

const _freeDmhy = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('td[valign=top] img[class=pro_free2up]') ||
    d.querySelector('td[valign=top] img[class=pro_free]') ||
    (d.querySelector('td[valign=top] img[class=arrowdown]') && d.querySelector('td[valign=top] img[class=arrowdown]').nextSibling.innerHTML === '0.00X');
  return state;
};

const _freeHaresClub = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('b font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};

const _freeHDBits = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('span[class="tag freeleech"]');
  return state;
};

const _freeHDArea = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('h1#top font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};

const _freeByrPT = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('#share .free');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};

const _freeHHanClub = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('.promotion-tag');
  return state && (state.className || '').includes('free');
};

const _freeHUDBT = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('div[class=minor-list] img[class=free]') ||
    d.querySelector('div[class=minor-list] img[class=twoupfree]');
  return state;
};

const _freePuTao = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('b font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};

const _freeBitPorn = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = Array.from(d.querySelectorAll('span.stic2')).some(el => el.textContent.trim() === '2X Free' || el.textContent.trim() === 'Free');
  return state;
};

const _freeHDCity = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('font.free') ||
    d.querySelector('font.twoupfree');
  return state;
};

const _freeLuminance = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('nav_userinfo') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('img[alt="Freeleech"]');
  return state;
};

const _freeDepthStudio = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);
  const state = d.querySelector('.details-title font.free, .details-title font.twoupfree, #top font.free, #top font.twoupfree');
  const globalFree = d.body.innerHTML.indexOf('全站 [Free] 生效中') !== -1;
  return state || globalFree;
};

const freeWrapper = {
  'pt.btschool.club': _free,
  'club.hares.top': _freeHaresClub,
  'hdhome.org': _free,
  'springsunday.net': _free,
  'hdsky.me': _free,
  'hdsky.my': _free,
  'ourbits.club': _free,
  'chdbits.co': _free,
  'ptchdbits.co': _free,
  'audiences.me': _free,
  'www.hddolby.com': _free,
  'pthome.net': _free,
  'pt.soulvoice.club': _free,
  'et8.org': _free,
  'hdfans.org': _free,
  'www.nicept.net': _free,
  'discfan.net': _free,
  'piggo.me': _free,
  'hdatmos.club': _free,
  'pt.msg.vg': _free,
  'sharkpt.net': _free,
  'azusa.wiki': _free,
  'kamept.com': _free,
  'pt.eastgame.org': _free,
  'pt.0ff.cc': _free,
  'wintersakura.net': _free,
  'open.cd': _freeOpencd,
  'www.open.cd': _freeOpencd,
  'totheglory.im': _freeToTheGlory,
  'u2.dmhy.org': _freeDmhy,
  'hdbits.org': _freeHDBits,
  'www.hdarea.co': _freeHDArea,
  'www.hdarea.club': _freeHDArea,
  'hdarea.club': _freeHDArea,
  'byr.pt': _freeByrPT,
  'hhanclub.net': _freeHHanClub,
  'zeus.hamsters.space': _freeHUDBT,
  'hudbt.hust.edu.cn': _freeHUDBT,
  'bitporn.eu': _freeBitPorn,
  'pt.sjtu.edu.cn': _freePuTao,
  'hdcity.leniter.org': _freeHDCity,
  'hdcity.city': _freeHDCity,
  'www.empornium.is': _freeLuminance,
  'www.empornium.sx': _freeLuminance,
  'www.pixelcove.me': _freeLuminance,
  'www.cathode-ray.tube': _freeLuminance,
  'dstudio.me': _freeDepthStudio
};

const _hr = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const hr = d.querySelector('img[class=hitandrun]');
  return hr;
};

const _hrCHDBits = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登陆状态失效, 请检查 Cookie');
  }
  const hr5 = d.body.innerHTML.indexOf('<b>H&amp;R:&nbsp;</b>5day</td></tr>');
  const hr3 = d.body.innerHTML.indexOf('<b>H&amp;R:&nbsp;</b>3day</td></tr>');
  return hr3 !== -1 || hr5 !== -1;
};

const _hrTheGlory = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const hr = d.querySelector('img[src="/pic/hit_run.gif"][alt="Hit & Run"]');
  return hr;
};

const _hrDepthStudio = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);
  const hr = d.querySelector('img.hitandrun, img[alt="H&R"], img[title="H&R"]');
  return hr;
};

const hrWrapper = {
  'www.hddolby.com': _hr,
  'hdhome.org': _hr,
  'ourbits.club': _hr,
  'piggo.me': _hr,
  'hhanclub.net': _hr,
  'sharkpt.net': _hr,
  'totheglory.im': _hrTheGlory,
  'chdbits.co': _hrCHDBits,
  'ptchdbits.co': _hrCHDBits,
  'audiences.me': _hr,
  'dstudio.me': _hrDepthStudio
};

exports.free = async (url, cookie) => {
  const host = new URL(url).host;
  const customResult = await runScrapeScript('free', url, cookie);
  if (customResult !== null) return customResult;
  let result;
  if (host.includes('m-team')) {
    result = await _freeMTeam(url, cookie);
    logger.info('抓取免费结果:', host, url, result ? '免费' : '非免费');
    return result;
  }
  if (freeWrapper[host]) {
    result = await freeWrapper[host](url, cookie);
    logger.info('抓取免费结果:', host, url, result ? '免费' : '非免费');
    return result;
  }
  throw new Error(`暂不支持 ${host} 抓取免费, 请检查后重试.`);
};

exports.debugScrapeScript = debugScrapeScript;

exports.hr = async (url, cookie) => {
  const host = new URL(url).host;
  const customResult = await runScrapeScript('hr', url, cookie);
  if (customResult !== null) return customResult;
  if (hrWrapper[host]) {
    const result = await hrWrapper[host](url, cookie);
    logger.info('抓取 HR 结果:', host, url, result ? 'HR' : '非 HR');
    return result;
  }
  throw new Error(`暂不支持 ${host} 抓取 HR, 请检查后重试.`);
};
