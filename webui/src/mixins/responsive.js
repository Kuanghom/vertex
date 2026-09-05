import { reactive } from 'vue';
import { normalizeTableColumns, scrollForColumns } from '../util/tableCols';

const UA_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const viewport = reactive({
  narrow: false,
  width: 1280,
  pageLoading: false
});

function applyViewport () {
  if (typeof window === 'undefined') return;
  viewport.width = window.innerWidth;
  viewport.narrow = window.matchMedia
    ? window.matchMedia('(max-width: 960px)').matches
    : window.innerWidth <= 960;
  document.documentElement.classList.toggle('fn-narrow', viewport.narrow);
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

export function initViewport () {
  if (typeof window === 'undefined') return;
  applyViewport();
  const mq = window.matchMedia('(max-width: 960px)');
  if (mq.addEventListener) mq.addEventListener('change', applyViewport);
  else mq.addListener(applyViewport);
  window.addEventListener('resize', applyViewport);
}

export default {
  computed: {
    isNarrow () {
      return viewport.narrow;
    },
    displayColumns () {
      return normalizeTableColumns(this.columns || [], { narrow: this.isNarrow });
    },
    tableScroll () {
      return scrollForColumns(this.displayColumns, { narrow: this.isNarrow });
    }
  },
  methods: {
    isMobile () {
      return this.isNarrow || (typeof navigator !== 'undefined' && UA_MOBILE.test(navigator.userAgent));
    },
    mergeListPagination (pagination) {
      const base = pagination || {};
      const userOnChange = base.onChange;
      const userOnShowSizeChange = base.onShowSizeChange;
      return {
        ...base,
        simple: this.isNarrow,
        showSizeChanger: !this.isNarrow && !!base.showSizeChanger,
        showQuickJumper: !this.isNarrow,
        showTotal: base.showTotal || (total => `共 ${total} 条`),
        position: ['bottomCenter'],
        onChange: (page, pageSize) => {
          if (typeof userOnChange === 'function') userOnChange(page, pageSize);
          this.scrollListToTop();
        },
        onShowSizeChange: (page, pageSize) => {
          if (typeof userOnShowSizeChange === 'function') userOnShowSizeChange(page, pageSize);
          else if (typeof userOnChange === 'function') userOnChange(page, pageSize);
          this.scrollListToTop();
        }
      };
    },
    scrollListToTop () {
      if (!this.isNarrow) return;
      const main = typeof document !== 'undefined' && document.querySelector('.fn-main');
      if (main && typeof main.scrollTo === 'function') {
        main.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    },
    boundScroll (x, y) {
      if (this.isNarrow) return {};
      const next = {};
      if (x != null) next.x = x;
      if (y != null) next.y = y;
      return next;
    },
    asCardColumns (cols) {
      const source = (cols || []).map((col) => {
        if (typeof this.decorateTableColumn === 'function') {
          return this.decorateTableColumn(col);
        }
        return col;
      });
      return normalizeTableColumns(source, { narrow: this.isNarrow });
    },
    cardScroll (cols, y) {
      if (this.isNarrow) return {};
      const next = scrollForColumns(this.asCardColumns(cols), { narrow: false });
      if (y != null) next.y = y;
      return next;
    }
  }
};
