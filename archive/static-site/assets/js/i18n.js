/* Minimal localization seam (AUDIT-V41 WP-M3). English is the only committed
   locale. App surfaces adopt data-i18n keys as they are touched; a per-org
   locale setting will flip lang and dir attributes when a partner-led
   localization lands. Marketing pages stay English until then; the courses
   are never machine-translated, the session craft is the product. */
window.FC_I18N = {
  locale: 'en',
  dir: 'ltr',
  strings: {},
  t: function (key, fallback) { return this.strings[key] || fallback || key; }
};
