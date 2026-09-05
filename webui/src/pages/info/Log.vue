<template>
  <div class="log-page">
    <div class="fn-log-head">
      <fa class="fn-log-head-ico" :icon="['fas', 'file-lines']"/>
      <h1>日志</h1>
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
    <fn-log-feed
      v-model:live="live"
      :entries="entries"
      :loading="loading"
      empty-hint="暂无日志"
    >
      <template #tools>
        <a-select v-model:value="type" class="fn-log-cat" @change="() => refreshLog(false)">
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
      </template>
      <template #actions>
        <a-button type="primary" @click="refreshLog(false)">查询</a-button>
      </template>
    </fn-log-feed>
  </div>
</template>
<script>
import { parseVertexLog } from '../../util/logFeed';
import logLive from '../../mixins/logLive';

export default {
  mixins: [logLive],
  data () {
    return {
      type: 'error',
      raw: '',
      version: {},
      loading: false
    };
  },
  computed: {
    entries () {
      return parseVertexLog(this.raw);
    }
  },
  methods: {
    async refreshLog (silent) {
      if (!silent || !this.raw) this.loading = true;
      try {
        const res = await this.$api().log.get(this.type);
        this.raw = res && res.data ? res.data : '';
      } catch (e) {
        if (!silent) await this.$message().error(e.message);
      } finally {
        this.loading = false;
      }
    }
  },
  async mounted () {
    this.version = process.env.version;
    this.refreshLog(false);
  }
};
</script>
<style scoped>
.log-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(var(--vh, 1vh) * 100 - 120px);
}
.fn-log-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.fn-log-head-ico {
  color: var(--blue);
  font-size: 16px;
}
.fn-log-head h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.fn-log-cat {
  width: 180px;
  max-width: 100%;
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
  color: var(--blue);
  border-color: var(--blue);
}
.tip-body p {
  margin: 0 0 8px;
}
.tip-body p:last-child {
  margin: 0;
}
@media (max-width: 960px) {
  .fn-log-cat {
    width: 100%;
  }
}
</style>
