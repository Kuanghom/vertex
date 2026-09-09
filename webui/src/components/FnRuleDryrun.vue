<template>
  <span>
    <a-button :type="link ? 'link' : 'default'" :disabled="disabled" @click="open = true">试运行</a-button>
    <a-modal
      v-model:visible="open"
      title="规则试运行"
      :width="isNarrow ? '100%' : 720"
      :wrap-class-name="isNarrow ? 'fn-dialog-full' : ''"
      :footer="null"
    >
      <p class="fn-dryrun-lead">{{ lead }}</p>
      <div class="fn-dryrun-bar">
        <a-input v-model:value="rssUrl" placeholder="粘贴一条 RSS 地址" allow-clear/>
        <a-select v-if="kind === 'rss'" v-model:value="mode" style="width: 108px">
          <a-select-option value="accept">当选择规则</a-select-option>
          <a-select-option value="reject">当拒绝规则</a-select-option>
        </a-select>
        <a-button type="primary" :loading="loading" :disabled="!canRun" @click="run">试运行</a-button>
      </div>
      <div v-if="note" class="fn-dryrun-note">{{ note }}</div>
      <div v-if="rows.length" class="fn-dryrun-list">
        <div v-for="(row, index) in rows" :key="index" class="fn-dryrun-row">
          <div class="fn-dryrun-name">{{ row.name }}</div>
          <div class="fn-dryrun-meta">{{ formatSize(row.size) }} · {{ row.status }}</div>
        </div>
      </div>
      <div v-else-if="done" class="fn-dryrun-empty">没有匹配到种子</div>
    </a-modal>
  </span>
</template>
<script>
export default {
  name: 'FnRuleDryrun',
  props: {
    kind: {
      type: String,
      default: 'rss'
    },
    rule: {
      type: Object,
      default: () => ({})
    },
    link: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      open: false,
      rssUrl: '',
      mode: 'accept',
      loading: false,
      done: false,
      rows: [],
      note: ''
    };
  },
  computed: {
    canRun () {
      return /^https?:\/\//i.test(String(this.rssUrl || '').trim());
    },
    lead () {
      if (this.kind === 'select') return '用 RSS 测标题、体积、简介。站点、做种数这些 RSS 里没有，会跳过。';
      return '用一条 RSS 看这条规则会选中还是拒绝。';
    }
  },
  watch: {
    open (val) {
      if (val) {
        this.rows = [];
        this.done = false;
        this.note = '';
      }
    }
  },
  methods: {
    formatSize (size) {
      return this.$formatSize ? this.$formatSize(size) : size;
    },
    async run () {
      const url = String(this.rssUrl || '').trim();
      if (!/^https?:\/\//i.test(url)) return;
      this.loading = true;
      this.done = false;
      try {
        const res = await this.$api().rss.dryrunRule({
          kind: this.kind,
          mode: this.mode,
          rssUrls: [url],
          rule: {
            alias: this.rule.alias,
            type: this.rule.type || 'normal',
            conditions: this.rule.conditions || [],
            code: this.rule.code
          }
        });
        this.rows = res.data || [];
        this.done = true;
        this.note = this.rows.length ? ('共 ' + this.rows.length + ' 条') : '';
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
<style scoped>
.fn-dryrun-lead,
.fn-dryrun-note,
.fn-dryrun-empty {
  margin: 0 0 12px;
  color: var(--text-2);
  font-size: 13px;
}
.fn-dryrun-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.fn-dryrun-list {
  max-height: 48vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.fn-dryrun-row {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.fn-dryrun-name {
  font-weight: 600;
  word-break: break-all;
}
.fn-dryrun-meta {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 12px;
}
</style>
