// CL;UB is the same page in a second mode. The body carries a class so the
// house style can show the cannabis chrome, and this script sets it before the
// rest of the page is parsed.
//
// It is a file, not an inline script, because the policy says script-src 'self':
// an inline script would be refused by the browser and the mode would silently
// never arrive.
(function () {
  'use strict';
  const club = location.hostname === 'club.nonarkara.org'
    || new URLSearchParams(location.search).get('mode') === 'club';
  if (!club) return;
  const mark = () => document.body && document.body.classList.add('club-mode');
  if (document.body) mark();
  else document.addEventListener('DOMContentLoaded', mark);
})();
