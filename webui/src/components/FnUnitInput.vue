<template>
  <a-input
    class="fn-unit-input"
    size="small"
    :value="value"
    :placeholder="placeholder"
    @update:value="$emit('update:value', $event)"
  >
    <template #addonAfter>
      <a-select
        size="small"
        :value="unit"
        :style="{ width: selectWidth }"
        @update:value="$emit('update:unit', $event)"
      >
        <a-select-option v-for="item of units" :key="item.value" :value="item.value">
          {{ item.label }}
        </a-select-option>
      </a-select>
    </template>
  </a-input>
</template>

<script>
export default {
  name: 'FnUnitInput',
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    unit: {
      type: String,
      default: ''
    },
    units: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: ''
    },
    selectWidth: {
      type: String,
      default: '88px'
    }
  },
  emits: ['update:value', 'update:unit']
};
</script>
