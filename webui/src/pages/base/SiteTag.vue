<template>
  <div style="font-size: 24px; font-weight: bold;">站点标签</div>
  <a-divider></a-divider>
  <div class="site-tag">
    <a-card size="small" style="margin-bottom: 16px;">
      <a-form layout="inline">
        <a-form-item label="自动打标签">
          <a-switch v-model:checked="setting.enabled" checked-children="启用" un-checked-children="禁用" @change="saveSetting" />
        </a-form-item>
        <a-form-item label="搜索">
          <a-input v-model:value="keyword" allowClear placeholder="站点名称 / 标签 / 域名" style="width: 240px;" size="small" />
        </a-form-item>
        <a-form-item>
          <a-button size="small" @click="resetDefault" danger>恢复默认数据</a-button>
        </a-form-item>
      </a-form>
      <div style="color: #888; font-size: 12px; margin-top: 8px;">
        添加 qBittorrent 下载时，按网站域名、Tracker 域名或 Vertex 站点名匹配标签；匹配失败不打标签。
      </div>
    </a-card>

    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="columns"
      size="small"
      :data-source="filteredItems"
      :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: total => `共 ${total} 条` }"
      :scroll="{ x: 960 }"
    >
      <template #title>
        <span style="font-size: 16px; font-weight: bold;">站点标签列表</span>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enabled'">
          <a-tag color="success" v-if="record.enabled">启用</a-tag>
          <a-tag v-else>禁用</a-tag>
        </template>
        <template v-if="column.dataIndex === 'siteHosts'">
          {{ record.siteHosts.length ? record.siteHosts.join(', ') : '—' }}
        </template>
        <template v-if="column.dataIndex === 'trackerHosts'">
          {{ record.trackerHosts.length ? record.trackerHosts.join(', ') : '—' }}
        </template>
        <template v-if="column.dataIndex === 'vertexNames'">
          {{ record.vertexNames.length ? record.vertexNames.join(', ') : '—' }}
        </template>
        <template v-if="column.title === '操作'">
          <a @click="modifyClick(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popover title="删除?" trigger="click" :overlayStyle="{ width: '84px', overflow: 'hidden' }">
            <template #content>
              <a-button type="primary" danger @click="deleteItem(record)" size="small">删除</a-button>
            </template>
            <a style="color: red">删除</a>
          </a-popover>
        </template>
      </template>
    </a-table>

    <a-divider></a-divider>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px;">新增 | 编辑站点标签</div>
    <div style="text-align: left;">
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="item"
        size="small"
        @finish="saveItem"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item label="站点名称" name="name" :rules="[{ required: true, message: '站点名称不可为空' }]">
          <a-input v-model:value="item.name" placeholder="如 CSPT - 财神" />
        </a-form-item>
        <a-form-item label="标签名" name="tag" extra="写入 qBittorrent 的标签名称" :rules="[{ required: true, message: '标签名不可为空' }]">
          <a-input v-model:value="item.tag" placeholder="如 财神" />
        </a-form-item>
        <a-form-item label="网站域名" name="siteHosts" extra="每行一个或逗号分隔，如 cspt.top">
          <a-textarea v-model:value="item.siteHosts" :rows="3" />
        </a-form-item>
        <a-form-item label="Tracker 域名" name="trackerHosts" extra="每行一个或逗号分隔，如 tracker.cspt.top">
          <a-textarea v-model:value="item.trackerHosts" :rows="3" />
        </a-form-item>
        <a-form-item label="Vertex 站点名" name="vertexNames" extra="搜索推送 / 豆瓣推送使用的站点标识，如 CHDBits，每行一个或逗号分隔">
          <a-textarea v-model:value="item.vertexNames" :rows="2" />
        </a-form-item>
        <a-form-item label="启用" name="enabled">
          <a-checkbox v-model:checked="item.enabled">启用</a-checkbox>
        </a-form-item>
        <a-form-item :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <a-button type="primary" html-type="submit" style="margin-top: 24px; margin-bottom: 48px;">应用 | 完成</a-button>
          <a-button style="margin-left: 12px; margin-top: 24px; margin-bottom: 48px;" @click="clearItem()">清空</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BaseSiteTag',
  data () {
    return {
      setting: { enabled: true },
      items: [],
      keyword: '',
      item: {},
      defaultItem: {
        id: '',
        name: '',
        tag: '',
        siteHosts: '',
        trackerHosts: '',
        vertexNames: '',
        enabled: true
      },
      columns: [
        { title: '站点名称', dataIndex: 'name', width: 180 },
        { title: '标签名', dataIndex: 'tag', width: 120 },
        { title: '网站域名', dataIndex: 'siteHosts', width: 220 },
        { title: 'Tracker', dataIndex: 'trackerHosts', width: 220 },
        { title: 'Vertex 站点', dataIndex: 'vertexNames', width: 120 },
        { title: '状态', dataIndex: 'enabled', width: 80 },
        { title: '操作', width: 120 }
      ]
    };
  },
  computed: {
    filteredItems () {
      const kw = (this.keyword || '').trim().toLowerCase();
      if (!kw) return this.items;
      return this.items.filter(record => {
        const text = [
          record.name,
          record.tag,
          ...(record.siteHosts || []),
          ...(record.trackerHosts || []),
          ...(record.vertexNames || [])
        ].join(' ').toLowerCase();
        return text.indexOf(kw) !== -1;
      });
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
    joinList (list) {
      return (list || []).join('\n');
    },
    splitList (value) {
      return value;
    },
    formatItems (items) {
      return (items || []).map(row => ({
        ...row,
        siteHosts: row.siteHosts || [],
        trackerHosts: row.trackerHosts || [],
        vertexNames: row.vertexNames || []
      }));
    },
    async listData () {
      const res = await this.$api().siteTag.list();
      this.setting.enabled = res.data.enabled !== false;
      this.items = this.formatItems(res.data.items);
    },
    async saveSetting () {
      try {
        await this.$api().siteTag.modifySetting({ enabled: this.setting.enabled });
        this.$message().success('设置已保存');
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async saveItem () {
      try {
        const payload = {
          ...this.item,
          siteHosts: this.splitList(this.item.siteHosts),
          trackerHosts: this.splitList(this.item.trackerHosts),
          vertexNames: this.splitList(this.item.vertexNames)
        };
        if (payload.id) {
          await this.$api().siteTag.modify(payload);
        } else {
          await this.$api().siteTag.add(payload);
        }
        this.$message().success((payload.id ? '编辑' : '新增') + '成功');
        await this.listData();
        this.clearItem();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    modifyClick (row) {
      this.item = {
        ...row,
        siteHosts: this.joinList(row.siteHosts),
        trackerHosts: this.joinList(row.trackerHosts),
        vertexNames: this.joinList(row.vertexNames)
      };
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },
    clearItem () {
      this.item = { ...this.defaultItem };
    },
    async deleteItem (row) {
      try {
        await this.$api().siteTag.delete({ id: row.id });
        this.$message().success('删除成功');
        await this.listData();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async resetDefault () {
      try {
        await this.$api().siteTag.resetDefault();
        this.$message().success('已恢复默认数据');
        await this.listData();
        this.clearItem();
      } catch (e) {
        this.$message().error(e.message);
      }
    }
  },
  async mounted () {
    this.clearItem();
    await this.listData();
  }
};
</script>

<style scoped>
.site-tag {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}
</style>
