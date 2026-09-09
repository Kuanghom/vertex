const fs = require('fs');
const path = require('path');
const Client = require('../common/Client');
const Rss = require('../common/Rss');
const Douban = require('../common/Douban');
const Watch = require('../common/Watch');

const util = require('../libs/util');

class ClientMod {
  add (options) {
    const id = util.uuid.v4().split('-')[0];
    const clientSet = { ...options };
    clientSet.id = id;
    clientSet.deleteRules = clientSet.deleteRules || [];
    clientSet.sameServerClients = clientSet.sameServerClients || [];
    clientSet.sameServerClients.push(id);
    fs.writeFileSync(path.join(__dirname, '../data/client/', id + '.json'), JSON.stringify(clientSet, null, 2));
    if (global.runningClient[id]) global.runningClient[id].destroy();
    if (clientSet.enable) global.runningClient[id] = new Client(clientSet);
    return '添加下载器成功';
  };

  _reloadRss (rssSet) {
    fs.writeFileSync(path.join(__dirname, '../data/rss/', rssSet.id + '.json'), JSON.stringify(rssSet, null, 2));
    if (global.runningRss[rssSet.id]) global.runningRss[rssSet.id].destroy();
    if (rssSet.enable) global.runningRss[rssSet.id] = new Rss(rssSet);
  }

  _reloadDouban (doubanSet) {
    fs.writeFileSync(path.join(__dirname, '../data/douban/', doubanSet.id + '.json'), JSON.stringify(doubanSet, null, 2));
    if (global.runningDouban[doubanSet.id]) global.runningDouban[doubanSet.id].destroy();
    if (doubanSet.enable) global.runningDouban[doubanSet.id] = new Douban(doubanSet);
  }

  _reloadWatch (watchSet) {
    fs.writeFileSync(path.join(__dirname, '../data/watch/', watchSet.id + '.json'), JSON.stringify(watchSet, null, 2));
    if (global.runningWatch[watchSet.id]) global.runningWatch[watchSet.id].destroy();
    if (watchSet.enable) global.runningWatch[watchSet.id] = new Watch(watchSet);
  }

  _reloadClient (clientSet) {
    fs.writeFileSync(path.join(__dirname, '../data/client/', clientSet.id + '.json'), JSON.stringify(clientSet, null, 2));
    if (global.runningClient[clientSet.id]) global.runningClient[clientSet.id].destroy();
    if (clientSet.enable) global.runningClient[clientSet.id] = new Client(clientSet);
  }

  _reloadRssRulesForRule (ruleId) {
    Object.keys(global.runningRss).forEach(rssId => {
      const rss = global.runningRss[rssId];
      const usesRule = rss._acceptRules.some(id => id === ruleId) ||
        rss._rejectRules.some(id => id === ruleId);
      if (usesRule) rss.reloadRssRule();
    });
  }

  getReferences (clientId) {
    const rssList = util.listRss();
    const doubanList = util.listDouban();
    const watchList = util.listWatch();
    const rssRuleList = util.listRssRule();
    const clientList = util.listClient();

    const rss = [];
    const rssSeen = new Set();
    for (const item of rssList) {
      const clientArr = item.clientArr || (item.client ? [item.client] : []);
      const reseedClients = item.reseedClients || [];
      const inClientArr = clientArr.indexOf(clientId) !== -1;
      const inReseed = reseedClients.indexOf(clientId) !== -1;
      if (!inClientArr && !inReseed) continue;
      if (rssSeen.has(item.id)) continue;
      rssSeen.add(item.id);
      const parts = [];
      if (inClientArr) parts.push('下载器');
      if (inReseed) parts.push('辅种下载器');
      rss.push({
        id: item.id,
        alias: item.alias,
        enable: !!item.enable,
        detail: parts.join('、'),
        emptyClientArr: inClientArr && clientArr.length === 1
      });
    }

    const douban = doubanList
      .filter(item => item.client === clientId)
      .map(item => ({ id: item.id, alias: item.alias, enable: !!item.enable }));

    const watch = watchList
      .filter(item => item.downloader === clientId)
      .map(item => ({ id: item.id, alias: item.alias, enable: !!item.enable }));

    const rssRule = rssRuleList
      .filter(item => item.client === clientId)
      .map(item => ({ id: item.id, alias: item.alias }));

    const client = clientList
      .filter(item => item.id !== clientId && (item.sameServerClients || []).indexOf(clientId) !== -1)
      .map(item => ({ id: item.id, alias: item.alias, enable: !!item.enable }));

    const total = rss.length + douban.length + watch.length + rssRule.length + client.length;
    return { rss, douban, watch, rssRule, client, total };
  }

  _removeReferences (clientId) {
    const cleaned = { rss: 0, douban: 0, watch: 0, rssRule: 0, client: 0 };

    for (const rssSet of util.listRss()) {
      const clientArr = rssSet.clientArr || (rssSet.client ? [rssSet.client] : []);
      const reseedClients = rssSet.reseedClients || [];
      const nextClientArr = clientArr.filter(id => id !== clientId);
      const nextReseed = reseedClients.filter(id => id !== clientId);
      if (nextClientArr.length === clientArr.length && nextReseed.length === reseedClients.length) continue;
      if (rssSet.client) delete rssSet.client;
      rssSet.clientArr = nextClientArr;
      rssSet.reseedClients = nextReseed;
      this._reloadRss(rssSet);
      cleaned.rss += 1;
    }

    for (const doubanSet of util.listDouban()) {
      if (doubanSet.client !== clientId) continue;
      delete doubanSet.client;
      this._reloadDouban(doubanSet);
      cleaned.douban += 1;
    }

    for (const watchSet of util.listWatch()) {
      if (watchSet.downloader !== clientId) continue;
      delete watchSet.downloader;
      this._reloadWatch(watchSet);
      cleaned.watch += 1;
    }

    const affectedRuleIds = [];
    for (const rssRule of util.listRssRule()) {
      if (rssRule.client !== clientId) continue;
      const nextRule = { ...rssRule };
      delete nextRule.client;
      fs.writeFileSync(path.join(__dirname, '../data/rule/rss/', rssRule.id + '.json'), JSON.stringify(nextRule, null, 2));
      affectedRuleIds.push(rssRule.id);
      cleaned.rssRule += 1;
    }
    for (const ruleId of affectedRuleIds) {
      this._reloadRssRulesForRule(ruleId);
    }

    for (const clientSet of util.listClient()) {
      if (clientSet.id === clientId) continue;
      const sameServerClients = clientSet.sameServerClients || [];
      if (sameServerClients.indexOf(clientId) === -1) continue;
      clientSet.sameServerClients = sameServerClients.filter(id => id !== clientId);
      this._reloadClient(clientSet);
      cleaned.client += 1;
    }

    return cleaned;
  }

  delete (options) {
    const cleaned = this._removeReferences(options.id);
    fs.unlinkSync(path.join(__dirname, '../data/client/', options.id + '.json'));
    if (global.runningClient[options.id]) global.runningClient[options.id].destroy();
    const parts = [];
    if (cleaned.rss) parts.push(`${cleaned.rss} 个 RSS 任务`);
    if (cleaned.douban) parts.push(`${cleaned.douban} 个豆瓣订阅`);
    if (cleaned.watch) parts.push(`${cleaned.watch} 个监控分类`);
    if (cleaned.rssRule) parts.push(`${cleaned.rssRule} 条 RSS 规则`);
    if (cleaned.client) parts.push(`${cleaned.client} 个下载器同服配置`);
    const detail = parts.length ? `，已从 ${parts.join('、')} 中移除引用` : '';
    return `删除下载器成功${detail}`;
  };

  modify (options) {
    const clientSet = { ...options };
    clientSet.deleteRules = clientSet.deleteRules || [];
    clientSet.sameServerClients = clientSet.sameServerClients || [];
    if (global.runningClient[clientSet.id]) global.runningClient[options.id].destroy();
    if (clientSet.enable) global.runningClient[options.id] = new Client(clientSet);
    fs.writeFileSync(path.join(__dirname, '../data/client/', options.id + '.json'), JSON.stringify(clientSet, null, 2));
    return '修改下载器成功';
  };

  list () {
    const clientList = util.listClient();
    for (const client of clientList) {
      client.references = this.getReferences(client.id);
      client.used = client.references.total > 0;
      client.status = !!(client.enable && global.runningClient[client.id] && global.runningClient[client.id].status && global.runningClient[client.id].maindata);
      if (client.status) {
        client.allTimeUpload = global.runningClient[client.id].maindata.allTimeUpload;
        client.allTimeDownload = global.runningClient[client.id].maindata.allTimeDownload;
        client.uploadSpeed = global.runningClient[client.id].maindata.uploadSpeed;
        client.downloadSpeed = global.runningClient[client.id].maindata.downloadSpeed;
        client.leechingCount = global.runningClient[client.id].maindata.leechingCount;
        client.seedingCount = global.runningClient[client.id].maindata.seedingCount;
      }
    }
    return clientList;
  };

  listMainInfo () {
    const clientList = util.listClient();
    const clientInfos = [];
    for (const client of clientList) {
      const c = {};
      c.id = client.id;
      c.alias = client.alias;
      c.enable = client.enable;
      c.autoDelete = client.autoDelete;
      c.clientUrl = client.clientUrl;
      client.status = !!(client.enable && global.runningClient[client.id] && global.runningClient[client.id].status && global.runningClient[client.id].maindata);
      c.status = client.status;
      if (client.status) {
        c.allTimeUpload = global.runningClient[client.id].maindata.allTimeUpload;
        c.allTimeDownload = global.runningClient[client.id].maindata.allTimeDownload;
        c.uploadSpeed = global.runningClient[client.id].maindata.uploadSpeed;
        c.downloadSpeed = global.runningClient[client.id].maindata.downloadSpeed;
        c.leechingCount = global.runningClient[client.id].maindata.leechingCount;
        c.seedingCount = global.runningClient[client.id].maindata.seedingCount;
        c.freeSpaceOnDisk = global.runningClient[client.id].maindata.freeSpaceOnDisk || 0;
      }
      clientInfos.push(c);
    }
    return clientInfos;
  }

  listTop10 ({ id }) {
    const top10 = [];
    const client = global.runningClient[id];
    if (!client) throw new Error('下载器未启用');
    const top10Torrents = client.maindata.torrents.sort((a, b) => b.uploadSpeed - a.uploadSpeed || b.downloadSpeed - a.downloadSpeed).slice(0, 10);
    for (const torrent of top10Torrents) {
      const t = { ...torrent };
      delete t.originProp;
      top10.push(t);
    }
    return top10;
  }

  async getSpeedPerTracker () {
    const clients = global.runningClient;
    const trackers = {};
    for (const clientId of Object.keys(clients)) {
      if (!clients[clientId].maindata) continue;
      for (const torrent of clients[clientId].maindata.torrents) {
        const _tracker = torrent.tracker || '错误状态';
        const tracker = _tracker.match(/.*?([^.]*\.[^.]*$)/)[1];
        if (!trackers[tracker]) trackers[tracker] = { upload: 0, download: 0 };
        trackers[tracker].upload += torrent.uploadSpeed;
        trackers[tracker].download += torrent.downloadSpeed;
      }
    }
    const trackerArr = Object.keys(trackers).map(i => {
      return {
        ...trackers[i],
        tracker: i
      };
    });
    return {
      trackerList: trackerArr,
      trackers: Object.keys(trackers)
    };
  };

  async getLogs (options) {
    const client = global.runningClient[options.client];
    if (!client) {
      const config = util.listClient().find(item => item.id === options.client);
      if (config && !config.enable) {
        throw new Error(`下载器「${config.alias}」已禁用, 请先启用后再查看日志`);
      }
      throw new Error('下载器未连接, 无法获取日志');
    }
    if (!client.status) {
      throw new Error(`下载器「${client.alias}」登录失败, 无法获取日志`);
    }
    return await client.getLogs();
  };
}

module.exports = ClientMod;
