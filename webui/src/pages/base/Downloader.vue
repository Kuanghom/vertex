<template>
  <div class="downloader fn-page">
    <fn-filter :active="listSearchActive" title="搜索">
      <fn-list-search
        v-model:query="listQuery"
        v-model:enable="listEnable"
        placeholder="别名 / ID / URL"
        @reset="resetListSearch"/>
      <template #toolbar>
        <a-button type="primary" @click="openCreate">新增</a-button>
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
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="tableColumns"
      :loading="loading"
      :locale="tableLocale"
      size="middle"
      :data-source="visibleDownloaders"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <div class="fn-cell-inline">
            <a-switch @change="enableDownloader(record)" v-model:checked="record.enable" checked-children="启用" un-checked-children="禁用"/>
            <a v-if="record.used" class="fn-ref-link" @click="openReferences(record)">{{ record.references.total }} 处引用</a>
          </div>
        </template>
        <template v-if="column.dataIndex === 'autoDelete'">
          <a-switch @change="toggleAutoDelete(record)" v-model:checked="record.autoDelete" checked-children="启用" un-checked-children="禁用"/>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <a-tag color="success" v-if="record.status">正常</a-tag>
          <a-tag color="error" v-if="!record.status">异常</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" @click="goto(record)">打开</a-button>
            <a-button type="link" @click="openBindRss(record)">绑定 RSS</a-button>
            <a-button type="link" @click="cloneClick(record)">克隆</a-button>
            <a-button type="link" :disabled="!record.enable" @click="gotoLog(record)">日志</a-button>
            <a-button type="link" danger @click="confirmDeleteDownloader(record)">删除</a-button>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="downloader.id ? '编辑下载器' : '新增下载器'"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="downloader"
        @finish="modifyDownloader"
        :labelCol="{ span: 6 }"
        :wrapperCol="{ span: 18 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给下载器取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.alias"/>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用下载器"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="下载器类型"
          name="type"
          extra="下载器类型, 目前完整支持 qBittorrent, Deluge 和 Transmission 不完全支持"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="downloader.type"  >
            <a-select-option value="qBittorrent">qBittorrent</a-select-option>
            <a-select-option value="Transmission">Transmission</a-select-option>
            <a-select-option value="deluge">Deluge</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.username"/>
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.password"/>
        </a-form-item>
        <a-form-item
          label="URL"
          name="clientUrl"
          extra="下载器的链接, 最后的 / 需要删除"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.clientUrl"/>
        </a-form-item>
        <a-form-item
          label="推送通知"
          name="pushNotify"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.pushNotify">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          v-if="downloader.pushNotify"
          label="通知方式"
          name="notify"
          extra="通知方式, 用于推送删种等信息, 在通知工具页面创建"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="downloader.notify">
            <a-select-option v-for="notification of notifications" v-model:value="notification.id" :key="notification.id">{{ notification.alias }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="监控频道"
          name="pushMonitor"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.pushMonitor">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          v-if="downloader.pushMonitor"
          label="监控频道"
          name="monitor"
          extra="下载器状态频道, 仅支持 Telegram! 在推送工具页面创建"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="downloader.monitor">
            <a-select-option
              :disabled="notification.type !== 'telegram'"
              v-for="notification of notifications"
              v-model:value="notification.id"
              :key="notification.id">
              {{ notification.alias }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="信息更新周期"
          name="cron"
          extra="下载器信息更新 Cron 表达式, 默认为 4s 更新一次, 种子量过多请考虑 一分钟 一次甚至 五分钟 一次"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.cron"/>
        </a-form-item>
        <a-form-item
          label="自动汇报"
          name="autoReannounce"
          extra="自动在种子添加后的第 5 分钟时汇报一次, 获取更多 Peers"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.autoReannounce">自动汇报</a-checkbox>
        </a-form-item>
        <a-form-item
          label="先下载首尾文件块"
          name="firstLastPiecePrio"
          extra="先下载首尾文件块, 同 qBittorrent 右键菜单 - 先下载首尾文件块">
          <a-checkbox v-model:checked="downloader.firstLastPiecePrio">先下载首尾文件块</a-checkbox>
        </a-form-item>
        <a-form-item
          label="空间警告"
          name="spaceAlarm"
          extra="下载器剩余空间小于一定值时推送警告通知, 15 分钟一次"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.spaceAlarm">空间警告</a-checkbox>
        </a-form-item>
        <a-form-item
          v-if="downloader.spaceAlarm"
          label="空间"
          name="alarmSpace"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.alarmSpace">
            <template #addonAfter>
              <a-select size="small" v-model:value="downloader.alarmSpaceUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte</a-select-option>
                <a-select-option value="KiB">KiB</a-select-option>
                <a-select-option value="MiB">MiB</a-select-option>
                <a-select-option value="GiB">GiB</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="上限上传速度"
          name="maxUploadSpeed"
          extra="若下载器的上传速度在此速度之上时, 不再添加种子">
          <a-input size="small" v-model:value="downloader.maxUploadSpeed">
            <template #addonAfter>
              <a-select size="small" v-model:value="downloader.maxUploadSpeedUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="上限下载速度"
          name="maxDownloadSpeed"
          extra="若下载器的下载速度在此速度之上时, 不再添加种子">
          <a-input size="small" v-model:value="downloader.maxDownloadSpeed">
            <template #addonAfter>
              <a-select size="small" v-model:value="downloader.maxDownloadSpeedUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte/s</a-select-option>
                <a-select-option value="KiB">KiB/s</a-select-option>
                <a-select-option value="MiB">MiB/s</a-select-option>
                <a-select-option value="GiB">GiB/s</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="最小剩余空间"
          name="minFreeSpace"
          extra="若下载器的剩余空间在此空间之下时, 不再添加种子">
          <a-input size="small" v-model:value="downloader.minFreeSpace">
            <template #addonAfter>
              <a-select size="small" v-model:value="downloader.minFreeSpaceUnit" placeholder="选择单位" style="width: 120px">
                <a-select-option value="Byte">Byte</a-select-option>
                <a-select-option value="KiB">KiB</a-select-option>
                <a-select-option value="MiB">MiB</a-select-option>
                <a-select-option value="GiB">GiB</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="最大下载数量"
          name="maxLeechNum"
          extra="最大的下载活动种子数量, 在超过此数量时, 将不会添加种子">
          <a-input size="small" v-model:value="downloader.maxLeechNum"/>
        </a-form-item>
        <a-form-item
          label="自动删种"
          name="autoDelete"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="downloader.autoDelete">自动删种</a-checkbox>
        </a-form-item>
        <a-form-item
          v-if="downloader.autoDelete"
          label="删种周期"
          name="autoDeleteCron"
          extra="删种周期 Cron 表达式, 默认为 1 分钟更新一次"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="downloader.autoDeleteCron"/>
        </a-form-item>
        <a-form-item
          v-if="downloader.autoDelete"
          label="拒绝删种规则"
          name="rejectDeleteRules"
          extra="拒绝删种规则, 种子状态符合其中一个时该种子不会被删除">
          <a-checkbox-group style="width: 100%;" v-model:value="downloader.rejectDeleteRules">
            <a-row>
              <a-col v-for="deleteRule of deleteRules" :span="8" :key="deleteRule.id">
                <a-checkbox  v-model:value="deleteRule.id">{{ deleteRule.alias }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item
          v-if="downloader.autoDelete"
          label="删种规则"
          name="deleteRules"
          extra="删种规则, 种子状态符合其中一个时即触发删除种子操作"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox-group style="width: 100%;" v-model:value="downloader.deleteRules">
            <a-row>
              <a-col v-for="deleteRule of deleteRules" :span="8" :key="deleteRule.id">
                <a-checkbox  v-model:value="deleteRule.id">{{ deleteRule.alias }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:visible="bindVisible"
      :title="bindClient.alias ? `绑定 RSS：${bindClient.alias}` : '绑定 RSS'"
      ok-text="保存绑定"
      :confirm-loading="bindLoading"
      width="640px"
      wrap-class-name="fn-form-roomy"
      @ok="saveBindRss">
      <div style="margin-bottom: 8px; color: #666;">
        勾选要加入这台下载器的 RSS 任务，取消勾选即移除。只剩一台下载器的任务不会被移除。
      </div>
      <a-input
        size="small"
        v-model:value="bindKeyword"
        placeholder="筛选任务名"
        style="margin-bottom: 8px;"
        allow-clear
      />
      <div style="margin-bottom: 8px;">
        <a @click="mergeBindRss(filteredBindRss.map(item => item.id))">全选当前</a>
        <a-divider type="vertical" />
        <a @click="removeBindRss(filteredBindRss.map(item => item.id))">清空当前</a>
        <a-divider type="vertical" />
        <a @click="mergeBindRss(filteredBindRss.filter(item => item.enable).map(item => item.id))">只选启用</a>
      </div>
      <a-checkbox-group v-model:value="bindRssIds" style="width: 100%;">
        <a-row>
          <a-col v-for="item of filteredBindRss" :span="12" :key="item.id" style="margin-bottom: 6px;">
            <a-checkbox :value="item.id">
              {{ item.alias }}
              <span v-if="!item.enable" style="color: #999;">(已禁用)</span>
            </a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </a-modal>
    <a-modal
      v-model:visible="refVisible"
      :title="refClient.alias ? `下载器「${refClient.alias}」的引用` : '查看引用'"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
    >
      <a-spin :spinning="refLoading">
        <p v-if="!refLoading && !refGroups.length">暂无引用</p>
        <div v-for="group of refGroups" :key="group.key" class="fn-ref-group">
          <div class="fn-ref-group-title">{{ group.title }}</div>
          <a
            v-for="item of group.items"
            :key="item.id || item.alias"
            class="fn-ref-item"
            @click="gotoRef(group.path)"
          >
            {{ item.alias }}
            <span v-if="item.detail"> · {{ item.detail }}</span>
            <span v-if="item.enable === false">（已禁用）</span>
            <span v-if="item.emptyClientArr">（将无可用下载器）</span>
          </a>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>
<script>
import { Modal } from 'ant-design-vue';
import { h } from 'vue';
import { scrollToTop } from '../../util/scroll';
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  data () {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 18,
        sorter: (a, b) => a.id.localeCompare(b.id),
        fixed: true
      }, {
        title: '别名',
        dataIndex: 'alias',
        sorter: (a, b) => a.alias.localeCompare(b.alias),
        defaultSortOrder: 'ascend',
        width: 20
      }, {
        title: '启用',
        dataIndex: 'enable',
        width: 15
      }, {
        title: 'URL',
        dataIndex: 'clientUrl',
        width: 40
      }, {
        title: '自动删种',
        dataIndex: 'autoDelete',
        width: 15
      }, {
        title: '状态',
        dataIndex: 'status',
        width: 15
      }, {
        title: '操作',
        width: 42
      }
    ];
    return {
      columns,
      downloaders: [],
      notifications: [],
      deleteRules: [],
      downloader: {},
      defaultDownloader: {
        id: '',
        alias: '',
        host: '',
        username: '',
        password: '',
        port: '',
        enable: true,
        pushNotify: false,
        pushMonitor: false,
        spaceAlarm: false,
        firstLastPiecePrio: true,
        cron: '*/4 * * * * *',
        autoDeleteCron: '* * * * *',
        autoReannounce: true,
        autoDelete: true,
        deleteRules: [],
        type: 'qBittorrent',
        alarmSpaceUnit: 'GiB',
        maxUploadSpeedUnit: 'MiB',
        maxDownloadSpeedUnit: 'MiB',
        minFreeSpaceUnit: 'GiB'
      },
      loading: true,
      registCode: [],
      rssList: [],
      bindVisible: false,
      bindLoading: false,
      bindClient: {},
      bindRssIds: [],
      bindKeyword: '',
      refVisible: false,
      refLoading: false,
      refClient: {},
      refData: {}
    };
  },
  computed: {
    visibleDownloaders () {
      return this.filterAdminList(this.downloaders, ['alias', 'id', 'clientUrl']);
    },
    filteredBindRss () {
      const keyword = (this.bindKeyword || '').trim().toLowerCase();
      if (!keyword) return this.rssList;
      return this.rssList.filter(item => (item.alias || '').toLowerCase().indexOf(keyword) !== -1);
    },
    refGroups () {
      const refs = this.refData || {};
      const groups = [];
      if ((refs.rss || []).length) groups.push({ key: 'rss', title: 'RSS 任务', path: '/task/rss', items: refs.rss });
      if ((refs.rssRule || []).length) groups.push({ key: 'rssRule', title: 'RSS 规则', path: '/rule/rss', items: refs.rssRule });
      if ((refs.client || []).length) groups.push({ key: 'client', title: '同服下载器', path: '/base/downloader', items: refs.client });
      return groups;
    }
  },
  methods: {
    stripClientPayload (client) {
      const payload = { ...client };
      delete payload.references;
      delete payload.used;
      delete payload.status;
      delete payload.allTimeUpload;
      delete payload.allTimeDownload;
      delete payload.uploadSpeed;
      delete payload.downloadSpeed;
      delete payload.leechingCount;
      delete payload.seedingCount;
      return payload;
    },
    async listDownloader () {
      try {
        const res = await this.$api().downloader.list();
        this.downloaders = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listNotification () {
      try {
        const res = await this.$api().notification.list();
        this.notifications = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async listDeleteRule () {
      try {
        const res = await this.$api().deleteRule.list();
        this.deleteRules = res.data.sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async modifyDownloader () {
      try {
        await this.$api().downloader.modify(this.stripClientPayload(this.downloader));
        this.$message().success((this.downloader.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        setTimeout(() => this.listDownloader(), 1000);
        this.clearDownloader();
        this.closeForm();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this.clearDownloader();
      this.formVisible = true;
    },
    openEdit (row) {
      this.downloader = this.withDownloaderDefaults(row);
      this.formVisible = true;
    },
    modifyClick (row) {
      this.openEdit(row);
    },
    cloneClick (row) {
      this.downloader = this.withDownloaderDefaults({
        ...row,
        deleteRules: [...(row.deleteRules || [])]
      });
      this.downloader.id = null;
      this.downloader.alias = this.downloader.alias + '-克隆';
      this.formVisible = true;
    },
    async confirmDeleteDownloader (row) {
      try {
        const res = await this.$api().downloader.references(row.id);
        const refs = res.data;
        const lines = this.formatReferenceLines(refs);
        const hasRefs = refs.total > 0;
        const emptyRss = (refs.rss || []).filter(item => item.emptyClientArr);
        let content = hasRefs
          ? `以下任务引用了下载器「${row.alias}」:\n\n${lines.join('\n')}\n\n删除后将从上述任务中移除该下载器配置。`
          : `确定删除下载器「${row.alias}」吗？`;
        if (emptyRss.length) {
          content += `\n\n注意: ${emptyRss.map(item => `「${item.alias}」`).join('、')} 将不再有可用下载器，RSS 推送会失败直至重新配置。`;
        }
        Modal.confirm({
          title: hasRefs ? '删除下载器并清理引用' : '删除下载器',
          content: h('div', { style: 'white-space: pre-wrap;' }, content),
          okText: '确认删除',
          okType: 'danger',
          cancelText: '取消',
          onOk: async () => {
            const deleteRes = await this.$api().downloader.delete(row.id);
            this.$message().success(deleteRes.message || '删除成功, 列表正在刷新...');
            await this.listDownloader();
            if (this.downloader.id === row.id) {
              this.clearDownloader();
            }
          }
        });
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    formatReferenceLines (refs) {
      const lines = [];
      for (const item of refs.rss || []) {
        lines.push(`RSS 任务「${item.alias}」(${item.detail}${item.enable ? '' : '，任务已禁用'})`);
      }
      for (const item of refs.rssRule || []) {
        lines.push(`RSS 规则「${item.alias}」`);
      }
      for (const item of refs.client || []) {
        lines.push(`下载器「${item.alias}」同服配置`);
      }
      return lines;
    },
    async deleteDownloader (row) {
      await this.confirmDeleteDownloader(row);
    },
    async enableDownloader (record) {
      try {
        await this.$api().downloader.modify(this.stripClientPayload(record));
        this.$message().success('修改成功, 列表正在刷新...');
        setTimeout(() => this.listDownloader(), 1000);
        this.clearDownloader();
      } catch (e) {
        record.enable = !record.enable;
        this.$message().error(e.message);
      }
    },
    async toggleAutoDelete (record) {
      try {
        await this.$api().downloader.modify(this.stripClientPayload(record));
        this.$message().success('修改成功, 列表正在刷新...');
        setTimeout(() => this.listDownloader(), 1000);
      } catch (e) {
        record.autoDelete = !record.autoDelete;
        this.$message().error(e.message);
      }
    },
    async openReferences (record) {
      this.refClient = record;
      this.refData = {};
      this.refVisible = true;
      this.refLoading = true;
      try {
        const res = await this.$api().downloader.references(record.id);
        this.refData = res.data || {};
      } catch (e) {
        this.$message().error(e.message);
        this.refVisible = false;
      } finally {
        this.refLoading = false;
      }
    },
    gotoRef (path) {
      this.refVisible = false;
      this.$goto(path, this.$router);
    },
    goto (record) {
      window.open(`/proxy/client/${record.id}/`);
    },
    gotoLog (record) {
      if (!record.enable) {
        this.$message().warning('该下载器已禁用, 无法查看日志');
        return;
      }
      window.open(`/tool/clientLog?id=${record.id}&bare=1`);
    },
    clearDownloader () {
      this.downloader = {
        ...this.defaultDownloader,
        deleteRules: []
      };
    },
    withDownloaderDefaults (row) {
      return {
        ...this.defaultDownloader,
        ...row,
        type: row.type || 'qBittorrent',
        alarmSpaceUnit: row.alarmSpaceUnit || 'GiB',
        maxUploadSpeedUnit: row.maxUploadSpeedUnit || 'MiB',
        maxDownloadSpeedUnit: row.maxDownloadSpeedUnit || 'MiB',
        minFreeSpaceUnit: row.minFreeSpaceUnit || 'GiB',
        deleteRules: [...(row.deleteRules || [])]
      };
    },
    async listRss () {
      try {
        const res = await this.$api().rss.list();
        this.rssList = (res.data || []).sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    mergeBindRss (ids) {
      this.bindRssIds = Array.from(new Set([...this.bindRssIds, ...ids]));
    },
    removeBindRss (ids) {
      const drop = new Set(ids);
      this.bindRssIds = this.bindRssIds.filter(item => !drop.has(item));
    },
    async openBindRss (row) {
      this.bindClient = row;
      this.bindKeyword = '';
      await this.listRss();
      this.bindRssIds = this.rssList
        .filter(item => (item.clientArr || []).indexOf(row.id) !== -1)
        .map(item => item.id);
      this.bindVisible = true;
    },
    async saveBindRss () {
      this.bindLoading = true;
      try {
        const res = await this.$api().rss.batchUpdate({
          action: 'syncClient',
          clientId: this.bindClient.id,
          rssIds: this.bindRssIds
        });
        this.$message().success(res.message || '绑定成功');
        this.bindVisible = false;
        await this.listDownloader();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.bindLoading = false;
      }
    }
  },
  async mounted () {
    this.clearDownloader();
    this.listDeleteRule();
    this.listNotification();
    this.listDownloader();
  }
};
</script>
<style scoped>
.downloader {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
