const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(<App />);

const runLucide = () => {
  if (!window.lucide || !window.lucide.createIcons) return;
  window.lucide.createIcons();
};

const scheduleLucide = (() => {
  let rafId = null;
  return () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      runLucide();
    });
  };
})();

scheduleLucide();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      scheduleLucide();
      break;
    }
  }
});

observer.observe(rootEl, { childList: true, subtree: true });
