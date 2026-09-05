# VERTEX

<img src="https://raw.githubusercontent.com/vertex-app/vertex/stable/webui/public/assets/images/logo.svg" width="144"/>

#### 适用于 PT 玩家的追剧刷流一体化综合管理工具

#### 交流群组

[VERTEX](https://t.me/group\_vertex)

# Vertex Docker 部署指南

本仓库基于 [Vertex](https://github.com/vertex-app/vertex) 二次开发，在保留原版追剧刷流能力的基础上，增加了以下功能：

- **站点自定义抓取扩展**：按站点编写抓取脚本，扩展免费/HR 等字段解析
- **种子抓取任务**：独立抓取调试页面（`/task/scrape`）
- **脚本调试**：脚本任务支持在线调试（`/task/script`）
- **RSS 增强**：试运行、检测免费/HR（单条检测）、历史记录与发布时间展示
- **U2 魔法 RSS**：将 U2 魔法接口转为标准 RSS 供 Vertex 订阅（`/task/u2Rss`）

---

## Docker 部署


```bash
cd webui
npm install --legacy-peer-deps   # 首次或 package.json 变更时
npm run build
cd ..
```

或使用脚本：

```bash
bash docker/build-webui.sh
```

### 构建镜像

```bash
docker build -t kuanghom/vertex:latest -f docker/Dockerfile .
```

多架构推送示例：

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t kuanghom/vertex:latest -f docker/Dockerfile --push .
```

### 启动容器

```bash
docker run -d \
  --name vertex \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /你的路径/vertex-data:/vertex \
  -e TZ=Asia/Shanghai \
  kuanghom/vertex:latest
```

或使用仓库内 compose（数据仍挂载到 `/vertex`）：

```bash
docker compose up -d --build
```

访问：`http://localhost:3000`  
首次安装初始密码：`/vertex/data/password`（即宿主机映射目录下的 `data/password`）。

---

## 路径映射

容器内数据根目录为 **`/vertex`**，建议将整个目录挂载到宿主机，升级镜像时数据不丢失。

| 容器路径 | 说明 |
|----------|------|
| `/vertex` | **推荐只映射这一项**，包含下方全部数据 |
| `/vertex/config` | 配置文件（`config.yaml`、`logger.yaml` 等） |
| `/vertex/data` | 业务数据（RSS、站点、规则、设置、U2 RSS 配置等） |
| `/vertex/db` | SQLite 数据库 |
| `/vertex/logs` | 运行日志 |
| `/vertex/torrents` | 种子文件 |

示例（Linux）：

```bash
-v /opt/vertex:/vertex
```

示例（Windows WSL 一键脚本默认）：

```bash
-v ./.vertex-data:/vertex
```

### 端口与环境变量

| 映射 / 变量 | 默认值 | 说明 |
|-------------|--------|------|
| `-p 宿主机端口:3000` | `3000` | Web 访问端口 |
| `TZ` | `Asia/Shanghai` | 时区 |
| `PORT` | `3000` | 容器内服务端口（一般无需改） |
| `PUID` / `PGID` | `0` | 可选，调整 `/vertex` 文件属主 |

---


## 常用命令

```bash
docker logs -f vertex
docker stop vertex && docker start vertex
docker rm -f vertex    # 删除容器，/vertex 卷内数据保留
```

仅修改后端 `app/` 时，可跳过 webui 构建后直接 `docker build`；修改了 `webui/` 必须先 `npm run build`。

#### Wiki
[https://wiki.vertex-app.top](https://wiki.vertex-app.top)

