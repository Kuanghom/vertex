const logger = require('../logger');
const util = require('../util');
const TextChannel = require('./textChannel');

class Moviepilot extends TextChannel {
  constructor (cfg) {
    super(cfg);
    this.moviepilotUrl = (cfg.moviepilotUrl || '').trim().replace(/\/+$/, '');
    this.moviepilotToken = (cfg.moviepilotToken || '').trim();
  }

  _urls () {
    const base = this.moviepilotUrl;
    const token = encodeURIComponent(this.moviepilotToken);
    if (/\/api\//i.test(base)) {
      const sep = base.indexOf('?') === -1 ? '?' : '&';
      return [`${base}${sep}apikey=${token}`];
    }
    return [
      `${base}/api/v1/plugin/MsgNotify/send_msg?apikey=${token}`,
      `${base}/api/v1/plugin/MessageForward?apikey=${token}`
    ];
  }

  async pushText (title, desp) {
    const payload = {
      title,
      text: desp,
      type: 'plugin'
    };
    let last;
    for (const url of this._urls()) {
      const res = await util.requestPromise({
        url,
        method: 'POST',
        headers: {
          Authorization: this.moviepilotToken
        },
        json: payload
      });
      last = res;
      if (res.statusCode < 400) return;
    }
    logger.error('MoviePilot 推送失败', this.alias, title, last && last.statusCode, last && last.body);
  }
}

module.exports = Moviepilot;
