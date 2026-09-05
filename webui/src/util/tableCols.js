function colTitle (col) {
  return String((col && col.title) || '');
}

function colIndex (col) {
  return String((col && (col.dataIndex || col.key)) || '');
}

const LEAD_KEYS = ['alias', 'name', 'title', 'mediaName', 'torrentName'];
const LEAD_TITLES = ['别名', '名称', '站点名称', '种子名称', '种子标题', '客户端', '站点'];

function isOpsCol (col) {
  const title = colTitle(col);
  const key = colIndex(col);
  return title === '操作' || key === 'option';
}

function isLeadCol (col) {
  const title = colTitle(col);
  const key = colIndex(col);
  return LEAD_KEYS.indexOf(key) !== -1 || LEAD_TITLES.indexOf(title) !== -1;
}

export function attachCardCell (col) {
  const next = { ...col };
  const title = colTitle(next);
  const ops = isOpsCol(next);
  const lead = isLeadCol(next);
  const prev = next.customCell;
  next.customCell = (...args) => {
    const extra = typeof prev === 'function' ? prev(...args) : (prev || {});
    return {
      ...extra,
      'data-label': ops || lead ? '' : title,
      class: [extra.class, ops ? 'fn-card-ops' : (lead ? 'fn-card-lead' : 'fn-card-field')].filter(Boolean).join(' ')
    };
  };
  return next;
}

export function normalizeTableColumns (cols, opts) {
  const narrow = !!(opts && opts.narrow);
  const mapped = (cols || []).map((col) => {
    if (!col || typeof col !== 'object') return col;
    const next = { ...col };
    const raw = Number(next.width);
    const title = colTitle(next);
    const key = colIndex(next);
    const ops = isOpsCol(next);

    if (narrow) {
      next.fixed = false;
      delete next.width;
      return attachCardCell(next);
    }

    if (!raw) {
      return attachCardCell(next);
    }

    let width = raw;
    // 原始列宽是「字符格」(18/20/30)，已保存的像素宽不要再 *8，否则拖到最小会弹回很宽
    if (raw > 0 && raw <= 48) {
      width = Math.round(raw * 8);
    }
    if (ops) {
      next.align = 'center';
      if (next.dataIndex === 'option') {
        width = Math.min(Math.max(width, 72), 96);
      } else {
        width = Math.max(width, 248);
      }
    }
    if (key === 'id') width = Math.max(width, 120);
    if (key === 'alias' || key === 'name') width = Math.max(width, 200);
    if (key === 'clientUrl' || key === 'host' || key === 'url') width = Math.max(width, 240);
    if (key === 'compareType' || title === '比较类型') width = Math.max(width, 140);
    if ((key === 'key' && title === '选项') || title === '选项') width = Math.max(width, 168);
    if (key === 'uploaded' || key === 'downloaded' || title === '上传' || title === '下载') {
      width = Math.max(width, 120);
    }
    if (key === 'allTimeUpload' || title === '累计数据') width = Math.max(width, 180);
    if (key === 'speed' || title === '实时速度') width = Math.max(width, 180);
    if (key === 'seedingCount' || title === '当前任务') width = Math.max(width, 120);
    if (title === '启用' || key === 'enable' || key === 'status' || title === '状态') {
      width = Math.max(width, 100);
    }
    if (title === '方案') width = Math.max(width, 160);
    if (key === 'timestamp' || title === '时间') width = Math.max(width, 180);
    if (next.fixed && width < 120) width = 120;
    if (key === 'value' || title === '值' || key === 'tracker' || key === 'message' || title === '信息') {
      next.ellipsis = key !== 'message' && title !== '信息';
      if (raw < 160 || key === 'message' || title === '信息') {
        delete next.width;
        next.showSorterTooltip = false;
        return attachCardCell(next);
      }
    }
    next.width = width;
    next.showSorterTooltip = false;
    return attachCardCell(next);
  });

  if (!narrow) {
    const grow = mapped.some((col) => {
      const key = colIndex(col);
      return key === 'value' || key === 'tracker' || key === 'message';
    });
    if (grow) return mapped;
    const flex = {
      title: '',
      key: '_flex',
      width: 0,
      customRender: () => '\u00a0',
      customHeaderCell: () => ({ class: 'fn-th-flex', style: { width: 'auto' } }),
      customCell: () => ({ class: 'fn-td-flex', style: { width: 'auto' } })
    };
    const last = mapped[mapped.length - 1];
    if (last && isOpsCol(last)) return mapped.slice(0, -1).concat([flex, last]);
    return mapped.concat([flex]);
  }
  const lead = [];
  const rest = [];
  const ops = [];
  mapped.forEach((col) => {
    if (!col) return;
    if (isOpsCol(col)) ops.push(col);
    else if (isLeadCol(col)) lead.push(col);
    else rest.push(col);
  });
  return lead.concat(rest, ops);
}

export function scrollForColumns (cols, opts) {
  if (opts && opts.narrow) return {};
  const list = cols || [];
  const sum = list.reduce((total, col) => {
    if (col && col.key === '_flex') return total;
    return total + (Number(col && col.width) || 140);
  }, 0);
  return { x: Math.max(sum + 48, 1) };
}
