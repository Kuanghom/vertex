<template>
  <div class="login">
    <div class="left-rect">
      <div class="logo">
        <img src="/assets/images/logo.svg"/>
      </div>
    </div>
    <div class="right-rect">
      <div class="logo">
        <img src="/assets/images/logo.svg"/>
      </div>
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="user"
        @finish="login"
        :labelCol="formCol.label"
        :wrapperCol="formCol.wrapper"
        autocomplete="off"
        class="login-form">
        <div class="login-title">
          <span>Vertex</span>
        </div>
        <div class="login-subtitle">
          <span>追剧刷流一体化工具</span>
        </div>
        <a-form-item
          label="用户名"
          name="username"
          :rules="[{ required: true, message: '用户名不能为空! ' }]">
          <a-input v-model:value="user.username"/>
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '密码不能为空! ' }]">
          <a-input-password v-model:value="user.password"/>
        </a-form-item>
        <a-form-item
          label="二步验证"
          name="otpPw">
          <a-input v-model:value="user.otpPw"/>
        </a-form-item>
        <a-form-item :wrapperCol="formCol.action">
          <a-button type="primary" html-type="submit" block class="login-submit">登录</a-button>
        </a-form-item>
        <a-form-item
          name="checked"
          :rules="[{ validator: async (rule, value) => { if (value) return; throw '需勾选我已阅读使用须知!' } }]"
          :wrapperCol="formCol.action">
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
</template>

<script>
export default {
  data () {
    return {
      user: {
        username: '',
        password: '',
        otpPw: '',
        checked: false
      },
      narrow: false
    };
  },
  computed: {
    formCol () {
      if (this.narrow) {
        return {
          label: { span: 24 },
          wrapper: { span: 24 },
          action: { span: 24 }
        };
      }
      return {
        label: { span: 6 },
        wrapper: { span: 16 },
        action: { offset: 6, span: 16 }
      };
    }
  },
  mounted () {
    this.updateNarrow();
    window.addEventListener('resize', this.updateNarrow);
    this.syncPageBackground();
  },
  beforeUnmount () {
    window.removeEventListener('resize', this.updateNarrow);
    document.body.style.backgroundColor = '';
  },
  methods: {
    updateNarrow () {
      this.narrow = window.innerWidth <= 800;
    },
    syncPageBackground () {
      const theme = document.querySelector('meta[name=vertex-theme]');
      const name = theme ? theme.content : '';
      const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const useDark = name === 'dark' || (name === 'follow' && systemDark);
      if (name !== 'cyber') {
        document.body.style.backgroundColor = useDark ? '#141414' : '#fff';
      }
    },
    async login (ee) {
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
.login {
  display: flex;
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);
  background: #fff;
  overflow: auto;
}

.left-rect {
  flex: 0 0 300px;
  background: #e18dac;
  display: flex;
  align-items: center;
  justify-content: center;
}

.left-rect > .logo {
  width: 180px;
}

.right-rect {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: #fff;
}

.right-rect > .logo {
  display: none;
  width: 120px;
  margin: 0 auto 8px;
}

.login-form {
  width: min(100%, 360px);
}

.login-title {
  margin: 12px auto 6px;
  font-size: 32px;
  width: fit-content;
  font-weight: bold;
}

.login-subtitle {
  margin: 6px auto 12px;
  font-size: 16px;
  width: fit-content;
  color: grey;
}

.login-submit {
  width: 100%;
  margin-top: 24px;
}

.login-link {
  color: #faad14;
}

.login-warn {
  color: red;
}

@media screen and (max-width: 800px) {
  .left-rect {
    display: none;
  }

  .right-rect {
    justify-content: flex-start;
    padding-top: 24px;
  }

  .right-rect > .logo {
    display: block;
  }
}

@media (prefers-color-scheme: dark) {
  .login,
  .right-rect {
    background: #141414;
    color: rgba(255, 255, 255, 0.85);
  }

  .login-subtitle {
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
