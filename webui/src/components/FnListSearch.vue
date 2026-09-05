<template>
  <div class="fn-filter-item">
    <span>关键词</span>
    <a-input
      class="fn-search"
      :value="query"
      allowClear
      :placeholder="placeholder"
      @update:value="$emit('update:query', $event)"
    />
  </div>
  <div v-if="enableable" class="fn-filter-item">
    <span>启用</span>
    <a-select
      :value="enable"
      allowClear
      placeholder="全部"
      @update:value="$emit('update:enable', $event)"
    >
      <a-select-option value="on">启用</a-select-option>
      <a-select-option value="off">禁用</a-select-option>
    </a-select>
  </div>
  <a-button @click="$emit('reset')">重置</a-button>
</template>
<script>
export default {
  name: 'FnListSearch',
  props: {
    query: { type: String, default: '' },
    enable: { type: String, default: undefined },
    enableable: { type: Boolean, default: true },
    placeholder: { type: String, default: '别名 / ID' }
  },
  emits: ['update:query', 'update:enable', 'reset']
};
</script>
