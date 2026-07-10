/* Fathers.com | The Efficacy Report.
   ?demo=1 renders a sample cohort so any funder can see exactly what they get.
   Live mode lists the orgs the signed-in admin holds and renders real cohort
   movement via the security-definer RPCs (get_efficacy_report / list_my_report_orgs). */
(function(){
  var root = document.getElementById('reportRoot');
  if(!root) return;
  var qs = new URLSearchParams(location.search);
  var demo = qs.get('demo');

  function fmt(n){ return (n===null||n===undefined||isNaN(n)) ? '\u2014' : Math.round(n*10)/10; }

  function renderRows(orgName, rows, isDemo){
    var h = '';
    if(isDemo) h += '<div class="card" style="padding:14px 18px;margin-bottom:18px"><span class="fine">SAMPLE DATA. This is the exact report your funder receives, rendered from a demonstration cohort.</span></div>';
    h += '<div class="eyebrow" style="margin-bottom:6px">KEYSTONE EFFICACY REPORT</div>';
    h += '<h2 class="d-28" style="margin-bottom:4px">' + orgName + '</h2>';
    h += '<p class="fine" style="margin-bottom:22px">Generated ' + new Date().toLocaleDateString() + ' \u00B7 Keystone Father Profile, normed on 9,232 fathers \u00B7 movement = mean latest overall minus mean baseline overall, per cohort</p>';
    h += '<div class="card" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">';
    h += '<tr style="text-align:left"><th style="padding:12px 16px">Cohort</th><th style="padding:12px 16px">Fathers</th><th style="padding:12px 16px">Completed</th><th style="padding:12px 16px">Baseline</th><th style="padding:12px 16px">Latest</th><th style="padding:12px 16px">Movement</th><th style="padding:12px 16px">Outcome overlay</th></tr>';
    rows.forEach(function(r){
      var mv = fmt(r.movement);
      var mvCell = (r.movement>0? '+'+mv : ''+mv);
      h += '<tr style="border-top:1px solid var(--line,#333)">'
        + '<td style="padding:12px 16px"><b>' + (r.cohort||'Unassigned') + '</b></td>'
        + '<td style="padding:12px 16px">' + (r.fathers||0) + '</td>'
        + '<td style="padding:12px 16px">' + (r.completed||0) + ' (' + fmt(100*(r.completed||0)/Math.max(1,r.fathers||0)) + '%)</td>'
        + '<td style="padding:12px 16px">' + fmt(r.baseline) + '</td>'
        + '<td style="padding:12px 16px">' + fmt(r.latest) + '</td>'
        + '<td style="padding:12px 16px"><b>' + mvCell + '</b></td>'
        + '<td style="padding:12px 16px" class="fine">' + (r.outcomes || 'Activates when your agency links outcome data') + '</td>'
        + '</tr>';
    });
    h += '</table></div>';
    if(!isDemo){
      h += '<div class="row wrap" style="gap:12px;margin-top:18px">'
        + '<button class="btn btn-secondary btn-sm" data-print>Print this brief</button>'
        + '<button class="btn btn-secondary btn-sm" id="rptEmail">Email me this brief</button>'
        + '<span class="fine" id="rptMsg"></span></div>';
    }
    h += '<p class="fine" style="margin-top:16px">Individual fathers are never shown. Cohort aggregates only. Outcome overlays (recidivism, collection, readiness) appear when the responsible agency links its outcome records to this cohort through the secure intake.</p>';
    root.innerHTML = h;
    var em = document.getElementById('rptEmail');
    if(em) em.addEventListener('click', function(){
      var msg=document.getElementById('rptMsg');
      em.disabled=true; if(msg) msg.textContent='Sending\u2026';
      FC.sb.auth.getUser().then(function(u){
        var to = u && u.data && u.data.user && u.data.user.email;
        if(!to){ if(msg) msg.textContent='Sign in first.'; em.disabled=false; return; }
        var lines = rows.map(function(x){ return (x.cohort||'Unassigned')+': '+(x.fathers||0)+' fathers, '+(x.completed||0)+' completed, movement '+(x.movement==null?'n/a':x.movement); }).join('\n');
        FC.sb.functions.invoke('send-email',{body:{to:to,template:'monthly-brief',data:{ORG:orgName,MONTH:new Date().toLocaleDateString(undefined,{month:'long',year:'numeric'}),SUMMARY:lines,LINK:location.origin+'/efficacy-report.html'}}})
          .then(function(){ if(msg) msg.textContent='Sent to '+to+'.'; em.disabled=false; },
                function(){ if(msg) msg.textContent='Email service is not deployed yet; use Print for now.'; em.disabled=false; });
      });
    });
  }

  if(demo){
    renderRows('Sample Fatherhood Program', [
      { cohort:'Spring cohort A', fathers:24, completed:19, baseline:58.4, latest:71.2, movement:12.8, outcomes:'Recidivism overlay: 2 of 19 completers reoffended vs 4 of 5 non-completers (sample)' },
      { cohort:'Spring cohort B', fathers:18, completed:13, baseline:61.0, latest:69.5, movement:8.5, outcomes:null },
      { cohort:'Facility intake, no program', fathers:31, completed:0, baseline:55.9, latest:null, movement:null, outcomes:'Baseline only. The floor is never nothing.' }
    ], true);
    return;
  }

  root.innerHTML = '<p class="ash">Loading your organizations\u2026</p>';
  function fail(msg){ root.innerHTML = '<div class="card" style="padding:24px"><p>'+msg+'</p><p class="fine" style="margin-top:10px"><a class="link" href="efficacy-report.html?demo=1">See the sample report</a> \u00B7 <a class="link" href="organizations.html">Get set up</a></p></div>'; }

  if(!(window.FC && FC.ready)) return fail('Sign in to view your report.');
  FC.ready.then(function(){
    if(!FC.live || !FC.uid()) return fail('Sign in to view your Efficacy Report.');
    return FC.sb.rpc('list_my_report_orgs').then(function(r){
      if(r.error || !r.data || !r.data.length) return fail('No organizations found on your account. If your program is on the Keystone Standard, ask your NCF contact to add you as an org admin.');
      var org = r.data[0];
      var sel = document.getElementById('reportOrg');
      if(sel && r.data.length>1){
        sel.hidden=false; sel.innerHTML = r.data.map(function(o){return '<option value="'+o.id+'">'+o.name+'</option>'}).join('');
        sel.addEventListener('change', function(){ load(sel.value, sel.options[sel.selectedIndex].text); });
      }
      load(org.id, org.name);
      function load(id, name){
        root.innerHTML='<p class="ash">Building the report\u2026</p>';
        FC.sb.rpc('get_efficacy_report', { p_org: id }).then(function(rr){
          if(rr.error) return fail('Could not build the report: '+rr.error.message);
          var rows = (rr.data||[]).map(function(x){ return { cohort:x.cohort, fathers:x.fathers, completed:x.completed, baseline:x.baseline, latest:x.latest, movement:x.movement, outcomes:x.outcomes }; });
          if(!rows.length) rows=[{cohort:'No cohorts yet', fathers:0, completed:0, baseline:null, latest:null, movement:null, outcomes:'Share your join link to begin: every man who enters it is tagged to your cohort.'}];
          renderRows(name, rows, false);
        });
      }
    });
  });
})();
