const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Auto Steering UI crashed', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#070b12', color: '#e2e8f0', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <section role="alert" style={{ width: 'min(520px, 100%)', padding: 24, border: '1px solid #334155', borderRadius: 16, background: '#0f172a', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
          <div style={{ color: '#38bdf8', fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Auto Steering UI</div>
          <h1 style={{ margin: '10px 0 8px', fontSize: 22 }}>The interface could not start</h1>
          <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.6 }}>Reload after rebuilding the browser bundle. If this keeps happening, clear this site's local data and try again.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 18, minHeight: 42, padding: '0 18px', border: 0, borderRadius: 10, background: '#0284c7', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Reload</button>
        </section>
      </main>
    );
  }
}

root.render(<AppErrorBoundary><App /></AppErrorBoundary>);

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
