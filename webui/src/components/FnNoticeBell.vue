<template>
  <a-popover
    v-if="!narrow"
    v-model:visible="open"
    trigger="click"
    placement="bottomRight"
    overlay-class-name="fn-notice-pop"
    @visibleChange="onVisible">
    <template #content>
      <notice-panel @goto-log="open = false"/>
    </template>
    <button class="fn-icon-btn fn-notice-btn" type="button" title="系统通知" aria-label="系统通知">
      <fa :icon="['fas', 'bell']"/>
      <span v-if="unread" class="fn-notice-badge">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
  </a-popover>
  <template v-else>
    <button class="fn-icon-btn fn-notice-btn" type="button" title="系统通知" aria-label="系统通知" @click="openDrawer">
      <fa :icon="['fas', 'bell']"/>
      <span v-if="unread" class="fn-notice-badge">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <a-drawer
      v-model:visible="drawer"
      title="系统通知"
      placement="right"
      :width="drawerWidth"
      :bodyStyle="{ padding: '12px', background: 'var(--fill)' }"
      @afterVisibleChange="onDrawer">
      <notice-panel @goto-log="drawer = false"/>
    </a-drawer>
  </template>
</template>
<script>
import { viewport } from '../mixins/responsive';
import { unreadCount, markAllRead } from '../util/notices';
import NoticePanel from './FnNoticePanel.vue';

export default {
  name: 'FnNoticeBell',
  components: { NoticePanel },
  data () {
    return {
      open: false,
      drawer: false
    };
  },
  computed: {
    narrow () {
      return viewport.narrow;
    },
    unread () {
      return unreadCount();
    },
    drawerWidth () {
      return Math.min(viewport.width, 400);
    }
  },
  methods: {
    onVisible (visible) {
      if (visible) markAllRead();
    },
    openDrawer () {
      this.drawer = true;
      markAllRead();
    },
    onDrawer (visible) {
      if (visible) markAllRead();
    }
  }
};
</script>
