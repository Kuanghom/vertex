import { get, post } from '../util/axios';

export default {
  list: async () => {
    const url = '/api/allocateRule/list';
    return await get(url);
  },
  modify: async (allocateRule) => {
    const url = '/api/allocateRule/' + (allocateRule.id ? 'modify' : 'add');
    return await post(url, allocateRule);
  },
  delete: async (id) => {
    const url = '/api/allocateRule/delete';
    return await post(url, { id });
  },
  debug: async (payload) => {
    const url = '/api/allocateRule/debug';
    return await post(url, payload);
  }
};
