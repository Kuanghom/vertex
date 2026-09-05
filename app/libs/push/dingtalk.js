const crypto = require('crypto');
const logger = require('../logger');
const util = require('../util');
const TextChannel = require('./textChannel');

class Dingtalk extends TextChannel {
  constructor (cfg) {
    super(cfg);
    this.dingtalkWebhook = cfg.dingtalkWebhook;
    this.dingtalkSecret = cfg.dingtalkSecret;
  }

  _signedUrl () {
    const webhook = this.dingtalkWebhook;
    const secret = this.dingtalkSecret;
    if (!secret) return webhook;
    const timestamp = Date.now();
    const sign = crypto.createHmac('sha256', secret)
      .update(`${timestamp}\n${secret}`)
      .digest('base64');
    const sep = webhook.indexOf('?') === -1 ? '?' : '&';
    return `${webhook}${sep}timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  async pushText (title, desp) {
    const option = {
      url: this._signedUrl(),
      method: 'POST',
      json: {
        msgtype: 'markdown',
        markdown: {
          title,
          text: `### ${title}\n\n${desp}`
        }
      }
    };
    const res = await util.requestPromise(option);
    const json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    if (!json || json.errcode !== 0) {
      logger.error('钉钉推送失败', this.alias, title, res.body);
    }
  }
}

module.exports = Dingtalk;
