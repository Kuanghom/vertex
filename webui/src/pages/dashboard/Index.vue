<template>
  <div class="index">
    <div class="dash">
        <div class="dash-row">
          <div class="data-rect-1 highlight-1">
            <div style="font-size: 14px; font-weight: bold; color: inherit;">
              <div>今日上传</div>
              <div>UPLOAD</div>
              <div style="margin: initial; font-size: 18px;">{{$formatSize(runInfo.uploadedToday)}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>今日下载</div>
              <div>DOWNLOAD</div>
              <div style="margin: initial; font-size: 18px;">{{$formatSize(runInfo.downloadedToday)}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>今日添加</div>
              <div>ACCEPT</div>
              <div style="margin: initial; font-size: 18px;">{{runInfo.addCountToday}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>今日拒绝</div>
              <div>REJECT</div>
              <div style="margin: initial; font-size: 18px;">{{runInfo.rejectCountToday}}</div>
            </div>
          </div>
        </div>
        <div class="dash-row">
          <div class="data-rect-1 highlight-2">
            <div style="font-size: 14px; font-weight: bold;">
              <div>累计上传</div>
              <div>UPLOAD</div>
              <div style="margin: initial; font-size: 18px;">{{$formatSize(runInfo.uploaded)}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>累计下载</div>
              <div>DOWNLOAD</div>
              <div style="margin: initial; font-size: 18px;">{{$formatSize(runInfo.downloaded)}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>累计添加</div>
              <div>ACCEPT</div>
              <div style="margin: initial; font-size: 18px;">{{runInfo.addCount}}</div>
            </div>
          </div>
          <div class="data-rect-1">
            <div style="font-size: 14px; font-weight: bold;">
              <div>累计拒绝</div>
              <div>REJECT</div>
              <div style="margin: initial; font-size: 18px;">{{runInfo.rejectCount}}</div>
            </div>
          </div>
        </div>
        <div
          v-if="!downloaders.length"
          class="dash-row">
          <div class="data-rect-2" style="cursor: pointer;" @click="$goto('/guide/presets?from=/index', $router)">
            <div class="data-rect-body">
              <div>还没有下载器和规则</div>
              <div class="data-rect-sub">去任务引导 → 快速导入，一键加上推荐套餐</div>
            </div>
          </div>
        </div>
        <div
          class="dash-row"
          v-if="showDownloaders || showServers"
          >
          <div
            v-for="(downloader, index) in (showDownloaders ? downloaders : [])"
            :key="'dl-' + downloader.id"
            class="data-rect-pointer data-rect-2"
            :class="{ 'highlight-3': index === 0 }"
            @click="gotoClient(`/proxy/client/${downloader.id}/`)">
            <div class="data-rect-body">
              <div>{{ downloader.alias }}</div>
              <div class="data-rect-sub">累计数据: {{ $formatSize(downloader.allTimeUpload) }} ↑ / {{$formatSize(downloader.allTimeDownload)}} ↓</div>
              <div class="data-rect-speed">{{ $formatSize(downloader.uploadSpeed) }}/s ↑ / {{$formatSize(downloader.downloadSpeed)}}/s ↓</div>
            </div>
          </div>
          <div
            v-for="(server, index) in (showServers ? servers : [])"
            :key="'sv-' + server.id"
            class="data-rect-2"
            :class="{ 'highlight-4': index === 0 && !showDownloaders }">
            <div class="data-rect-body">
              <div>{{ server.alias }}</div>
              <div class="data-rect-speed">{{ $formatSize(server.netSpeed.upload) }}/s ↑ / {{$formatSize(server.netSpeed.download)}}/s ↓</div>
            </div>
          </div>
        </div>
        <div
          class="dash-chart-wrap"
          v-if="runInfo.dashboardContent.filter(item => item === 'tracker')[0]"
          >
          <div class="data-rect-3">
            <v-chart class="tracker-chart" :option="trackerChart" autoresize/>
          </div>
        </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      trackerChart: {
        title: {
          text: 'Tracker 速度',
          left: 'center',
          textStyle: {
            fontFamily: 'consolas'
          }
        },
        grid: {
          top: 20,
          left: this.isMobile() ? 0 : 90,
          right: 0,
          bottom: 90
        },
        legend: {
          show: false
        },
        textStyle: {
          fontFamily: 'consolas'
        },
        dataZoom: [
          {
            type: 'inside',
            start: 0,
            end: 100
          },
          {
            start: 0,
            end: 100
          }
        ],
        tooltip: {
          trigger: 'axis',
          position: function (pos, params, dom, rect, size) {
            const obj = { top: 60 };
            obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 5;
            return obj;
          },
          formatter: (params) => {
            let str = params[0].axisValue + '</br>';
            params = params.sort((a, b) => b.value - a.value).filter(item => item.value);
            for (const param of params) {
              const size = this.$formatSize(param.value) + '/s';
              str += `${param.seriesName.slice(0, 20)}: ${'&nbsp;'.repeat(40 - size.length - param.seriesName.slice(0, 20).length || 1)}${size}<br>`;
            }
            return str;
          }
        },
        xAxis: {
          type: 'category',
          data: []
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            show: !this.isMobile(),
            formatter: item => this.$formatSize(item) + '/s'
          }
        },
        graphic: [
          {
            type: 'image',
            id: 'logo',
            right: 20,
            top: 20,
            z: -1,
            bounding: 'raw',
            origin: [125, 125],
            style: {
              image: '/assets/images/logo.svg',
              width: 64,
              height: 64,
              opacity: 0.8
            }
          }
        ],
        series: []
      },
      speedChart: {
        grid: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          z: 0
        },
        xAxis: {
          type: 'category',
          show: false,
          boundaryGap: false,
          data: []
        },
        yAxis: {
          type: 'value',
          show: false
        },
        series: [
          {
            data: [],
            type: 'line',
            symbol: 'none',
            smooth: true,
            areaStyle: {
              opacity: 0.2,
              color: '#BEC23F'
            },
            lineStyle: {
              opacity: 0,
              color: '#BEC23F'
            }
          }, {
            data: [],
            type: 'line',
            symbol: 'none',
            smooth: true,
            areaStyle: {
              opacity: 0,
              color: '#C46243'
            },
            lineStyle: {
              opacity: 0,
              color: '#C46243'
            }
          }
        ]
      },
      runInfo: {
        dashboardContent: []
      },
      trackerInfo: {},
      servers: [],
      downloaders: [],
      loading: true
    };
  },
  computed: {
    showDownloaders () {
      return (this.runInfo.dashboardContent || []).includes('downloader');
    },
    showServers () {
      return (this.runInfo.dashboardContent || []).includes('server');
    }
  },
  methods: {
    async listTrackerHistory () {
      try {
        const res = await this.$api().setting.getTrackerFlowHistory();
        this.trackerInfo = res;
        this.loadTracker();
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async getRunInfo () {
      try {
        const res = await this.$api().setting.getRunInfo();
        this.runInfo = res.data;
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async listDownloader () {
      try {
        const res = await this.$api().downloader.listMainInfo();
        this.downloaders = res.data
          .sort((a, b) => a.alias.localeCompare(b.alias))
          .map(item => ({
            ...item,
            speedChart: JSON.parse(JSON.stringify(this.speedChart))
          }));
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async listDownloaderInfo () {
      try {
        const res = await this.$api().downloader.listMainInfo();
        for (const downloader of this.downloaders) {
          const upload = res.data.filter(item => item.id === downloader.id)[0]?.uploadSpeed || 0;
          const download = res.data.filter(item => item.id === downloader.id)[0]?.downloadSpeed || 0;
          downloader.uploadSpeed = upload;
          downloader.downloadSpeed = download;
          // downloader.speedChart.xAxis.data.push('');
          // downloader.speedChart.series[0].data.push(upload);
          // downloader.speedChart.series[1].data.push(download);
        }
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async listServer () {
      try {
        const res = await this.$api().server.list();
        this.servers = res.data
          .sort((a, b) => a.alias.localeCompare(b.alias))
          .map(item => (
            {
              ...item,
              netSpeed: {
                upload: 0,
                download: 0
              },
              speedChart: JSON.parse(JSON.stringify(this.speedChart))
            }));
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async getNetSpeed () {
      try {
        this.netSpeed = (await this.$api().server.netSpeed()).data;
        for (const server of this.servers) {
          const upload = this.netSpeed[server.id]?.sort((a, b) => b.txBytes - a.txBytes)[0].txBytes || 0;
          const download = this.netSpeed[server.id]?.sort((a, b) => b.txBytes - a.txBytes)[0].rxBytes || 0;
          server.netSpeed = {
            upload,
            download
          };
          server.speedChart.xAxis.data.push('');
          server.speedChart.series[0].data.push(upload);
          // server.speedChart.series[1].data.push(download);
        }
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    loadTracker () {
      const recordList = this.trackerInfo.data.trackers;
      const template = {
        name: '',
        type: 'line',
        data: [],
        symbol: 'none',
        sampling: 'lttb',
        areaStyle: {
          opacity: 0.2
        },
        lineStyle: {
          opacity: 0.7
        },
        smooth: true
      };
      this.trackerChart.series = [];
      const dateSet = this.trackerInfo.data.timeGroup;
      for (const _tracker of Object.keys(recordList)) {
        const trackerRecord = recordList[_tracker];
        const tracker = { ...template };
        tracker.data = Object.keys(trackerRecord).map(i => Math.max(trackerRecord[i].upload, 0));
        tracker.name = _tracker;
        this.trackerChart.series.push(tracker);
      }
      if (this.trackerChart.series[0]) {
        const total = [];
        for (const [i] of this.trackerChart.series[0].data.entries()) {
          for (const series of this.trackerChart.series) {
            if (total[i]) {
              total[i] += Math.max(series.data[i], 0);
            } else {
              total[i] = Math.max(series.data[i], 0);
            }
          }
        }
        const t = { ...template };
        t.name = 'Total';
        t.data = total;
        this.trackerChart.series.push(t);
      }
      this.trackerChart.xAxis.data = dateSet.map(i => this.$moment(i * 1000).format('YYYY-MM-DD HH:mm'));
    },
    async gotoClient (url) {
      window.open(url);
    }
  },
  async mounted () {
    await this.getRunInfo();
    const downloader = !!this.runInfo.dashboardContent.filter(item => item === 'downloader')[0];
    const server = !!this.runInfo.dashboardContent.filter(item => item === 'server')[0];
    const tracker = !!this.runInfo.dashboardContent.filter(item => item === 'tracker')[0];
    if (downloader) {
      this.listDownloader();
      this.listDownloaderInfo();
    }
    if (server) {
      this.listServer();
      this.getNetSpeed();
    }
    if (tracker) {
      this.listTrackerHistory();
    }
    this.interval = setInterval(() => {
      if (downloader) {
        this.listDownloaderInfo();
      }
      if (server) {
        this.getNetSpeed();
      }
    }, 3000);
  },
  beforeUnmount () {
    clearInterval(this.interval);
  }
};
</script>
<style scoped>
.index {
  width: 100%;
  margin: 0;
  min-height: 100%;
}
.dash {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 12px 32px;
  box-sizing: border-box;
}
.dash-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin: 0 0 24px;
}
.dash-chart-wrap {
  display: flex;
  justify-content: center;
}

.highlight-1 {
  background: var(--blue-soft);
  color: var(--blue-deep);
}
.highlight-2 {
  background: var(--ok-soft);
  color: var(--ok);
}
.highlight-3 {
  background: var(--blue-soft);
  color: var(--blue-deep);
}
.highlight-4 {
  background: var(--ok-soft);
  color: var(--ok);
}

.data-rect-1 {
  text-align: left;
  width: 160px;
  flex: 0 0 160px;
  min-height: 104px;
  padding: 16px;
  color: var(--text-2);
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}
.data-rect-1:nth-child(1) { background: var(--blue-soft); color: var(--blue-deep); }
.data-rect-1:nth-child(2) { background: var(--ok-soft); color: var(--ok); }
.data-rect-1:nth-child(3) { background: var(--warn-soft); color: var(--warn); }
.data-rect-1:nth-child(4) { background: var(--bad-soft); color: var(--bad); }

.data-rect-2 {
  text-align: left;
  width: 336px;
  flex: 0 0 336px;
  max-width: 100%;
  min-height: 104px;
  color: var(--text-2);
  border-radius: 14px;
  background: var(--ok-soft);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}
.data-rect-body {
  padding: 16px;
  font-size: 14px;
  font-weight: 700;
}
.data-rect-sub {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
}
.data-rect-speed {
  margin-top: 4px;
  font-size: 16px;
}

.data-rect-3 {
  width: 100%;
  max-width: 688px;
  height: 400px;
  padding: 16px;
  border-radius: 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}
.tracker-chart {
  width: 100%;
  height: 100%;
}

.data-rect-pointer {
  cursor: pointer;
}

@media (max-width: 960px) {
  .dash {
    max-width: none;
    padding: 8px 12px 24px;
  }
  .dash-row {
    gap: 12px;
    margin-bottom: 16px;
  }
  .data-rect-1 {
    width: calc(50% - 6px);
    flex: 1 1 calc(50% - 6px);
  }
  .data-rect-2 {
    width: 100%;
    flex: 1 1 100%;
  }
}
</style>
