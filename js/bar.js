/* The header bar, shared by every page. Builds into <header id="chrome-head" data-active="...">.
   Solid and sticky; shrinks a little on scroll; on a phone it becomes a slim bar with a menu drawer. */
(function () {
  var D = window.LION || {};
  var host = document.getElementById("chrome-head");
  if (!host) return;
  host.className = "bar";
  var mainEl = document.querySelector("main");
  if (mainEl) {  // "Skip to content" for keyboard users
    if (!mainEl.id) mainEl.id = "main-content";
    var skip = document.createElement("a");
    skip.className = "skip"; skip.href = "#" + mainEl.id; skip.textContent = "Skip to content";
    document.body.insertBefore(skip, document.body.firstChild);
  }
  var active = host.getAttribute("data-active") || "";
  var links = [
    ["menus.html", "Menus", "menus"],
    ["whats-on.html", "What's on", "events"],
    ["index.html#history", "History", "history"],
    ["index.html#find", "Find us", "find"]
  ];
  var tel = (D.phone || "").replace(/\s/g, "");

  function navLinks() {
    return links.map(function (l) {
      return '<a href="' + l[0] + '"' + (l[2] === active ? ' class="on"' : "") + ">" + l[1] + "</a>";
    }).join("");
  }
  host.innerHTML =
    '<div class="wrap bar__in">' +
      '<a class="bar__logo" href="index.html" aria-label="The Lion, Earls Colne, home">' +
        '<img src="images/logo-light.png" alt="The Lion, Earls Colne" width="500" height="500"></a>' +
      '<nav class="bar__nav" aria-label="Main">' + navLinks() + "</nav>" +
      '<div class="bar__right">' +
        (tel ? '<a class="bar__tel" href="tel:' + tel + '">' + D.phone + "</a>" : "") +
        '<a class="btn btn--line" data-book href="#">Book a table</a>' +
      "</div>" +
      '<button class="bar__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="bar-drawer">' +
        "<span></span><span></span><span></span></button>" +
    "</div>" +
    '<div class="bar__drawer" id="bar-drawer">' + navLinks() +
      '<a class="btn btn--gold" data-book href="#">Book a table</a>' +
      (tel ? '<a class="bar__tel" href="tel:' + tel + '">Call ' + D.phone + "</a>" : "") +
    "</div>";

  // Book buttons go to Stampede once there is a link; until then, to the Find us section
  host.querySelectorAll("[data-book]").forEach(function (b) {
    if (D.bookingUrl) { b.href = D.bookingUrl; b.rel = "noopener"; }
    else { b.href = "index.html#find"; b.title = "Online booking coming soon"; }
  });

  var burger = host.querySelector(".bar__burger"), drawer = host.querySelector(".bar__drawer");
  burger.addEventListener("click", function () {
    var open = drawer.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  drawer.addEventListener("click", function (e) {
    if (e.target.closest("a")) { drawer.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
  });

  function onScroll() { host.classList.toggle("is-small", window.scrollY > 60); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
