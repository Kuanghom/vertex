<template>
  <div v-if="!isNarrow" class="fn-ops">
    <slot />
  </div>
  <div v-else class="fn-ops fn-ops-mobile">
    <button
      type="button"
      class="fn-ops-more"
      aria-label="操作"
      title="操作"
      @click.stop="openSheet"
    >
      <fa :icon="['fas', 'ellipsis-v']"/>
    </button>
    <teleport to="body">
      <div v-if="open" class="fn-ops-mask" @click.self="closeSheet">
        <div class="fn-ops-sheet" @click.stop>
          <div class="fn-ops-sheet-handle"/>
          <div class="fn-ops-sheet-list" @click="onSheetClick">
            <slot />
          </div>
          <button type="button" class="fn-ops-cancel" @click="closeSheet">取消</button>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
const EVENT = 'fn-ops-open';

export default {
  name: 'FnOps',
  data () {
    return {
      open: false
    };
  },
  methods: {
    openSheet () {
      window.dispatchEvent(new CustomEvent(EVENT));
      this.open = true;
      document.body.classList.add('fn-ops-open');
    },
    closeSheet () {
      this.open = false;
      document.body.classList.remove('fn-ops-open');
    },
    onSheetClick (e) {
      const btn = e.target && e.target.closest('button, .ant-btn, a');
      if (!btn) return;
      if (btn.classList.contains('ant-btn-dangerous') || btn.closest('.ant-popconfirm, .ant-popover-disabled-compatible-wrapper')) {
        return;
      }
      this.closeSheet();
    },
    onForeignOpen () {
      if (this.open) this.closeSheet();
    },
    onDocClick (e) {
      if (!this.open) return;
      const ok = e.target && e.target.closest('.ant-popconfirm-buttons .ant-btn-primary, .ant-popover .ant-btn-primary');
      if (ok) this.closeSheet();
    }
  },
  mounted () {
    window.addEventListener(EVENT, this.onForeignOpen);
    document.addEventListener('click', this.onDocClick, true);
  },
  beforeUnmount () {
    window.removeEventListener(EVENT, this.onForeignOpen);
    document.removeEventListener('click', this.onDocClick, true);
    document.body.classList.remove('fn-ops-open');
  }
};
</script>
