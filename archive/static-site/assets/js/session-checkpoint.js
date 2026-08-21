/* Public session-guide checkpoints (marketing pages).
   Mounts on [data-session-checkpoint][data-course][data-session].
   Does NOT mint certificates. Preview / practice only. */
(function () {
  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function packFor(course, session) {
    var root = window.FC_SESSION_CHECKPOINTS || {};
    var c = root[course];
    if (!c || !c.sessions) return null;
    return c.sessions[String(session)] || null;
  }

  function storageKey(course, session) {
    return 'fc.guideCheckpoint.' + course + '.' + session;
  }

  function renderMount(el) {
    var course = el.getAttribute('data-course');
    var session = el.getAttribute('data-session');
    var pack = packFor(course, session);
    var href = 'course.html?preview=1&cert=' + encodeURIComponent(course || '');
    el.innerHTML = '<p class="fine ash">Take the checkpoint in the player after the film. Answers are not on this page.</p>'+
      '<p style="margin:8px 0 0"><a class="btn btn-secondary btn-sm" href="'+href+'">Open the player</a></p>';
    return;
    if (!pack || !pack.questions || !pack.questions.length) {
      el.innerHTML = '<p class="fine ash">Checkpoint questions coming soon.</p>';
      return;
    }
    var passed = false;
    try {
      passed = localStorage.getItem(storageKey(course, session)) === '1';
    } catch (e) {}

    var state = {
      answers: {},
      submitted: false,
      score: 0,
      passed: passed,
    };

    function paint() {
      var qs = pack.questions;
      var html = '';
      html += '<div class="scp-head">';
      html += '<div class="eyebrow brass">CHECKPOINT</div>';
      html += '<p class="fine ash scp-sub">Practice only. Passing here does not earn a certificate. Earn proof through a Certified Organization.</p>';
      if (state.passed && !state.submitted) {
        html += '<p class="scp-banner ok">You have passed this checkpoint on this device. Retake anytime.</p>';
      }
      html += '</div>';
      html += '<form class="scp-form" novalidate>';
      qs.forEach(function (q, qi) {
        html += '<fieldset class="scp-q" data-qi="' + qi + '">';
        html += '<legend class="scp-prompt">' + (qi + 1) + '. ' + esc(q.prompt) + '</legend>';
        (q.choices || []).forEach(function (choice, ci) {
          var id = 'scp-' + course + '-' + session + '-' + qi + '-' + ci;
          var checked = state.answers[qi] === ci ? ' checked' : '';
          var mark = '';
          if (state.submitted) {
            if (ci === q.correct_index) mark = ' is-correct';
            else if (state.answers[qi] === ci) mark = ' is-wrong';
          }
          html += '<label class="scp-choice' + mark + '" for="' + id + '">';
          html += '<input type="radio" name="q' + qi + '" id="' + id + '" value="' + ci + '"' + checked + (state.submitted ? ' disabled' : '') + '>';
          html += '<span>' + esc(choice) + '</span></label>';
        });
        if (state.submitted) {
          var ok = state.answers[qi] === q.correct_index;
          var fb = q.feedback || (ok ? 'Correct.' : 'Not quite. The highlighted answer is the one this session teaches.');
          html += '<p class="scp-feedback ' + (ok ? 'ok' : 'bad') + '">' + esc(fb) + '</p>';
        }
        html += '</fieldset>';
      });
      html += '<div class="scp-actions">';
      if (!state.submitted) {
        html += '<button type="submit" class="btn btn-yellow btn-sm">Submit checkpoint</button>';
      } else {
        var all = state.score === qs.length;
        html += '<p class="scp-score ' + (all ? 'ok' : 'bad') + '">' + state.score + ' of ' + qs.length + ' correct.</p>';
        html += '<button type="button" class="btn btn-secondary btn-sm" data-retry>Try again</button>';
      }
      html += '</div></form>';
      el.innerHTML = html;

      var form = el.querySelector('form');
      form.addEventListener('change', function (ev) {
        var t = ev.target;
        if (!t || t.name == null || t.name.indexOf('q') !== 0) return;
        var qi = parseInt(t.name.slice(1), 10);
        state.answers[qi] = parseInt(t.value, 10);
      });
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var qs2 = pack.questions;
        var missing = [];
        for (var i = 0; i < qs2.length; i++) {
          if (typeof state.answers[i] !== 'number') missing.push(i + 1);
        }
        if (missing.length) {
          alert('Answer every question before submitting (missing: ' + missing.join(', ') + ').');
          return;
        }
        var score = 0;
        qs2.forEach(function (q, qi) {
          if (state.answers[qi] === q.correct_index) score += 1;
        });
        state.score = score;
        state.submitted = true;
        state.passed = score === qs2.length;
        if (state.passed) {
          try { localStorage.setItem(storageKey(course, session), '1'); } catch (e) {}
        }
        paint();
        if (state.passed) {
          try {
            el.dispatchEvent(new CustomEvent('fc:checkpoint-passed', { bubbles: true }));
          } catch (e) {}
        }
      });
      var retry = el.querySelector('[data-retry]');
      if (retry) {
        retry.addEventListener('click', function () {
          state.answers = {};
          state.submitted = false;
          state.score = 0;
          paint();
        });
      }
    }

    paint();
  }

  function boot() {
    document.querySelectorAll('[data-session-checkpoint]').forEach(renderMount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
