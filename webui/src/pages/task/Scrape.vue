<template>
  <div class="scrape fn-page">
    <a-alert
      type="info"
      show-icon
      message="站点抓取扩展用于 RSS 任务的促销筛选、排除 HR 及分类后缀判断。开启 RSS 任务中的对应开关后，会优先使用这里配置的站点脚本或模板。"
      style="margin-bottom: 12px;"
    />
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
      :data-source="scripts"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <a-tag color="success" v-if="record.enable">启用</a-tag>
          <a-tag color="error" v-if="!record.enable">禁用</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="modifyClick(record)">编辑</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteScript(record)">
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
        :model="script"
        size="small"
        @finish="modifyScript"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给站点抓取扩展取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="script.alias"/>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用站点抓取扩展"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="script.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="站点 Host"
          name="siteHost"
          extra="例如 dstudio.me。多个 host 使用英文逗号分隔"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="script.siteHost" @change="onSiteHostChange"/>
        </a-form-item>
        <a-form-item
          label="优惠模板"
          name="promoTemplate"
          extra="选择内置优惠检测模板。留空则显示 NexusPHP 通用参考；切换模板会自动填充优惠/免费/HR 三类脚本。">
          <a-select
            size="small"
            v-model:value="script.promoTemplate"
            allowClear
            placeholder="跟随内置站点规则"
            @change="onPromoTemplateChange">
            <a-select-option v-for="item of promoTemplates" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="优惠判断"
          name="promoScript"
          extra="选择模板会自动填充参考脚本；留空时显示 NexusPHP 通用参考。返回值: free / 2xfree / 2x / 50% / 30% / 2x50% / normal。">
          <a-textarea size="small" v-model:value="script.promoScript" :rows="6"/>
        </a-form-item>
        <a-form-item
          label="免费判断"
          name="freeScript"
          extra="返回 true 表示免费（兼容旧配置）。切换优惠模板时会同步填充参考脚本。">
          <a-textarea size="small" v-model:value="script.freeScript" :rows="8"/>
        </a-form-item>
        <a-form-item
          label="HR 判断"
          name="hrScript"
          extra="返回 true 表示 H&R。切换优惠模板时会同步填充参考脚本；无 HR 的站点模板会填充返回 false 的占位脚本。">
          <a-textarea size="small" v-model:value="script.hrScript" :rows="8"/>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
    <a-divider></a-divider>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px;">脚本调试</div>
    <div style="text-align: left;">
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
          label="测试链接"
          name="url"
          extra="种子详情页链接, 用于调试当前编辑中的脚本">
          <a-input size="small" v-model:value="debug.url" placeholder="https://example.com/details.php?id=12345"/>
        </a-form-item>
        <a-form-item
          label="站点"
          name="site"
          extra="选择站点后自动填充 Cookie, 也可手动填写 Cookie">
          <a-select
            size="small"
            v-model:value="debug.site"
            allowClear
            placeholder="选择站点"
            @change="onDebugSiteChange">
            <a-select-option v-for="site of siteList" :key="site.name" :value="site.name">{{ site.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          label="Cookie"
          name="cookie"
          extra="Cookie 或 M-Team Api Key">
          <a-input size="small" v-model:value="debug.cookie"/>
        </a-form-item>
        <a-form-item
          :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <div class="fn-btn-row">
            <a-button type="primary" :loading="debugLoading === 'promo'" @click="debugScript('promo')">调试优惠判断</a-button>
            <a-button type="primary" :loading="debugLoading === 'free'" @click="debugScript('free')">调试免费判断</a-button>
            <a-button type="primary" :loading="debugLoading === 'hr'" @click="debugScript('hr')">调试 HR 判断</a-button>
            <a-button @click="clearDebugOutput()">清空输出</a-button>
          </div>
        </a-form-item>
        <a-form-item
          label="调试输出"
          name="output">
          <a-textarea
            size="small"
            v-model:value="debugOutput"
            :rows="12"
            readonly
            placeholder="点击上方调试按钮后, console.log() 等输出会显示在这里"
            style="font-family: Consolas, Monaco, monospace;"
          />
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>
<script>
import {
  getScrapeScriptTemplates,
  getDefaultPromoTemplate,
  getDefaultPromoScript,
  getDefaultFreeScript,
  getDefaultHrScript,
  getScrapePresetByHost
} from '../../util/promoScriptTemplates';
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  data () {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 18,
        fixed: true
      }, {
        title: '别名',
        dataIndex: 'alias',
        width: 24
      }, {
        title: 'Host',
        dataIndex: 'siteHost',
        width: 36
      }, {
        title: '启用',
        dataIndex: 'enable',
        width: 15
      }, {
        title: '操作',
        width: 24
      }
    ];
    const promoTemplates = [
      { value: 'nexusphp', label: 'NexusPHP 系通用' },
      { value: 'mteam', label: 'M-Team 馒头' },
      { value: 'opencd', label: 'OpenCD' },
      { value: 'ttg', label: 'TTG' },
      { value: 'u2', label: 'U2' },
      { value: 'hdbits', label: 'HDBits' },
      { value: 'hdarea', label: 'HDArea' },
      { value: 'byr', label: 'BYR PT' },
      { value: 'hhanclub', label: 'HHanClub' },
      { value: 'hudbt', label: 'HUDBT' },
      { value: 'putao', label: '葡萄 PT' },
      { value: 'hares', label: 'Hares' },
      { value: 'bitporn', label: 'BitPorn' },
      { value: 'hdcity', label: 'HDCity' },
      { value: 'luminance', label: 'Gazelle / Luminance' },
      { value: 'dstudio', label: 'Depth Studio' },
      { value: 'unit3d', label: 'Unit3D 系 (MonikaDesign 等)' },
      { value: 'custom', label: '自定义脚本' }
    ];
    return {
      columns,
      promoTemplates,
      scripts: [],
      script: {},
      defaultScript: {
        enable: true,
        scriptType: 'scrape',
        siteHost: 'dstudio.me',
        promoTemplate: getDefaultPromoTemplate(),
        promoScript: getDefaultPromoScript(),
        freeScript: getDefaultFreeScript(),
        hrScript: getDefaultHrScript()
      },
      loading: true,
      siteList: [],
      debug: {
        url: '',
        site: undefined,
        cookie: ''
      },
      debugOutput: '',
      debugLoading: ''
    };
  },
  methods: {
    async listScript () {
      this.loading = true;
      try {
        const res = await this.$api().script.list();
        this.scripts = res.data
          .map(item => ({ ...item, scriptType: item.scriptType || 'cron' }))
          .filter(item => item.scriptType === 'scrape');
      } catch (e) {
        this.$message().error(e.message);
      }
      this.loading = false;
    },
    async listSite () {
      try {
        const res = await this.$api().site.list();
        this.siteList = (res.data.siteList || []).filter(item => item.enable);
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    onPromoTemplateChange (template) {
      this.applyScrapeScriptTemplates(this.script, false);
    },
    onSiteHostChange () {
      if (this.script.id) return;
      const preset = getScrapePresetByHost(this.script.siteHost);
      if (!preset) return;
      this.script.promoTemplate = preset.promoTemplate;
      this.applyScrapeScriptTemplates(this.script, false);
    },
    applyScrapeScriptTemplates (script = this.script, onlyIfEmpty = false) {
      const templates = getScrapeScriptTemplates(script.promoTemplate);
      if (!onlyIfEmpty || !script.promoScript?.trim()) {
        script.promoScript = templates.promo;
      }
      if (!onlyIfEmpty || !script.freeScript?.trim()) {
        script.freeScript = templates.free;
      }
      if (!onlyIfEmpty || !script.hrScript?.trim()) {
        script.hrScript = templates.hr;
      }
    },
    onDebugSiteChange (siteName) {
      const site = this.siteList.filter(item => item.name === siteName)[0];
      if (site) {
        this.debug.cookie = site.cookie || '';
      }
    },
    formatDebugOutput (type, data = {}) {
      const labelMap = { free: '免费判断', hr: 'HR 判断', promo: '优惠判断' };
      const label = labelMap[type] || type;
      const lines = [];
      if (data.error) {
        lines.push(`[${label}] 调试失败`);
        if (data.stageLabel || data.stage) {
          lines.push(`失败阶段: ${data.stageLabel || data.stage}`);
        }
        lines.push(`错误信息: ${data.error}`);
        if (data.stack) {
          lines.push('');
          lines.push('--- 错误堆栈 ---');
          lines.push(data.stack);
        }
      } else {
        lines.push(`[${label}] 调试完成`);
        lines.push(`脚本返回值: ${String(data.result)}`);
      }
      if (data.logs && data.logs.length) {
        lines.push('');
        lines.push('--- console 输出 ---');
        for (const log of data.logs) {
          lines.push(`[${log.level}] ${log.message}`);
        }
      } else if (!data.error) {
        lines.push('');
        lines.push('(无 console 输出)');
      }
      return lines.join('\n');
    },
    restoreLogArg (arg) {
      if (Array.isArray(arg)) {
        return arg.map(item => this.restoreLogArg(item));
      }
      if (arg && typeof arg === 'object' && arg.__vertexType === 'dom') {
        return {
          '[DOM Element]': arg.preview,
          tagName: arg.tagName,
          nodeName: arg.nodeName,
          className: arg.className,
          id: arg.id,
          textContent: arg.textContent,
          outerHTML: arg.outerHTML,
          innerHTML: arg.innerHTML
        };
      }
      if (arg && typeof arg === 'object' && arg.__vertexType === 'error') {
        const err = new Error(arg.message);
        err.name = arg.name || 'Error';
        err.stack = arg.stack;
        return err;
      }
      if (arg && typeof arg === 'object' && arg.__vertexType === 'object') {
        return arg.value;
      }
      return arg;
    },
    printDebugToBrowserConsole (type, data = {}) {
      const labelMap = { free: '免费判断', hr: 'HR 判断', promo: '优惠判断' };
      const label = labelMap[type] || type;
      const groupLabel = `[Vertex Scrape Debug] ${label}`;
      console.group(groupLabel);
      console.info('测试链接:', this.debug.url);
      if (data.error) {
        console.error('调试失败:', data.error);
        if (data.stageLabel || data.stage) {
          console.error('失败阶段:', data.stageLabel || data.stage);
        }
        if (data.stack) {
          console.error(data.stack);
        }
      } else {
        console.info('脚本返回值:', data.result);
      }
      if (data.logs && data.logs.length) {
        console.group('console 输出');
        for (const log of data.logs) {
          const method = ['log', 'info', 'warn', 'error', 'debug'].includes(log.level) ? log.level : 'log';
          const fn = console[method] || console.log;
          if (log.args && log.args.length) {
            fn(...log.args.map(arg => this.restoreLogArg(arg)));
          } else {
            fn(log.message);
          }
        }
        console.groupEnd();
      } else if (!data.error) {
        console.info('(无 console 输出)');
      }
      console.groupEnd();
    },
    appendDebugOutput (output) {
      this.debugOutput = this.debugOutput
        ? `${this.debugOutput}\n\n${output}`
        : output;
    },
    async debugScript (type) {
      const scriptCodeMap = {
        free: this.script.freeScript,
        hr: this.script.hrScript,
        promo: this.script.promoScript
      };
      const scriptCode = scriptCodeMap[type];
      const labelMap = { free: '免费判断', hr: 'HR 判断', promo: '优惠判断' };
      if (!scriptCode || !scriptCode.trim()) {
        this.$message().warning(`${labelMap[type] || type}脚本为空`);
        return;
      }
      if (!this.debug.url) {
        this.$message().warning('请填写测试链接');
        return;
      }
      if (!this.debug.cookie && !this.debug.site) {
        this.$message().warning('请填写 Cookie 或选择站点');
        return;
      }
      this.debugLoading = type;
      try {
        const res = await this.$api().script.debugScrape({
          type,
          url: this.debug.url,
          cookie: this.debug.cookie,
          site: this.debug.site,
          script: scriptCode
        });
        const data = res.data || {};
        this.appendDebugOutput(this.formatDebugOutput(type, data));
        this.printDebugToBrowserConsole(type, data);
        if (data.error) {
          this.$message().error(data.error);
        } else {
          this.$message().success(`${labelMap[type] || type}调试完成, 返回值: ${data.result}`);
        }
      } catch (e) {
        const data = e.data || {
          error: e.message || String(e),
          stack: e.stack,
          logs: []
        };
        this.appendDebugOutput(this.formatDebugOutput(type, data));
        this.printDebugToBrowserConsole(type, data);
        this.$message().error(data.error || e.message || '调试失败');
      } finally {
        this.debugLoading = '';
      }
    },
    clearDebugOutput () {
      this.debugOutput = '';
    },
    async modifyScript () {
      try {
        await this.$api().script.modify({ ...this.script, scriptType: 'scrape' });
        this.$message().success((this.script.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        this.closeForm();
        this._formEditing = false;
        setTimeout(() => this.listScript(), 1000);
        this.clearScript();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this._formEditing = false;
      if (typeof this.clearScrape === 'function') this.clearScrape();
      this.formVisible = true;
    },
    modifyClick (row) {
      this.script = { ...row, scriptType: 'scrape' };
      this.applyScrapeScriptTemplates(this.script, true);
      this._formEditing = true;
      this.formVisible = true;
    },
    async deleteScript (row) {
      try {
        await this.$api().script.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listScript();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    clearScript () {
      this.script = {
        ...this.defaultScript
      };
    }
  },
  async mounted () {
    this.clearScript();
    await Promise.all([this.listScript(), this.listSite()]);
  }
};
</script>
<style scoped>
.scrape {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
