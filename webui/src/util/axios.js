import axios from 'axios';

const parseResponseError = (res) => {
  const data = res.data;
  if (typeof data !== 'object' || data === null) {
    const hint = typeof data === 'string' && data.trim().startsWith('<')
      ? '接口返回了 HTML 而非 JSON, 通常是后端未更新或未重启, 导致 /api 路由不存在'
      : '接口返回了非 JSON 数据';
    throw new Error(`${hint} (HTTP ${res.status})`);
  }
  if (!data.success) {
    const err = new Error(data.message || data.error || `请求失败 (HTTP ${res.status})`);
    err.data = data.data;
    throw err;
  }
  return data;
};

const get = async (url) => {
  try {
    const res = await axios.get(url, {
      validateStatus: () => true
    });
    return parseResponseError(res);
  } catch (error) {
    if (error.data !== undefined) {
      throw error;
    }
    throw new Error(error.message || String(error));
  }
};

const post = async (url, json) => {
  try {
    const res = await axios.post(url, json, {
      validateStatus: () => true
    });
    return parseResponseError(res);
  } catch (error) {
    if (error.data !== undefined) {
      throw error;
    }
    throw new Error(error.message || String(error));
  }
};

export {
  get,
  post
};
