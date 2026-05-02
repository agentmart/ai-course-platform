// Sprint 6 — capstone flow.
//
// Triggers when:
//   - user is in sprint mode (localStorage.sprintTrack === 'true')
//   - they just completed the final sprint day (original day 60)
//   - their progress_data.completed_sprint is not yet true
//
// Flow:
//   1. Modal asks for demo URL.
//   2. POST /api/pledge (or PATCH if existing pledge) with demo_url.
//   3. POST /api/progress { completed_sprint: true }.
//   4. Offer to switch to full 60-day track (sprint_track=false).
//
// Wires into window.__sprintCapstoneCheck() — called from saveProgress hook.
(function(){
  if (window.__capstoneInit) return;
  window.__capstoneInit = true;

  var SPRINT_CAPSTONE_DAY = 60; // last entry in WEEK_THEMES[3].days

  function isSprintMode(){
    try { return localStorage.getItem('sprintTrack') === 'true'; } catch(e) { return false; }
  }

  function getToken(){
    if (window.clerk && window.clerk.session) return window.clerk.session.getToken();
    return Promise.resolve(null);
  }

  function buildModal(){
    var existing = document.getElementById('capstone-modal');
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = 'capstone-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    wrap.innerHTML = ''
      + '<div style="background:#fff;border-radius:8px;max-width:480px;width:100%;padding:32px 28px;font-family:\'DM Sans\',sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.3);">'
      +   '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;font-weight:600;color:#c8590a;letter-spacing:.08em;text-transform:uppercase;">Capstone</div>'
      +   '<h2 style="font-family:\'Fraunces\',serif;font-size:26px;margin:6px 0 8px;">You finished the 28-day Sprint 🎉</h2>'
      +   '<p style="color:#5a5a5a;line-height:1.6;font-size:14px;margin-bottom:18px;">Drop a public link to what you shipped — Loom, Notion, GitHub, deck, video, anything. We\'ll mark your pledge as fulfilled and add it to your share card.</p>'
      +   '<input id="capstone-url" type="url" placeholder="https://your-demo-link.com" style="width:100%;padding:12px 14px;border:1px solid #ddd;border-radius:4px;font-size:14px;font-family:inherit;margin-bottom:6px;" />'
      +   '<div id="capstone-err" style="font-size:12px;color:#dc2626;min-height:16px;margin-bottom:12px;"></div>'
      +   '<div style="display:flex;gap:10px;">'
      +     '<button id="capstone-submit" style="flex:1;padding:12px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-family:inherit;">Mark capstone shipped</button>'
      +     '<button id="capstone-skip" style="padding:12px 18px;background:transparent;color:#5a5a5a;border:none;cursor:pointer;font-family:inherit;text-decoration:underline;">Later</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(wrap);
    return wrap;
  }

  function buildGraduateModal(pledgeUrl){
    var wrap = document.createElement('div');
    wrap.id = 'capstone-grad-modal';
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    wrap.innerHTML = ''
      + '<div style="background:#fff;border-radius:8px;max-width:480px;width:100%;padding:32px 28px;font-family:\'DM Sans\',sans-serif;box-shadow:0 24px 60px rgba(0,0,0,.3);text-align:center;">'
      +   '<div style="font-size:42px;margin-bottom:10px;">🚀</div>'
      +   '<h2 style="font-family:\'Fraunces\',serif;font-size:26px;margin:0 0 8px;">Sprint capstone shipped.</h2>'
      +   '<p style="color:#5a5a5a;line-height:1.6;font-size:14px;margin-bottom:18px;">Your demo is live on your pledge page. Continue to the full 60-day course?</p>'
      +   (pledgeUrl ? '<a href="'+pledgeUrl+'" target="_blank" style="display:block;color:#c8590a;font-size:13px;margin-bottom:18px;">View your pledge →</a>' : '')
      +   '<div style="display:flex;gap:10px;">'
      +     '<button id="cap-grad-go" style="flex:1;padding:12px 18px;background:#1a1a1a;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-family:inherit;">Switch to full 60-day</button>'
      +     '<button id="cap-grad-stay" style="padding:12px 18px;background:transparent;color:#5a5a5a;border:none;cursor:pointer;font-family:inherit;text-decoration:underline;">Stay in sprint</button>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(wrap);
    document.getElementById('cap-grad-stay').onclick = function(){ wrap.remove(); };
    document.getElementById('cap-grad-go').onclick = async function(){
      try { localStorage.setItem('sprintTrack','false'); } catch(e){}
      try {
        var token = await getToken();
        if (token) {
          await fetch('/api/progress', {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
            body: JSON.stringify({ sprint_track: false })
          });
        }
      } catch(e){}
      wrap.remove();
      location.reload();
    };
  }

  async function fetchExistingPledge(token){
    try {
      var r = await fetch('/api/pledge?mine=1', { headers: { 'Authorization':'Bearer '+token } });
      if (!r.ok) return null;
      return await r.json();
    } catch(e) { return null; }
  }

  async function shipCapstone(demoUrl){
    var token = await getToken();
    if (!token) throw new Error('Sign in to record your capstone.');

    var existing = await fetchExistingPledge(token);
    var pledgeToken = existing && existing.token;
    var displayName = (window.clerk && window.clerk.user && (window.clerk.user.firstName || window.clerk.user.username)) || 'Builder';

    if (pledgeToken) {
      var pr = await fetch('/api/pledge', {
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({ token: pledgeToken, demo_url: demoUrl })
      });
      if (!pr.ok) throw new Error('Could not update pledge.');
    } else {
      var today = new Date().toISOString().slice(0,10);
      var cr = await fetch('/api/pledge', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({
          display_name: displayName,
          pledge_text: 'I shipped my AI PM Sprint capstone in 28 days.',
          track: 'sprint',
          target_date: today
        })
      });
      if (!cr.ok) throw new Error('Could not create pledge.');
      var cdata = await cr.json();
      pledgeToken = cdata.token;
      var pr2 = await fetch('/api/pledge', {
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
        body: JSON.stringify({ token: pledgeToken, demo_url: demoUrl })
      });
      if (!pr2.ok) throw new Error('Pledge created but demo update failed.');
    }

    await fetch('/api/progress', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body: JSON.stringify({ completed_sprint: true })
    });

    return '/pledge/' + pledgeToken;
  }

  function openCapstoneModal(){
    if (document.getElementById('capstone-modal')) return;
    var wrap = buildModal();
    var input = document.getElementById('capstone-url');
    var err = document.getElementById('capstone-err');
    var btn = document.getElementById('capstone-submit');
    var skip = document.getElementById('capstone-skip');
    skip.onclick = function(){ wrap.remove(); };
    btn.onclick = async function(){
      err.textContent = '';
      var url = (input.value || '').trim();
      if (!/^https?:\/\//i.test(url)) { err.textContent = 'Enter a valid http(s) URL.'; return; }
      btn.disabled = true; btn.textContent = 'Shipping…';
      try {
        var pledgeUrl = await shipCapstone(url);
        wrap.remove();
        buildGraduateModal(pledgeUrl);
      } catch(e) {
        err.textContent = e.message || 'Something went wrong.';
        btn.disabled = false; btn.textContent = 'Mark capstone shipped';
      }
    };
  }

  // Public hook: call after /api/progress responses to detect capstone trigger.
  window.__sprintCapstoneCheck = function(progressJson){
    if (!isSprintMode()) return;
    if (!progressJson) return;
    var completed = Array.isArray(progressJson.completed) ? progressJson.completed : null;
    var alreadyDone = !!progressJson.completed_sprint;
    if (alreadyDone) return;
    if (!completed || completed.indexOf(SPRINT_CAPSTONE_DAY) === -1) return;
    setTimeout(openCapstoneModal, 600);
  };

  // Also check on page load: if user already has all 28 sprint days done but never
  // recorded a capstone, prompt once per session.
  function bootCheck(){
    if (!isSprintMode()) return;
    if (sessionStorage.getItem('capstonePromptShown') === '1') return;
    getToken().then(function(token){
      if (!token) return;
      return fetch('/api/progress', { headers: { 'Authorization':'Bearer '+token } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(p){
          if (!p) return;
          if (p.completed_sprint) return;
          var done = Array.isArray(p.completed) && p.completed.indexOf(SPRINT_CAPSTONE_DAY) !== -1;
          if (done) {
            sessionStorage.setItem('capstonePromptShown','1');
            openCapstoneModal();
          }
        }).catch(function(){});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(bootCheck, 1500); });
  } else {
    setTimeout(bootCheck, 1500);
  }
})();
