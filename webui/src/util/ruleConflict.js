export function normalizeConditions (list) {
  return (list || [])
    .filter(item => item && item.key && item.compareType)
    .map(item => ({
      key: String(item.key),
      compareType: String(item.compareType),
      value: String(item.value == null ? '' : item.value)
    }));
}

export function sameConditions (a, b) {
  const left = JSON.stringify(normalizeConditions(a));
  const right = JSON.stringify(normalizeConditions(b));
  return left === right && left !== '[]';
}

export function findRuleConflict (list, form, serializedConditions) {
  const alias = String((form && form.alias) || '').trim();
  const aliasHit = (list || []).find(item => item.id !== form.id && String(item.alias || '').trim() === alias);
  const condHit = (list || []).find(item => item.id !== form.id && sameConditions(item.conditions, serializedConditions));
  return { aliasHit, condHit };
}

export function usedByText (row, empty) {
  const list = (row && row.usedBy) || [];
  if (!list.length) return empty || '';
  return list.map(item => item.alias || item.id).join('、');
}

export function usedByTitle (row) {
  const list = (row && row.usedBy) || [];
  if (!list.length) return '没有任务在用';
  return '被 ' + list.map(item => item.alias || item.id).join('、') + ' 使用';
}
