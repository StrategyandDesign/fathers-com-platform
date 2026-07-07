/* Veterans hub. Renders support matched to the father's context.
   The rest of the hub (Voice, modules, check-in) is static in the page. */
(function(){
  'use strict';
  if (!window.VET) return;
  var matchEl = document.getElementById('vetMatch');
  var secEl = document.getElementById('vetSecondary');
  var greetEl = document.getElementById('vetGreet');
  if (!matchEl) return;

  var GREET = {
    active: 'You are still in the fight. This is for the front no one briefs you on: home.',
    guard_reserve: 'You carry two lives at once. This is for the one waiting at home.',
    veteran: 'You carried the load out there. Here is where you pick up the one that matters most.',
    family: 'You hold the line at home. Here is support for your family and the one who served.'
  };

  function init(){
    VET.getProfile().then(function(profile){
      if (!profile || !profile.service_context) {
        // No context yet. Send them to the front door to answer one question.
        location.href = 'veterans.html';
        return;
      }

      if (greetEl && GREET[profile.service_context]) {
        greetEl.textContent = GREET[profile.service_context];
      }

      var primary = VET.matchResource(profile);
      matchEl.innerHTML = VET.resourceCardHTML(primary, { primary: true, full: true });

      if (secEl) {
        var extra = VET.secondaryKeys(profile).map(function(k){
          return VET.resourceCardHTML(VET.RESOURCES[k], { full: false });
        }).join('');
        secEl.innerHTML = extra;
      }
    });
  }

  // Wait for the footer client scripts to load before reading the signed-in profile.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
