/* ============================================================
   Veterans core. The shared brain for the Veterans program.
   - Real, free public resources (the routing destinations)
   - Deterministic matching: a father's context to the one right service
   - Profile read/write (Supabase when signed in, localStorage otherwise)
   No secrets live here. Self-attestation is a claim, not a security boundary;
   the server (RLS) is the only thing that gates real data.
   ============================================================ */
window.VET = window.VET || {};
(function(){
  'use strict';

  // ---- HTML escape for any value rendered into the DOM ----
  VET.esc = function(s){
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  };

  // ---- Crisis support. Never gated, referenced everywhere. ----
  VET.CRISIS = {
    key: 'crisis',
    name: 'Veterans and Military Crisis Line',
    tagline: 'Free and confidential, 24/7, for every service member, veteran, and family member, even if not enrolled in VA care.',
    phoneHref: 'tel:988',
    phoneLabel: 'Call 988, then press 1',
    textHref: 'sms:838255',
    textLabel: 'Text 838255',
    url: 'https://www.veteranscrisisline.net/get-help-now/chat/',
    urlLabel: 'Start a confidential chat'
  };

  // ---- The free services we route to. All verified public resources. ----
  VET.RESOURCES = {
    vet_center: {
      key: 'vet_center',
      name: 'Vet Center',
      tagline: 'Free, confidential readjustment counseling in a relaxed, non-medical setting. Individual, group, and family counseling. No VA enrollment needed.',
      phoneHref: 'tel:18779278387',
      phoneLabel: 'Call 877-WAR-VETS (877-927-8387)',
      url: 'https://www.va.gov/find-locations/?facilityType=vet_center',
      urlLabel: 'Find a Vet Center near you',
      expect: [
        'Counselors are often combat veterans themselves.',
        'Your family can be part of the counseling, for military-related issues.',
        'It is separate from VA medical records, and strictly confidential.',
        'The call center is staffed 24/7 by combat veterans.'
      ],
      note: 'For veterans and service members who served in a combat zone, and their families.'
    },
    military_onesource: {
      key: 'military_onesource',
      name: 'Military OneSource',
      tagline: 'Free, confidential non-medical counseling by licensed counselors, in person, by phone, or by secure video. It does not affect your career or security clearance.',
      phoneHref: 'tel:18003429647',
      phoneLabel: 'Call 800-342-9647',
      url: 'https://www.militaryonesource.mil/confidential-help/non-medical-counseling/',
      urlLabel: 'Learn about non-medical counseling',
      expect: [
        'Counselors hold a master\u2019s or doctoral degree and a license to practice.',
        'Sessions are confidential and are not reported to your command.',
        'Short-term and solution-focused, built for military life.',
        'Available 24/7 by phone and online.'
      ],
      note: 'For active duty, National Guard and Reserve, and veterans within one year of separation, plus their families.'
    },
    va_mh: {
      key: 'va_mh',
      name: 'VA mental health',
      tagline: 'Same-day help for the readjustment, sleep, anger, PTSD, depression, and anxiety concerns that follow service. Some services are available without enrollment.',
      phoneHref: 'tel:18772228387',
      phoneLabel: 'Call 877-222-8387',
      url: 'https://www.va.gov/find-locations/',
      urlLabel: 'Find VA care near you',
      expect: [
        'Care ranges from peer support to counseling and therapy.',
        'For crisis or emergency care, discharge status and enrollment do not matter.',
        'You can start even if you are not yet enrolled in VA health care.'
      ],
      note: 'For veterans seeking VA care, including those more than a year from separation.'
    },
    samhsa: {
      key: 'samhsa',
      name: 'SAMHSA National Helpline',
      tagline: 'Free, confidential, 24/7 treatment referral and information for substance use and mental health.',
      phoneHref: 'tel:18006624357',
      phoneLabel: 'Call 1-800-662-HELP (4357)',
      url: 'https://www.samhsa.gov/find-help/national-helpline',
      urlLabel: 'Learn more',
      expect: [
        'Confidential, in English and Spanish.',
        'Referrals to local treatment and support groups.',
        'Pairs well with a Vet Center assessment.'
      ],
      note: 'When alcohol or drugs are part of the picture.'
    },
    utr: {
      key: 'utr',
      name: 'United Through Reading',
      tagline: 'A long-running program that helps military children stay connected to a parent through recorded reading.',
      url: 'https://unitedthroughreading.org/',
      urlLabel: 'Learn more',
      expect: [
        'The same idea behind the Voice tool here.',
        'Free for military families.'
      ],
      note: 'Extra support for staying close to young children.'
    }
  };

  // ---- Matching. Context in, one primary resource key out. ----
  // Acute risk is handled by the check-in, which overrides everything with the crisis line.
  VET.matchResourceKey = function(profile){
    profile = profile || {};
    if (profile.combat_theater) return 'vet_center';
    if (profile.service_context === 'active' || profile.service_context === 'guard_reserve') return 'military_onesource';
    if (profile.service_context === 'veteran') {
      if (profile.separation_months != null && profile.separation_months <= 12) return 'military_onesource';
      return 'va_mh';
    }
    if (profile.service_context === 'family') return 'vet_center';
    return 'va_mh';
  };

  VET.matchResource = function(profile){ return VET.RESOURCES[VET.matchResourceKey(profile)]; };

  // Secondary resources worth surfacing under the primary, without duplicating it.
  VET.secondaryKeys = function(profile){
    var primary = VET.matchResourceKey(profile);
    var order = ['vet_center', 'military_onesource', 'va_mh', 'samhsa'];
    return order.filter(function(k){ return k !== primary; }).slice(0, 2);
  };

  // ---- Profile persistence ----
  // localStorage lets the front door work before sign-in; Supabase persists it after.
  var LS_KEY = 'fc_vet_profile';

  VET.readLocal = function(){
    try { var raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  };
  VET.writeLocal = function(profile){
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch (e) {}
  };

  // Returns a promise of the profile, preferring the signed-in server copy.
  VET.getProfile = function(){
    var local = VET.readLocal();
    if (!window.FC || !FC.live) return Promise.resolve(local);
    return FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return local;
      return FC.sb.from('veteran_profiles').select('*').eq('user_id', uid).maybeSingle()
        .then(function(r){ return (r && r.data) ? r.data : local; })
        .catch(function(){ return local; });
    }).catch(function(){ return local; });
  };

  // Saves locally always; upserts to Supabase when signed in. Non-blocking on server error.
  VET.saveProfile = function(profile){
    VET.writeLocal(profile);
    if (!window.FC || !FC.live) return Promise.resolve(profile);
    return FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return profile;
      var row = {
        user_id: uid,
        service_context: profile.service_context || null,
        combat_theater: !!profile.combat_theater,
        separation_months: (profile.separation_months == null ? null : profile.separation_months),
        child_age_bands: profile.child_age_bands || null
      };
      return FC.sb.from('veteran_profiles').upsert(row, { onConflict: 'user_id' })
        .then(function(){ return profile; })
        .catch(function(){ return profile; });
    }).catch(function(){ return profile; });
  };

  // ---- Shared renderer for a resource card (escaped throughout) ----
  VET.resourceCardHTML = function(res, opts){
    opts = opts || {};
    var e = VET.esc;
    var expect = (opts.full && res.expect && res.expect.length)
      ? '<ul class="vet-expect">' + res.expect.map(function(x){ return '<li>' + e(x) + '</li>'; }).join('') + '</ul>'
      : '';
    var actions = '';
    if (res.phoneHref) actions += '<a class="btn btn-primary btn-sm" href="' + e(res.phoneHref) + '">' + e(res.phoneLabel) + '</a>';
    if (res.textHref)  actions += '<a class="btn btn-secondary btn-sm" href="' + e(res.textHref) + '">' + e(res.textLabel) + '</a>';
    if (res.url)       actions += '<a class="btn btn-secondary btn-sm" href="' + e(res.url) + '" target="_blank" rel="noopener">' + e(res.urlLabel || 'Learn more') + '</a>';
    return '<div class="vet-res' + (opts.primary ? ' vet-res-primary' : '') + '">' +
      (opts.primary ? '<div class="vet-res-tag">Matched to you</div>' : '') +
      '<h3>' + e(res.name) + '</h3>' +
      '<p class="vet-res-line">' + e(res.tagline) + '</p>' +
      (res.note ? '<p class="vet-res-note">' + e(res.note) + '</p>' : '') +
      expect +
      '<div class="vet-res-actions">' + actions + '</div>' +
    '</div>';
  };
})();
