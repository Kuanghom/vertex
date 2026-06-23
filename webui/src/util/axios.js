import axios from 'axios';

const parseResponseError = (res) => {
  const data = res.data;
  if (typeof data !== 'object' || data === null) {
    const preview = typeof data === 'string' ? data.replace(/\s+/g, ' ').trim().slice(0, 120) : String(data);
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      if (res.status === 200) {
        throw new Error('接口返回了 HTML 页面 (HTTP 200), API 请求可能被浏览器 Service Worker 拦截。请打开 F12 → Application → Service Workers → Unregister, 然后 Ctrl+F5 强制刷新。若仍失败, 请确认后端已用 Dockerfile-local 构建并重启容器。');
      }
      throw new Error(`接口返回了 HTML 而非 JSON (HTTP ${res.status}): ${preview}`);
    }
    throw new Error(`接口返回了非 JSON 数据 (HTTP ${res.status}): ${preview}`);
  }
  if (!data.success) {
    const err = new Error(data.message || data.error || `请求失败 (HTTP ${res.status})`);
    err.data = data.data;
    throw err;
  }
  return data;
};

const requestConfig = {
  validateStatus: () => true,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  }
};

const get = async (url) => {
  try {
    const res = await axios.get(url, requestConfig);
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
    const res = await axios.post(url, json, requestConfig);
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
