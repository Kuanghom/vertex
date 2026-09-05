<template>
  <div class="fn-page">
  <div class="fn-inline-ctrl" style="font-size: 24px; font-weight: bold;">
    站点数据
    <a-radio-group v-model:value="siteSetting.theme" @change="handleRatioChange" name="theme">
      <a-radio value="card">卡片</a-radio>
      <a-radio value="list">列表</a-radio>
      <a-radio value="overview">总览</a-radio>
    </a-radio-group>
  </div>
  <a-divider></a-divider>
  <div class="site-metric" v-if="siteSetting.theme === 'card'">
    <div
      v-for="site of sites"
      :key="site.name"
      class="site-card-wrap"
      :class="{ 'is-narrow': isNarrow }">
      <div :class="['site-card', site.name === 'total' ? 'highlight-3' : 'highlight-2']">
        <div class="site-card-head">
          <div class="site-name">
            <img :src="site.icon || `/assets/icons/${site.name}.ico`" alt=""/>
            <span>{{ site.name === 'total' ? '总计' : site.name }}</span>
          </div>
          <div class="site-user" v-if="site.name !== 'total' && site.name !== '总计'">
            <span>{{ site.username || '—' }}</span>
            <span>{{ site.uid || '' }}</span>
          </div>
        </div>
        <div class="site-card-body">
          <div class="site-data">
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'arrow-up']"/></span>
              <span>上传</span>
              <b>{{ $formatSize(site.upload) }}</b>
            </div>
            <div class="site-row">
              <span class="down"><fa :icon="['fas', 'arrow-down']"/></span>
              <span>下载</span>
              <b>{{ $formatSize(site.download) }}</b>
            </div>
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'network-wired']"/></span>
              <span>连接</span>
              <b>{{ site.seeding }} / {{ site.leeching }}</b>
            </div>
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'hard-drive']"/></span>
              <span>做种</span>
              <b>{{ $formatSize(site.seedingSize) }}</b>
            </div>
          </div>
          <div class="site-inc-data">
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'arrow-up']"/></span>
              <span>昨日上传</span>
              <b>{{ $formatSize(incSize(site, 'yesterday', 'upload')) }}</b>
            </div>
            <div class="site-row">
              <span class="down"><fa :icon="['fas', 'arrow-down']"/></span>
              <span>昨日下载</span>
              <b>{{ $formatSize(incSize(site, 'yesterday', 'download')) }}</b>
            </div>
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'arrow-up']"/></span>
              <span>本周上传</span>
              <b>{{ $formatSize(incSize(site, 'week', 'upload')) }}</b>
            </div>
            <div class="site-row">
              <span class="down"><fa :icon="['fas', 'arrow-down']"/></span>
              <span>本周下载</span>
              <b>{{ $formatSize(incSize(site, 'week', 'download')) }}</b>
            </div>
            <div class="site-row">
              <span class="up"><fa :icon="['fas', 'arrow-up']"/></span>
              <span>本月上传</span>
              <b>{{ $formatSize(incSize(site, 'month', 'upload')) }}</b>
            </div>
            <div class="site-row">
              <span class="down"><fa :icon="['fas', 'arrow-down']"/></span>
              <span>本月下载</span>
              <b>{{ $formatSize(incSize(site, 'month', 'download')) }}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="site-metric" v-if="siteSetting.theme === 'list'">
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="displayColumns"
      size="small"
      :loading="loading"
      :data-source="sites"
      :pagination="false"
      :scroll="isNarrow ? {} : { x: tableScroll.x, y: scrollHeight }"
    >
      <template #title>
        <div class="fn-table-title">
          <span style="font-size: 16px; font-weight: bold;">站点数据</span>
          <fn-column-settings
            :items="columnSettingItems"
            @toggle="toggleColumnVisible"
            @move="moveColumn"
            @dragstart="onColumnDragStart"
            @drop="onColumnDrop"
            @reset="resetColumnPrefs"/>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <fn-entity
            :title="record.name === 'total' ? '总计' : record.name"
            :src="record.icon || `/assets/icons/${record.name}.ico`"
          />
        </template>
        <template v-if="['upload', 'download'].indexOf(column.dataIndex) !== -1">
          {{ $formatSize(record[column.dataIndex]) }}
        </template>
        <template v-if="column.dataIndex === 'ratio'">
          {{ (record.upload / record.download).toFixed(2) }}
        </template>
        <template v-if="['yesterday', 'today', 'week', 'month'].indexOf(column.dataIndex) !== -1">
          <div class="fn-io">
            <div><em class="up">上传</em>{{ $formatSize(siteIncrease[column.dataIndex][record.name].upload) }}</div>
            <div><em class="down">下载</em>{{ $formatSize(siteIncrease[column.dataIndex][record.name].download) }}</div>
          </div>
        </template>
      </template>
    </a-table>
  </div>
  <div class="site-metric" v-if="siteSetting.theme === 'overview'" style="text-align: center;">
    <div :class="`site-overview-${isMobile() ? 'mobile' : 'pc'}`">
      <div style="text-align: left; margin: 24px;">
        <a-form
          labelAlign="right"
          :labelWrap="true"
          :model="setting.siteInfo"
          size="small"
          @finish="modify"
          :labelCol="{ span: 4 }"
          :wrapperCol="{ span: 20 }"
          autocomplete="off"
          :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
          <a-form-item
            label="隐藏站点"
            name="hide"
            extra="在图中隐藏选中的站点">
            <a-checkbox-group style="width: 100%;" v-model:value="setting.siteInfo.hide">
              <a-row>
                <a-col v-for="site of sites.filter(item => item.name !== 'total')" :span="8" :key="site.name">
                  <a-checkbox  v-model:value="site.name">{{ site.name }}</a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
          </a-form-item>
          <a-form-item
            label="隐藏站点名称"
            name="hideName"
            extra="在图中隐藏选中的站点名称, 仍显示数据信息">
            <a-checkbox-group style="width: 100%;" v-model:value="setting.siteInfo.hideName">
              <a-row>
                <a-col v-for="site of sites.filter(item => item.name !== 'total')" :span="8" :key="site.name">
                  <a-checkbox  v-model:value="site.name">{{ site.name }}</a-checkbox>
                </a-col>
              </a-row>
            </a-checkbox-group>
          </a-form-item>
          <a-form-item
            label="水印"
            name="watermark"
            extra="在图中添加水印">
            <a-input size="small" v-model:value="setting.siteInfo.watermark"/>
          </a-form-item>
          <a-form-item
            :wrapperCol="isMobile() ? { span:24 } : { span: 20, offset: 4 }">
            <a-button type="primary" html-type="submit" style="margin-top: 24px; margin-bottom: 48px;">保存</a-button>
          </a-form-item>
        </a-form>
      </div>
    </div>
    <div :class="`site-overview-${isMobile() ? 'mobile' : 'pc'}`">
      <img :src="overviewSrc" style="max-width: 100%; margin: 0 auto;"/>
    </div>
  </div>
  </div>
</template>
<script>
import columnPrefs from '../../mixins/columnPrefs';

export default {
  mixins: [columnPrefs],
  data () {
    const columns = [
      {
        title: '站点',
        dataIndex: 'name',
        width: 48,
        fixed: true,
        sorter: (a, b) => a.name.localeCompare(b.name)
      }, {
        title: '上传',
        dataIndex: 'upload',
        width: 48,
        sorter: (a, b) => a.upload - b.upload
      }, {
        title: '下载',
        dataIndex: 'download',
        width: 48,
        sorter: (a, b) => a.download - b.download
      }, {
        title: '分享率',
        dataIndex: 'ratio',
        width: 32,
        sorter: (a, b) => (a.upload / a.download) - (b.upload / b.download)
      }, {
        title: '昨日增长',
        dataIndex: 'yesterday',
        width: 48,
        sorter: (a, b) => a.yesterday.upload - b.yesterday.upload
      }, {
        title: '今日增长',
        dataIndex: 'today',
        width: 48,
        sorter: (a, b) => a.today.upload - b.today.upload
      }, {
        title: '周增长',
        dataIndex: 'week',
        width: 48,
        sorter: (a, b) => a.week.upload - b.week.upload
      }, {
        title: '月增长',
        dataIndex: 'month',
        width: 48,
        sorter: (a, b) => a.month.upload - b.month.upload
      }
    ];
    return {
      siteSetting: {
        theme: ''
      },
      loading: true,
      columns,
      overviewSrc: '/api/site/overview',
      scrollHeight: 640,
      sites: [],
      siteIncrease: {},
      setting: {
        siteInfo: {
          hide: [],
          hideName: [],
          watermark: 'vertex'
        }
      }
    };
  },
  methods: {
    async listSite () {
      this.loading = true;
      try {
        const res = (await this.$api().site.list()).data;
        this.sites = res.siteList;
        this.siteIncrease = res.increase;
        if (this.sites[1]) {
          this.sites.unshift({
            name: 'total',
            icon: '/assets/images/logo.svg',
            upload: this.sites.map(item => +item.upload).reduce((a, b) => a + b),
            download: this.sites.map(item => +item.download).reduce((a, b) => a + b),
            seeding: this.sites.map(item => +item.seeding).reduce((a, b) => a + b),
            leeching: this.sites.map(item => +item.leeching).reduce((a, b) => a + b),
            seedingSize: this.sites.map(item => +item.seedingSize).reduce((a, b) => +a + +b)
          });
        }
        for (const site of this.sites) {
          site.yesterday = this.siteIncrease.yesterday[site.name];
          site.today = this.siteIncrease.today[site.name];
          site.week = this.siteIncrease.week[site.name];
          site.month = this.siteIncrease.month[site.name];
        }
      } catch (e) {
        await this.$message().error(e.message);
      }
      this.loading = false;
    },
    async get () {
      try {
        const s = (await this.$api().setting.get()).data;
        this.setting = {
          siteInfo: s.siteInfo || this.setting.siteInfo,
          trustVertexPanel: s.trustVertexPanel
        };
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async modify () {
      try {
        await this.$api().setting.modify(this.setting);
        await this.$message().success('修改成功, 部分设置可能需要刷新页面生效.');
        this.overviewSrc = '/api/site/overview?_=' + Math.random();
        this.get();
      } catch (e) {
        await this.$message().error(e.message);
      }
    },
    async gotoSiteOverview () {
      window.open('/api/site/overview');
    },
    incSize (site, period, key) {
      const block = (this.siteIncrease && this.siteIncrease[period]) || {};
      const row = block[site && site.name] || {};
      return row[key] || 0;
    },
    handleRatioChange () {
      if (this.siteSetting.theme === 'overview' && !this.setting.trustVertexPanel) {
        this.$message().error('未开启信任 Vertex Panel, 总览图可能无法显示');
      }
    }
    /*
    async listRecord () {
      try {
        const res = (await this.$api().site.listRecord()).data;
      } catch (e) {
        await this.$message().error(e.message);
      }
    }
    */
  },
  async mounted () {
    this.siteSetting.theme = this.isMobile() ? 'card' : 'list';
    this.listSite();
    this.get();
    this.scrollHeight = window.innerHeight - 32 - 38 - 49 - 41 - 60 - (this.isMobile() ? 60 : 0);
    window.onresize = () => {
      this.scrollHeight = window.innerHeight - 32 - 38 - 49 - 41 - 60 - (this.isMobile() ? 60 : 0);
    };
  }
};
</script>
<style scoped>
.site-metric {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}

.style-setting {
  height: calc(100% - 92px);
  width: 100%;
  max-width: none;
  margin: 0 auto;
  text-align: center;
}

.site-card-wrap {
  display: inline-block;
  width: 400px;
  max-width: 100%;
  vertical-align: top;
  margin: 0 12px 16px;
  text-align: left;
  box-sizing: border-box;
}
.site-card-wrap.is-narrow {
  display: block;
  width: 100%;
  margin: 0 0 12px;
}
@media (max-width: 960px) {
  .site-card-wrap {
    display: block;
    width: 100%;
    margin: 0 0 12px;
  }
  .site-card-body {
    grid-template-columns: 1fr;
  }
}
.site-card {
  width: 100%;
  height: auto;
  min-height: 0;
  overflow: visible;
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}
.highlight-2 {
  background: #e8f6fd;
}
.highlight-3 {
  background: #d4eef8;
}
html.dark .highlight-2 {
  background: #16323e;
}
html.dark .highlight-3 {
  background: #18485c;
}
html.dark .site-name,
html.dark .site-row {
  color: var(--text);
}
html.dark .site-user,
html.dark .site-row span:nth-child(2) {
  color: var(--text-2);
}
html.dark .site-name img {
  background: rgba(255, 255, 255, 0.08);
}
html.dark .site-row .up { color: #3dcf7a; }
html.dark .site-row .down { color: #f07178; }
.site-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.site-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #1f2329;
  font-size: 18px;
  font-weight: 650;
}
.site-name img {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(255,255,255,0.7);
  flex: 0 0 40px;
}
.site-user {
  flex: 0 0 auto;
  text-align: right;
  color: #646a73;
  font-size: 13px;
  line-height: 18px;
}
.site-user span {
  display: block;
}
.site-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}
.site-card-wrap.is-narrow .site-card-body {
  grid-template-columns: 1fr;
}
.site-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 26px;
  color: #1f2329;
  font-size: 14px;
}
.site-row span:nth-child(2) {
  color: #646a73;
}
.site-row b {
  margin-left: auto;
  font-weight: 600;
}
.site-row .up,
.site-row .down {
  width: 16px;
  display: grid;
  place-items: center;
  flex: 0 0 16px;
}
.site-row .up { color: #1f8f54; }
.site-row .down { color: #c43a40; }

.site-overview-pc {
  width: 50%; float: left;
}

.site-overview-mobile {
  width: 100%;
}
</style>
