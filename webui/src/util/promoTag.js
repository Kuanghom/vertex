export const PROMO_LABELS = {
  free: '免费',
  '2xfree': '2X免费',
  '2x': '2X',
  '50%': '50%',
  '30%': '30%',
  '2x50%': '2X50%',
  normal: '普通'
};

export const PROMO_OPTIONS = [
  { value: 'free', label: PROMO_LABELS.free },
  { value: '2xfree', label: PROMO_LABELS['2xfree'] },
  { value: '2x', label: PROMO_LABELS['2x'] },
  { value: '50%', label: PROMO_LABELS['50%'] },
  { value: '30%', label: PROMO_LABELS['30%'] },
  { value: '2x50%', label: PROMO_LABELS['2x50%'] }
];

const LABEL_TO_TYPE = {
  免费: 'free',
  '2X免费': '2xfree',
  '2X': '2x',
  '50%': '50%',
  '30%': '30%',
  '2X50%': '2x50%',
  普通: 'normal',
  未检测: 'unknown',
  检测失败: 'error'
};

export function resolvePromoType (label, promoType) {
  if (promoType && promoType !== 'normal') {
    return promoType;
  }
  if (label && LABEL_TO_TYPE[label]) {
    return LABEL_TO_TYPE[label];
  }
  if (promoType) {
    return promoType;
  }
  return 'unknown';
}
