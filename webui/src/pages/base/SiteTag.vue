<template>
  <div class="site-tag fn-page">
    <fn-filter :active="!!keyword" title="搜索">
      <div class="fn-filter-item">
        <span>搜索</span>
        <a-input
          class="fn-search"
          v-model:value="keyword"
          allowClear
          placeholder="支持名称 / 标签模糊搜索"
          style="width: 260px;"
        />
      </div>
      <div class="fn-filter-item">
        <span>自动打标签</span>
        <a-switch v-model:checked="setting.enabled" checked-children="启用" un-checked-children="禁用" @change="saveSetting" />
      </div>
      <template #toolbar>
        <a-button type="primary" @click="openCreate">新增</a-button>
        <a-button danger @click="resetDefault">恢复默认</a-button>
        <fn-column-settings
          :items="columnSettingItems"
          @toggle="toggleColumnVisible"
          @move="moveColumn"
          @dragstart="onColumnDragStart"
          @drop="onColumnDrop"
          @reset="resetColumnPrefs"/>
      </template>
    </fn-filter>
    <p class="fn-toolbar-hint">
      添加 qBittorrent 下载时，按网站域名、Tracker 域名或 Vertex 站点名匹配标签；匹配失败不打标签。
    </p>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="tableColumns"
      :loading="loading"
      :locale="tableLocale"
      size="middle"
      :data-source="filteredItems"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <fn-entity :title="record.name" :desc="record.tag" :mark="record.name" :record="record"/>
        </template>
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
          <fn-ops>
            <a-button type="link" @click="modifyClick(record)">编辑</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteItem(record)">
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="item.id ? '编辑站点标签' : '新增站点标签'"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="item"
        size="small"
        @finish="saveItem"
        :labelCol="{ span: 6 }"
        :wrapperCol="{ span: 18 }"
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
        <a-form-item :wrapperCol="isMobile() ? { span:24 } : { span: 18, offset: 6 }">
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
  name: 'BaseSiteTag',
  mixins: [adminCrud],
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
        { title: '操作', width: 140 }
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
        this.closeForm();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this.clearItem();
      this._formEditing = false;
      this.formVisible = true;
    },
    modifyClick (row) {
      this.item = {
        ...row,
        siteHosts: this.joinList(row.siteHosts),
        trackerHosts: this.joinList(row.trackerHosts),
        vertexNames: this.joinList(row.vertexNames)
      };
      this._formEditing = true;
      this.formVisible = true;
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
