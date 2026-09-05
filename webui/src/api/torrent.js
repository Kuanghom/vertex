import { get, post } from '../util/axios';

export default {
  info: async (hash) => {
    const url = '/api/torrent/info?hash=' + hash;
    return await get(url);
  },
  list: async (qs) => {
    const qsString = Object.keys(qs).filter(item => qs[item]).map(item => `${item}=${encodeURIComponent(qs[item])}`).join('&');
    const url = `/api/torrent/list?${qsString}`;
    return await get(url);
  },
  listHistory: async (qs) => {
    const qsString = Object.keys(qs).filter(item => qs[item] !== '' && qs[item] !== undefined && qs[item] !== null).map(item => `${item}=${encodeURIComponent(qs[item])}`).join('&');
    const url = `/api/torrent/listHistory?${qsString}`;
    return await get(url);
  },
  listHistoryFilterOptions: async (type) => {
    const url = `/api/torrent/listHistoryFilterOptions?type=${encodeURIComponent(type || 'rss')}`;
    return await get(url);
  },
  deleteTorrent: async (body) => {
    const url = '/api/torrent/deleteTorrent';
    return await post(url, body);
  }
};
