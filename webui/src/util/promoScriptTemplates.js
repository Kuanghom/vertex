const NEXUSPHP_CLASS_MAP = [
  'const CLASS_MAP = {',
  '  twouphalfdown: \'2x50%\',',
  '  twoupfree: \'2xfree\',',
  '  halfdown: \'50%\',',
  '  thirtiedown: \'30%\',',
  '  thirtypercent: \'30%\',',
  '  twoup: \'2x\',',
  '  free: \'free\'',
  '};'
].join('\n');

const LOGIN_CHECK = [
  'if (document.body.innerHTML.indexOf(\'userdetails\') === -1) {',
  '  throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
  '}'
].join('\n');

const U2_FIND_CELL = [
  '  let cell = null;',
  '  const promoImg = document.querySelector(',
  '    \'td.rowfollow img.pro_free, td.rowfollow img.pro_free2up, td.rowfollow img.pro_2up, \' +',
  '    \'td.rowfollow img.pro_50pctdown, td.rowfollow img.pro_30pctdown, td.rowfollow img.pro_50pctdown2up, \' +',
  '    \'td.rowfollow img.pro_custom\'',
  '  );',
  '  if (promoImg) cell = promoImg.closest(\'td.rowfollow\');',
  '  if (!cell) {',
  '    const promoLink = document.querySelector(\'td.rowfollow a[href*="promotion.php?action=torrent"]\');',
  '    if (promoLink) cell = promoLink.closest(\'td.rowfollow\');',
  '  }'
].join('\n');

const BUILTIN_NOTE = [
  '// 未选择优惠模板时, scrape.js 会根据站点 Host 自动匹配内置规则',
  '// 下方为 NexusPHP 系通用参考脚本, 可按站点实际情况修改后使用',
  ''
].join('\n');

const CUSTOM_STUB = [
  'async ({ document, console }) => {',
  '  console.log(\'title:\', document.title);',
  '  // 返回优惠类型: free / 2xfree / 2x / 50% / 30% / 2x50% / normal',
  '  return \'normal\';',
  '}'
].join('\n');

const TEMPLATES = {
  nexusphp: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  const state = document.querySelector(\'#top font[class], #top span[class]\');',
    '  const type = state ? CLASS_MAP[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  mteam: [
    'async ({ url, cookie, util, console }) => {',
    '  const tid = url.match(/\\/(\\d+)/)[1];',
    '  const { body } = await util.requestPromise({',
    '    url: \'https://api.m-team.cc/api/torrent/detail\',',
    '    method: \'POST\',',
    '    headers: { \'x-api-key\': cookie },',
    '    formData: { id: tid },',
    '    json: true',
    '  });',
    '  if (!body.data) throw new Error(\'疑似登录状态失效, 请检查 Api Key\');',
    '  const discount = body.data.status?.discount || \'\';',
    '  let type = \'normal\';',
    '  if (String(discount).indexOf(\'FREE\') !== -1) type = \'free\';',
    '  else if (String(discount).indexOf(\'PERCENT_50\') !== -1) type = \'50%\';',
    '  else if (String(discount).indexOf(\'PERCENT_70\') !== -1) type = \'30%\';',
    '  console.log(\'discount:\', discount, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  opencd: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const map = {',
    '    pro_50pctdown2up: \'2x50%\',',
    '    pro_free2up: \'2xfree\',',
    '    pro_50pctdown: \'50%\',',
    '    pro_30pctdown: \'30%\',',
    '    pro_2up: \'2x\',',
    '    pro_free: \'free\'',
    '  };',
    '  const state = document.querySelector(\'div[class=title] img[class]\');',
    '  const type = state ? map[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  ttg: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const icons = {',
    '    \'ico_free.gif\': \'free\',',
    '    \'ico_30.gif\': \'30%\',',
    '    \'ico_half.gif\': \'50%\'',
    '  };',
    '  for (const [icon, type] of Object.entries(icons)) {',
    '  const sel = \'img.topic[src="/pic/\' + icon + \'"], img.checkable_IMG[src="/pic/\' + icon + \'"]\';',
    '    if (document.querySelector(sel)) {',
    '      console.log(\'promo icon:\', icon, \'type:\', type);',
    '      return type;',
    '    }',
    '  }',
    '  const html = document.body.innerHTML;',
    '  if (/2X.*免费|不计上传.*免费/i.test(html)) return \'2xfree\';',
    '  if (/仅计上传|2X.*上传/i.test(html)) return \'2x\';',
    '  if (/2X.*50%|50%.*2X/i.test(html)) return \'2x50%\';',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  u2: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    U2_FIND_CELL,
    '  const parseRatio = (cls) => {',
    '    if (!cell) return null;',
    '    const img = cell.querySelector(\'img.\' + cls);',
    '    if (!img) return null;',
    '    const next = img.nextElementSibling;',
    '    if (next && next.tagName === \'B\') {',
    '      const m = next.textContent.match(/([0.]+)X/i);',
    '      return m ? parseFloat(m[1]) : null;',
    '    }',
    '    return null;',
    '  };',
    '  if (!cell) {',
    '    console.log(\'promo cell not found\');',
    '    return \'normal\';',
    '  }',
    '  const classOrder = [',
    '    [\'pro_50pctdown2up\', \'2x50%\'],',
    '    [\'pro_free2up\', \'2xfree\'],',
    '    [\'pro_50pctdown\', \'50%\'],',
    '    [\'pro_30pctdown\', \'30%\'],',
    '    [\'pro_2up\', \'2x\'],',
    '    [\'pro_free\', \'free\']',
    '  ];',
    '  let type = \'normal\';',
    '  for (const [cls, promo] of classOrder) {',
    '    if (cell.querySelector(\'img.\' + cls)) { type = promo; break; }',
    '  }',
    '  if (type === \'normal\' && cell.querySelector(\'img.pro_custom\')) {',
    '    const up = parseRatio(\'arrowup\');',
    '    const down = parseRatio(\'arrowdown\');',
    '    if (down !== null && down <= 0) type = \'free\';',
    '    else if (up !== null && up >= 2 && down !== null && down >= 0.49 && down <= 0.51) type = \'2x50%\';',
    '    else if (up !== null && up >= 2 && down !== null && down <= 0) type = \'2xfree\';',
    '    else if (down !== null && down <= 0.3) type = \'30%\';',
    '    else if (down !== null && down <= 0.5) type = \'50%\';',
    '    else if (up !== null && up >= 2) type = \'2x\';',
    '  }',
    '  if (type === \'normal\') {',
    '    const down = parseRatio(\'arrowdown\');',
    '    if (down !== null && down <= 0) type = \'free\';',
    '  }',
    '  console.log(\'promo cell:\', cell, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  hdbits: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const has = (cls) => !!document.querySelector(\'span.tag.\' + cls);',
    '  let type = \'normal\';',
    '  if (has(\'freeleech\') && has(\'doubleup\')) type = \'2xfree\';',
    '  else if (has(\'halfleech\') && has(\'doubleup\')) type = \'2x50%\';',
    '  else if (has(\'freeleech\')) type = \'free\';',
    '  else if (has(\'halfleech\')) type = \'50%\';',
    '  else if (has(\'thirtyleech\') || /30%/.test(document.body.innerHTML)) type = \'30%\';',
    '  else if (has(\'doubleup\')) type = \'2x\';',
    '  console.log(\'promo type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  hdarea: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  const state = document.querySelector(\'h1#top font[class]\');',
    '  const type = state ? CLASS_MAP[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  byr: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  const state = document.querySelector(\'#share .free, #share font[class]\');',
    '  const type = state ? CLASS_MAP[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  hhanclub: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const map = { \'2x50%\': \'2x50\', \'2xfree\': \'2xfree\', \'50%\': \'50\', \'30%\': \'30\', \'2x\': \'2x\', free: \'free\' };',
    '  for (const [type, suffix] of Object.entries(map)) {',
    '    const sel = \'.promotion-tag-\' + suffix + \', .promotion-tag.promotion-tag-\' + suffix;',
    '    if (document.querySelector(sel)) {',
    '      console.log(\'promo tag:\', suffix, \'type:\', type);',
    '      return type;',
    '    }',
    '  }',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  hudbt: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const map = {',
    '    twouphalfdown: \'2x50%\',',
    '    twoupfree: \'2xfree\',',
    '    halfdown: \'50%\',',
    '    thirtiedown: \'30%\',',
    '    thirtypercent: \'30%\',',
    '    twoup: \'2x\',',
    '    free: \'free\'',
    '  };',
    '  for (const [cls, type] of Object.entries(map)) {',
    '    const sel = \'div[class=minor-list] img[class=\' + cls + \']\';',
    '    if (document.querySelector(sel)) {',
    '      console.log(\'promo class:\', cls, \'type:\', type);',
    '      return type;',
    '    }',
    '  }',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  putao: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  const state = document.querySelector(\'b font[class]\');',
    '  const type = state ? CLASS_MAP[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  hares: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  const state = document.querySelector(\'b font[class]\');',
    '  const type = state ? CLASS_MAP[state.className] || \'normal\' : \'normal\';',
    '  console.log(\'promo element:\', state, \'type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  bitporn: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const texts = Array.from(document.querySelectorAll(\'span.stic2\')).map(el => el.textContent.trim());',
    '  const map = {',
    '    \'2X 50%\': \'2x50%\',',
    '    \'2X Free\': \'2xfree\',',
    '    \'50% Off\': \'50%\',',
    '    \'50%\': \'50%\',',
    '    \'30%\': \'30%\',',
    '    \'2X\': \'2x\',',
    '    Free: \'free\'',
    '  };',
    '  for (const text of texts) {',
    '    if (map[text]) {',
    '      console.log(\'promo text:\', text, \'type:\', map[text]);',
    '      return map[text];',
    '    }',
    '  }',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  hdcity: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    NEXUSPHP_CLASS_MAP,
    '  for (const [cls, type] of Object.entries(CLASS_MAP)) {',
    '    if (document.querySelector(\'font.\' + cls)) {',
    '      console.log(\'promo class:\', cls, \'type:\', type);',
    '      return type;',
    '    }',
    '  }',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  luminance: [
    'async ({ document, console }) => {',
    '  if (document.body.innerHTML.indexOf(\'nav_userinfo\') === -1) {',
    '    throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
    '  }',
    '  const alts = Array.from(document.querySelectorAll(\'img[alt]\')).map(i => i.getAttribute(\'alt\') || \'\');',
    '  const has = (re) => alts.some(a => re.test(a));',
    '  let type = \'normal\';',
    '  if (has(/Freeleech/i) && has(/Double|2x/i)) type = \'2xfree\';',
    '  else if (has(/50%|Partial/i) && has(/Double|2x/i)) type = \'2x50%\';',
    '  else if (has(/Freeleech/i)) type = \'free\';',
    '  else if (has(/50%|Partial Freeleech/i)) type = \'50%\';',
    '  else if (has(/30%/i)) type = \'30%\';',
    '  else if (has(/Double Upload|2x/i)) type = \'2x\';',
    '  console.log(\'promo type:\', type);',
    '  return type;',
    '}'
  ].join('\n'),

  dstudio: [
    'async ({ document, console }) => {',
    '  if (document.body.innerHTML.indexOf(\'必须在登录后才能访问\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'用户名：\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'login.php\') !== -1) {',
    '    throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
    '  }',
    NEXUSPHP_CLASS_MAP,
    '  for (const [cls, type] of Object.entries(CLASS_MAP)) {',
    '    const sel = \'.details-title font.\' + cls + \', #top font.\' + cls;',
    '    if (document.querySelector(sel)) {',
    '      console.log(\'promo class:\', cls, \'type:\', type);',
    '      return type;',
    '    }',
    '  }',
    '  if (document.body.innerHTML.indexOf(\'全站 [Free] 生效中\') !== -1) return \'free\';',
    '  return \'normal\';',
    '}'
  ].join('\n'),

  custom: CUSTOM_STUB
};

const FREE_CUSTOM_STUB = [
  'async ({ document, console }) => {',
  '  console.log(\'title:\', document.title);',
  '  // 返回 true 表示免费',
  '  return false;',
  '}'
].join('\n');

const HR_CUSTOM_STUB = [
  'async ({ document, console }) => {',
  '  console.log(\'title:\', document.title);',
  '  // 返回 true 表示 H&R',
  '  return false;',
  '}'
].join('\n');

const NO_HR_STUB = [
  '// 该站点模板无内置 HR 检测',
  'async ({ document, console }) => {',
  '  return false;',
  '}'
].join('\n');

const HR_NEXUSPHP = [
  'async ({ document, console }) => {',
  LOGIN_CHECK,
  '  const hr = document.querySelector(\'img[class=hitandrun]\');',
  '  console.log(\'hr element:\', hr);',
  '  return !!hr;',
  '}'
].join('\n');

const FREE_TEMPLATES = {
  nexusphp: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'#top font[class], #top span[class]\');',
    '  const result = state && [\'free\', \'twoupfree\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  mteam: [
    'async ({ url, cookie, util, console }) => {',
    '  const tid = url.match(/\\/(\\d+)/)[1];',
    '  const { body } = await util.requestPromise({',
    '    url: \'https://api.m-team.cc/api/torrent/detail\',',
    '    method: \'POST\',',
    '    headers: { \'x-api-key\': cookie },',
    '    formData: { id: tid },',
    '    json: true',
    '  });',
    '  if (!body.data) throw new Error(\'疑似登录状态失效, 请检查 Api Key\');',
    '  const result = body.data.status?.discount.indexOf(\'FREE\') !== -1;',
    '  console.log(\'discount:\', body.data.status?.discount, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  opencd: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'div[class=title] img[class]\');',
    '  const result = state && [\'pro_free\', \'pro_free2up\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  ttg: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'img[src="/pic/ico_free.gif"][class="topic"]\');',
    '  console.log(\'free element:\', state);',
    '  return !!state;',
    '}'
  ].join('\n'),

  u2: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    U2_FIND_CELL,
    '  const parseRatio = (cls) => {',
    '    if (!cell) return null;',
    '    const img = cell.querySelector(\'img.\' + cls);',
    '    if (!img) return null;',
    '    const next = img.nextElementSibling;',
    '    if (next && next.tagName === \'B\') {',
    '      const m = next.textContent.match(/([0.]+)X/i);',
    '      return m ? parseFloat(m[1]) : null;',
    '    }',
    '    return null;',
    '  };',
    '  if (!cell) return false;',
    '  const classOrder = [',
    '    [\'pro_50pctdown2up\', \'2x50%\'],',
    '    [\'pro_free2up\', \'2xfree\'],',
    '    [\'pro_50pctdown\', \'50%\'],',
    '    [\'pro_30pctdown\', \'30%\'],',
    '    [\'pro_2up\', \'2x\'],',
    '    [\'pro_free\', \'free\']',
    '  ];',
    '  let type = \'normal\';',
    '  for (const [cls, promo] of classOrder) {',
    '    if (cell.querySelector(\'img.\' + cls)) { type = promo; break; }',
    '  }',
    '  if (type === \'normal\' && cell.querySelector(\'img.pro_custom\')) {',
    '    const up = parseRatio(\'arrowup\');',
    '    const down = parseRatio(\'arrowdown\');',
    '    if (down !== null && down <= 0) type = \'free\';',
    '    else if (down !== null && down <= 0.3) type = \'30%\';',
    '    else if (down !== null && down <= 0.5) type = \'50%\';',
    '  }',
    '  if (type === \'normal\') {',
    '    const down = parseRatio(\'arrowdown\');',
    '    if (down !== null && down <= 0) type = \'free\';',
    '  }',
    '  const result = type === \'free\' || type === \'2xfree\';',
    '  console.log(\'free type:\', type, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  hdbits: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'span[class="tag freeleech"]\');',
    '  console.log(\'free element:\', state);',
    '  return !!state;',
    '}'
  ].join('\n'),

  hdarea: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'h1#top font[class]\');',
    '  const result = state && [\'free\', \'twoupfree\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  byr: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'#share .free\');',
    '  const result = state && [\'free\', \'twoupfree\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  hhanclub: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'.promotion-tag\');',
    '  const result = state && (state.className || \'\').includes(\'free\');',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  hudbt: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'div[class=minor-list] img[class=free]\') ||',
    '    document.querySelector(\'div[class=minor-list] img[class=twoupfree]\');',
    '  console.log(\'free element:\', state);',
    '  return !!state;',
    '}'
  ].join('\n'),

  putao: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'b font[class]\');',
    '  const result = state && [\'free\', \'twoupfree\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  hares: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'b font[class]\');',
    '  const result = state && [\'free\', \'twoupfree\'].indexOf(state.className) !== -1;',
    '  console.log(\'free element:\', state, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  bitporn: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const result = Array.from(document.querySelectorAll(\'span.stic2\')).some(',
    '    el => el.textContent.trim() === \'2X Free\' || el.textContent.trim() === \'Free\'',
    '  );',
    '  console.log(\'free result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  hdcity: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const state = document.querySelector(\'font.free\') || document.querySelector(\'font.twoupfree\');',
    '  console.log(\'free element:\', state);',
    '  return !!state;',
    '}'
  ].join('\n'),

  luminance: [
    'async ({ document, console }) => {',
    '  if (document.body.innerHTML.indexOf(\'nav_userinfo\') === -1) {',
    '    throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
    '  }',
    '  const state = document.querySelector(\'img[alt="Freeleech"]\');',
    '  console.log(\'free element:\', state);',
    '  return !!state;',
    '}'
  ].join('\n'),

  dstudio: [
    'async ({ document, console }) => {',
    '  if (document.body.innerHTML.indexOf(\'必须在登录后才能访问\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'用户名：\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'login.php\') !== -1) {',
    '    throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
    '  }',
    '  const freeEl = document.querySelector(\'.details-title font.free, .details-title font.twoupfree, #top font.free, #top font.twoupfree\');',
    '  const result = !!freeEl || document.body.innerHTML.includes(\'全站 [Free] 生效中\');',
    '  console.log(\'free element:\', freeEl, \'result:\', result);',
    '  return result;',
    '}'
  ].join('\n'),

  custom: FREE_CUSTOM_STUB
};

const HR_TEMPLATES = {
  nexusphp: HR_NEXUSPHP,
  mteam: NO_HR_STUB,
  opencd: NO_HR_STUB,
  ttg: [
    'async ({ document, console }) => {',
    LOGIN_CHECK,
    '  const hr = document.querySelector(\'img[src="/pic/hit_run.gif"][alt="Hit & Run"]\');',
    '  console.log(\'hr element:\', hr);',
    '  return !!hr;',
    '}'
  ].join('\n'),
  u2: NO_HR_STUB,
  hdbits: NO_HR_STUB,
  hdarea: NO_HR_STUB,
  byr: NO_HR_STUB,
  hhanclub: HR_NEXUSPHP,
  hudbt: NO_HR_STUB,
  putao: NO_HR_STUB,
  hares: NO_HR_STUB,
  bitporn: NO_HR_STUB,
  hdcity: NO_HR_STUB,
  luminance: NO_HR_STUB,
  dstudio: [
    'async ({ document, console }) => {',
    '  if (document.body.innerHTML.indexOf(\'必须在登录后才能访问\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'用户名：\') !== -1 ||',
    '      document.body.innerHTML.indexOf(\'login.php\') !== -1) {',
    '    throw new Error(\'疑似登录状态失效, 请检查 Cookie\');',
    '  }',
    '  const hrEl = document.querySelector(\'#outer .details-title img.hitandrun, #outer .details-title img[alt="H&R"], #outer .details-title img[title="H&R"]\');',
    '  console.log(\'hr element:\', hrEl);',
    '  return !!hrEl;',
    '}'
  ].join('\n'),
  custom: HR_CUSTOM_STUB
};

function resolveTemplateKey (template) {
  if (!template) return 'nexusphp';
  if (template === 'custom') return 'custom';
  return TEMPLATES[template] ? template : 'nexusphp';
}

export function getFreeScriptTemplate (template) {
  const key = resolveTemplateKey(template);
  if (!template) {
    return `${BUILTIN_NOTE}${FREE_TEMPLATES.nexusphp}`;
  }
  return FREE_TEMPLATES[key] || `${BUILTIN_NOTE}${FREE_TEMPLATES.nexusphp}`;
}

export function getHrScriptTemplate (template) {
  const key = resolveTemplateKey(template);
  if (!template) {
    return `${BUILTIN_NOTE}${HR_TEMPLATES.nexusphp}`;
  }
  return HR_TEMPLATES[key] || NO_HR_STUB;
}

export function getScrapeScriptTemplates (template) {
  return {
    promo: getPromoScriptTemplate(template),
    free: getFreeScriptTemplate(template),
    hr: getHrScriptTemplate(template)
  };
}

export function getDefaultFreeScript () {
  return FREE_TEMPLATES.dstudio;
}

export function getDefaultHrScript () {
  return HR_TEMPLATES.dstudio;
}

export function getPromoScriptTemplate (template) {
  if (!template) {
    return `${BUILTIN_NOTE}${TEMPLATES.nexusphp}`;
  }
  if (template === 'custom') {
    return CUSTOM_STUB;
  }
  return TEMPLATES[template] || `${BUILTIN_NOTE}${TEMPLATES.nexusphp}`;
}

export function getDefaultPromoTemplate () {
  return 'dstudio';
}

export function getDefaultPromoScript () {
  return TEMPLATES.dstudio;
}