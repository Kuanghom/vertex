# Auto-Seedbox-PT (ASP)

🚀 **PT Seedbox 一键部署 + 场景化调优（qBittorrent / Vertex / FileBrowser）**  

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![System](https://img.shields.io/badge/System-Debian%2010%2B%20%7C%20Ubuntu%2020.04%2B-green.svg)]()
[![Architecture](https://img.shields.io/badge/Arch-x86__64%20%7C%20arm64-orange.svg)]()

<p align="left">
  <a href="#features">核心特性</a> •
  <a href="#quick-start">快速开始</a> •
  <a href="#parameters">参数详解</a> •
  <a href="#architecture">架构解析</a> •
  <a href="#uninstall">卸载与清理</a> •
  <a href="#recommendations">推荐方案</a> •
  <a href="#faq">常见问题</a>
</p>

> 本目录同步自 [yimouleng/Auto-Seedbox-PT](https://github.com/yimouleng/Auto-Seedbox-PT)。脚本内 Vertex 镜像已统一为 **`kuanghom/vertex:latest`**，其余与上游一致。

**Auto-Seedbox-PT** 是一个高度智能化的 Shell 脚本，旨在彻底简化 PT 专用服务器（Seedbox）的部署流程。它不仅能一键安装 qBittorrent、Vertex 和 FileBrowser，更内置了极其硬核的**系统级内核调优引擎**。

专注于 **刷流峰值** 与 **系统稳定** 的平衡：支持 **v4/v5**、**Mode 1/2**、**SSD/HDD** 自适配，并可选启用 **Mode 1 运行时动态控制器（`-a`）**。



---

## <a id="features"></a>✨ 核心特性

### ⚔️ 双模式调优（Mode 1 / Mode 2）
- 🏎️ **Mode 1（`-m 1`）**：面向抢种刷流，强调连接建立效率与并发能力；内存不足自动降级保护（<4GB 强制切到 Mode 2）。
- 🛡️ **Mode 2（`-m 2`）**：面向长期保种，参数更平滑，兼顾持续上传与低波动。

### 🧠 Mode 1 动态控制器（可选 `-a`）
- 仅对 **Mode 1** 生效，默认关闭（用户显式开启：`-a`）。
- 定时采样 **MemAvailable** 与 **PSI（若可用）**，在 **Boost / Normal / Guard** 档位间切换。
- 通过 qB WebAPI 动态调整：`connection_speed`、`half-open`、`per-torrent 连接`、`send buffer watermark/factor`。
- PSI 不可用时自动回退为 MemAvailable-only，并写入一次性告警到 journald。

### 💽 SSD/HDD 自适应
- 基于 **Downloads 所在挂载盘**识别盘型（`rotational`），按 SSD/HDD 分别选择更合适的 I/O/缓冲策略。
- v5 在 HDD 场景默认更保守，SSD/NVMe 场景更激进；v4/v5 均按盘型与内存分档。

### 🧱 系统级护栏与可回滚调优
- systemd `MemoryHigh/MemoryMax` 约束 qB 进程，避免极限并发导致系统卡死。
- 可选 sysctl/网络/队列调优（`-t`），并提供 **可回滚卸载**。

### 📦 组件化部署
- **Vertex**（Docker）：支持备份恢复与配置清洗（自动修正 qB 地址与账号密码）。
- **FileBrowser + MediaInfo**（Docker + Nginx）：网页内可直接查看媒体信息以及进行视频智能截图（发种专用，本地微服务 + Nginx 注入）。

---

## <a id="quick-start"></a>⚡ 快速开始

> 统一密码要求：**≥ 12 位**

### 1) Mode 1 抢种刷流（推荐可选 `-a`）
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) \
  -u 用户名 -p 密码 -q 5 -m 1 -v -f -t -a
```

### 2) G9.5 / 8G 常见刷流（推荐 v4+M1，可选 `-a`）
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) \
  -u 用户名 -p 密码 -q 4.3.9 -m 1 -v -f -t -a
```

### 3) Mode 2 稳定保种（长期挂机）
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) \
  -u 用户名 -p 密码 -q 4.3.9 -m 2 -v -f -t
```

### 4) 自定义端口（交互）
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) \
  -u 用户名 -p 密码 -v -f -t -o
```

### 5) Vertex 备份恢复
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) \
  -u 用户名 -p 密码 -m 2 -v -f -t -d "https://your-server.com/backup/vertex.zip" -k "zip_password"
```

### 6) 已有QB，只安装VT或FB
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_apps.sh) \
 -u 用户名 -p '密码' -v -d '备份直链' -k '解压密码' -f -r /data/downloads -o
```

---

## <a id="parameters"></a>📝 参数详解

| 参数 | 必填 | 描述 | 示例 |
|:---:|:---:|---|---|
| `-u` | ✅ | WebUI 及面板用户名 | `-u admin` |
| `-p` | ✅ | 统一密码（必须 ≥ 12 位） | `-p mysecurepass` |
| `-m` | ⭕ | 模式：`1`(极限刷流) / `2`(均衡保种)，默认 `1` | `-m 1` |
| `-q` | ⭕ | qB 版本：`4.3.9`、`5`、`latest` 或指定版本 | `-q 5.0.4` |
| `-c` | ⭕ | 指定缓存/工作集 (MiB)，不填则自动分档 | `-c 2048` |
| `-t` | ⭕ | 启用系统级内核与网络调优 | `-t` |
| `-a` | ⭕ | 启用 Mode 1 动态控制器（仅 `-m 1` 生效） | `-a` |
| `-v` | ⭕ | 部署 Vertex (Docker) | `-v` |
| `-f` | ⭕ | 部署 FileBrowser (Docker) | `-f` |
| `-o` | ⭕ | 自定义端口（交互式询问） | `-o` |
| `-d` | ⭕ | Vertex 备份 zip/tar.gz 下载直链 | `-d http://...` |
| `-k` | ⭕ | Vertex 备份解压密码 | `-k 123456` |
| `-r` | ⭕ | 只针对auto_seedbox_apps脚本，FB根目录路径 | `-r /data/downloads` |

---

## <a id="uninstall"></a>🗑️ 卸载与清理

> `--uninstall` 会清理服务/容器/配置，并回滚 sysctl、limits、扩展服务与相关规则（可交互选择是否删除 Downloads 数据目录）。

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_pt.sh) --uninstall
```

### 只针对auto_seedbox_apps脚本单独安装的VT和FB的卸载命令
```bash
bash <(wget -qO- https://raw.githubusercontent.com/Kuanghom/vertex/main/scripts/auto_seedbox_apps.sh) --uninstall
```

---

## <a id="architecture"></a>🚀 架构解析

刷流瓶颈通常由三类因素交替主导：

1) **连接建立与握手**：`connection_speed`、`half-open`、`max_connec(_per_torrent)`  
2) **磁盘 I/O**：`async_io_threads`、DiskIO 模式、脏页回写策略  
3) **内存压力**：page cache、qB cache/working set、socket/send buffer

本项目采用 **静态基线 +（可选）动态闭环** 的方式：
- 安装阶段按 **V4/V5、Mode 1/2、SSD/HDD、内存档位** 下发静态参数；
- Mode 1 可选启用 `-a`：运行时采样内存压力，自动在 **Boost / Guard** 间切换，避免需要人工盯盘。

### `-a`（仅 `-m 1` 生效）什么时候开？

`-a` 会启动 **Mode 1 动态控制器**：定时采样内存压力，必要时自动“收敛连接建立/并发水位”，避免刷流时卡顿或 OOM。

**建议开启（刷流/抢种用户优先）：**
- 并发高：种子多、连接多、经常爆发满速
- 机器中等资源：**6–16GB 内存**（最容易在爆发期抖动）
- 曾出现：掉速/短时卡死/qB 被 OOM 或频繁重启

**可以不启用：**
- 追求完全静态参数、结果可复现
- 资源很充足：**≥32GB 内存**且负载长期稳定
- 主要是长期保种：直接用 `-m 2` 更合适

> PSI 不可用时 `-a` 自动退化为 MemAvailable 判断，仍可作为护栏使用。

**`-a` 动态控制器支持随时开关：**  

启用后会创建并运行 `asp-qb-autotune.timer`。想关闭时执行：
```bash
sudo systemctl disable --now asp-qb-autotune.timer
```
需要恢复则执行（保留上一次动态下发参数）：
```bash
sudo systemctl enable --now asp-qb-autotune.timer
```
关闭后若想回到安装时的静态参数，重启 qB：
```bash
sudo systemctl restart qbittorrent-nox@你的用户名（默认为admin）
```

---


## <a id="recommendations"></a>✅ 推荐方案

| 场景 | 推荐组合 | 说明 |
|---|---|---|
| **千兆 + HDD** | `4.3.9 + -m 2` | 以平滑策略优先稳定，降低随机 I/O 抖动 |
| **2.5G + SSD + 8–16G（如 G9.5）** | `4.3.9 + -m 1 (+ -a)` | 静态并发墙 +（可选）动态护栏/爆发档，稳定跑满更省心 |
| **万兆 + NVMe + ≥32G** | `5.x + -m 1 (+ -a)` | v5 更适合高速盘与大内存场景，上限更高 |

> 想在 G9.5 上尝试 v5：建议 `5 + -m 1 -a`，并适当控制种子数量/碎文件场景的 I/O 压力。

---

## <a id="faq"></a>❓ 常见问题 (FAQ)

**Q: 为什么不自动安装 BBRx / BBRv3？**  
A: 脚本仅在系统已具备相关拥塞算法时启用，不强制更换内核，避免驱动/启动风险。

**Q: 为什么 `-m 1` 被降级为 `-m 2`？**  
A: 物理内存 `<4GB` 时会触发保护降级，避免高并发下 OOM 卡死。

**Q: Vertex 连不上 qB，127.0.0.1 不行？**  
A: Vertex 在容器内，`127.0.0.1` 指向容器自身。应使用 Docker 网桥网关（脚本完成页会输出）。

**Q: `-a` 动态控制器依赖 PSI 吗？**  
A: PSI 可用时会参与判定；不可用时自动回退为 MemAvailable-only，并写入一次性告警日志。

**Q: 动态控制器怎么查看状态与日志？**  
A:
```bash
systemctl status asp-qb-autotune.timer
journalctl -t asp-qb-autotune -n 50
```

---

## 📜 协议与鸣谢

本项目基于 [MIT License](../LICENSE) 开源；本目录为同步副本，Vertex 镜像默认使用 `kuanghom/vertex:latest`。  
调优思路参考了 [jerry048/Dedicated-Seedbox](https://github.com/jerry048/Dedicated-Seedbox) 与 [vivibudong/PT-Seedbox](https://github.com/vivibudong/PT-Seedbox) 的实践，并进行了场景化重构与安全护栏增强。
