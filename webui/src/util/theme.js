const STORAGE_KEY = 'vertex-theme';

function readMeta () {
  const meta = typeof document !== 'undefined' && document.querySelector('meta[name=vertex-theme]');
  const value = meta && meta.content;
  if (value && value !== 'VERTEX-THEME') return value;
  return '';
}

export function getThemeName () {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch (e) {
    /* ignore */
  }
  const fromMeta = readMeta();
  if (fromMeta) return fromMeta;
  return 'follow';
}

export function applyTheme (name) {
  const theme = name || getThemeName();
  const systemDark = typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = theme === 'dark' || theme === 'cyber' || (theme === 'follow' && systemDark);
  if (typeof document === 'undefined') return theme;
  document.documentElement.classList.toggle('dark', useDark);
  document.documentElement.classList.toggle('cyber', theme === 'cyber');
  const meta = document.querySelector('meta[name=vertex-theme]');
  if (meta) meta.content = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vertex-theme', { detail: theme }));
  }
  return theme;
}
