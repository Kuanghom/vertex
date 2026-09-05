<template>
  <span v-if="type === '2x50%'" class="promo-tag promo-tag-combo">
    <span class="promo-tag-part promo-tag-2x">2x</span>
    <span class="promo-tag-part promo-tag-50-striped">50%</span>
  </span>
  <span v-else-if="type === '2xfree'" class="promo-tag promo-tag-combo">
    <span class="promo-tag-part promo-tag-2x">2x</span>
    <span class="promo-tag-part promo-tag-free">Free</span>
  </span>
  <span v-else-if="type === 'free'" class="promo-tag promo-tag-single promo-tag-free">Free</span>
  <span v-else-if="type === '2x'" class="promo-tag promo-tag-single promo-tag-2x">2x</span>
  <span v-else-if="type === '50%'" class="promo-tag promo-tag-single promo-tag-50">50%</span>
  <span v-else-if="type === '30%'" class="promo-tag promo-tag-single promo-tag-30">30%</span>
  <span v-else-if="type === 'error'" class="promo-tag promo-tag-single promo-tag-error">{{ label || '检测失败' }}</span>
  <span v-else-if="type === 'normal'" class="promo-tag promo-tag-single promo-tag-normal">{{ label || '普通' }}</span>
  <span v-else class="promo-tag promo-tag-single promo-tag-unknown">{{ label || '未检测' }}</span>
</template>

<script>
import { resolvePromoType } from '../util/promoTag';

export default {
  name: 'PromoTag',
  props: {
    label: {
      type: String,
      default: ''
    },
    promoType: {
      type: String,
      default: ''
    }
  },
  computed: {
    type () {
      return resolvePromoType(this.label, this.promoType);
    }
  }
};
</script>

<style scoped>
.promo-tag {
  display: inline-flex;
  align-items: stretch;
  border-radius: 3px;
  overflow: hidden;
  vertical-align: middle;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.promo-tag-single,
.promo-tag-part {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 7px;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  color: #fff;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
}

.promo-tag-30 {
  background: linear-gradient(180deg, #8b5fd4 0%, #5c3a9e 100%);
}

.promo-tag-2x {
  background: linear-gradient(180deg, #5fe06a 0%, #2fbf4a 100%);
}

.promo-tag-50 {
  background: linear-gradient(180deg, #ff6b6b 0%, #e03535 100%);
}

.promo-tag-50-striped {
  background-color: #e03535;
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.22),
    rgba(255, 255, 255, 0.22) 2px,
    transparent 2px,
    transparent 4px
  );
}

.promo-tag-free {
  background: linear-gradient(180deg, #5eb3ff 0%, #2f8ef0 100%);
}

.promo-tag-normal {
  background: #f5f5f5;
  color: #8c8c8c;
  border: 1px solid #d9d9d9;
  text-shadow: none;
  font-weight: 500;
}

.promo-tag-unknown {
  background: #fafafa;
  color: #bfbfbf;
  border: 1px dashed #d9d9d9;
  text-shadow: none;
  font-weight: 500;
}

.promo-tag-error {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffa39e;
  text-shadow: none;
  font-weight: 500;
}
html.dark .promo-tag-normal {
  background: #1c2a32;
  color: #9bb8c8;
  border-color: #23485a;
}
html.dark .promo-tag-unknown {
  background: #142833;
  color: #6d8a9a;
  border-color: #23485a;
}
html.dark .promo-tag-error {
  background: #3a1c1e;
  color: #f07178;
  border-color: #5a2a2e;
}
</style>
