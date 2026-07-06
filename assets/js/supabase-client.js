/* ============================================================
   Fathers.com live wiring. Dual mode:
   - No keys in config.js  -> demo mode (localStorage only)
   - Keys present          -> live: auth, persistence, verification
   ============================================================ */
window.FC = window.FC || {};
(function(){
  var cfg = window.FC_CONFIG || {};
  FC.cfg = cfg;
  FC.live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  FC.session = null;
  if (!FC.live) { FC.ready = Promise.resolve(null); return; }

  FC.ready = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    .then(function(m){
      FC.sb = m.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      FC.sb.auth.onAuthStateChange(function(_e, session){ FC.session = session; });
      return FC.sb.auth.getSession().then(function(r){ FC.session = r.data.session; return FC.sb; });
    })
    .catch(function(err){ console.error('Supabase load failed', err); FC.live = false; return null; });

  // ---------- auth ----------
  FC.signIn = function(email, next){
    return FC.ready.then(function(){
      return FC.sb.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + (next || 'plan.html') }
      });
    });
  };
  FC.signOut = function(){ return FC.ready.then(function(){ return FC.sb.auth.signOut(); }); };
  FC.signInPassword = function(email, password){
    return FC.ready.then(function(){
      return FC.sb.auth.signInWithPassword({ email: email, password: password });
    });
  };
  FC.uid = function(){ return FC.session && FC.session.user ? FC.session.user.id : null; };

  // ---------- 12-week plan template (personalization TODO: reorder by gap) ----------
  FC.PLAN = [];
  var PHASES = [
    ['Show up on schedule', 'Consistency', [
      ['Set one standing time per kid and keep it.', 'Tell your kids when they will see you next. Every time.'],
      ['Eat breakfast with your kids twice this week.', 'Put the next three kid dates on the calendar where they can see them.'],
      ['Keep the standing time. No reschedule.', 'Call or message at the time you said you would.'],
      ['Ask each kid what they want your standing time to be.', 'Hold the schedule through one hard day.']]],
    ['Enter their world', 'Awareness', [
      ['Learn the names of their three closest friends.', 'Ask one question about their world daily. No fixing.'],
      ['Sit through one thing they love without your phone.', 'Ask what was hard this week. Just listen.'],
      ['Learn one thing they are worried about.', 'Notice one mood change and name it gently.'],
      ['Ask their teacher or coach one question.', 'Repeat back what you heard them say this week.']]],
    ['Set the standard', 'Nurturance', [
      ['Say one thing you stand for, out loud, at the table.', 'When you blow it, repair it inside 24 hours.'],
      ['Tell each kid one thing you respect about them.', 'Write down the standard you hold. Read it daily.'],
      ['Tell your kid one true story from before they were born.', 'Ask a man you trust to check you weekly.'],
      ['Repair one old thing you never repaired.', 'Set the next ninety days with your kids in the room.']]]
  ];
  PHASES.forEach(function(ph, pi){
    ph[2].forEach(function(acts, wi){
      var week = pi*4 + wi + 1;
      FC.PLAN.push({ week: week, kind: 'lesson', title: 'Lesson ' + week + ' in ' + ph[0].toLowerCase(), domain: ph[1], sort: 0 });
      FC.PLAN.push({ week: week, kind: 'action', title: acts[0], domain: ph[1], sort: 1 });
      FC.PLAN.push({ week: week, kind: 'action', title: acts[1], domain: ph[1], sort: 2 });
    });
  });

  // ---------- push a locally completed Keystone result to the account ----------
  FC.syncKeystone = function(){
    var raw = localStorage.getItem('fc_keystone_v1');
    if (!raw || localStorage.getItem('fc_synced') === '1') return Promise.resolve(false);
    var st; try { st = JSON.parse(raw); } catch(e){ return Promise.resolve(false); }
    if (!st.scores) return Promise.resolve(false);
    var uid = FC.uid(); if (!uid) return Promise.resolve(false);
    var sb = FC.sb, s = st.scores;
    return sb.from('assessments').insert({ user_id: uid, completed_at: new Date().toISOString() }).select().single()
      .then(function(r){
        if (r.error) throw r.error;
        var aid = r.data.id;
        var answers = Object.keys(st.answers || {}).map(function(k){
          return { assessment_id: aid, item_key: k, value: JSON.stringify(st.answers[k]) };
        });
        var p1 = answers.length ? sb.from('assessment_answers').insert(answers) : Promise.resolve({});
        var p2 = sb.from('baselines').insert({
          user_id: uid, assessment_id: aid,
          involvement: s.inv, consistency: s.con, awareness: s.awa, nurturance: s.nur,
          overall: s.overall, gap_domain: st.gap || 'Consistency'
        }).select().single();
        return Promise.all([p1, p2]);
      })
      .then(function(res){
        var baseline = res[1].data;
        return sb.from('plans').insert({ user_id: uid, baseline_id: baseline.id }).select().single();
      })
      .then(function(r){
        if (r.error) throw r.error;
        var rows = FC.PLAN.map(function(a){ return Object.assign({ plan_id: r.data.id }, a); });
        return sb.from('plan_actions').insert(rows);
      })
      .then(function(){
        localStorage.setItem('fc_synced', '1');
        return true;
      });
  };

  // ---------- plan reads ----------
  FC.getBaseline = function(){
    return FC.sb.from('baselines').select('*').eq('user_id', FC.uid())
      .order('taken_at', { ascending: false }).limit(1).maybeSingle();
  };
  FC.getPlan = function(){
    return FC.sb.from('plans').select('*').eq('user_id', FC.uid())
      .eq('status', 'active').order('starts_on', { ascending: false }).limit(1).maybeSingle();
  };
  FC.weekOf = function(plan){
    var days = Math.floor((Date.now() - new Date(plan.starts_on).getTime()) / 86400000);
    return Math.min(plan.weeks || 12, Math.max(1, Math.floor(days / 7) + 1));
  };
  FC.getWeekActions = function(planId, week){
    return FC.sb.from('plan_actions').select('*').eq('plan_id', planId).eq('week', week).order('sort');
  };
  FC.getCompletions = function(planId){
    return FC.sb.from('action_completions').select('plan_action_id, completed_at, plan_actions!inner(plan_id, week)')
      .eq('user_id', FC.uid()).eq('plan_actions.plan_id', planId);
  };
  FC.toggleAction = function(planActionId, done){
    if (done) return FC.sb.from('action_completions').insert({ user_id: FC.uid(), plan_action_id: planActionId });
    return FC.sb.from('action_completions').delete().eq('user_id', FC.uid()).eq('plan_action_id', planActionId);
  };

  // ---------- lessons ----------
  FC.getClass = function(slug){
    return FC.sb.from('classes').select('*, lessons(*)').eq('slug', slug).maybeSingle();
  };
  FC.saveProgress = function(lessonId, seconds, completed){
    return FC.sb.from('lesson_progress').upsert({
      user_id: FC.uid(), lesson_id: lessonId, seconds: Math.floor(seconds || 0),
      completed: !!completed, updated_at: new Date().toISOString()
    });
  };
})();
