import { viewport } from '../mixins/responsive';

const SKIP = /getRunInfo|getHosts|getProxy|\/user\/login/;

let navToken = 0;
let inflight = 0;
let hideTimer = 0;

const setFlag = (on) => {
  viewport.pageLoading = on;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('fn-page-loading', on);
  }
};

const maybeHide = (token) => {
  if (token !== navToken || inflight > 0) return;
  setFlag(false);
};

export const beginPageLoad = () => {
  navToken += 1;
  const token = navToken;
  inflight = 0;
  setFlag(true);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => maybeHide(token), 280);
};

export const trackListGet = (url) => {
  if (SKIP.test(url || '')) return () => {};
  if (!viewport.pageLoading && inflight === 0) return () => {};
  const token = navToken;
  inflight += 1;
  setFlag(true);
  return () => {
    inflight = Math.max(0, inflight - 1);
    if (inflight === 0) maybeHide(token);
  };
};
