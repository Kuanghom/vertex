<template>
  <div class="fn-page">
  <div style="font-size: 24px; font-weight: bold;">下载器数据</div>
  <a-divider></a-divider>
  <div class="downloader-metric" >
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="displayColumns"
      size="small"
      :loading="loading"
      :data-source="downloaders"
      :scroll="tableScroll"
    >
      <template #title>
        <div class="fn-table-title">
          <span style="font-size: 16px; font-weight: bold;">下载器数据</span>
          <fn-column-settings
            :items="columnSettingItems"
            @toggle="toggleColumnVisible"
            @move="moveColumn"
            @dragstart="onColumnDragStart"
            @drop="onColumnDrop"
            @reset="resetColumnPrefs"/>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'alias'">
          <fn-entity :title="record.alias" :desc="record.type || ''" :mark="record.alias"/>
        </template>
        <template v-if="column.dataIndex === 'speed'">
          {{ $formatSize(record.uploadSpeed) }}/s / {{ $formatSize(record.downloadSpeed) }}/s
        </template>
        <template v-if="column.dataIndex === 'seedingCount'">
          {{ record.seedingCount + ' / ' + record.leechingCount }}
        </template>
        <template v-if="column.dataIndex === 'allTimeUpload'">
            {{ $formatSize(record.allTimeUpload) }} / {{ $formatSize(record.allTimeDownload) }}
        </template>
      </template>
    </a-table>
    <a-divider></a-divider>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="asCardColumns(trackerColumns)"
      size="small"
      :loading="loading"
      :data-source="runInfo.perTrackerToday.filter(item => item.tracker)"
      :scroll="cardScroll(trackerColumns)"
    >
      <template #title>
        <span style="font-size: 16px; font-weight: bold;">今日数据</span>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'tracker'">
          <span class="fn-track" :title="record.tracker">{{ record.tracker }}</span>
        </template>
        <template v-if="['uploaded', 'downloaded'].indexOf(column.dataIndex) !== -1">
          {{ $formatSize(record[column.dataIndex]) }}
        </template>
      </template>
    </a-table>
    <a-divider></a-divider>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="asCardColumns(trackerColumns)"
      size="small"
      :loading="loading"
      :data-source="runInfo.perTracker.filter(item => item.tracker)"
      :scroll="cardScroll(trackerColumns)"
    >
      <template #title>
        <span style="font-size: 16px; font-weight: bold;">累计统计</span>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'tracker'">
          <span class="fn-track" :title="record.tracker">{{ record.tracker }}</span>
        </template>
        <template v-if="['uploaded', 'downloaded'].indexOf(column.dataIndex) !== -1">
          {{ $formatSize(record[column.dataIndex]) }}
        </template>
      </template>
    </a-table>
  </div>
  </div>
</template>
<script>
import columnPrefs from '../../mixins/columnPrefs';

export default {
  mixins: [columnPrefs],
  data () {
    const columns = [
      {
        title: '别名',
        dataIndex: 'alias',
        width: 32,
        defaultSortOrder: 'ascend',
        fixed: true,
        sorter: (a, b) => a.alias.localeCompare(b.alias)
      }, {
        title: '实时速度',
        dataIndex: 'speed',
        width: 48,
        sorter: (a, b) => a.uploadSpeed - b.uploadSpeed
      }, {
        title: '当前任务',
        dataIndex: 'seedingCount',
        width: 48,
        sorter: (a, b) => a.seedingCount - b.seedingCount
      }, {
        title: '累计数据',
        dataIndex: 'allTimeUpload',
        width: 64,
        sorter: (a, b) => a.allTimeUpload - b.allTimeUpload
      }
    ];
    const trackerColumns = [
      {
        title: 'tracker',
        dataIndex: 'tracker',
        width: 140,
        ellipsis: true,
        sorter: (a, b) => a.tracker.localeCompare(b.tracker)
      }, {
        title: '上传',
        dataIndex: 'uploaded',
        width: 90,
        sorter: (a, b) => a.uploaded - b.uploaded
      }, {
        title: '下载',
        dataIndex: 'downloaded',
        width: 90,
        sorter: (a, b) => a.downloaded - b.downloaded
      }
    ];
    return {
      loading: false,
      trackerColumns,
      columns,
      downloaders: [],
      runInfo: {
        perTracker: [],
        perTrackerToday: []
      }
    };
  },
  methods: {
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
        const res = (await this.$api().downloader.listMainInfo()).data;
        this.downloaders = res;
      } catch (e) {
        await this.$message().error(e.message);
      }
    }
  },
  async mounted () {
    this.listDownloader();
    this.getRunInfo();
    this.interval = setInterval(() => {
      this.listDownloader();
    }, 5000);
  },
  beforeUnmount () {
    clearInterval(this.interval);
  }
};
</script>
<style scoped>
.downloader-metric {
  height: calc(100% - 92px);
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.fn-track {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
