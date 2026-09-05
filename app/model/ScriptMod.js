const fs = require('fs');
const path = require('path');
const logger = require('../libs/logger');
const Script = require('../common/Script');

const util = require('../libs/util');
class ScriptMod {
  _isCronScript (scriptSet) {
    return (scriptSet.scriptType || 'cron') === 'cron';
  }

  add (options) {
    const id = util.uuid.v4().split('-')[0];
    const scriptSet = { ...options };
    scriptSet.id = id;
    fs.writeFileSync(path.join(__dirname, '../data/script/', id + '.json'), JSON.stringify(scriptSet, null, 2));
    if (global.runningScript[id]) global.runningScript[id].destroy();
    if (scriptSet.enable && this._isCronScript(scriptSet)) global.runningScript[id] = new Script(scriptSet);
    logger.info('[script] 添加脚本:', scriptSet.alias || id, 'type=', scriptSet.scriptType || 'cron');
    return '添加 Script 成功';
  };

  delete (options) {
    fs.unlinkSync(path.join(__dirname, '../data/script/', options.id + '.json'));
    if (global.runningScript[options.id]) global.runningScript[options.id].destroy();
    logger.info('[script] 删除脚本:', options.id);
    return '删除 Script 成功';
  };

  modify (options) {
    const scriptSet = { ...options };
    fs.writeFileSync(path.join(__dirname, '../data/script/', options.id + '.json'), JSON.stringify(scriptSet, null, 2));
    if (global.runningScript[options.id]) global.runningScript[options.id].destroy();
    if (scriptSet.enable && this._isCronScript(scriptSet)) global.runningScript[options.id] = new Script(scriptSet);
    logger.info('[script] 修改脚本:', scriptSet.alias || options.id, 'type=', scriptSet.scriptType || 'cron', 'enable=', !!scriptSet.enable);
    return '修改 Script 成功';
  };

  list () {
    const scriptList = util.listCrontabJavaScript();
    for (const script of scriptList) {
      script.scriptType = script.scriptType || 'cron';
    }
    return scriptList;
  };

  run (options) {
    logger.info('[script] 手动执行定时脚本');
    (async () => {
      try {
        // eslint-disable-next-line no-eval
        const f = eval(options.script);
        await f();
        logger.info('[script] 手动执行定时脚本完成');
      } catch (e) {
        logger.error('[script] 手动执行定时脚本失败:', e.message);
        if (e.stack) {
          logger.error('[script] 错误堆栈:', e.stack);
        }
      }
    })();
  };

  async debugScrape (options) {
    const scrape = require('../libs/scrape');
    const { type, url, cookie, site, script } = options;
    logger.info('[script] 收到站点扩展调试请求:', type, url, 'site=', site || '-', 'Cookie 长度:', cookie ? String(cookie).length : 0);
    if (!url) {
      logger.warn('[script] 站点扩展调试失败: 测试链接不可为空');
      return {
        error: '测试链接不可为空',
        stage: 'validate',
        stageLabel: '参数校验',
        logs: [],
        result: null
      };
    }
    if (!['free', 'hr', 'promo'].includes(type)) {
      logger.warn('[script] 站点扩展调试失败: 调试类型无效', type);
      return {
        error: '调试类型无效',
        stage: 'validate',
        stageLabel: '参数校验',
        logs: [],
        result: null
      };
    }
    let _cookie = cookie;
    if (!_cookie && site) {
      const siteConfig = util.listSite().filter(item => item.name === site)[0];
      if (!siteConfig) {
        logger.warn('[script] 站点扩展调试失败: 未找到站点', site);
        return {
          error: `未找到站点 ${site}`,
          stage: 'validate',
          stageLabel: '参数校验',
          logs: [],
          result: null
        };
      }
      _cookie = siteConfig.cookie;
      logger.info('[script] 使用站点 Cookie:', site, '长度:', _cookie ? String(_cookie).length : 0);
    }
    if (!_cookie) {
      logger.warn('[script] 站点扩展调试失败: Cookie 为空');
      return {
        error: 'Cookie 不可为空, 请填写 Cookie 或选择站点',
        stage: 'validate',
        stageLabel: '参数校验',
        logs: [],
        result: null
      };
    }
    const scriptCode = script || options[`${type}Script`] || (type === 'promo' ? options.promoScript : undefined);
    const result = await scrape.debugScrapeScript(type, url, _cookie, scriptCode);
    if (result.error) {
      logger.warn('[script] 站点扩展调试失败:', type, url, result.stageLabel || result.stage, result.error);
    } else {
      logger.info('[script] 站点扩展调试成功:', type, url, 'result=', result.result);
    }
    return result;
  }
}

module.exports = ScriptMod;
