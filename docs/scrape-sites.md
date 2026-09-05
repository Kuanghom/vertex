# 免费 / HR 检测站点清单

本文档按**站点域名**汇总免费与 HR 检测规则，并给出 `app/libs/scrape.js` 中的**具体判断代码**。

---

## 检测流程

```text
详情页 URL + Cookie
    → ① 站点扩展脚本（优先，/task/scrape）
    → ② 内置规则（下表 + 判断代码节）
    → 不支持则报错
```

- 扩展脚本优先；配置了 `siteHost` 匹配后不走内置规则。
- 详情页缓存 40 秒（`vertex:scrape:{url}`）。
- **M-Team**（host 含 `m-team`）：Cookie 填 API Key，走 `_freeMTeam`，无内置 HR。

### 自定义扩展（任意站点）

在 **任务 → 站点扩展** 配置 `freeScript` / `hrScript`，保存于 `app/data/script/*.json`。  
`context` 含 `document`、`body`、`url`、`cookie`、`host`、`logger`、`util`、`console`。

---

## 按站点汇总

「免费 / HR 实现」列为 `app/libs/scrape.js` 中的函数名；**—** 表示无内置实现。

| 站点域名 | 免费实现 | HR 实现 |
|----------|----------|---------|
| `pt.btschool.club` | `_free` | — |
| `hdhome.org` | `_free` | `_hr` |
| `springsunday.net` | `_free` | — |
| `hdsky.me`、`hdsky.my` | `_free` | — |
| `ourbits.club` | `_free` | `_hr` |
| `chdbits.co`、`ptchdbits.co` | `_free` | `_hrCHDBits` |
| `audiences.me` | `_free` | `_hr` |
| `www.hddolby.com` | `_free` | `_hr` |
| `pthome.net` | `_free` | — |
| `pt.soulvoice.club` | `_free` | — |
| `et8.org` | `_free` | — |
| `hdfans.org` | `_free` | — |
| `www.nicept.net` | `_free` | — |
| `discfan.net` | `_free` | — |
| `piggo.me` | `_free` | `_hr` |
| `hdatmos.club` | `_free` | — |
| `pt.msg.vg` | `_free` | — |
| `sharkpt.net` | `_free` | `_hr` |
| `azusa.wiki` | `_free` | — |
| `kamept.com` | `_free` | — |
| `pt.eastgame.org` | `_free` | — |
| `pt.0ff.cc` | `_free` | — |
| `wintersakura.net` | `_free` | — |
| `open.cd`、`www.open.cd` | `_freeOpencd` | — |
| `totheglory.im` | `_freeToTheGlory` | `_hrTheGlory` |
| `u2.dmhy.org` | `_freeDmhy` | — |
| `hdbits.org` | `_freeHDBits` | — |
| `www.hdarea.co`、`www.hdarea.club`、`hdarea.club` | `_freeHDArea` | — |
| `byr.pt` | `_freeByrPT` | — |
| `hhanclub.net` | `_freeHHanClub` | `_hr` |
| `zeus.hamsters.space`、`hudbt.hust.edu.cn` | `_freeHUDBT` | — |
| `pt.sjtu.edu.cn` | `_freePuTao` | — |
| `bitporn.eu` | `_freeBitPorn` | — |
| `hdcity.leniter.org`、`hdcity.city` | `_freeHDCity` | — |
| `www.empornium.is`、`www.empornium.sx` | `_freeLuminance` | — |
| `www.pixelcove.me`、`www.cathode-ray.tube` | `_freeLuminance` | — |
| `dstudio.me` | `_freeDepthStudio` | `_hrDepthStudio` |
| `club.hares.top` | `_freeHaresClub` | — |
| `*m-team*`（如 `m-team.cc`） | `_freeMTeam` | — |

---

## 内置判断代码

以下代码摘自 `app/libs/scrape.js`。所有 HTML 类检测均先请求详情页并用 JSDOM 解析；返回值经 `!!` 转为布尔。

### 入口分发

```javascript
// exports.free — 扩展脚本优先，其次 M-Team API，再 freeWrapper[host]
if (host.includes('m-team')) {
  return await _freeMTeam(url, cookie);
}
if (freeWrapper[host]) {
  return await freeWrapper[host](url, cookie);
}

// exports.hr — 扩展脚本优先，再 hrWrapper[host]
if (hrWrapper[host]) {
  return await hrWrapper[host](url, cookie);
}
```

---

### `_free` — NexusPHP 标准（免费）

**适用站点**：`pt.btschool.club`、`hdhome.org`、`springsunday.net`、`hdsky.me`、`hdsky.my`、`ourbits.club`、`chdbits.co`、`ptchdbits.co`、`audiences.me`、`www.hddolby.com`、`pthome.net`、`pt.soulvoice.club`、`et8.org`、`hdfans.org`、`www.nicept.net`、`discfan.net`、`piggo.me`、`hdatmos.club`、`pt.msg.vg`、`sharkpt.net`、`azusa.wiki`、`kamept.com`、`pt.eastgame.org`、`pt.0ff.cc`、`wintersakura.net`

```javascript
const _free = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('#top font[class], #top span[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};
```

---

### `_hr` — NexusPHP 标准（HR）

**适用站点**：`www.hddolby.com`、`hdhome.org`、`ourbits.club`、`piggo.me`、`hhanclub.net`、`sharkpt.net`、`audiences.me`

```javascript
const _hr = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const hr = d.querySelector('img[class=hitandrun]');
  return hr;
};
```

---

### `_freeMTeam` — M-Team API（免费）

**适用站点**：host 包含 `m-team`（如 `m-team.cc`）。Cookie 填 **API Key**。

```javascript
const _freeMTeam = async function (url, cookie) {
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
  return body.data.status?.discount.indexOf('FREE') !== -1;
};
```

---

### `_freeOpencd` — OpenCD（免费）

**适用站点**：`open.cd`、`www.open.cd`

```javascript
const _freeOpencd = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('div[class=title] img[class]');
  return state && ['pro_free', 'pro_free2up'].indexOf(state.className) !== -1;
};
```

---

### `_freeToTheGlory` / `_hrTheGlory` — TTG

**适用站点**：`totheglory.im`

```javascript
const _freeToTheGlory = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('img[src="/pic/ico_free.gif"][class="topic"]');
  return state;
};

const _hrTheGlory = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const hr = d.querySelector('img[src="/pic/hit_run.gif"][alt="Hit & Run"]');
  return hr;
};
```

---

### `_freeDmhy` — U2

**适用站点**：`u2.dmhy.org`

```javascript
const _freeDmhy = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('td[valign=top] img[class=pro_free2up]') ||
    d.querySelector('td[valign=top] img[class=pro_free]') ||
    (d.querySelector('td[valign=top] img[class=arrowdown]') &&
      d.querySelector('td[valign=top] img[class=arrowdown]').nextSibling.innerHTML === '0.00X');
  return state;
};
```

---

### `_freeHDBits` — HDBits

**适用站点**：`hdbits.org`

```javascript
const _freeHDBits = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('span[class="tag freeleech"]');
  return state;
};
```

---

### `_freeHDArea` — HDArea

**适用站点**：`www.hdarea.co`、`www.hdarea.club`、`hdarea.club`

```javascript
const _freeHDArea = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('h1#top font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};
```

---

### `_freeByrPT` — BYR PT

**适用站点**：`byr.pt`

```javascript
const _freeByrPT = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('#share .free');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};
```

---

### `_freeHHanClub` — HHanClub（免费）

**适用站点**：`hhanclub.net`（HR 仍走 `_hr`）

```javascript
const _freeHHanClub = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('.promotion-tag');
  return state && (state.className || '').includes('free');
};
```

---

### `_freeHUDBT` — HUDBT

**适用站点**：`zeus.hamsters.space`、`hudbt.hust.edu.cn`

```javascript
const _freeHUDBT = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('div[class=minor-list] img[class=free]') ||
    d.querySelector('div[class=minor-list] img[class=twoupfree]');
  return state;
};
```

---

### `_freePuTao` — 葡萄 PT

**适用站点**：`pt.sjtu.edu.cn`

```javascript
const _freePuTao = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('b font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};
```

---

### `_freeBitPorn` — BitPorn

**适用站点**：`bitporn.eu`

```javascript
const _freeBitPorn = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = Array.from(d.querySelectorAll('span.stic2'))
    .some(el => el.textContent.trim() === '2X Free' || el.textContent.trim() === 'Free');
  return state;
};
```

---

### `_freeHDCity` — HDCity

**适用站点**：`hdcity.leniter.org`、`hdcity.city`

```javascript
const _freeHDCity = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('font.free') || d.querySelector('font.twoupfree');
  return state;
};
```

---

### `_freeLuminance` — Gazelle / Luminance

**适用站点**：`www.empornium.is`、`www.empornium.sx`、`www.pixelcove.me`、`www.cathode-ray.tube`

```javascript
const _freeLuminance = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('nav_userinfo') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('img[alt="Freeleech"]');
  return state;
};
```

---

### `_freeDepthStudio` / `_hrDepthStudio` — Depth Studio

**适用站点**：`dstudio.me`

```javascript
const _freeDepthStudio = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);  // 检查「必须在登录后才能访问」等
  const state = d.querySelector(
    '.details-title font.free, .details-title font.twoupfree, #top font.free, #top font.twoupfree'
  );
  const globalFree = d.body.innerHTML.indexOf('全站 [Free] 生效中') !== -1;
  return state || globalFree;
};

const _hrDepthStudio = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);
  const hr = d.querySelector(
    '#outer .details-title img.hitandrun, #outer .details-title img[alt="H&R"], #outer .details-title img[title="H&R"]'
  );
  return hr;
};
```

---

### `_freeHaresClub` — Hares

**适用站点**：`club.hares.top`

```javascript
const _freeHaresClub = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const state = d.querySelector('b font[class]');
  return state && ['free', 'twoupfree'].indexOf(state.className) !== -1;
};
```

---

### `_hrCHDBits` — CHDBits HR

**适用站点**：`chdbits.co`、`ptchdbits.co`（免费仍走 `_free`）

```javascript
const _hrCHDBits = async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登陆状态失效, 请检查 Cookie');
  }
  const hr5 = d.body.innerHTML.indexOf('<b>H&amp;R:&nbsp;</b>5day</td></tr>');
  const hr3 = d.body.innerHTML.indexOf('<b>H&amp;R:&nbsp;</b>3day</td></tr>');
  return hr3 !== -1 || hr5 !== -1;
};
```

---

### `_freeHDChina` — 未接入域名表

**说明**：代码已实现，但未注册到 `freeWrapper`，需通过扩展脚本接入。

```javascript
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
    headers: { cookie },
    formData: { 'ids[]': tid, csrf },
    json: true
  });
  return promotion.body.message[tid].sp_state.indexOf('pro_free') !== -1 ||
    promotion.body.message[tid].sp_state.indexOf('pro_twoupfree') !== -1;
};
```

---

## 域名映射表（freeWrapper / hrWrapper）

```javascript
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
```

---

## 优惠类型检测（30% / 50% / 2X / 2X50% / 2XFree）

> **已整理（免费/HR 见上文）**：`_free`、`_freeMTeam`、`_freeOpencd`  
> **本文档补充**：馒头 / OpenCD 及其他站点优惠类型  
> **HTML 专版**：[`docs/scrape-sites-promo.html`](scrape-sites-promo.html)  
> **探测方式**：使用项目根目录 `cookies.txt` 请求各站 `details.php` 实测（2026-06-24）。  
> **说明**：Vertex 当前 `scrape.js` 仅内置「免费 / HR」；下表为扩展检测规则，供站点扩展脚本或后续内置参考。

### 类型对照（NexusPHP 系）

| 优惠 | `#top` / `h1#top` 下 `font`/`span` 的 class | 页面文字 | discfan.net 实测 id |
|------|---------------------------------------------|----------|---------------------|
| 2XFree | `twoupfree` | 2X免费 / 2X免費 | 2406 |
| 2X | `twoup` | 2X | 43149 |
| 50% | `halfdown` | 50% | 43145 |
| 30% | `thirtypercent` 或 `thirtiedown` | 30% | 43127（`thirtypercent`） |
| 2X50% | `twouphalfdown` | 2X 50% / 2X50% | 43144 |

**适用**：所有走 `_free`（NexusPHP 标准）的站点，以及 `hdhome.org`、`hdfans.org`、`ourbits.club`、`hdsky.me` 等（实测 `halfdown`/`free`/`twoupfree`）。  
**注意**：少数站点 30% 用 `thirtiedown`，多数新站用 `thirtypercent`，判断时两者都匹配。

```javascript
// 通用 NexusPHP 优惠检测（不含免费，免费见 _free）
const NEXUSPHP_PROMO = {
  '2xfree': ['twoupfree'],
  '2x': ['twoup'],
  '50%': ['halfdown'],
  '30%': ['thirtiedown', 'thirtypercent'],
  '2x50%': ['twouphalfdown']
};

const _promoNexusPHP = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const classes = NEXUSPHP_PROMO[type] || [];
  const state = d.querySelector('#top font[class], #top span[class]');
  return state && classes.includes(state.className);
};
```

列表页常另有 `pro_50pctdown`、`pro_free` 等徽章，**以详情页 `#top` 内 class 为准**（hdhome #132940 → `halfdown:50%`）。

---

### `_freeMTeam` / `_promoMTeam` — M-Team 馒头（API）

**适用**：host 包含 `m-team`（如 `m-team.cc`）。Cookie 填 **API Key**。  
**接口**：`POST https://api.m-team.cc/api/torrent/detail`，读取 `body.data.status.discount`。

| 优惠 | API `discount` 值 | 说明 |
|------|-------------------|------|
| 免费 | `FREE` | 100% 免费 |
| 50% | `PERCENT_50` | 50% 下载 |
| 30% | `PERCENT_70` | 30% 下载（馒头用 70 表示 30% off） |
| 普通 | `NORMAL` | 无优惠 |
| 2X / 2XFree / 2X50% | — | 当前 API 未见对应值 |

```javascript
const MTEAM_PROMO = {
  'free': 'FREE',
  '50%': 'PERCENT_50',
  '30%': 'PERCENT_70'
};

const _promoMTeam = (type) => async function (url, cookie) {
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
  const key = MTEAM_PROMO[type];
  if (!key) return false;
  return String(discount).indexOf(key) !== -1;
};

// 判断是否普通（无优惠）
const _isNormalMTeam = async (url, cookie) => {
  const tid = url.match(/\/(\d+)/)[1];
  const { body } = await util.requestPromise({ /* 同上 */ });
  const discount = body.data?.status?.discount || '';
  return String(discount).indexOf('NORMAL') !== -1;
};
```

免费检测（已有 `_freeMTeam`）：`discount` 含 `FREE`。

---

### `_freeOpencd` / `_promoOpencd` — OpenCD

**适用**：`open.cd`、`www.open.cd`  
**结构**：`div[class=title] img[class]`（与免费检测相同位置）

| 优惠 | img class |
|------|-----------|
| 免费 | `pro_free` |
| 2XFree | `pro_free2up` |
| 2X | `pro_2up` |
| 50% | `pro_50pctdown` |
| 30% | `pro_30pctdown` |
| 2X50% | `pro_50pctdown2up` |

```javascript
const OPENCD_PROMO = {
  'free': ['pro_free'],
  '2xfree': ['pro_free2up'],
  '2x': ['pro_2up'],
  '50%': ['pro_50pctdown'],
  '30%': ['pro_30pctdown'],
  '2x50%': ['pro_50pctdown2up']
};

const _promoOpencd = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const classes = OPENCD_PROMO[type] || [];
  const state = d.querySelector('div[class=title] img[class]');
  return state && classes.includes(state.className);
};
```

免费检测（已有 `_freeOpencd`）：class 为 `pro_free` 或 `pro_free2up`。

---

### `_freeToTheGlory` — TTG

**适用**：`totheglory.im`  
**实测**：使用 `ttg.txt` Cookie 访问详情页（2026-06-24）

| 优惠 | 图标（`img.topic` 或 `img.checkable_IMG`） | 辅助文案 |
|------|---------------------------------------------|----------|
| 免费 | `/pic/ico_free.gif` | 本种子限时不计流量 |
| 30% | `/pic/ico_30.gif` | 本种子的下载流量计为实际流量的30% |
| 50% | `/pic/ico_half.gif` | 本种子的下载流量会减半 |
| 2X / 2XFree / 2X50% | 当前站点未见对应 `ico_*.gif` | 可用文案兜底 |

**注意**：页面其他位置的 `ico_30.gif` / `ico_half.gif`（无 `topic` class，如 `align="absbottom"`）多为全站公告，**不能**作为该种子优惠依据。必须以标题区 `class="topic"` 的图标为准（列表页可为 `checkable_IMG`）。

```javascript
const TTG_PROMO_ICON = {
  'free': 'ico_free.gif',
  '30%': 'ico_30.gif',
  '50%': 'ico_half.gif',
  '2x': 'ico_2up.gif',           // 未见样本，保留
  '2xfree': 'ico_2upfree.gif',   // 未见样本，保留
  '2x50%': 'ico_half2up.gif'     // 未见样本，保留
};

const _promoTTG = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const icon = TTG_PROMO_ICON[type];
  if (!icon) return false;
  const hit = d.querySelector(
    `img.topic[src="/pic/${icon}"], img.checkable_IMG[src="/pic/${icon}"]`
  );
  if (hit) return true;
  // 2X 类未见图标时可用文案兜底
  const html = d.body.innerHTML;
  const textRules = {
    '2xfree': () => /2X.*免费|免费.*2X|不计上传.*免费/i.test(html),
    '2x': () => /仅计上传|2X.*上传/i.test(html),
    '2x50%': () => /2X.*50%|50%.*2X/i.test(html)
  };
  return textRules[type] ? textRules[type]() : false;
};
```

免费检测（已有 `_freeToTheGlory`）：

```javascript
d.querySelector('img[src="/pic/ico_free.gif"][class="topic"]');
```

---

### `_freeDmhy` — U2

**适用**：`u2.dmhy.org`  
**实测**：`details.php?id=36728` → `img.pro_free2up`（2X Free）

| 优惠 | 判断规则（「流量优惠」区块） |
|------|------------------------------|
| 2XFree | `td img.pro_free2up` 或 `class=pro_free2up` |
| 2X | `img.pro_2up` / `class=pro_2up` |
| 50% | `img.pro_50pctdown` 或 `arrowdown` 旁文本 `0.50X` |
| 30% | `img.pro_30pctdown` 或 `arrowdown` 旁文本 `0.30X` |
| 2X50% | `img.pro_50pctdown2up` / `class=pro_50pctdown2up` |

```javascript
const _promoU2 = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const html = d.body.innerHTML;
  const block = html.match(/流量優惠[\s\S]{0,1200}/)?.[0] || html;
  const rules = {
    '2xfree': () => /class=pro_free2up/.test(block),
    '2x': () => /class=pro_2up/.test(block),
    '50%': () => /class=pro_50pctdown/.test(block) ||
      (/class=arrowdown/.test(block) && /0\.50X/.test(block)),
    '30%': () => /class=pro_30pctdown/.test(block) ||
      (/class=arrowdown/.test(block) && /0\.30X/.test(block)),
    '2x50%': () => /class=pro_50pctdown2up/.test(block)
  };
  return rules[type] ? rules[type]() : false;
};
```

---

### `_freeHDBits` — HDBits

**适用**：`hdbits.org`（`cookies.txt` 无 Cookie，规则参考 HDBits 详情页 `span.tag.*` 惯例）

| 优惠 | 判断规则 |
|------|----------|
| 2XFree | 同时存在 `span.tag.freeleech` 与 `span.tag.doubleup` |
| 2X | `span.tag.doubleup`（双倍上传） |
| 50% | `span.tag.halfleech` |
| 30% | `span.tag.thirtyleech` 或页面含 `30%` 促销标签 |
| 2X50% | `span.tag.halfleech` + `span.tag.doubleup` |

```javascript
const _promoHDBits = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const has = (cls) => !!d.querySelector(`span.tag.${cls}`);
  switch (type) {
    case '2xfree': return has('freeleech') && has('doubleup');
    case '2x': return has('doubleup');
    case '50%': return has('halfleech');
    case '30%': return has('thirtyleech') || /30%/.test(d.body.innerHTML);
    case '2x50%': return has('halfleech') && has('doubleup');
    default: return false;
  }
};
```

---

### `_freeHDArea` — HDArea

**适用**：`www.hdarea.co`、`www.hdarea.club`、`hdarea.club`  
**结构**：`h1#top font[class]`，与 NexusPHP 相同 class 名（实测 `free`、`halfdown` 等）

```javascript
const _promoHDArea = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const classes = NEXUSPHP_PROMO[type] || [];
  const state = d.querySelector('h1#top font[class]');
  return state && classes.includes(state.className);
};
```

部分种子列表带 `pro_50pctdown2up` 徽章；若 `#top` 为 `free` 而需识别 2X50%，可额外检查 `class=pro_50pctdown2up`。

---

### `_freeByrPT` — BYR PT

**适用**：`byr.pt`  
**结构**：`#share` 标题区（非 `#top`），`font` class 与 NexusPHP 一致

```javascript
const _promoByrPT = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const classes = NEXUSPHP_PROMO[type] || [];
  const state = d.querySelector('#share .free, #share font[class]');
  return state && classes.includes(state.className);
};
```

---

### `_freeHHanClub` — HHanClub

**适用**：`hhanclub.net`  
**实测**：列表页存在 `promotion-tag-free`、`promotion-tag-50`、`promotion-tag-30`、`promotion-tag-2xfree`

| 优惠 | 判断规则 |
|------|----------|
| 2XFree | `.promotion-tag-2xfree` 或 class 含 `promotion-tag-2xfree` |
| 2X | `.promotion-tag-2x` |
| 50% | `.promotion-tag-50` |
| 30% | `.promotion-tag-30` |
| 2X50% | `.promotion-tag-2x50` 或同时含 `2x` 与 `50` 标签 |

```javascript
const _promoHHanClub = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const map = {
    '2xfree': '2xfree',
    '2x': '2x',
    '50%': '50',
    '30%': '30',
    '2x50%': '2x50'
  };
  const suffix = map[type];
  if (!suffix) return false;
  return !!d.querySelector(`.promotion-tag-${suffix}, .promotion-tag.promotion-tag-${suffix}`);
};
```

免费仍用：`.promotion-tag` 的 class 含 `free`（见 `_freeHHanClub`）。

---

### `_freeHUDBT` — HUDBT

**适用**：`zeus.hamsters.space`、`hudbt.hust.edu.cn`  
**结构**：`div.minor-list` 内 `img[class=...]`

| 优惠 | img class |
|------|-----------|
| 2XFree | `twoupfree` |
| 2X | `twoup` |
| 50% | `halfdown` |
| 30% | `thirtiedown` 或 `thirtypercent` |
| 2X50% | `twouphalfdown` |

```javascript
const _promoHUDBT = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const map = {
    '2xfree': ['twoupfree'],
    '2x': ['twoup'],
    '50%': ['halfdown'],
    '30%': ['thirtiedown', 'thirtypercent'],
    '2x50%': ['twouphalfdown']
  };
  const classes = map[type] || [];
  return classes.some(cls => d.querySelector(`div[class=minor-list] img[class=${cls}]`));
};
```

---

### `_freePuTao` / `_freeHaresClub` — 葡萄 PT / Hares

**适用**：`pt.sjtu.edu.cn`、`club.hares.top`  
**结构**：`b font[class]`，class 名同 NexusPHP

```javascript
const _promoPuTao = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const classes = NEXUSPHP_PROMO[type] || [];
  const state = d.querySelector('b font[class]');
  return state && classes.includes(state.className);
};
```

`_promoHaresClub` 与 `_promoPuTao` 逻辑相同。

---

### `_freeBitPorn` — BitPorn

**适用**：`bitporn.eu`（无 Cookie，规则参考 NexusPHP 系 `span.stic2` 文本）

| 优惠 | `span.stic2` 文本 |
|------|-------------------|
| 2XFree | `2X Free` |
| 2X | `2X` |
| 50% | `50%` 或 `50% Off` |
| 30% | `30%` |
| 2X50% | `2X 50%` |

```javascript
const _promoBitPorn = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const texts = Array.from(d.querySelectorAll('span.stic2')).map(el => el.textContent.trim());
  const map = {
    '2xfree': ['2X Free'],
    '2x': ['2X'],
    '50%': ['50%', '50% Off'],
    '30%': ['30%'],
    '2x50%': ['2X 50%']
  };
  const expect = map[type] || [];
  return texts.some(t => expect.includes(t));
};
```

---

### `_freeHDCity` — HDCity

**适用**：`hdcity.leniter.org`、`hdcity.city`  
**结构**：`font.{class}`

```javascript
const _promoHDCity = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('userdetails') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const map = {
    '2xfree': ['twoupfree'],
    '2x': ['twoup'],
    '50%': ['halfdown'],
    '30%': ['thirtiedown', 'thirtypercent'],
    '2x50%': ['twouphalfdown']
  };
  const classes = map[type] || [];
  return classes.some(cls => d.querySelector(`font.${cls}`));
};
```

---

### `_freeLuminance` — Gazelle / Luminance

**适用**：`www.empornium.is`、`www.empornium.sx`、`www.pixelcove.me`、`www.cathode-ray.tube`  
**说明**：Gazelle 系主要区分 Freeleech；部分倍率需看 `img[alt]` 组合

| 优惠 | 判断规则 |
|------|----------|
| 2XFree | `img[alt="Freeleech"]` 且存在双倍上传标记（如 `alt` 含 `Double`） |
| 2X | `img[alt*="Double"]` 或 `img[alt*="2x"]` |
| 50% | `img[alt*="50%"]` 或 `alt="Partial Freeleech"` |
| 30% | `img[alt*="30%"]` |
| 2X50% | 同时含 Freeleech 与 50% 类 `alt` |

```javascript
const _promoLuminance = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  if (d.body.innerHTML.indexOf('nav_userinfo') === -1) {
    throw new Error('疑似登录状态失效, 请检查 Cookie');
  }
  const alts = Array.from(d.querySelectorAll('img[alt]')).map(i => i.getAttribute('alt') || '');
  const has = (re) => alts.some(a => re.test(a));
  switch (type) {
    case '2xfree': return has(/Freeleech/i) && has(/Double|2x/i);
    case '2x': return has(/Double Upload|2x/i);
    case '50%': return has(/50%|Partial Freeleech/i);
    case '30%': return has(/30%/i);
    case '2x50%': return has(/50%|Partial/i) && has(/Double|2x/i);
    default: return false;
  }
};
```

---

### `_freeDepthStudio` — Depth Studio

**适用**：`dstudio.me`  
**结构**：`.details-title` / `#top` 下 `font.{class}`（实测 `free`）

```javascript
const _promoDepthStudio = (type) => async function (url, cookie) {
  const d = await getDocument(url, cookie);
  assertLoggedIn(d);
  const map = {
    '2xfree': ['twoupfree'],
    '2x': ['twoup'],
    '50%': ['halfdown'],
    '30%': ['thirtiedown', 'thirtypercent'],
    '2x50%': ['twouphalfdown']
  };
  const classes = map[type] || [];
  const selector = classes.map(c =>
    `.details-title font.${c}, #top font.${c}`
  ).join(', ');
  return !!d.querySelector(selector);
};
```

---

### 按站点汇总（优惠检测）

| 站点 | 2XFree | 2X | 50% | 30% | 2X50% | 实现函数 |
|------|--------|-----|-----|-----|-------|----------|
| `*m-team*` | API `FREE` | — | API `PERCENT_50` | API `PERCENT_70` | — | `_promoMTeam` |
| `open.cd` 等 | `pro_free2up` | `pro_2up` | `pro_50pctdown` | `pro_30pctdown` | `pro_50pctdown2up` | `_promoOpencd` |
| NexusPHP 标准站点 | `twoupfree` | `twoup` | `halfdown` | `thirtypercent`/`thirtiedown` | `twouphalfdown` | `_promoNexusPHP` |
| totheglory.im | `ico_free.gif` | 未见 | 未见 | `ico_30.gif` | `ico_half.gif` | 未见 | `_promoTTG` |
| u2.dmhy.org | `pro_free2up` | `pro_2up` | `pro_50pctdown` | `pro_30pctdown` | `pro_50pctdown2up` | `_promoU2` |
| hdbits.org | tag 组合 | `doubleup` | `halfleech` | `thirtyleech` | tag 组合 | `_promoHDBits` |
| hdarea.club 等 | `h1#top` class | 同上 | 同上 | 同上 | 同上 + `pro_50pctdown2up` | `_promoHDArea` |
| byr.pt | `#share` class | 同上 | 同上 | 同上 | 同上 | `_promoByrPT` |
| hhanclub.net | `promotion-tag-2xfree` | `promotion-tag-2x` | `promotion-tag-50` | `promotion-tag-30` | `promotion-tag-2x50` | `_promoHHanClub` |
| zeus.hamsters.space 等 | `minor-list` img | 同上 | 同上 | 同上 | 同上 | `_promoHUDBT` |
| pt.sjtu.edu.cn / club.hares.top | `b font` class | 同上 | 同上 | 同上 | 同上 | `_promoPuTao` |
| bitporn.eu | `2X Free` 文本 | `2X` | `50%` | `30%` | `2X 50%` | `_promoBitPorn` |
| hdcity.city 等 | `font.*` | 同上 | 同上 | 同上 | 同上 | `_promoHDCity` |
| Gazelle 系 | `img[alt]` 组合 | 同上 | 同上 | 同上 | 同上 | `_promoLuminance` |
| dstudio.me | `font.*` in title | 同上 | 同上 | 同上 | 同上 | `_promoDepthStudio` |

---

## 新增站点

1. **推荐**：任务 → 站点扩展，配置 `freeScript` / `hrScript`。
2. **内置**：在 `app/libs/scrape.js` 新增函数并注册到 `freeWrapper` / `hrWrapper`。

## 相关入口

| 功能 | 位置 |
|------|------|
| RSS 试运行 / 检测免费·HR | 任务 → RSS |
| RSS 自动过滤 | RSS 任务「抓取免费」「排除 HR」 |
| 扩展脚本 | 任务 → 站点扩展（`/task/scrape`） |

HTML 版本：`docs/scrape-sites.html`  
优惠类型 HTML：`docs/scrape-sites-promo.html`
