<template>
  <div style="font-size: 24px; font-weight: bold;">RSS 历史</div>
  <a-divider></a-divider>
  <div class="rss" >
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="columns"
      size="small"
      :loading="loading"
      :data-source="torrents"
      :pagination="pagination"
      @change="handleChange"
      :scroll="{ x: 1200 }"
    >
      <template #title>
        <div>
          <span style="font-size: 16px; font-weight: bold;">RSS 历史</span>
          <span style="font-size: 14px; font-weight: bold; color: red; margin-left: 12px;">遇到问题先去看 Wiki，特别是 Wiki 里的常见问题, 实在找不到再去交流群问, 别 TM Wiki 不看直接在群里问。</span>
          <div class="filter-bar">
            <a-select
              mode="multiple"
              show-search
              allow-clear
              placeholder="筛选 RSS"
              v-model:value="filterRss"
              style="width: 220px;"
              size="small"
              :filter-option="filterSelectOption"
              :options="rssFilterOptions"
            />
            <a-select
              mode="multiple"
              show-search
              allow-clear
              placeholder="筛选种子状态"
              v-model:value="filterStatus"
              style="width: 220px;"
              size="small"
              :filter-option="filterSelectOption"
              :options="statusFilterOptions"
            />
            <a-select
              mode="multiple"
              show-search
              allow-clear
              placeholder="筛选下载器"
              v-model:value="filterClient"
              style="width: 220px;"
              size="small"
              :filter-option="filterSelectOption"
              :options="clientFilterOptions"
            />
            <a-button @click="applyFilter" size="small" type="primary">筛选</a-button>
            <a-button @click="resetFilter" size="small">重置</a-button>
          </div>
        </div>
      </template>
      <template #headerCell="{ column }">
        <template v-if="column.dataIndex === 'name'">
          种子名称
          <a-input style="margin-left: 14px; width: 140px;" size="small" placeholder="筛选关键词" v-model:value="qs.key"></a-input>
          <a-button @click="applyFilter" style="margin-left: 4px;" size="small">筛选</a-button>
        </template>
      </template>
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
            <span class="rule-detail-icon" title="查看详情">ⓘ</span>
          </a-popover>
        </template>
        <template v-if="column.dataIndex === 'clientId'">
          <a v-if="record.clientId" @click="gotoClient(record.clientId)">{{ record.clientAlias || record.clientId }}</a>
          <span v-else>-</span>
        </template>
        <template v-if="column.title === '操作'">
          <a @click="gotoDetail(record)">打开</a>
          <a-divider type="vertical" />
          <a-popover title="删除?" trigger="click" :overlayStyle="{ width: '84px', overflow: 'hidden' }">
            <template #content>
              <a-button type="primary" danger @click="delRecord(record)" size="small">删除</a-button>
            </template>
            <a style="color: red">删除</a>
          </a-popover>
        </template>
      </template>
    </a-table>
  </div>
</template>
<script>
export default {
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
      position: ['topRight', 'bottomRight'],
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
    clientFilterOptions () {
      const options = [...this.clientList]
        .sort((a, b) => a.alias.localeCompare(b.alias, 'zh-CN'))
        .map(item => ({ label: item.alias, value: item.id }));
      options.unshift({ label: '无', value: 'none' });
      return options;
    }
  },
  methods: {
    isMobile () {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    },
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
  max-width: 1440px;
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
  margin-left: 6px;
  color: #1890ff;
  cursor: pointer;
  font-weight: bold;
}
</style>
