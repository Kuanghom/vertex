<template>
  <a-config-provider :locale="zhCN" :getPopupContainer="popupContainer">
    <router-view></router-view>
  </a-config-provider>
</template>

<script>
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { applyTheme } from './util/theme';

export default {
  name: 'App',
  data () {
    return { zhCN };
  },
  mounted () {
    applyTheme();
    this._onThemeMq = () => applyTheme();
    this._mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (this._mq && this._mq.addEventListener) {
      this._mq.addEventListener('change', this._onThemeMq);
    }
  },
  beforeUnmount () {
    if (this._mq && this._mq.removeEventListener && this._onThemeMq) {
      this._mq.removeEventListener('change', this._onThemeMq);
    }
  },
  methods: {
    applyTheme,
    popupContainer () {
      return document.body;
    }
  }
};
</script>
<style lang="less">
@import '../public/assets/styles/light.less';

@font-face {
  font-family: 'consolas';
  src: url('../public/assets/fonts/consolas.woff');
}

body {
  font-family: var(--font), consolas, -apple-system, system-ui, BlinkMacSystemFont, Helvetica, Helvetica Neue, PingFang SC, 'Hiragino Sans GB',
    'Microsoft YaHei', '\u5fae\u8f6f\u96c5\u9ed1', '微软雅黑', Arial, sans-serif;
}

.container-form-mobile {
  border-radius: 10px;
  padding: 0;
}

.container-form-pc {
  border-radius: 10px;
  padding: 0;
}

img[lazy=loading] {
  object-fit: cover;
}

.ant-popover {
  z-index: 1055;
}
</style>
