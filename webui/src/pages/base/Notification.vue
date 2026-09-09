<template>
  <div class="notification fn-page">
    <fn-filter :active="listSearchActive" title="搜索">
      <fn-list-search
        v-model:query="listQuery"
        v-model:enable="listEnable"
        placeholder="别名 / 类型"
        @reset="resetListSearch"/>
      <template #toolbar>
        <a-button type="primary" @click="openCreate">新增</a-button>
        <fn-column-settings
          :items="columnSettingItems"
          @toggle="toggleColumnVisible"
          @move="moveColumn"
          @dragstart="onColumnDragStart"
          @drop="onColumnDrop"
          @reset="resetColumnPrefs"/>
      </template>
    </fn-filter>
    <a-table
      :style="`font-size: ${isMobile() ? '12px': '14px'};`"
      :columns="tableColumns"
      :loading="loading"
      :locale="tableLocale"
      size="middle"
      :data-source="filterAdminList(notifications, ['alias', 'id', 'type'])"
      :pagination="listPagination"
      :scroll="tableScroll"
      :customRow="listCustomRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'enable'">
          <a-tag color="success" v-if="record.enable">启用</a-tag>
          <a-tag color="error" v-if="!record.enable">禁用</a-tag>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <a-tag color="success" v-if="record.status">正常</a-tag>
          <a-tag color="error" v-if="!record.status">异常</a-tag>
        </template>
        <template v-if="column.dataIndex === 'type'">
          {{ typeLabel(record.type) }}
        </template>
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="modifyClick(record)">编辑</a-button>
            <a-popconfirm title="确认删除这条数据？" ok-text="删除" cancel-text="取消" @confirm="deleteNotification(record)">
              <a-button type="link" danger>删除</a-button>
            </a-popconfirm>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="formModalTitle"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="notification"
        size="small"
        @finish="modifyNotification"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给通知工具取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.alias"/>
        </a-form-item>
        <a-form-item
          label="错误推送上限"
          name="maxErrorCount"
          extra="单个周期内推送错误信息次数上限, 仅计算错误信息推送, 留空为 100">
          <a-input size="small" v-model:value="notification.maxErrorCount"/>
        </a-form-item>
        <a-form-item
          label="重置周期"
          name="clearCountCron"
          extra="Crontab 表达式, 在每次触发时重置推送错误信息次数为 0, 留空为 0 * * * *">
          <a-input size="small" v-model:value="notification.clearCountCron"/>
        </a-form-item>
        <a-form-item
          label="类型"
          name="type"
          extra="钉钉、IYUU、企业微信群机器人已由后端直接发送，无需再走通用 Webhook"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-select size="small" v-model:value="notification.type"  >
            <a-select-option value="telegram">Telegram</a-select-option>
            <a-select-option value="wechat">企业微信应用</a-select-option>
            <a-select-option value="wecom">企业微信群机器人</a-select-option>
            <a-select-option value="dingtalk">钉钉群机器人</a-select-option>
            <a-select-option value="iyuu">IYUU</a-select-option>
<a-select-option value="slack">Slack</a-select-option>
            <a-select-option value="ntfy">Ntfy</a-select-option>
            <a-select-option value="webhook">Webhook</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'wechat'"
          label="企业 ID"
          name="corpid"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.corpid"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'wechat'"
          label="Agent ID"
          name="agentid"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.agentid"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'wechat'"
          label="Secret"
          name="corpsecret"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.corpsecret"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'wechat'"
          label="ProxyKey"
          name="proxyKey">
          <a-input size="small" v-model:value="notification.proxyKey"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'telegram'"
          label="机器人 Token"
          name="telegramBotToken"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.telegramBotToken"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'telegram'"
          label="频道 ID"
          name="telegramChannel"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.telegramChannel"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'ntfy'"
          label="Ntfy URL"
          name="ntfyUrl"
          extra="格式: https://ntfy.sh/mytopic"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.ntfyUrl"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'ntfy'"
          label="用户名"
          name="ntfyUsername">
          <a-input size="small" v-model:value="notification.ntfyUsername"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'ntfy'"
          label="密码"
          name="ntfyPassword">
          <a-input size="small" v-model:value="notification.ntfyPassword"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'ntfy'"
          label="Token"
          name="ntfyToken"
          extra="使用Token或用户名+密码进行认证">
          <a-input size="small" v-model:value="notification.ntfyToken"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'ntfy'"
          label="优先级"
          name="ntfyPriority"
          extra="5最高, 1最低, 不填写为默认值3">
          <a-input size="small" v-model:value="notification.ntfyPriority"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'slack'"
          label="Webhook"
          name="slackWebhook"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.slackWebhook"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'slack'"
          label="Token"
          name="slackToken"
          extra="如果仅使用推送通知功能，可随意填写内容"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.slackToken"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'wecom'"
          label="Webhook"
          name="wecomWebhook"
          extra="完整地址，或只填 key"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.wecomWebhook" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= 或 key"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'dingtalk'"
          label="Webhook"
          name="dingtalkWebhook"
          extra="钉钉群机器人 Webhook 地址"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.dingtalkWebhook" placeholder="https://oapi.dingtalk.com/robot/send?access_token="/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'dingtalk'"
          label="加签密钥"
          name="dingtalkSecret"
          extra="安全设置为加签时填写，未开启可留空">
          <a-input size="small" v-model:value="notification.dingtalkSecret"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'iyuu'"
          label="Token"
          name="iyuuToken"
          extra="IYUU 令牌，在 iyuu.cn 扫码获取"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.iyuuToken" placeholder="IYUU…"/>
        </a-form-item>
<a-form-item
          v-if="notification.type === 'webhook'"
          label="Url"
          name="webhookurl"
          extra="通用 Webhook 地址。推送含敏感信息，请保证地址可信"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.webhookurl"/>
        </a-form-item>
        <a-form-item
          v-if="notification.type === 'webhook'"
          label="Token"
          name="token"
          extra="在请求时会将 token 放入请求头的 x-vertex-token 中"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="notification.token"/>
        </a-form-item>
        <a-form-item
          label="推送类型"
          name="pushType"
          extra="只有已被勾选的项目才会推送"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox-group style="width: 100%;" v-model:value="notification.pushType">
            <a-row>
              <a-col v-for="type of pushType" :span="8" :key="type.key">
                <a-checkbox  v-model:value="type.key">{{ type.value }}</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button style="margin-left: 12px;" @click="closeForm">取消</a-button>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script>
import adminCrud from '../../mixins/adminCrud';

export default {
  mixins: [adminCrud],
  data () {
    const columns = [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 18,
        sorter: (a, b) => a.id.localeCompare(b.id),
        fixed: true
      }, {
        title: '别名',
        dataIndex: 'alias',
        sorter: (a, b) => a.alias.localeCompare(b.alias),
        defaultSortOrder: 'ascend',
        width: 30
      }, {
        title: '推送类型',
        dataIndex: 'type',
        width: 30
      }, {
        title: '操作',
        width: 20
      }
    ];
    return {
      crudEntity: '通知工具',
      columns,
      notifications: [],
      notification: [],
      pushType: [
        {
          key: 'rssError',
          value: 'Rss 失败'
        }, {
          key: 'scrapeError',
          value: '抓取免费或 HR 失败'
        }, {
          key: 'addTorrent',
          value: '添加种子'
        }, {
          key: 'addTorrentError',
          value: '添加种子失败'
        }, {
          key: 'rejectTorrent',
          value: '拒绝种子'
        }, {
          key: 'deleteTorrent',
          value: '删除种子'
        }, {
          key: 'deleteTorrentError',
          value: '删除种子失败'
        }, {
          key: 'reannounceTorrent',
          value: '重新汇报种子'
        }, {
          key: 'reannounceTorrentError',
          value: '重新汇报种子失败'
        }, {
          key: 'connectClient',
          value: '下载器已连接'
        }, {
          key: 'clientLoginError',
          value: '下载器登陆失败'
        }, {
          key: 'getMaindataError',
          value: '获取下载器信息失败'
        }, { key: 'spaceAlarm', value: '空间警告' }
      ],
      typeLabels: {
        telegram: 'Telegram',
        wechat: '企业微信应用',
        wecom: '企业微信群机器人',
        dingtalk: '钉钉群机器人',
        iyuu: 'IYUU',
        slack: 'Slack',
        ntfy: 'Ntfy',
        webhook: 'Webhook'
      },
      defaultNotification: {
        id: '',
        pushType: []
      },
      loading: true,
      registCode: []
    };
  },
  methods: {
    typeLabel (type) {
      return this.typeLabels[type] || type;
    },
    detailFieldText (col, record) {
      if (col && col.dataIndex === 'type') return this.typeLabel(record.type);
      return null;
    },
    async listNotification () {
      try {
        const res = await this.$api().notification.list();
        this.notifications = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async modifyNotification () {
      try {
        await this.$api().notification.modify({ ...this.notification });
        this.$message().success((this.notification.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        this.closeForm();
        this._formEditing = false;
        setTimeout(() => this.listNotification(), 1000);
        this.clearNotification();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this._formEditing = false;
      if (typeof this.clearNotification === 'function') this.clearNotification();
      this.formVisible = true;
    },
    modifyClick (row) {
      this.notification = { ...row, pushType: this.pushType.map(item => item.key).filter(item => row.pushType.indexOf(item) !== -1) };
      this._formEditing = true;
      this.formVisible = true;
    },
    clearNotification () {
      this.notification = { ...this.defaultNotification, pushType: [] };
    },
    async deleteNotification (row) {
      if (row.used) {
        this.$message().error('组件被占用, 取消占用后删除');
        return;
      }
      try {
        await this.$api().notification.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listNotification();
      } catch (e) {
        this.$message().error(e.message);
      }
    }
  },
  async mounted () {
    this.clearNotification();
    await this.listNotification();
  }
};
</script>
<style scoped>
.notification {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
