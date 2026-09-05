const util = require('../libs/util');
const logger = require('../libs/logger');

class TorrentMod {
  async list (options) {
    const clientsList = JSON.parse(options.clientList);
    let torrentList = [];
    const clients = global.runningClient;
    for (const clientId of Object.keys(clients)) {
      if (!clientsList.some(item => item === clientId)) continue;
      if (!clients[clientId].maindata) {
        throw new Error('客户端 ' + clients[clientId].alias + ' 未连接或未更新种子列表, 请稍后重试');
      }
      for (const torrent of clients[clientId].maindata.torrents) {
        const _torrent = { ...torrent };
        _torrent.clientAlias = clients[clientId].alias;
        _torrent.client = clientId;
        if (options.searchKey && !options.searchKey.split(' ').every(item => _torrent.name.toLowerCase().indexOf(item.toLowerCase()) !== -1)) continue;
        torrentList.push(_torrent);
      }
    }
    if (options.sortKey) {
      const sortType = options.sortType || 'desc';
      const sortKey = options.sortKey;
      const numberSet = {
        desc: [-1, 1],
        asc: [1, -1]
      };
      torrentList = torrentList.sort((a, b) => {
        if (typeof a[sortKey] === 'string') {
          return (a[sortKey] < b[sortKey] ? numberSet[sortType][1] : numberSet[sortType][0]);
        }
        return sortType === 'asc' ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
      });
    }
    const total = torrentList.length;
    torrentList = torrentList.slice((options.page - 1) * options.length, options.page * options.length);
    const res = await util.getRecords(`select link, hash from torrents where hash in ('${torrentList.map(item => item.hash).join('\',\'')}')`);
    const hashMap = {};
    for (const r of res) {
      hashMap[r.hash] = r.link;
    }
    for (const torrent of torrentList) {
      torrent.link = hashMap[torrent.hash] || false;
    }
    return {
      torrents: torrentList,
      total
    };
  };

  async info (options) {
    const torrentHash = options.hash;
    const clients = global.runningClient;
    for (const clientId of Object.keys(clients)) {
      if (!clients[clientId].maindata) continue;
      for (const torrent of clients[clientId].maindata.torrents) {
        if (torrent.hash !== torrentHash) continue;
        const _torrent = { ...torrent };
        _torrent.clientAlias = clients[clientId].alias;
        _torrent.client = clientId;
        return _torrent;
      }
    }
    throw new Error('not found');
  }

  _parseCsvParam (value) {
    if (!value) return [];
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }

  _escapeSqlStr (val) {
    return String(val).replace(/'/g, "''");
  }

  _appendRssFilter (where, rssParam) {
    const rssIds = this._parseCsvParam(rssParam);
    if (!rssIds.length) return where;
    const currentRssIds = util.listRss().map(item => item.id);
    const normalIds = rssIds.filter(id => id !== 'deleted');
    const includeDeleted = rssIds.includes('deleted');
    const parts = [];
    if (normalIds.length) {
      parts.push(`rss_id in ('${normalIds.map(id => this._escapeSqlStr(id)).join('\',\'')}')`);
    }
    if (includeDeleted) {
      if (currentRssIds.length) {
        parts.push(`rss_id not in ('${currentRssIds.map(id => this._escapeSqlStr(id)).join('\',\'')}')`);
      } else {
        parts.push('1 = 1');
      }
    }
    if (parts.length === 1) {
      where += ` and ${parts[0]}`;
    } else if (parts.length > 1) {
      where += ` and (${parts.join(' or ')})`;
    }
    return where;
  }

  _appendStatusFilter (where, statusParam) {
    const statuses = this._parseCsvParam(statusParam);
    if (!statuses.length) return where;
    where += ` and record_note in ('${statuses.map(s => this._escapeSqlStr(s)).join('\',\'')}')`;
    return where;
  }

  _appendClientFilter (where, clientParam) {
    const clients = this._parseCsvParam(clientParam);
    if (!clients.length) return where;
    const hasNone = clients.includes('none');
    const normalClients = clients.filter(id => id !== 'none');
    const parts = [];
    if (normalClients.length) {
      parts.push(`client_id in ('${normalClients.map(id => this._escapeSqlStr(id)).join('\',\'')}')`);
    }
    if (hasNone) {
      parts.push('(client_id is null or client_id = \'\')');
    }
    if (parts.length === 1) {
      where += ` and ${parts[0]}`;
    } else if (parts.length > 1) {
      where += ` and (${parts.join(' or ')})`;
    }
    return where;
  }

  async listHistoryFilterOptions (options) {
    let where = 'where 1 = 1';
    if (options.type === 'rss') {
      where += ' and record_type IN (1,2,3)';
    }
    const statuses = await util.getRecords(
      'select distinct record_note as recordNote from torrents ' + where + ' order by record_note asc'
    );
    return {
      statuses: statuses.map(item => item.recordNote)
    };
  }

  async listHistory (options) {
    const index = options.length * (options.page - 1);
    let where = 'where 1 = 1';
    if (options.type === 'rss') {
      where += ' and record_type IN (1,2,3)';
    }
    where = this._appendRssFilter(where, options.rss);
    where = this._appendStatusFilter(where, options.status);
    where = this._appendClientFilter(where, options.client);
    if (options.key) {
      where += ` and (name like '%${options.key}%' or record_note like '%${options.key}%')`;
    }
    const params = [options.length, index];
    const torrents = await util.getRecords('select id, rss_id as rssId, name, size, link, record_type as recordType, record_note as recordNote, upload, download, tracker, record_time as recordTime, add_time as addTime, delete_time as deleteTime, hash, pub_time as pubTime, client_id as clientId, record_detail as recordDetail from torrents ' + where + ' order by id desc limit ? offset ?',
      params);
    const clientMap = util.listClient().reduce((map, item) => {
      map[item.id] = item.alias;
      return map;
    }, {});
    const total = (await util.getRecord('select count(*) as total from torrents ' + where)).total;
    return {
      torrents: torrents.map(item => {
        let recordDetail = null;
        if (item.recordDetail) {
          try {
            recordDetail = JSON.parse(item.recordDetail);
          } catch (e) {
            recordDetail = null;
          }
        }
        return {
          ...item,
          recordDetail,
          clientAlias: item.clientId ? (clientMap[item.clientId] || '已删除') : ''
        };
      }),
      total
    };
  }

  async deleteTorrent (options) {
    if (!global.runningClient[options.clientId]) {
      throw new Error('客户端 ' + options.clientId + ' 未连接或未更新种子列表, 请稍后重试');
    }
    if (!global.runningClient[options.clientId].maindata) {
      throw new Error('客户端 ' + global.runningClient[options.clientId].alias + ' 未连接或未更新种子列表, 请稍后重试');
    }
    const client = global.runningClient[options.clientId];
    try {
      await client.client.deleteTorrent(client.clientUrl, client.cookie, options.hash, true);
    } catch (e) {
      logger.error('删除种子失败: ', e);
      throw e;
    }
    return '已从下载器删除种子';
  }
}

module.exports = TorrentMod;
