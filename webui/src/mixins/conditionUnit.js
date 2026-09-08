import {
  conditionKind,
  defaultUnit,
  unitsFor,
  parseSizeExpr,
  parseTimeExpr,
  toSizeExpr,
  toTimeExpr
} from '../util/sizeUnit';

export default {
  methods: {
    conditionKind,
    unitsFor,
    hydrateConditions (conditions) {
      return (conditions || []).map((c) => {
        const row = { ...c };
        const kind = conditionKind(row.key);
        row._kind = kind;
        if (kind === 'size' || kind === 'speed') {
          const parsed = parseSizeExpr(row.value, defaultUnit(kind));
          row.value = parsed.value;
          row._unit = parsed.unit;
        } else if (kind === 'time') {
          const parsed = parseTimeExpr(row.value);
          row.value = parsed.value;
          row._unit = parsed.unit;
        } else {
          row._unit = '';
        }
        return row;
      });
    },
    serializeConditions (conditions) {
      return (conditions || []).map((c) => {
        const { _unit, _kind, ...rest } = c;
        if (_kind === 'size' || _kind === 'speed') {
          return { ...rest, value: toSizeExpr(c.value, _unit) };
        }
        if (_kind === 'time') {
          return { ...rest, value: toTimeExpr(c.value, _unit) };
        }
        return rest;
      });
    },
    onConditionKeyChange (record) {
      const kind = conditionKind(record.key);
      if (record._kind !== kind) {
        record.value = '';
        record._kind = kind;
        record._unit = defaultUnit(kind);
      }
    }
  }
};
