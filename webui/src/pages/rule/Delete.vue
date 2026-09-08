<template>
  <div class="delete-rule fn-page">
    <fn-filter :active="listSearchActive" title="搜索">
      <fn-list-search
        v-model:query="listQuery"
        :enableable="false"
        placeholder="别名 / ID"
        @reset="resetListSearch"/>
      <template #toolbar>
        <a-button @click="$goto('/guide/presets', $router)">从预设导入</a-button>
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
      size="small"
      :data-source="filterAdminList(deleteRuleList, ['alias', 'id'])"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'type'">
          {{ record.type === 'normal' ? '普通' : 'JavaScript'}}
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="cloneClick(record)">克隆</a-button>
            <a-button type="link" @click="modifyClick(record)">编辑</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteDeleteRule(record)">
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="formModalTitle"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="deleteRule"
        size="small"
        @finish="modifyDeleteRule"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给删种规则取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="deleteRule.alias"/>
        </a-form-item>
        <a-form-item
          label="持续时间"
          name="fitTime"
          extra="符合删种规则的持续时间, 只有到达持续时间之后才会删种, 单位为 秒, 不启用留空, 建议考虑下载器的删种周期一起设置">
          <a-input size="small" v-model:value="deleteRule.fitTime"/>
        </a-form-item>
        <a-form-item
          label="优先级"
          name="priority"
          extra="优先级越高的规则越先执行, 默认为 0">
          <a-input size="small" v-model:value="deleteRule.priority"/>
        </a-form-item>
        <a-form-item
          label="单次删种数量"
          name="deleteNum"
          extra="单次删种任务的删除种子的数量, 不同规则间不累计, 留空为单次只删除一个">
          <a-input size="small" v-model:value="deleteRule.deleteNum"/>
        </a-form-item>
        <a-form-item
          label="暂停种子"
          name="pause"
          extra="默认为删除种子，启用该选项后用暂停种子替代，其它流程照旧">
          <a-checkbox v-model:checked="deleteRule.pause">暂停种子</a-checkbox>
        </a-form-item>
        <a-form-item
          label="仅删除种子"
          name="onlyDeleteTorrent"
          extra="仅删除种子，若勾选，删除种子时不删除文件">
          <a-checkbox v-model:checked="deleteRule.onlyDeleteTorrent">仅删除种子</a-checkbox>
        </a-form-item>
        <a-form-item
          label="限制下载速度"
          name="limitSpeed"
          extra="默认为删除种子，启用该选项后用限制种子下载速度替代, 优先级高于暂停种子及删除种子, 留空为不启用">
          <a-input size="small" v-model:value="deleteRule.limitSpeed">
            <template #addonAfter>
              <a-select v-model:value="limitSpeedUnit" style="width: 108px">
                <a-select-option v-for="item of speedUnits" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="类型"
          name="type"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="deleteRule.type"  >
            <a-select-option value="normal">普通</a-select-option>
            <a-select-option value="javascript">JavaScript</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="限制条件"
          v-if="deleteRule.type === 'normal'"
          name="conditions"
          extra="关于各个条件的介绍，可以查看下方的说明"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-table
            class="fn-edit-table"
            :style="`font-size: ${isMobile() ? '12px': '14px'};`"
            :columns="asCardColumns(conditionColumns)"
            size="small"
            :data-source="deleteRule.conditions"
            :pagination="{ pageSize: 20, hideOnSinglePage: true }"
            :scroll="cardScroll(conditionColumns)"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'key'">
                <a-select size="small" v-model:value="record.key" @change="onConditionKeyChange(record)">
                  <a-select-option v-for="conditionKey of conditionKeys" :key="conditionKey.key" :value="conditionKey.key">{{ conditionKey.name }}</a-select-option>
                </a-select>
              </template>
              <template v-if="column.dataIndex === 'compareType'">
                <a-select size="small" v-model:value="record.compareType"  >
                  <a-select-option value="equals">等于</a-select-option>
                  <a-select-option value="bigger">大于</a-select-option>
                  <a-select-option value="smaller">小于</a-select-option>
                  <a-select-option value="contain">包含</a-select-option>
                  <a-select-option value="includeIn">包含于</a-select-option>
                  <a-select-option value="notContain">不包含</a-select-option>
                  <a-select-option value="notIncludeIn">不包含于</a-select-option>
                  <a-select-option value="regExp">正则匹配</a-select-option>
                  <a-select-option value="notRegExp">正则不匹配</a-select-option>
                </a-select>
              </template>
              <template v-if="column.dataIndex === 'value'">
                <fn-unit-input
                  v-if="conditionKind(record.key)"
                  v-model:value="record.value"
                  v-model:unit="record._unit"
                  :units="unitsFor(record.key)"
                />
                <a-input v-else size="small" v-model:value="record.value"/>
              </template>
              <template v-if="column.dataIndex === 'option'">
                <a style="color: red" @click="deleteRule.conditions = deleteRule.conditions.filter(item => item !== record)">删除</a>
              </template>
            </template>
          </a-table>
          <a-button
            type="primary"
            @click="deleteRule.conditions.push({ ...condition })"
            size="small"
            >
            新增条件
          </a-button>
        </a-form-item>
        <a-form-item
          v-if="deleteRule.type === 'javascript'"
          name="code"
          :rules="[{ required: true, message: '${label}不可为空! ' }]"
          label="自定义代码">
          <a-textarea  v-model:value="deleteRule.code" type="textarea" :rows="10"></a-textarea >
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
      <a-divider></a-divider>
      <a-descriptions
        title="说明"
        :column="1"
        >
        <!--
          01. 分享率一: 上传 / 种子大小 的结果<br>
          02. 分享率二: 上传 / 下载 的结果<br>
          03. 站点域名: 种子的 Tracker 地址的域名部分<br>
          04. 各类时间: 选项时间到当前时间的差值, 单位为 秒/s<br>
          05. 各类大小: 单位为 字节 / Byte, 可以使用 * 做乘法运算<br>
          06. 各类速度: 单位为 字节/s / Byte/s<br>
          07. 种子状态: 参照 qBittorrent 对种子状态的定义, 主要包含以下几类: <br>
              上传中: `uploading`, 下载中: `downloading`
              等待下载: `stalledDL`, 做种但无上传: `stalledUP`
              更多状态请参照 qBittorrent Wiki, 若想删除等待下载状态下的种子, 应填写 `stalledDL`
          08. 返回信息: 种子 Tracker 列表中由 Tracker 返回的信息<br>
          09. 当前时间: 当天 0 点到当前时间的秒数<br>
              例: 填写 当前时间大于 8\*3600 与 当前时间小于 22\*3600<br>
              则只会在当天上午 8 点之后到 22 点之前删种<br>
              0 点的时间戳取决于 Vertex 安装环境的时区<br>
          10. 全局速度: 当前下载器的速度<br>
          11. 做种下载连接: 仅计算已连接上的数量, 也即 qBittorrent WebUI 内括号外的数字 <br>
          12. 做种下载任务: 任务的数量, 做种包含上传中状态与做种状态, 下载包含下载中与等待下载状态 <br>
          13. 比较类型中的 包含 / 包含于 或 不包含 / 不包含于: 值部分需以半角逗号 , 为分割符, 如种子分类不包含于 KEEP, KEEP2, KEEP3 三个分类, 则应填写:
              `KEEP,KEEP2,KEEP3`
          -->
        <a-descriptions-item label="01. 分享率一">上传 / 选中文件大小 的结果</a-descriptions-item>
        <a-descriptions-item label="02. 分享率二">上传 / 下载 的结果</a-descriptions-item>
        <a-descriptions-item label="03. 分享率三">上传 / 种子总大小 的结果</a-descriptions-item>
        <a-descriptions-item label="04. 站点域名">种子的 Tracker 地址的域名部分</a-descriptions-item>
        <a-descriptions-item label="05. 各类时间">选项时间到当前时间的差值，用数字框选择 秒 / 分 / 时</a-descriptions-item>
        <a-descriptions-item label="06. 各类大小">用数字框选择 Byte / KiB / MiB / GiB / TiB</a-descriptions-item>
        <a-descriptions-item label="07. 各类速度">用数字框选择 Byte/s / KiB/s / MiB/s / GiB/s</a-descriptions-item>
        <a-descriptions-item label="08. 种子状态">
          参照 qBittorrent 对种子状态的定义, 主要包含以下几类:
          <br>
          上传中: uploading, 下载中: downloading
          <br>
          等待下载: stalledDL, 做种但无上传: stalledUP
          <br>
          若想删除等待下载状态下的种子, 应填写 stalledDL
          <br>
          更多状态请参照
          <a href="https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)#get-torrent-list">qBittorrent Wiki</a>
        </a-descriptions-item>
        <a-descriptions-item label="09. 返回信息">种子 Tracker 列表中由 Tracker 返回的信息</a-descriptions-item>
        <a-descriptions-item label="10. 当前时间">
          当天 0 点到当前时间的秒数, 0 点的时间戳取决于 Vertex 安装环境的时区
          <br>
          例: 填写 当前时间大于 8 时 与 当前时间小于 22 时, 则只会在当天上午 8 点之后到 22 点之前删种
        </a-descriptions-item>
        <a-descriptions-item label="11. 全局速度">当前下载器的速度，用数字框选择 Byte/s / KiB/s / MiB/s / GiB/s</a-descriptions-item>
        <a-descriptions-item label="12. 做种下载连接">仅计算已连接上的数量, 也即 qBittorrent WebUI 内括号外的数字</a-descriptions-item>
        <a-descriptions-item label="13. 做种下载任务">任务的数量, 做种包含上传中状态与做种状态, 下载包含下载中与等待下载状态</a-descriptions-item>
        <a-descriptions-item label="14. 比较类型中的 包含 / 包含于 或 不包含 / 不包含于">
          值部分需以半角逗号 , 为分割符. 如种子分类不包含于 KEEP, KEEP2, KEEP3 三个分类, 则应填写: KEEP,KEEP2,KEEP3
        </a-descriptions-item>
      </a-descriptions>
  </div>
</template>
<script>
import { scrollToTop } from '../../util/scroll';
import adminCrud from '../../mixins/adminCrud';
import { SPEED_UNITS, toBytes, fromBytes } from '../../util/sizeUnit';
import conditionUnit from '../../mixins/conditionUnit';

export default {
  mixins: [adminCrud, conditionUnit],
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
        width: 30
      }, {
        title: '持续时间',
        dataIndex: 'fitTime',
        width: 30
      }, {
        title: '优先级',
        dataIndex: 'priority',
        width: 10
      }, {
        title: '类型',
        dataIndex: 'type',
        width: 15
      }, {
        title: '操作',
        width: 20
      }
    ];
    const conditionColumns = [
      {
        title: '选项',
        dataIndex: 'key',
        width: 18
      }, {
        title: '比较类型',
        dataIndex: 'compareType',
        width: 18
      }, {
        title: '值',
        dataIndex: 'value',
        width: 90
      }, {
        title: '操作',
        dataIndex: 'option',
        width: 30
      }
    ];
    return {
      crudModalWidth: 880,
      columns,
      conditionColumns,
      conditionKeys: [{
        name: '种子名称',
        key: 'name'
      }, {
        name: '种子进度',
        key: 'progress'
      }, {
        name: '上传速度',
        key: 'uploadSpeed'
      }, {
        name: '下载速度',
        key: 'downloadSpeed'
      }, {
        name: '种子分类',
        key: 'category'
      }, {
        name: '种子标签',
        key: 'tags'
      }, {
        name: '选择大小',
        key: 'size'
      }, {
        name: '种子大小',
        key: 'totalSize'
      }, {
        name: '种子状态',
        key: 'state'
      }, {
        name: '站点域名',
        key: 'tracker'
      }, {
        name: '返回信息',
        key: 'trackerStatus'
      }, {
        name: '已完成量',
        key: 'completed'
      }, {
        name: '已下载量',
        key: 'downloaded'
      }, {
        name: '已上传量',
        key: 'uploaded'
      }, {
        name: '分享率一',
        key: 'ratio'
      }, {
        name: '分享率二',
        key: 'trueRatio'
      }, {
        name: '分享率三',
        key: 'ratio3'
      }, {
        name: '添加时间',
        key: 'addedTime'
      }, {
        name: '完成时间',
        key: 'completedTime'
      }, {
        name: '保存路径',
        key: 'savePath'
      }, {
        name: '做种连接',
        key: 'seeder'
      }, {
        name: '下载连接',
        key: 'leecher'
      }, {
        name: '剩余空间',
        key: 'freeSpace'
      }, {
        name: '下载任务',
        key: 'leechingCount'
      }, {
        name: '做种任务',
        key: 'seedingCount'
      }, {
        name: '全局上传',
        key: 'globalUploadSpeed'
      }, {
        name: '全局下载',
        key: 'globalDownloadSpeed'
      }, {
        name: '当前时间',
        key: 'secondFromZero'
      }],
      condition: {
        key: '',
        compareType: '',
        value: '',
        _kind: '',
        _unit: ''
      },
      deleteRule: {},
      defaultDeleteRule: {
        conditions: [],
        alias: '',
        type: '',
        priority: 0,
        code: '(maindata, torrent) => {\n' +
              '  return false;\n' +
              '}'
      },
      loading: true,
      deleteRuleList: [],
      limitSpeedUnit: 'KiB',
      speedUnits: SPEED_UNITS
    };
  },
  methods: {
    async listDeleteRule () {
      try {
        const res = await this.$api().deleteRule.list();
        this.deleteRuleList = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async modifyDeleteRule () {
      try {
        const payload = { ...this.deleteRule };
        payload.conditions = this.serializeConditions(payload.conditions);
        payload.limitSpeed = toBytes(payload.limitSpeed, this.limitSpeedUnit);
        await this.$api().deleteRule.modify(payload);
        this.$message().success((this.deleteRule.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        this.closeForm();
        this._formEditing = false;
        setTimeout(() => this.listDeleteRule(), 1000);
        this.clearDeleteRule();
        scrollToTop();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this._formEditing = false;
      if (typeof this.clearDeleteRule === 'function') this.clearDeleteRule();
      this.formVisible = true;
    },
    modifyClick (row) {
      const parsed = fromBytes(row.limitSpeed, 'KiB');
      this.deleteRule = {
        ...row,
        limitSpeed: parsed.value,
        conditions: this.hydrateConditions(row.conditions)
      };
      this.limitSpeedUnit = parsed.unit;
      this._formEditing = true;
      this.formVisible = true;
    },
    cloneClick (row) {
      const cloned = this.cloneRuleFrom(row);
      const parsed = fromBytes(cloned.limitSpeed, 'KiB');
      this.deleteRule = {
        ...cloned,
        limitSpeed: parsed.value,
        conditions: this.hydrateConditions(cloned.conditions)
      };
      this.limitSpeedUnit = parsed.unit;
      this._formEditing = false;
      this.formVisible = true;
    },
    async deleteDeleteRule (row) {
      if (row.used) {
        this.$message().error('组件被占用, 取消占用后删除');
        return;
      }
      try {
        await this.$api().deleteRule.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listDeleteRule();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    clearDeleteRule () {
      this.deleteRule = { ...this.defaultDeleteRule, conditions: [{ ...this.condition }] };
      this.limitSpeedUnit = 'KiB';
    }
  },
  async mounted () {
    this.clearDeleteRule();
    await this.listDeleteRule();
  }
};
</script>
<style scoped>
.delete-rule {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
