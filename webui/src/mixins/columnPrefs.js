import { h } from 'vue';
import FnEntity from '../components/FnEntity.vue';
import { normalizeTableColumns, scrollForColumns } from '../util/tableCols';
import { showRowDetail } from '../util/rowDetail';

function colKey (col) {
  return col.dataIndex || col.key || col.title;
}

function isLocked (col) {
  return col.title === '操作' || col.key === 'option';
}

function entityDesc (record) {
  if (!record || typeof record !== 'object') return '';
  if (record.type) return String(record.type);
  if (record.tag && record.name) return String(record.tag);
  return '';
}

function titleText (col) {
  const title = col && col.title;
  if (title == null) return '';
  if (typeof title === 'string' || typeof title === 'number') return String(title);
  return '';
}

export default {
  provide () {
    return {
      openListDetail: (row) => this.openRowDetail(row),
      hasRowDetail: () => this.hasRowDetail
    };
  },
  data () {
    return {
      columnOrder: [],
      columnHidden: [],
      columnWidths: {},
      _colDragKey: '',
      _colDropKey: '',
      _colResizing: false,
      _colJustResized: false
    };
  },
  computed: {
    hasRowDetail () {
      return Array.isArray(this.columns) && this.columns.length > 0;
    },
    tableLocale () {
      return { emptyText: '暂无数据' };
    },
    columnPrefsKey () {
      const path = (this.$route && this.$route.path) || 'table';
      return 'vertex-cols:' + path;
    },
    hasListColumns () {
      return Array.isArray(this.columns) && this.columns.length > 0;
    },
    columnSettingItems () {
      const cols = this.columns || [];
      const keys = this.columnOrder.length ? this.columnOrder.slice() : cols.map(colKey);
      cols.forEach(col => {
        const key = colKey(col);
        if (keys.indexOf(key) === -1) keys.push(key);
      });
      return keys.map(key => {
        const col = cols.find(item => colKey(item) === key);
        if (!col || key === '_flex') return null;
        return {
          key,
          title: titleText(col) || key,
          locked: isLocked(col),
          visible: isLocked(col) || this.columnHidden.indexOf(key) === -1
        };
      }).filter(Boolean);
    },
    tableColumns () {
      return this.buildPreferredColumns(this.columns || []);
    },
    displayColumns () {
      return this.tableColumns;
    },
    tableScroll () {
      return scrollForColumns(this.tableColumns, { narrow: this.isNarrow });
    }
  },
  methods: {
    openRowDetail (row) {
      if (!row) return;
      const format = typeof this.detailFieldText === 'function'
        ? (col, record, raw) => this.detailFieldText(col, record, raw)
        : null;
      showRowDetail(row, this.columns || this.tableColumns || [], { format });
    },
    listCustomRow (record) {
      return {
        onDblclick: (e) => {
          if (this.isNarrow || !this.hasRowDetail) return;
          const t = e.target;
          if (t && t.closest && t.closest('a, button, .ant-switch, .ant-select, .ant-input, .ant-checkbox, .ant-input-number, .fn-ops, input, textarea, .fn-row-info')) return;
          this.openRowDetail(record);
        }
      };
    },
    buildPreferredColumns (source) {
      const cols = source || [];
      if (!cols.length) return [];
      const byKey = {};
      cols.forEach(col => {
        byKey[colKey(col)] = col;
      });
      const keys = this.columnOrder.length ? this.columnOrder.slice() : cols.map(colKey);
      cols.forEach(col => {
        const key = colKey(col);
        if (keys.indexOf(key) === -1) keys.push(key);
      });
      const visible = [];
      let ops = null;
      keys.forEach(key => {
        const col = byKey[key];
        if (!col) return;
        if (isLocked(col)) {
          ops = { ...col, key: col.key || 'option' };
          return;
        }
        if (this.columnHidden.indexOf(key) !== -1) return;
        visible.push(this.decorateTableColumn(col));
      });
      if (ops) visible.push(this.decorateTableColumn(ops));
      return normalizeTableColumns(visible, { narrow: this.isNarrow });
    },
    decorateTableColumn (col) {
      const key = colKey(col);
      const locked = isLocked(col);
      const next = { ...col };
      const savedWidth = Number(this.columnWidths[key]);
      if (savedWidth >= 64 && !(locked && savedWidth < 248)) next.width = savedWidth;

      if (!next.customRender && (next.dataIndex === 'alias' || next.dataIndex === 'name')) {
        if (!(savedWidth >= 64)) next.width = Math.max(Number(next.width) || 0, 220);
        next.customRender = ({ text, record }) => h(FnEntity, {
          title: String(text || record.alias || record.name || ''),
          desc: entityDesc(record),
          mark: String(record.type || text || ''),
          record
        });
      }
      if (!next.customRender && (next.dataIndex === 'host' || next.dataIndex === 'clientUrl')) {
        next.customRender = ({ text }) => h('div', { class: 'fn-meta' }, String(text || '—'));
      }

      next.showSorterTooltip = false;
      if (locked) next.align = next.align || 'center';

      const prevHeader = typeof col.customHeaderCell === 'function'
        ? col.customHeaderCell
        : () => (col.customHeaderCell || {});

      next.customHeaderCell = (column) => {
        const extra = prevHeader(column) || {};
        const inResizeZone = (e, th) => {
          const rect = th && th.getBoundingClientRect ? th.getBoundingClientRect() : null;
          return !!(rect && rect.right - e.clientX <= 14);
        };
        return {
          ...extra,
          class: [extra.class, 'fn-th-cell', locked ? 'is-locked' : '', this._colDropKey === key ? 'is-drop' : ''].filter(Boolean).join(' '),
          'data-col-key': key,
          title: locked ? titleText(col) : '拖动左侧调整顺序，拖动右缘调整宽度',
          onClick: (e) => {
            if (this._colResizing || this._colJustResized || inResizeZone(e, e.currentTarget)) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (extra.onClick) extra.onClick(e);
          },
          onMousedown: (e) => {
            const th = e.currentTarget;
            if (!th || !th.getBoundingClientRect) return;
            if (inResizeZone(e, th)) {
              this.startColumnResize(key, e, th);
              return;
            }
            if (!locked && e.clientX - th.getBoundingClientRect().left <= 18) {
              th.setAttribute('draggable', 'true');
            }
            if (extra.onMousedown) extra.onMousedown(e);
          },
          onDragstart: (e) => {
            if (this._colResizing || locked) {
              e.preventDefault();
              return;
            }
            this.onColumnDragStart(key, e);
            if (extra.onDragstart) extra.onDragstart(e);
          },
          onDragend: (e) => {
            e.currentTarget && e.currentTarget.removeAttribute('draggable');
            this._colDropKey = '';
            if (extra.onDragend) extra.onDragend(e);
          },
          onDragover: (e) => {
            if (this._colResizing) return;
            e.preventDefault();
            this._colDropKey = key;
            if (extra.onDragover) extra.onDragover(e);
          },
          onDragleave: (e) => {
            if (this._colDropKey === key) this._colDropKey = '';
            if (extra.onDragleave) extra.onDragleave(e);
          },
          onDrop: (e) => {
            e.preventDefault();
            this._colDropKey = '';
            e.currentTarget && e.currentTarget.removeAttribute('draggable');
            this.onColumnDrop(key);
            if (extra.onDrop) extra.onDrop(e);
          }
        };
      };

      return next;
    },
    currentColumnWidth (key) {
      const saved = Number(this.columnWidths[key]);
      if (saved >= 64) return saved;
      const col = (this.tableColumns || []).find(item => colKey(item) === key)
        || (this.columns || []).find(item => colKey(item) === key);
      return Number(col && col.width) || 140;
    },
    loadColumnPrefs () {
      try {
        const raw = window.localStorage.getItem(this.columnPrefsKey);
        if (!raw) return;
        const data = JSON.parse(raw);
        this.columnOrder = Array.isArray(data.order) ? data.order : [];
        this.columnHidden = Array.isArray(data.hidden) ? data.hidden : [];
        this.columnWidths = data.widths && typeof data.widths === 'object' ? { ...data.widths } : {};
      } catch (e) {
        this.columnOrder = [];
        this.columnHidden = [];
        this.columnWidths = {};
      }
    },
    saveColumnPrefs () {
      try {
        window.localStorage.setItem(this.columnPrefsKey, JSON.stringify({
          order: this.columnOrder,
          hidden: this.columnHidden,
          widths: this.columnWidths
        }));
      } catch (e) {
        /* ignore quota */
      }
    },
    ensureColumnOrder () {
      const keys = (this.columns || []).map(colKey);
      if (!this.columnOrder.length) this.columnOrder = keys.slice();
      keys.forEach(key => {
        if (this.columnOrder.indexOf(key) === -1) this.columnOrder.push(key);
      });
      this.columnOrder = this.columnOrder.filter(key => keys.indexOf(key) !== -1);
    },
    toggleColumnVisible (key, visible) {
      const col = (this.columns || []).find(item => colKey(item) === key);
      if (!col || isLocked(col)) return;
      const hidden = this.columnHidden.filter(item => item !== key);
      if (!visible) hidden.push(key);
      this.columnHidden = hidden;
      this.saveColumnPrefs();
    },
    moveColumn (key, delta) {
      this.ensureColumnOrder();
      const col = (this.columns || []).find(item => colKey(item) === key);
      if (!col || isLocked(col)) return;
      const order = this.columnOrder.filter(item => {
        const c = (this.columns || []).find(x => colKey(x) === item);
        return c && !isLocked(c);
      });
      const from = order.indexOf(key);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= order.length) return;
      const next = order.slice();
      next.splice(from, 1);
      next.splice(to, 0, key);
      const ops = this.columnOrder.filter(item => {
        const c = (this.columns || []).find(x => colKey(x) === item);
        return c && isLocked(c);
      });
      this.columnOrder = next.concat(ops);
      this.saveColumnPrefs();
    },
    onColumnDragStart (key, e) {
      if (this._colResizing) {
        e.preventDefault();
        return;
      }
      this._colDragKey = key;
      if (e && e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
      }
    },
    onColumnDrop (key) {
      const fromKey = this._colDragKey;
      this._colDragKey = '';
      this._colDropKey = '';
      if (!fromKey || fromKey === key) return;
      this.ensureColumnOrder();
      const from = this.columnOrder.indexOf(fromKey);
      const to = this.columnOrder.indexOf(key);
      if (from < 0 || to < 0) return;
      const colTo = (this.columns || []).find(item => colKey(item) === key);
      if (colTo && isLocked(colTo)) return;
      const next = this.columnOrder.slice();
      next.splice(from, 1);
      next.splice(to, 0, fromKey);
      this.columnOrder = next;
      this.saveColumnPrefs();
    },
    startColumnResize (key, e, th) {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = th && th.getBoundingClientRect
        ? Math.round(th.getBoundingClientRect().width)
        : this.currentColumnWidth(key);
      this._colResizing = true;
      this._colJustResized = false;
      document.body.classList.add('fn-col-resizing');

      const onMove = (ev) => {
        ev.preventDefault();
        const w = Math.max(88, Math.min(720, Math.round(startW + ev.clientX - startX)));
        this.columnWidths = { ...this.columnWidths, [key]: w };
      };
      const blockClick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      const onUp = (ev) => {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp, true);
        document.addEventListener('click', blockClick, true);
        this._colResizing = false;
        this._colJustResized = true;
        document.body.classList.remove('fn-col-resizing');
        this.saveColumnPrefs();
        setTimeout(() => {
          document.removeEventListener('click', blockClick, true);
          this._colJustResized = false;
        }, 320);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp, true);
    },
    resetColumnPrefs () {
      this.columnOrder = (this.columns || []).map(colKey);
      this.columnHidden = [];
      this.columnWidths = {};
      this.saveColumnPrefs();
    }
  },
  watch: {
    columnPrefsKey () {
      if (!this.hasListColumns) return;
      this.loadColumnPrefs();
      this.ensureColumnOrder();
    }
  },
  mounted () {
    if (!this.hasListColumns) return;
    this.loadColumnPrefs();
    this.ensureColumnOrder();
  }
};
