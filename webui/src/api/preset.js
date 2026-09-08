import { get, post } from '../util/axios';

export default {
  catalog: async () => {
    return await get('/api/preset/catalog');
  },
  apply: async (body) => {
    return await post('/api/preset/apply', body);
  },
  previewImport: async (form) => {
    return await post('/api/preset/previewImport', form);
  },
  importSelected: async (form) => {
    return await post('/api/preset/importSelected', form);
  }
};
