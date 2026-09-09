<template>
  <div class="fn-page preset-guide">
    <div v-if="fromPath" class="preset-nav">
      <a-button @click="goBack">返回{{ fromTitle }}</a-button>
    </div>
    <p class="fn-guide-lead">
      先导入推荐套餐，或按类型勾选。任务和下载器默认关闭，地址、Cookie、账号以后再补。
    </p>

    <div class="preset-packs">
      <a-button type="primary" :loading="applying === 'recommended'" @click="applyPack('recommended')">一键导入推荐套餐</a-button>
      <a-button :loading="applying === 'all'" @click="confirmAll">导入全部预设</a-button>
    </div>

    <div v-if="result" class="preset-result">
      <div class="preset-result-top">
        <div>
          <strong>{{ result.message }}</strong>
          <div class="preset-result-chips">
            <span v-for="row in resultCounts" :key="row.kind">{{ row.title }} 新增 {{ row.created }}，复用 {{ row.reused }}</span>
          </div>
        </div>
        <a-button type="text" size="small" @click="clearResult">关闭</a-button>
      </div>
      <div class="preset-next">
        <a-button v-if="fromPath" size="small" type="primary" @click="goBack">返回{{ fromTitle }}</a-button>
        <a-button size="small" @click="$goto('/base/downloader', $router)">去下载器补账号</a-button>
        <a-button size="small" @click="$goto('/task/rss', $router)">去 RSS 任务</a-button>
        <a-button size="small" type="link" @click="resultDetail = !resultDetail">{{ resultDetail ? '收起明细' : '查看明细' }}</a-button>
      </div>
      <div v-if="resultDetail" class="preset-result-detail">
        <div v-for="row in resultCounts" :key="'d-' + row.kind">
          <div class="preset-family-title">{{ row.title }}</div>
          <p v-if="row.createdList.length"><span class="preset-muted">新增</span> {{ row.createdList.join('、') }}</p>
          <p v-if="row.reusedList.length"><span class="preset-muted">复用</span> {{ row.reusedList.join('、') }}</p>
        </div>
      </div>
    </div>

    <div class="preset-tabs">
      <a-radio-group v-model:value="activeKind" button-style="solid" size="small">
        <a-radio-button v-for="tab in kindTabs" :key="tab.kind" :value="tab.kind">
          {{ tab.title }} {{ tab.count }}
        </a-radio-button>
        <a-radio-button value="backup">备份导入</a-radio-button>
      </a-radio-group>
    </div>

    <template v-if="activeKind !== 'backup'">
      <div class="preset-toolbar">
        <a-input
          class="fn-search"
          v-model:value="keyword"
          allowClear
          placeholder="筛选别名"/>
        <a-radio-group v-model:value="scope" size="small">
          <a-radio-button value="fresh">未导入 {{ scopeCount('fresh') }}</a-radio-button>
          <a-radio-button value="recommended">推荐 {{ scopeCount('recommended') }}</a-radio-button>
          <a-radio-button value="all">全部 {{ scopeCount('all') }}</a-radio-button>
          <a-radio-button value="exists">已有 {{ scopeCount('exists') }}</a-radio-button>
        </a-radio-group>
      </div>

      <div v-if="familyChips.length > 1" class="preset-families">
        <button
          v-for="chip in familyChips"
          :key="chip.name"
          type="button"
          class="preset-chip"
          :class="{ on: family === chip.name }"
          @click="family = chip.name">
          {{ chip.name }} {{ chip.count }}
        </button>
      </div>

      <div class="preset-list-bar">
        <span class="preset-muted">{{ filteredItems.length }} 条</span>
        <a-space>
          <a-button size="small" :disabled="!canSelectVisible" @click="selectVisible">全选可见</a-button>
          <a-button size="small" :disabled="!picked.length" @click="clearPicked">清空已选</a-button>
        </a-space>
      </div>

      <div v-if="!filteredItems.length" class="preset-empty">
        {{ emptyText }}
      </div>

      <div v-else-if="isBundleKind" class="preset-bundles">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="preset-bundle"
          :class="{ picked: isPicked(item.id), exists: item.exists }">
          <div class="preset-bundle-head">
            <a-checkbox :checked="isPicked(item.id)" :disabled="item.exists" @change="toggleItem(item)">
              <span class="preset-alias">{{ item.alias }}</span>
            </a-checkbox>
            <div class="preset-bundle-meta">
              <a-tag v-if="item.exists" color="blue">已有</a-tag>
              <a-tag v-if="isRecommended(item.id)">推荐</a-tag>
              <button
                v-if="item.rules && item.rules.length"
                type="button"
                class="preset-rule-toggle"
                @click="toggleRules(item.id)">
                {{ ruleSummary(item) }}
              </button>
            </div>
          </div>
          <div v-if="isHumanHint(item.hint)" class="preset-hint">{{ item.hint }}</div>
          <div v-if="openRules[item.id] && item.rules && item.rules.length" class="preset-rule-box">
            <div v-for="group in groupedRules(item)" :key="group.name" class="preset-rule-family">
              <div class="preset-family-title">
                <span>{{ group.name }} {{ group.rules.length }}</span>
                <button type="button" class="preset-link" @click="toggleFamilyRules(item, group)">本组全选 / 清空</button>
              </div>
              <div class="preset-rule-grid">
                <a-checkbox
                  v-for="rule in group.rules"
                  :key="rule.id"
                  :checked="isRulePicked(item.id, rule.id)"
                  @change="toggleRule(item, rule.id)">
                  {{ rule.alias }}
                </a-checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="preset-grid">
        <label
          v-for="item in filteredItems"
          :key="item.id"
          class="preset-tile"
          :class="{ picked: isPicked(item.id), exists: item.exists }">
          <a-checkbox :checked="isPicked(item.id)" :disabled="item.exists" @change="toggleItem(item)">
            {{ item.alias }}
          </a-checkbox>
          <span class="preset-tile-tags">
            <a-tag v-if="item.exists" color="blue">已有</a-tag>
            <a-tag v-if="isRecommended(item.id)">推荐</a-tag>
          </span>
        </label>
      </div>
    </template>

    <div v-else class="preset-backup">
      <p class="fn-guide-lead">上传 Vertex 备份或规则 zip，按类型勾选后再导入。地址和密钥会清空。</p>
      <a-upload
        :capture="null"
        :showUploadList="true"
        :maxCount="1"
        action="/api/preset/previewImport"
        name="file"
        @change="onPreview">
        <a-button>选择备份 / zip</a-button>
      </a-upload>
      <div v-if="importGroups" class="preset-backup-body">
        <div v-for="kind in backupKinds" :key="kind" class="preset-backup-group">
          <div class="preset-family-title">
            <span>{{ kindTitle(kind) }} {{ (importGroups[kind] || []).length }}</span>
            <button type="button" class="preset-link" @click="toggleBackupKind(kind)">本组全选 / 清空</button>
          </div>
          <div class="preset-rule-grid">
            <a-checkbox
              v-for="row in importGroups[kind]"
              :key="row.source"
              :checked="importPicked.indexOf(row.source) !== -1"
              @change="toggleImport(row.source)">
              {{ row.alias }}
              <span v-if="row.hint" class="preset-muted"> {{ row.hint }}</span>
            </a-checkbox>
          </div>
        </div>
        <a-button type="primary" :disabled="!importPicked.length" :loading="importing" @click="doImport">
          导入勾选 {{ importPicked.length || '' }}
        </a-button>
      </div>
    </div>

    <div v-if="picked.length && activeKind !== 'backup'" class="preset-sticky">
      <span>已选 {{ picked.length }} 条，已有条目不会重复添加</span>
      <a-button type="primary" :loading="applying === 'pick'" @click="applyPicked">添加已选</a-button>
    </div>
  </div>
</template>
<script>
import { Modal } from 'ant-design-vue';

const KIND_ORDER = ['client', 'delete', 'rss', 'select', 'task'];
const KIND_TITLE = {
  delete: '删种规则',
  rss: 'RSS 规则',
  select: '选种规则',
  task: 'RSS 任务',
  client: '下载器'
};
const FROM_TITLE = {
  '/rule/rss': 'RSS 规则',
  '/rule/select': '选种规则',
  '/rule/delete': '删种规则',
  '/task/rss': 'RSS 任务',
  '/base/downloader': '下载器',
  '/guide/rss': 'RSS 引导',
  '/index': '首页'
};
const DSL = /\b(smaller|bigger|equals|contain|notContain|notIncludeIn|progress|freeSpace|uploadSpeed)\b/;

function itemFamily (item) {
  const s = String(item.alias || '');
  if (item.kind === 'task') {
    if (/需\s*vip|需\s*v\b|有vip/i.test(s)) return '需 VIP';
    if (s.indexOf('需备案') !== -1) return '需备案';
    return '普通站点';
  }
  if (item.kind === 'rss' || item.kind === 'select') {
    if (s.indexOf('拒绝') !== -1 || /TTG|红叶|猪猪/.test(s)) return '站点拒绝';
    if (/[0-9]+\s*[gG]|小于|大于|>|</.test(s)) return '体积';
    return '其他';
  }
  if (s.indexOf('拒绝删种') !== -1) return '拒绝删种';
  if (s.indexOf('拆包') !== -1) return '拆包';
  if (s.indexOf('甲骨文') !== -1) return '甲骨文';
  if (s.indexOf('不可说') !== -1) return '不可说';
  if (s.indexOf('北洋') !== -1) return '北洋';
  if (s.indexOf('天空') !== -1) return '天空';
  if (s.indexOf('NC-') === 0 || s.indexOf('NC－') === 0) return 'NC';
  if (s.charAt(0) === 'A') return 'A 系列';
  return '其他';
}

export default {
  data () {
    return {
      keyword: '',
      groups: [],
      items: [],
      packs: { recommended: [], all: [] },
      picked: [],
      rulePicked: {},
      openRules: {},
      activeKind: 'client',
      scope: 'fresh',
      family: '全部',
      applying: '',
      importGroups: null,
      importFile: null,
      importPicked: [],
      importing: false,
      result: null,
      resultDetail: false
    };
  },
  computed: {
    recommendedSet () {
      return this.packs.recommended || [];
    },
    kindTabs () {
      return KIND_ORDER.map((kind) => ({
        kind,
        title: KIND_TITLE[kind],
        count: this.items.filter(item => item.kind === kind).length
      }));
    },
    isBundleKind () {
      return this.activeKind === 'client' || this.activeKind === 'task';
    },
    scopedItems () {
      return this.items.filter((item) => {
        if (item.kind !== this.activeKind) return false;
        return this.matchScope(item, this.scope);
      });
    },
    familyChips () {
      if (this.isBundleKind || this.scopedItems.length <= 8) return [];
      const map = {};
      this.scopedItems.forEach((item) => {
        const name = itemFamily(item);
        map[name] = (map[name] || 0) + 1;
      });
      const chips = Object.keys(map).map(name => ({ name, count: map[name] }));
      if (chips.length <= 1) return [];
      return [{ name: '全部', count: this.scopedItems.length }].concat(chips);
    },
    filteredItems () {
      const q = (this.keyword || '').trim().toLowerCase();
      return this.scopedItems.filter((item) => {
        if (this.family !== '全部' && itemFamily(item) !== this.family) return false;
        if (!q) return true;
        const blob = [item.alias, item.hint].concat((item.rules || []).map(rule => rule.alias)).join(' ').toLowerCase();
        return blob.indexOf(q) !== -1;
      });
    },
    canSelectVisible () {
      return this.filteredItems.some(item => !item.exists && !this.isPicked(item.id));
    },
    emptyText () {
      if (this.keyword) return '没有匹配的条目，试试清空筛选。';
      if (this.scope === 'fresh') return '这一类都已导入。可切换到「已有」查看，或换一个类型。';
      if (this.scope === 'exists') return '还没有导入过这类条目。';
      if (this.scope === 'recommended') return '推荐套餐里没有这类条目。';
      return '没有可显示的条目。';
    },
    resultCounts () {
      if (!this.result) return [];
      return KIND_ORDER.map((kind) => {
        const createdList = (this.result.created || []).filter(row => row.kind === kind).map(row => row.alias);
        const reusedList = (this.result.reused || []).filter(row => row.kind === kind).map(row => row.alias);
        return {
          kind,
          title: KIND_TITLE[kind],
          created: createdList.length,
          reused: reusedList.length,
          createdList,
          reusedList
        };
      }).filter(row => row.created || row.reused);
    },
    backupKinds () {
      return KIND_ORDER.filter(kind => this.importGroups && (this.importGroups[kind] || []).length);
    },
    fromPath () {
      const from = this.$route.query.from;
      return typeof from === 'string' && from.charAt(0) === '/' ? from : '';
    },
    fromTitle () {
      return FROM_TITLE[this.fromPath] || '上一页';
    }
  },
  watch: {
    activeKind () {
      this.family = '全部';
      this.preferScope();
    },
    scope () {
      this.family = '全部';
    },
    '$route.query.kind' () {
      this.applyKindQuery();
    }
  },
  methods: {
    kindTitle (kind) {
      return KIND_TITLE[kind] || kind;
    },
    applyKindQuery () {
      const kind = this.$route.query.kind;
      if (KIND_ORDER.indexOf(kind) !== -1) this.activeKind = kind;
    },
    goBack () {
      if (this.fromPath) this.$goto(this.fromPath, this.$router);
      else this.$router.back();
    },
    isRecommended (id) {
      return this.recommendedSet.indexOf(id) !== -1;
    },
    isHumanHint (hint) {
      const text = String(hint || '').trim();
      return !!text && !DSL.test(text);
    },
    matchScope (item, scope) {
      if (scope === 'fresh') return !item.exists;
      if (scope === 'exists') return !!item.exists;
      if (scope === 'recommended') return this.isRecommended(item.id);
      return true;
    },
    scopeCount (scope) {
      return this.items.filter(item => item.kind === this.activeKind && this.matchScope(item, scope)).length;
    },
    isPicked (id) {
      return this.picked.indexOf(id) !== -1;
    },
    isRulePicked (itemId, ruleId) {
      const list = this.rulePicked[itemId];
      if (!list) return true;
      return list.indexOf(ruleId) !== -1;
    },
    ruleSummary (item) {
      const total = (item.rules || []).length;
      const picked = (this.rulePicked[item.id] || item.ruleIds || []).length;
      const open = this.openRules[item.id];
      return (open ? '收起规则 · ' : '展开规则 · ') + picked + '/' + total;
    },
    groupedRules (item) {
      const map = {};
      (item.rules || []).forEach((rule) => {
        const name = itemFamily({ kind: rule.kind || 'delete', alias: rule.alias });
        if (!map[name]) map[name] = [];
        map[name].push(rule);
      });
      return Object.keys(map).map(name => ({ name, rules: map[name] }));
    },
    toggleItem (item) {
      if (item.exists) return;
      const i = this.picked.indexOf(item.id);
      if (i === -1) {
        this.picked = this.picked.concat(item.id);
        if (!this.rulePicked[item.id] && item.ruleIds) {
          this.rulePicked = { ...this.rulePicked, [item.id]: item.ruleIds.slice() };
        }
      } else {
        this.picked = this.picked.filter(id => id !== item.id);
      }
    },
    toggleRule (item, ruleId) {
      const current = (this.rulePicked[item.id] || item.ruleIds || []).slice();
      const i = current.indexOf(ruleId);
      if (i === -1) current.push(ruleId);
      else current.splice(i, 1);
      this.rulePicked = { ...this.rulePicked, [item.id]: current };
      if (!this.isPicked(item.id) && current.length) this.toggleItem(item);
    },
    toggleFamilyRules (item, group) {
      const current = (this.rulePicked[item.id] || item.ruleIds || []).slice();
      const ids = group.rules.map(rule => rule.id);
      const allOn = ids.every(id => current.indexOf(id) !== -1);
      const next = current.filter(id => ids.indexOf(id) === -1);
      if (!allOn) ids.forEach(id => next.push(id));
      this.rulePicked = { ...this.rulePicked, [item.id]: next };
      if (!this.isPicked(item.id) && next.length) this.toggleItem(item);
    },
    toggleRules (id) {
      this.openRules = { ...this.openRules, [id]: !this.openRules[id] };
    },
    selectVisible () {
      const extra = this.filteredItems.filter(item => !item.exists && !this.isPicked(item.id)).map(item => item.id);
      extra.forEach((id) => {
        const item = this.items.filter(row => row.id === id)[0];
        if (item && item.ruleIds && !this.rulePicked[id]) {
          this.rulePicked = { ...this.rulePicked, [id]: item.ruleIds.slice() };
        }
      });
      this.picked = this.picked.concat(extra);
    },
    clearPicked () {
      this.picked = [];
    },
    clearResult () {
      this.result = null;
      this.resultDetail = false;
    },
    preferScope () {
      if (this.activeKind === 'backup') return;
      const fresh = this.items.some(item => item.kind === this.activeKind && !item.exists);
      if (this.scope === 'fresh' && !fresh) this.scope = 'all';
    },
    async load () {
      const res = await this.$api().preset.catalog();
      this.groups = res.data.groups || [];
      this.items = res.data.items || [];
      this.packs = res.data.packs || { recommended: [], all: [] };
      this.preferScope();
    },
    confirmAll () {
      Modal.confirm({
        title: '导入全部预设？',
        content: '会写入目录里的全部条目。同名已有项会复用，不会重复添加。任务和下载器保持关闭。',
        okText: '导入全部',
        cancelText: '取消',
        onOk: () => this.applyPack('all')
      });
    },
    async applyPack (pack) {
      this.applying = pack;
      try {
        const res = await this.$api().preset.apply({ pack });
        this.showResult(res);
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.applying = '';
      }
    },
    async applyPicked () {
      this.applying = 'pick';
      try {
        const items = this.picked.map((id) => {
          const item = this.items.filter(row => row.id === id)[0] || {};
          return {
            id,
            ruleIds: this.rulePicked[id] || item.ruleIds || []
          };
        });
        const res = await this.$api().preset.apply({ items });
        this.picked = [];
        this.showResult(res);
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.applying = '';
      }
    },
    showResult (res) {
      this.result = res.data;
      this.resultDetail = false;
      this.$message().success(res.message);
    },
    onPreview ({ file }) {
      if (file.status === 'done' && file.response && file.response.success) {
        this.importGroups = file.response.data;
        this.importFile = file.originFileObj;
        const rows = [];
        KIND_ORDER.forEach((kind) => {
          (this.importGroups[kind] || []).forEach((row) => rows.push(row.source));
        });
        this.importPicked = rows;
      }
      if (file.status === 'error') {
        this.$message().error((file.response && file.response.message) || '预览失败');
      }
    },
    toggleImport (source) {
      const i = this.importPicked.indexOf(source);
      if (i === -1) this.importPicked = this.importPicked.concat(source);
      else this.importPicked = this.importPicked.filter(s => s !== source);
    },
    toggleBackupKind (kind) {
      const sources = (this.importGroups[kind] || []).map(row => row.source);
      const allOn = sources.every(source => this.importPicked.indexOf(source) !== -1);
      if (allOn) this.importPicked = this.importPicked.filter(source => sources.indexOf(source) === -1);
      else this.importPicked = this.importPicked.concat(sources.filter(source => this.importPicked.indexOf(source) === -1));
    },
    async doImport () {
      if (!this.importFile) return;
      this.importing = true;
      try {
        const form = new FormData();
        form.append('file', this.importFile);
        form.append('sources', JSON.stringify(this.importPicked));
        const res = await this.$api().preset.importSelected(form);
        this.showResult(res);
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.importing = false;
      }
    }
  },
  async mounted () {
    this.applyKindQuery();
    try {
      await this.load();
    } catch (e) {
      this.$message().error(e.message);
    }
  }
};
</script>
<style scoped>
.preset-nav {
  margin-bottom: 12px;
}
.preset-packs,
.preset-tabs,
.preset-toolbar,
.preset-list-bar,
.preset-next {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  margin-bottom: 12px;
}
.preset-list-bar {
  justify-content: space-between;
  margin-bottom: 8px;
}
.preset-families {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}
.preset-chip,
.preset-rule-toggle,
.preset-link {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-2);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}
.preset-chip.on,
.preset-bundle.picked,
.preset-tile.picked {
  background: var(--blue-soft);
  border-color: var(--blue);
  color: var(--text);
}
.preset-link {
  border: 0;
  background: none;
  padding: 0;
  color: var(--blue);
}
.preset-muted {
  color: var(--text-3);
  font-size: 13px;
}
.preset-empty {
  padding: 32px 12px;
  text-align: center;
  color: var(--text-3);
}
.preset-bundles,
.preset-grid {
  display: grid;
  gap: 10px;
}
.preset-grid {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.preset-bundle,
.preset-tile,
.preset-result,
.preset-backup-group {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 12px 14px;
}
.preset-tile {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
}
.preset-tile.exists,
.preset-bundle.exists {
  opacity: 0.72;
}
.preset-bundle-head,
.preset-result-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.preset-bundle-meta,
.preset-tile-tags,
.preset-result-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.preset-alias {
  font-weight: 600;
}
.preset-hint,
.preset-result-chips,
.preset-result-detail {
  margin-top: 8px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}
.preset-rule-box {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.preset-rule-family + .preset-rule-family {
  margin-top: 10px;
}
.preset-family-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  color: var(--text-2);
  font-size: 13px;
}
.preset-rule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px 12px;
}
.preset-backup-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.preset-sticky {
  position: sticky;
  bottom: 8px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 10px 14px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
@media (max-width: 960px) {
  .preset-grid,
  .preset-rule-grid {
    grid-template-columns: 1fr;
  }
  .preset-bundle-head,
  .preset-result-top,
  .preset-sticky {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
