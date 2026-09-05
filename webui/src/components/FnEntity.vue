<template>
  <div class="fn-entity">
    <div class="fn-entity-avatar" :class="{ 'has-img': !!src }" :style="chipStyle">
      <img v-if="src" :src="src" alt=""/>
      <span v-else>{{ chip }}</span>
    </div>
    <div class="fn-entity-copy">
      <div class="fn-entity-head">
        <div class="fn-entity-title" :title="title">{{ title }}</div>
        <button
          v-if="showInfo"
          type="button"
          class="fn-row-info"
          aria-label="详情"
          title="详情"
          @click.stop="onInfo">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <circle cx="8" cy="5.15" r="0.95" fill="currentColor"/>
            <path d="M8 7.25v4.1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div v-if="desc" class="fn-entity-desc" :title="desc">{{ desc }}</div>
    </div>
  </div>
</template>
<script>
import { viewport } from '../mixins/responsive';

const PALETTE = ['#00a0e9', '#3370ff', '#2db86c', '#7b61ff', '#e6a817', '#14c0c0'];

export default {
  name: 'FnEntity',
  inject: {
    openListDetail: { default: null },
    hasRowDetail: { default: false }
  },
  props: {
    title: { type: String, default: '' },
    desc: { type: String, default: '' },
    src: { type: String, default: '' },
    mark: { type: String, default: '' },
    record: { type: Object, default: null }
  },
  computed: {
    chip () {
      const s = String(this.mark || this.title || '?').trim();
      return s.slice(0, 1).toUpperCase();
    },
    chipStyle () {
      if (this.src) return {};
      const s = String(this.mark || this.title || '');
      let n = 0;
      for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % PALETTE.length;
      return { background: PALETTE[n] };
    },
    showInfo () {
      const has = typeof this.hasRowDetail === 'function' ? this.hasRowDetail() : this.hasRowDetail;
      return viewport.narrow && !!(has || this.$attrs.onDetail);
    }
  },
  methods: {
    onInfo () {
      if (this.openListDetail && this.record) {
        this.openListDetail(this.record);
        return;
      }
      this.$emit('detail');
    }
  }
};
</script>
