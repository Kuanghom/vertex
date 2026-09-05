<template>
  <div class="fn-filter-host" :class="{ 'is-pc-inline': pcInline }" ref="host">
    <div v-if="showToolbar" :class="toolbarClassName">
      <template v-if="pcInline">
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
          @click="toggle"
        >
          更多搜索
          <i v-if="active" class="fn-filter-dot"/>
        </button>
        <div v-if="$slots.toolbar" class="fn-filter-tools">
          <slot name="toolbar" />
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
          <div v-if="!inline && !isNarrow" class="fn-filter-pop-head">全部搜索条件</div>
          <div :class="fieldsClass" @click="onSheetClick">
            <slot />
          </div>
        </section>
      </div>
    </teleport>
  </div>
</template>

<script>
const EVENT = 'fn-ops-open';
const INLINE_CAP = 3;

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
    }
  },
  data () {
    return {
      open: false,
      fieldCount: 0,
      overflow: false
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
      return this.pcInline && (this.fieldCount > INLINE_CAP || this.overflow);
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
      this.$nextTick(this.placePop);
    },
    closeSheet () {
      this.open = false;
      document.body.classList.remove('fn-ops-open');
    },
    placePop () {
      if (this.inline || this.isNarrow || !this.open) return;
      const btn = this.$refs.moreBtn || this.$refs.trigger;
      const panel = this.$refs.panel;
      if (!btn || !panel) return;
      const r = btn.getBoundingClientRect();
      const width = Math.min(420, window.innerWidth - 24);
      let left = r.right - width;
      if (left < 12) left = 12;
      let top = r.bottom + 8;
      const h = panel.offsetHeight || 220;
      if (top + h > window.innerHeight - 12) {
        top = Math.max(12, r.top - h - 8);
      }
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
      panel.style.width = `${Math.round(width)}px`;
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
    onForeignOpen () {
      if (this.open) this.closeSheet();
    },
    onWinChange () {
      if (this.open) this.placePop();
      this.measureInline();
    },
    measureInline () {
      if (!this.pcInline) {
        if (this.fieldCount) this.fieldCount = 0;
        if (this.overflow) this.overflow = false;
        return;
      }
      const host = this.$refs.host;
      const bar = this.$refs.inlineBar;
      const toolbar = host && host.querySelector('.fn-toolbar');
      if (!bar || !toolbar || toolbar.clientWidth < 80) return;
      const kids = Array.prototype.slice.call(bar.children);
      const fields = kids.filter((el) => el.classList && el.classList.contains('fn-filter-item'));
      if (this.fieldCount !== fields.length) this.fieldCount = fields.length;
      kids.forEach((el) => el.classList.remove('is-collapsed'));
      if (fields.length > INLINE_CAP) {
        fields.forEach((el, i) => {
          if (i >= INLINE_CAP) el.classList.add('is-collapsed');
        });
      }
      const tools = host.querySelector('.fn-filter-tools');
      const more = host.querySelector('.fn-filter-more');
      const toolsW = tools ? tools.getBoundingClientRect().width : 0;
      const moreW = more ? more.getBoundingClientRect().width : (fields.length > INLINE_CAP ? 88 : 0);
      const available = toolbar.clientWidth - toolsW - moreW - 12;
      const gap = 12;
      const usedWidth = () => {
        const shown = Array.prototype.slice.call(bar.children).filter((el) => {
          return !el.classList.contains('is-collapsed') && getComputedStyle(el).display !== 'none';
        });
        return shown.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0) + Math.max(0, shown.length - 1) * gap;
      };
      const visible = fields.filter((el) => !el.classList.contains('is-collapsed'));
      let extra = false;
      while (visible.length && usedWidth() > available) {
        visible.pop().classList.add('is-collapsed');
        extra = true;
      }
      const next = fields.length > INLINE_CAP || extra;
      if (this.overflow !== next) this.overflow = next;
    }
  },
  mounted () {
    window.addEventListener(EVENT, this.onForeignOpen);
    window.addEventListener('resize', this.onWinChange);
    window.addEventListener('scroll', this.onWinChange, true);
    this.$nextTick(this.measureInline);
    if (typeof ResizeObserver !== 'undefined' && this.$refs.host) {
      this._ro = new ResizeObserver(() => this.measureInline());
      this._ro.observe(this.$refs.host);
    }
  },
  beforeUnmount () {
    window.removeEventListener(EVENT, this.onForeignOpen);
    window.removeEventListener('resize', this.onWinChange);
    window.removeEventListener('scroll', this.onWinChange, true);
    if (this._ro) this._ro.disconnect();
    document.body.classList.remove('fn-ops-open');
  }
};
</script>
