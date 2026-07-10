/* A private check-in for returning fathers.
   Instruments are public domain: PC-PTSD-5 (National Center for PTSD),
   PHQ-2, and GAD-2. This is not a diagnosis. It routes to free help and
   keeps the crisis line present throughout. There is no question about
   self-harm methods anywhere in this flow, by design. */
(function(){
  'use strict';
  var host = document.getElementById('vetCheckin');
  if (!host || !window.VET) return;
  var e = VET.esc;

  var FREQ = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'];

  var PC_STEM = 'Sometimes things happen that are especially frightening, horrible, or traumatic. For example a serious accident or fire, a physical or sexual assault, a disaster, combat, or seeing someone killed or seriously injured. Have you experienced this kind of event?';
  var PC_ITEMS = [
    'Had nightmares about it, or thought about it when you did not want to',
    'Tried hard not to think about it, or went out of your way to avoid reminders',
    'Been constantly on guard, watchful, or easily startled',
    'Felt numb or detached from people, activities, or your surroundings',
    'Felt guilty, or unable to stop blaming yourself or others'
  ];
  var PHQ2 = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless'
  ];
  var GAD2 = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying'
  ];

  function yesno(name){
    return '<div class="ci-opts">' +
      '<label class="ci-opt"><input type="radio" name="' + name + '" value="1"><span>Yes</span></label>' +
      '<label class="ci-opt"><input type="radio" name="' + name + '" value="0"><span>No</span></label>' +
    '</div>';
  }
  function freq(name){
    return '<div class="ci-opts ci-opts-4">' + FREQ.map(function(lbl, i){
      return '<label class="ci-opt"><input type="radio" name="' + name + '" value="' + i + '"><span>' + e(lbl) + '</span></label>';
    }).join('') + '</div>';
  }
  function q(name, text, kind){
    return '<div class="ci-q"><p class="ci-q-text">' + e(text) + '</p>' + (kind === 'yesno' ? yesno(name) : freq(name)) + '</div>';
  }

  host.innerHTML =
    '<div class="ci-intro">' +
      '<p>This is private. It takes about two minutes. It is not a diagnosis. It helps point you to the right kind of support.</p>' +
    '</div>' +

    '<form id="ciForm">' +
      '<fieldset class="ci-sec"><legend>Since the past month</legend>' +
        '<div class="ci-q"><p class="ci-q-text">' + e(PC_STEM) + '</p>' + yesno('pc_stem') + '</div>' +
        '<div id="ciPc" hidden><p class="ci-sub">In the past month, have you:</p>' +
          PC_ITEMS.map(function(t, i){ return q('pc_' + i, t, 'yesno'); }).join('') +
        '</div>' +
      '</fieldset>' +

      '<fieldset class="ci-sec"><legend>Over the last two weeks, how often have you been bothered by:</legend>' +
        PHQ2.map(function(t, i){ return q('phq_' + i, t, 'freq'); }).join('') +
        GAD2.map(function(t, i){ return q('gad_' + i, t, 'freq'); }).join('') +
      '</fieldset>' +

      '<div class="ci-consent"><label class="ci-check"><input type="checkbox" id="ciConsent"><span>Save this check-in to my private account so I can see my progress. I can delete it anytime.</span></label></div>' +
      '<button class="btn btn-primary" id="ciSubmit" style="width:100%">See what would help</button>' +
      '<p class="fine" id="ciMsg" style="margin-top:12px;min-height:16px"></p>' +
    '</form>' +

    '<div id="ciResult" hidden></div>';

  // Reveal the PC-PTSD-5 items only if the person reports a qualifying event.
  var pcBlock = document.getElementById('ciPc');
  host.querySelectorAll('input[name="pc_stem"]').forEach(function(r){
    r.addEventListener('change', function(){ pcBlock.hidden = (r.value !== '1'); });
  });

  function val(name){
    var r = host.querySelector('input[name="' + name + '"]:checked');
    return r ? parseInt(r.value, 10) : null;
  }

  function score(){
    var out = { screenings: [], anyElevated: false };

    // PC-PTSD-5: only if stem is yes. Cutoff of 3 is optimally sensitive.
    if (val('pc_stem') === 1) {
      var pc = 0, answered = 0;
      for (var i = 0; i < PC_ITEMS.length; i++){ var v = val('pc_' + i); if (v != null){ pc += v; answered++; } }
      if (answered === PC_ITEMS.length) {
        var pcPos = pc >= 3;
        out.screenings.push({ instrument: 'pc_ptsd_5', score: pc, band: pcPos ? 'positive' : 'negative' });
        if (pcPos) out.anyElevated = true;
      }
    }
    // PHQ-2: cutoff of 3.
    var phq = 0, pa = 0;
    for (var j = 0; j < PHQ2.length; j++){ var pv = val('phq_' + j); if (pv != null){ phq += pv; pa++; } }
    if (pa === PHQ2.length) {
      var phqPos = phq >= 3;
      out.screenings.push({ instrument: 'phq2', score: phq, band: phqPos ? 'positive' : 'negative' });
      if (phqPos) out.anyElevated = true;
    }
    // GAD-2: cutoff of 3.
    var gad = 0, ga = 0;
    for (var k = 0; k < GAD2.length; k++){ var gv = val('gad_' + k); if (gv != null){ gad += gv; ga++; } }
    if (ga === GAD2.length) {
      var gadPos = gad >= 3;
      out.screenings.push({ instrument: 'gad2', score: gad, band: gadPos ? 'positive' : 'negative' });
      if (gadPos) out.anyElevated = true;
    }
    return out;
  }

  function complete(){
    // Require the two-week questions to be answered (PC items only when stem is yes).
    var need = ['phq_0', 'phq_1', 'gad_0', 'gad_1'];
    if (val('pc_stem') == null) return false;
    if (val('pc_stem') === 1) { for (var i = 0; i < PC_ITEMS.length; i++) need.push('pc_' + i); }
    return need.every(function(n){ return val(n) != null; });
  }

  function renderResult(result, profile){
    try{ localStorage.setItem('fc_vet_step_checkin','1'); }catch(_){}
    var primary = VET.matchResource(profile || {});
    var head, lead;
    if (result.anyElevated) {
      head = 'You are carrying a real load right now.';
      lead = 'That is worth talking to someone about. There is free, confidential help built for exactly this, and reaching out is a strength, not a weakness.';
    } else {
      head = 'Your answers look steady right now.';
      lead = 'Keep tending it. The support below is here whenever you want it, for you or your family.';
    }
    var res = document.getElementById('ciResult');
    res.innerHTML =
      '<div class="center" style="max-width:640px;margin:8px auto 28px">' +
        '<h2 class="d-36" style="margin-bottom:12px">' + e(head) + '</h2>' +
        '<p class="lead">' + e(lead) + '</p>' +
      '</div>' +
      VET.resourceCardHTML(primary, { primary: true, full: true }) +
      '<p class="fine" style="margin-top:16px;text-align:center">Around the clock, if you ever want it: <a href="tel:988">988, press 1</a> &middot; text 838255.</p>' +
      '<p class="fine" style="margin-top:20px;text-align:center">Private, and not a diagnosis.</p>';
    document.getElementById('ciForm').hidden = true;
    res.hidden = false;
    res.querySelector('h2').setAttribute('tabindex', '-1');
    res.querySelector('h2').focus();
  }

  function persist(result, primaryKey){
    var consent = document.getElementById('ciConsent');
    if (!consent || !consent.checked) return;
    if (!window.FC || !FC.live) return;
    FC.ready.then(function(){
      var uid = FC.uid && FC.uid();
      if (!uid) return;
      var rows = result.screenings.map(function(s){
        return { user_id: uid, instrument: s.instrument, score: s.score, band: s.band,
                 routed_to: primaryKey, acute_flag: false };
      });
      if (rows.length) FC.sb.from('screenings').insert(rows).then(function(){}, function(){});
    });
  }

  document.getElementById('ciSubmit').addEventListener('click', function(ev){
    ev.preventDefault();
    var msg = document.getElementById('ciMsg');
    if (!complete()) {
      msg.style.color = 'var(--error)';
      msg.textContent = 'Please answer each question above.';
      return;
    }
    msg.textContent = '';
    var result = score();
    VET.getProfile().then(function(profile){
      var primaryKey = VET.matchResourceKey(profile || {});
      persist(result, primaryKey);
      renderResult(result, profile);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
})();
