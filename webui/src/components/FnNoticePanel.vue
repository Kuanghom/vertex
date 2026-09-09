<template>
  <div class="fn-notice-panel">
    <div class="fn-notice-head">
      <strong>系统通知</strong>
      <button v-if="items.length" type="button" class="fn-notice-clear" @click="clearNotices">
        <fa :icon="['fas', 'trash']"/>
        清空
      </button>
    </div>
    <div v-if="!items.length" class="fn-notice-empty">暂无通知</div>
    <div v-else class="fn-notice-list">
      <div v-for="group in groups" :key="group.name" class="fn-notice-group">
        <button
          v-if="groups.length > 1"
          type="button"
          class="fn-notice-group-head"
          @click="toggle(group.name)">
          <span>{{ group.name }} ({{ group.items.length }})</span>
          <fa :icon="['fas', open[group.name] === false ? 'chevron-right' : 'chevron-down']"/>
        </button>
        <div v-if="groups.length === 1 || open[group.name] !== false">
          <div v-for="item in group.items" :key="item.id" class="fn-notice-card" :class="{ read: item.read }">
            <div class="fn-notice-card-top">
              <div class="fn-notice-title">{{ item.title }}</div>
              <span class="fn-notice-time">{{ timeText(item.time) }}</span>
              <button type="button" class="fn-notice-x" aria-label="关闭" @click="removeNotice(item.id)">
                <fa :icon="['fas', 'times']"/>
              </button>
            </div>
            <p class="fn-notice-body">{{ item.body }}<span v-if="item.count > 1"> ×{{ item.count }}</span></p>
          </div>
        </div>
      </div>
    </div>
    <button type="button" class="fn-notice-log" @click="gotoLog">查看日志</button>
  </div>
</template>
<script>
import { noticeBox, clearNotices, removeNotice } from '../util/notices';

export default {
  name: 'FnNoticePanel',
  data () {
    return {
      open: {}
    };
  },
  computed: {
    items () {
      return noticeBox.items;
    },
    groups () {
      const map = {};
      this.items.forEach((item) => {
        const name = item.group || '系统';
        if (!map[name]) map[name] = [];
        map[name].push(item);
      });
      return Object.keys(map).map(name => ({ name, items: map[name] }));
    }
  },
  methods: {
    clearNotices,
    removeNotice,
    toggle (name) {
      this.open = { ...this.open, [name]: this.open[name] === false };
    },
    timeText (time) {
      const m = this.$moment(time);
      if (this.$moment().diff(m, 'minute') < 1) return '刚刚';
      if (this.$moment().isSame(m, 'day')) return m.format('HH:mm');
      if (this.$moment().subtract(1, 'day').isSame(m, 'day')) return '昨天 ' + m.format('HH:mm');
      return m.format('YYYY-MM-DD HH:mm');
    },
    gotoLog () {
      this.$emit('goto-log');
      this.$goto('/info/log', this.$router);
    }
  }
};
</script>
