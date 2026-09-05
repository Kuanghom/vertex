<template>
  <div class="fn-page">
  <div style="font-size: 24px; font-weight: bold;">下载器日志</div>
  <a-divider></a-divider>
  <div class="client-log">
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="displayColumns"
      size="small"
      :loading="loading"
      :data-source="logs"
      :pagination="mergeListPagination(pagination)"
      :scroll="tableScroll"
    >
      <template #title>
        <div class="fn-table-title">
          <span style="font-size: 16px; font-weight: bold;">下载器日志</span>
          <div class="fn-title-actions">
            <a-select
              v-model:value="clientId"
              placeholder="选择下载器"
              class="fn-title-select"
              allowClear
              :loading="loading"
              :disabled="loading"
              @change="onClientChange">
              <a-select-option v-for="item of downloaders" :key="item.id" :value="item.id">
                {{ item.alias }}
              </a-select-option>
            </a-select>
            <fn-column-settings
              :items="columnSettingItems"
              @toggle="toggleColumnVisible"
              @move="moveColumn"
              @dragstart="onColumnDragStart"
              @drop="onColumnDrop"
              @reset="resetColumnPrefs"/>
          </div>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'timestamp'">
          {{ $moment(record.timestamp > 1e11 ? record.timestamp : record.timestamp * 1e3).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-if="column.dataIndex === 'message'">
          <span :style="`${record.type === 4 ? 'color: red' : ''}`">{{ record.message }}</span>
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
        title: '时间',
        dataIndex: 'timestamp',
        width: 16,
        fixed: true
      }, {
        title: '信息',
        dataIndex: 'message',
        width: 96
      }
    ];
    const pagination = {
      position: ['topRight', 'bottomRight'],
      total: 0,
      pageSize: 100,
      showSizeChanger: false
    };
    return {
      pagination,
      columns,
      logs: [],
      downloaders: [],
      clientId: undefined,
      loading: false
    };
  },
  watch: {
    '$route.query.id' (id) {
      if (id !== this.clientId) {
        this.applyClientId(id || undefined);
      }
    }
  },
  methods: {
    async listDownloader () {
      try {
        const res = await this.$api().downloader.list();
        this.downloaders = res.data
          .filter(item => item.enable)
          .sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    isEnabledClient (id) {
      return this.downloaders.some(item => item.id === id);
    },
    async applyClientId (id) {
      if (!id) {
        this.clientId = undefined;
        await this.getLog();
        return;
      }
      if (!this.isEnabledClient(id)) {
        this.clientId = undefined;
        this.logs = [];
        this.pagination.total = 0;
        this.$message().warning('该下载器已禁用, 无法查看日志');
        if (this.$route.query.id) {
          this.$router.replace({ query: {} });
        }
        return;
      }
      this.clientId = id;
      await this.getLog();
    },
    async getLog () {
      if (!this.clientId) {
        this.logs = [];
        this.pagination.total = 0;
        this.loading = false;
        return;
      }
      this.loading = true;
      try {
        const res = await this.$api().downloader.getLogs(this.clientId);
        this.logs = res.data.reverse();
        this.pagination.total = this.logs.length;
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.loading = false;
      }
    },
    onClientChange (id) {
      this.$router.replace({ query: id ? { id } : {} });
      this.applyClientId(id);
    }
  },
  async mounted () {
    await this.listDownloader();
    if (this.$route.query.id) {
      await this.applyClientId(this.$route.query.id);
    }
  }
};
</script>
<style scoped>
.client-log {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
