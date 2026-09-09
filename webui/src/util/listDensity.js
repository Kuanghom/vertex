const STORAGE_KEY = 'vertex:list-density';

export const LIST_DENSITY_EVENT = 'vertex-list-density-change';

export function getCompactList () {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'compact';
  } catch (e) {
    return false;
  }
}

export function applyListDensity (compact = getCompactList()) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('fn-list-compact', compact);
}

export function setCompactList (compact) {
  const next = !!compact;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'compact' : 'standard');
  } catch (e) {}
  applyListDensity(next);
  window.dispatchEvent(new CustomEvent(LIST_DENSITY_EVENT, { detail: next }));
}
