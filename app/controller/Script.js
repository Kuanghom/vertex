const logger = require('../libs/logger');
const ScriptMod = require('../model/ScriptMod');

const scriptMod = new ScriptMod();

class Script {
  async add (req, res) {
    const options = req.body;
    try {
      const r = scriptMod.add(options);
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
      const r = scriptMod.delete(options);
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
      const r = scriptMod.modify(options);
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
      const r = scriptMod.list();
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

  async run (req, res) {
    const options = req.body;
    try {
      const r = scriptMod.run(options);
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

  async debugScrape (req, res) {
    const options = req.body;
    logger.info('[script] API 站点扩展调试请求:', options.type, options.url, 'site=', options.site || '-');
    try {
      const r = await scriptMod.debugScrape(options);
      if (r.error) {
        logger.warn('[script] API 站点扩展调试返回错误:', options.type, options.url, r.stageLabel || r.stage, r.error);
      } else {
        logger.info('[script] API 站点扩展调试成功:', options.type, options.url, 'result=', r.result);
      }
      res.send({
        success: true,
        data: r
      });
    } catch (e) {
      logger.error('[script] API 站点扩展调试异常:', options.type, options.url, e.message);
      if (e.stack) {
        logger.error('[script] 错误堆栈:', e.stack);
      }
      res.send({
        success: true,
        data: {
          error: e.message || String(e),
          stack: e.stack,
          logs: [],
          result: null,
          stage: 'unknown',
          stageLabel: '未知错误'
        }
      });
    }
  };
}
module.exports = Script;
