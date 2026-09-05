const moment = require('moment');
const logger = require('../logger');
const util = require('../util');

class Slack {
  constructor (slack) {
    this.slackWebhook = slack.slackWebhook;
    this.slackToken = slack.slackToken;
    this.alias = slack.alias;
  };

  async pushSlack (title, desp, poster) {
    const _poster = poster || global.wechatCover || 'https://pic.lswl.in/images/2022/07/11/bf4eabf1afa841f4527db4d207d265c3.png';
    const option = {
      url: this.slackWebhook,
      method: 'POST',
      json: {
        attachments: [
          {
            color: util.randomColor(),
            fallback: title,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: title,
                  emoji: true
                }
              },
              {
                type: 'image',
                image_url: _poster,
                alt_text: 'inspiration'
              },
              {
                type: 'context',
                elements: [
                  {
                    text: desp,
                    type: 'mrkdwn'
                  }
                ]
              },
              {
                type: 'context',
                elements: [
                  {
                    text: '发送自: Vertex',
                    type: 'mrkdwn'
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    const res = await util.requestPromise(option);
    const json = res.body;
    if (json !== 'ok') {
      logger.error('推送失败', this.alias, title, res.body);
      return;
    }
    return '';
  };

  async rssError (rss) {
    const title = 'RSS 失败';
    const desp = `*RSS 任务*: ${rss.alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      '详细原因请前往 Vertex 日志页面查看';
    await this.pushSlack(title, desp);
  };

  async scrapeError (rss, torrent) {
    const title = '抓取失败';
    const desp = `*RSS 任务*: ${rss.alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子 hash*: ${torrent.hash}\n` +
      '请确认 Rss 站点是否支持抓取免费或抓取 HR, 若确认无问题, 请前往 Vertex 日志页面查看详细原因';
    await this.pushSlack(title, desp);
  };

  async addTorrent (rss, client, torrent) {
    const title = '添加种子';
    const desp = `*RSS 任务*: ${rss.alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子大小*: ${util.formatSize(torrent.size)}\n` +
      `*种子 hash*: ${torrent.hash}`;
    await this.pushSlack(title, desp);
  };

  async selectTorrentError (alias, wish, note) {
    const title = `豆瓣搜索种子失败 - ${wish.name}`;
    let desp = `*豆瓣账号*: ${alias}\n` +
      `*搜索项目*: ${wish.name}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    if (note) {
      desp += note;
    } else {
      desp += wish.episodes ? `*进度信息*: 已完成至 ${wish.episodeNow} 集 / 全 ${wish.episodes} 集` : '';
    }
    await this.pushSlack(title, desp);
  };

  async addDoubanTorrent (client, torrent, rule, wish) {
    const title = `添加豆瓣种子 - ${wish.name}`;
    const site = global.runningSite[torrent.site];
    let desp = `*${wish.name} / ${client.alias} / ${rule.alias}*\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    desp += `*站点信息*: ${torrent.site} / ↑${util.formatSize(site.info.upload)} / ↓${util.formatSize(site.info.download)}\n`;
    desp += `*种子标题*: ${torrent.title}\n`;
    desp += `*副标题*: ${torrent.subtitle}\n`;
    desp += `*体积*: ${util.formatSize(torrent.size)}\n`;
    desp += `*状态*: ${torrent.seeders} / ${torrent.leechers} / ${torrent.snatches}`;
    desp += wish.episodes ? `\n*进度信息*: 已完成至 ${wish.episodeNow} 集 / 全 ${wish.episodes} 集` : '';
    await this.pushSlack(title, desp, wish.poster);
  };

  async addDoubanTorrentError (client, torrent, rule, wish) {
    const title = `添加豆瓣种子失败 - ${wish.name}`;
    const site = global.runningSite[torrent.site];
    let desp = `*${wish.name} / ${client.alias} / ${rule.alias}*\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    desp += `*站点信息*: ${torrent.site} / ↑${util.formatSize(site.info.upload)} / ↓${util.formatSize(site.info.download)}\n`;
    desp += `*种子标题*: ${torrent.title}\n`;
    desp += `*副标题*: ${torrent.subtitle}\n`;
    desp += `*状态*: ${torrent.seeders} / ${torrent.leechers} / ${torrent.snatches}`;
    desp += wish.episodes ? `\n*进度信息*: 已完成至 ${wish.episodeNow} 集 / 全 ${wish.episodes} 集` : '';
    await this.pushSlack(title, desp, wish.poster);
  };

  async addDouban (alias, wishes) {
    const title = `添加豆瓣账户 - ${alias}`;
    const desp = `*豆瓣账户*: ${alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*原有想看内容*: \n${wishes.map(item => item.name).join('\n')}`;
    await this.pushSlack(title, desp);
  };

  async startRefreshWish (key) {
    const title = `刷新豆瓣任务 - ${key.split('/')[0].trim()}`;
    const desp = `*信息*: ${key}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    await this.pushSlack(title, desp);
  };

  async startRefreshWishError (key) {
    const title = '刷新想看列表失败';
    const desp = `信息: ${key}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    await this.pushSlack(title, desp);
  };

  async addDoubanWish (alias, wish) {
    const title = `添加想看 - ${wish.name}`;
    const desp = `*豆瓣账户*: ${alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*影视名称*: ${wish.name}\n` +
      `*年份地区*: ${wish.year} / ${wish.area}\n` +
      `*主创团队*: ${wish.mainCreator}\n` +
      `*单集片长*: ${wish.length}\n` +
      `*语言*: ${wish.language}\n` +
      `*分类*: ${wish.category}\n` +
      `*简介*: ${wish.desc.split('\n')}`;
    await this.pushSlack(title, desp, wish.poster);
  };

  async torrentFinish (note) {
    const wish = note.wish;
    const title = `种子已完成 - ${wish.name}`;
    let desp = `*${wish.name}*\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`;
    desp += `*种子信息*: ${note.torrent.site} / ${note.torrent.title}`;
    desp += wish.episodes ? `\n*进度信息*: 已完成至 ${wish.episodeNow} 集 / 全 ${wish.episodes} 集` : '';
    await this.pushSlack(title, desp, wish.poster);
  };

  async addTorrentError (rss, client, torrent) {
    const title = `添加种子失败 - ${rss.alias}`;
    const desp = `*RSS 任务*: ${rss.alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子大小*: ${util.formatSize(torrent.size)}\n` +
      `*种子 hash*: ${torrent.hash}\n` +
      '详细原因请前往 Vertex 日志页面查看';
    await this.pushSlack(title, desp);
  };

  async rejectTorrent (rss, client = {}, torrent, note) {
    const title = '拒绝种子 ' + moment().format('YYYY-MM-DD HH:mm:ss');
    const desp = `*RSS 任务*: ${rss.alias}\n` +
      `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias || '未定义'}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子大小*: ${util.formatSize(torrent.size)}\n` +
      `*种子 hash*: ${torrent.hash}\n` +
      `*其它信息*: ${note}`;
    await this.pushSlack(title, desp);
  };

  async deleteTorrent (client, torrent, rule, deleteFile) {
    const title = '删除种子';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子大小*: ${util.formatSize(torrent.size)}\n` +
      `*种子 hash*: ${torrent.hash}\n` +
      `*已完成量*: ${util.formatSize(torrent.completed)}\n` +
      `*种子状态*: ${torrent.state}\n` +
      `*添加时间*: ${moment(torrent.addedTime * 1000).format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*删除时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*所属分类*: ${torrent.category}\n` +
      `*流量统计*: ${util.formatSize(torrent.uploaded)} ↑ / ${util.formatSize(torrent.downloaded)} ↓\n` +
      `*即时速度*: ${util.formatSize(torrent.uploadSpeed)}/s ↑ / ${util.formatSize(torrent.downloadSpeed)}/s ↓\n` +
      `*分享比率*: ${(+torrent.ratio).toFixed(2)}\n` +
      `*站点域名*: ${torrent.tracker}\n` +
      `*删除文件*: ${deleteFile}\n` +
      `*符合规则*: ${rule.alias}`;
    await this.pushSlack(title, desp);
  };

  async deleteTorrentError (client, torrent, rule) {
    const title = '删除种子失败';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子大小*: ${util.formatSize(torrent.size)}\n` +
      `*种子 hash*: ${torrent.hash}\n` +
      `*已完成量*: ${util.formatSize(torrent.completed)}\n` +
      `*种子状态*: ${torrent.completed.state}\n` +
      `*所属分类*: ${torrent.category}\n` +
      `*流量统计*: ${util.formatSize(torrent.uploaded)} ↑ / ${util.formatSize(torrent.downloaded)}\n` +
      `*即时速度*: ${util.formatSize(torrent.uploadSpeed)}/s ↑ / ${util.formatSize(torrent.downloadSpeed)}/s\n` +
      `*分享比率*: ${(+torrent.ratio).toFixed(2)}\n` +
      `*站点域名*: ${torrent.tracker}\n` +
      `*符合规则*: ${rule.alias}\n`;
    await this.pushSlack(title, desp);
  };

  async reannounceTorrent (client, torrent) {
    const title = '重新汇报种子';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子 hash*: ${torrent.hash}`;
    await this.pushSlack(title, desp);
  };

  async reannounceTorrentError (client, torrent) {
    const title = '重新汇报种子失败';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `下载器名: ${client.alias}\n` +
      `*种子名称*: ${torrent.name}\n` +
      `*种子 hash*: ${torrent.hash}`;
    await this.pushSlack(title, desp);
  };

  async connectClient (client) {
    const title = '下载器已连接';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}`;
    await this.pushSlack(title, desp);
  };

  async clientLoginError (client, message) {
    const title = '下载器登录失败';
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*附加信息*: ${message}`;
    await this.pushSlack(title, desp);
  };

  async scrapeTorrent (alias, torrentName, scrapedName) {
    const title = `种子识别成功 - ${scrapedName}`;
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n*监控分类*: ${alias}\n*种子名称*: ${torrentName}\n*识别名称*: ${scrapedName}`;
    await this.pushSlack(title, desp);
  };

  async scrapeTorrentFailed (alias, torrentName, note) {
    const title = '种子识别失败';
    let desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*监控分类*: ${alias}\n` +
      `*种子名称*: ${torrentName}`;
    if (note) {
      desp += `\n错误信息: ${note}`;
    }
    await this.pushSlack(title, desp);
  };

  async getMaindataError (client) {
    const title = `获取下载器信息失败 - ${client.alias}`;
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      '详细原因请前往 Vertex 日志页面查看';
    await this.pushSlack(title, desp);
  };

  async spaceAlarm (client) {
    const title = `剩余空间警告 - ${client.alias}`;
    const desp = `*当前时间*: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n` +
      `*下载器名*: ${client.alias}\n` +
      `*剩余空间*: ${util.formatSize(client.maindata.freeSpaceOnDisk)}`;
    await this.pushSlack(title, desp);
  };

  async selectWish (note) {
    const title = '选择想看';
    const desp = note;
    await this.pushSlack(title, desp);
  };

  async pushPlexStartOrStopToSlack (payload) {
    let text = '';
    let title = payload.Metadata.grandparentTitle || payload.Metadata.parentTitle || payload.Metadata.title;
    const stat = {
      stop: '停止播放',
      play: '开始播放',
      pause: '暂停播放',
      resume: '恢复播放',
      scrobble: '播放已超过 90%',
      new: '新入库'
    };
    title = `Plex ${stat[payload.event.split('.')[1]]}: ${title}`;
    if (payload.Metadata.grandparentTitle) {
      if (payload.Metadata.grandparentTitle) {
        text += `*${payload.Metadata.grandparentTitle}*\n`;
      }
      if (payload.Metadata.parentTitle) {
        text += `*当前季:* ${payload.Metadata.parentTitle}\n`;
      }
      if (payload.Metadata.title) {
        text += `*当前集:* ${payload.Metadata.title}\n`;
      }
      if (payload.Metadata.viewOffset) {
        text += `*当前位置:* ${util.formatTime(payload.Metadata.viewOffset)}\n`;
      }
    }
    if (payload.Metadata.summary) {
      text += `*简介:* ${payload.Metadata.summary}`;
    }
    const _poster = global.wechatCover || 'https://pic.lswl.in/images/2022/07/11/bf4eabf1afa841f4527db4d207d265c3.png';
    const option = {
      url: this.slackWebhook,
      method: 'POST',
      json: {
        attachments: [
          {
            color: util.randomColor(),
            fallback: title,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: title,
                  emoji: true
                }
              },
              {
                type: 'image',
                image_url: _poster,
                alt_text: 'inspiration'
              },
              {
                type: 'context',
                elements: [
                  {
                    text: text,
                    type: 'mrkdwn'
                  }
                ]
              },
              {
                type: 'context',
                elements: [
                  {
                    text: `发送自: ${payload.Server.title} / ${payload.Metadata.librarySectionTitle} / ${payload.Account.title}`,
                    type: 'mrkdwn'
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    const res = await util.requestPromise(option);
    const json = res.body;
    if (json !== 'ok') {
      logger.error('Slack 推送 Plex 开始播放失败', this.alias, res.body);
      return;
    }
    return '';
  }

  async pushEmbyStartOrStopToSlack (payload) {
    let text = '';
    const _title = payload.series_name || payload.season_name || payload.episode_number || payload.item_name;
    const stat = {
      stop: '停止播放',
      play: '开始播放',
      pause: '暂停播放',
      resume: '恢复播放',
      scrobble: '播放已超过 90%',
      new: '新入库'
    };
    const title = `Emby ${stat[payload.event.split('.')[1]]}: ${_title}`;
    text += `*${_title}*\n`;
    if (payload.season_name) {
      text += `*当前季:* ${payload.season_name}\n`;
    }
    if (payload.episode_number) {
      text += `*当前集:* ${payload.item_name || payload.episode_number}\n`;
    }
    if (payload.playback_position_percentage) {
      text += `*当前位置:* ${payload.playback_position_percentage}%\n`;
    }
    if (payload.item_overview) {
      text += `*简介:* ${payload.item_overview}`;
    } else {
      text += '*简介:* 暂无';
    }
    const _poster = global.wechatCover || 'https://pic.lswl.in/images/2022/07/11/bf4eabf1afa841f4527db4d207d265c3.png';
    const option = {
      url: this.slackWebhook,
      method: 'POST',
      json: {
        attachments: [
          {
            color: util.randomColor(),
            fallback: title,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: title,
                  emoji: true
                }
              },
              {
                type: 'image',
                image_url: _poster,
                alt_text: 'inspiration'
              },
              {
                type: 'context',
                elements: [
                  {
                    text: text,
                    type: 'mrkdwn'
                  }
                ]
              },
              {
                type: 'context',
                elements: [
                  {
                    text: `发送自: ${payload.Server.title} / ${payload.Metadata.librarySectionTitle} / ${payload.Account.title}`,
                    type: 'mrkdwn'
                  }
                ]
              }
            ]
          }
        ]
      }
    };
    const res = await util.requestPromise(option);
    const json = res.body;
    if (json !== 'ok') {
      logger.error('Slack 推送 Plex 开始播放失败', this.alias, res.body);
      return;
    }
    return '';
  }

  async pushSlackRaw (raw) {
    const option = {
      url: this.slackWebhook,
      method: 'POST',
      json: raw
    };
    const res = await util.requestPromise(option);
    const json = res.body;
    if (json !== 'ok') {
      logger.error('Slack 推送原始信息失败', this.alias, res.body);
      return;
    }
    return '';
  };

  async openSlackView (raw) {
    const option = {
      url: 'https://slack.com/api/views.open',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.slackToken
      },
      json: raw
    };
    const res = await util.requestPromise(option);
    const json = res.body;
    if (!json.ok) {
      logger.error('Slack 推送视图失败', this.alias, res.body);
      return;
    }
    return '';
  };
};

module.exports = Slack;
