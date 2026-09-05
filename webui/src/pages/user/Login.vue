<template>
  <div class="fn-login-page" :class="'is-tone-' + scene.tone + ' is-id-' + scene.id">
    <div class="fn-login-scene" aria-hidden="true">
      <video
        v-if="scene.kind === 'video' && !reduceMotion"
        ref="bgMedia"
        class="fn-login-media"
        autoplay
        muted
        loop
        playsinline
        :poster="scene.poster"
        :src="scene.src"
      ></video>
      <img
        v-else
        class="fn-login-media"
        :src="mediaSrc"
        alt=""
      />
      <div v-if="scene.petals && !reduceMotion" class="fn-login-petals">
        <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
      </div>
      <div class="fn-login-wash"></div>
    </div>
    <div class="fn-login-visual" aria-hidden="true">
      <div class="fn-login-verse">
        <p class="fn-login-quote">
          <span class="fn-login-line">靜斂微光修遠路，</span>
          <span class="fn-login-line is-offset">遙隨鴻跡渡滄波</span>
        </p>
        <p class="fn-login-sign">-- KuanghomCheng</p>
      </div>
    </div>
    <div class="fn-login-panel">
      <div class="fn-login-card">
        <div class="fn-brand" style="margin-bottom: 8px;">
          <img src="/assets/images/logo.svg" alt=""/>
          Vertex
        </div>
        <a-form
          :model="user"
          @finish="login"
          layout="vertical"
          autocomplete="off">
          <h1 class="fn-login-title">登录</h1>
          <p class="fn-login-sub">追剧刷流一体化工具</p>
          <a-form-item
            label="用户名"
            name="username"
            :rules="[{ required: true, message: '用户名不能为空! ' }]">
            <a-input v-model:value="user.username" size="large"/>
          </a-form-item>
          <a-form-item
            label="密码"
            name="password"
            :rules="[{ required: true, message: '密码不能为空! ' }]">
            <a-input-password v-model:value="user.password" size="large"/>
          </a-form-item>
          <a-form-item label="二步验证" name="otpPw">
            <a-input v-model:value="user.otpPw" size="large"/>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" block size="large">登录</a-button>
          </a-form-item>
          <a-form-item
            name="checked"
            :rules="[{ validator: async (rule, value) => { if (value) return; throw '需勾选我已阅读使用须知!' } }]">
            <a-checkbox v-model:checked="user.checked">
              我已阅读
              <a class="login-link" @click="openRegulation">《使用须知》</a>
              <br>
              并且知道遇到问题先去看
              <a class="login-link" @click="openWiki">Wiki</a>
              <br>
              否则在交流群提问可能被
              <span class="login-warn">禁言</span>
            </a-checkbox>
          </a-form-item>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script>
const LOGIN_SCENES = [
  { id: 'anime-rooftop', kind: 'video', src: '/assets/login-bg/anime-rooftop.mp4', poster: '/assets/login-bg/anime-rooftop.jpg', tone: 'dark', petals: false },
  { id: 'cyber-alley', kind: 'video', src: '/assets/login-bg/cyber-alley.mp4', poster: '/assets/login-bg/cyber-alley.jpg', tone: 'dark', petals: false },
  { id: 'landscape-huangshan', kind: 'video', src: '/assets/login-bg/landscape-huangshan.mp4', poster: '/assets/login-bg/landscape-huangshan.jpg', tone: 'light', petals: false },
  { id: 'space-orbit', kind: 'video', src: '/assets/login-bg/space-orbit.mp4', poster: '/assets/login-bg/space-orbit.jpg', tone: 'dark', petals: false },
  { id: 'tech-quantum', kind: 'video', src: '/assets/login-bg/tech-quantum.mp4', poster: '/assets/login-bg/tech-quantum.jpg', tone: 'dark', petals: false },
  { id: 'sakura', kind: 'video', src: '/assets/login-bg/sakura.mp4', poster: '/assets/login-bg/sakura.jpg', tone: 'light', petals: true },
  { id: 'waves', kind: 'video', src: '/assets/login-bg/waves.mp4', poster: '/assets/login-bg/waves.jpg', tone: 'light', petals: false },
  { id: 'mountains', kind: 'video', src: '/assets/login-bg/mountains.mp4', poster: '/assets/login-bg/mountains.jpg', tone: 'light', petals: false },
  { id: 'city', kind: 'video', src: '/assets/login-bg/city.mp4', poster: '/assets/login-bg/city.jpg', tone: 'dark', petals: false }
];

export default {
  data () {
    return {
      reduceMotion: false,
      scene: LOGIN_SCENES[0],
      user: {
        username: '',
        password: '',
        otpPw: '',
        checked: false
      }
    };
  },
  computed: {
    mediaSrc () {
      if (this.reduceMotion || this.scene.kind === 'video') return this.scene.poster;
      return this.scene.src;
    }
  },
  created () {
    this.reduceMotion = typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pick = typeof location !== 'undefined' && new URLSearchParams(location.search).get('bg');
    this.scene = LOGIN_SCENES.find(item => item.id === pick) ||
      LOGIN_SCENES[Math.floor(Math.random() * LOGIN_SCENES.length)];
  },
  mounted () {
    this.syncScenePlay = () => {
      const video = this.$refs.bgMedia;
      if (video) {
        if (document.hidden) video.pause();
        else video.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this.syncScenePlay);
  },
  beforeDestroy () {
    document.removeEventListener('visibilitychange', this.syncScenePlay);
  },
  methods: {
    async login () {
      try {
        await this.$api().user.login(this.user.username, this.user.password, this.user.otpPw);
        this.$goto('/index', this.$router);
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openRegulation () {
      window.open('https://wiki.vertex-app.top/zh/misc/regulations');
    },
    openWiki () {
      window.open('https://wiki.vertex-app.top/zh/misc/faq');
    }
  }
};
</script>

<style scoped>
.login-link { color: #7fd4ff; }
.login-warn { color: #ffb4b8; }
</style>
