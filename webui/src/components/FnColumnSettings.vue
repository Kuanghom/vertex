<template>
  <a-popover
    trigger="click"
    placement="bottomRight"
    overlay-class-name="fn-col-pop">
    <template #content>
      <div class="fn-col-panel">
        <div class="fn-col-head">
          <span>列显示 / 排序</span>
          <a @click.prevent="$emit('reset')">重置</a>
        </div>
        <div
          v-for="(item, index) of items"
          :key="item.key"
          class="fn-col-row"
          :class="{ locked: item.locked }"
          :draggable="!item.locked"
          @dragstart="$emit('dragstart', item.key, $event)"
          @dragover.prevent
          @drop.prevent="$emit('drop', item.key)">
          <span class="fn-col-grip" :title="item.locked ? '操作列固定在最后' : '拖拽调整顺序'">⋮⋮</span>
          <a-checkbox
            :checked="item.visible"
            :disabled="item.locked"
            @change="e => $emit('toggle', item.key, e.target.checked)">
            {{ item.title }}
          </a-checkbox>
          <span class="fn-col-move">
            <button type="button" :disabled="item.locked || index === 0" @click="$emit('move', item.key, -1)">↑</button>
            <button type="button" :disabled="item.locked || index === items.length - 1" @click="$emit('move', item.key, 1)">↓</button>
          </span>
        </div>
        <p class="fn-col-tip">表头可拖动排序，列右缘可拖动改宽；这里也可显隐和排序</p>
      </div>
    </template>
    <a-button class="fn-col-btn">列设置</a-button>
  </a-popover>
</template>

<script>
export default {
  name: 'FnColumnSettings',
  props: {
    items: {
      type: Array,
      default: () => []
    }
  }
};
</script>
