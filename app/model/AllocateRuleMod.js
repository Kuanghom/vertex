const fs = require('fs');
const path = require('path');

const util = require('../libs/util');
const allocate = require('../libs/allocate');

const DATA_DIR = path.join(__dirname, '../data/rule/allocate');

function ensureDir () {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function reloadRssUsing (ruleId) {
  const rssList = util.listRss();
  for (const rssSet of rssList) {
    if ((rssSet.allocateRule || 'builtin:original') !== ruleId) continue;
    if (!rssSet.enable || !global.runningRss[rssSet.id]) continue;
    const Rss = require('../common/Rss');
    global.runningRss[rssSet.id].destroy();
    global.runningRss[rssSet.id] = new Rss(rssSet);
  }
}

class AllocateRuleMod {
  add (options) {
    ensureDir();
    const id = util.uuid.v4().split('-')[0];
    const allocateRuleSet = { id };
    for (const key of Object.keys(options)) {
      if (options[key] !== undefined && options[key] !== '') {
        allocateRuleSet[key] = options[key];
      }
    }
    fs.writeFileSync(path.join(DATA_DIR, id + '.json'), JSON.stringify(allocateRuleSet, null, 2));
    return '添加规则成功';
  }

  delete (options) {
    if (String(options.id).startsWith('builtin:')) {
      throw new Error('内置分配方案不能删除');
    }
    fs.unlinkSync(path.join(DATA_DIR, options.id + '.json'));
    return '删除规则成功';
  }

  modify (options) {
    if (String(options.id).startsWith('builtin:')) {
      throw new Error('内置分配方案不能修改');
    }
    const allocateRuleSet = {};
    for (const key of Object.keys(options)) {
      if (options[key] !== undefined && options[key] !== '') {
        allocateRuleSet[key] = options[key];
      }
    }
    fs.writeFileSync(path.join(DATA_DIR, options.id + '.json'), JSON.stringify(allocateRuleSet, null, 2));
    reloadRssUsing(options.id);
    return '修改规则成功';
  }

  list () {
    const userRules = util.listAllocateRule();
    const rssList = util.listRss();
    for (const rule of userRules) {
      rule.builtin = false;
    }
    const all = allocate.listBuiltins().concat(userRules);
    for (const rule of all) {
      rule.usedBy = rssList
        .filter(item => (item.allocateRule || 'builtin:original') === rule.id)
        .map(item => ({ id: item.id, alias: item.alias, kind: 'task' }));
      rule.usedCount = rule.usedBy.length;
      rule.used = rule.usedCount > 0;
    }
    return all;
  }
}

module.exports = AllocateRuleMod;
