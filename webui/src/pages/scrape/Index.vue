<template>
  <div style="font-size: 24px; font-weight: bold;">站点扩展</div>
  <a-divider></a-divider>
  <div class="scrape">
    <a-alert
      type="info"
      show-icon
      message="站点抓取扩展用于 RSS 任务的“抓取免费”和“排除 HR”判断。开启 RSS 任务中的对应开关后，会优先使用这里配置的站点脚本。"
      style="margin-bottom: 16px;"
    />
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="columns"
      size="small"
      :data-source="scripts"
      :pagination="false"
      :scroll="{ x: 720 }"
    >
      <template #title>
        <span style="font-size: 16px; font-weight: bold;">站点抓取扩展列表</span>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <a-tag color="success" v-if="record.enable">启用</a-tag>
          <a-tag color="error" v-if="!record.enable">禁用</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <span>
            <a @click="modifyClick(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popover title="删除?" trigger="click" :overlayStyle="{ width: '84px', overflow: 'hidden' }">
              <template #content>
                <a-button type="primary" danger @click="deleteScript(record)" size="small">删除</a-button>
              </template>
              <a style="color: red">删除</a>
            </a-popover>
          </span>
        </template>
      </template>
    </a-table>
    <a-divider></a-divider>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px;">新增 | 编辑站点抓取扩展</div>
    <div style="text-align: left; ">
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
          <a-input size="small" v-model:value="script.siteHost"/>
        </a-form-item>
        <a-form-item
          label="免费判断"
          name="freeScript"
          extra="返回 async function (ctx) { ... }，返回 true 表示免费。脚本内可使用 console.log() 调试。不需要免费判断时可留空。">
          <a-textarea size="small" v-model:value="script.freeScript" :rows="8"/>
        </a-form-item>
        <a-form-item
          label="HR 判断"
          name="hrScript"
          extra="返回 async function (ctx) { ... }，返回 true 表示 H&R。脚本内可使用 console.log() 调试。不需要 HR 判断时可留空。">
          <a-textarea size="small" v-model:value="script.hrScript" :rows="8"/>
        </a-form-item>
        <a-form-item
          :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <a-button type="primary" html-type="submit" style="margin-top: 24px; margin-bottom: 48px;">应用 | 完成</a-button>
          <a-button style="margin-left: 12px; margin-top: 24px; margin-bottom: 48px;" @click="clearScript()">清空</a-button>
        </a-form-item>
      </a-form>
    </div>
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
          <a-button type="primary" :loading="debugLoading === 'free'" @click="debugScript('free')">调试免费判断</a-button>
          <a-button type="primary" style="margin-left: 12px;" :loading="debugLoading === 'hr'" @click="debugScript('hr')">调试 HR 判断</a-button>
          <a-button style="margin-left: 12px;" @click="clearDebugOutput()">清空输出</a-button>
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
export default {
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
    return {
      columns,
      scripts: [],
      script: {},
      defaultScript: {
        enable: true,
        scriptType: 'scrape',
        siteHost: 'dstudio.me',
        freeScript: 'async function ({ document, console }) {\n  const freeEl = document.querySelector(\'.details-title font.free, .details-title font.twoupfree, #top font.free, #top font.twoupfree\');\n  console.log(\'free element:\', freeEl);\n  return !!freeEl || document.body.innerHTML.includes(\'全站 [Free] 生效中\');\n}',
        hrScript: 'async function ({ document, console }) {\n  const hrEl = document.querySelector(\'img.hitandrun, img[alt="H&R"], img[title="H&R"]\');\n  console.log(\'hr element:\', hrEl);\n  return !!hrEl;\n}'
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
    isMobile () {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    },
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
    onDebugSiteChange (siteName) {
      const site = this.siteList.filter(item => item.name === siteName)[0];
      if (site) {
        this.debug.cookie = site.cookie || '';
      }
    },
    formatDebugOutput (type, data) {
      const lines = [`[${type === 'free' ? '免费判断' : 'HR 判断'}] 调试完成`];
      if (data.logs && data.logs.length) {
        lines.push('');
        lines.push('--- console 输出 ---');
        for (const log of data.logs) {
          lines.push(`[${log.level}] ${log.message}`);
        }
      } else {
        lines.push('');
        lines.push('(无 console 输出)');
      }
      lines.push('');
      lines.push(`--- 脚本返回值 ---`);
      lines.push(String(data.result));
      return lines.join('\n');
    },
    async debugScript (type) {
      const scriptCode = type === 'free' ? this.script.freeScript : this.script.hrScript;
      if (!scriptCode || !scriptCode.trim()) {
        this.$message().warning(`${type === 'free' ? '免费判断' : 'HR 判断'}脚本为空`);
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
        const output = this.formatDebugOutput(type, res.data);
        this.debugOutput = this.debugOutput
          ? `${this.debugOutput}\n\n${output}`
          : output;
      } catch (e) {
        const output = `[${type === 'free' ? '免费判断' : 'HR 判断'}] 调试失败\n\n${e.message}`;
        this.debugOutput = this.debugOutput
          ? `${this.debugOutput}\n\n${output}`
          : output;
      }
      this.debugLoading = '';
    },
    clearDebugOutput () {
      this.debugOutput = '';
    },
    async modifyScript () {
      try {
        await this.$api().script.modify({ ...this.script, scriptType: 'scrape' });
        this.$message().success((this.script.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        setTimeout(() => this.listScript(), 1000);
        this.clearScript();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    modifyClick (row) {
      this.script = { ...row, scriptType: 'scrape' };
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
  max-width: 1440px;
  margin: 0 auto;
}
</style>
