/* Sprint 5 — gamification HUD (vanilla, matches course.html style)
 * Renders a streak pill + badge row in the top-right of the course UI,
 * and shows a milestone toast when /api/progress POST returns
 * newlyEarnedBadges.
 *
 * Public API:
 *   window.Gamification.init({ getToken })        // call after sign-in
 *   window.Gamification.handleProgressResponse(d) // call after saveProgress
 */
(function () {
  'use strict';

  var STYLE_ID = 'gamification-style';
  var HUD_ID = 'gam-hud';
  var TOAST_ID = 'gam-toast';
  var BADGE_LABELS = {
    7: 'First Week',
    14: '2-Week Builder',
    28: 'Sprint Capstone',
    30: '30-Day Veteran',
    60: 'Course Complete',
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#' + HUD_ID + '{position:fixed;top:14px;right:18px;z-index:50;display:flex;gap:8px;align-items:center;font-family:"DM Sans",sans-serif;}',
      '#' + HUD_ID + ' .gam-pill{background:rgba(0,0,0,.86);color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:.02em;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.1);box-shadow:0 2px 8px rgba(0,0,0,.18);}',
      '#' + HUD_ID + ' .gam-pill.streak{background:#1a1a1a;}',
      '#' + HUD_ID + ' .gam-pill .gam-flame{font-size:14px;}',
      '#' + HUD_ID + ' .gam-badges{display:flex;gap:4px;}',
      '#' + HUD_ID + ' .gam-badge{width:26px;height:26px;border-radius:50%;background:#c8590a;color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.18);box-shadow:0 1px 3px rgba(0,0,0,.2);}',
      '#' + HUD_ID + ' .gam-badge[data-n="60"]{background:linear-gradient(135deg,#c8590a,#f59e0b);}',
      '#' + TOAST_ID + '{position:fixed;left:50%;top:80px;transform:translate(-50%,-30px);background:#0a0a0a;color:#fff;padding:18px 28px;border-radius:14px;font-family:"DM Sans",sans-serif;font-size:14px;z-index:999;display:flex;align-items:center;gap:14px;box-shadow:0 20px 50px rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .35s ease, transform .35s ease;border:1px solid rgba(245,158,11,.4);}',
      '#' + TOAST_ID + '.show{opacity:1;transform:translate(-50%,0);pointer-events:auto;}',
      '#' + TOAST_ID + ' .gam-toast-medal{font-size:34px;}',
      '#' + TOAST_ID + ' .gam-toast-title{font-weight:700;font-size:16px;color:#fff;}',
      '#' + TOAST_ID + ' .gam-toast-sub{font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;}',
      '#' + TOAST_ID + ' .gam-toast-share{margin-left:8px;background:#f59e0b;color:#0a0a0a;border:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:"DM Sans",sans-serif;}',
      '@media(max-width:768px){#' + HUD_ID + '{top:10px;right:10px;}#' + HUD_ID + ' .gam-pill{font-size:11px;padding:5px 10px;}#' + HUD_ID + ' .gam-badge{width:22px;height:22px;font-size:10px;}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureHUD() {
    var hud = document.getElementById(HUD_ID);
    if (hud) return hud;
    hud = document.createElement('div');
    hud.id = HUD_ID;
    document.body.appendChild(hud);
    return hud;
  }

  function ensureToast() {
    var t = document.getElementById(TOAST_ID);
    if (t) return t;
    t = document.createElement('div');
    t.id = TOAST_ID;
    document.body.appendChild(t);
    return t;
  }

  function render(state) {
    if (!state) return;
    ensureStyle();
    var hud = ensureHUD();
    var streak = Number(state.streak || 0);
    var badges = (state.badges || []).filter(function (b) {
      return b && typeof b.n === 'number';
    });
    badges.sort(function (a, b) { return a.n - b.n; });
    var streakHTML = streak > 0
      ? '<span class="gam-pill streak" title="Calendar-day streak"><span class="gam-flame">🔥</span> ' + streak + '-day streak</span>'
      : '';
    var badgeHTML = badges.length
      ? '<span class="gam-badges">' + badges.map(function (b) {
          return '<span class="gam-badge" data-n="' + b.n + '" title="' + (BADGE_LABELS[b.n] || ('Day ' + b.n)) + '">' + b.n + '</span>';
        }).join('') + '</span>'
      : '';
    hud.innerHTML = streakHTML + badgeHTML;
    hud.style.display = (streakHTML || badgeHTML) ? 'flex' : 'none';
  }

  function showMilestoneToast(badge, displayName) {
    if (!badge || typeof badge.n !== 'number') return;
    ensureStyle();
    var t = ensureToast();
    var label = BADGE_LABELS[badge.n] || ('Day ' + badge.n + ' milestone');
    var name = encodeURIComponent(displayName || 'a future AI PM');
    var shareUrl = '/api/share-card?type=badge&name=' + name + '&n=' + badge.n;
    t.innerHTML =
      '<div class="gam-toast-medal">🏅</div>' +
      '<div><div class="gam-toast-title">' + label + ' unlocked!</div>' +
      '<div class="gam-toast-sub">Day ' + badge.n + ' of the journey. Keep going.</div></div>' +
      '<button class="gam-toast-share" onclick="window.open(\'' + shareUrl + '\', \'_blank\', \'width=800,height=500\')">Share card</button>';
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 6000);
  }

  // Cache of last server state so the HUD can re-render on demand.
  var lastState = null;

  async function refreshFromLeaderboard(getToken) {
    try {
      var token = await getToken();
      if (!token) return;
      var r = await fetch('/api/leaderboard', { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) return;
      var d = await r.json();
      if (d && d.me) {
        lastState = { streak: d.me.streak || 0, badges: d.me.badges || [] };
        render(lastState);
      }
    } catch (_) { /* silent — non-critical UI */ }
  }

  function handleProgressResponse(json, displayName) {
    if (!json) return;
    if (typeof json.streak === 'number' || Array.isArray(json.badges)) {
      lastState = {
        streak: typeof json.streak === 'number' ? json.streak : (lastState && lastState.streak) || 0,
        badges: Array.isArray(json.badges) ? json.badges : (lastState && lastState.badges) || [],
      };
      render(lastState);
    }
    var newly = json.newlyEarnedBadges || [];
    if (newly.length) {
      // Show the first; if multiple, queue with 7s gaps.
      newly.forEach(function (b, i) {
        setTimeout(function () { showMilestoneToast(b, displayName); }, i * 7000);
      });
    }
  }

  window.Gamification = {
    init: function (opts) {
      opts = opts || {};
      ensureStyle();
      if (typeof opts.getToken === 'function') {
        refreshFromLeaderboard(opts.getToken);
      }
    },
    handleProgressResponse: handleProgressResponse,
    render: render,
    refresh: refreshFromLeaderboard,
  };
})();
