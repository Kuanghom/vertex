<template>
  <div class="server fn-page">
    <fn-filter :active="listSearchActive" title="搜索">
      <fn-list-search
        v-model:query="listQuery"
        v-model:enable="listEnable"
        placeholder="别名 / ID / 地址"
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
      :data-source="filterAdminList(servers, ['alias', 'id', 'host'])"
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
        <template v-if="column.title === '操作'">
          <fn-ops>
            <a-button type="link" @click="goto(record)">Shell</a-button>
            <a-button type="link" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" @click="reloadServer(record)">重连</a-button>
            <a-button type="link" danger @click="deleteServer(record)">删除</a-button>
          </fn-ops>
        </template>
      </template>
    </a-table>
    <a-modal
      v-model:visible="formVisible"
      :title="server.id ? '编辑服务器' : '新增服务器'"
      :width="formModalWidth"
      :wrap-class-name="formModalWrapClass"
      :footer="null"
      :bodyStyle="{ maxHeight: '70vh', overflow: 'auto' }"
    >
      <a-form
        labelAlign="right"
        :labelWrap="true"
        :model="server"
        size="small"
        @finish="modifyServer"
        :labelCol="{ span: 3 }"
        :wrapperCol="{ span: 21 }"
        autocomplete="off"
        :class="`container-form-${ isMobile() ? 'mobile' : 'pc' }`">
        <a-form-item
          label="别名"
          name="alias"
          extra="给服务器取一个好记的名字"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="server.alias"/>
        </a-form-item>
        <a-form-item
          label="启用"
          name="enable"
          extra="选择是否启用服务器"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-checkbox :disabled="server.used" v-model:checked="server.enable">启用</a-checkbox>
        </a-form-item>
        <a-form-item
          label="域名/IP"
          name="host"
          extra="服务器的 IP: 192.168.1.1 或域名: my.seed.box"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="server.host"/>
        </a-form-item>
        <a-form-item
          label="用户名"
          name="username"
          extra="填写 ssh 登录服务器所需的用户名"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="server.username"/>
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          extra="填写 ssh 登录服务器所需的密码, 密码与密钥二选一即可。"
          :rules="[{ validator: async (rule, value) => { if (server.password || server.privateKey) return; throw '密码和密钥至少填写一个!' } }]">
          <a-input size="small" v-model:value="server.password"/>
        </a-form-item>
        <a-form-item
          label="密钥"
          name="privateKey"
          extra="填写 ssh 登录服务器所需的密钥, 密码与密钥二选一即可。"
          :rules="[{ validator: async (rule, value) => { if (server.password || server.privateKey) return; throw '密码和密钥至少填写一个!' } }]">
          <a-textarea v-model:value="server.privateKey" type="textarea" :rows="10"></a-textarea >
        </a-form-item>
        <a-form-item
          label="端口"
          name="port"
          extra="填写 ssh 登录服务器所需的端口"
          :rules="[{ required: true, message: '${label}不可为空! ' }]">
          <a-input size="small" v-model:value="server.port"/>
        </a-form-item>
        <a-form-item
          label="固定网卡"
          name="fixedInterface"
          extra="填写希望显示速度信息的网卡接口, 例: enp1s0">
          <a-input size="small" v-model:value="server.fixedInterface"/>
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
        title: '域名/IP',
        dataIndex: 'host',
        width: 30
      }, {
        title: '启用',
        dataIndex: 'enable',
        width: 15
      }, {
        title: '状态',
        dataIndex: 'status',
        width: 15
      }, {
        title: '操作',
        width: 24
      }
    ];
    return {
      columns,
      servers: [],
      server: {},
      defaultServer: {
        id: '',
        alias: '',
        host: '',
        username: '',
        password: '',
        port: '',
        enable: true
      },
      loading: true
    };
  },
  methods: {
    async listServer () {
      try {
        const res = await this.$api().server.list();
        this.servers = res.data;
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async modifyServer () {
      try {
        await this.$api().server.modify({ ...this.server });
        this.$message().success((this.server.id ? '编辑' : '新增') + '成功, 列表正在刷新...');
        setTimeout(() => this.listServer(), 1000);
        this.clearServer();
        this.closeForm();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    async reloadServer (row) {
      try {
        const res = await this.$api().server.reload(row.id);
        this.$message().success(res.message);
        this.listServer();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    openCreate () {
      this.clearServer();
      this.formVisible = true;
    },
    openEdit (row) {
      this.server = { ...row };
      this.formVisible = true;
    },
    async clearServer () {
      this.server = { ...this.defaultServer };
    },
    modifyClick (row) {
      this.openEdit(row);
    },
    async deleteServer (row) {
      if (row.used) {
        this.$message().error('组件被占用, 取消占用后删除');
        return;
      }
      try {
        await this.$api().server.delete(row.id);
        this.$message().success('删除成功, 列表正在刷新...');
        await this.listServer();
      } catch (e) {
        this.$message().error(e.message);
      }
    },
    goto (record) {
      window.open('/tool/shell/' + record.id + '?bare=1');
    }
  },
  async mounted () {
    this.clearServer();
    await this.listServer();
  }
};
</script>
<style scoped>
.server {
  width: 100%;
  max-width: none;
  margin: 0 auto;
}
</style>
