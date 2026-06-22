<template>
  <div style="font-size: 24px; font-weight: bold;">站点扩展</div>
  <a-divider></a-divider>
  <div class="scrape">
    <a-alert
      type="info"
      show-icon
      message="站点抓取扩展用于 RSS 任务的“抓取免费”和“排除 HR”判断。开启 RSS 任务中的对应开关后，会优先使用这里配置的站点脚本。"
      style="margin-bottom: 16px;"
    />
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="columns"
      size="small"
      :data-source="scripts"
      :pagination="false"
      :scroll="{ x: 720 }"
    >
      <template #title>
        <span style="font-size: 16px; font-weight: bold;">站点抓取扩展列表</span>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <a-tag color="success" v-if="record.enable">启用</a-tag>
          <a-tag color="error" v-if="!record.enable">禁用</a-tag>
        </template>
        <template v-if="column.title === '操作'">
          <span>
            <a @click="modifyClick(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popover title="删除?" trigger="click" :overlayStyle="{ width: '84px', overflow: 'hidden' }">
              <template #content>
                <a-button type="primary" danger @click="deleteScript(record)" size="small">删除</a-button>
              </template>
              <a style="color: red">删除</a>
            </a-popover>
          </span>
        </template>
      </template>
    </a-table>
    <a-divider></a-divider>
    <div style="font-size: 16px; font-weight: bold; padding-left: 8px;">新增 | 编辑站点抓取扩展</div>
    <div style="text-align: left; ">
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="script"
        size="small"
        @finish="modifyScript"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给站点抓取扩展取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="script.alias"/>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用站点抓取扩展"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox v-model:checked="script.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="站点 Host"
          name="siteHost"
          extra="例如 dstudio.me。多个 host 使用英文逗号分隔"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="script.siteHost"/>
        </a-form-item>
        <a-form-item
          label="免费判断"
          name="freeScript"
          extra="返回 async function (ctx) { ... }，返回 true 表示免费。不需要免费判断时可留空。">
          <a-textarea size="small" v-model:value="script.freeScript" :rows="8"/>
        </a-form-item>
        <a-form-item
          label="HR 判断"
          name="hrScript"
          extra="返回 async function (ctx) { ... }，返回 true 表示 H&R。不需要 HR 判断时可留空。">
          <a-textarea size="small" v-model:value="script.hrScript" :rows="8"/>
        </a-form-item>
        <a-form-item
          :wrapperCol="isMobile() ? { span:24 } : { span: 21, offset: 3 }">
          <a-button type="primary" html-type="submit" style="margin-top: 24px; margin-bottom: 48px;">应用 | 完成</a-button>
          <a-button style="margin-left: 12px; margin-top: 24px; margin-bottom: 48px;" @click="clearScript()">清空</a-button>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 18,
        fixed: true
      }, {
        title: '别名',
        dataIndex: 'alias',
        width: 24
      }, {
        title: 'Host',
        dataIndex: 'siteHost',
        width: 36
      }, {
        title: '启用',
        dataIndex: 'enable',
        width: 15
      }, {
        title: '操作',
        width: 24
      }
    ];
    return {
      columns,
      scripts: [],
      script: {},
      defaultScript: {
        enable: true,
        scriptType: 'scrape',
        siteHost: 'dstudio.me',
        freeScript: 'async function ({ document }) {\n  return !!document.querySelector(\'.details-title font.free, .details-title font.twoupfree, #top font.free, #top font.twoupfree\') || document.body.innerHTML.includes(\'全站 [Free] 生效中\')\n}',
        hrScript: 'async function ({ document }) {\n  return !!document.querySelector(\'img.hitandrun, img[alt="H&R"], img[title="H&R"]\')\n}'
      },
      loading: true
    };
  },
  methods: {
    isMobile () {
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
      } else {
        return false;
      }
    },
    async listScript () {
      this.loading = true;
      try {
        const res = await this.$api().script.list();
        this.scripts = res.data
          .map(item => ({ scriptType: 'cron', ...item }))
          .filter(item => item.scriptType === 'scrape');
      } catch (e) {
        this.$message().error(e.message);
      }
      this.loading = false;
    },
    async modifyScript () {
      try {
        await this.$api().script.modify({ ...this.script, scriptType: 'scrape' });
        this.$message().success((this.script.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        setTimeout(() => this.listScript(), 1000);
        this.clearScript();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    modifyClick (row) {
      this.script = { ...row, scriptType: 'scrape' };
    },
    async deleteScript (row) {
      try {
        await this.$api().script.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listScript();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    clearScript () {
      this.script = {
        ...this.defaultScript
      };
    }
  },
  async mounted () {
    this.clearScript();
    this.listScript();
  }
};
</script>
<style scoped>
.scrape {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
}
</style>
