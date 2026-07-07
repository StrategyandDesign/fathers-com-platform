/* Veteran identification, after joining. Sign-in required.
   - Signed out: send to sign-in, then back here.
   - Signed in and already identified: straight to the hub.
   - Signed in and new: the two-step identify, saved to the account, then the hub.
   The three free films and the resources directory stay open with no login;
   only this personalized step sits behind joining. */
(function(){
  'use strict';
  var root = document.getElementById('vetOnboard');
  var loading = document.getElementById('vetStartLoading');
  if (!root || !window.VET) return;

  var profile = { service_context: null, combat_theater: false, separation_months: null, child_age_bands: [] };

  function show(step){
    root.querySelectorAll('.vet-step').forEach(function(s){
      s.hidden = (s.getAttribute('data-step') !== String(step));
    });
    var top = root.querySelector('.vet-step[data-step="' + step + '"]');
    if (top) { var h = top.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
  }

  function pressToggle(group, value){
    group.querySelectorAll('[data-val]').forEach(function(b){
      var on = b.getAttribute('data-val') === String(value);
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function wire(){
    root.querySelectorAll('.vet-opt[data-ctx]').forEach(function(btn){
      btn.addEventListener('click', function(){
        profile.service_context = btn.getAttribute('data-ctx');
        var sep = root.querySelector('[data-sep-block]');
        if (sep) sep.hidden = (profile.service_context !== 'veteran');
        show(2);
      });
    });
    var combat = root.querySelector('[data-combat]');
    if (combat) combat.querySelectorAll('[data-val]').forEach(function(b){
      b.addEventListener('click', function(){
        profile.combat_theater = (b.getAttribute('data-val') === 'yes');
        pressToggle(combat, b.getAttribute('data-val'));
      });
    });
    var sep = root.querySelector('[data-sep]');
    if (sep) sep.querySelectorAll('[data-val]').forEach(function(b){
      b.addEventListener('click', function(){
        profile.separation_months = (b.getAttribute('data-val') === 'recent') ? 6 : 24;
        pressToggle(sep, b.getAttribute('data-val'));
      });
    });
    var kids = root.querySelector('[data-kids]');
    if (kids) kids.querySelectorAll('[data-band]').forEach(function(b){
      b.addEventListener('click', function(){
        var band = b.getAttribute('data-band');
        var set = profile.child_age_bands || [];
        var i = set.indexOf(band);
        if (i > -1) set.splice(i, 1); else set.push(band);
        profile.child_age_bands = set;
        var on = set.indexOf(band) > -1;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
    function go(){ VET.saveProfile(profile).then(function(){ location.href = 'veterans-hub.html'; }); }
    var cont = root.querySelector('#vetContinue');
    if (cont) cont.addEventListener('click', go);
    var skip = root.querySelector('[data-skip]');
    if (skip) skip.addEventListener('click', function(e){ e.preventDefault(); go(); });
  }

  function reveal(){ if (loading) loading.hidden = true; root.hidden = false; }

  function init(){
    // Demo (no backend keys): let a father identify locally so the flow is visible.
    if (!window.FC || !FC.live) { reveal(); wire(); return; }
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) { location.href = 'login.html?next=veterans-start.html'; return; }
      VET.getProfile().then(function(p){
        if (p && p.service_context) { location.href = 'veterans-hub.html'; return; }
        reveal(); wire();
      });
    }).catch(function(){ reveal(); wire(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
