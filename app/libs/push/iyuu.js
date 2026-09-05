const logger = require('../logger');
const util = require('../util');
const TextChannel = require('./textChannel');

class Iyuu extends TextChannel {
  constructor (cfg) {
    super(cfg);
    this.iyuuToken = (cfg.iyuuToken || '').trim();
  }

  _url () {
    const token = this.iyuuToken;
    if (/^https?:\/\//i.test(token)) return token;
    return `https://iyuu.cn/${token}.send`;
  }

  async pushText (title, desp) {
    const option = {
      url: this._url(),
      method: 'POST',
      json: {
        text: title,
        desp
      }
    };
    const res = await util.requestPromise(option);
    const json = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
    if (!json || json.errcode !== 0) {
      logger.error('IYUU 推送失败', this.alias, title, res.body);
    }
  }
}

module.exports = Iyuu;
