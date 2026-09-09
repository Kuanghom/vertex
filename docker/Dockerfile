FROM lswl/vertex-base:latest
LABEL maintainer="KuanghomCheng"
LABEL build_from="https://github.com/Kuanghom/vertex"

ENV TZ=Asia/Shanghai

# 依赖层：仅 package.json / package-lock.json 变化时才重装 npm（约 1~2 分钟）
COPY package.json package-lock.json /app/vertex/
RUN \
  apk add --no-cache gcc g++ python3 git cmake make npm libc-dev && \
  cd /app/vertex && \
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
  npm i --save && \
  apk del gcc g++ python3 git cmake make npm libc-dev

# 应用代码（整目录 COPY，保证 common/controller/model 等子目录结构正确）
COPY app /app/vertex/app
COPY docker/start.sh /app/vertex/docker/start.sh
RUN \
  sed -i 's/\r$//' /app/vertex/docker/start.sh && \
  chmod +x /app/vertex/docker/start.sh && \
  mkdir /vertex && \
  ln -s /vertex/data /app/vertex/app/data && \
  ln -s /vertex/db /app/vertex/app/db && \
  ln -s /vertex/logs /app/vertex/logs && \
  ln -s /vertex/torrents /app/vertex/torrents && \
  mv /app/vertex/app/config /app/vertex/app/config_backup && \
  ln -s /vertex/config /app/vertex/app/config && \
  ln -s /app/localtime /etc/localtime && \
  ln -s /usr/bin/chromium-browser /usr/bin/chromium && \
  chmod +x /usr/bin/chromium && \
  echo 'bind 127.0.0.1' >> /app/redis.conf && \
  echo 'daemonize yes' >> /app/redis.conf

RUN \
  useradd -d /app/vertex -s /bin/sh vt && \
  chown -R vt /vertex && \
  chmod +x /vertex
EXPOSE 3000
CMD ["bash", "/app/vertex/docker/start.sh"]
