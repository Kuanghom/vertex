<template>
  <div class="fn-page preset-guide">
    <p class="fn-guide-lead">
      把常用删种、RSS / 选种规则、站点任务和下载器角色一次加进来。
      任务不启用，RSS 地址、Cookie、下载器都先空着，别名里的「需 vip」等说明会保留。哪条要用了再去补。
    </p>
    <a-space wrap>
      <a-button type="primary" :loading="applying === 'recommended'" @click="applyPack('recommended')">一键导入推荐套餐</a-button>
      <a-button :loading="applying === 'all'" @click="applyPack('all')">导入全部预设</a-button>
    </a-space>

    <a-divider />

    <div class="preset-pick-bar">
      <a-input
        class="fn-search"
        v-model:value="keyword"
        allowClear
        placeholder="筛选别名 / 说明"/>
      <a-button type="primary" :disabled="!picked.length" :loading="applying === 'pick'" @click="applyPicked">添加已选 {{ picked.length || '' }}</a-button>
    </div>

    <a-collapse v-model:activeKey="openGroups">
      <a-collapse-panel v-for="group in groups" :key="group.kind" :header="group.title + ' (' + visibleItems(group.kind).length + ')'">
        <div v-for="item in visibleItems(group.kind)" :key="item.id" class="preset-item">
          <a-checkbox :checked="isPicked(item.id)" @change="toggleItem(item)">
            <span class="preset-alias">{{ item.alias }}</span>
            <a-tag v-if="item.exists" color="blue">已有</a-tag>
            <a-tag v-for="tag in item.tags" :key="tag">{{ tag }}</a-tag>
          </a-checkbox>
          <div v-if="item.hint" class="preset-hint">{{ item.hint }}</div>
          <div v-if="item.rules && item.rules.length" class="preset-rules">
            <span>将一并导入的规则（可去掉）：</span>
            <a-checkbox
              v-for="rule in item.rules"
              :key="rule.id"
              :checked="isRulePicked(item.id, rule.id)"
              @change="toggleRule(item, rule.id)">
              {{ rule.alias }}
            </a-checkbox>
          </div>
        </div>
      </a-collapse-panel>
    </a-collapse>

    <a-divider />
    <p class="fn-guide-lead">也可以上传 Vertex 备份或规则 zip，勾选后导入。地址和密钥会清空。</p>
    <a-upload
      :capture="null"
      :showUploadList="true"
      :maxCount="1"
      action="/api/preset/previewImport"
      name="file"
      @change="onPreview">
      <a-button>选择备份 / zip</a-button>
    </a-upload>
    <div v-if="importGroups" class="preset-import">
      <a-checkbox
        v-for="row in importRows"
        :key="row.source"
        :checked="importPicked.indexOf(row.source) !== -1"
        @change="toggleImport(row.source)">
        {{ kindTitle(row.kind) }} · {{ row.alias }}
        <span v-if="row.hint" class="preset-hint"> {{ row.hint }}</span>
      </a-checkbox>
      <div style="margin-top: 12px;">
        <a-button type="primary" :disabled="!importPicked.length" :loading="importing" @click="doImport">导入勾选项</a-button>
      </div>
    </div>

    <div v-if="result" class="preset-result">
      <p>{{ result.message }}</p>
      <div v-if="result.created && result.created.length">
        新增：
        <span v-for="row in result.created" :key="row.kind + row.alias">{{ kindTitle(row.kind) }} {{ row.alias }}；</span>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  data () {
    return {
      keyword: '',
      groups: [],
      items: [],
      picked: [],
      rulePicked: {},
      openGroups: ['client', 'delete', 'task'],
      applying: '',
      importGroups: null,
      importFile: null,
      importPicked: [],
      importing: false,
      result: null
    };
  },
  computed: {
    importRows () {
      if (!this.importGroups) return [];
      const rows = [];
      ['client', 'delete', 'rss', 'select', 'task'].forEach((kind) => {
        (this.importGroups[kind] || []).forEach((row) => rows.push(row));
      });
      return rows;
    }
  },
  methods: {
    kindTitle (kind) {
      return ({
        delete: '删种规则',
        rss: 'RSS 规则',
        select: '选种规则',
        task: 'RSS 任务',
        client: '下载器'
      })[kind] || kind;
    },
    visibleItems (kind) {
      const q = (this.keyword || '').trim().toLowerCase();
      return this.items.filter((item) => {
        if (item.kind !== kind) return false;
        if (!q) return true;
        return (item.alias + ' ' + (item.hint || '')).toLowerCase().indexOf(q) !== -1;
      });
    },
    isPicked (id) {
      return this.picked.indexOf(id) !== -1;
    },
    isRulePicked (itemId, ruleId) {
      const list = this.rulePicked[itemId];
      if (!list) return true;
      return list.indexOf(ruleId) !== -1;
    },
    toggleItem (item) {
      const i = this.picked.indexOf(item.id);
      if (i === -1) {
        this.picked = this.picked.concat(item.id);
        if (!this.rulePicked[item.id] && item.ruleIds) {
          this.rulePicked = { ...this.rulePicked, [item.id]: item.ruleIds.slice() };
        }
      } else {
        this.picked = this.picked.filter(id => id !== item.id);
      }
    },
    toggleRule (item, ruleId) {
      const current = (this.rulePicked[item.id] || item.ruleIds || []).slice();
      const i = current.indexOf(ruleId);
      if (i === -1) current.push(ruleId);
      else current.splice(i, 1);
      this.rulePicked = { ...this.rulePicked, [item.id]: current };
    },
    async load () {
      const res = await this.$api().preset.catalog();
      this.groups = res.data.groups || [];
      this.items = res.data.items || [];
    },
    async applyPack (pack) {
      this.applying = pack;
      try {
        const res = await this.$api().preset.apply({ pack });
        this.result = res.data;
        this.$message().success(res.message);
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.applying = '';
      }
    },
    async applyPicked () {
      this.applying = 'pick';
      try {
        const items = this.picked.map((id) => {
          const item = this.items.filter(row => row.id === id)[0] || {};
          return {
            id,
            ruleIds: this.rulePicked[id] || item.ruleIds || []
          };
        });
        const res = await this.$api().preset.apply({ items });
        this.result = res.data;
        this.$message().success(res.message);
        this.picked = [];
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.applying = '';
      }
    },
    onPreview ({ file }) {
      if (file.status === 'done' && file.response && file.response.success) {
        this.importGroups = file.response.data;
        this.importFile = file.originFileObj;
        this.importPicked = this.importRows.map(row => row.source);
      }
      if (file.status === 'error') {
        this.$message().error((file.response && file.response.message) || '预览失败');
      }
    },
    toggleImport (source) {
      const i = this.importPicked.indexOf(source);
      if (i === -1) this.importPicked = this.importPicked.concat(source);
      else this.importPicked = this.importPicked.filter(s => s !== source);
    },
    async doImport () {
      if (!this.importFile) return;
      this.importing = true;
      try {
        const form = new FormData();
        form.append('file', this.importFile);
        form.append('sources', JSON.stringify(this.importPicked));
        const res = await this.$api().preset.importSelected(form);
        this.result = res.data;
        this.$message().success(res.message);
        await this.load();
      } catch (e) {
        this.$message().error(e.message);
      } finally {
        this.importing = false;
      }
    }
  },
  async mounted () {
    try {
      await this.load();
    } catch (e) {
      this.$message().error(e.message);
    }
  }
};
</script>
<style scoped>
.preset-pick-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.preset-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
}
.preset-alias {
  margin-right: 8px;
  font-weight: 600;
}
.preset-hint,
.preset-rules {
  margin: 4px 0 0 24px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
}
.preset-rules .ant-checkbox-wrapper {
  display: block;
  margin-left: 0;
}
.preset-import {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preset-result {
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--panel);
  border-radius: var(--radius);
}
</style>
