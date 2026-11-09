const DIAG_KEY = 'v2jDiagnostics';
let diagWrite = Promise.resolve();
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type !== 'V2J_DIAG_RECORD') return;
  if (!sender.tab?.url?.startsWith('https://shop.tiktok.com/streamer/live/')) return;
  const events = Array.isArray(msg.events) ? msg.events.slice(0, 100).filter(e =>
    Number.isFinite(e.at) && e.at > Date.now() - 86400000 &&
    typeof e.path === 'string' && /^\/api\//.test(e.path) && e.path.length <= 180 &&
    /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/.test(e.method) &&
    Number.isInteger(e.status) && e.status >= 0 && e.status <= 599 &&
    Number.isFinite(e.ms) && e.ms >= 0 && e.ms <= 600000
  ).map(e => ({ at: e.at, path: e.path, method: e.method, status: e.status, ms: e.ms })) : [];
  if (!events.length) return;
  diagWrite = diagWrite.then(async () => {
    const data = await chrome.storage.local.get([DIAG_KEY, 'v2jDiagEnabled']);
    if (!data.v2jDiagEnabled) return;
    const old = data[DIAG_KEY] || { startedAt: Date.now(), events: [], total: 0 };
    const recent = [...old.events, ...events].slice(-1200);
    await chrome.storage.local.set({ [DIAG_KEY]: { startedAt: old.startedAt, updatedAt: Date.now(), total: (old.total || 0) + events.length, events: recent } });
  }).catch(() => {});
});
