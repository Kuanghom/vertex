<template>
  <div class="site fn-page">
    <div class="fn-toolbar">
      <a-button type="primary" @click="openCreate">新增</a-button>
      <a-button @click="refresh()">刷新所有</a-button>
      <fn-column-settings
        :items="columnSettingItems"
        @toggle="toggleColumnVisible"
        @move="moveColumn"
        @dragstart="onColumnDragStart"
        @drop="onColumnDrop"
        @reset="resetColumnPrefs"/>

    </div>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="tableColumns"
      :loading="loading"
      :locale="tableLocale"
      size="middle"
      :data-source="siteList"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <fn-entity
            :title="record.name"
            :src="`/assets/icons/${record.name}.ico`"
            :record="record"
          />
        </template>
        <template v-if="column.dataIndex === 'data'">
          <div class="fn-io">
            <div><em class="up">上传</em>{{ $formatSize(record.upload) }}</div>
            <div><em class="down">下载</em>{{ $formatSize(record.download) }}</div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'conn'">
          <div class="fn-io">
            <div><em class="up">做种</em>{{ record.seeding || 0 }}</div>
            <div><em class="down">下载</em>{{ record.leeching || 0 }}</div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'seedingSize'">
          <div class="fn-io">
            <div>{{ $formatSize(record.seedingSize) }}</div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'updateTime'">
          {{ record.updateTime ? $moment(record.updateTime * 1000).format('MM-DD HH:mm:ss') : '—' }}
        </template>
        <template v-if="column.dataIndex === 'username'">
          <div class="fn-io">
            <div>{{ record.username || '—' }}</div>
            <div>{{ record.uid || '—' }}</div>
          </div>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" @click="goto(record)">打开</a-button>
            <a-button type="link" @click="refresh(record)">刷新</a-button>
            <a-button type="link" danger @click="deleteSite(record)">删除</a-button>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="site.id || site.name ? '编辑站点' : '新增站点'"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="site"
        size="small"
        @finish="modifySite"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="站点"
          name="name"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="site.name"  >
            <a-select-option :disabled="siteList.filter(item => item.name === site)[0]" v-for="site of sites" :key="site" :value="site">{{ site }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用站点"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox :disabled="site.used" v-model:checked="site.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="更新周期"
          name="cron"
          extra="Crontab 表达式, 默认每天的 11:55 与 23:55 各更新一次"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="site.cron"/>
        </a-form-item>
        <a-form-item
          label="优先级"
          name="priority"
          extra="选种规则内的站点优先级, 默认为 0">
          <a-input size="small" v-model:value="site.priority"/>
        </a-form-item>
        <a-form-item
          label="拉取远程种子"
          name="pullRemoteTorrent"
          extra="豆瓣任务启动超级模式时, 将使用本站点拉取远程种子"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="site.pullRemoteTorrent">拉取远程种子</a-checkbox>
        </a-form-item>
        <a-form-item
          label="搜索 R18 分区"
          name="adult"
          v-if="site.name === 'MTeam'"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="site.adult">搜索 R18 分区</a-checkbox>
        </a-form-item>
        <a-form-item
          label="Cookie"
          name="cookie"
          extra="Cookie, M-Team 为 api key"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="site.cookie"/>
        </a-form-item>
        <a-form-item
          :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script>
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  data () {
    const columns = [
      {
        title: '站点',
        dataIndex: 'name',
        width: 36,
        sorter: (a, b) => a.name.localeCompare(b.name),
        fixed: true
      }, {
        title: '用户名 / UID',
        dataIndex: 'username',
        sorter: (a, b) => a.username.localeCompare(b.username),
        width: 20
      }, {
        title: '数据',
        dataIndex: 'data',
        sorter: (a, b) => a.upload - b.upload,
        width: 20
      }, {
        title: '做种体积',
        dataIndex: 'seedingSize',
        sorter: (a, b) => a.seedingSize - b.seedingSize,
        width: 20
      }, {
        title: '连接',
        dataIndex: 'conn',
        sorter: (a, b) => a.seeding - b.seeding,
        width: 16
      }, {
        title: '优先级',
        dataIndex: 'priority',
        sorter: (a, b) => +a.priority - +b.priority,
        width: 12
      }, {
        title: '上次刷新时间',
        dataIndex: 'updateTime',
        sorter: (a, b) => a.updateTime - b.updateTime,
        width: 40
      }, {
        title: '操作',
        width: 40
      }
    ];
    return {
      refreshState: '刷新全部站点',
      columns,
      defaultSite: {
        name: '',
        cookie: '',
        cron: '55 11,23 * * *',
        enable: true,
        priority: '0',
        adult: false,
        pullRemoteTorrent: false
      },
      site: {},
      sites: [],
      siteInfo: {},
      displayAll: true,
      loading: true,
      siteList: []
    };
  },
  methods: {
    async listSite () {
      try {
        const res = await this.$api().site.list();
        this.siteInfo = res;
        this.loadSite();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listSupportSite () {
      try {
        const res = await this.$api().site.listSite({ support: 1 });
        this.sites = res.data.sort();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    loadSite () {
      this.siteList = [];
      const siteList = this.siteInfo.data.siteList;
      for (const site of siteList) {
        site.id = site.name;
        site.display = site.display === undefined ? true : site.display;
        site.priority = site.priority || 0;
        this.siteList.push({ ...site });
      }
    },
    goto (record) {
      window.open(`/proxy/site/${record.name}/`);
    },
    async modifySite () {
      try {
        await this.$api().site.modify({ ...this.site });
        this.$message().success((this.site.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        setTimeout(() => this.listSite(), 1000);
        this.clearSite();
        this.closeForm();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this.clearSite();
      this.formVisible = true;
    },
    openEdit (row) {
      this.site = { ...row };
      this.formVisible = true;
    },
    modifyClick (row) {
      this.openEdit(row);
    },
    async deleteSite (row) {
      if (row.used) {
        this.$message().error('组件被占用, 取消占用后删除');
        return;
      }
      try {
        await this.$api().site.delete(row.name);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listSite();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async clearSite () {
      this.site = { ...this.defaultSite };
    },
    async refresh (row) {
      try {
        await this.$api().site.refresh(row?.name);
        this.$message().success('刷新成功, 列表正在刷新...');
        setTimeout(() => this.listSite(), 1000);
      } catch (e) {
        this.$message().error(e.message);
      }
      this.listSite();
    }
  },
  async mounted () {
    this.site = { ...this.defaultSite };
    await this.listSupportSite();
    await this.listSite();
  }
};
</script>
<style scoped>
.site {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
