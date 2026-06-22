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

  async scrapeDryrun (options) {
    logger.info('[rss] 开始检测免费/HR 试运行:', options.alias || options.id || '新任务');
    const torrents = await this.dryrun(options);
    for (const torrent of torrents) {
      torrent.free = '未检测';
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
    logger.info('[rss] 开始单条检测免费/HR:', options.link, 'Cookie 长度:', options.cookie ? String(options.cookie).length : 0);
    const result = {
      free: '未检测',
      hr: '未检测'
    };
    try {
      result.free = await util.scrapeFree(options.link, options.cookie) ? '是' : '否';
      logger.info('[rss] 单条检测免费结果:', options.link, result.free);
    } catch (e) {
      result.free = '检测失败';
      result.freeError = e.message;
      logger.error('[rss] 单条检测免费失败:', options.link, e.message);
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
    logger.info('[rss] 单条检测完成:', options.link, 'free=', result.free, 'hr=', result.hr);
    return result;
  };

  async mikanSearch (options) {
    const rssList = util.listRss();
    const rssSet = rssList.filter(item => item.id === options.rss)[0];
    rssSet.dryrun = true;
    const rss = new Rss(rssSet);
    const torrents = await rss.mikanSearch(options.name);
    return torrents;
  };

  async mikanPush (options) {
    const rssList = util.listRss();
    const rssSet = rssList.filter(item => item.id === options.rss)[0];
    rssSet.dryrun = true;
    const rss = new Rss(rssSet);
    rss.rss(options.torrents);
    return '任务已开始执行。';
  };
}

module.exports = RssMod;
