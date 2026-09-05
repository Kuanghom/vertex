# VERTEX Lite

从 Vertex 复制并精简的刷流版：只保留基础组件和 RSS 刷流相关能力，去掉豆瓣追剧、影视订阅、监控分类、媒体硬链接、Plex/Emby/Jellyfin Webhook 等观影功能，降低运行占用。

保留：

- 站点 / 下载器 / 服务器 / 通知 / 站点标签
- RSS 任务、RSS 规则、选种规则、删种规则、分配规则
- 定时脚本、站点扩展抓取、U2 RSS、IRC
- 种子搜索 / 种子聚合、RSS 历史
- 基础设置、主题、安全、菜单、CookieCloud、备份

已移除：

- 豆瓣影视订阅、订阅列表 / 搜索 / 手动添加
- 监控分类及其历史
- 链接规则、链接文件、批量链接、路径生成器
- 蜜柑番剧历史工具
- Plex / Emby / Jellyfin / 微信追剧交互
- MoviePilot 通知渠道、TMDB 刮削

数据目录与原版 Vertex **不共用**，请使用独立挂载，例如 `./vertex-lite-data:/vertex`。

## 构建前端

```bash
cd webui
npm install --legacy-peer-deps
npm run build
cd ..
```

或：

```bash
bash docker/build-webui.sh
```

## 拉取镜像

双架构（`linux/amd64` + `linux/arm64`）精简版已推到 Docker Hub，不会覆盖 `latest`：

```bash
docker pull kuanghom/vertex:simple
```

启动示例：

```bash
docker run -d --name vertex-lite --restart unless-stopped \
  -p 3000:3000 \
  -e TZ=Asia/Shanghai \
  -v ./vertex-lite-data:/vertex \
  kuanghom/vertex:simple
```

## 本地构建镜像

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t kuanghom/vertex:simple -f docker/Dockerfile --push .
```

## 启动（本地 compose）

```bash
docker compose up -d --build
```

访问 `http://localhost:3000`，首次密码见宿主机映射目录下的 `data/password`。
