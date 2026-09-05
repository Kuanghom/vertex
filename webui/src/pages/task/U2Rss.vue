<template>
  <div style="font-size: 24px; font-weight: bold;">U2 RSS</div>
  <a-divider></a-divider>
  <div class="u2-rss">
    <a-alert type="info" show-icon style="margin-bottom: 16px;">
      <template #message>说明</template>
      <template #description>
        将 U2 魔法接口（或群聊区兜底）转换为标准 RSS XML，供 Vertex RSS 任务订阅。
        RSS 地址需携带鉴权 Token；优先使用魔法 API，失败时自动改用 Cookie 抓取群聊区。
      </template>
    </a-alert>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px; margin-bottom: 12px;">配置</div>
    <a-form
      labelAlign="right"
      :labelWrap="true"
      :model="form"
      size="small"
      @finish="saveSetting"
      :labelCol="{ span: 4 }"
      :wrapperCol="{ span: 20 }"
      autocomplete="off"
      :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
      <a-form-item label="启用" name="enable">
        <a-checkbox v-model:checked="form.enable">启用 U2 RSS</a-checkbox>
      </a-form-item>
      <a-form-item label="RSS 标题" name="alias">
        <a-input v-model:value="form.alias" placeholder="U2 魔法 RSS"/>
      </a-form-item>
      <a-form-item label="魔法 API 域名" name="kysdDomain" extra="默认 https://u2.kysdm.com">
        <a-input v-model:value="form.kysdDomain"/>
      </a-form-item>
      <a-form-item label="站点域名" name="webDomain" extra="默认 https://u2.dmhy.org">
        <a-input v-model:value="form.webDomain"/>
      </a-form-item>
      <a-form-item label="UID" name="uid" extra="U2 用户 ID，魔法 API 必填">
        <a-input v-model:value="form.uid"/>
      </a-form-item>
      <a-form-item label="API Token" name="apiToken" extra="U2 私有 API Token，留空则仅使用 Cookie 兜底">
        <a-input
          v-model:value="form.apiToken"
          :readonly="isSecretMasked('apiToken')"
          :class="{ 'secret-masked': isSecretMasked('apiToken') }"
          placeholder="未设置"
          @click="onSecretFieldClick('apiToken')">
          <template v-if="secretsSaved.apiToken" #suffix>
            <a class="secret-toggle" @click.stop="toggleSecret('apiToken')">
              {{ secretRevealed.apiToken ? '隐藏' : '查看' }}
            </a>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="Cookie" name="cookie" extra="站点 Cookie，API 不可用时用于群聊区/详情页兜底">
        <a-textarea
          v-model:value="form.cookie"
          :rows="3"
          :readonly="isSecretMasked('cookie')"
          :class="{ 'secret-masked': isSecretMasked('cookie') }"
          placeholder="nexusphp_u2=..."
          @click="onSecretFieldClick('cookie')"/>
        <a
          v-if="secretsSaved.cookie"
          class="secret-toggle secret-toggle-block"
          @click="toggleSecret('cookie')">
          {{ secretRevealed.cookie ? '隐藏' : '查看完整 Cookie' }}
        </a>
      </a-form-item>
      <a-form-item label="Passkey" name="passkey" extra="用于生成 RSS enclosure 下载链接">
        <a-input
          v-model:value="form.passkey"
          :readonly="isSecretMasked('passkey')"
          :class="{ 'secret-masked': isSecretMasked('passkey') }"
          placeholder="未设置"
          @click="onSecretFieldClick('passkey')">
          <template v-if="secretsSaved.passkey" #suffix>
            <a class="secret-toggle" @click.stop="toggleSecret('passkey')">
              {{ secretRevealed.passkey ? '隐藏' : '查看' }}
            </a>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="优先 API" name="preferApi">
        <a-checkbox v-model:checked="form.preferApi">优先使用魔法 API，失败时自动群聊区兜底</a-checkbox>
      </a-form-item>
      <a-form-item label="拉取数量" name="maximum" extra="默认 10 条，RSS 订阅与预览均按此数量拉取">
        <a-input size="small" v-model:value="form.maximum" style="width: 120px;"/>
      </a-form-item>
      <a-form-item label="魔法类型" name="promotionType">
        <a-select v-model:value="form.promotionType" style="width: 160px;">
          <a-select-option value="魔法">魔法</a-select-option>
          <a-select-option value="管理">管理</a-select-option>
          <a-select-option value="">全部</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="仅所有人" name="forAllOnly">
        <a-checkbox v-model:checked="form.forAllOnly">仅包含「所有人」魔法</a-checkbox>
      </a-form-item>
      <a-form-item label="最小上传倍率" name="minUpRate">
        <a-input size="small" v-model:value="form.minUpRate" style="width: 120px;"/>
      </a-form-item>
      <a-form-item label="最大下载倍率" name="maxDownRate">
        <a-input size="small" v-model:value="form.maxDownRate" style="width: 120px;"/>
      </a-form-item>
      <a-form-item label="忽略发布者" name="ignoreUserNames" extra="多个用户名用英文逗号分隔">
        <a-input v-model:value="form.ignoreUserNamesText"/>
      </a-form-item>
      <a-form-item label="种子大小" extra="0 表示不限制">
        <a-input-group compact>
          <a-input size="small" v-model:value="form.torrentMinSizeGiB" style="width: 100px;" placeholder="最小"/>
          <a-input size="small" style="width: 28px; pointer-events: none; text-align: center;" placeholder="~" disabled />
          <a-input size="small" v-model:value="form.torrentMaxSizeGiB" style="width: 100px;" placeholder="最大"/>
          <a-select v-model:value="form.torrentSizeUnit" style="width: 88px">
            <a-select-option value="KiB">KiB</a-select-option>
            <a-select-option value="MiB">MiB</a-select-option>
            <a-select-option value="GiB">GiB</a-select-option>
          </a-select>
        </a-input-group>
      </a-form-item>
      <a-form-item label="最大做种数" name="maxSeeders" extra="0 表示不限制">
        <a-input size="small" v-model:value="form.maxSeeders" style="width: 120px;"/>
      </a-form-item>
      <a-form-item label="RSS 地址" extra="复制到 RSS 任务中使用，链接含鉴权 Token">
        <a-input-group compact>
          <a-input v-model:value="rssUrl" readonly style="width: calc(100% - 180px);"/>
          <a-button @click="copyRssUrl">复制</a-button>
          <a-button @click="openRssUrl">打开</a-button>
        </a-input-group>
      </a-form-item>
      <a-form-item :wrapperCol="isMobile() ? { span: 24 } : { span: 20, offset: 4 }">
        <div class="fn-btn-row">
          <a-button type="primary" html-type="submit" :loading="saving">保存配置</a-button>
          <a-button :loading="previewLoading" @click="previewFeed">预览</a-button>
          <a-button @click="regenerateToken">重置 RSS Token</a-button>
        </div>
      </a-form-item>
    </a-form>
    <a-divider></a-divider>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px; margin-bottom: 12px;">
      预览结果
      <span v-if="previewInfo.source" style="font-size: 13px; font-weight: normal; margin-left: 12px;">
        数据源: {{ previewInfo.source }} | 条目: {{ previewInfo.count }}
      </span>
    </div>
    <a-table
      :columns="asCardColumns(previewColumns)"
      :data-source="previewItems"
      size="small"
      :pagination="false"
      :scroll="boundScroll(960)">
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'torrentName'">
          <a class="torrent-name-link" @click.prevent="openLink(record.link)">{{ record.torrentName }}</a>
        </template>
        <template v-if="column.dataIndex === 'size'">
          {{ record.size ? $formatSize(record.size) : '-' }}
        </template>
        <template v-if="column.dataIndex === 'ratio'">
          UP {{ record.upRate ?? '?' }} / DN {{ record.downRate ?? '?' }}
        </template>
        <template v-if="column.dataIndex === 'createdTime'">
          {{ record.createdTime || '-' }}
        </template>
      </template>
    </a-table>
  </div>
</template>
<script>
import { unitFactor } from '../../util/sizeUnit';

const GIB = 1024 * 1024 * 1024;
const SECRET_FIELDS = ['apiToken', 'cookie', 'passkey'];

const maskSecret = (value) => {
  if (!value) return '';
  const str = String(value);
  if (str.length <= 6) return '***';
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
};

const defaultSecretState = () => ({
  apiToken: false,
  cookie: false,
  passkey: false
});

const defaultSecretsSaved = () => ({
  apiToken: false,
  cookie: false,
  passkey: false
});

const defaultSecretFull = () => ({
  apiToken: '',
  cookie: '',
  passkey: ''
});

const defaultU2RssForm = () => ({
  enable: true,
  alias: 'U2 魔法 RSS',
  kysdDomain: 'https://u2.kysdm.com',
  webDomain: 'https://u2.dmhy.org',
  uid: '',
  apiToken: '',
  cookie: '',
  passkey: '',
  preferApi: true,
  maximum: 10,
  promotionType: '魔法',
  forAllOnly: true,
  minUpRate: 1,
  maxDownRate: 0,
  ignoreUserNamesText: '',
  torrentMinSizeGiB: 0,
  torrentMaxSizeGiB: 0,
  torrentSizeUnit: 'GiB',
  maxSeeders: 0
});

export default {
  data () {
    return {
      saving: false,
      previewLoading: false,
      rssUrl: '',
      previewInfo: {},
      previewItems: [],
      form: defaultU2RssForm(),
      secretRevealed: defaultSecretState(),
      secretsSaved: defaultSecretsSaved(),
      secretFull: defaultSecretFull(),
      previewColumns: [
        { title: '种子 ID', dataIndex: 'torrentId', width: 16 },
        { title: '种子名称', dataIndex: 'torrentName', width: 120 },
        { title: '发布者', dataIndex: 'userName', width: 24 },
        { title: '类型', dataIndex: 'promotionType', width: 16 },
        { title: '魔法时间', dataIndex: 'createdTime', width: 36 },
        { title: '倍率', dataIndex: 'ratio', width: 24 },
        { title: '大小', dataIndex: 'size', width: 20 },
        { title: '做种', dataIndex: 'seeders', width: 12 }
      ]
    };
  },
  methods: {
    isMobile () {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    defaultForm () {
      return defaultU2RssForm();
    },
    toNumber (value, fallback) {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    },
    buildPayload () {
      const factor = unitFactor(this.form.torrentSizeUnit || 'GiB');
      const payload = {
        ...this.form,
        ignoreUserNames: this.form.ignoreUserNamesText,
        torrentMinSize: Math.round((+this.form.torrentMinSizeGiB || 0) * factor),
        torrentMaxSize: Math.round((+this.form.torrentMaxSizeGiB || 0) * factor)
      };
      delete payload.torrentMinSizeGiB;
      delete payload.torrentMaxSizeGiB;
      delete payload.torrentSizeUnit;
      delete payload.ignoreUserNamesText;
      return payload;
    },
    resetSecretState () {
      this.secretRevealed = defaultSecretState();
      this.secretsSaved = defaultSecretsSaved();
      this.secretFull = defaultSecretFull();
    },
    isSecretMasked (field) {
      return this.secretsSaved[field] && !this.secretRevealed[field];
    },
    onSecretFieldClick (field) {
      if (this.isSecretMasked(field)) {
        this.revealSecret(field);
      }
    },
    async revealSecret (field) {
      if (!this.secretsSaved[field]) return;
      try {
        if (!this.secretFull.apiToken && !this.secretFull.cookie && !this.secretFull.passkey) {
          const res = await this.$api().u2Rss.reveal();
          this.secretFull = {
            apiToken: res.data?.apiToken || '',
            cookie: res.data?.cookie || '',
            passkey: res.data?.passkey || ''
          };
        }
        this.form[field] = this.secretFull[field] || '';
        this.secretRevealed[field] = true;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    hideSecret (field) {
      this.secretFull[field] = this.form[field];
      this.form[field] = maskSecret(this.form[field]);
      this.secretRevealed[field] = false;
    },
    async toggleSecret (field) {
      if (this.secretRevealed[field]) {
        this.hideSecret(field);
      } else {
        await this.revealSecret(field);
      }
    },
    fillForm (data = {}) {
      const defaults = this.defaultForm();
      this.resetSecretState();
      this.form = {
        ...defaults,
        enable: data.enable !== undefined ? !!data.enable : defaults.enable,
        alias: data.alias || defaults.alias,
        kysdDomain: data.kysdDomain || defaults.kysdDomain,
        webDomain: data.webDomain || defaults.webDomain,
        uid: data.uid || '',
        apiToken: data.apiToken || '',
        cookie: data.cookie || '',
        passkey: data.passkey || '',
        preferApi: data.preferApi !== undefined ? !!data.preferApi : defaults.preferApi,
        maximum: this.toNumber(data.maximum, defaults.maximum),
        promotionType: data.promotionType !== undefined ? data.promotionType : defaults.promotionType,
        forAllOnly: data.forAllOnly !== undefined ? !!data.forAllOnly : defaults.forAllOnly,
        minUpRate: this.toNumber(data.minUpRate, defaults.minUpRate),
        maxDownRate: this.toNumber(data.maxDownRate, defaults.maxDownRate),
        maxSeeders: this.toNumber(data.maxSeeders, defaults.maxSeeders),
        ignoreUserNamesText: Array.isArray(data.ignoreUserNames)
          ? data.ignoreUserNames.join(',')
          : (data.ignoreUserNames || defaults.ignoreUserNamesText),
        torrentSizeUnit: 'GiB',
        torrentMinSizeGiB: data.torrentMinSize
          ? +(data.torrentMinSize / GIB).toFixed(2)
          : defaults.torrentMinSizeGiB,
        torrentMaxSizeGiB: data.torrentMaxSize
          ? +(data.torrentMaxSize / GIB).toFixed(2)
          : defaults.torrentMaxSizeGiB
      };
      SECRET_FIELDS.forEach((field) => {
        if (this.form[field]) {
          this.secretsSaved[field] = true;
        }
      });
      this.rssUrl = data.rssUrl || this.rssUrl;
    },
    async loadSetting () {
      try {
        const res = await this.$api().u2Rss.get();
        this.fillForm(res.data || {});
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async saveSetting () {
      this.saving = true;
      try {
        const res = await this.$api().u2Rss.save(this.buildPayload());
        this.fillForm(res.data || {});
        this.$message().success(res.message || '保存成功');
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.saving = false;
      }
    },
    async previewFeed () {
      this.previewLoading = true;
      try {
        const res = await this.$api().u2Rss.preview(this.buildPayload());
        this.previewInfo = res.data || {};
        this.previewItems = res.data?.items || [];
        this.$message().success(`预览完成，共 ${res.data?.count || 0} 条`);
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.previewLoading = false;
      }
    },
    async regenerateToken () {
      try {
        const res = await this.$api().u2Rss.regenerateToken();
        this.fillForm(res.data || {});
        this.$message().success(res.message || 'RSS Token 已重置');
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async copyText (text, successMessage) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        this.$message().success(successMessage);
      } catch (e) {
        this.$message().error(`复制失败: ${e.message}`);
      }
    },
    async copyRssUrl () {
      if (!this.rssUrl) {
        return this.$message().warning('请先保存配置');
      }
      await this.copyText(this.rssUrl, 'RSS 地址已复制');
    },
    openRssUrl () {
      if (!this.rssUrl) {
        return this.$message().warning('请先保存配置');
      }
      window.open(this.rssUrl);
    },
    openLink (link) {
      if (link) window.open(link);
    }
  },
  mounted () {
    this.loadSetting();
  }
};
</script>
<style scoped>
.u2-rss {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}
.torrent-name-link {
  color: inherit;
  text-decoration: none;
}
.torrent-name-link:hover {
  color: inherit;
  text-decoration: none;
}
.secret-masked {
  cursor: pointer;
}
.secret-toggle {
  font-size: 12px;
  user-select: none;
}
.secret-toggle-block {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
}
</style>
