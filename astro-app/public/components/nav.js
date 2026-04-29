/* Shared sidebar nav. Usage:
 *   <link rel="stylesheet" href="/components/nav.css">
 *   <aside id="app-nav"></aside>
 *   <script src="/components/nav.js"></script>
 *   <script>renderSidebar({ active: 'leaderboard' });</script>
 *
 * `active` is one of the item keys in NAV_ITEMS below. When omitted, no item is highlighted.
 */
(function () {
  var GROUPS = [
    {
      label: 'Learn',
      items: [
        { key: 'course',    href: '/course.html',              label: '60-Day AI PM',  icon: '\u25A0' }
      ]
    },
    {
      label: 'PM Toolkit',
      items: [
        { key: 'calculator', href: '/ai-calculator.html',      label: 'AI Calculator', icon: '\u00A4' }
      ]
    },
    {
      label: 'Discover',
      items: [
        { key: 'companies',  href: '/companies.html',          label: 'Companies',     icon: '\u25CE' },
        { key: 'jobs',       href: '/ai-pm-jobs.html',         label: 'AI PM Jobs',    icon: '\u25B8' },
        { key: 'gaps',       href: '/gaps.html',               label: 'Content Gaps',  icon: '\u25B3' },
        { key: 'how-to',     href: '/how-to-become-ai-pm.html',label: 'How-To',        icon: '?' },
        { key: 'pm-os',      href: '/pm-os.html',              label: 'PM-OS',         icon: '\u25C7' }
      ]
    },
    {
      label: 'Community',
      items: [
        { key: 'leaderboard', href: '/analytics.html',         label: 'Leaderboard',   icon: '\u2630' },
        { key: 'contact',     href: '/contact.html',           label: 'Contact',       icon: '@' }
      ]
    }
  ];

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildHtml(activeKey) {
    var groupsHtml = GROUPS.map(function (g) {
      var items = g.items.map(function (it) {
        var cls = 'nav-item' + (it.key === activeKey ? ' active' : '');
        var aria = it.key === activeKey ? ' aria-current="page"' : '';
        return '<a class="' + cls + '" href="' + escHtml(it.href) + '"' + aria + '>'
          + '<span class="nav-icon" aria-hidden="true">' + escHtml(it.icon) + '</span>'
          + '<span class="nav-label">' + escHtml(it.label) + '</span></a>';
      }).join('');
      return '<div class="nav-group">'
        + '<span class="nav-group-label">' + escHtml(g.label) + '</span>'
        + items + '</div>';
    }).join('');

    var settingsActive = activeKey === 'settings' ? ' active' : '';
    var settingsAria = activeKey === 'settings' ? ' aria-current="page"' : '';

    return ''
      + '<a class="nav-brand" href="/" aria-label="becomeaipm home">'
      +   '<img src="/assets/becomeaipm-logo-on-dark.svg" alt="" />'
      +   '<span class="brand-text">becomeaipm</span>'
      + '</a>'
      + '<button class="nav-toggle" type="button" aria-label="Collapse sidebar" data-nav-toggle>&#x276E;</button>'
      + '<div class="nav-scroll">'
      +   groupsHtml
      + '</div>'
      + '<div class="nav-bottom">'
      +   '<a class="nav-item' + settingsActive + '" href="/settings.html"' + settingsAria + '>'
      +     '<span class="nav-icon" aria-hidden="true">&#9881;</span>'
      +     '<span class="nav-label">Settings</span></a>'
      +   '<div class="nav-user" data-nav-user style="display:none">'
      +     '<div class="nav-avatar" data-nav-avatar>?</div>'
      +     '<span class="nav-uname" data-nav-uname></span>'
      +   '</div>'
      +   '<a class="nav-signin" href="#" data-nav-signin style="display:none">Sign In</a>'
      +   '<a class="nav-signout" href="#" data-nav-signout style="display:none">Sign Out</a>'
      + '</div>';
  }

  function applyAuth(root) {
    var user = (window.Clerk && window.Clerk.user) || null;
    var box  = root.querySelector('[data-nav-user]');
    var av   = root.querySelector('[data-nav-avatar]');
    var nm   = root.querySelector('[data-nav-uname]');
    var so   = root.querySelector('[data-nav-signout]');
    var si   = root.querySelector('[data-nav-signin]');
    if (user) {
      var initial = (user.firstName && user.firstName[0])
        || (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress && user.emailAddresses[0].emailAddress[0])
        || '?';
      var displayName = user.firstName || (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) || '';
      if (av) av.textContent = String(initial).toUpperCase();
      if (nm) nm.textContent = displayName;
      if (box) box.style.display = 'flex';
      if (so) so.style.display = 'block';
      if (si) si.style.display = 'none';
    } else {
      if (box) box.style.display = 'none';
      if (so) so.style.display = 'none';
      if (si) si.style.display = 'block';
    }
  }

  function pollClerk(root) {
    if (window.Clerk && window.Clerk.user !== undefined) {
      applyAuth(root);
      try { window.Clerk.addListener && window.Clerk.addListener(function () { applyAuth(root); }); } catch (_e) {}
      return;
    }
    setTimeout(function () { pollClerk(root); }, 250);
  }

  function setCollapsed(collapsed) {
    var root = document.getElementById('app-nav');
    if (!root) return;
    if (collapsed) {
      root.classList.add('collapsed');
      document.body.classList.add('nav-collapsed');
    } else {
      root.classList.remove('collapsed');
      document.body.classList.remove('nav-collapsed');
    }
    try { localStorage.setItem('navCollapsed', collapsed ? '1' : '0'); } catch (_e) {}
  }

  function setMobileOpen(open) {
    var root = document.getElementById('app-nav');
    if (!root) return;
    if (open) {
      root.classList.add('mobile-open');
      document.body.classList.add('mobile-open');
    } else {
      root.classList.remove('mobile-open');
      document.body.classList.remove('mobile-open');
    }
  }

  window.renderSidebar = function (opts) {
    var active = (opts && opts.active) || null;
    var root = document.getElementById('app-nav');
    if (!root) return;

    root.innerHTML = buildHtml(active);
    document.body.classList.add('has-app-nav');

    var savedCollapsed = false;
    try { savedCollapsed = localStorage.getItem('navCollapsed') === '1'; } catch (_e) {}
    setCollapsed(savedCollapsed);

    if (!document.getElementById('app-nav-hamburger')) {
      var hb = document.createElement('button');
      hb.id = 'app-nav-hamburger';
      hb.type = 'button';
      hb.setAttribute('aria-label', 'Open menu');
      hb.innerHTML = '&#9776;';
      hb.addEventListener('click', function () { setMobileOpen(true); });
      document.body.appendChild(hb);

      var bd = document.createElement('div');
      bd.id = 'app-nav-backdrop';
      bd.addEventListener('click', function () { setMobileOpen(false); });
      document.body.appendChild(bd);
    }

    var toggle = root.querySelector('[data-nav-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        setCollapsed(!root.classList.contains('collapsed'));
      });
    }

    var so = root.querySelector('[data-nav-signout]');
    if (so) so.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.Clerk && window.Clerk.signOut) {
        window.Clerk.signOut().then(function () { applyAuth(root); });
      }
    });
    var si = root.querySelector('[data-nav-signin]');
    if (si) si.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.Clerk && window.Clerk.openSignIn) {
        window.Clerk.openSignIn({
          fallbackRedirectUrl: window.location.href,
          signUpFallbackRedirectUrl: '/course.html'
        });
      } else {
        window.location.href = '/course.html';
      }
    });

    applyAuth(root);
    pollClerk(root);
  };
})();
