import { get, post } from '../util/axios';

export default {
  list: async () => {
    const url = '/api/siteTag/list';
    return await get(url);
  },
  modifySetting: async (body) => {
    const url = '/api/siteTag/modifySetting';
    return await post(url, body);
  },
  add: async (body) => {
    const url = '/api/siteTag/add';
    return await post(url, body);
  },
  modify: async (body) => {
    const url = '/api/siteTag/modify';
    return await post(url, body);
  },
  delete: async (body) => {
    const url = '/api/siteTag/delete';
    return await post(url, body);
  },
  resetDefault: async () => {
    const url = '/api/siteTag/resetDefault';
    return await post(url, {});
  }
};
