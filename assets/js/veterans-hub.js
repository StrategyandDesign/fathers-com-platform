/* Veterans hub. Tools-first. Personalizes the greeting and names the single
   best-fit support resource in the minimal support line. The full directory
   lives on veterans-resources.html. */
(function(){
  'use strict';
  if (!window.VET) return;
  var greetEl = document.getElementById('vetGreet');
  var nameEl = document.getElementById('vetMatchName');
  var callEl = document.getElementById('vetMatchCall');
  if (!greetEl && !nameEl) return;

  var GREET = {
    active: 'You are still in the fight. This is for the front no one briefs you on: home.',
    guard_reserve: 'You carry two lives at once. This is for the one waiting at home.',
    veteran: 'You carried the load out there. Here is where you pick up the one that matters most.',
    family: 'You hold the line at home. Here is support for your family and the one who served.'
  };

  function init(){
    VET.getProfile().then(function(profile){
      if (!profile || !profile.service_context) { location.href = 'veterans.html'; return; }
      if (greetEl && GREET[profile.service_context]) greetEl.textContent = GREET[profile.service_context];

      var res = VET.matchResource(profile);
      if (nameEl && res) nameEl.textContent = res.name;
      if (callEl) {
        if (res && res.phoneHref) { callEl.setAttribute('href', res.phoneHref); }
        else { callEl.style.display = 'none'; }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
