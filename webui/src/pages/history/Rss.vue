<template>
  <div class="rss fn-page">
    <fn-filter
      :active="rssHistoryFilterActive"
      title="筛选"
      toolbar-class="fn-toolbar-plain">
      <div class="fn-filter-item">
        <span>关键词</span>
        <a-input v-model:value="qs.key" allowClear placeholder="请输入" style="width: 200px;"/>
      </div>
      <div class="fn-filter-item">
        <span>RSS</span>
        <a-select
          mode="multiple"
          show-search
          allow-clear
          placeholder="请选择"
          v-model:value="filterRss"
          style="width: 200px;"
          :filter-option="filterSelectOption"
          :options="rssFilterOptions"
        />
      </div>
      <div class="fn-filter-item">
        <span>状态</span>
        <a-select
          mode="multiple"
          show-search
          allow-clear
          placeholder="请选择"
          v-model:value="filterStatus"
          style="width: 200px;"
          :filter-option="filterSelectOption"
          :options="statusFilterOptions"
        />
      </div>
      <div class="fn-filter-item">
        <span>下载器</span>
        <a-select
          mode="multiple"
          show-search
          allow-clear
          placeholder="请选择"
          v-model:value="filterClient"
          style="width: 200px;"
          :filter-option="filterSelectOption"
          :options="clientFilterOptions"
        />
      </div>
      <a-button type="primary" @click="applyFilter">查询</a-button>
      <a-button @click="resetFilter">重置</a-button>
      <template #toolbar>
        <fn-column-settings
          :items="columnSettingItems"
          @toggle="toggleColumnVisible"
          @move="moveColumn"
          @dragstart="onColumnDragStart"
          @drop="onColumnDrop"
          @reset="resetColumnPrefs"/>
      </template>
    </fn-filter>
    <a-table
      :columns="displayColumns"
      size="middle"
      :loading="loading"
      :data-source="torrents"
      :pagination="mergeListPagination(pagination)"
      @change="handleChange"
      :scroll="tableScroll"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'rssId'">
          {{ (rssList.filter(item => item.id === record.rssId)[0] || { alias: '已删除' }).alias }}
        </template>
        <template v-if="column.dataIndex === 'name'">
          <a
            v-if="record.link"
            class="torrent-name-link"
            @click.prevent="gotoDetail(record)">{{ record.name }}</a>
          <span v-else>{{ record.name }}</span>
        </template>
        <template v-if="['size', 'upload', 'download'].indexOf(column.dataIndex) !== -1">
          {{ $formatSize(record[column.dataIndex]) }}
        </template>
        <template v-if="['recordTime', 'deleteTime', 'pubTime'].indexOf(column.dataIndex) !== -1 && record[column.dataIndex]">
          {{ $moment(record[column.dataIndex] * 1000).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-if="column.dataIndex === 'pubTime' && !record.pubTime">
          -
        </template>
        <template v-if="column.dataIndex === 'recordNote'">
          <span>{{ formatRecordNote(record) }}</span>
          <a-popover
            v-if="showRuleDetail(record)"
            title="未匹配规则"
            trigger="click">
            <template #content>
              <div v-for="rule of record.recordDetail.failedRules" :key="rule.id" style="margin-bottom: 4px;">
                {{ rule.alias }} (优先级: {{ rule.priority }})
              </div>
            </template>
            <span class="rule-detail-icon" title="查看详情" aria-label="查看详情">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.4"/>
                <circle cx="8" cy="5.15" r="0.95" fill="currentColor"/>
                <path d="M8 7.25v4.1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </span>
          </a-popover>
        </template>
        <template v-if="column.dataIndex === 'clientId'">
          <a v-if="record.clientId" @click="gotoClient(record.clientId)">{{ record.clientAlias || record.clientId }}</a>
          <span v-else>-</span>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="gotoDetail(record)">打开</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="delRecord(record)">
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </fn-ops>
        </template>
      </template>
    </a-table>
  </div>
</template>
<script>
import columnPrefs from '../../mixins/columnPrefs';

export default {
  mixins: [columnPrefs],
  data () {
    const columns = [
      {
        title: 'RSS',
        dataIndex: 'rssId',
        width: 18,
        fixed: true
      }, {
        title: '种子名称',
        dataIndex: 'name',
        width: 120
      }, {
        title: '种子大小',
        dataIndex: 'size',
        width: 24
      }, {
        title: '发布时间',
        dataIndex: 'pubTime',
        width: 32
      }, {
        title: '上传流量',
        dataIndex: 'upload',
        width: 24
      }, {
        title: '下载流量',
        dataIndex: 'download',
        width: 24
      }, {
        title: '记录时间',
        dataIndex: 'recordTime',
        width: 32
      }, {
        title: '删除时间',
        dataIndex: 'deleteTime',
        width: 32
      }, {
        title: '种子状态',
        dataIndex: 'recordNote',
        width: 32
      }, {
        title: '下载器',
        dataIndex: 'clientId',
        width: 24
      }, {
        title: '操作',
        dataIndex: 'option',
        width: 32
      }
    ];
    const qs = {
      page: 1,
      length: 20,
      type: 'rss',
      rss: '',
      status: '',
      client: '',
      key: ''
    };
    const pagination = {
      position: ['bottomCenter'],
      total: 0,
      pageSize: qs.length,
      showSizeChanger: false
    };
    return {
      loading: true,
      pagination,
      columns,
      qs,
      torrents: [],
      rssList: [],
      statusList: [],
      clientList: [],
      filterRss: [],
      filterStatus: [],
      filterClient: []
    };
  },
  computed: {
    rssFilterOptions () {
      const options = [...this.rssList]
        .sort((a, b) => a.alias.localeCompare(b.alias, 'zh-CN'))
        .map(item => ({ label: item.alias, value: item.id }));
      options.push({ label: '已删除', value: 'deleted' });
      return options;
    },
    statusFilterOptions () {
      return this.statusList.map(status => ({
        label: this.formatStatusLabel(status),
        value: status
      }));
    },
    rssHistoryFilterActive () {
      return !!(this.qs.key || (this.filterRss && this.filterRss.length) ||
        (this.filterStatus && this.filterStatus.length) ||
        (this.filterClient && this.filterClient.length));
    },
    clientFilterOptions () {
      const options = [...this.clientList]
        .sort((a, b) => a.alias.localeCompare(b.alias, 'zh-CN'))
        .map(item => ({ label: item.alias, value: item.id }));
      options.unshift({ label: '无', value: 'none' });
      return options;
    }
  },
  methods: {
    filterSelectOption (input, option) {
      return (option.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0;
    },
    formatStatusLabel (status) {
      return status.indexOf('wish') !== -1 ? '豆瓣' : status;
    },
    formatRecordNote (record) {
      return this.formatStatusLabel(record.recordNote);
    },
    showRuleDetail (record) {
      return record.recordNote === '拒绝原因: 不符合所有规则' &&
        record.recordDetail &&
        record.recordDetail.failedRules &&
        record.recordDetail.failedRules.length;
    },
    syncFilterQuery () {
      this.qs.rss = this.filterRss.join(',');
      this.qs.status = this.filterStatus.join(',');
      this.qs.client = this.filterClient.join(',');
    },
    applyFilter () {
      this.qs.page = 1;
      this.syncFilterQuery();
      this.listHistory();
    },
    resetFilter () {
      this.filterRss = [];
      this.filterStatus = [];
      this.filterClient = [];
      this.qs.key = '';
      this.applyFilter();
    },
    async listHistory () {
      this.loading = true;
      try {
        const res = (await this.$api().torrent.listHistory(this.qs)).data;
        this.torrents = res.torrents;
        this.pagination.total = res.total;
      } catch (e) {
        await this.$message().error(e.message);
      }
      this.loading = false;
    },
    async listRss () {
      try {
        const res = await this.$api().rss.list();
        this.rssList = res.data.sort((a, b) => a.alias.localeCompare(b.alias, 'zh-CN'));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listFilterOptions () {
      try {
        const res = (await this.$api().torrent.listHistoryFilterOptions('rss')).data;
        this.statusList = res.statuses || [];
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listClient () {
      try {
        const res = await this.$api().downloader.list();
        this.clientList = res.data.sort((a, b) => a.alias.localeCompare(b.alias, 'zh-CN'));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    gotoClient (clientId) {
      window.open(`/proxy/client/${clientId}/`);
    },
    async gotoDetail (record) {
      if (!record.link) return await this.$message().error('链接不存在');
      window.open(record.link);
    },
    async handleChange (pagination) {
      this.qs.page = pagination.current;
      this.scrollListToTop();
      this.listHistory();
    },
    async delRecord (record) {
      try {
        await this.$api().rss.delRecord({ id: record.id });
        this.$message().success('删除成功, 列表刷新中....');
        this.listHistory();
        this.listFilterOptions();
      } catch (e) {
        await this.$message().error(e.message);
      }
    }
  },
  async mounted () {
    this.listHistory();
    this.listRss();
    this.listFilterOptions();
    this.listClient();
  }
};
</script>
<style scoped>
.rss {
  height: calc(100% - 92px);
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
.torrent-name-link {
  color: inherit;
  text-decoration: none;
}
.torrent-name-link:hover {
  color: inherit;
  text-decoration: none;
}
.rule-detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  color: var(--blue, #1890ff);
  cursor: pointer;
  line-height: 0;
  vertical-align: -2px;
}
.rule-detail-icon svg {
  display: block;
  width: 14px;
  height: 14px;
}
</style>
