const logger = require('../logger');
const util = require('../util');
const TextChannel = require('./textChannel');

class Wecom extends TextChannel {
  constructor (cfg) {
    super(cfg);
    this.wecomWebhook = (cfg.wecomWebhook || '').trim();
  }

  _url () {
    const value = this.wecomWebhook;
    if (/^https?:\/\//i.test(value)) return value;
    return `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${value}`;
  }

  async pushText (title, desp) {
    const option = {
      url: this._url(),
      method: 'POST',
      json: {
        msgtype: 'markdown',
        markdown: {
          content: `### ${title}\n${desp}`
        }
      }
    };
    const res = await util.requestPromise(option);
    const json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    if (!json || json.errcode !== 0) {
      logger.error('企业微信群机器人推送失败', this.alias, title, res.body);
    }
  }
}

module.exports = Wecom;
