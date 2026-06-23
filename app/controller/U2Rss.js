const logger = require('../libs/logger');
const U2RssMod = require('../model/U2RssMod');

const u2RssMod = new U2RssMod();

class U2Rss {
  get (req, res) {
    try {
      res.send({
        success: true,
        data: {
          ...u2RssMod.get(),
          rssUrl: u2RssMod.buildUrl(req)
        }
      });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  save (req, res) {
    try {
      const data = u2RssMod.save(req.body || {});
      res.send({
        success: true,
        data: {
          ...data,
          rssUrl: u2RssMod.buildUrl(req)
        },
        message: '保存成功'
      });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  regenerateToken (req, res) {
    try {
      const data = u2RssMod.regenerateToken();
      res.send({
        success: true,
        data: {
          ...data,
          rssUrl: u2RssMod.buildUrl(req)
        },
        message: 'RSS Token 已重置'
      });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  reveal (req, res) {
    try {
      res.send({
        success: true,
        data: u2RssMod.revealSecrets()
      });
    } catch (e) {
      logger.error(e);
      res.send({ success: false, message: e.message });
    }
  }

  async preview (req, res) {
    try {
      const data = await u2RssMod.preview(req.body || {});
      res.send({ success: true, data });
    } catch (e) {
      logger.error('[u2-rss] 预览失败:', e.message);
      res.send({ success: false, message: e.message });
    }
  }

  async feed (req, res) {
    try {
      const xml = await u2RssMod.feed(req);
      res.set('Content-Type', 'text/xml; charset=UTF-8');
      res.send(xml);
    } catch (e) {
      logger.error('[u2-rss] RSS 输出失败:', e.message);
      res.status(401);
      res.send('Unauthorized');
    }
  }
}

module.exports = U2Rss;
