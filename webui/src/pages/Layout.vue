<template>
  <div class="fn-app" :class="{ 'is-bare': bareMode }">
    <div class="fn-shell">
      <header v-if="bareMode" class="fn-bare-bar">
        <button type="button" class="fn-bare-back" @click="bareBack">返回</button>
        <span class="fn-bare-title">{{ pageTitle }}</span>
      </header>
      <header v-else class="fn-titlebar">
        <button v-if="narrow || compact" class="fn-icon-btn" type="button" aria-label="菜单" title="菜单" @click="mobileMenu = true">
          <fa :icon="['fas', 'bars']"/>
        </button>
        <div class="fn-brand" @click="gotoWiki">
          <img src="/assets/images/logo.svg" alt=""/>
          Vertex
        </div>
        <div class="fn-title-mid">{{ pageTitle }}</div>
        <div class="fn-tb-actions">
          <button v-if="!narrow" class="fn-icon-btn" type="button" title="修改 HOSTS" @click="openDrawer('hosts')">
            <fa :icon="['fas', 'route']"/>
          </button>
          <button v-if="!narrow" class="fn-icon-btn" type="button" title="HTTP 代理" @click="openDrawer('proxy')">
            <fa :icon="['fas', 'globe']"/>
          </button>
          <fn-notice-bell/>
          <button class="fn-icon-btn" type="button" :title="dark ? '浅色' : '深色'" @click="toggleTheme">
            <fa :icon="dark ? ['fas', 'sun'] : ['fas', 'moon']"/>
          </button>
          <a-popconfirm
            title="确认退出登录？"
            ok-text="退出"
            cancel-text="取消"
            overlay-class-name="fn-pop-confirm"
            @confirm="logout">
            <button type="button" class="fn-logout-btn" title="退出登录">
              <fa :icon="['fas', 'right-from-bracket']"/>
              <span>退出</span>
            </button>
          </a-popconfirm>
        </div>
      </header>

      <div class="fn-body">
        <nav v-if="!narrow && !compact && !bareMode" class="fn-sidebar">
          <template v-for="item of visibleMenu" :key="item.path">
            <button
              v-if="!item.sub"
              class="fn-nav-item"
              :class="{ active: selectedKeys.includes(item.path) }"
              type="button"
              @click="goto(item.path)">
              <span class="fn-tile" :style="tileStyle(item.path)">
                <fa :icon="item.icon"/>
              </span>
              {{ item.title }}
            </button>
            <template v-else>
              <button
                class="fn-nav-group"
                :class="{ open: openKeys.includes(item.path) }"
                type="button"
                @click="toggleGroup(item.path)">
                <span class="fn-tile" :style="tileStyle(item.path)">
                  <fa :icon="item.icon"/>
                </span>
                {{ item.title }}
                <span class="chev">▶</span>
              </button>
              <div v-if="openKeys.includes(item.path)" class="fn-sub">
                <button
                  v-for="subItem of visibleSubs(item)"
                  :key="subItem.path"
                  class="fn-nav-item fn-nav-child"
                  :class="{ active: selectedKeys.includes(subItem.path) }"
                  type="button"
                  @click="goto(subItem.path)">
                  <fa class="fn-child-ico" :icon="subItem.icon"/>
                  {{ subItem.title }}
                </button>
              </div>
            </template>
          </template>
        </nav>

        <main class="fn-main vertex-main-content">
          <div :class="contentWrapClass">
            <div v-if="pageLoading" class="fn-page-busy" aria-live="polite">
              <i class="fn-busy-dot"></i>
              <span>加载中</span>
            </div>
            <router-view></router-view>
          </div>
        </main>
      </div>

      <footer v-if="!bareMode" class="fn-foot">
        <span>今日添加 {{ runInfo.addCountToday || 0 }}</span>
        <span>↑ {{ $formatSize(runInfo.uploadedToday || 0) }}</span>
        <span>↓ {{ $formatSize(runInfo.downloadedToday || 0) }}</span>
        <span v-if="!narrow" class="sp">{{ clock }} · Asia/Shanghai</span>
      </footer>
    </div>

    <a-drawer
      v-if="!bareMode"
      v-model:visible="mobileMenu"
      :closable="false"
      placement="left"
      :width="menuDrawerWidth"
      :bodyStyle="{ padding: '12px 10px', background: 'var(--sidebar)' }">
      <nav>
        <template v-for="item of visibleMenu" :key="'m-'+item.path">
          <button
            v-if="!item.sub"
            class="fn-nav-item"
            :class="{ active: selectedKeys.includes(item.path) }"
            type="button"
            @click="goto(item.path); mobileMenu = false">
            <span class="fn-tile" :style="tileStyle(item.path)">
              <fa :icon="item.icon"/>
            </span>
            {{ item.title }}
          </button>
          <template v-else>
            <button
              class="fn-nav-group"
              :class="{ open: openKeys.includes(item.path) }"
              type="button"
              @click="toggleGroup(item.path)">
              <span class="fn-tile" :style="tileStyle(item.path)">
                <fa :icon="item.icon"/>
              </span>
              {{ item.title }}
              <span class="chev">▶</span>
            </button>
            <div v-if="openKeys.includes(item.path)" class="fn-sub">
              <button
                v-for="subItem of visibleSubs(item)"
                :key="'m-'+subItem.path"
                class="fn-nav-item fn-nav-child"
                :class="{ active: selectedKeys.includes(subItem.path) }"
                type="button"
                @click="goto(subItem.path); mobileMenu = false">
                <fa class="fn-child-ico" :icon="subItem.icon"/>
                {{ subItem.title }}
              </button>
            </div>
          </template>
        </template>
        <div class="fn-nav-logout">
          <a-popconfirm
            title="确认退出登录？"
            ok-text="退出"
            cancel-text="取消"
            overlay-class-name="fn-pop-confirm"
            @confirm="logout">
            <button type="button" class="fn-nav-item fn-nav-exit">
              <span class="fn-tile" style="background: var(--bad-soft); color: var(--bad);">
                <fa :icon="['fas', 'right-from-bracket']"/>
              </span>
              退出登录
            </button>
          </a-popconfirm>
        </div>
      </nav>
    </a-drawer>

    <a-drawer
      v-model:visible="hostsOpen"
      title="修改 HOSTS"
      placement="right"
      :width="drawerWidth"
      :bodyStyle="{ background: 'var(--fill)' }">
      <p class="fn-drawer-note">
        读写容器内 /etc/hosts。保存写回文件；导入 / 导出走 /vertex/data/hosts。结尾至少保留一个空行。
      </p>
      <a-textarea v-model:value="hosts" :rows="16"/>
      <div class="fn-drawer-actions">
        <a-button type="primary" @click="saveHosts">保存</a-button>
        <a-button @click="exportHosts">导出</a-button>
        <a-button @click="importHosts">导入</a-button>
      </div>
    </a-drawer>

    <fn-row-detail/>

    <a-drawer
      v-model:visible="proxyOpen"
      title="HTTP 代理"
      placement="right"
      :width="drawerWidth"
      :bodyStyle="{ background: 'var(--fill)' }">
      <a-input v-model:value="proxy" placeholder="http://192.168.1.1:8080" style="margin-bottom: 12px;"/>
      <p class="fn-drawer-note">走代理的域名，一行一个，需完全匹配。不支持绕过 Cloudflare 时使用。</p>
      <a-textarea v-model:value="domains" :rows="12" placeholder="www.baidu.com"/>
      <div class="fn-drawer-actions">
        <a-button type="primary" @click="saveProxy">保存</a-button>
      </div>
    </a-drawer>
  </div>
</template>

<script>
import { viewport } from '../mixins/responsive';
import FnRowDetail from '../components/FnRowDetail.vue';
import FnNoticeBell from '../components/FnNoticeBell.vue';
import { applyTheme } from '../util/theme';

const BARE_PATHS = ['/info/log', '/tool/clientLog'];
const BARE_PREFIXES = ['/tool/shell/'];

const TILES = {
  '/index': { bg: '#e8f6fd', color: '#00a0e9' },
  '/metric': { bg: '#e9f8ef', color: '#2db86c' },
  '/base': { bg: '#e8f6fd', color: '#00a0e9' },
  '/rule': { bg: '#fff4e5', color: '#e6a817' },
  '/task': { bg: '#f0e8fd', color: '#7c5cbf' },
  '/mix': { bg: '#e8f4f8', color: '#2a9bb5' },
  '/history': { bg: '#eeeef2', color: '#5b6573' },
  '/tool': { bg: '#eef1f8', color: '#5b6b8c' },
  '/guide': { bg: '#fff4e5', color: '#e6a817' },
  '/setting': { bg: '#eeeef2', color: '#5b6573' },
  '/info': { bg: '#e8f6fd', color: '#00a0e9' }
};

const TILES_DARK = {
  '/index': { bg: '#18485c', color: '#3db7f2' },
  '/metric': { bg: '#163226', color: '#3dcf7a' },
  '/base': { bg: '#18485c', color: '#3db7f2' },
  '/rule': { bg: '#3a3014', color: '#e8b84a' },
  '/task': { bg: '#2a2140', color: '#b39be6' },
  '/mix': { bg: '#16323e', color: '#5ec4d6' },
  '/history': { bg: '#1c2a32', color: '#9bb8c8' },
  '/tool': { bg: '#1a2836', color: '#8aa0c4' },
  '/guide': { bg: '#3a3014', color: '#e8b84a' },
  '/setting': { bg: '#1c2a32', color: '#9bb8c8' },
  '/info': { bg: '#18485c', color: '#3db7f2' }
};

export default {
  components: { FnRowDetail, FnNoticeBell },
  data () {
    return {
      selectedKeys: [],
      openKeys: [],
      mobileMenu: false,
      menu: [],
      dark: false,
      clock: '',
      clockTimer: null,
      runTimer: null,
      runInfo: {},
      hostsOpen: false,
      proxyOpen: false,
      hosts: '',
      proxy: '',
      domains: '',
      username: ''
    };
  },
  computed: {
    narrow () {
      return viewport.narrow;
    },
    compact () {
      return viewport.compact;
    },
    pageTitle () {
      return (this.$route.meta && this.$route.meta.title) || 'Vertex';
    },
    bareMode () {
      const path = (this.$route && this.$route.path) || '';
      const q = (this.$route && this.$route.query) || {};
      if (q.bare === '1' || q.bare === 'true') return true;
      if (this.$route.meta && this.$route.meta.bare) return true;
      if (BARE_PATHS.indexOf(path) !== -1) return true;
      return BARE_PREFIXES.some(prefix => path.indexOf(prefix) === 0);
    },
    contentWrapClass () {
      const p = this.$route.path;
      if (p === '/index' || p === '/') return 'fn-dash';
      return 'fn-sheet';
    },
    pageLoading () {
      return viewport.pageLoading;
    },
    visibleMenu () {
      return (this.menu || []).filter(item => !item.hidden);
    },
    menuDrawerWidth () {
      return Math.min(Math.max(viewport.width - 24, 260), 320);
    },
    drawerWidth () {
      if (this.narrow) return Math.min(viewport.width, 440);
      return 440;
    }
  },
  watch: {
    '$route.path' () {
      this.syncKeys();
    }
  },
  methods: {
    tileStyle (path) {
      const map = this.dark ? TILES_DARK : TILES;
      const key = Object.keys(map).find(k => path === k || path.startsWith(k + '/')) || '/index';
      const t = map[key];
      return { background: t.bg, color: t.color };
    },
    visibleSubs (item) {
      return (item.sub || []).filter(s => !s.hidden);
    },
    toggleGroup (path) {
      const i = this.openKeys.indexOf(path);
      if (i === -1) this.openKeys = [...this.openKeys, path];
      else this.openKeys = this.openKeys.filter(k => k !== path);
    },
    syncKeys () {
      this.selectedKeys = [this.$route.path];
      const keys = [];
      for (const item of this.menu.filter(item => item.sub)) {
        if (this.$route.path.startsWith(item.path)) keys.push(item.path);
      }
      this.openKeys = keys;
    },
    async goto (to) {
      if (to === '/tool/hosts') {
        this.openDrawer('hosts');
        return;
      }
      if (to === '/tool/proxy') {
        this.openDrawer('proxy');
        return;
      }
      if (BARE_PATHS.indexOf(to) !== -1 || BARE_PREFIXES.some(prefix => String(to).indexOf(prefix) === 0)) {
        const url = String(to).indexOf('?') === -1 ? `${to}?bare=1` : `${to}&bare=1`;
        window.open(url);
        return;
      }
      this.$goto(to, this.$router);
      setTimeout(() => this.syncKeys(), 100);
    },
    bareBack () {
      if (window.opener) {
        window.close();
        return;
      }
      this.$goto('/index', this.$router);
    },
    async gotoWiki () {
      window.open('https://wiki.vertex-app.top');
    },
    applyDarkFromDom () {
      this.dark = document.documentElement.classList.contains('dark');
    },
    toggleTheme () {
      applyTheme(this.dark ? 'light' : 'dark');
      this.applyDarkFromDom();
    },
    tick () {
      this.clock = new Date().toTimeString().slice(0, 8);
    },
    async refreshRunInfo () {
      try {
        const res = await this.$api().setting.getRunInfo();
        this.runInfo = res.data || {};
      } catch (e) {
        /* 页脚静默，避免刷屏 */
      }
    },
    onDrawerEvent (e) {
      this.openDrawer(e.detail);
    },
    async openDrawer (name) {
      if (name === 'hosts') {
        this.hostsOpen = true;
        try {
          const res = await this.$api().setting.getHosts();
          this.hosts = res.data;
        } catch (e) {
          await this.$message().error(e.message);
        }
      } else if (name === 'proxy') {
        this.proxyOpen = true;
        try {
          const res = await this.$api().setting.getProxy();
          this.domains = res.data.domains;
          this.proxy = res.data.proxy;
        } catch (e) {
          await this.$message().error(e.message);
        }
      }
    },
    async saveHosts () {
      try {
        await this.$api().setting.save({ hosts: this.hosts });
        await this.$message().success('保存成功');
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async exportHosts () {
      try {
        await this.$api().setting.export();
        await this.$message().success('导出成功');
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async importHosts () {
      try {
        await this.$api().setting.import();
        await this.$message().success('导入成功');
        const res = await this.$api().setting.getHosts();
        this.hosts = res.data;
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async saveProxy () {
      try {
        await this.$api().setting.saveProxy({ proxy: this.proxy, domains: this.domains });
        await this.$message().success('保存成功');
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async logout () {
      try {
        await this.$api().user.logout();
      } catch (e) {
        /* 会话失效也回登录页 */
      }
      window.location.replace('/user/login');
    }
  },
  async mounted () {
    this.applyDarkFromDom();
    this.tick();
    this.clockTimer = setInterval(this.tick, 1000);
    this.refreshRunInfo();
    this.runTimer = setInterval(this.refreshRunInfo, 15000);
    window.addEventListener('vertex-drawer', this.onDrawerEvent);
    window.addEventListener('vertex-theme', this.applyDarkFromDom);
    this.selectedKeys = [this.$route.path];
    try {
      const res = await this.$api().user.get();
      this.$message().success('欢迎回来');
      this.menu = res.data.menu;
      this.username = res.data.username || '';
      this.syncKeys();
    } catch (e) {
      if (String(e.message || '').indexOf('鉴权失效') !== -1) return;
      this.$message().error(e.message);
    }
  },
  beforeUnmount () {
    clearInterval(this.clockTimer);
    clearInterval(this.runTimer);
    window.removeEventListener('vertex-drawer', this.onDrawerEvent);
    window.removeEventListener('vertex-theme', this.applyDarkFromDom);
  }
};
</script>
<style scoped>
</style>
