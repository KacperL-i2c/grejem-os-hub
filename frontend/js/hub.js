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
    if (kind === 'group') return 'Wybierz';
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
    if (app.kind === 'group') {
      var n = (app.children || []).length;
      return '<span class="tile-badge group">' + n + ' ' + plural(n, 'cel', 'cele', 'celów') + '</span>';
    }
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
    if (app.kind === 'web' || app.kind === 'native' || app.kind === 'group') {
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
    else if (app.kind === 'group') openGroupPicker(app);
    else toast('„' + app.title + '” pojawi się wkrótce w ekosystemie GREJEM.', 'warn', 'clock');
  }

  function openUrl(url) {
    if (isTauri()) {
      invoke('open_url', { url: url })
        .catch(function (e) { toast('Nie udało się otworzyć URL: ' + e, 'error', 'alert-triangle'); });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function openWeb(app) {
    var url = effectiveUrl(app);
    var canAutolaunch = !!app.command
                        && isLocalhostUrl(url)
                        && getStoredAutolaunch(app.id);

    if (!isTauri()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (canAutolaunch) {
      toast('Sprawdzanie serwera „' + app.title + '”…', 'info', 'loader');
      invoke('ensure_server', { url: url, command: app.command, args: [] })
        .then(function (status) {
          if (status === 'already_running') {
            openUrl(url);
          } else if (status === 'launched') {
            toast('Serwer „' + app.title + '” uruchomiony.', 'success', 'check-circle');
            openUrl(url);
            setTimeout(probeAll, 500);
          } else {
            toast('Serwer wciąż się uruchamia — otwieram URL.', 'warn', 'loader');
            openUrl(url);
            setTimeout(probeAll, 3000);
          }
        })
        .catch(function (e) {
          toast('Nie udało się uruchomić serwera: ' + e, 'error', 'alert-triangle');
          openUrl(url);
        });
      return;
    }

    openUrl(url);
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
    var url = effectiveUrl(app);
    if (isTauri()) {
      return invoke('probe_url', { url: url })
        .then(function (ok) { setStatus(app.id, ok ? 'online' : 'offline'); })
        .catch(function () { setStatus(app.id, 'offline'); });
    }
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 2500);
    return fetch(url, { mode: 'no-cors', signal: ctrl.signal, cache: 'no-store' })
      .then(function () { setStatus(app.id, 'online'); })
      .catch(function () { setStatus(app.id, 'offline'); })
      .then(function () { clearTimeout(t); });
  }

  function probeAll() {
    APPS.forEach(function (app) {
      if (app.kind === 'web' && app.status === 'auto') probe(app);
    });
  }

  /* ----------  Per-app settings persistence  ---------- */
  function getStoredUrl(id) {
    try { return localStorage.getItem('grejem-hub-url-' + id); } catch (e) { return null; }
  }
  function setStoredUrl(id, url) {
    try {
      if (url) localStorage.setItem('grejem-hub-url-' + id, url);
      else localStorage.removeItem('grejem-hub-url-' + id);
    } catch (e) {}
  }
  function getStoredAutolaunch(id) {
    try {
      var v = localStorage.getItem('grejem-hub-autolaunch-' + id);
      return v === null ? true : v === '1';
    } catch (e) { return true; }
  }
  function setStoredAutolaunch(id, enabled) {
    try { localStorage.setItem('grejem-hub-autolaunch-' + id, enabled ? '1' : '0'); } catch (e) {}
  }
  function effectiveUrl(app) {
    return getStoredUrl(app.id) || app.url;
  }
  function isLocalhostUrl(url) {
    return /^https?:\/\/(127\.0\.0\.1|localhost|\[?::1\]?)([:\/]|$)/i.test(url || '');
  }

  /* ----------  Group child URL persistence  ---------- */
  function getStoredChildUrl(parentId, childId) {
    try { return localStorage.getItem('grejem-hub-childurl-' + parentId + '-' + childId); }
    catch (e) { return null; }
  }
  function setStoredChildUrl(parentId, childId, url) {
    try {
      if (url) localStorage.setItem('grejem-hub-childurl-' + parentId + '-' + childId, url);
      else localStorage.removeItem('grejem-hub-childurl-' + parentId + '-' + childId);
    } catch (e) {}
  }
  function effectiveChildUrl(parentId, child) {
    return getStoredChildUrl(parentId, child.id) || child.url;
  }
  function normalizeUrlInput(v) {
    v = (v || '').trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'http://' + v;
    return v;
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
      if (pickerOverlay && !pickerOverlay.hidden) {
        closePicker();
        return;
      }
      if (settingsOverlay && !settingsOverlay.hidden) {
        closeSettings();
        return;
      }
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

  /* ----------  Settings modal  ---------- */
  var settingsOverlay = $('#settings-overlay');
  var settingsOpen = $('#settings-open');
  var settingsClose = $('#settings-close');
  var settingsCancel = $('#settings-cancel');
  var settingsSave = $('#settings-save');
  var settingGrejemUrl = $('#setting-grejem-url');
  var settingGrejemAutolaunch = $('#setting-grejem-autolaunch');
  var settingThemeLight = $('#setting-theme-light');
  var settingAutostart = $('#setting-autostart');
  var settingAppVersion = $('#setting-app-version');
  var settingDocsUrl = $('#setting-docs-url');
  var settingGithubUrl = $('#setting-github-url');
  var settingHomelabProxmox = $('#setting-homelab-proxmox');
  var settingHomelabPortainer = $('#setting-homelab-portainer');
  var settingHomelabHomepage = $('#setting-homelab-homepage');
  var settingHomelabGrafana = $('#setting-homelab-grafana');

  function openSettings() {
    settingGrejemUrl.value = getStoredUrl('grejem-os') || 'http://127.0.0.1:8080/';
    settingGrejemAutolaunch.checked = getStoredAutolaunch('grejem-os');
    var curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    settingThemeLight.checked = (curTheme === 'light');
    settingAppVersion.textContent = '…';
    if (settingDocsUrl) settingDocsUrl.value = getStoredUrl('docs') || 'http://127.0.0.1:8000/';
    if (settingGithubUrl) settingGithubUrl.value = getStoredUrl('github') || 'https://github.com/GrejemIndustries';
    if (settingHomelabProxmox) settingHomelabProxmox.value = getStoredChildUrl('home-lab', 'proxmox') || 'https://192.168.1.10:8006/';
    if (settingHomelabPortainer) settingHomelabPortainer.value = getStoredChildUrl('home-lab', 'portainer') || 'http://127.0.0.1:9000/';
    if (settingHomelabHomepage) settingHomelabHomepage.value = getStoredChildUrl('home-lab', 'homepage') || 'http://127.0.0.1:3002/';
    if (settingHomelabGrafana) settingHomelabGrafana.value = getStoredChildUrl('home-lab', 'grafana') || 'http://127.0.0.1:3000/';
    invoke('is_autostart_enabled')
      .then(function (on) { settingAutostart.checked = !!on; })
      .catch(function () { settingAutostart.checked = false; });
    invoke('app_version')
      .then(function (v) { settingAppVersion.textContent = v; })
      .catch(function () { settingAppVersion.textContent = '—'; });
    refreshIcons();
    settingsOverlay.hidden = false;
  }
  function closeSettings() { if (settingsOverlay) settingsOverlay.hidden = true; }

  function saveField(getter, defaultVal, store) {
    var v = normalizeUrlInput(getter.value);
    if (v && v !== defaultVal) store(v);
    else store(null);
    if (getter) getter.value = v || defaultVal;
  }

  function saveSettings() {
    var url = normalizeUrlInput(settingGrejemUrl.value);
    settingGrejemUrl.value = url || 'http://127.0.0.1:8080/';
    if (url && url !== 'http://127.0.0.1:8080/') setStoredUrl('grejem-os', url);
    else setStoredUrl('grejem-os', null);

    setStoredAutolaunch('grejem-os', settingGrejemAutolaunch.checked);

    if (settingDocsUrl) saveField(settingDocsUrl, 'http://127.0.0.1:8000/', function (v) { setStoredUrl('docs', v); });
    if (settingGithubUrl) saveField(settingGithubUrl, 'https://github.com/GrejemIndustries', function (v) { setStoredUrl('github', v); });
    if (settingHomelabProxmox) saveField(settingHomelabProxmox, 'https://192.168.1.10:8006/', function (v) { setStoredChildUrl('home-lab', 'proxmox', v); });
    if (settingHomelabPortainer) saveField(settingHomelabPortainer, 'http://127.0.0.1:9000/', function (v) { setStoredChildUrl('home-lab', 'portainer', v); });
    if (settingHomelabHomepage) saveField(settingHomelabHomepage, 'http://127.0.0.1:3002/', function (v) { setStoredChildUrl('home-lab', 'homepage', v); });
    if (settingHomelabGrafana) saveField(settingHomelabGrafana, 'http://127.0.0.1:3000/', function (v) { setStoredChildUrl('home-lab', 'grafana', v); });

    var wantLight = settingThemeLight.checked;
    applyTheme(wantLight ? 'light' : 'dark');
    setStoredTheme(wantLight ? 'light' : 'dark');

    invoke('set_autostart', { enabled: settingAutostart.checked })
      .catch(function (e) { toast('Autostart: ' + e, 'error', 'alert-triangle'); });

    closeSettings();
    toast('Ustawienia zapisane.', 'success', 'check');
    render();
    setTimeout(probeAll, 200);
  }

  if (settingsOpen) settingsOpen.addEventListener('click', openSettings);
  if (settingsClose) settingsClose.addEventListener('click', closeSettings);
  if (settingsCancel) settingsCancel.addEventListener('click', closeSettings);
  if (settingsSave) settingsSave.addEventListener('click', saveSettings);
  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', function (e) {
      if (e.target === settingsOverlay) closeSettings();
    });
  }

  /* ----------  Group picker modal  ---------- */
  var pickerOverlay = $('#picker-overlay');
  var CHILD_STATUS = {};

  function setChildStatus(parentId, childId, state) {
    var cid = parentId + '/' + childId;
    CHILD_STATUS[cid] = state;
    if (!pickerOverlay) return;
    var dot = pickerOverlay.querySelector('[data-child-status="' + cssEsc(cid) + '"]');
    if (dot) {
      dot.classList.remove('online', 'offline');
      if (state === 'online') dot.classList.add('online');
      else if (state === 'offline') dot.classList.add('offline');
    }
  }

  function cssEsc(s) {
    return String(s).replace(/"/g, '\\"');
  }

  function openGroupPicker(app) {
    if (!pickerOverlay) {
      toast('Picker niedostępny.', 'error', 'alert-triangle');
      return;
    }
    var children = app.children || [];
    if (children.length === 0) {
      toast('Brak celów w grupie „' + app.title + '”.', 'warn', 'info');
      return;
    }

    var html = '<div class="modal" role="dialog" aria-labelledby="picker-title" aria-modal="true">' +
      '<button class="modal-close" id="picker-close" type="button" aria-label="Zamknij">' +
        '<i data-lucide="x"></i></button>' +
      '<h2 id="picker-title">' + escapeHtml(app.title) + '</h2>' +
      '<p class="modal-desc">Wybierz cel do otwarcia.</p>' +
      '<div class="picker-list">';

    children.forEach(function (ch) {
      var url = effectiveChildUrl(app.id, ch);
      var local = isLocalhostUrl(url);
      var cid = app.id + '/' + ch.id;
      var state = local ? (CHILD_STATUS[cid] || 'loading') : 'online';
      var statusHtml = local
        ? '<span class="' + dotClassFor(state) + '" data-child-status="' + escapeHtml(cid) + '"></span>'
        : '<i data-lucide="arrow-up-right" class="picker-arrow"></i>';
      html +=
        '<button class="picker-item" type="button" data-url="' + escapeHtml(url) + '">' +
          '<span class="picker-icon"><i data-lucide="' + escapeHtml(ch.icon) + '"></i></span>' +
          '<span class="picker-body">' +
            '<span class="picker-title-row">' + escapeHtml(ch.title) + '</span>' +
            '<span class="picker-url">' + escapeHtml(url) + '</span>' +
          '</span>' +
          '<span class="picker-status">' + statusHtml + '</span>' +
        '</button>';
    });

    html += '</div></div>';
    pickerOverlay.innerHTML = html;
    pickerOverlay.hidden = false;
    refreshIcons();

    var closeBtn = $('#picker-close', pickerOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closePicker);
    $$('.picker-item', pickerOverlay).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = btn.getAttribute('data-url');
        closePicker();
        openUrl(url);
      });
    });

    children.forEach(function (ch) {
      var url = effectiveChildUrl(app.id, ch);
      if (!isLocalhostUrl(url) || !isTauri()) return;
      invoke('probe_url', { url: url })
        .then(function (ok) { setChildStatus(app.id, ch.id, ok ? 'online' : 'offline'); })
        .catch(function () { setChildStatus(app.id, ch.id, 'offline'); });
    });
  }

  function closePicker() {
    if (!pickerOverlay) return;
    pickerOverlay.hidden = true;
    pickerOverlay.innerHTML = '';
  }

  if (pickerOverlay) {
    pickerOverlay.addEventListener('click', function (e) {
      if (e.target === pickerOverlay) closePicker();
    });
  }

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
