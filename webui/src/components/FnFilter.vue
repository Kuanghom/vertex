<template>
  <div class="fn-filter-host" :class="{ 'is-pc-inline': pcInline }" ref="host">
    <div v-if="showToolbar" :class="toolbarClassName">
      <template v-if="pcInline">
        <div
          class="fn-filter-searchbar"
          :class="{
            'is-active': active || open,
            'has-more': showMoreBtn,
            'has-inline-action': !showMoreBtn && resettable
          }">
          <fa class="fn-filter-search-icon" :icon="['fas', textSearch ? 'search' : 'filter']"/>
          <div ref="inlineBar" class="fn-filter-inline">
            <slot />
          </div>
          <button
            v-if="showMoreBtn"
            ref="moreBtn"
            type="button"
            class="fn-filter-more"
            :class="{ 'is-on': active || open }"
            aria-label="更多搜索"
            title="更多搜索"
            :aria-expanded="open"
            @click="toggle"
          >
            <fa :icon="['fas', 'sliders-h']"/>
            <span>更多搜索</span>
            <i v-if="active" class="fn-filter-dot"/>
          </button>
        </div>
        <div class="fn-filter-tools">
          <slot name="toolbar" />
          <a-button
            class="fn-density-btn"
            :class="{ 'is-active': listCompact }"
            :aria-pressed="listCompact"
            :title="listCompact ? '切换为标准行高' : '切换为紧凑行高'"
            @click="toggleListDensity">
            <fa :icon="['fas', 'compress-alt']"/>
            <span>紧凑</span>
          </a-button>
        </div>
      </template>
      <template v-else>
        <slot name="toolbar" />
        <button
          v-if="useIconTrigger"
          ref="trigger"
          type="button"
          class="fn-filter-trigger"
          :class="{ 'is-on': active || open }"
          :aria-label="title"
          :title="title"
          @click="toggle"
        >
          <fa :icon="['fas', 'search']"/>
          <i v-if="active" class="fn-filter-dot"/>
        </button>
      </template>
    </div>
    <teleport to="body" :disabled="inline">
      <div
        class="fn-filter-layer"
        :class="layerClass"
        @click.self="onMaskClick"
      >
        <section
          ref="panel"
          class="fn-filter-panel"
          :class="panelClass"
          :role="inline ? undefined : 'dialog'"
          :aria-modal="inline ? undefined : 'true'"
          :aria-label="modalTitle"
          :tabindex="inline ? undefined : -1"
          @click.stop
        >
          <template v-if="!inline && isNarrow">
            <button
              type="button"
              class="fn-filter-handle"
              aria-label="关闭"
              @click="closeSheet"
            />
            <div class="fn-filter-sheet-head">{{ title }}</div>
          </template>
          <div v-if="!inline && !isNarrow" class="fn-filter-pop-head">
            <div>
              <strong>{{ modalTitle }}</strong>
              <span>组合条件，快速缩小结果范围</span>
            </div>
            <button type="button" class="fn-filter-close" aria-label="关闭搜索选项" @click="closeSheet(true)">
              <fa :icon="['fas', 'times']"/>
            </button>
          </div>
          <div :class="fieldsClass" @click="onSheetClick">
            <slot />
          </div>
          <div v-if="!inline && !isNarrow" class="fn-filter-pop-foot">
            <a-button v-if="resettable" @click="runPanelAction(/重置/)">重置</a-button>
            <a-button type="primary" @click="runPanelAction(/^(查询|搜索|筛选|检查)$/)">搜索</a-button>
          </div>
        </section>
      </div>
    </teleport>
  </div>
</template>

<script>
import {
  LIST_DENSITY_EVENT,
  getCompactList,
  setCompactList
} from '../util/listDensity';

const EVENT = 'fn-ops-open';
const INLINE_CAP = 1;

export default {
  name: 'FnFilter',
  props: {
    title: {
      type: String,
      default: '筛选'
    },
    active: {
      type: Boolean,
      default: false
    },
    variant: {
      type: String,
      default: 'bar'
    },
    toolbarClass: {
      type: String,
      default: ''
    },
    modalTitle: {
      type: String,
      default: '搜索选项'
    },
    resettable: {
      type: Boolean,
      default: true
    }
  },
  data () {
    return {
      open: false,
      fieldCount: 0,
      textSearch: true,
      listCompact: getCompactList()
    };
  },
  computed: {
    inline () {
      return this.variant === 'form';
    },
    pcInline () {
      return !this.inline && !this.isNarrow;
    },
    useIconTrigger () {
      return !this.inline && this.isNarrow;
    },
    showMoreBtn () {
      return this.pcInline && this.fieldCount > INLINE_CAP;
    },
    showToolbar () {
      return this.inline ? !!this.$slots.toolbar : true;
    },
    toolbarClassName () {
      return ['fn-toolbar', this.toolbarClass].filter(Boolean).join(' ');
    },
    layerClass () {
      if (this.inline) return {};
      return {
        'is-sheet': this.isNarrow,
        'is-pop': !this.isNarrow,
        'is-open': this.open
      };
    },
    panelClass () {
      if (this.inline) return '';
      return this.isNarrow ? 'fn-filter-sheet' : 'fn-filter-pop';
    },
    fieldsClass () {
      if (this.inline) return 'fn-filter-form';
      if (this.isNarrow) return 'fn-filter fn-filter-in-sheet';
      return 'fn-filter fn-filter-in-pop';
    }
  },
  watch: {
    isNarrow () {
      this.closeSheet();
      this.$nextTick(this.measureInline);
    },
    pcInline () {
      this.$nextTick(this.measureInline);
    }
  },
  methods: {
    toggle () {
      if (this.open) this.closeSheet();
      else this.openSheet();
    },
    openSheet () {
      window.dispatchEvent(new CustomEvent(EVENT));
      this.open = true;
      document.body.classList.add('fn-ops-open');
      this.$nextTick(() => {
        if (this.$refs.panel) this.$refs.panel.focus();
      });
    },
    closeSheet (returnFocus) {
      this.open = false;
      document.body.classList.remove('fn-ops-open');
      if (returnFocus) {
        this.$nextTick(() => {
          const trigger = this.$refs.moreBtn || this.$refs.trigger;
          if (trigger) trigger.focus();
        });
      }
    },
    onMaskClick () {
      if (!this.inline && this.open) this.closeSheet();
    },
    onSheetClick (e) {
      const btn = e.target && e.target.closest('.ant-btn, button');
      if (!btn || btn.closest('.ant-select, .ant-picker')) return;
      const type = (btn.getAttribute('type') || '').toLowerCase();
      const text = (btn.textContent || '').replace(/\s+/g, '');
      if (type === 'submit' || /^(查询|搜索|筛选|检查|重置)$/.test(text)) {
        this.closeSheet();
      }
    },
    runPanelAction (pattern) {
      const panel = this.$refs.panel;
      const fields = panel && panel.querySelector('.fn-filter-in-pop');
      const inline = this.$refs.inlineBar;
      const buttons = []
        .concat(fields ? Array.prototype.slice.call(fields.querySelectorAll('.ant-btn')) : [])
        .concat(inline ? Array.prototype.slice.call(inline.querySelectorAll('.ant-btn')) : []);
      const button = buttons.find((el) => {
        return pattern.test((el.textContent || '').replace(/\s+/g, ''));
      });
      if (button) button.click();
      else this.closeSheet();
    },
    onForeignOpen () {
      if (this.open) this.closeSheet();
    },
    onWinChange () {
      this.measureInline();
    },
    toggleListDensity () {
      setCompactList(!this.listCompact);
    },
    onListDensityChange (e) {
      this.listCompact = !!e.detail;
    },
    onKeydown (e) {
      if (e.key === 'Escape' && this.open) this.closeSheet(true);
    },
    measureInline () {
      if (!this.pcInline) {
        if (this.fieldCount) this.fieldCount = 0;
        return;
      }
      const bar = this.$refs.inlineBar;
      if (!bar) return;
      const kids = Array.prototype.slice.call(bar.children);
      const fields = kids.filter((el) => el.classList && el.classList.contains('fn-filter-item'));
      if (this.fieldCount !== fields.length) this.fieldCount = fields.length;
      const first = fields[0];
      const textSearch = !!(first && first.querySelector('input.ant-input, .ant-input-affix-wrapper, textarea.ant-input'));
      if (this.textSearch !== textSearch) this.textSearch = textSearch;
      kids.forEach((el) => el.classList.remove('is-collapsed'));
      fields.forEach((el, i) => {
        if (i >= INLINE_CAP) el.classList.add('is-collapsed');
      });
    }
  },
  mounted () {
    window.addEventListener(EVENT, this.onForeignOpen);
    window.addEventListener(LIST_DENSITY_EVENT, this.onListDensityChange);
    window.addEventListener('resize', this.onWinChange);
    document.addEventListener('keydown', this.onKeydown);
    this.$nextTick(this.measureInline);
    if (typeof ResizeObserver !== 'undefined' && this.$refs.host) {
      this._ro = new ResizeObserver(() => this.measureInline());
      this._ro.observe(this.$refs.host);
    }
  },
  beforeUnmount () {
    window.removeEventListener(EVENT, this.onForeignOpen);
    window.removeEventListener(LIST_DENSITY_EVENT, this.onListDensityChange);
    window.removeEventListener('resize', this.onWinChange);
    document.removeEventListener('keydown', this.onKeydown);
    if (this._ro) this._ro.disconnect();
    document.body.classList.remove('fn-ops-open');
  }
};
</script>
