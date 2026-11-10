// Encaminha metadados sanitizados ao armazenamento local da extensão, em lotes pequenos.
(() => {
  if (window.__v2jDiagBridge) return;
  window.__v2jDiagBridge=true;
  const KEY = location.hostname === 'live.shopee.com.br' ? 'v2jShopeeDiagEnabled' : 'v2jDiagEnabled';
  let enabled = false;
  let queue = [];
  const setEnabled = value => {
    enabled = value === true;
    window.postMessage({ source: 'V2J_DIAG_BRIDGE', type: 'SET_ENABLED', enabled }, location.origin);
    if (!enabled) queue = [];
  };
  chrome.storage.local.get(KEY).then(data => setEnabled(data[KEY] === true));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) setEnabled(changes[KEY].newValue);
  });
  window.addEventListener('message', e => {
    if (!enabled || e.source !== window || e.origin !== location.origin || e.data?.source !== 'V2J_DIAG_MAIN') return;
    const x = e.data.event;
    if (!x || !/^\/(api|gateway|shopee)\//.test(x.path) || x.path.length > 180 || !/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(x.method)) return;
    queue.push({ at: x.at, method: x.method, path: x.path, status: x.status, ms: x.ms });
    if (queue.length > 100) queue = queue.slice(-100);
  });
  setInterval(() => {
    if (!enabled || !queue.length) return;
    const events = queue.splice(0, 100);
    chrome.runtime.sendMessage({ type: 'V2J_DIAG_RECORD', events }).catch(() => {});
  }, 10000);
  window.addEventListener('pagehide', () => {
    if (enabled && queue.length) chrome.runtime.sendMessage({ type: 'V2J_DIAG_RECORD', events: queue.splice(0, 100) }).catch(() => {});
  });
})();
