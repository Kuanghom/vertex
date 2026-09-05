<template>
  <div class="fn-log">
    <div class="fn-log-bar">
      <div class="fn-log-tools">
        <slot name="tools" />
      </div>
      <a-select
        v-if="showLevel"
        :value="level"
        class="fn-log-level"
        @change="onLevel"
      >
        <a-select-option v-for="opt of levelOptions" :key="opt.value || 'all'" :value="opt.value">
          {{ opt.label }}
        </a-select-option>
      </a-select>
      <a-input
        v-model:value="query"
        class="fn-log-search"
        allowClear
        placeholder="搜索日志内容"
      >
        <template #prefix>
          <fa :icon="['fas', 'search']"/>
        </template>
      </a-input>
      <slot name="actions" />
      <button
        v-if="canLive"
        type="button"
        class="fn-log-live"
        :class="{ 'is-on': live, 'is-off': !live }"
        :disabled="liveDisabled"
        :title="live ? '暂停实时刷新' : '继续实时刷新'"
        @click="$emit('update:live', !live)"
      >
        <i class="fn-log-live-dot"/>
        {{ live ? '暂停' : '继续' }}
      </button>
    </div>
    <div ref="scroller" class="fn-log-body" @scroll="onScroll">
      <div v-if="loading && !entries.length" class="fn-log-empty">正在读取日志…</div>
      <div v-else-if="!entries.length" class="fn-log-empty">{{ emptyHint }}</div>
      <div v-else-if="!visibleGroups.length" class="fn-log-empty">没有匹配的日志</div>
      <div v-else class="fn-log-list">
        <div v-for="group of visibleGroups" :key="group.key" class="fn-log-group">
          <div class="fn-log-gutter">
            <span class="fn-log-date">{{ formatDate(group.ts) }}</span>
            <span class="fn-log-clock">{{ formatClock(group.ts) }}</span>
          </div>
          <div class="fn-log-block">
            <div
              v-for="row of group.items"
              :key="row.id"
              class="fn-log-row"
              :class="'is-' + row.level"
              :title="row.message"
            >
              <span class="fn-log-pill">{{ pill(row.level) }}</span>
              <span class="fn-log-time">{{ formatTime(row.ts) }}</span>
              <span v-if="row.source" class="fn-log-src">{{ row.source }}</span>
              <span class="fn-log-msg">{{ row.message }}</span>
              <details v-if="row.stack" class="fn-log-stack">
                <summary>堆栈</summary>
                <pre>{{ row.stack }}</pre>
              </details>
            </div>
          </div>
        </div>
        <button
          v-if="hasMore"
          type="button"
          class="fn-log-more"
          @click="loadMore"
        >加载更早的日志</button>
      </div>
    </div>
    <button
      v-if="away"
      type="button"
      class="fn-log-latest"
      @click="toLatest"
    >
      {{ unseen > 0 ? `查看最新 (${unseen})` : '查看最新' }}
    </button>
  </div>
</template>

<script>
import { LEVEL_OPTIONS, countNewHead, filterLogEntries, groupLogEntries, levelMeta } from '../util/logFeed';

const PAGE = 80;

export default {
  name: 'FnLogFeed',
  props: {
    entries: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    emptyHint: { type: String, default: '暂无日志' },
    showLevel: { type: Boolean, default: true },
    levelOptions: { type: Array, default: () => LEVEL_OPTIONS },
    live: { type: Boolean, default: true },
    canLive: { type: Boolean, default: true },
    liveDisabled: { type: Boolean, default: false }
  },
  emits: ['update:live'],
  data () {
    return {
      query: '',
      level: '',
      limit: PAGE,
      away: false,
      unseen: 0
    };
  },
  computed: {
    filtered () {
      return filterLogEntries(this.entries, { level: this.level, query: this.query });
    },
    sliced () {
      return this.filtered.slice(0, this.limit);
    },
    hasMore () {
      return this.filtered.length > this.sliced.length;
    },
    visibleGroups () {
      return groupLogEntries(this.sliced);
    }
  },
  watch: {
    query () {
      this.limit = PAGE;
      this.toLatest();
    },
    level () {
      this.limit = PAGE;
      this.toLatest();
    },
    entries (next, prev) {
      if (this.away) {
        this.unseen += countNewHead(prev, next);
        return;
      }
      this.unseen = 0;
      this.$nextTick(this.toLatest);
    }
  },
  methods: {
    pill (level) {
      return levelMeta(level).label;
    },
    formatDate (ts) {
      if (!ts) return '';
      return this.$moment(ts).format('YYYY/MM/DD');
    },
    formatClock (ts) {
      if (!ts) return '';
      return this.$moment(ts).format('HH:mm');
    },
    formatTime (ts) {
      if (!ts) return '--:--:--';
      return this.$moment(ts).format('HH:mm:ss');
    },
    onLevel (value) {
      this.level = value;
    },
    loadMore () {
      this.limit += PAGE;
    },
    onScroll () {
      const el = this.$refs.scroller;
      if (!el) return;
      this.away = el.scrollTop > 80;
    },
    toLatest () {
      const el = this.$refs.scroller;
      if (el) el.scrollTop = 0;
      this.away = false;
      this.unseen = 0;
    }
  }
};
</script>

<style scoped>
.fn-log {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.fn-log-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.fn-log-bar :deep(.ant-select),
.fn-log-bar :deep(.ant-input-affix-wrapper),
.fn-log-bar :deep(.ant-btn) {
  height: 32px;
}
.fn-log-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.fn-log-level {
  width: 132px;
}
.fn-log-search {
  flex: 1 1 200px;
  width: auto;
  min-width: 160px;
  max-width: 360px;
}
.fn-log-search :deep(.anticon),
.fn-log-search :deep(svg) {
  color: var(--text-3);
}
.fn-log-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--ok-soft);
  color: var(--ok);
  cursor: pointer;
  font-size: 13px;
  font-weight: 650;
}
.fn-log-live.is-off {
  background: var(--hover);
  color: var(--text-2);
}
.fn-log-live:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.fn-log-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.fn-log-live.is-on .fn-log-live-dot {
  animation: fn-log-pulse 1.4s ease-out infinite;
}
@keyframes fn-log-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.35; transform: scale(0.7); }
}
@media (prefers-reduced-motion: reduce) {
  .fn-log-live.is-on .fn-log-live-dot { animation: none; }
}
.fn-log-body {
  position: relative;
  flex: 1;
  min-height: 360px;
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
}
.fn-log-empty {
  display: grid;
  place-items: center;
  min-height: 280px;
  color: var(--text-3);
  font-size: 14px;
}
.fn-log-list {
  padding: 8px 0 20px;
}
.fn-log-group {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: stretch;
}
.fn-log-gutter {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 2px;
  padding: 12px 14px 12px 12px;
  color: var(--blue);
  font-variant-numeric: tabular-nums;
  border-right: 1px solid var(--line);
}
.fn-log-date {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
}
.fn-log-clock {
  font-size: 12px;
  color: var(--text-3);
}
.fn-log-block {
  min-width: 0;
  padding: 8px 16px 10px 14px;
}
.fn-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  padding: 5px 0;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.55;
}
.fn-log-row.is-error .fn-log-msg {
  color: var(--bad);
}
.fn-log-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: var(--text-3);
}
.fn-log-row.is-info .fn-log-pill {
  background: var(--ok-soft);
  color: var(--ok);
}
.fn-log-row.is-warn .fn-log-pill {
  background: var(--warn-soft);
  color: var(--warn);
}
.fn-log-row.is-error .fn-log-pill {
  background: var(--bad-soft);
  color: var(--bad);
}
.fn-log-row.is-debug .fn-log-pill {
  background: var(--hover);
  color: var(--text-3);
}
.fn-log-time {
  flex: 0 0 auto;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}
.fn-log-src {
  flex: 0 0 auto;
  color: var(--text-2);
  font-weight: 650;
}
.fn-log-src::after {
  content: "–";
  margin-left: 8px;
  color: var(--text-3);
  font-weight: 400;
}
.fn-log-msg {
  flex: 1 1 200px;
  min-width: 0;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
}
.fn-log-stack {
  flex: 0 0 auto;
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
}
.fn-log-stack summary {
  cursor: pointer;
  color: var(--text-2);
  width: fit-content;
}
.fn-log-stack pre {
  margin: 6px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--hover);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.45;
}
.fn-log-more,
.fn-log-latest {
  border: 0;
  cursor: pointer;
  font-size: 13px;
}
.fn-log-more {
  display: block;
  width: calc(100% - 32px);
  margin: 8px 16px 0;
  height: 36px;
  border-radius: 8px;
  background: var(--hover);
  color: var(--text-2);
}
.fn-log-more:hover {
  color: var(--blue);
  background: var(--blue-soft);
}
.fn-log-latest {
  position: absolute;
  right: 20px;
  bottom: 20px;
  height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  background: var(--blue);
  color: #fff;
  box-shadow: 0 8px 20px rgba(0, 112, 168, 0.22);
}
.fn-log-latest:hover {
  background: var(--blue-deep);
}
@media (max-width: 960px) {
  .fn-log-search,
  .fn-log-level {
    width: 100%;
  }
  .fn-log-group {
    grid-template-columns: 1fr;
  }
  .fn-log-gutter {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
    padding: 10px 14px 0;
    border-right: 0;
  }
}
</style>
