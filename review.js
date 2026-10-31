/* Review comments for the wedding site. Adapted from The MOHI review boards, but with its own storage: comments live in Supabase
   (public.westleys_review_comments), read and written only through the westleys_review_* functions, which check the review key.
   window.MOHI_REVIEW = {board, key?, mode: 'pins' | 'sections', sections?: {id: label}}
   pins:     templates board shell. Pins sit on the page inside the iframe; the list sits in a side panel.
   sections: brand guidelines. A "Comments & suggested edits" block at the end of each section. */
(function () {
  var CFG = window.MOHI_REVIEW || {};
  var API = 'https://afkjchshoktlmqrpopyk.supabase.co/rest/v1/rpc/';
  var APIKEY = 'sb_publishable_-prKRSiYudfdwYxC1o4Rbw_PZlcJt89';
  var NAME_KEY = 'mohi-review-name', CODE_KEY = 'mohi-review-code-' + CFG.board;
  var all = [], showResolved = false, me = store(NAME_KEY) || '', key = CFG.key || store(CODE_KEY) || '';

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function rpc(fn, args) {
    args.p_key = key;
    return fetch(API + fn, { method: 'POST', headers: { apikey: APIKEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || ('Error ' + r.status)); return j; }); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function when(t) { return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function tops(filter) { return all.filter(function (c) { return !c.parent_id && filter(c); }); }
  function replies(c) { return all.filter(function (r) { return r.parent_id === c.id; }); }
  function setName(n) { me = n.trim(); store(NAME_KEY, me); document.querySelectorAll('[data-rv-me]').forEach(function (x) { x.textContent = me || 'not set'; }); }
  function load() { if (!key) return Promise.resolve(); return rpc('westleys_review_list', {}).then(function (rows) { all = rows; draw(); }); }

  var CSS = '.rv-item{border-top:1px solid #CBD3DC;padding:14px 0;font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;line-height:1.45;color:#3A4558}' +
    '.rv-item.rv-res{border-left:3px solid #CBD3DC;padding-left:12px}.rv-item.rv-hl{background:#EEF1F5;box-shadow:0 0 0 8px #EEF1F5}' +
    '.rv-meta{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:14px}.rv-meta strong{font-weight:600}.rv-meta time{color:#5E6B80}' +
    '.rv-num{min-width:28px;height:28px;border-radius:14px;background:#2D3A52;color:#fff;border:0;font:600 13px/28px "Cormorant Garamond",Georgia,serif;text-align:center;padding:0 6px;cursor:pointer;letter-spacing:0;text-transform:none;min-height:0}' +
    '.rv-chip{font-size:12px;letter-spacing:.08em;text-transform:uppercase;border:1px solid #CBD3DC;padding:1px 8px;color:#3A4558}.rv-chip.rv-edit{border-color:#2D3A52;color:#2D3A52}' +
    '.rv-body{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.rv-reply{margin:10px 0 0 18px;padding-left:12px;border-left:2px solid #CBD3DC}' +
    '.rv-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.rv-actions button,.rv-btn{font:500 13px "Cormorant Garamond",Georgia,serif;letter-spacing:.06em;text-transform:none;min-height:36px;padding:0 12px;border:1px solid #3A4558;background:#fff;color:#3A4558;cursor:pointer}' +
    '.rv-btn.rv-primary{background:#2D3A52;border-color:#2D3A52;color:#fff}.rv-actions button:focus-visible,.rv-btn:focus-visible,.rv-num:focus-visible{outline:2px solid #2D3A52;outline-offset:2px}' +
    '.rv-form{display:grid;gap:10px;margin-top:10px}.rv-form label{display:grid;gap:4px;font-size:14px;font-weight:500}' +
    '.rv-form input[type=text],.rv-form input[type=password],.rv-form textarea{font:16px "Cormorant Garamond",Georgia,serif;color:#3A4558;border:1px solid #8A94A6;padding:10px;width:100%;box-sizing:border-box;background:#fff}' +
    '.rv-form textarea{min-height:96px;resize:vertical}.rv-form .rv-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rv-err{color:#8A2A1B;font-size:14px;margin:0}' +
    '.rv-radios{display:flex;flex-wrap:wrap;gap:6px 18px;border:0;padding:0;margin:0}.rv-radios legend{font-size:14px;font-weight:500;padding:0;margin-bottom:4px}.rv-radios label{display:flex;gap:6px;align-items:center;font-weight:400;min-height:36px}' +
    '.rv-empty{color:#5E6B80;font-size:14px;margin:12px 0}' +
    '@media (max-width:760px){.rv-sec{padding:20px 16px!important}.rv-actions button,.rv-btn{min-height:44px}.rv-num{min-width:44px;height:44px;border-radius:22px;line-height:44px}.rv-radios label{min-height:44px}}';
  document.head.appendChild(el('<style>' + CSS + '</style>'));

  /* One comment (with its replies) as an <article>. num = its pin number, or null. */
  function item(c, num, extra) {
    var mine = me && c.author.toLowerCase() === me.toLowerCase();
    var head = '<div class="rv-meta">' + (num != null ? '<button type="button" class="rv-num" data-rv-go="' + c.id + '" aria-label="Show comment ' + num + ' on the page">' + num + '</button>' : '') +
      '<strong>' + esc(c.author) + '</strong><time datetime="' + c.created_at + '">' + when(c.created_at) + '</time>' +
      (c.kind === 'edit' ? '<span class="rv-chip rv-edit">Suggested edit</span>' : '') + (extra || '') +
      (c.resolved ? '<span class="rv-chip">Resolved' + (c.resolved_by ? ' by ' + esc(c.resolved_by) : '') + '</span>' : '') + '</div>';
    var reps = replies(c).map(function (r) {
      var rm = me && r.author.toLowerCase() === me.toLowerCase();
      return '<div class="rv-reply"><div class="rv-meta"><strong>' + esc(r.author) + '</strong><time datetime="' + r.created_at + '">' + when(r.created_at) + '</time></div>' +
        '<p class="rv-body">' + esc(r.body) + '</p>' + (rm ? '<div class="rv-actions"><button type="button" data-rv-del="' + r.id + '">Delete my reply</button></div>' : '') + '</div>';
    }).join('');
    return '<article class="rv-item' + (c.resolved ? ' rv-res' : '') + '" id="rv-c-' + c.id + '">' + head + '<p class="rv-body">' + esc(c.body) + '</p>' + reps +
      '<div class="rv-actions"><button type="button" data-rv-reply="' + c.id + '">Reply</button>' +
      '<button type="button" data-rv-resolve="' + c.id + '">' + (c.resolved ? 'Reopen' : 'Resolve') + '</button>' +
      (mine ? '<button type="button" data-rv-del="' + c.id + '">Delete</button>' : '') + '</div><div data-rv-replybox="' + c.id + '"></div></article>';
  }

  function nameField() { return '<label>Your name <input type="text" name="author" required maxlength="80" autocomplete="name" value="' + esc(me) + '"></label>'; }

  /* Shared click handling for Reply / Resolve / Delete inside any list. */
  function wire(root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rvResolve) {
        if (!me) { var n = prompt('Your name, so others can see who resolved this:'); if (!n || !n.trim()) return; setName(n); }
        var c = all.filter(function (x) { return x.id === b.dataset.rvResolve; })[0];
        rpc('westleys_review_resolve', { p_id: c.id, p_resolved: !c.resolved, p_author: me }).then(load).catch(alert);
      } else if (b.dataset.rvDel) {
        if (confirm('Delete this comment? Replies to it are deleted too.')) rpc('westleys_review_delete', { p_id: b.dataset.rvDel, p_author: me }).then(load).catch(alert);
      } else if (b.dataset.rvReply) {
        var box = root.querySelector('[data-rv-replybox="' + b.dataset.rvReply + '"]');
        if (box.firstChild) { box.innerHTML = ''; return; }
        box.innerHTML = '<form class="rv-form">' + nameField() + '<label>Reply <textarea name="body" required maxlength="4000"></textarea></label>' +
          '<div class="rv-row"><button class="rv-btn rv-primary" type="submit">Post reply</button><button class="rv-btn" type="button" data-rv-cancel>Cancel</button></div><p class="rv-err" role="alert"></p></form>';
        var f = box.firstChild, parent = all.filter(function (x) { return x.id === b.dataset.rvReply; })[0];
        f.querySelector('[data-rv-cancel]').onclick = function () { box.innerHTML = ''; };
        f.onsubmit = function (ev) {
          ev.preventDefault(); setName(f.author.value);
          rpc('westleys_review_add', { p_page: parent.page, p_section: parent.section, p_kind: 'reply', p_parent: parent.id, p_author: me, p_body: f.body.value })
            .then(load).catch(function (er) { f.querySelector('.rv-err').textContent = er.message; });
        };
        f.querySelector(me ? 'textarea' : 'input').focus();
      } else if (b.dataset.rvGo && window.rvGo) window.rvGo(b.dataset.rvGo);
    });
  }

  var draw = function () {};

  /* ---------- sections mode (brand guidelines) ---------- */
  if (CFG.mode === 'sections') {
    var blocks = {};
    Object.keys(CFG.sections).forEach(function (id) {
      var sec = document.getElementById(id); if (!sec) return;
      var host = sec.firstElementChild && sec.firstElementChild.tagName === 'DIV' && /max-width/.test(sec.firstElementChild.getAttribute('style') || '') && sec.children.length === 1 ? sec.firstElementChild : sec;
      var b = el('<div class="rv-sec" style="margin-top:64px;padding:28px;background:#FFFFFF;border:1px solid #CBD3DC;max-width:820px" role="region" aria-label="Comments and suggested edits: ' + esc(CFG.sections[id]) + '">' +
        '<h3 style="margin:0;font-family:\'Cormorant Garamond\',serif;font-weight:400;font-size:28px;line-height:1.15">Comments &amp; suggested edits</h3>' +
        '<p style="margin:6px 0 0;font-size:14px;color:#5E6B80">' + esc(CFG.sections[id]) + ' section. Your name is shown on everything you post.</p><div data-rv-body></div></div>');
      host.appendChild(b); blocks[id] = b; wire(b);
    });
    draw = function () {
      Object.keys(blocks).forEach(function (id) {
        var b = blocks[id].querySelector('[data-rv-body]');
        if (!key) {
          b.innerHTML = '<form class="rv-form" data-rv-unlock><label>Review code <input type="password" name="code" required autocomplete="off"></label>' +
            '<div class="rv-row"><button class="rv-btn rv-primary" type="submit">Show comments</button></div><p class="rv-err" role="alert"></p></form>';
          b.firstChild.onsubmit = function (ev) {
            ev.preventDefault(); var f = ev.target; key = f.code.value.trim();
            load().then(function () { store(CODE_KEY, key); }).catch(function () { key = ''; f.querySelector('.rv-err').textContent = 'That review code didn’t work. Check it and try again.'; });
          };
          return;
        }
        var list = tops(function (c) { return c.section === id && (showResolved || !c.resolved); });
        var hidden = tops(function (c) { return c.section === id && c.resolved; }).length;
        var keep = b.querySelector('[data-rv-new]'), draft = keep ? { a: keep.author.value, k: keep.kind.value, t: keep.body.value } : null;
        b.innerHTML = (list.length ? list.map(function (c) { return item(c, null); }).join('') : '<p class="rv-empty">No comments yet.</p>') +
          (hidden && !showResolved ? '<p class="rv-empty"><button type="button" class="rv-btn" data-rv-showres>Show ' + hidden + ' resolved</button></p>' : '') +
          '<form class="rv-form" data-rv-new style="border-top:1px solid #CBD3DC;padding-top:16px;margin-top:4px">' + nameField() +
          '<fieldset class="rv-radios"><legend>Type</legend><label><input type="radio" name="kind" value="comment" checked> Comment</label><label><input type="radio" name="kind" value="edit"> Suggested edit</label></fieldset>' +
          '<label>Your note <textarea name="body" required maxlength="4000"></textarea></label><div class="rv-row"><button class="rv-btn rv-primary" type="submit">Post</button></div><p class="rv-err" role="alert"></p></form>';
        var f = b.querySelector('[data-rv-new]');
        if (draft) { f.author.value = draft.a; f.kind.value = draft.k; f.body.value = draft.t; }
        var sr = b.querySelector('[data-rv-showres]'); if (sr) sr.onclick = function () { showResolved = true; draw(); };
        f.onsubmit = function (ev) {
          ev.preventDefault(); setName(f.author.value);
          rpc('westleys_review_add', { p_page: 'Brand', p_section: id, p_kind: f.kind.value, p_author: me, p_body: f.body.value })
            .then(function () { f.body.value = ''; return load(); }).catch(function (er) { f.querySelector('.rv-err').textContent = er.message; });
        };
      });
    };
    draw(); load().catch(function () { key = ''; store(CODE_KEY, null); draw(); });
    setInterval(function () { if (document.visibilityState === 'visible' && key && !document.querySelector('.rv-sec textarea:focus,.rv-sec input:focus')) load().catch(function () {}); }, 30000);
    return;
  }

  /* ---------- pins mode (templates board shell) ---------- */
  var S = function () { return window.MOHI || {}; };
  var modeBtn = document.getElementById('rv-mode'), panelBtn = document.getElementById('rv-panel-btn'), panel = document.getElementById('rv-panel');
  var list = document.getElementById('rv-list'), dlg = document.getElementById('rv-dialog'), commenting = false, pending = null;
  wire(list);

  function pageComments() { var p = S().page; return tops(function (c) { return c.page === p; }); }
  function numbered() { var n = 0, m = {}; pageComments().forEach(function (c) { m[c.id] = ++n; }); return m; }
  function doc() { try { return S().ifr.contentDocument; } catch (e) { return null; } }

  function drawPins() {
    var d = doc(); if (!d || !d.body || d.URL === 'about:blank' || d.readyState === 'loading') return;
    var layer = d.getElementById('rv-layer');
    if (!layer) {
      d.head.appendChild(Object.assign(d.createElement('style'), { textContent:
        '#rv-layer{position:absolute;left:0;top:0;width:100%;height:0;z-index:2147483000}' +
        '.rv-pin{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50% 50% 50% 0;background:#2D3A52;color:#fff;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);font:600 15px/36px "Cormorant Garamond",Georgia,serif;text-align:center;cursor:pointer;padding:0}' +
        '.rv-pin.rv-res{background:#8A94A6}.rv-pin.rv-new{background:#3A4558}.rv-pin.rv-hl{outline:4px solid rgba(45,58,82,.4)}.rv-pin:focus-visible{outline:3px solid #3A4558;outline-offset:2px}' +
        'html.rv-on,html.rv-on *{cursor:crosshair!important}html.rv-on .rv-pin{cursor:pointer!important}' }));
      layer = d.createElement('div'); layer.id = 'rv-layer'; d.body.appendChild(layer);
      d.addEventListener('click', function (e) {
        var pin = e.target.closest && e.target.closest('.rv-pin');
        if (pin) { e.preventDefault(); e.stopPropagation(); if (pin.dataset.id) openPanel(pin.dataset.id); return; }
        if (!commenting) return;
        e.preventDefault(); e.stopPropagation();
        var w = d.documentElement.clientWidth;
        compose({ x: Math.max(0, Math.min(100, e.pageX / w * 100)), y: Math.max(0, e.pageY) });
      }, true);
    }
    layer.innerHTML = '';
    var nums = numbered(), view = S().view;
    pageComments().forEach(function (c) {
      if (c.x_pct == null || c.view !== view || (c.resolved && !showResolved)) return;
      var b = d.createElement('button'); b.type = 'button'; b.className = 'rv-pin' + (c.resolved ? ' rv-res' : '');
      b.dataset.id = c.id; b.textContent = nums[c.id]; b.style.left = c.x_pct + '%'; b.style.top = c.y_px + 'px';
      b.setAttribute('aria-label', 'Comment ' + nums[c.id] + ' by ' + c.author); layer.appendChild(b);
    });
    if (pending && pending.x != null) {
      var t = d.createElement('div'); t.className = 'rv-pin rv-new'; t.textContent = '+'; t.style.left = pending.x + '%'; t.style.top = pending.y + 'px'; layer.appendChild(t);
    }
    d.documentElement.classList.toggle('rv-on', commenting);
  }

  function drawList() {
    var nums = numbered(), view = S().view, p = S().page;
    var shown = pageComments().filter(function (c) { return showResolved || !c.resolved; });
    var hidden = pageComments().filter(function (c) { return c.resolved; }).length;
    document.getElementById('rv-title').textContent = 'Comments · ' + (S().name || p);
    list.innerHTML = shown.length ? shown.map(function (c) {
      var where = c.x_pct == null ? '<span class="rv-chip">Whole page</span>' : (c.view !== view ? '<span class="rv-chip">' + (c.view === 'phone' ? 'Phone' : 'Desktop') + ' view</span>' : '');
      return item(c, c.x_pct == null ? null : nums[c.id], where);
    }).join('') : '<p class="rv-empty">' + (hidden ? 'No open comments on this page.' : 'No comments on this page yet. Turn on Comment and click anywhere on the page, or use the button above.') + '</p>';
    var rb = document.getElementById('rv-showres'); rb.textContent = showResolved ? 'Hide resolved' : 'Show resolved' + (hidden ? ' (' + hidden + ')' : '');
    var open = pageComments().filter(function (c) { return !c.resolved; }).length;
    document.getElementById('rv-count').textContent = open ? '(' + open + ')' : '';
    document.querySelectorAll('[data-page]').forEach(function (b) {
      var n = tops(function (c) { return c.page === b.dataset.page && !c.resolved; }).length, s = b.querySelector('.rv-badge');
      if (!s) { s = document.createElement('span'); s.className = 'rv-badge'; b.appendChild(s); }
      s.textContent = n ? n : ''; s.hidden = !n; s.setAttribute('aria-label', n + (n === 1 ? ' open comment' : ' open comments'));
    });
  }
  draw = function () { drawList(); drawPins(); };

  function openPanel(id) {
    panel.hidden = false; panelBtn.setAttribute('aria-expanded', 'true'); document.body.classList.add('rv-open');
    if (id) {
      var c = all.filter(function (x) { return x.id === id; })[0];
      if (c && c.resolved && !showResolved) { showResolved = true; draw(); }
      var a = document.getElementById('rv-c-' + id);
      if (a) { a.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); a.classList.add('rv-hl'); setTimeout(function () { a.classList.remove('rv-hl'); }, 1600); }
    }
  }
  function closePanel() { panel.hidden = true; panelBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('rv-open'); panelBtn.focus(); }
  window.rvGo = function (id) {
    var c = all.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (c.view !== S().view) { S().setView(c.view); setTimeout(function () { window.rvGo(id); }, 700); return; }
    var d = doc(); if (!d) return;
    S().ifr.contentWindow.scrollTo({ top: Math.max(0, c.y_px - 240), behavior: 'smooth' });
    var pin = d.querySelector('.rv-pin[data-id="' + id + '"]'); if (pin) { pin.classList.add('rv-hl'); setTimeout(function () { pin.classList.remove('rv-hl'); }, 1600); }
  };

  function compose(at) {
    pending = at || {}; drawPins();
    document.getElementById('rv-dlg-title').textContent = at ? 'Comment on this spot' : 'Comment on the whole page';
    var f = dlg.querySelector('form'); f.author.value = me; f.body.value = ''; dlg.querySelector('.rv-err').textContent = '';
    dlg.showModal(); (me ? f.body : f.author).focus();
  }
  dlg.addEventListener('close', function () { pending = null; drawPins(); });
  dlg.querySelector('[data-rv-cancel]').onclick = function () { dlg.close(); };
  dlg.querySelector('form').onsubmit = function (ev) {
    ev.preventDefault(); var f = ev.target; setName(f.author.value);
    var a = { p_page: S().page, p_author: me, p_body: f.body.value, p_kind: 'comment' };
    if (pending && pending.x != null) { a.p_view = S().view; a.p_x = pending.x; a.p_y = pending.y; }
    rpc('westleys_review_add', a).then(function (row) { dlg.close(); return load().then(function () { openPanel(row.id); }); })
      .catch(function (er) { dlg.querySelector('.rv-err').textContent = er.message; });
  };

  modeBtn.onclick = function () {
    commenting = !commenting; modeBtn.setAttribute('aria-pressed', commenting);
    modeBtn.textContent = commenting ? 'Commenting: click the page' : 'Comment'; drawPins();
  };
  panelBtn.onclick = function () { panel.hidden ? openPanel() : closePanel(); };
  document.getElementById('rv-close').onclick = closePanel;
  document.getElementById('rv-general').onclick = function () { compose(null); };
  document.getElementById('rv-showres').onclick = function () { showResolved = !showResolved; draw(); };
  document.getElementById('rv-name-change').onclick = function () { var n = prompt('Your name, as it should appear on your comments:', me); if (n && n.trim()) { setName(n); draw(); } };
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  setName(me);
  addEventListener('mohi:render', function () {
    S().ifr.addEventListener('load', drawPins); draw();
  });
  if (S().ifr) S().ifr.addEventListener('load', drawPins); // the shell's first render runs before this script loads
  setInterval(function () { if (document.visibilityState === 'visible' && !dlg.open && !panel.querySelector('textarea:focus,input:focus')) load().catch(function () {}); }, 30000);
  load().catch(function (e) { list.innerHTML = '<p class="rv-err">Comments could not load: ' + esc(e.message) + '</p>'; });
})();
