import user from './user';
import server from './server';
import site from './site';
import setting from './setting';
import notification from './notification';
import siteTag from './siteTag';
import downloader from './downloader';
import deleteRule from './deleteRule';
import allocateRule from './allocateRule';
import rssRule from './rssRule';
import selectRule from './selectRule';
import rss from './rss';
import script from './script';
import u2Rss from './u2Rss';
import torrent from './torrent';
import log from './log';
import preset from './preset';

const api = {
  user,
  setting,
  downloader,
  server,
  site,
  notification,
  siteTag,
  deleteRule,
  allocateRule,
  rssRule,
  selectRule,
  rss,
  script,
  torrent,
  log,
  u2Rss,
  preset
};

export default () => { return api; };
