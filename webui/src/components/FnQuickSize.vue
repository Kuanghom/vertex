<template>
  <span>
    <a-button @click="open = true">快速增加</a-button>
    <a-modal
      v-model:visible="open"
      title="快速增加规则"
      :width="isNarrow ? '100%' : 560"
      :wrap-class-name="(isNarrow ? 'fn-dialog-full ' : '') + 'fn-quick-size'"
      :footer="null"
    >
      <p class="quick-size-lead">先选一类，再点芯片。体积自定义要先点「自定义」。已有的不会重复添加。</p>
      <div class="quick-size-tabs">
        <button type="button" class="quick-size-chip" :class="{ on: tab === 'size' }" @click="tab = 'size'">体积</button>
        <button type="button" class="quick-size-chip" :class="{ on: tab === 'title' }" @click="setTab('title')">标题</button>
        <button type="button" class="quick-size-chip" :class="{ on: tab === 'site' }" @click="setTab('site')">站点</button>
        <button type="button" class="quick-size-chip" :class="{ on: tab === 'extra' }" @click="setTab('extra')">免费 / HR</button>
      </div>
      <div class="quick-size-chips">
        <button
          v-for="item of options"
          :key="item.alias"
          type="button"
          class="quick-size-chip"
          :class="{ on: isPicked(item.alias), exists: item.exists }"
          :disabled="item.exists"
          @click="toggle(item)"
        >
          {{ item.alias }}<span v-if="item.exists"> · 已有</span>
        </button>
        <button
          v-if="tab === 'size' || tab === 'title'"
          type="button"
          class="quick-size-chip"
          :class="{ on: useCustom }"
          @click="toggleCustom"
        >
          自定义
        </button>
        <p v-if="tab === 'site' && !options.length" class="quick-size-empty">还没有站点，先去基础组件 → 站点里加上。</p>
      </div>
      <div v-if="tab === 'title' && useCustom" class="quick-size-custom">
        <div class="quick-size-custom-row">
          <a-select size="small" v-model:value="titleMode" style="width: 88px">
            <a-select-option value="contain">包含</a-select-option>
            <a-select-option value="notContain">不含</a-select-option>
          </a-select>
          <a-input size="small" v-model:value="titleValue" placeholder="关键字" style="width: 160px"/>
        </div>
        <p v-if="customAlias" class="quick-size-custom-hint">
          将添加为 {{ customAlias }}<span v-if="customExists"> · 已有，不会重复</span>
        </p>
      </div>
      <div v-if="tab === 'size' && useCustom" class="quick-size-custom">
        <div class="quick-size-custom-row">
          <a-select size="small" v-model:value="customMode" style="width: 88px">
            <a-select-option value="bigger">大于</a-select-option>
            <a-select-option value="smaller">小于</a-select-option>
            <a-select-option value="range">区间</a-select-option>
          </a-select>
          <a-input size="small" v-model:value="customValue" placeholder="体积" style="width: 88px"/>
          <template v-if="customMode === 'range'">
            <span class="quick-size-tilde">至</span>
            <a-input size="small" v-model:value="customMax" placeholder="上限" style="width: 88px"/>
          </template>
          <a-select size="small" v-model:value="customUnit" style="width: 88px">
            <a-select-option v-for="item of sizeUnits" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <p v-if="customAlias" class="quick-size-custom-hint">
          将添加为 {{ customAlias }}<span v-if="customExists"> · 已有，不会重复</span>
        </p>
      </div>
      <div class="quick-size-bar">
        <a-button @click="open = false">取消</a-button>
        <a-button type="primary" :disabled="!canAdd" :loading="saving" @click="addPicked">添加已选</a-button>
      </div>
    </a-modal>
  </span>
</template>
<script>
import { SIZE_UNITS, toSizeExpr } from '../util/sizeUnit';

const SIZE_RULES = [
  { alias: '>1G', conditions: [{ key: 'size', compareType: 'bigger', value: '1*1024*1024*1024' }] },
  { alias: '>2G', conditions: [{ key: 'size', compareType: 'bigger', value: '2*1024*1024*1024' }] },
  { alias: '>3G', conditions: [{ key: 'size', compareType: 'bigger', value: '3*1024*1024*1024' }] },
  { alias: '>4G', conditions: [{ key: 'size', compareType: 'bigger', value: '4*1024*1024*1024' }] },
  { alias: '>10G', conditions: [{ key: 'size', compareType: 'bigger', value: '10*1024*1024*1024' }] },
  { alias: '>14G', conditions: [{ key: 'size', compareType: 'bigger', value: '14*1024*1024*1024' }] },
  { alias: '>20G', conditions: [{ key: 'size', compareType: 'bigger', value: '20*1024*1024*1024' }] },
  { alias: '>30G', conditions: [{ key: 'size', compareType: 'bigger', value: '30*1024*1024*1024' }] },
  { alias: '>40G', conditions: [{ key: 'size', compareType: 'bigger', value: '40*1024*1024*1024' }] },
  { alias: '>50G', conditions: [{ key: 'size', compareType: 'bigger', value: '50*1024*1024*1024' }] },
  { alias: '>60G', conditions: [{ key: 'size', compareType: 'bigger', value: '60*1024*1024*1024' }] },
  { alias: '种子小于3g', conditions: [{ key: 'size', compareType: 'smaller', value: '1024*1024*1024*3' }] },
  { alias: '种子小于5g', conditions: [{ key: 'size', compareType: 'smaller', value: '1024*1024*1024*5' }] },
  { alias: '种子小于10g', conditions: [{ key: 'size', compareType: 'smaller', value: '1024*1024*1024*10' }] },
  {
    alias: '种子3-40g',
    conditions: [
      { key: 'size', compareType: 'bigger', value: '1024*1024*1024*3' },
      { key: 'size', compareType: 'smaller', value: '1024*1024*1024*40' }
    ]
  }
];

export default {
  name: 'FnQuickSize',
  props: {
    kind: {
      type: String,
      required: true
    },
    existing: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      open: false,
      picked: [],
      saving: false,
      tab: 'size',
      useCustom: false,
      customMode: 'bigger',
      customValue: '',
      customMax: '',
      customUnit: 'GiB',
      titleMode: 'contain',
      titleValue: '',
      sites: [],
      sizeUnits: SIZE_UNITS
    };
  },
  computed: {
    nameKey () {
      return this.kind === 'select' ? 'title' : 'name';
    },
    existSet () {
      return (this.existing || []).map(alias => String(alias || '').trim());
    },
    presetRules () {
      if (this.tab === 'title') {
        return [
          { alias: '标题含1080', conditions: [{ key: this.nameKey, compareType: 'contain', value: '1080' }] },
          { alias: '标题含2160', conditions: [{ key: this.nameKey, compareType: 'contain', value: '2160' }] },
          { alias: '标题含Remux', conditions: [{ key: this.nameKey, compareType: 'contain', value: 'Remux' }] },
          { alias: '标题含WEB-DL', conditions: [{ key: this.nameKey, compareType: 'contain', value: 'WEB-DL' }] },
          { alias: '标题不含720', conditions: [{ key: this.nameKey, compareType: 'notContain', value: '720' }] }
        ];
      }
      if (this.tab === 'site') {
        return (this.sites || []).map(site => ({
          alias: '标题含' + site.name,
          conditions: [{ key: this.nameKey, compareType: 'contain', value: site.name }]
        }));
      }
      if (this.tab === 'extra') {
        const hr = this.kind === 'select'
          ? [{ key: 'tags', compareType: 'notContain', value: 'HR' }]
          : [{ key: 'name', compareType: 'notContain', value: 'HR' }, { key: 'description', compareType: 'notContain', value: 'HR' }];
        const free = this.kind === 'select'
          ? [{ key: 'tags', compareType: 'contain', value: '免费' }]
          : [{ key: this.nameKey, compareType: 'contain', value: 'Free' }];
        return [
          { alias: '排除HR', conditions: hr },
          { alias: this.kind === 'select' ? '标签含免费' : '标题含Free', conditions: free }
        ];
      }
      return SIZE_RULES;
    },
    options () {
      return this.presetRules.map((item) => ({
        ...item,
        exists: this.existSet.indexOf(item.alias) !== -1
      }));
    },
    customItem () {
      if (this.tab === 'title') {
        const text = String(this.titleValue || '').trim();
        if (!text) return null;
        return {
          alias: (this.titleMode === 'notContain' ? '标题不含' : '标题含') + text,
          conditions: [{ key: this.nameKey, compareType: this.titleMode, value: text }]
        };
      }
      if (this.tab !== 'size') return null;
      const min = Number(this.customValue);
      if (!Number.isFinite(min) || min <= 0) return null;
      const unit = this.customUnit || 'GiB';
      const minExpr = toSizeExpr(min, unit);
      if (this.customMode === 'range') {
        const max = Number(this.customMax);
        if (!Number.isFinite(max) || max <= min) return null;
        return {
          alias: '种子' + min + '-' + this.sizeLabel(max, unit, true),
          conditions: [
            { key: 'size', compareType: 'bigger', value: minExpr },
            { key: 'size', compareType: 'smaller', value: toSizeExpr(max, unit) }
          ]
        };
      }
      if (this.customMode === 'smaller') {
        return {
          alias: '种子小于' + this.sizeLabel(min, unit, true),
          conditions: [{ key: 'size', compareType: 'smaller', value: minExpr }]
        };
      }
      return {
        alias: '>' + this.sizeLabel(min, unit, false),
        conditions: [{ key: 'size', compareType: 'bigger', value: minExpr }]
      };
    },
    customAlias () {
      return this.customItem ? this.customItem.alias : '';
    },
    customExists () {
      return !!this.customAlias && this.existSet.indexOf(this.customAlias) !== -1;
    },
    canAdd () {
      if (this.useCustom) return !!this.customItem && !this.customExists;
      return this.options.some(item => !item.exists && this.isPicked(item.alias));
    }
  },
  watch: {
    open (val) {
      if (val) {
        this.picked = [];
        this.useCustom = false;
        this.tab = 'size';
        this.resetCustom();
        this.loadSites();
      }
    }
  },
  methods: {
    setTab (tab) {
      this.tab = tab;
      this.useCustom = false;
      this.picked = [];
      this.resetCustom();
    },
    isPicked (alias) {
      return this.picked.indexOf(alias) !== -1;
    },
    resetCustom () {
      this.customMode = 'bigger';
      this.customValue = '';
      this.customMax = '';
      this.customUnit = 'GiB';
      this.titleMode = 'contain';
      this.titleValue = '';
    },
    async loadSites () {
      if (this.sites.length) return;
      try {
        const res = await this.$api().site.list();
        const list = (res.data && res.data.siteList) || [];
        this.sites = list.map(item => ({ name: item.name })).filter(item => item.name);
      } catch (e) {
        this.sites = [];
      }
    },
    toggleCustom () {
      this.useCustom = !this.useCustom;
      if (this.useCustom) this.picked = [];
      else this.resetCustom();
    },
    toggle (item) {
      if (item.exists) return;
      this.useCustom = false;
      this.resetCustom();
      const i = this.picked.indexOf(item.alias);
      if (i === -1) this.picked = this.picked.concat(item.alias);
      else this.picked = this.picked.filter(alias => alias !== item.alias);
    },
    sizeLabel (n, unit, lower) {
      const map = { GiB: 'G', MiB: 'M', TiB: 'T', KiB: 'K', Byte: 'B' };
      const letter = map[unit] || unit;
      return String(n) + (lower ? letter.toLowerCase() : letter);
    },
    payloadOf (item) {
      const body = {
        alias: item.alias,
        type: 'normal',
        conditions: item.conditions
      };
      if (this.kind === 'select') {
        body.priority = '0';
        body.sortBy = 'time';
        body.sortType = 'desc';
      }
      return body;
    },
    async addPicked () {
      const items = this.useCustom
        ? (this.customItem && !this.customExists ? [this.customItem] : [])
        : this.options.filter(item => !item.exists && this.isPicked(item.alias));
      if (!items.length) return;
      this.saving = true;
      try {
        const api = this.kind === 'select' ? this.$api().selectRule : this.$api().rssRule;
        for (const item of items) {
          await api.modify(this.payloadOf(item));
        }
        this.$message().success('已添加 ' + items.map(item => item.alias).join('、'));
        this.open = false;
        this.$emit('added');
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>
<style scoped>
.quick-size-lead {
  margin: 0 0 12px;
  color: var(--text-2);
}
.quick-size-tabs,
.quick-size-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.quick-size-custom {
  margin-bottom: 16px;
}
.quick-size-custom-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.quick-size-tilde {
  color: var(--text-3);
}
.quick-size-custom-hint {
  margin: 8px 0 0;
  color: var(--text-3);
  font-size: 13px;
}
.quick-size-empty {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}
.quick-size-chip {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-2);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
}
.quick-size-chip.on {
  background: var(--blue-soft);
  border-color: var(--blue);
  color: var(--text);
}
.quick-size-chip.exists {
  opacity: 0.55;
  cursor: not-allowed;
}
.quick-size-bar {
  display: flex;
  gap: 8px;
}
</style>
