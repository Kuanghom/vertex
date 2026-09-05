<template>
  <div class="fn-page client-log-page">
    <div class="fn-log-head">
      <fa class="fn-log-head-ico" :icon="['fas', 'file-lines']"/>
      <h1>下载器日志</h1>
    </div>
    <fn-log-feed
      v-model:live="live"
      :entries="entries"
      :loading="loading"
      :empty-hint="emptyHint"
      :live-disabled="!clientId"
    >
      <template #tools>
        <a-select
          v-model:value="clientId"
          placeholder="选择下载器"
          class="fn-log-client"
          allowClear
          :loading="loading"
          :disabled="loading"
          @change="onClientChange"
        >
          <a-select-option v-for="item of downloaders" :key="item.id" :value="item.id">
            {{ item.alias }}
          </a-select-option>
        </a-select>
      </template>
      <template #actions>
        <button type="button" class="fn-log-refresh" :disabled="!clientId || loading" @click="refreshLog(false)">
          <fa :icon="['fas', 'rotate']"/>
          刷新
        </button>
      </template>
    </fn-log-feed>
  </div>
</template>
<script>
import { fromClientLogs } from '../../util/logFeed';
import logLive from '../../mixins/logLive';

export default {
  mixins: [logLive],
  data () {
    return {
      logs: [],
      downloaders: [],
      clientId: undefined,
      loading: false
    };
  },
  computed: {
    entries () {
      return fromClientLogs(this.logs);
    },
    emptyHint () {
      if (!this.clientId) return '选择下载器查看日志';
      return '暂无日志';
    }
  },
  watch: {
    '$route.query.id' (id) {
      if (id !== this.clientId) {
        this.applyClientId(id || undefined);
      }
    }
  },
  methods: {
    async listDownloader () {
      try {
        const res = await this.$api().downloader.list();
        this.downloaders = res.data
          .filter(item => item.enable)
          .sort((a, b) => a.alias.localeCompare(b.alias));
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    isEnabledClient (id) {
      return this.downloaders.some(item => item.id === id);
    },
    async applyClientId (id) {
      if (!id) {
        this.clientId = undefined;
        this.logs = [];
        return;
      }
      if (!this.isEnabledClient(id)) {
        this.clientId = undefined;
        this.logs = [];
        this.$message().warning('该下载器已禁用, 无法查看日志');
        if (this.$route.query.id) {
          this.$router.replace({ query: {} });
        }
        return;
      }
      this.clientId = id;
      await this.refreshLog(false);
    },
    canPollLog () {
      return !!this.clientId;
    },
    async refreshLog (silent) {
      if (!this.clientId) {
        this.logs = [];
        this.loading = false;
        return;
      }
      if (!silent || !this.logs.length) this.loading = true;
      try {
        const res = await this.$api().downloader.getLogs(this.clientId);
        this.logs = (res.data || []).slice().reverse();
      } catch (e) {
        if (!silent) this.$message().error(e.message);
      } finally {
        this.loading = false;
      }
    },
    onClientChange (id) {
      this.$router.replace({ query: id ? { id } : {} });
      this.applyClientId(id);
    }
  },
  async mounted () {
    await this.listDownloader();
    if (this.$route.query.id) {
      await this.applyClientId(this.$route.query.id);
    }
  }
};
</script>
<style scoped>
.client-log-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(var(--vh, 1vh) * 100 - 120px);
}
.fn-log-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.fn-log-head-ico {
  color: var(--blue);
  font-size: 16px;
}
.fn-log-head h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}
.fn-log-client {
  width: 220px;
  max-width: 100%;
}
.fn-log-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: var(--blue-soft);
  color: var(--blue);
  cursor: pointer;
}
.fn-log-refresh:hover:not(:disabled) {
  background: var(--blue);
  color: #fff;
}
.fn-log-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media (max-width: 960px) {
  .fn-log-client {
    width: 100%;
  }
}
</style>
