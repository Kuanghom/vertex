import columnPrefs from './columnPrefs';

export default {
  mixins: [columnPrefs],
  data () {
    return {
      loading: true,
      formVisible: false,
      _formEditing: false,
      crudEntity: '',
      crudModalWidth: 720,
      listPageCurrent: 1,
      listPageSize: 20
    };
  },
  created () {
    const methods = this.$options.methods || {};
    Object.keys(methods).forEach((name) => {
      if (!/^list([A-Z]|$)/.test(name)) return;
      const orig = this[name];
      if (typeof orig !== 'function') return;
      this[name] = async (...args) => {
        this._listBusy = (this._listBusy || 0) + 1;
        this.loading = true;
        try {
          return await orig.apply(this, args);
        } finally {
          this._listBusy -= 1;
          if (this._listBusy <= 0) this.loading = false;
        }
      };
    });
  },
  computed: {
    formModalTitle () {
      const name = this.crudEntity || '';
      return (this._formEditing ? '编辑' : '新增') + name;
    },
    formModalWidth () {
      return this.isNarrow ? '100%' : (this.crudModalWidth || 720);
    },
    formModalWrapClass () {
      return (this.isNarrow ? 'fn-dialog-full ' : '') + 'fn-form-roomy';
    },
    listPagination () {
      return this.mergeListPagination({
        current: this.listPageCurrent,
        pageSize: this.listPageSize,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        hideOnSinglePage: false,
        onChange: (page, pageSize) => this.applyListPagination(page, pageSize),
        onShowSizeChange: (current, size) => this.applyListPagination(1, size)
      });
    }
  },
  methods: {
    applyListPagination (page, pageSize) {
      const nextSize = Number(pageSize) || this.listPageSize;
      const sizeChanged = nextSize !== this.listPageSize;
      this.listPageSize = nextSize;
      this.listPageCurrent = sizeChanged ? 1 : (Number(page) || 1);
    },
    openCreateForm (clear) {
      this._formEditing = false;
      if (typeof clear === 'function') clear.call(this);
      this.formVisible = true;
    },
    closeForm () {
      this.formVisible = false;
      this._formEditing = false;
    }
  }
};
