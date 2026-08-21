/* Subtle, calm micro-motion for Fathers.com.
   Requires anime.js classic API (window.anime). Fail soft if missing.
   Honors prefers-reduced-motion. No infinite loops on primary content. */
(function () {
  'use strict';

  function reduced() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function clearInlineMotion(el) {
    if (!el || !el.style) return;
    el.style.opacity = '';
    el.style.transform = '';
    el.style.boxShadow = '';
    el.style.filter = '';
  }

  function fadeUp(targets, opts) {
    var anime = window.anime;
    if (!anime || !targets || !targets.length) return;
    opts = opts || {};
    anime({
      targets: targets,
      opacity: [0, 1],
      translateY: [opts.distance == null ? 14 : opts.distance, 0],
      duration: opts.duration == null ? 720 : opts.duration,
      delay: opts.stagger ? anime.stagger(opts.stagger, { start: opts.delay || 0 }) : (opts.delay || 0),
      easing: 'easeOutCubic',
      complete: function () {
        for (var i = 0; i < targets.length; i++) clearInlineMotion(targets[i]);
      }
    });
  }

  function softFade(el) {
    var anime = window.anime;
    if (!anime || !el) return;
    anime({
      targets: el,
      opacity: [0, 1],
      duration: 800,
      easing: 'easeOutQuad',
      complete: function () { clearInlineMotion(el); }
    });
  }

  function settle(el) {
    var anime = window.anime;
    if (!anime || !el) return;
    anime({
      targets: el,
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 780,
      delay: 120,
      easing: 'easeOutCubic',
      complete: function () { clearInlineMotion(el); }
    });
  }

  function pulseSuccess(el) {
    var anime = window.anime;
    if (!anime || !el || reduced()) return;
    anime({
      targets: el,
      scale: [
        { value: 1, duration: 0 },
        { value: 1.02, duration: 220, easing: 'easeOutQuad' },
        { value: 1, duration: 320, easing: 'easeOutCubic' }
      ],
      boxShadow: [
        { value: '0 0 0 0 rgba(201,162,39,0)', duration: 0 },
        { value: '0 0 0 6px rgba(201,162,39,.22)', duration: 220, easing: 'easeOutQuad' },
        { value: '0 0 0 0 rgba(201,162,39,0)', duration: 420, easing: 'easeOutCubic' }
      ]
    });
  }

  function prepareHidden(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.opacity = '0';
    }
  }

  function observeOnce(nodes, onEnter) {
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      onEnter(nodes);
      return;
    }
    var left = nodes.slice();
    var io = new IntersectionObserver(function (entries) {
      var hit = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        hit.push(entry.target);
        io.unobserve(entry.target);
        var ix = left.indexOf(entry.target);
        if (ix >= 0) left.splice(ix, 1);
      });
      if (hit.length) onEnter(hit);
      if (!left.length) io.disconnect();
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    left.forEach(function (el) { io.observe(el); });
  }

  function bootFadeUps() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-motion="fade-up"]'));
    if (!nodes.length) return;
    if (reduced() || !window.anime) {
      nodes.forEach(clearInlineMotion);
      return;
    }
    prepareHidden(nodes);
    // Hero / above-fold: animate soon. Below-fold: when in view.
    var early = [];
    var late = [];
    nodes.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < (window.innerHeight || 800) * 0.92) early.push(el);
      else late.push(el);
    });
    if (early.length) fadeUp(early, { stagger: 70, delay: 40, distance: 12 });
    observeOnce(late, function (batch) {
      fadeUp(batch, { stagger: 80, distance: 14 });
    });
  }

  function bootMedia() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('.vs-media, [data-motion="media-fade"]')
    );
    if (!nodes.length) return;
    if (reduced() || !window.anime) return;
    prepareHidden(nodes);
    observeOnce(nodes, function (batch) {
      batch.forEach(function (el, i) {
        setTimeout(function () { softFade(el); }, i * 60);
      });
    });
  }

  function bootHeroCta() {
    var nodes = Array.prototype.slice.call(
      document.querySelectorAll('[data-motion="hero-cta"], .hero-cta')
    );
    if (!nodes.length) return;
    if (reduced() || !window.anime) {
      nodes.forEach(clearInlineMotion);
      return;
    }
    nodes.forEach(function (el) {
      el.style.opacity = '0';
      settle(el);
    });
  }

  function bootCheckpointPulse() {
    document.addEventListener('fc:checkpoint-passed', function (ev) {
      var el = ev && ev.target;
      if (!el || reduced()) return;
      var target = el.querySelector('.scp-score.ok') || el;
      pulseSuccess(target);
    });
  }

  ready(function () {
    try {
      bootFadeUps();
      bootMedia();
      bootHeroCta();
      bootCheckpointPulse();
    } catch (err) {
      // Defensive: motion must never break the page.
    }
  });

  window.FCMotion = {
    pulseSuccess: pulseSuccess,
    reduced: reduced
  };
})();
