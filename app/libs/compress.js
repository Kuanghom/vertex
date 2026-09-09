const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TYPE = /javascript|json|css|html|text\/|svg\+xml|xml/i;
const ZIP_EXT = /\.(js|mjs|css|html|json|svg|xml|txt|map|less)$/i;
const MIME = {
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.html': 'text/html; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.map': 'application/json; charset=UTF-8',
  '.less': 'text/css; charset=UTF-8'
};

function wantsGzip (req) {
  return /\bgzip\b/.test(req.headers['accept-encoding'] || '');
}

function setVary (res) {
  const vary = String(res.getHeader('Vary') || '');
  if (!/\bAccept-Encoding\b/i.test(vary)) {
    res.setHeader('Vary', vary ? vary + ', Accept-Encoding' : 'Accept-Encoding');
  }
}

function gzipBuffer (req, res, body, origSend) {
  if (body == null || res.getHeader('Content-Encoding')) {
    return origSend(body);
  }
  let buf;
  if (Buffer.isBuffer(body)) buf = body;
  else if (typeof body === 'string') buf = Buffer.from(body);
  else return origSend(body);

  if (typeof body === 'string' && !res.getHeader('Content-Type')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  const type = String(res.getHeader('Content-Type') || '');
  if (!TYPE.test(type) || buf.length < 256) return origSend(body);

  zlib.gzip(buf, { level: 6 }, (err, zipped) => {
    if (err || res.headersSent) return origSend(body);
    if (!res.getHeader('Content-Type') && typeof body === 'string') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
    res.setHeader('Content-Encoding', 'gzip');
    setVary(res);
    origSend(zipped);
  });
  return res;
}

function compress (req, res, next) {
  if (!wantsGzip(req)) return next();
  const origSend = res.send.bind(res);
  res.send = function (body) {
    return gzipBuffer(req, res, body, origSend);
  };
  next();
}

function staticGzip (root, setHeaders) {
  const rootAbs = path.resolve(root);
  return function (req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.headers.range) return next();
    if (!wantsGzip(req)) return next();
    let rel;
    try {
      rel = decodeURIComponent((req.path || '').split('?')[0]);
    } catch (e) {
      return next();
    }
    if (!ZIP_EXT.test(rel)) return next();
    const file = path.normalize(path.join(rootAbs, rel));
    if (file !== rootAbs && !file.startsWith(rootAbs + path.sep)) return next();
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return next();
      const ext = path.extname(file).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      if (setHeaders) setHeaders(res, file);
      res.setHeader('Last-Modified', st.mtime.toUTCString());
      res.setHeader('Content-Encoding', 'gzip');
      setVary(res);
      res.removeHeader('Content-Length');
      if (req.method === 'HEAD') return res.end();
      const gzip = zlib.createGzip({ level: 6 });
      const rs = fs.createReadStream(file);
      const fail = function () {
        if (!res.headersSent) res.statusCode = 500;
        res.end();
      };
      rs.on('error', fail);
      gzip.on('error', fail);
      rs.pipe(gzip).pipe(res);
    });
  };
}

compress.staticGzip = staticGzip;
module.exports = compress;
