const fs = require('fs');
const path = require('path');
const moment = require('moment');
const util = require('../libs/util');
const redis = require('../libs/redis');
const Push = require('../common/Push');
const otp = require('../libs/otp');

const settingPath = path.join(__dirname, '../data/setting.json');
const proxyPath = path.join(__dirname, '../data/setting/proxy.json');
const torrentHistorySettingPath = path.join(__dirname, '../data/setting/torrent-history-setting.json');
const torrentMixSettingPath = path.join(__dirname, '../data/setting/torrent-mix-setting.json');
const torrentPushSettingPath = path.join(__dirname, '../data/setting/torrent-push-setting.json');

class SettingMod {
  get () {
    const settingStr = fs.readFileSync(settingPath, { encoding: 'utf-8' });
    return { time: moment().unix(), ...JSON.parse(settingStr), password: '' };
  };

  async cookieFromRss (options) {
    const setting = JSON.parse(fs.readFileSync(settingPath, { encoding: 'utf-8' }));
    const cc = setting.cookiecloud || {};
    if (!cc.enable) {
      throw new Error('请先在「设置 → CookieCloud」启用同步');
    }
    const hosts = util.hostsFromRssUrls(options.urls || options.rssUrls);
    if (!hosts.length) {
      throw new Error('请先填写有效的 RSS 地址');
    }
    if (hosts.length > 1) {
      throw new Error('这些 RSS 不是同一站点: ' + hosts.join(', '));
    }
    if (util.isMteamHost(hosts[0])) {
      throw new Error('馒头请填 API Key，不要从 CookieCloud 填网页 Cookie');
    }
    const rows = await util.fetchCookieCloudCookies(cc);
    const matched = util.matchCookiesForHost(rows, hosts[0]);
    if (!matched.cookie) {
      throw new Error('CookieCloud 里没有「' + hosts[0] + '」的 Cookie，请确认浏览器已同步该站');
    }
    return matched;
  };

  getBackground () {
    return `@vt-bg-image: url('${global.background}');`;
  };

  getCss () {
    const settingStr = fs.readFileSync(settingPath, { encoding: 'utf-8' });
    return JSON.parse(settingStr).cssStyle || '';
  };

  modify (_options) {
    if (_options.password === '') {
      delete _options.password;
    }
    if (_options.otp && _options.otpPw && _options.otp !== '******') {
      if (otp.verify(_options.otp, _options.otpPw)) {
        global.auth.otp = _options.otp;
      } else {
        throw new Error('二步验证码错误');
      }
    } else {
      delete _options.otp;
    }
    delete _options.otpPw;
    delete _options.time;
    const options = Object.assign(JSON.parse(fs.readFileSync(settingPath, { encoding: 'utf-8' })), _options);
    options.apiKey = options.apiKey || util.uuid.v4().replace(/-/g, '').toUpperCase();
    fs.writeFileSync(settingPath, JSON.stringify(options, null, 2));
    global.auth = {
      username: options.username,
      password: options.password,
      otp: global.auth.otp
    };
    global.webhookPushTo = options.webhookPushTo;
    if (options.menu && options.menu.length) {
      options.menu = options.menu.map(item => item === '/scrape' ? '/task/scrape' : item);
      options.menu = [...new Set(options.menu)];
    }
    global.menu = options.menu || [];
    global.dashboardContent = options.dashboardContent || [];
    global.userAgent = options.userAgent;
    global.ignoreError = options.ignoreError;
    global.ignoreDependCheck = options.ignoreDependCheck;
    global.apiKey = options.apiKey;
    global.trustVertexPanel = options.trustVertexPanel;
    global.theme = options.theme;
    global.siteInfo = options.siteInfo;
    global.trustAllCerts = options.trustAllCerts;
    global.background = options.background;
    global.tmdbApiKey = options.tmdbApiKey;
    global.dataPath = options.dataPath || '/';
    global.wechatCover = options.wechatCover;
    global.embyCover = options.embyCover;
    global.plexCover = options.plexCover;
    global.wechatToken = options.wechatToken;
    global.wechatAesKey = options.wechatAesKey;
    global.doubanPush = options.doubanPush;
    global.panelKey = options.panelKey;
    global.telegramProxy = options.telegramProxy || 'https://api.telegram.org';
    global.wechatProxy = options.wechatProxy;
    const webhookPush = util.listPush().filter(item => item.id === global.webhookPushTo)[0];
    if (webhookPush) {
      global.webhookPush = new Push({ ...webhookPush, push: true });
    }
    const doubanPush = util.listPush().filter(item => item.id === global.doubanPush)[0];
    if (doubanPush) {
      global.doubanPush = new Push({ ...doubanPush, push: true });
      global.doubanPush.modifyWechatMenu();
    }
    // cookiecloud
    util.initCookieCloud();
    return '修改全局设置成功, 部分设定需要刷新页面生效';
  };

  getTorrentHistorySetting () {
    const settingStr = fs.readFileSync(torrentHistorySettingPath, { encoding: 'utf-8' });
    return JSON.parse(settingStr);
  };

  modifyTorrentHistorySetting (options) {
    fs.writeFileSync(torrentHistorySettingPath, JSON.stringify(options, null, 2));
    return '修改成功';
  };

  getTorrentMixSetting () {
    const settingStr = fs.readFileSync(torrentMixSettingPath, { encoding: 'utf-8' });
    return JSON.parse(settingStr);
  };

  modifyTorrentMixSetting (options) {
    fs.writeFileSync(torrentMixSettingPath, JSON.stringify(options, null, 2));
    return '修改成功';
  };

  getTorrentPushSetting () {
    const settingStr = fs.readFileSync(torrentPushSettingPath, { encoding: 'utf-8' });
    return JSON.parse(settingStr);
  };

  modifyTorrentPushSetting (options) {
    fs.writeFileSync(torrentPushSettingPath, JSON.stringify(options, null, 2));
    return '修改成功';
  };

  async getRunInfo () {
    const { uploaded, downloaded } = (await util.getRecord('select sum(upload) as uploaded, sum(download) as downloaded from torrents'));
    const addCountToday = (await util.getRecord('select count(*) as addCount from torrents where record_type = 1 and record_time > ?', [moment().startOf('day').unix()])).addCount;
    const rejectCountToday = (await util.getRecord('select count(*) as rejectCount from torrents where record_type = 2 and record_time > ?', [moment().startOf('day').unix()])).rejectCount;
    const deleteCountToday = (await util.getRecord('select count(*) as deleteCount from torrents where delete_time is not null and record_time > ?', [moment().startOf('day').unix()])).deleteCount;
    const addCount = (await util.getRecord('select count(*) as addCount from torrents where record_type = 1')).addCount;
    const rejectCount = (await util.getRecord('select count(*) as rejectCount from torrents where record_type = 2')).rejectCount;
    const deleteCount = (await util.getRecord('select count(*) as deleteCount from torrents where delete_time is not null')).deleteCount;
    const perTracker = (await util.getRecords('select sum(upload) as uploaded, sum(download) as downloaded, tracker from torrents where tracker is not null group by tracker'));
    const perTrackerTodaySet = {};
    let uploadedToday = 0;
    let downloadedToday = 0;
    const torrents = await util.getRecords('select a.hash as hash, max(a.upload) - min(a.upload) as upload,  max(a.download) - min(a.download) as download, b.tracker as tracker from torrent_flow a left join torrents b on a.hash = b.hash where a.time >= ? group by a.hash', [moment().startOf('day').unix()]);
    for (const torrent of torrents) {
      uploadedToday += torrent.upload;
      downloadedToday += torrent.download;
      if (!torrent.tracker) {
        continue;
      }
      if (!perTrackerTodaySet[torrent.tracker]) {
        perTrackerTodaySet[torrent.tracker] = { uploaded: 0, downloaded: 0 };
      }
      perTrackerTodaySet[torrent.tracker].uploaded += torrent.upload;
      perTrackerTodaySet[torrent.tracker].downloaded += torrent.download;
    }
    const perTrackerToday = [];
    for (const tracker of Object.keys(perTrackerTodaySet)) {
      perTrackerToday.push({ tracker, ...perTrackerTodaySet[tracker] });
    }
    const errors = global.ignoreError ? [] : JSON.parse(await redis.get('vertex:error:list') || '[]');
    await redis.set('vertex:error:list', '[]');
    let health = { issues: [] };
    try {
      health = await this.getHealth();
    } catch (e) {
      health = { issues: [] };
    }
    return {
      dashboardContent: global.dashboardContent,
      uploaded: uploaded || 0,
      downloaded: downloaded || 0,
      uploadedToday: uploadedToday || 0,
      downloadedToday: downloadedToday || 0,
      addCount,
      rejectCount,
      deleteCount,
      addCountToday,
      rejectCountToday,
      deleteCountToday,
      startTime: global.startTime,
      perTracker,
      perTrackerToday,
      errors,
      health
    };
  };

  async getHealth () {
    const issues = [];
    const now = moment().unix();
    const GB = 1024 * 1024 * 1024;

    (util.listClient() || []).forEach((client) => {
      if (!client.enable) return;
      const running = global.runningClient[client.id];
      const ok = !!(running && running.status && running.maindata);
      if (!ok) {
        issues.push({
          level: 'danger',
          group: '下载器',
          title: client.alias + ' 连不上',
          body: '已启用但没有数据',
          href: '/base/downloader'
        });
        return;
      }
      const free = running.maindata.freeSpaceOnDisk || 0;
      if (free > 0 && free < 5 * GB) {
        issues.push({
          level: 'danger',
          group: '下载器',
          title: client.alias + ' 磁盘将满',
          body: '剩余 ' + util.formatSize(free),
          href: '/base/downloader'
        });
      } else if (free > 0 && free < 20 * GB) {
        issues.push({
          level: 'warn',
          group: '下载器',
          title: client.alias + ' 磁盘偏低',
          body: '剩余 ' + util.formatSize(free),
          href: '/base/downloader'
        });
      }
    });

    (util.listSite() || []).forEach((site) => {
      if (!site.enable) return;
      if (!String(site.cookie || '').trim()) {
        issues.push({
          level: 'warn',
          group: '站点',
          title: (site.name || '站点') + ' 未填 Cookie',
          body: '刷流或刷新可能失败',
          href: '/base/site'
        });
      }
      const info = global.runningSite[site.name] && global.runningSite[site.name].info;
      const updateTime = info && (info.updateTime || info.update_time);
      if (updateTime && now - Number(updateTime) > 36 * 3600) {
        issues.push({
          level: 'warn',
          group: '站点',
          title: (site.name || '站点') + ' 很久没刷新',
          body: '上次刷新超过 36 小时',
          href: '/base/site'
        });
      }
    });

    const since = moment().subtract(6, 'hours').unix();
    let rssStats = [];
    try {
      rssStats = await util.getRecords(
        'select rss_id as rssId, sum(case when record_type = 1 then 1 else 0 end) as added, sum(case when record_type = 2 then 1 else 0 end) as rejected from torrents where record_time > ? and record_type in (1, 2) group by rss_id',
        [since]
      );
    } catch (e) {
      rssStats = [];
    }
    const statMap = {};
    rssStats.forEach((row) => { statMap[row.rssId] = row; });

    (util.listRss() || []).filter(item => item.enable).forEach((task) => {
      const urls = (task.rssUrls || []).map(url => String(url || '').trim()).filter(url => /^https?:\/\//i.test(url));
      if (!urls.length) {
        issues.push({
          level: 'warn',
          group: 'RSS',
          title: task.alias + ' 还没填地址',
          body: '任务已开，RSS 仍是占位',
          href: '/task/rss'
        });
      }
      if (!(task.clientArr || []).length) {
        issues.push({
          level: 'warn',
          group: 'RSS',
          title: task.alias + ' 未绑下载器',
          body: '推送时没有可用下载器',
          href: '/task/rss'
        });
      }
      const running = global.runningRss[task.id];
      if (running && running.lastRssTime && now - running.lastRssTime > 6 * 3600) {
        issues.push({
          level: 'warn',
          group: 'RSS',
          title: task.alias + ' 很久没有拉取',
          body: '超过 6 小时没有成功 RSS',
          href: '/history/rss'
        });
      }
      const stat = statMap[task.id];
      if (stat && +stat.rejected >= 8 && +stat.added === 0) {
        issues.push({
          level: 'warn',
          group: 'RSS',
          title: task.alias + ' 连续拒绝',
          body: '近 6 小时拒绝 ' + stat.rejected + ' 条，没有添加',
          href: '/history/rss'
        });
      }
    });

    return { issues, generatedAt: Date.now() };
  }

  async backupVertex (options) {
    const backupsFile = `/tmp/Vertex-backups-${moment().format('YYYY-MM-DD_HH:mm:ss')}.tar.gz`;
    const backupsFileds = ['vertex/db', 'vertex/data', 'vertex/config'];
    if (options.bt + '' === 'true') {
      backupsFileds.push('vertex/torrents');
    }
    await util.tar.c({
      gzip: true,
      file: backupsFile,
      cwd: global.dataPath
    }, backupsFileds);
    return backupsFile;
  }

  async restoreVertex (options) {
    const backupsFile = options.file.path || options.file.originalFilename;
    await util.tar.x({
      gzip: true,
      file: backupsFile,
      C: '/tmp'
    });
    return '数据导入成功, 重启容器后生效。';
  }

  async networkTest (options) {
    return await util.requestPromise({
      url: options.address,
      headers: {
        cookie: options.cookie
      }
    });
  }

  async getTrackerFlowHistory () {
    const _timeGroup = await util.getRecords('select time from tracker_flow where time >= ? group by time', [moment().unix() - 24 * 3600]);
    const timeGroup = _timeGroup.map(i => i.time);
    const res = await util.getRecords('select * from tracker_flow where time >= ?', [moment().unix() - 24 * 3600]);
    const trackers = {};
    for (const item of res) {
      if (!item.tracker) continue;
      if (!trackers[item.tracker]) trackers[item.tracker] = {};
      trackers[item.tracker][item.time] = item;
    }
    for (const _tracker of Object.keys(trackers)) {
      const tracker = trackers[_tracker];
      for (const [index, time] of timeGroup.entries()) {
        const _t = tracker[time] || tracker[timeGroup[index - 1]] || { download: 0, upload: 0 };
        tracker[time] = { download: +(_t.download / 300).toFixed(2), upload: +(_t.upload / 300).toFixed(2) };
      }
    }
    return {
      trackers,
      timeGroup
    };
  }

  getHosts () {
    const hosts = fs.readFileSync('/etc/hosts', { encoding: 'utf-8' });
    return hosts;
  };

  save (options) {
    fs.writeFileSync('/etc/hosts', options.hosts);
    fs.copyFileSync('/etc/hosts', path.join(__dirname, '../data/hosts'));
    return '保存成功';
  };

  import () {
    fs.copyFileSync(path.join(__dirname, '../data/hosts'), '/etc/hosts');
    return '导入成功';
  };

  export () {
    fs.copyFileSync('/etc/hosts', path.join(__dirname, '../data/hosts'));
    return '导出成功';
  };

  getProxy () {
    const settingStr = fs.readFileSync(proxyPath, { encoding: 'utf-8' });
    return JSON.parse(settingStr);
  };

  saveProxy (options) {
    fs.writeFileSync(proxyPath, JSON.stringify({ proxy: options.proxy || '', domains: options.domains || '' }, null, 2));
    global.proxy = options.proxy || '';
    global.domains = options.domains || '';
    return '保存成功';
  };

  async clearHistory () {
    await util.runRecord('delete from sites;');
    await util.runRecord('delete from torrent_flow;');
    await util.runRecord('delete from torrents;');
    await util.runRecord('delete from tracker_flow;');
    await util.runRecord('delete from vnstat;');
    return '删除成功';
  };
}

module.exports = SettingMod;
