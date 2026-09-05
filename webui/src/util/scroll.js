export function scrollToTop () {
  const main = document.querySelector('.vertex-main-content');
  if (main) {
    main.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
