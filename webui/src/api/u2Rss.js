import { get, post } from '../util/axios';

export default {
  get: async () => {
    return await get('/api/u2Rss/get');
  },
  reveal: async () => {
    return await get('/api/u2Rss/reveal');
  },
  save: async (body) => {
    return await post('/api/u2Rss/save', body);
  },
  preview: async (body) => {
    return await post('/api/u2Rss/preview', body);
  },
  regenerateToken: async () => {
    return await get('/api/u2Rss/regenerateToken');
  }
};
