module.exports = function setStaticHeaders (res, filePath) {
  const rel = String(filePath || '').replace(/\\/g, '/');
  if (rel.endsWith('/service-worker.js') || rel.endsWith('/index.html')) {
    res.setHeader('Cache-Control', 'no-cache');
    return;
  }
  if (/\/assets\/(js|css)\/[^/]+\.[a-f0-9]{8}\.(js|css)$/.test(rel)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }
  res.setHeader('Cache-Control', 'public, max-age=604800');
};
