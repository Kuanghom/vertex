<template>
  <a-modal
    v-model:visible="state.visible"
    title="详情"
    :width="isNarrow ? '100%' : 560"
    :wrap-class-name="(isNarrow ? 'fn-dialog-full ' : '') + 'fn-row-detail'"
    :footer="null"
    :bodyStyle="isNarrow ? {} : { maxHeight: '70vh', overflow: 'auto' }"
    @cancel="close">
    <a-descriptions :column="1" size="small">
      <a-descriptions-item v-for="item in state.fields" :key="item.key" :label="item.label">
        <a-tag v-if="item.tag === 'ok'" color="success">{{ item.text }}</a-tag>
        <a-tag v-else-if="item.tag === 'bad'" color="error">{{ item.text }}</a-tag>
        <span v-else>{{ item.text }}</span>
      </a-descriptions-item>
    </a-descriptions>
    <div class="fn-row-detail-foot">
      <a-button @click="close">关闭</a-button>
    </div>
  </a-modal>
</template>
<script>
import { closeRowDetail, rowDetail } from '../util/rowDetail';

export default {
  name: 'FnRowDetail',
  computed: {
    state () {
      return rowDetail;
    }
  },
  methods: {
    close () {
      closeRowDetail();
    }
  }
};
</script>
