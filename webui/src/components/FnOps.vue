<template>
  <div v-if="!isNarrow" class="fn-ops is-icons">
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

const ICONS = {
  编辑: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  打开: '<path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
  '绑定 RSS': '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  绑定RSS: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  克隆: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 11v6"/><path d="M9 14h6"/>',
  日志: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>',
  删除: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  Shell: '<path d="M4 17l6-5-6-5"/><path d="M12 19h8"/>',
  重连: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  刷新: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  代理: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18"/><path d="M12 3a15 15 0 0 0 0 18"/>',
  '软/硬链接': '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/>',
  推送: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  '应用到 RSS': '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>'
};

function svgFor (name) {
  const path = ICONS[name];
  if (!path) return '';
  return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

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
    },
    decorateIcons () {
      if (this.isNarrow || !this.$el) return;
      this.$el.querySelectorAll('.ant-btn').forEach((btn) => {
        if (btn.querySelector('.fn-op-svg')) return;
        const text = (btn.textContent || '').replace(/\s+/g, '');
        const svg = svgFor(text);
        if (!svg) return;
        btn.classList.add('fn-op-ico');
        btn.setAttribute('title', text);
        btn.setAttribute('aria-label', text);
        const icon = document.createElement('i');
        icon.className = 'fn-op-svg';
        icon.innerHTML = svg;
        btn.insertBefore(icon, btn.firstChild);
      });
    }
  },
  mounted () {
    window.addEventListener(EVENT, this.onForeignOpen);
    document.addEventListener('click', this.onDocClick, true);
    this.$nextTick(this.decorateIcons);
  },
  updated () {
    this.$nextTick(this.decorateIcons);
  },
  beforeUnmount () {
    window.removeEventListener(EVENT, this.onForeignOpen);
    document.removeEventListener('click', this.onDocClick, true);
    document.body.classList.remove('fn-ops-open');
  }
};
</script>
