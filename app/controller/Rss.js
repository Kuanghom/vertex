const logger = require('../libs/logger');
const RssMod = require('../model/RssMod');

const rssMod = new RssMod();

class Rss {
  async add (req, res) {
    const options = req.body;
    try {
      const r = rssMod.add(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async delete (req, res) {
    const options = req.body;
    try {
      const r = rssMod.delete(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async deleteRecord (req, res) {
    const options = req.body;
    try {
      const r = await rssMod.deleteRecord(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async modify (req, res) {
    const options = req.body;
    try {
      const r = rssMod.modify(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async list (req, res) {
    try {
      const r = rssMod.list();
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async dryrun (req, res) {
    const options = req.body;
    logger.info('[rss] API 试运行请求:', options.alias || options.id || '新任务');
    try {
      const r = await rssMod.dryrun(options);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error('[rss] API 试运行失败:', options.alias || options.id || '新任务', e.message);
      if (e.stack) {
        logger.error('[rss] 错误堆栈:', e.stack);
      }
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async scrapeDryrun (req, res) {
    const options = req.body;
    logger.info('[rss] API 检测免费/HR 试运行请求:', options.alias || options.id || '新任务');
    try {
      const r = await rssMod.scrapeDryrun(options);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error('[rss] API 检测免费/HR 试运行失败:', options.alias || options.id || '新任务', e.message);
      if (e.stack) {
        logger.error('[rss] 错误堆栈:', e.stack);
      }
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async scrapeTorrent (req, res) {
    const options = req.body;
    logger.info('[rss] API 单条检测请求:', options.link);
    try {
      const r = await rssMod.scrapeTorrent(options);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error('[rss] API 单条检测失败:', options.link, e.message);
      if (e.stack) {
        logger.error('[rss] 错误堆栈:', e.stack);
      }
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async promoSupport (req, res) {
    try {
      const hosts = (req.query.host || '').split(',').map(i => i.trim()).filter(Boolean);
      const r = rssMod.promoSupport(hosts);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async mikanSearch (req, res) {
    const options = req.body;
    try {
      const r = await rssMod.mikanSearch(options);
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };

  async mikanPush (req, res) {
    const options = req.body;
    try {
      const r = await rssMod.mikanPush(options);
      res.send({
        success: true,
        message: r
      });
    } catch (e) {
      logger.error(e);
      res.send({
        success: false,
        message: e.message
      });
    }
  };
}
module.exports = Rss;
