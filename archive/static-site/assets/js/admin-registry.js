/* Admin: certification registry and partner course assignment.

   Certification is the institutional layer: organizations and facilitators earn
   it. Completion is the man's: he earns a Certificate of Completion. This file
   reads all three registries, and drives the partner course assignment that
   decides which partner offers which course.

   Reads go through the public_* views on purpose. The base tables are locked
   down: facilitator_credentials allows own-row reads only, organization_
   certifications is scoped to that org's admins, and the certificates base
   table is service-role only. The views are granted to authenticated users and
   carry exactly the registry fields, so they are the correct source here.

   Revoking is a server-side action by design and is not offered in this UI.
   public_certificates excludes revoked rows, so this lists live certificates. */
(function(){
  if (!document.getElementById('reg-orgs') && !document.getElementById('oc-table')) return;
  function el(id){ return document.getElementById(id); }
  function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function note(m){ if (window.toast) toast(m); }

  // Evaluated lazily, never captured at parse time. This file loads before
  // supabase-client.js defines window.FC, so reading FC here would always report
  // demo mode and strand every panel on "Loading" even on a live site.
  function isDemo(){ return !(window.FC && FC.live); }
  var TARGETS = ['reg-orgs','reg-facilitators','reg-certs','oc-table'];

  function setAll(html){ TARGETS.forEach(function(id){ var e = el(id); if (e) e.innerHTML = html; }); }

  function fail(targetId, err){
    console.error('[registry]', err);
    var msg = (err && (err.message || err.hint || err.details)) || 'unknown error';
    var e = el(targetId);
    if (e) e.innerHTML = '<div class="notice brass" style="margin:0">Failed: ' + esc(msg) + '</div>';
    note('Failed: ' + msg);
  }

  function empty(targetId, msg){
    var e = el(targetId);
    if (e) e.innerHTML = '<p class="fine">' + esc(msg) + '</p>';
  }

  function statusChip(s){
    var live = (s === 'active');
    return '<span class="chip"' + (live ? '' : ' style="opacity:.7"') + '>' + esc(s || 'unknown') + '</span>';
  }

  function dateOnly(v){ return v ? String(v).slice(0,10) : ''; }

  function table(rows, cols){
    var head = '<tr>' + cols.map(function(c){ return '<th style="text-align:left;padding:6px 10px 6px 0">' + esc(c.label) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function(r){
      return '<tr>' + cols.map(function(c){
        return '<td style="padding:6px 10px 6px 0;border-top:1px solid var(--hairline)">' + (c.html ? c.html(r) : esc(r[c.key])) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<table style="width:100%;border-collapse:collapse;font-size:14px">' + head + body + '</table>';
  }

  /* ---------- registry: certified organizations (NCF-O) ---------- */
  function loadOrgCerts(){
    FC.sb.from('public_certified_organizations').select('serial,org_display,status,tier,issued_at,renews_at').order('issued_at', {ascending:false}).then(function(r){
      if (r.error) { fail('reg-orgs', r.error); return; }
      var rows = r.data || [];
      if (!rows.length) { empty('reg-orgs', 'No certified organizations yet.'); return; }
      el('reg-orgs').innerHTML = table(rows, [
        {label:'Serial', key:'serial'},
        {label:'Organization', key:'org_display'},
        {label:'Tier', key:'tier'},
        {label:'Status', html:function(x){ return statusChip(x.status); }},
        {label:'Issued', html:function(x){ return esc(dateOnly(x.issued_at)); }},
        {label:'Renews', html:function(x){ return esc(dateOnly(x.renews_at)); }}
      ]);
    });
  }

  /* ---------- registry: certified facilitators (NCF-F) ---------- */
  function loadFacilitators(){
    FC.sb.from('public_facilitators').select('serial,display_name,status,issued_at,renews_at').order('issued_at', {ascending:false}).then(function(r){
      if (r.error) { fail('reg-facilitators', r.error); return; }
      var rows = r.data || [];
      if (!rows.length) { empty('reg-facilitators', 'No certified facilitators yet.'); return; }
      el('reg-facilitators').innerHTML = table(rows, [
        {label:'Serial', key:'serial'},
        {label:'Facilitator', key:'display_name'},
        {label:'Status', html:function(x){ return statusChip(x.status); }},
        {label:'Issued', html:function(x){ return esc(dateOnly(x.issued_at)); }},
        {label:'Renews', html:function(x){ return esc(dateOnly(x.renews_at)); }}
      ]);
    });
  }

  /* ---------- registry: issued certificates of completion (FC) ---------- */
  var allCerts = [];
  function renderCerts(){
    var q = (el('reg-cert-search') && el('reg-cert-search').value || '').trim().toLowerCase();
    var rows = !q ? allCerts : allCerts.filter(function(c){
      return (c.serial || '').toLowerCase().indexOf(q) > -1
          || (c.recipient_display || '').toLowerCase().indexOf(q) > -1;
    });
    if (!rows.length) { empty('reg-certs', q ? 'No match for that search.' : 'No certificates issued yet. They appear here when a father finishes a course and a facilitator approves it.'); return; }
    el('reg-certs').innerHTML = table(rows.slice(0, 200), [
      {label:'Serial', key:'serial'},
      {label:'Recipient', key:'recipient_display'},
      {label:'Course', key:'course_title'},
      {label:'Hours', key:'hours'},
      {label:'Issued', html:function(x){ return esc(dateOnly(x.issued_at)); }}
    ]) + (rows.length > 200 ? '<p class="fine" style="margin-top:10px">Showing the first 200 of ' + rows.length + '. Narrow with search.</p>' : '');
  }

  function loadCerts(){
    FC.sb.from('public_certificates').select('serial,recipient_display,course_title,hours,issued_at').order('issued_at', {ascending:false}).limit(500).then(function(r){
      if (r.error) { fail('reg-certs', r.error); return; }
      allCerts = r.data || [];
      renderCerts();
    });
  }

  /* ---------- partner course assignment (org_courses) ---------- */
  var partners = [], catalog = [];

  function loadAssignments(){
    FC.sb.from('org_courses').select('org_id,course_ref,active,sort').order('sort').then(function(r){
      if (r.error) {
        // The partner config migration may not be applied yet. Say so plainly.
        el('oc-table').innerHTML = '<div class="notice brass" style="margin:0">Partner course assignment is not set up yet. Apply <code>supabase/migrations/20260722180000_partner_config_foundation.sql</code>, then reload.<br><span class="fine">' + esc(r.error.message || '') + '</span></div>';
        return;
      }
      var rows = r.data || [];
      if (!rows.length) { empty('oc-table', 'No courses assigned to a partner yet.'); return; }
      var orgName = {}; partners.forEach(function(o){ orgName[o.id] = o.name; });
      var courseName = {}; catalog.forEach(function(c){ courseName[c.slug] = c.title; });
      el('oc-table').innerHTML = table(rows, [
        {label:'Partner', html:function(x){ return esc(orgName[x.org_id] || x.org_id); }},
        {label:'Course', html:function(x){ return esc(courseName[x.course_ref] || x.course_ref); }},
        {label:'Active', html:function(x){ return statusChip(x.active ? 'active' : 'paused'); }},
        {label:'', html:function(x){ return '<button class="btn btn-secondary btn-sm" data-unassign="' + esc(x.org_id) + '|' + esc(x.course_ref) + '">Remove</button>'; }}
      ]);
      el('oc-table').querySelectorAll('[data-unassign]').forEach(function(b){
        b.addEventListener('click', function(){
          var p = b.dataset.unassign.split('|');
          FC.sb.from('org_courses').delete().eq('org_id', p[0]).eq('course_ref', p[1]).then(function(res){
            if (res.error) { fail('oc-table', res.error); return; }
            note('Removed'); loadAssignments();
          });
        });
      });
    });
  }

  function loadPickers(){
    FC.sb.from('orgs').select('id,name').order('name').then(function(r){
      if (r.error) { fail('oc-table', r.error); return; }
      partners = r.data || [];
      var sel = el('oc-org');
      if (sel) sel.innerHTML = partners.map(function(o){ return '<option value="' + esc(o.id) + '">' + esc(o.name) + '</option>'; }).join('');
      return FC.sb.from('certificate_courses').select('slug,title').order('title');
    }).then(function(r){
      if (!r) return;
      if (r.error) { fail('oc-table', r.error); return; }
      catalog = r.data || [];
      var sel = el('oc-course');
      if (sel) sel.innerHTML = catalog.map(function(c){ return '<option value="' + esc(c.slug) + '">' + esc(c.title) + '</option>'; }).join('');
      loadAssignments();
    });
  }

  function bindAssign(){
    var btn = el('oc-add');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var org = el('oc-org') && el('oc-org').value;
      var course = el('oc-course') && el('oc-course').value;
      if (!org || !course) { note('Pick a partner and a course'); return; }
      FC.sb.from('org_courses').insert({ org_id: org, course_ref: course }).then(function(r){
        if (r.error) { fail('oc-table', r.error); return; }
        note('Assigned'); loadAssignments();
      });
    });
  }

  function boot(){
    if (isDemo()) {
      setAll('<div class="notice brass" style="margin:0">Demo mode. Add Supabase keys in <code>assets/js/config.js</code> to load the live registry.</div>');
      return;
    }
    FC.ready.then(function(){
      if (el('reg-orgs')) loadOrgCerts();
      if (el('reg-facilitators')) loadFacilitators();
      if (el('reg-certs')) loadCerts();
      if (el('oc-table')) { bindAssign(); loadPickers(); }
      var s = el('reg-cert-search');
      if (s) s.addEventListener('input', renderCerts);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
