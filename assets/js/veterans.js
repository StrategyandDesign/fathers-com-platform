/* Veterans front door. Two light steps, then into the hub.
   Onboarding rule: never more than a couple of taps to reach value. */
(function(){
  'use strict';
  var root = document.getElementById('vetOnboard');
  if (!root || !window.VET) return;

  var profile = VET.readLocal() || { service_context: null, combat_theater: false, separation_months: null, child_age_bands: [] };

  function show(step){
    root.querySelectorAll('.vet-step').forEach(function(s){
      s.hidden = (s.getAttribute('data-step') !== String(step));
    });
    var top = root.querySelector('.vet-step[data-step="' + step + '"]');
    if (top) { var h = top.querySelector('h2'); if (h) h.setAttribute('tabindex', '-1'); if (h) h.focus(); }
  }

  function pressToggle(group, value){
    group.querySelectorAll('[data-val]').forEach(function(b){
      b.classList.toggle('is-on', b.getAttribute('data-val') === String(value));
      b.setAttribute('aria-pressed', b.getAttribute('data-val') === String(value) ? 'true' : 'false');
    });
  }

  // Step 1: who are you
  root.querySelectorAll('.vet-opt[data-ctx]').forEach(function(btn){
    btn.addEventListener('click', function(){
      profile.service_context = btn.getAttribute('data-ctx');
      VET.writeLocal(profile);
      var sep = root.querySelector('[data-sep-block]');
      if (sep) sep.hidden = (profile.service_context !== 'veteran');
      show(2);
    });
  });

  // Step 2: combat
  var combat = root.querySelector('[data-combat]');
  if (combat) combat.querySelectorAll('[data-val]').forEach(function(b){
    b.addEventListener('click', function(){
      profile.combat_theater = (b.getAttribute('data-val') === 'yes');
      VET.writeLocal(profile);
      pressToggle(combat, b.getAttribute('data-val'));
    });
  });

  // Step 2: separation window (veterans only)
  var sep = root.querySelector('[data-sep]');
  if (sep) sep.querySelectorAll('[data-val]').forEach(function(b){
    b.addEventListener('click', function(){
      profile.separation_months = (b.getAttribute('data-val') === 'recent') ? 6 : 24;
      VET.writeLocal(profile);
      pressToggle(sep, b.getAttribute('data-val'));
    });
  });

  // Step 2: kids ages (multi-select)
  var kids = root.querySelector('[data-kids]');
  if (kids) kids.querySelectorAll('[data-band]').forEach(function(b){
    b.addEventListener('click', function(){
      var band = b.getAttribute('data-band');
      var set = profile.child_age_bands || [];
      var i = set.indexOf(band);
      if (i > -1) set.splice(i, 1); else set.push(band);
      profile.child_age_bands = set;
      VET.writeLocal(profile);
      b.classList.toggle('is-on', set.indexOf(band) > -1);
      b.setAttribute('aria-pressed', set.indexOf(band) > -1 ? 'true' : 'false');
    });
  });

  function go(){
    VET.saveProfile(profile).then(function(){ location.href = 'veterans-hub.html'; });
  }
  var cont = root.querySelector('#vetContinue');
  if (cont) cont.addEventListener('click', go);
  var skip = root.querySelector('[data-skip]');
  if (skip) skip.addEventListener('click', function(e){ e.preventDefault(); go(); });

  // Returning visitor who already has a context: offer a straight path in.
  if (profile.service_context) {
    var resume = document.getElementById('vetResume');
    if (resume) resume.hidden = false;
  }
})();
