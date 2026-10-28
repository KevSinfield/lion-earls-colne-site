/* Scroll effects, kept gentle: things fade up as they arrive, the hero photo drifts slowly, a thin gold line shows how far
   down the page you are. Nothing is hidden unless this script runs, and nothing runs if the visitor prefers reduced motion. */
(function () {
  if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var root = document.documentElement;

  /* Reading progress: a hairline under the header bar */
  var head = document.getElementById("chrome-head");
  var line = null;
  if (head) {
    line = document.createElement("div");
    line.className = "bar__progress";
    line.setAttribute("aria-hidden", "true");
    head.appendChild(line);
  }

  /* Hero photo parallax: the photo moves a little slower than the page */
  var heroBg = document.querySelector(".hero__bg");
  var heroH = heroBg ? heroBg.parentElement.offsetHeight : 0;
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY || 0;
    if (line) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      line.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    }
    if (heroBg && y < heroH * 1.2) heroBg.style.setProperty("--py", Math.min(55, y * 0.14).toFixed(1) + "px");
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  frame();

  /* Reveal as things come into view */
  if (!("IntersectionObserver" in window)) return;
  root.classList.add("fx");
  var SEL = [
    ".soon h2", ".soon__sub", ".soon__card", ".soon__all",
    ".band__txt > :not(.week__list)", ".week__list li",
    ".history__lead", ".trio li", ".history__src",
    ".ticket", ".find__card", ".find__hours",
    ".mcard", ".ev", ".wk", ".feature", ".mhead", ".paper", ".einfo", ".ebody", ".emenu", ".legal > *"
  ].join(",");
  var PHOTO = ".band .ph";

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var n = en.target;
      if (!en.isIntersecting) {
        // Already scrolled past (a jump to a section, or a refresh part-way down): show it straight away, no fade
        if (en.boundingClientRect.bottom <= 0) { io.unobserve(n); n.classList.remove("rv", "rv--photo"); n.style.removeProperty("--rd"); }
        return;
      }
      io.unobserve(n);
      n.classList.add("in");
      // Once it has arrived, hand the element back to its normal styles (so hover effects work as before)
      setTimeout(function () { n.classList.remove("rv", "rv--photo", "in"); n.style.removeProperty("--rd"); }, 1900);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

  function scan(scope) {
    var counts = new Map();
    function take(n, photo) {
      if (n.__fx) return;
      n.__fx = true;
      var p = n.parentElement, i = counts.get(p) || 0;
      counts.set(p, i + 1);
      n.classList.add("rv");
      if (photo) n.classList.add("rv--photo");
      n.style.setProperty("--rd", Math.min(i, 5) * 0.09 + "s");
      io.observe(n);
    }
    (scope || document).querySelectorAll(SEL).forEach(function (n) { take(n, false); });
    (scope || document).querySelectorAll(PHOTO).forEach(function (n) { take(n, true); });
  }
  scan(document);

  // Cards and rows that the page builds after it loads (events, menus, the week list)
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(document); });
  }).observe(document.body, { childList: true, subtree: true });

  // Safety net: if anything on screen is still hidden after a few seconds, show it
  setTimeout(function () {
    document.querySelectorAll(".rv:not(.in)").forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) n.classList.add("in");
    });
  }, 4000);
})();
