const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../libs/logger');

class LogMod {
  get (options) {
    if (['error', 'info', 'debug', 'watch', 'watchdebug', 'binge', 'bingedebug', 'advanceddebug', 'advanced', 'scdebug', 'sc'].includes(options.type)) {
      try {
        const logFile = path.join(__dirname, `../../logs/app-${options.type}.log`);
        if (!fs.existsSync(logFile)) {
          return '日志文件尚不存在';
        }
        const log = spawnSync('tail', ['-n', '2000', logFile]);
        return log.stdout.toString();
      } catch (e) {
        logger.error(e);
        return '读取日志时发生错误';
      }
    }
    return '不支持的日志类型';
  };

  clear () {
    const files = fs.readdirSync(path.join(__dirname, '../../logs'));
    for (const file of files) {
      if (path.extname(file) === '.gz') {
        logger.info('删除日志文件', file);
        fs.unlinkSync(path.join(__dirname, '../../logs', file));
      }
    }
    return '删除日志文件成功, 详细情况查看日志';
  };
}

module.exports = LogMod;
