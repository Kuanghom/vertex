<template>
  <div class="rss fn-page">
    <fn-filter :active="!!(qs.name || qs.task)" title="搜索">
      <div class="fn-filter-item">
        <span>种子名称</span>
        <a-input v-model:value="qs.name" allowClear placeholder="请输入" style="width: 200px;"/>
      </div>
      <div class="fn-filter-item">
        <span>任务名称</span>
        <a-input v-model:value="qs.task" allowClear placeholder="请输入" style="width: 200px;"/>
      </div>
      <a-button type="primary" @click="() => { qs.page = 1; listHistory(); }">查询</a-button>
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
      :data-source="history"
      :pagination="mergeListPagination(pagination)"
      :scroll="tableScroll"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'size'">
          {{ $formatSize(record.size) }}
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
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
        title: '识别名称',
        dataIndex: 'scrapedName',
        width: 24,
        fixed: true
      }, {
        title: '种子名称',
        dataIndex: 'name',
        width: 120
      }, {
        title: '年份',
        dataIndex: 'year',
        width: 16
      }, {
        title: '类型',
        dataIndex: 'type',
        width: 16
      }, {
        title: '种子大小',
        dataIndex: 'size',
        width: 24
      }, {
        title: '所属任务',
        dataIndex: 'task',
        width: 60
      }, {
        title: '操作',
        dataIndex: 'option',
        width: 16
      }
    ];
    const qs = {
      page: 1,
      length: 20,
      type: 'rss',
      task: '',
      name: ''
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
      history: []
    };
  },
  methods: {
    async listHistory () {
      this.loading = true;
      try {
        const res = (await this.$api().watch.listHistory(this.qs)).data;
        this.history = res;
        if (this.qs.task) {
          this.history = this.history.filter(item => item.task.includes(this.qs.task));
        }
        if (this.qs.name) {
          this.history = this.history.filter(item => item.name.includes(this.qs.name));
        }
        this.pagination.total = res.length;
      } catch (e) {
        await this.$message().error(e.message);
      }
      this.loading = false;
    },
    async delRecord (record) {
      try {
        const res = await this.$api().watch.delRecord({ hash: record.hash, taskId: record.taskId });
        this.$message().success(res.message);
        this.listHistory();
      } catch (e) {
        await this.$message().error(e.message);
      }
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
