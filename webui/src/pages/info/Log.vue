<template>
  <div class="log-page">
    <div class="log-head">
      <span class="log-title">日志</span>
    </div>
    <div class="log-toolbar">
      <span class="log-label">日志等级</span>
      <a-select v-model:value="type" style="width: 200px;" @change="getLog">
        <a-select-option value="info">信息</a-select-option>
        <a-select-option value="binge">豆瓣</a-select-option>
        <a-select-option value="binge-debug">豆瓣调试</a-select-option>
        <a-select-option value="advanced">超级模式</a-select-option>
        <a-select-option value="advanced-debug">超级模式调试</a-select-option>
        <a-select-option value="watch">监控分类</a-select-option>
        <a-select-option value="watch-debug">监控分类调试</a-select-option>
        <a-select-option value="sc">定时脚本</a-select-option>
        <a-select-option value="sc-debug">定时脚本调试</a-select-option>
        <a-select-option value="error">错误</a-select-option>
        <a-select-option value="debug">调试</a-select-option>
        <a-select-option value="access">跟踪</a-select-option>
      </a-select>
      <a-button type="primary" @click="getLog">查询</a-button>
    </div>
    <div class="log-label-row">
      <span>日志</span>
      <a-tooltip placement="right" overlay-class-name="fn-log-tip">
        <template #title>
          <div class="tip-body">
            <p>截图日志务必带上版本：{{ version.head }} / {{ version.updateTime }}，并注意上方的日志等级以及日志时间。</p>
            <p>注意报错的 message / code / status 附近的内容。</p>
            <p>偶尔报错请直接忽略，周期性报错需要注意。</p>
          </div>
        </template>
        <button type="button" class="log-help" aria-label="日志说明">?</button>
      </a-tooltip>
    </div>
    <a-textarea class="log-box" v-model:value="log" :auto-size="false"/>
  </div>
</template>
<script>
export default {
  data () {
    return {
      type: 'error',
      log: '',
      version: {}
    };
  },
  methods: {
    async getLog () {
      try {
        const res = await this.$api().log.get(this.type);
        this.log = res.data;
        this.log = res ? '[202' + res.data.split('[202').reverse().join('[202') : '';
        this.log = this.log.replace(new RegExp(`\\[${this.$moment().format('YYYY')}-`, 'g'), '[').replace(/\[[^\d]*? console\] \d*/g, '').replace(/\[202/g, '');
      } catch (e) {
        await this.$message().error(e.message);
      }
    }
  },
  async mounted () {
    this.version = process.env.version;
    this.getLog();
  }
};
</script>
<style scoped>
.log-page {
  display: flex;
  flex-direction: column;
  height: calc(var(--vh, 1vh) * 100 - 88px);
  min-height: 480px;
}
.log-head {
  margin-bottom: 12px;
}
.log-title {
  font-size: 22px;
  font-weight: 650;
}
.log-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.log-label {
  color: var(--text-2);
}
.log-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--text-2);
  font-weight: 600;
}
.log-help {
  width: 20px;
  height: 20px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--panel);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  cursor: help;
  padding: 0;
}
.log-help:hover {
  color: #00a0e9;
  border-color: #00a0e9;
}
.log-box {
  flex: 1;
  min-height: 420px !important;
  height: 100% !important;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.55;
}
.tip-body p {
  margin: 0 0 8px;
}
.tip-body p:last-child {
  margin: 0;
}
</style>
