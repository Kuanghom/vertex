const crypto = require('crypto');
const u2Rss = require('../libs/u2Rss');
const logger = require('../libs/logger');

class U2RssMod {
  mergeSetting (options = {}) {
    const current = u2Rss.loadSetting();
    const next = {
      ...current,
      ...options,
      ignoreUserNames: Array.isArray(options.ignoreUserNames)
        ? options.ignoreUserNames
        : String(options.ignoreUserNames || '')
          .split(/[,，\n]/)
          .map(item => item.trim())
          .filter(Boolean)
    };
    if (u2Rss.isSecretUnchanged(options.apiToken, current.apiToken)) next.apiToken = current.apiToken;
    if (u2Rss.isSecretUnchanged(options.cookie, current.cookie)) next.cookie = current.cookie;
    if (u2Rss.isSecretUnchanged(options.passkey, current.passkey)) next.passkey = current.passkey;
    return next;
  }

  get () {
    const setting = u2Rss.loadSetting();
    return u2Rss.getPublicSetting(setting);
  }

  save (options = {}) {
    const next = this.mergeSetting(options);
    if (!next.rssToken) {
      next.rssToken = crypto.randomBytes(16).toString('hex');
    }
    u2Rss.saveSetting(next);
    logger.info('[u2-rss] 配置已保存, preferApi=', next.preferApi, 'uid=', next.uid || '-');
    return u2Rss.getPublicSetting(next);
  }

  regenerateToken () {
    const current = u2Rss.loadSetting();
    current.rssToken = crypto.randomBytes(16).toString('hex');
    u2Rss.saveSetting(current);
    return u2Rss.getPublicSetting(current);
  }

  async preview (options = {}) {
    const setting = this.mergeSetting(options);
    const result = await u2Rss.generateFeed(setting, { skipCache: true });
    return {
      source: result.source,
      count: result.count,
      items: (result.items || []).map(item => ({
        torrentId: item.torrentId,
        torrentName: item.torrentName,
        userName: item.userName,
        promotionType: item.promotionType,
        ratio: item.ratio,
        upRate: item.upRate,
        downRate: item.downRate,
        createdTime: item.createdTime || '',
        size: item.size,
        seeders: item.seeders,
        link: item.link
      }))
    };
  }

  async feed (req) {
    const setting = u2Rss.loadSetting();
    const token = req.params.apiKey;
    if (!token || (token !== setting.rssToken && token !== global.apiKey)) {
      throw new Error('RSS 鉴权失败');
    }
    const result = await u2Rss.generateFeed(setting);
    return result.xml;
  }

  buildUrl (req) {
    const setting = u2Rss.loadSetting();
    return u2Rss.buildRssUrl(setting, req);
  }

  revealSecrets () {
    const setting = u2Rss.loadSetting();
    return {
      apiToken: setting.apiToken || '',
      cookie: setting.cookie || '',
      passkey: setting.passkey || ''
    };
  }
}

module.exports = U2RssMod;
