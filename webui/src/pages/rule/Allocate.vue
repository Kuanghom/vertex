<template>
  <div class="allocate-rule fn-page">
    <div class="fn-toolbar">
      <a-button type="primary" @click="openCreate">新增</a-button>
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
      size="small"
      :data-source="allocateRuleList"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'type'">
          {{ typeLabel(record) }}
        </template>
        <template v-if="column.dataIndex === 'used'">
          <a-tag color="success" v-if="record.used">{{ record.usedCount || 0 }} 个任务</a-tag>
          <a-tag v-else>空闲</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="openApplyRss(record)">应用到 RSS</a-button>
            <template v-if="!record.builtin">
              <a-button type="link" @click="modifyClick(record)">编辑</a-button>
              <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteAllocateRule(record)">
                <a-button type="link" danger>删除</a-button>
              </a-popconfirm>
            </template>
            <a-tag v-else>内置</a-tag>
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
        :model="allocateRule"
        size="small"
        @finish="modifyAllocateRule"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给分配规则取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="allocateRule.alias"/>
        </a-form-item>
        <a-form-item
          label="类型"
          name="type"
          extra="排序指标可组合多个字段；JavaScript 可完全自定义选哪一台"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="allocateRule.type">
            <a-select-option value="sort">排序指标</a-select-option>
            <a-select-option value="javascript">JavaScript</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="allocateRule.type === 'sort'"
          label="合成方式"
          extra="优先级：从上到下比，上一行分出胜负就不看下面。加权：先把各指标在候选下载器里归一到 0~1，再按权重加总，选总分最低的">
          <a-select size="small" v-model:value="allocateRule.scoreMode" style="width: 200px">
            <a-select-option value="priority">按优先级比较</a-select-option>
            <a-select-option value="weighted">按权重打分</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="allocateRule.type === 'sort'"
          label="排序指标"
          :extra="allocateRule.scoreMode === 'weighted'
            ? '各指标先在候选下载器里归一到 0~1，再乘权重求和，选总分最低的。权重 0 的行不参与。升序表示数值小更好，降序表示数值大更好。「计入本轮」会把本次 RSS 已决定推送的数量/体积算进去'
            : '从上到下比，上一行分出胜负就不看下面。升序表示数值小更好（任务数、速度占用），降序表示数值大更好（剩余空间）。「计入本轮」会把本次 RSS 已决定推送的数量/体积算进去'">
          <a-table
            class="fn-edit-table"
            size="small"
            :pagination="{ pageSize: 20, hideOnSinglePage: true }"
            :columns="asCardColumns(metricTableColumns)"
            :data-source="allocateRule.metrics"
            :scroll="boundScroll(760)"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.dataIndex === 'field'">
                <a-select size="small" v-model:value="record.field" style="width: 180px">
                  <a-select-option v-for="field of metricFields" :key="field.key" :value="field.key">{{ field.name }}</a-select-option>
                </a-select>
              </template>
              <template v-if="column.dataIndex === 'order'">
                <a-select size="small" v-model:value="record.order" style="width: 120px">
                  <a-select-option value="asc">升序(小优先)</a-select-option>
                  <a-select-option value="desc">降序(大优先)</a-select-option>
                </a-select>
              </template>
              <template v-if="column.dataIndex === 'weight'">
                <a-input size="small" v-model:value="record.weight" style="width: 80px"/>
              </template>
              <template v-if="column.dataIndex === 'pending'">
                <a-checkbox v-model:checked="record.pending">计入本轮</a-checkbox>
              </template>
              <template v-if="column.dataIndex === 'action'">
                <a style="color: red" @click="allocateRule.metrics = allocateRule.metrics.filter((_, i) => i !== index)">删除</a>
              </template>
            </template>
          </a-table>
          <a-button
            size="small"
            style="margin-top: 8px;"
            @click="allocateRule.metrics.push({ ...metric })">
            新增指标
          </a-button>
        </a-form-item>
        <a-form-item
          v-if="allocateRule.type === 'javascript'"
          label="代码模板"
          extra="选模板会覆盖当前代码，可再改">
          <a-select
            size="small"
            v-model:value="jsTemplate"
            placeholder="插入模板"
            style="width: 240px"
            @change="applyJsTemplate">
            <a-select-option v-for="item of jsTemplates" :key="item.key" :value="item.key">{{ item.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="allocateRule.type === 'javascript'"
          name="code"
          :rules="[{ required: true, message: '${label}不可为空! ' }]"
          label="自定义代码">
          <a-textarea
            v-model:value="allocateRule.code"
            type="textarea"
            :rows="14"
            style="font-family: Consolas, Monaco, monospace;"
          />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
      <a-divider></a-divider>
      <div style="font-size: 16px; font-weight: bold; padding-left: 8px;">调试</div>
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="debug"
        size="small"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="下载器"
          extra="用当前在线下载器的真实数据试跑，不会真正推种。建议选 2 台以上">
          <a-checkbox-group style="width: 100%;" v-model:value="debug.clientIds">
            <a-row>
              <a-col v-for="downloader of downloaders" :span="8" :key="downloader.id">
                <a-checkbox :value="downloader.id">
                  {{ downloader.alias }}
                  <span v-if="!downloader.enable" style="color: #999;">(已禁用)</span>
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item
          label="模拟种子名"
          extra="传给脚本的 torrent.name，可用来按名称分流">
          <a-input size="small" v-model:value="debug.name" placeholder="debug.torrent"/>
        </a-form-item>
        <a-form-item
          label="模拟体积"
          extra="传给脚本的 torrent.size，单位字节；勾选「计入本轮」时会预扣空间">
          <a-input size="small" v-model:value="debug.size">
            <template #addonAfter>
              <a-select size="small" v-model:value="debug.sizeUnit" style="width: 120px">
                <a-select-option value="Byte">Byte</a-select-option>
                <a-select-option value="KiB">KiB</a-select-option>
                <a-select-option value="MiB">MiB</a-select-option>
                <a-select-option value="GiB">GiB</a-select-option>
              </a-select>
            </template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="模拟条数"
          extra="同一轮连续分配几条，用来看「计入本轮」是否摊开">
          <a-input size="small" v-model:value="debug.count" style="width: 120px"/>
        </a-form-item>
        <a-form-item :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <div class="fn-btn-row">
            <a-button type="primary" :loading="debugLoading" @click="debugAllocate()">调试当前规则</a-button>
            <a-button @click="clearDebug()">清空输出</a-button>
          </div>
        </a-form-item>
        <a-form-item v-if="debugResult.rounds" label="分配结果">
          <a-table
            size="small"
            :pagination="{ pageSize: 20, hideOnSinglePage: true }"
            :columns="asCardColumns(debugRoundColumns)"
            :data-source="debugResult.rounds"
            :scroll="boundScroll(480)"
          />
        </a-form-item>
        <a-form-item v-if="debugRanking.length" label="决策快照">
          <div style="margin-bottom: 8px; color: #666;">{{ debugResult.formula }}</div>
          <a-table
            size="small"
            :pagination="{ pageSize: 20, hideOnSinglePage: true }"
            :columns="asCardColumns(debugRankTableColumns)"
            :data-source="debugRanking"
            :scroll="boundScroll(720)"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'picked'">
                <a-tag color="success" v-if="record.picked">选中</a-tag>
              </template>
              <template v-if="column.dataIndex === 'freeSpaceOnDisk'">
                {{ $formatSize(record.freeSpaceOnDisk) }}
              </template>
              <template v-if="column.dataIndex === 'uploadSpeed'">
                {{ $formatSize(record.uploadSpeed) }}/s
              </template>
              <template v-if="column.dataIndex === 'avgDownloadSpeed'">
                {{ $formatSize(record.avgDownloadSpeed) }}/s
              </template>
            </template>
          </a-table>
        </a-form-item>
        <a-form-item
          v-if="debugResult.skipped && debugResult.skipped.length"
          label="跳过">
          <div v-for="item of debugResult.skipped" :key="item.id">
            {{ item.alias || item.id }}：{{ item.reason }}
          </div>
        </a-form-item>
        <a-form-item label="调试输出">
          <a-textarea
            size="small"
            v-model:value="debugOutput"
            :rows="10"
            readonly
            placeholder="点击「调试当前规则」后，这里显示选中结果和 console.log"
            style="font-family: Consolas, Monaco, monospace;"
          />
        </a-form-item>
      </a-form>
      <a-divider></a-divider>
      <a-descriptions title="说明" :column="1">
        <a-descriptions-item label="用途">
          RSS 任务勾选多台下载器后，用这里的方案决定每条种子推到哪一台。可用性过滤（速度/下载数/剩余空间上限）仍按原逻辑先筛一遍。
        </a-descriptions-item>
        <a-descriptions-item label="内置方案">
          原规则保持旧行为；轮询 / 最少下载任务 / 最大剩余空间 / 最低综合负载会把本轮已分配的种子算进去，避免一次扫到多条全进同一台。
        </a-descriptions-item>
        <a-descriptions-item label="排序指标权重">
          「按权重打分」时，每个指标先在当前候选下载器里缩放到 0~1（避免空间字节和任务个数直接相加），再乘权重求和，选总分最低的。权重 0 的行不参与。旧规则默认仍是「按优先级比较」。
        </a-descriptions-item>
        <a-descriptions-item label="最低综合负载">
          能装下的优先，全部不够仍会分配。分数 = 任务数×20 + 速度占用 − min(装完后剩余GiB, 400) + 填充比×150。速度占用：下载器配了限速则按利用率（下载满载约 80 分，上传满载约 50 分），否则平均下载×4 + 平均上传×2.5（单位 MiB/s）。400GiB 以上空闲不再加分，忙着传的大盘会被闲着的盘抢走。
        </a-descriptions-item>
        <a-descriptions-item label="函数签名">
          (clients, torrent, ctx) => clientId。必须返回下载器 id；出错时正式运行会回退原规则，调试时会把错误打出来。
        </a-descriptions-item>
        <a-descriptions-item label="clients[]">
          id、alias、leechingCount、seedingCount、uploadSpeed、downloadSpeed、avgUploadSpeed、avgDownloadSpeed、freeSpaceOnDisk、pendingCount、pendingSize、loadScore。速度/空间单位是字节；pending* 是本轮已决定推给这台的数量和体积。
        </a-descriptions-item>
        <a-descriptions-item label="torrent">
          name、size（字节）、hash、site。调试时可改名称和体积。
        </a-descriptions-item>
        <a-descriptions-item label="ctx">
          clientSortBy（RSS 任务里的排序规则）、rssAlias、state（同一轮扫描里可读写的对象，用来做轮询计数）、console（调试时可用 console.log）。
        </a-descriptions-item>
      </a-descriptions>
    <a-modal
      v-model:visible="applyVisible"
      :title="applyRule.alias ? `应用到 RSS：${applyRule.alias}` : '应用到 RSS'"
      ok-text="保存"
      :confirm-loading="applyLoading"
      width="640px"
      @ok="saveApplyRss">
      <div style="margin-bottom: 8px; color: #666;">
        勾选的任务会改用此方案。取消勾选且原先用此方案的任务会改回「原规则」。
      </div>
      <a-input
        size="small"
        v-model:value="applyKeyword"
        placeholder="筛选任务名"
        style="margin-bottom: 8px;"
        allow-clear
      />
      <div style="margin-bottom: 8px;">
        <a @click="mergeApplyRss(filteredApplyRss.map(item => item.id))">全选当前</a>
        <a-divider type="vertical" />
        <a @click="removeApplyRss(filteredApplyRss.map(item => item.id))">清空当前</a>
        <a-divider type="vertical" />
        <a @click="mergeApplyRss(filteredApplyRss.filter(item => item.enable).map(item => item.id))">只选启用</a>
      </div>
      <a-checkbox-group v-model:value="applyRssIds" style="width: 100%;">
        <a-row>
          <a-col v-for="item of filteredApplyRss" :span="12" :key="item.id" style="margin-bottom: 6px;">
            <a-checkbox :value="item.id">
              {{ item.alias }}
              <span style="color: #999;">（{{ allocateAlias(item.allocateRule) }}）</span>
            </a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </a-modal>
  </div>
</template>

<script>
const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  data () {
    const columns = [
      { title: '别名', dataIndex: 'alias', width: 28 },
      { title: '类型', dataIndex: 'type', width: 20 },
      { title: '说明', dataIndex: 'description', width: 70 },
      { title: '占用', dataIndex: 'used', width: 16 },
      { title: '操作', width: 28 }
    ];
    const metricColumns = [
      { title: '指标', dataIndex: 'field', width: 28 },
      { title: '顺序', dataIndex: 'order', width: 22 },
      { title: '权重', dataIndex: 'weight', width: 16 },
      { title: '本轮', dataIndex: 'pending', width: 18 },
      { title: '操作', dataIndex: 'action', width: 12 }
    ];
    return {
      columns,
      metricColumns,
      metricFields: [
        { name: '下载任务数', key: 'leechingCount' },
        { name: '做种任务数', key: 'seedingCount' },
        { name: '当前上传速度', key: 'uploadSpeed' },
        { name: '当前下载速度', key: 'downloadSpeed' },
        { name: '平均上传速度', key: 'avgUploadSpeed' },
        { name: '平均下载速度', key: 'avgDownloadSpeed' },
        { name: '剩余磁盘空间', key: 'freeSpaceOnDisk' },
        { name: '最低综合负载', key: 'loadScore' }
      ],
      metric: {
        field: 'leechingCount',
        order: 'asc',
        weight: 1,
        pending: true
      },
      jsTemplate: undefined,
      jsTemplates: [
        {
          key: 'leastLeech',
          name: '最少下载任务',
          code: '(clients, torrent, ctx) => {\n' +
            '  return clients.slice().sort((a, b) =>\n' +
            '    (a.leechingCount + a.pendingCount) - (b.leechingCount + b.pendingCount)\n' +
            '  )[0].id;\n' +
            '}'
        },
        {
          key: 'leastLoad',
          name: '最低综合负载',
          code: '(clients, torrent, ctx) => {\n' +
            '  ctx.console && ctx.console.log(\'loadScore\', clients.map(item => item.alias + \'=\' + item.loadScore.toFixed(2)));\n' +
            '  return clients.slice().sort((a, b) => a.loadScore - b.loadScore)[0].id;\n' +
            '}'
        },
        {
          key: 'mostSpace',
          name: '最大剩余空间',
          code: '(clients, torrent, ctx) => {\n' +
            '  return clients.slice().sort((a, b) =>\n' +
            '    (b.freeSpaceOnDisk - b.pendingSize) - (a.freeSpaceOnDisk - a.pendingSize)\n' +
            '  )[0].id;\n' +
            '}'
        },
        {
          key: 'roundRobin',
          name: '轮询',
          code: '(clients, torrent, ctx) => {\n' +
            '  ctx.state.i = ctx.state.i || 0;\n' +
            '  const picked = clients[ctx.state.i % clients.length];\n' +
            '  ctx.state.i += 1;\n' +
            '  return picked.id;\n' +
            '}'
        },
        {
          key: 'bigToSpace',
          name: '大体积分给空间多的',
          code: '(clients, torrent, ctx) => {\n' +
            '  const sizeGiB = (torrent.size || 0) / 1024 / 1024 / 1024;\n' +
            '  if (sizeGiB >= 20) {\n' +
            '    return clients.slice().sort((a, b) =>\n' +
            '      (b.freeSpaceOnDisk - b.pendingSize) - (a.freeSpaceOnDisk - a.pendingSize)\n' +
            '    )[0].id;\n' +
            '  }\n' +
            '  return clients.slice().sort((a, b) =>\n' +
            '    (a.leechingCount + a.pendingCount) - (b.leechingCount + b.pendingCount)\n' +
            '  )[0].id;\n' +
            '}'
        }
      ],
      allocateRule: {},
      defaultAllocateRule: {
        alias: '',
        type: 'sort',
        scoreMode: 'priority',
        metrics: [],
        code: '(clients, torrent, ctx) => {\n' +
          '  return clients.slice().sort((a, b) =>\n' +
          '    (a.leechingCount + a.pendingCount) - (b.leechingCount + b.pendingCount)\n' +
          '  )[0].id;\n' +
          '}'
      },
      allocateRuleList: [],
      downloaders: [],
      debug: {
        clientIds: [],
        name: 'debug.torrent',
        size: 10,
        sizeUnit: 'GiB',
        count: 3
      },
      debugLoading: false,
      debugResult: {},
      debugOutput: '',
      debugRoundColumns: [
        { title: '第几条', dataIndex: 'index', width: 14 },
        { title: '种子', dataIndex: 'torrent', width: 40 },
        { title: '选中下载器', dataIndex: 'pickedAlias', width: 30 }
      ],
      debugRankColumns: [
        { title: '结果', dataIndex: 'picked', width: 12 },
        { title: '下载器', dataIndex: 'alias', width: 22 },
        { title: '下载任务', dataIndex: 'leechingCount', width: 16 },
        { title: '本轮已分', dataIndex: 'pendingCount', width: 16 },
        { title: '综合负载', dataIndex: 'loadScore', width: 18 },
        { title: '剩余空间', dataIndex: 'freeSpaceOnDisk', width: 20 },
        { title: '当前上传', dataIndex: 'uploadSpeed', width: 18 },
        { title: '平均下载', dataIndex: 'avgDownloadSpeed', width: 18 }
      ],
      rssList: [],
      applyVisible: false,
      applyLoading: false,
      applyRule: {},
      applyRssIds: [],
      applyKeyword: ''
    };
  },
  computed: {
    debugRanking () {
      const rounds = this.debugResult.rounds || [];
      if (!rounds.length) return [];
      const last = rounds[rounds.length - 1];
      return (last.ranking || []).map(item => ({
        ...item,
        picked: item.id === last.pickedId,
        loadScore: Number(item.loadScore || 0).toFixed(2),
        weightedScore: item.weightedScore == null ? '' : Number(item.weightedScore).toFixed(3)
      }));
    },
    debugRankTableColumns () {
      if (!this.debugRanking.some(item => item.weightedScore !== '')) return this.debugRankColumns;
      const cols = this.debugRankColumns.slice();
      cols.splice(4, 0, { title: '加权分', dataIndex: 'weightedScore', width: 16 });
      return cols;
    },
    filteredApplyRss () {
      const keyword = (this.applyKeyword || '').trim().toLowerCase();
      if (!keyword) return this.rssList;
      return this.rssList.filter(item => (item.alias || '').toLowerCase().indexOf(keyword) !== -1);
    },
    metricTableColumns () {
      if (this.allocateRule.scoreMode === 'weighted') return this.metricColumns;
      return this.metricColumns.filter(item => item.dataIndex !== 'weight');
    }
  },
  methods: {
    typeLabel (record) {
      if (record.builtin) return '内置';
      if (record.type === 'javascript') return 'JavaScript';
      if (record.type === 'sort') {
        return record.scoreMode === 'weighted' ? '排序指标(加权)' : '排序指标';
      }
      return record.type || '-';
    },
    normalizeMetrics (metrics) {
      return (metrics || []).filter(item => item.field).map(item => ({
        field: item.field,
        order: item.order === 'desc' ? 'desc' : 'asc',
        weight: Math.max(0, Number(item.weight) || 0),
        pending: !!item.pending
      }));
    },
    async listAllocateRule () {
      try {
        const res = await this.$api().allocateRule.list();
        this.allocateRuleList = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async modifyAllocateRule () {
      try {
        const payload = { ...this.allocateRule };
        if (payload.type === 'sort') {
          payload.scoreMode = payload.scoreMode === 'weighted' ? 'weighted' : 'priority';
          payload.metrics = this.normalizeMetrics(payload.metrics);
        }
        await this.$api().allocateRule.modify(payload);
        this.$message().success((this.allocateRule.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        this.closeForm();
        this._formEditing = false;
        setTimeout(() => this.listAllocateRule(), 1000);
        this.clearAllocateRule();
        scrollToTop();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this._formEditing = false;
      if (typeof this.clearAllocateRule === 'function') this.clearAllocateRule();
      this.formVisible = true;
    },
    modifyClick (row) {
      this.allocateRule = {
        ...row,
        scoreMode: row.scoreMode || 'priority',
        metrics: (row.metrics || []).map(item => ({
          ...item,
          weight: item.weight == null || item.weight === '' ? 1 : item.weight
        }))
      };
      this._formEditing = true;
      this.formVisible = true;
    },
    async deleteAllocateRule (row) {
      if (row.used) {
        this.$message().error('组件被占用, 取消占用后删除');
        return;
      }
      try {
        await this.$api().allocateRule.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listAllocateRule();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    clearAllocateRule () {
      this.jsTemplate = undefined;
      this.allocateRule = {
        ...this.defaultAllocateRule,
        metrics: [{ ...this.metric }]
      };
    },
    applyJsTemplate (key) {
      const item = this.jsTemplates.find(row => row.key === key);
      if (!item) return;
      this.allocateRule.code = item.code;
    },
    sizeToBytes () {
      const units = { Byte: 1, KiB: 1024, MiB: 1024 * 1024, GiB: 1024 * 1024 * 1024 };
      return Math.abs(Number(this.debug.size) || 0) * (units[this.debug.sizeUnit] || units.GiB);
    },
    async listDownloader () {
      try {
        const res = await this.$api().downloader.list();
        this.downloaders = (res.data || []).sort((a, b) => a.alias.localeCompare(b.alias));
        if (!this.debug.clientIds.length) {
          this.debug.clientIds = this.downloaders.filter(item => item.enable).map(item => item.id);
        }
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    formatDebugOutput (data) {
      const lines = [];
      if (data.formula) lines.push(data.formula, '');
      (data.rounds || []).forEach(round => {
        lines.push(`第 ${round.index} 条 ${round.torrent} → ${round.pickedAlias || round.pickedId || '无'}`);
      });
      if (data.logs && data.logs.length) {
        lines.push('', '--- console ---');
        data.logs.forEach(item => {
          lines.push(`[${item.level}] ${item.message}`);
        });
      }
      if (data.skipped && data.skipped.length) {
        lines.push('', '--- 跳过 ---');
        data.skipped.forEach(item => {
          lines.push(`${item.alias || item.id}: ${item.reason}`);
        });
      }
      return lines.join('\n');
    },
    async debugAllocate () {
      if (!this.debug.clientIds.length) {
        this.$message().error('请至少选择一台下载器');
        return;
      }
      this.debugLoading = true;
      try {
        const payload = {
          rule: {
            type: this.allocateRule.type,
            scoreMode: this.allocateRule.scoreMode === 'weighted' ? 'weighted' : 'priority',
            metrics: this.normalizeMetrics(this.allocateRule.metrics),
            code: this.allocateRule.code
          },
          clientIds: this.debug.clientIds,
          count: this.debug.count,
          torrent: {
            name: this.debug.name || 'debug.torrent',
            size: this.sizeToBytes()
          }
        };
        const res = await this.$api().allocateRule.debug(payload);
        this.debugResult = res.data || {};
        this.debugOutput = this.formatDebugOutput(this.debugResult);
      } catch (e) {
        this.debugResult = {};
        this.debugOutput = e.message || String(e);
        this.$message().error(e.message);
      } finally {
        this.debugLoading = false;
      }
    },
    clearDebug () {
      this.debugResult = {};
      this.debugOutput = '';
    },
    allocateAlias (id) {
      const rule = this.allocateRuleList.find(item => item.id === (id || 'builtin:original'));
      return rule ? rule.alias : (id || '原规则');
    },
    mergeApplyRss (ids) {
      this.applyRssIds = Array.from(new Set([...this.applyRssIds, ...ids]));
    },
    removeApplyRss (ids) {
      const drop = new Set(ids);
      this.applyRssIds = this.applyRssIds.filter(item => !drop.has(item));
    },
    async listRss () {
      try {
        const res = await this.$api().rss.list();
        this.rssList = (res.data || []).sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async openApplyRss (row) {
      this.applyRule = row;
      this.applyKeyword = '';
      await this.listRss();
      this.applyRssIds = this.rssList
        .filter(item => (item.allocateRule || 'builtin:original') === row.id)
        .map(item => item.id);
      this.applyVisible = true;
    },
    async saveApplyRss () {
      this.applyLoading = true;
      try {
        const res = await this.$api().rss.batchUpdate({
          action: 'syncAllocate',
          allocateRule: this.applyRule.id,
          rssIds: this.applyRssIds
        });
        this.$message().success(res.message || '已应用到 RSS');
        this.applyVisible = false;
        await this.listAllocateRule();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.applyLoading = false;
      }
    }
  },
  async mounted () {
    this.clearAllocateRule();
    await Promise.all([this.listAllocateRule(), this.listDownloader()]);
  }
};
</script>
<style scoped>
.allocate-rule {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
