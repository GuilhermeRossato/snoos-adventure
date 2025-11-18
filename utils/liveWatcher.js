// liveWatcher.js
// Tracks all loaded .js and .css files, stores their content, periodically refetches them
// and reloads the page when a change is detected.

(function() {
  const DEBUG = false;
  const CHECK_INTERVAL_MS = 3000;
  // default 3s, can be changed via window.__LIVE_WATCHER_INTERVAL_MS
  const RETRY_COUNT = 1;

  function log(...args) {
    if (DEBUG)
      console.log('[liveWatcher]', ...args);
  }

  function now() {
    return new Date().toISOString();
  }

  // Helper: normalize URL to absolute
  function absoluteUrl(url) {
    try {
      return new URL(url,location.href).href;
    } catch (e) {
      log('absoluteUrl failed', url, e && e.message);
      return url;
    }
  }

  // Collect initial set of resources on the page: scripts and css links
  function collectResources() {
    const resources = [];

    // scripts
    document.querySelectorAll('script[src]').forEach(s => {
      const src = s.getAttribute('src');
      if (!src)
        return;
      const url = absoluteUrl(src);
      if (!url)
        return;
      resources.push({
        type: 'js',
        url,
        el: s
      });
    }
    );

    // css
    document.querySelectorAll('link[rel~="stylesheet"]').forEach(l => {
      const href = l.getAttribute('href');
      if (!href)
        return;
      const url = absoluteUrl(href);
      if (!url)
        return;
      resources.push({
        type: 'css',
        url,
        el: l
      });
    }
    );

    return resources;
  }

  // Fetch text content with cache-busting
  async function fetchText(url, tryNum=0) {
    const cacheBust = `_livewatch=${Date.now()}`;
    const sep = url.includes('?') ? '&' : '?';
    let busted = url + sep + cacheBust;
    window.fetchLiveWatchCount = (window.fetchLiveWatchCount || 0) + 1;
    if (window.fetchLiveWatchCount <= 8) {
      busted += '&s='+window.innerWidth+'x'+window.innerHeight;
    }
    try {
      const resp = await fetch(busted, {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!resp.ok)
        throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      log('fetched', url, 'len=', text.length);
      return text;
    } catch (err) {
      log('fetch failed', url, 'try', tryNum, err && err.message);
      if (tryNum < RETRY_COUNT)
        return fetchText(url, tryNum + 1);
      return null;
    }
  }

  // Simple hash function (FNV-1a 32-bit)
  function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h.toString(16);
  }

  // Watcher state
  const storeKey = '__LIVE_WATCHER_STORE_v1';
  const store = {
    files: {},
    // url -> {type, url, hash, text, lastChecked}
  };

  function loadStore() {
    try {
      const raw = sessionStorage.getItem(storeKey);
      if (!raw)
        return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.files)
        Object.assign(store.files, parsed.files);
      log('store loaded', Object.keys(store.files).length, 'entries');
    } catch (e) {
      log('loadStore failed', e && e.message);
    }
  }

  function saveStore() {
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(store));
    } catch (e) {
      log('saveStore failed', e && e.message);
    }
  }

  // Initialize: collect resources and fetch initial content if missing
  async function init() {
    loadStore();
    const resources = collectResources();
    log('collectResources', resources.map(r => r.url));

    // Add any new resources to store but don't overwrite existing content
    for (const r of resources) {
      if (!store.files[r.url]) {
        store.files[r.url] = {
          type: r.type,
          url: r.url,
          hash: null,
          text: null,
          lastChecked: null
        };
      }
    }

    // Fetch contents for any without text
    const toFetch = Object.values(store.files).filter(f => f.text == null);
    for (const f of toFetch) {
      const txt = await fetchText(f.url);
      if (txt != null) {
        f.text = txt;
        f.hash = hashString(txt);
        f.lastChecked = Date.now();
        log('initialized', f.url, 'hash', f.hash);
        saveStore();
      }
    }

    // start loop
    startLoop();
  }

  let loopId = null;
  async function checkOnce() {
    const entries = Object.values(store.files);
    for (const e of entries) {
      const txt = await fetchText(e.url);
      if (txt == null)
        continue;
      const h = hashString(txt);
      if (e.hash && e.hash !== h) {
        log(now(), 'resource changed:', e.url, 'oldHash=', e.hash, 'newHash=', h);
        // attempt safe reload: replace CSS or re-insert script
        tryReload(e, txt);
        // update store after reload
        e.hash = h;
        e.text = txt;
        e.lastChecked = Date.now();
        saveStore();
      } else {
        e.hash = e.hash || h;
        e.text = e.text || txt;
        e.lastChecked = Date.now();
      }
    }
  }

  function tryReload(entry, newText) {
    try {
      if (entry.type === 'css') {
        // find matching link element and replace it with a busted href
        const links = document.querySelectorAll(`link[rel~="stylesheet"]`);
        for (const l of links) {
          const href = absoluteUrl(l.getAttribute('href') || '');
          if (href === entry.url) {
            const newHref = entry.url + (entry.url.includes('?') ? '&' : '?') + 'reload=' + Date.now();
            l.setAttribute('href', newHref);
            log('reloaded css', entry.url);
            return;
          }
        }
        // fallback: append style tag
        const style = document.createElement('style');
        style.setAttribute('data-livewatcher', entry.url);
        style.textContent = newText;
        document.head.appendChild(style);
        log('injected css fallback for', entry.url);
        return;
      }

      if (entry.type === 'js') {
        // For scripts, best action is a full page reload to preserve state simplicity
        log('JS changed — reloading page to apply', entry.url);
        // small delay to let logs flush
        setTimeout( () => location.reload(), 80);
        return;
      }

      // default: reload page
      log('unknown type change — reload', entry.url);
      setTimeout( () => location.reload(), 80);
    } catch (e) {
      log('tryReload failed', e && e.message);
      setTimeout( () => location.reload(), 80);
    }
  }

  function startLoop() {
    const interval = window['__LIVE_WATCHER_INTERVAL_MS'] || CHECK_INTERVAL_MS;
    if (loopId)
      clearInterval(loopId);
    loopId = setInterval( () => {
      checkOnce().catch(err => log('checkOnce error', err && err.message));
    }
    , interval);
    log('watcher started, interval=', interval);
  }

  // Public API for debug/control
  // attach to window in a safe way without TypeScript complaints
  try {
    window['__liveWatcher'] = window['__liveWatcher'] || {};
  } catch (e) {// ignore
  }

  window['__liveWatcher'] = Object.assign(window['__liveWatcher'] || {}, {
    start: startLoop,
    stop: () => {
      if (loopId)
        clearInterval(loopId);
      loopId = null;
    }
    ,
    getStore: () => JSON.parse(JSON.stringify(store)),
    fetchNow: checkOnce
  });

  // auto-init after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

}
)();
