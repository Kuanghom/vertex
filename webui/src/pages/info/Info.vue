<template>
  <div class="info fn-page">
    <div class="fn-page-title">系统信息</div>
    <a-descriptions
      title="交流群组"
      :column="{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }"
      >
      <a-descriptions-item label="Telegram 频道"><a @click="gotoChannel">前往</a></a-descriptions-item>
      <a-descriptions-item label="Telegram 群组"><a @click="gotoGroup">前往</a></a-descriptions-item>
      <a-descriptions-item label="交流群">852643057</a-descriptions-item>
    </a-descriptions>
    <a-divider></a-divider>
    <a-descriptions
      title="开源代码"
      :column="{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }"
      >
      <a-descriptions-item label="开源代码">https://github.com/kuanghom/Vertex</a-descriptions-item>
    </a-descriptions>
    <a-divider></a-divider>
    <a-descriptions
      title="使用说明"
      :column="{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }"
      >
      <a-descriptions-item label="Wiki"><a @click="gotoWiki">Wiki</a></a-descriptions-item>
    </a-descriptions>
    <a-divider></a-divider>
    <a-descriptions
      title="版本信息"
      :column="{ xxl: 4, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 }"
      >
      <a-descriptions-item label="主版本">0.0.15.0</a-descriptions-item>
      <a-descriptions-item label="编译版本">0.0.15.0</a-descriptions-item>
      <a-descriptions-item label="发布时间">{{ version.updateTime }}</a-descriptions-item>
      <a-descriptions-item label="更新信息">界面优化：登录背景、列表拖列、主题即时生效、工具页与通知体验。</a-descriptions-item>
    </a-descriptions>
  </div>
</template>
<script>
export default {
  data () {
    return {
      version: {},
      runInfo: {}
    };
  },
  methods: {
    async getRunInfo () {
      try {
        const res = await this.$api().setting.getRunInfo();
        this.runInfo = res.data;
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async gotoChannel () {
      window.open('https://t.me/lswl_vertex');
    },
    async gotoGroup () {
      window.open('https://t.me/group_vertex');
    },
    async gotoWiki () {
      window.open('https://wiki.vertex-app.top');
    },
    async gotoVersion () {},
    async gotoGithub () {
      window.open('https://github.com/kuanghom/Vertex');
    },
    async gotoGitlab () {
      window.open('https://gitlab.lswl.in/lswl/vertex');
    }
  },
  async mounted () {
    this.getRunInfo();
    this.version = process.env.version;
  }
};
</script>
<style scoped>
.info {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
.fn-page-title {
  font-size: 22px;
  font-weight: 650;
  margin-bottom: 16px;
}
</style>
