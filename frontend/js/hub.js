/* GREJEM-OS HUB — logika renderowania / filtrowania / uruchamiania. Tauri v2 + Vanilla JS. */
(function () {
  'use strict';

  var APPS = (window.GREJEM_APPS || []).slice();
  var STATUS = {};

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  function isTauri() {
    return !!(window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function');
  }
  function invoke(cmd, args) {
    if (!isTauri()) return Promise.reject(new Error('Wymagane środowisko Tauri.'));
    return window.__TAURI__.core.invoke(cmd, args);
  }
  function getCurrentWindow() {
    var t = window.__TAURI__;
    if (!t) return null;
    if (t.window && t.window.getCurrentWindow) return t.window.getCurrentWindow();
    if (t.window && t.window.getCurrent) return t.window.getCurrent();
    if (t.webviewWindow && t.webviewWindow.getCurrentWebviewWindow) return t.webviewWindow.getCurrentWebviewWindow();
    return null;
  }

  var grid = $('#grid');
  var searchInput = $('#search');
  var emptyState = $('#empty-state');
  var tileCountEl = $('#tile-count');
  var clockEl = $('#clock');
  var themeToggle = $('#theme-toggle');
  var toastsEl = $('#toasts');

  var filtered = APPS.slice();

  /* ----------  Rendering  ---------- */
  function tileLaunchLabel(kind) {
    if (kind === 'web') return 'Otwórz';
    if (kind === 'native') return 'Uruchom';
    return '';
  }

  function statusLabel(status) {
    if (status === 'online') return 'Online';
    if (status === 'offline') return 'Offline';
    if (status === 'loading' || status === 'auto') return 'Sprawdzanie…';
    return 'Nieznany';
  }

  function effectiveStatus(app) {
    if (app.status === 'auto') return STATUS[app.id] || 'loading';
    return app.status;
  }

  function dotClassFor(state) {
    if (state === 'online') return 'status-dot online';
    if (state === 'offline') return 'status-dot offline';
    return 'status-dot';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function headIndicator(app) {
    if (app.kind === 'placeholder') return '<span class="tile-badge soon">Wkrótce</span>';
    if (app.kind === 'native') return '<span class="tile-badge native">Desktop</span>';
    var id = escapeHtml(app.id);
    var state = effectiveStatus(app);
    return '<span class="tile-status"><span class="' + dotClassFor(state) + '" data-status="' + id + '"></span>' +
           '<span data-status-label="' + id + '">' + statusLabel(state) + '</span></span>';
  }

  function buildTile(app, index) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'tile';
    el.setAttribute('role', 'listitem');
    el.setAttribute('data-id', app.id);
    el.setAttribute('data-kind', app.kind);
    el.style.setProperty('--tile-accent', app.accent);
    el.style.animationDelay = (Math.min(index, 12) * 35) + 'ms';
    el.tabIndex = 0;

    var launchHtml = '';
    if (app.kind === 'web' || app.kind === 'native') {
      launchHtml = '<span class="tile-launch">' + tileLaunchLabel(app.kind) +
                   '<i data-lucide="arrow-right"></i></span>';
    }
    var foot = '<span></span>' + launchHtml;

    el.innerHTML =
      '<div class="tile-head">' +
        '<span class="tile-icon"><i data-lucide="' + escapeHtml(app.icon) + '"></i></span>' +
        headIndicator(app) +
      '</div>' +
      '<div>' +
        '<div class="tile-title">' + escapeHtml(app.title) + '</div>' +
        '<div class="tile-subtitle">' + escapeHtml(app.subtitle) + '</div>' +
      '</div>' +
      '<p class="tile-desc">' + escapeHtml(app.description) + '</p>' +
      '<div class="tile-foot">' + foot + '</div>';

    el.addEventListener('click', function () { launch(app); });
    return el;
  }

  function render() {
    grid.innerHTML = '';
    filtered.forEach(function (app, i) { grid.appendChild(buildTile(app, i)); });
    if (emptyState) emptyState.hidden = filtered.length !== 0;
    if (tileCountEl) tileCountEl.textContent = filtered.length + ' ' + plural(filtered.length, 'aplikacja', 'aplikacje', 'aplikacji');
    refreshIcons();
  }

  function plural(n, one, few, many) {
    if (n === 1) return one;
    var mod10 = n % 10, mod100 = n % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /* ----------  Filtering  ---------- */
  var filterTimer = null;
  function onSearch() {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(applyFilter, 50);
  }
  function applyFilter() {
    var q = (searchInput.value || '').trim().toLowerCase();
    var tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      filtered = APPS.slice();
    } else {
      filtered = APPS.filter(function (app) {
        var hay = [app.title, app.subtitle, app.description].concat(app.tags).join(' ').toLowerCase();
        return tokens.every(function (t) { return hay.indexOf(t) !== -1; });
      });
    }
    render();
  }

  /* ----------  Launch logic  ---------- */
  function launch(app) {
    if (app.kind === 'web') openWeb(app);
    else if (app.kind === 'native') launchNative(app);
    else toast('„' + app.title + '” pojawi się wkrótce w ekosystemie GREJEM.', 'warn', 'clock');
  }

  function openWeb(app) {
    if (isTauri()) {
      invoke('open_url', { url: app.url })
        .catch(function (e) { toast('Nie udało się otworzyć URL: ' + e, 'error', 'alert-triangle'); });
    } else {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  }

  function launchNative(app) {
    if (isTauri()) {
      invoke('launch_app', { command: app.command || 'grejem-os', args: [] })
        .then(function () { toast('Uruchamianie „' + app.title + '”…', 'success', 'play'); })
        .catch(function (e) { toast('Błąd uruchamiania: ' + e, 'error', 'alert-triangle'); });
    } else {
      toast('Aplikacje natywne uruchamiane są z poziomu aplikacji Tauri.', 'warn', 'info');
    }
  }

  /* ----------  Status probing (web tiles)  ---------- */
  function setStatus(id, state) {
    STATUS[id] = state;
    var dot = grid.querySelector('[data-status="' + id + '"]');
    var label = grid.querySelector('[data-status-label="' + id + '"]');
    if (dot) {
      dot.classList.remove('online', 'offline');
      if (state === 'online') dot.classList.add('online');
      else if (state === 'offline') dot.classList.add('offline');
    }
    if (label) label.textContent = statusLabel(state);
  }

  function probe(app) {
    if (app.kind !== 'web' || app.status !== 'auto') return Promise.resolve();
    if (isTauri()) {
      return invoke('probe_url', { url: app.url })
        .then(function (ok) { setStatus(app.id, ok ? 'online' : 'offline'); })
        .catch(function () { setStatus(app.id, 'offline'); });
    }
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 2500);
    return fetch(app.url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' })
      .then(function () { setStatus(app.id, 'online'); })
      .catch(function () { setStatus(app.id, 'offline'); })
      .then(function () { clearTimeout(t); });
  }

  function probeAll() {
    APPS.forEach(function (app) {
      if (app.kind === 'web' && app.status === 'auto') probe(app);
    });
  }

  /* ----------  Theme  ---------- */
  function getStoredTheme() {
    try { return localStorage.getItem('grejem-hub-theme'); } catch (e) { return null; }
  }
  function setStoredTheme(t) {
    try { localStorage.setItem('grejem-hub-theme', t); } catch (e) {}
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeToggle.innerHTML = (t === 'dark') ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    themeToggle.setAttribute('aria-label', t === 'dark' ? 'Włącz motyw jasny' : 'Włącz motyw ciemny');
    refreshIcons();
  }
  themeToggle.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setStoredTheme(next);
  });

  /* ----------  Clock  ---------- */
  function tickClock() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    clockEl.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* ----------  Toasts  ---------- */
  function toast(msg, type, icon) {
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = '<i data-lucide="' + (icon || 'info') + '"></i><span>' + escapeHtml(msg) + '</span>';
    toastsEl.appendChild(t);
    refreshIcons();
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 3200);
  }

  /* ----------  Window controls (Tauri)  ---------- */
  function initWindowControls() {
    var min = $('#win-minimize');
    var close = $('#win-close');
    if (min) min.addEventListener('click', function () {
      var w = getCurrentWindow();
      if (w && w.minimize) { w.minimize(); return; }
      invoke('minimize_window').catch(function () {});
    });
    if (close) close.addEventListener('click', function () {
      var w = getCurrentWindow();
      if (w && w.hide) { w.hide(); return; }
      invoke('hide_window').catch(function () {});
    });
  }

  /* ----------  Keyboard  ---------- */
  function tilesFocusable() {
    return $$('.tile', grid).filter(function (el) { return el.tabIndex >= 0; });
  }
  function currentTileIndex() {
    var active = document.activeElement;
    if (!active || active.className !== 'tile') return -1;
    var list = tilesFocusable();
    return list.indexOf(active);
  }
  function colsInGrid() {
    var w = grid.querySelector('.tile');
    if (!w || !w.offsetWidth) return 1;
    var gap = parseFloat(getComputedStyle(grid).gap || '20px') || 20;
    var total = grid.clientWidth;
    return Math.max(1, Math.round(total / (w.offsetWidth + gap)));
  }
  function moveTile(delta) {
    var list = tilesFocusable();
    var i = currentTileIndex();
    if (i === -1) { if (list[0]) list[0].focus(); return; }
    var next = i + delta;
    if (next < 0) next = 0;
    if (next >= list.length) next = list.length - 1;
    list[next].focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (searchInput.value) { searchInput.value = ''; applyFilter(); searchInput.focus(); return; }
    }
    if (e.key === '/' && document.activeElement !== searchInput && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      searchInput.focus();
      return;
    }
    if (document.activeElement === searchInput) {
      if (e.key === 'ArrowDown') { e.preventDefault(); var l = tilesFocusable(); if (l[0]) l[0].focus(); }
      return;
    }
    var onTile = document.activeElement && document.activeElement.className === 'tile';
    if (onTile) {
      var cols = colsInGrid();
      if (e.key === 'ArrowRight') { e.preventDefault(); moveTile(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveTile(-1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveTile(cols); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveTile(-cols); }
      else if (e.key === 'Home') { e.preventDefault(); moveTile(-9999); }
      else if (e.key === 'End') { e.preventDefault(); moveTile(9999); }
    }
  });

  /* ----------  Init  ---------- */
  function init() {
    var stored = getStoredTheme();
    applyTheme(stored === 'light' ? 'light' : 'dark');
    render();
    searchInput.addEventListener('input', onSearch);
    initWindowControls();
    tickClock();
    setInterval(tickClock, 1000);
    setTimeout(probeAll, 500);
    setInterval(probeAll, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
