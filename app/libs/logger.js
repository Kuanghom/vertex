const log4js = require('log4js');
const config = require('./config');
let redis = null;

const loggerConfig = config.getLoggerConfig();
const setting = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../data/setting.json'), { encoding: 'utf-8' }));
loggerConfig.categories.default.level = setting.loggerLevel || loggerConfig.categories.default.level;
loggerConfig.appenders.error.layout.tokens = {
  redis: (logEvent) => {
    const f = async () => {
      if (!redis) redis = require('./redis');
      const errorList = JSON.parse((await redis.get('vertex:error:list') || '[]'));
      delete logEvent.data.cert;
      errorList.push(logEvent.data);
      while (errorList.length > 5) {
        errorList.shift();
      }
      try {
        redis.set('vertex:error:list', JSON.stringify(errorList));
      } catch (e) {};
    };
    f();
    return '';
  }
};
log4js.configure(loggerConfig);
const logger = log4js.getLogger('console');

function emptyCallStack () {
  return {
    functionName: '',
    fileName: '',
    lineNumber: 0,
    columnNumber: 0,
    callStack: ''
  };
}

function safeParseCallStack (error, skipIdx) {
  try {
    const stack = error && error.stack;
    if (!stack) return emptyCallStack();
    const start = Number.isInteger(skipIdx) ? skipIdx : 4;
    const lines = String(stack).split('\n');
    const slice = lines.slice(start);
    const tryLine = (line) => {
      const match = /at (?:(.+)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/.exec(line || '');
      if (!match || !match[2]) return null;
      return {
        functionName: match[1] || '',
        fileName: match[2],
        lineNumber: parseInt(match[3], 10) || 0,
        columnNumber: parseInt(match[4], 10) || 0,
        callStack: slice.join('\n')
      };
    };
    const first = tryLine(slice[0]);
    if (first) return first;
    for (let i = 0; i < slice.length; i++) {
      const parsed = tryLine(slice[i]);
      if (parsed && parsed.fileName.indexOf('node:') !== 0) return parsed;
    }
  } catch (e) {}
  return emptyCallStack();
}

function attachSafeCallStack (instance) {
  if (!instance) return;
  if (typeof instance.setParseCallStackFunction === 'function') {
    instance.setParseCallStackFunction(safeParseCallStack);
  } else {
    instance.parseCallStack = safeParseCallStack;
  }
}

attachSafeCallStack(logger);
attachSafeCallStack(Object.getPrototypeOf(logger));

logger.use = function (app) {
  app.use(log4js.connectLogger(logger, {
    format: (req, res, format) => format(`[${req.userIp}] [:method] [:url] [${req.headers['user-agent']}]`),
    level: 'trace'
  }));
};
module.exports = logger;
