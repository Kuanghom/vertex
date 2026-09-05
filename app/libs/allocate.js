const logger = require('./logger');
const util = require('./util');

const strategies = new Map();

const BUILTINS = [
  {
    id: 'builtin:original',
    strategy: 'original',
    alias: '原规则',
    description: '沿用 RSS 任务里的「排序规则」：下载数/上传速度/下载速度升序，剩余空间降序。同一次扫描内不按待推送数重排，行为与改造前一致。'
  },
  {
    id: 'builtin:roundRobin',
    strategy: 'roundRobin',
    alias: '轮询',
    description: '在可用下载器之间按顺序轮流分配，同一轮 RSS 扫到多条种子时摊开，避免全进一台。'
  },
  {
    id: 'builtin:leastLeech',
    strategy: 'leastLeech',
    alias: '最少下载任务',
    description: '选当前下载中数量最少的下载器，并计入本轮已决定推送的数量，突发多条时会摊开。'
  },
  {
    id: 'builtin:mostSpace',
    strategy: 'mostSpace',
    alias: '最大剩余空间',
    description: '选剩余磁盘空间最大的下载器，并预扣本轮已分配种子的体积。'
  },
  {
    id: 'builtin:leastLoad',
    strategy: 'leastLoad',
    alias: '最低综合负载',
    description: '能装下的优先，全部不够仍分配。综合任务数、上下行速度占用、封顶后的剩余空间和填充比，避免一直灌最大盘。'
  },
  {
    id: 'builtin:random',
    strategy: 'random',
    alias: '随机',
    description: '在可用下载器中随机选择。'
  }
];

function pendingOf (ctx, clientId) {
  if (!ctx.pending[clientId]) {
    ctx.pending[clientId] = { count: 0, size: 0 };
  }
  return ctx.pending[clientId];
}

const GIB = 1024 * 1024 * 1024;
const MIB = 1024 * 1024;
const SPACE_CREDIT_CAP_GIB = 400;
const FIT_RESERVE_GIB = 8;
const FIT_SIZE_RATIO = 1.15;
const LEECHING_STATES = ['downloading', 'stalledDL', 'Downloading'];
const LOAD_SCORE_FORMULA = '能装下的优先，全部不够仍分配。分数 = 任务数×20 + 速度占用 − min(装完后剩余GiB, 400) + 填充比×150。速度占用：配了限速则按利用率（下载满载约 80，上传满载约 50），否则平均下载×4 + 平均上传×2.5（MiB/s）。分数越低越好。';

function toMiB (bytes) {
  return (Number(bytes) || 0) / MIB;
}

function speedLoad (client) {
  const dl = toMiB(client.avgDownloadSpeed);
  const ul = toMiB(client.avgUploadSpeed);
  const maxDl = toMiB(client.maxDownloadSpeed);
  const maxUl = toMiB(client.maxUploadSpeed);
  const dlPart = maxDl >= 1 ? (dl / maxDl) * 80 : dl * 4;
  const ulPart = maxUl >= 1 ? (ul / maxUl) * 50 : ul * 2.5;
  return dlPart + ulPart;
}

function torrentSizeOf (ctx) {
  return Math.abs(Number(ctx && ctx.torrent && ctx.torrent.size) || 0);
}

function remainBytes (client, ctx, usePending) {
  const pending = usePending ? pendingOf(ctx, client.id) : { count: 0, size: 0 };
  return (client.maindata && client.maindata.freeSpaceOnDisk || 0) - pending.size;
}

function leechingLeftBytes (client) {
  const torrents = client.maindata && client.maindata.torrents;
  if (!Array.isArray(torrents)) return 0;
  let left = 0;
  for (const item of torrents) {
    if (LEECHING_STATES.indexOf(item.state) === -1) continue;
    left += Math.max(0, (item.size || 0) - (item.completed || 0));
  }
  return left;
}

function canFit (client, ctx, usePending) {
  const size = torrentSizeOf(ctx);
  if (!size) return true;
  return remainBytes(client, ctx, usePending) >= size * FIT_SIZE_RATIO + FIT_RESERVE_GIB * GIB;
}

function loadScore (client, ctx, usePending) {
  const pending = usePending ? pendingOf(ctx, client.id) : { count: 0, size: 0 };
  const main = client.maindata || {};
  const leech = (main.leechingCount || 0) + pending.count;
  const size = torrentSizeOf(ctx);
  const remain = remainBytes(client, ctx, usePending);
  const spaceGiB = Math.max(0, remain - size) / GIB;
  const committed = leechingLeftBytes(client) + pending.size + size;
  const fillRatio = committed / Math.max(remain, 1);
  const unfit = size > 0 && !canFit(client, ctx, usePending) ? 10000 : 0;
  return leech * 20 + speedLoad(client) - Math.min(spaceGiB, SPACE_CREDIT_CAP_GIB) + fillRatio * 150 + unfit;
}

function notePending (ctx, client, torrent) {
  const pending = pendingOf(ctx, client.id);
  pending.count += 1;
  pending.size += Math.abs(Number(torrent && torrent.size) || 0);
}

function metricValue (client, field, usePending, ctx) {
  const pending = usePending ? pendingOf(ctx, client.id) : { count: 0, size: 0 };
  const main = client.maindata || {};
  switch (field) {
  case 'leechingCount':
    return (main.leechingCount || 0) + pending.count;
  case 'seedingCount':
    return main.seedingCount || 0;
  case 'uploadSpeed':
    return main.uploadSpeed || 0;
  case 'downloadSpeed':
    return main.downloadSpeed || 0;
  case 'avgUploadSpeed':
    return client.avgUploadSpeed || 0;
  case 'avgDownloadSpeed':
    return client.avgDownloadSpeed || 0;
  case 'freeSpaceOnDisk':
    return (main.freeSpaceOnDisk || 0) - pending.size;
  case 'loadScore':
    return loadScore(client, ctx, usePending);
  default:
    return main[field] || 0;
  }
}

function snapshotClient (client, ctx) {
  const pending = pendingOf(ctx, client.id);
  const main = client.maindata || {};
  return {
    id: client.id,
    alias: client.alias,
    leechingCount: main.leechingCount || 0,
    seedingCount: main.seedingCount || 0,
    uploadSpeed: main.uploadSpeed || 0,
    downloadSpeed: main.downloadSpeed || 0,
    avgUploadSpeed: client.avgUploadSpeed || 0,
    avgDownloadSpeed: client.avgDownloadSpeed || 0,
    freeSpaceOnDisk: main.freeSpaceOnDisk || 0,
    pendingCount: pending.count,
    pendingSize: pending.size,
    loadScore: loadScore(client, ctx, true)
  };
}

function sortByField (clients, field, desc, usePending, ctx) {
  return [...clients].sort((a, b) => {
    const av = metricValue(a, field, usePending, ctx);
    const bv = metricValue(b, field, usePending, ctx);
    return desc ? bv - av : av - bv;
  });
}

function register (id, impl) {
  strategies.set(id, impl);
}

register('original', {
  pick (clients, torrent, ctx) {
    const field = ctx.clientSortBy || 'leechingCount';
    return sortByField(clients, field, field === 'freeSpaceOnDisk', false, ctx)[0];
  }
});

register('roundRobin', {
  pick (clients, torrent, ctx) {
    const idx = Math.abs(ctx.rrIndex || 0) % clients.length;
    ctx.rrIndex = (ctx.rrIndex || 0) + 1;
    return clients[idx];
  }
});

register('leastLeech', {
  pick (clients, torrent, ctx) {
    return sortByField(clients, 'leechingCount', false, true, ctx)[0];
  }
});

register('mostSpace', {
  pick (clients, torrent, ctx) {
    return sortByField(clients, 'freeSpaceOnDisk', true, true, ctx)[0];
  }
});

register('leastLoad', {
  pick (clients, torrent, ctx) {
    const fit = clients.filter(item => canFit(item, ctx, true));
    return sortByField(fit.length ? fit : clients, 'loadScore', false, true, ctx)[0];
  }
});

register('random', {
  pick (clients) {
    return clients[Math.floor(Math.random() * clients.length)];
  }
});

function pickByPriority (clients, metrics, ctx) {
  return [...clients].sort((a, b) => {
    for (const metric of metrics) {
      const desc = metric.order === 'desc';
      const av = metricValue(a, metric.field, !!metric.pending, ctx);
      const bv = metricValue(b, metric.field, !!metric.pending, ctx);
      if (av !== bv) return desc ? bv - av : av - bv;
    }
    return 0;
  })[0];
}

function scoreByWeighted (clients, metrics, ctx) {
  const active = metrics.filter(item => item.field && Number(item.weight) > 0);
  if (!active.length) return null;
  const series = active.map(metric => {
    const raw = clients.map(client => metricValue(client, metric.field, !!metric.pending, ctx));
    const min = Math.min.apply(null, raw);
    const max = Math.max.apply(null, raw);
    return { metric, raw, min, span: max - min };
  });
  return clients.map((client, index) => {
    let score = 0;
    for (const item of series) {
      const norm = item.span === 0 ? 0.5 : (item.raw[index] - item.min) / item.span;
      const worse = item.metric.order === 'desc' ? 1 - norm : norm;
      score += (Number(item.metric.weight) || 0) * worse;
    }
    return { client, score };
  });
}

function pickByWeighted (clients, metrics, ctx) {
  const ranked = scoreByWeighted(clients, metrics, ctx);
  if (!ranked) {
    return pickByPriority(clients, metrics, ctx);
  }
  return ranked.sort((a, b) => a.score - b.score)[0].client;
}

const WEIGHTED_SCORE_FORMULA = '加权：每个指标先在当前候选下载器里缩放到 0~1，升序用归一值、降序用 1−归一值，再乘权重求和，选总分最低的。权重 0 的行不参与。旧规则默认仍是按优先级比较。';

register('sort', {
  pick (clients, torrent, ctx) {
    const metrics = ((ctx.rule && ctx.rule.metrics) || []).filter(item => item.field);
    if (!metrics.length) {
      return strategies.get('original').pick(clients, torrent, ctx);
    }
    if ((ctx.rule.scoreMode || 'priority') === 'weighted') {
      return pickByWeighted(clients, metrics, ctx);
    }
    return pickByPriority(clients, metrics, ctx);
  }
});

function formatDebugArg (value) {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

function buildJsContext (ctx) {
  ctx.jsState = ctx.jsState || {};
  const jsCtx = {
    clientSortBy: ctx.clientSortBy,
    rssAlias: ctx.rssAlias,
    state: ctx.jsState
  };
  if (ctx.debugLogs) {
    const push = (level, args) => {
      ctx.debugLogs.push({
        level,
        message: args.map(formatDebugArg).join(' ')
      });
    };
    jsCtx.console = {
      log: (...args) => push('log', args),
      info: (...args) => push('info', args),
      warn: (...args) => push('warn', args),
      error: (...args) => push('error', args)
    };
  }
  return jsCtx;
}

register('javascript', {
  pick (clients, torrent, ctx) {
    const code = ctx.rule && ctx.rule.code;
    if (!code) {
      return strategies.get('original').pick(clients, torrent, ctx);
    }
    try {
      // eslint-disable-next-line no-eval
      const fn = eval(code);
      const snaps = clients.map(item => snapshotClient(item, ctx));
      const picked = fn(snaps, torrent, buildJsContext(ctx));
      const id = typeof picked === 'string' ? picked : (picked && picked.id);
      return clients.find(item => item.id === id) || clients[0];
    } catch (e) {
      if (ctx.debugThrow) throw e;
      logger.error('分配规则', ctx.rule.alias || ctx.rule.id, '执行失败, 回退原规则\n', e);
      return strategies.get('original').pick(clients, torrent, ctx);
    }
  }
});

function listBuiltins () {
  return BUILTINS.map(item => ({
    ...item,
    builtin: true,
    type: 'builtin',
    used: false
  }));
}

function resolveRule (ruleId) {
  if (!ruleId || String(ruleId).startsWith('builtin:')) {
    const builtin = BUILTINS.find(item => item.id === (ruleId || 'builtin:original')) || BUILTINS[0];
    return { id: builtin.id, alias: builtin.alias, type: 'builtin', strategy: builtin.strategy };
  }
  const userRule = util.listAllocateRule().find(item => item.id === ruleId);
  if (!userRule) {
    return { id: 'builtin:original', alias: '原规则', type: 'builtin', strategy: 'original' };
  }
  return userRule;
}

function pickClient (clients, torrent, options = {}) {
  if (!clients || !clients.length) return null;
  const ctx = options.ctx || { pending: {}, rrIndex: 0 };
  ctx.pending = ctx.pending || {};
  ctx.rrIndex = ctx.rrIndex || 0;
  ctx.clientSortBy = options.clientSortBy || ctx.clientSortBy || 'leechingCount';
  ctx.rssAlias = options.rssAlias || ctx.rssAlias || '';
  ctx.torrent = torrent;
  const fit = clients.filter(item => canFit(item, ctx, true));
  const pool = fit.length ? fit : clients;
  if (pool.length === 1) {
    notePending(ctx, pool[0], torrent);
    return pool[0];
  }
  const rule = options.rule || resolveRule(options.ruleId);
  ctx.rule = rule;
  const strategyId = rule.type === 'builtin' ? rule.strategy : rule.type;
  const impl = strategies.get(strategyId) || strategies.get('original');
  const picked = impl.pick(pool, torrent, ctx) || pool[0];
  notePending(ctx, picked, torrent);
  return picked;
}

function collectDebugClients (clientIds) {
  const ids = Array.isArray(clientIds) && clientIds.length
    ? clientIds
    : Object.keys(global.runningClient || {});
  const used = [];
  const skipped = [];
  for (const id of ids) {
    const client = global.runningClient && global.runningClient[id];
    if (!client) {
      skipped.push({ id, reason: '未启用或不存在' });
      continue;
    }
    if (!client.status || !client.maindata) {
      skipped.push({ id, alias: client.alias, reason: '未连接或尚未同步' });
      continue;
    }
    used.push(client);
  }
  return { used, skipped };
}

function debugPick (options = {}) {
  const { used, skipped } = collectDebugClients(options.clientIds);
  if (!used.length) {
    throw new Error(skipped.length
      ? '没有可用的在线下载器，请先启用并等待同步'
      : '请至少选择一台下载器');
  }
  const count = Math.min(20, Math.max(1, parseInt(options.count, 10) || 1));
  const size = Math.abs(Number(options.torrent && options.torrent.size) || 0);
  const baseName = (options.torrent && options.torrent.name) || 'debug.torrent';
  const rule = options.rule || resolveRule(options.ruleId);
  const logs = [];
  const ctx = {
    pending: {},
    rrIndex: 0,
    jsState: {},
    debugLogs: logs,
    debugThrow: rule.type === 'javascript',
    clientSortBy: options.clientSortBy || 'leechingCount',
    rssAlias: options.rssAlias || 'debug'
  };
  const rounds = [];
  for (let i = 0; i < count; i++) {
    const torrent = {
      name: count > 1 ? `${baseName} #${i + 1}` : baseName,
      size,
      hash: `debug-${i + 1}`,
      site: (options.torrent && options.torrent.site) || ''
    };
    ctx.torrent = torrent;
    const ranking = rankingFor(used, ctx, rule);
    const picked = pickClient(used, torrent, {
      rule,
      clientSortBy: ctx.clientSortBy,
      rssAlias: ctx.rssAlias,
      ctx
    });
    rounds.push({
      index: i + 1,
      torrent: torrent.name,
      size,
      pickedId: picked && picked.id,
      pickedAlias: picked ? picked.alias : '未分配',
      rejected: !picked,
      ranking
    });
  }
  return {
    formula: (rule.type === 'sort' && (rule.scoreMode || 'priority') === 'weighted')
      ? WEIGHTED_SCORE_FORMULA
      : LOAD_SCORE_FORMULA,
    skipped,
    clients: used.map(item => snapshotClient(item, { pending: {}, rrIndex: 0 })),
    rounds,
    logs
  };
}

function rankingFor (clients, ctx, rule) {
  const snaps = clients.map(item => snapshotClient(item, ctx));
  if (rule && rule.type === 'sort' && (rule.scoreMode || 'priority') === 'weighted') {
    const ranked = scoreByWeighted(clients, (rule.metrics || []).filter(item => item.field), ctx);
    if (ranked) {
      const byId = {};
      ranked.forEach(item => {
        byId[item.client.id] = item.score;
      });
      snaps.forEach(snap => {
        snap.weightedScore = byId[snap.id];
      });
      snaps.sort((a, b) => (a.weightedScore || 0) - (b.weightedScore || 0));
      return snaps;
    }
  }
  snaps.sort((a, b) => a.loadScore - b.loadScore);
  return snaps;
}

module.exports = {
  register,
  listBuiltins,
  resolveRule,
  pickClient,
  debugPick,
  loadScore,
  canFit,
  scoreByWeighted,
  LOAD_SCORE_FORMULA,
  WEIGHTED_SCORE_FORMULA
};
