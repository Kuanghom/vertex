const fs = require('fs');
const path = require('path');
const util = require('../libs/util');
const siteTag = require('../libs/siteTag');

const DATA_PATH = path.join(__dirname, '../data/site-tag.json');

class SiteTagMod {
  list () {
    return siteTag.getConfig();
  }

  modifySetting (options) {
    const config = siteTag.getConfig();
    config.enabled = !!options.enabled;
    siteTag.saveConfig(config);
    return '保存站点标签设置成功';
  }

  add (options) {
    const config = siteTag.getConfig();
    const item = siteTag.normalizeItem({
      ...options,
      id: util.uuid.v4().split('-')[0],
      siteHosts: siteTag.parseHostList(options.siteHosts),
      trackerHosts: siteTag.parseHostList(options.trackerHosts),
      vertexNames: siteTag.parseNameList(options.vertexNames)
    });
    if (!item.name || !item.tag) {
      throw new Error('站点名称和标签名不可为空');
    }
    config.items.push(item);
    siteTag.saveConfig(config);
    return '添加站点标签成功';
  }

  modify (options) {
    if (!options.id) throw new Error('缺少 id');
    const config = siteTag.getConfig();
    const index = config.items.findIndex(item => item.id === options.id);
    if (index === -1) throw new Error('站点标签不存在');
    const item = siteTag.normalizeItem({
      ...config.items[index],
      ...options,
      siteHosts: siteTag.parseHostList(options.siteHosts),
      trackerHosts: siteTag.parseHostList(options.trackerHosts),
      vertexNames: siteTag.parseNameList(options.vertexNames)
    });
    if (!item.name || !item.tag) {
      throw new Error('站点名称和标签名不可为空');
    }
    config.items[index] = item;
    siteTag.saveConfig(config);
    return '编辑站点标签成功';
  }

  delete (options) {
    if (!options.id) throw new Error('缺少 id');
    const config = siteTag.getConfig();
    config.items = config.items.filter(item => item.id !== options.id);
    siteTag.saveConfig(config);
    return '删除站点标签成功';
  }

  resetDefault () {
    const config = siteTag.loadDefaultConfig();
    siteTag.saveConfig(config);
    return '已恢复默认站点标签数据';
  }
}

module.exports = SiteTagMod;
