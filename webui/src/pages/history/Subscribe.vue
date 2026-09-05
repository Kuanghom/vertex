<template>
  <div class="rss fn-page">
    <div class="fn-filter">
      <div class="fn-filter-item">
        <span>关键词</span>
        <a-input v-model:value="qs.key" allowClear placeholder="请输入" style="width: 220px;"/>
      </div>
      <a-button type="primary" @click="() => { qs.page = 1; listHistory(); }">查询</a-button>
    </div>
    <div class="fn-toolbar fn-toolbar-plain">
      <fn-column-settings
        :items="columnSettingItems"
        @toggle="toggleColumnVisible"
        @move="moveColumn"
        @dragstart="onColumnDragStart"
        @drop="onColumnDrop"
        @reset="resetColumnPrefs"/>
    </div>
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
        <template v-if="column.dataIndex === 'mediaName' && [6, 99].indexOf(record.recordType) !== -1">
          {{ JSON.parse(record.recordNote).wish.name }}
        </template>
        <template v-if="column.dataIndex === 'mediaName' && [6, 99].indexOf(record.recordType) === -1">
          种子推送
        </template>
        <template v-if="column.dataIndex === 'name'">
          <a @click="gotoDetail(record)">{{ record.name }}</a>
          <template v-if="[6, 99].indexOf(record.recordType) !== -1">
            <br>
            <span style="font-size: 12px;">{{ JSON.parse(record.recordNote).torrent.subtitle }}</span>
          </template>
          <a style="font-size: 12px;" @click="gotoDetail(record, true)">[代理打开]</a>
        </template>
        <template v-if="['size', 'upload', 'download'].indexOf(column.dataIndex) !== -1">
          {{ $formatSize(record[column.dataIndex]) }}
        </template>
        <template v-if="['recordTime', 'deleteTime'].indexOf(column.dataIndex) !== -1 && record[column.dataIndex]">
          {{ $moment(record[column.dataIndex] * 1000).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-if="column.dataIndex === 'recordNote'">
          <span>{{ record.recordNote.indexOf('wish') !== -1 ? '豆瓣' : record.recordNote }}</span>
          <span v-if="record.recordType === 99">/
            <a-popover title="重新链接?" trigger="click" :overlayStyle="{ width: '96px', overflow: 'hidden' }">
              <template #content>
                <a-button type="primary" danger @click="relink(record)" size="small">重新链接</a-button>
              </template>
              <a>已完成</a>
            </a-popover>
          </span>
          <span v-if="record.recordType === 6">/未完成</span>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="gotoLink(record)">软/硬链接</a-button>
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
        title: '剧集',
        dataIndex: 'mediaName',
        width: 24,
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
        title: '记录时间',
        dataIndex: 'recordTime',
        width: 32
      }, {
        title: '种子状态',
        dataIndex: 'recordNote',
        width: 24
      }, {
        title: '操作',
        dataIndex: 'option',
        width: 24
      }
    ];
    const qs = {
      page: 1,
      length: 20,
      type: 'bingewatching',
      rss: '',
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
      rssList: []
    };
  },
  methods: {
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
    async delRecord (record) {
      try {
        await this.$api().subscribe.delRecord({ id: record.id });
        await this.$message().success('删除成功, 列表刷新中....');
        this.listHistory();
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async relink (record) {
      try {
        await this.$api().subscribe.relink({ id: record.id, doubanId: JSON.parse(record.recordNote).wish.doubanId });
        await this.$message().success('已重新启动链接任务, 列表刷新中....');
        this.listHistory();
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async gotoDetail (record, proxy) {
      if (!record.link) return await this.$message().error('链接不存在');
      window.open(proxy ? record.link.replace(/https:\/\/.*?\//, `/proxy/site/${record.rssId}/`) : record.link);
    },
    async handleChange (pagination, filters) {
      this.qs.page = pagination.current;
      this.scrollListToTop();
      this.listHistory();
    },
    async gotoLink (record) {
      window.open('/task/link?hash=' + record.hash);
    }
  },
  async mounted () {
    this.listHistory();
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
</style>
