const fs = require('fs');
const path = require('path');
const Rss = require('../common/Rss');
const logger = require('../libs/logger');

const util = require('../libs/util');
class RssMod {
  add (options) {
    const id = util.uuid.v4().split('-')[0];
    const rssSet = { ...options };
    rssSet.id = id;
    fs.writeFileSync(path.join(__dirname, '../data/rss/', id + '.json'), JSON.stringify(rssSet, null, 2));
    if (global.runningRss[id]) global.runningRss[id].destroy();
    if (rssSet.enable) global.runningRss[id] = new Rss(rssSet);
    return '添加 Rss 成功';
  };

  delete (options) {
    fs.unlinkSync(path.join(__dirname, '../data/rss/', options.id + '.json'));
    if (global.runningRss[options.id]) global.runningRss[options.id].destroy();
    return '删除 Rss 成功';
  };

  async deleteRecord (options) {
    await util.runRecord('delete from torrents where id = ?', [options.id]);
    return '删除 Rss 记录成功';
  };

  modify (options) {
    const rssSet = { ...options };
    rssSet.sameServerClients = rssSet.sameServerClients || [];
    rssSet.reseedClients = rssSet.reseedClients || [];
    fs.writeFileSync(path.join(__dirname, '../data/rss/', options.id + '.json'), JSON.stringify(rssSet, null, 2));
    if (global.runningRss[options.id]) global.runningRss[options.id].destroy();
    if (rssSet.enable) global.runningRss[options.id] = new Rss(rssSet);
    return '修改 Rss 成功';
  };

  list () {
    const rssList = util.listRss();
    for (const rss of rssList) {
      if (rss.client) {
        rss.clientArr = [rss.client];
        delete rss.client;
      }
      rss.acceptRules = rss.acceptRules || [];
      rss.rejectRules = rss.rejectRules || [];
      rss.scrapePromo = rss.scrapePromo || (rss.scrapeFree ? ['free'] : []);
      rss.categorySuffixHr = rss.categorySuffixHr || false;
      rss.autoSiteTag = rss.autoSiteTag !== false;
      rss.tags = rss.tags || '';
      rss.allocateRule = rss.allocateRule || 'builtin:original';
    }
    return rssList;
  };

  async dryrun (options) {
    logger.info('[rss] 开始试运行:', options.alias || options.id || '新任务', 'RSS 数量:', options.rssUrls?.length || 0);
    const id = util.uuid.v4().split('-')[0];
    const rssSet = { ...options };
    rssSet.id = id;
    rssSet.dryrun = true;
    const rss = new Rss(rssSet);
    const torrents = await rss.dryrun();
    logger.info('[rss] 试运行完成:', options.alias || options.id || '新任务', '种子数量:', torrents.length);
    return torrents;
  };

  async dryrunRule (options) {
    const urls = (options.rssUrls || []).map(url => String(url || '').trim()).filter(url => /^https?:\/\//i.test(url));
    if (!urls.length) throw new Error('请填写有效的 RSS 地址');
    const rule = options.rule || {};
    const kind = options.kind === 'select' ? 'select' : 'rss';
    const mode = options.mode === 'reject' ? 'reject' : 'accept';
    const rss = new Rss({
      id: util.uuid.v4().split('-')[0],
      alias: '规则试运行',
      rssUrls: urls,
      cron: '* * * * *',
      dryrun: true,
      acceptRules: [],
      rejectRules: [],
      clientArr: [],
      clientSortBy: 'leechingCount',
      allocateRule: 'builtin:original',
      skipSameTorrent: false
    });
    const torrents = (await Promise.all(urls.map(url => require('../libs/rss').getTorrents(url)))).flat();
    const usableKeys = kind === 'select'
      ? ['title', 'subtitle', 'name', 'size', 'tags']
      : ['name', 'size', 'description'];
    const conditions = Array.isArray(rule.conditions) ? rule.conditions.filter(item => item && item.key && item.compareType) : [];
    const skipped = conditions.filter(item => usableKeys.indexOf(item.key) === -1);
    for (const torrent of torrents) {
      const mapped = {
        ...torrent,
        name: torrent.name || '',
        title: torrent.name || '',
        subtitle: torrent.description || '',
        description: torrent.description || '',
        size: torrent.size,
        tags: ''
      };
      if (rule.type === 'javascript') {
        torrent.status = '脚本规则请保存后到任务里试运行';
        continue;
      }
      const usable = conditions.filter(item => usableKeys.indexOf(item.key) !== -1);
      if (!usable.length) {
        torrent.status = skipped.length ? 'RSS 测不了这条规则用到的字段' : '规则还没有条件';
        continue;
      }
      let fit = false;
      try {
        fit = rss._fitConditions(mapped, usable);
      } catch (e) {
        torrent.status = '匹配出错: ' + e.message;
        continue;
      }
      if (kind === 'select') {
        torrent.status = fit ? '命中' : '未命中';
      } else if (mode === 'reject') {
        torrent.status = fit ? '会拒绝' : '不会拒绝';
      } else {
        torrent.status = fit ? '会选中' : '不会选中';
      }
      if (skipped.length) torrent.status += ' · 已跳过 ' + skipped.map(item => item.key).join(',');
    }
    return torrents;
  };

  async scrapeDryrun (options) {
    logger.info('[rss] 开始检测免费/HR 试运行:', options.alias || options.id || '新任务');
    const torrents = await this.dryrun(options);
    for (const torrent of torrents) {
      torrent.promo = '未检测';
      torrent.hr = '未检测';
    }
    logger.info('[rss] 检测免费/HR 试运行完成:', options.alias || options.id || '新任务', '种子数量:', torrents.length);
    return torrents;
  };

  async scrapeTorrent (options) {
    if (!options.link) {
      logger.warn('[rss] 单条检测失败: 种子详情链接为空');
      throw new Error('种子详情链接为空');
    }
    logger.info('[rss] 开始单条检测促销/HR:', options.link, 'Cookie 长度:', options.cookie ? String(options.cookie).length : 0);
    const result = {
      promo: '未检测',
      hr: '未检测'
    };
    try {
      const promoType = await util.scrapePromo(options.link, options.cookie);
      const formatted = util.formatPromo(promoType);
      result.promo = formatted.label;
      result.promoType = formatted.type;
      logger.info('[rss] 单条检测促销结果:', options.link, result.promo);
    } catch (e) {
      result.promo = '检测失败';
      result.promoError = e.message;
      logger.error('[rss] 单条检测促销失败:', options.link, e.message);
      if (e.stack) {
        logger.error('[rss] 错误堆栈:', e.stack);
      }
    }
    try {
      result.hr = await util.scrapeHr(options.link, options.cookie) ? '是' : '否';
      logger.info('[rss] 单条检测 HR 结果:', options.link, result.hr);
    } catch (e) {
      result.hr = '检测失败';
      result.hrError = e.message;
      logger.error('[rss] 单条检测 HR 失败:', options.link, e.message);
      if (e.stack) {
        logger.error('[rss] 错误堆栈:', e.stack);
      }
    }
    logger.info('[rss] 单条检测完成:', options.link, 'promo=', result.promo, 'hr=', result.hr);
    return result;
  };

  promoSupport (hosts) {
    const support = {};
    for (const host of hosts) {
      support[host] = util.getPromoSupport(host);
    }
    const merged = new Set();
    for (const types of Object.values(support)) {
      for (const type of types) {
        merged.add(type);
      }
    }
    return {
      hosts: support,
      merged: Array.from(merged)
    };
  };

  batchUpdate (options) {
    const action = options.action;
    const clientId = options.clientId;
    const allocateRule = options.allocateRule;
    const rssIds = options.rssIds || [];
    const want = new Set(rssIds);
    if (!action) {
      throw new Error('缺少批量操作类型');
    }
    if (['addClient', 'removeClient', 'syncClient'].indexOf(action) !== -1 && !clientId) {
      throw new Error('请选择下载器');
    }
    if (['setAllocate', 'syncAllocate'].indexOf(action) !== -1 && !allocateRule) {
      throw new Error('请选择分配方案');
    }
    if (['addClient', 'removeClient', 'setAllocate'].indexOf(action) !== -1 && !rssIds.length) {
      throw new Error('请选择 RSS 任务');
    }
    const rssList = this.list();
    let updated = 0;
    let skipped = 0;
    const apply = (rss) => {
      this.modify(rss);
      updated += 1;
    };
    if (action === 'addClient') {
      for (const rss of rssList) {
        if (!want.has(rss.id)) continue;
        if ((rss.clientArr || []).indexOf(clientId) !== -1) continue;
        rss.clientArr = [...(rss.clientArr || []), clientId];
        apply(rss);
      }
    } else if (action === 'removeClient') {
      for (const rss of rssList) {
        if (!want.has(rss.id)) continue;
        if ((rss.clientArr || []).indexOf(clientId) === -1) continue;
        if ((rss.clientArr || []).length <= 1) {
          skipped += 1;
          continue;
        }
        rss.clientArr = rss.clientArr.filter(item => item !== clientId);
        apply(rss);
      }
    } else if (action === 'setAllocate') {
      for (const rss of rssList) {
        if (!want.has(rss.id)) continue;
        if ((rss.allocateRule || 'builtin:original') === allocateRule) continue;
        rss.allocateRule = allocateRule;
        apply(rss);
      }
    } else if (action === 'syncClient') {
      for (const rss of rssList) {
        const has = (rss.clientArr || []).indexOf(clientId) !== -1;
        const should = want.has(rss.id);
        if (should && !has) {
          rss.clientArr = [...(rss.clientArr || []), clientId];
          apply(rss);
        } else if (!should && has) {
          if ((rss.clientArr || []).length <= 1) {
            skipped += 1;
            continue;
          }
          rss.clientArr = rss.clientArr.filter(item => item !== clientId);
          apply(rss);
        }
      }
    } else if (action === 'syncAllocate') {
      for (const rss of rssList) {
        const current = rss.allocateRule || 'builtin:original';
        const should = want.has(rss.id);
        if (should && current !== allocateRule) {
          rss.allocateRule = allocateRule;
          apply(rss);
        } else if (!should && current === allocateRule && allocateRule !== 'builtin:original') {
          rss.allocateRule = 'builtin:original';
          apply(rss);
        }
      }
    } else {
      throw new Error('不支持的批量操作');
    }
    let message = `已更新 ${updated} 个 RSS 任务`;
    if (skipped) {
      message += `；${skipped} 个因只剩一台下载器未移除`;
    }
    logger.info('[rss] 批量更新:', action, message);
    return message;
  };
}

module.exports = RssMod;
