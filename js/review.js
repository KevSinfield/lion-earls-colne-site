/* Review mode: lets the Lion's owner go through the site and say what he thinks of each part.
   It does nothing unless the page is opened with ?review=Craig (or ?review=1). Then it adds a numbered gold tab to each
   section, a "Review" button, and a sheet to answer in. Answers are kept in the browser until "Send" is pressed.
   Turn it off with ?review=off. REMOVE this file (and its script tags and css/review.css) when the site goes live.

   To get answers by email, put a free Web3Forms access key below (web3forms.com: enter your email, they send the key).
   With no key, the Send step shows the answers to copy or share (WhatsApp, Messages, email) instead. */
(function () {
  var CFG = {
    web3formsKey: "",   // TODO Kev: paste the Web3Forms access key here to get answers by email
    email: ""           // optional: shows an "Email it" button in the fallback. Leave empty to keep the address off the site
  };

  var KEY = "lionReview";
  var mem = null;
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || mem || {}; } catch (e) { return mem || {}; }
  }
  var st = load();
  function save() { mem = st; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }

  var param = new URLSearchParams(location.search).get("review");
  if (param === "off") { st = {}; mem = null; try { localStorage.removeItem(KEY); sessionStorage.removeItem("rwGo"); } catch (e) {} return; }
  if (param) { st.on = true; if (param !== "1" && param !== "on") st.name = param.slice(0, 40); save(); }
  if (!st.on) return;
  st.a = st.a || {}; st.g = st.g || {};

  /* ---- what we ask about ---- */
  var ITEMS = [
    { id: "header", url: "index.html", sel: "#chrome-head", title: "The header bar and logo", q: "Do you like the logo and the menu links along the top?" },
    { id: "hero", url: "index.html", sel: ".hero", title: "Top of the home page", q: "What do you think of the photo, the headline (“Pub classics, wood-fired pizza & Sunday roasts”) and the four big buttons?" },
    { id: "soon", url: "index.html", sel: "#soon", title: "What's on next (event posters)", q: "Are the dates, times and details on these posters right?" },
    { id: "pizza", url: "index.html", sel: ".band", title: "Pizza, plates and pub classics", q: "Are you happy with the photo and the words?" },
    { id: "roast", url: "index.html", sel: ".band:nth-of-type(2)", title: "The Sunday roast", q: "Are you happy with the photo and the words?" },
    { id: "week", url: "index.html", sel: "#whats-on", title: "This week at the Lion", q: "Please check each day: is this the right weekly rhythm? The photo changes with the day." },
    { id: "history", url: "index.html", sel: "#history", title: "Our history", q: "Is the history right? We left out the old “1678” date because we couldn't confirm it. Do you know where it came from?" },
    { id: "join", url: "index.html", sel: "#join", title: "The “First to know” sign-up", q: "Do you like it? Is “First to know” a good name for the weekly news?" },
    { id: "find", url: "index.html", sel: ".find__map", title: "Find us: map and details", q: "Are the address and phone number right?" },
    { id: "hours", url: "index.html", sel: ".find__hours", title: "Opening hours", q: "Are these the standing hours every week?" },
    { id: "menus", right: true, url: "menus.html", sel: "main h1", title: "The Menus page", q: "Do you like how the menus are listed?" },
    { id: "menu", right: true, url: "menu.html?id=main-menu", match: "id=main-menu", sel: ".mhead", title: "A single menu (the Main Menu)", q: "Is this the whole food menu? Please check every dish: anything missing or wrong?" },
    { id: "whatson", right: true, url: "whats-on.html", sel: "main h1", title: "The What's on page", q: "Do you like how the events and the weekly nights are laid out?" },
    { id: "event", url: "event.html?id=halloween-disco", match: "id=halloween-disco", sel: "#event", title: "An event page (Halloween Disco)", q: "Are the details right: Saturday 31 October, 8:30pm, free entry, dress to scare, DJ Beeber?" },
    { id: "privacy", right: true, url: "privacy.html", sel: "main h1", title: "The Privacy page", q: "We need the Lion's legal business name, and an email address for people's data questions. What should go here?" }
  ];
  var GENERAL = [
    { id: "photos", q: "The photos and posters on the site come from the Lion's Facebook page, and some show people. Are you happy for us to use them?", choices: ["Yes, fine", "Ask me about each", "No"] },
    { id: "prices", q: "Do you want prices shown on the menus on the website?", choices: ["Yes", "No", "Some of them"] },
    { id: "booking", q: "What is the Lion's booking link (Stampede), when you have it? We'll point every “Book a table” button at it." },
    { id: "email", q: "Which email address should we show for the Lion?" },
    { id: "else", q: "Anything we've missed, or got wrong?" }
  ];
  var CHOICES = [["love", "Love it"], ["change", "Change it"], ["unsure", "Not sure"]];
  var LABEL = { love: "LOVE IT", change: "CHANGE IT", unsure: "NOT SURE" };

  /* ---- helpers ---- */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function here() { return location.pathname.split("/").pop() || "index.html"; }
  function onThisPage(it) {
    var file = it.url.split("?")[0];
    return file === here() && (!it.match || location.search.indexOf(it.match) > -1);
  }
  function answered() { return ITEMS.filter(function (i) { return st.a[i.id] && st.a[i.id].v; }).length; }
  function byId(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; }

  // Load the review styles only when review mode is on, using the same ?v= as this script
  var me = document.querySelector('script[src*="review.js"]');
  var v = me && /[?&]v=(\w+)/.exec(me.getAttribute("src"));
  var css = el("link"); css.rel = "stylesheet"; css.href = "css/review.css" + (v ? "?v=" + v[1] : "");
  document.head.appendChild(css);

  /* ---- the sheet ---- */
  var pill = el("button", "rw-pill"); pill.type = "button";
  var sheet = el("div", "rw-sheet"); sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-label", "Website review"); sheet.hidden = true;
  var head = el("div", "rw-head"), headT = el("b"), closeB = el("button", "rw-x", "×");
  closeB.type = "button"; closeB.setAttribute("aria-label", "Close");
  head.appendChild(headT); head.appendChild(closeB);
  var body = el("div", "rw-body");
  sheet.appendChild(head); sheet.appendChild(body);
  document.body.appendChild(sheet); document.body.appendChild(pill);

  var current = null;      // the item whose section is highlighted
  function mark(item) {
    document.querySelectorAll(".rw-on").forEach(function (n) { n.classList.remove("rw-on"); });
    current = item;
    var t = item && item.node; if (t) t.classList.add("rw-on");
  }
  function open(view, arg) { sheet.hidden = false; pill.hidden = true; render(view, arg); }
  function shut() { sheet.hidden = true; pill.hidden = false; mark(null); refresh(); }
  closeB.addEventListener("click", shut);
  pill.addEventListener("click", function () { open(st.seen ? "list" : "intro"); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) shut(); });

  function refresh() {
    pill.textContent = "";
    pill.appendChild(el("span", null, "Review"));
    pill.appendChild(el("b", null, answered() + "/" + ITEMS.length));
    ITEMS.forEach(function (it, i) {
      if (!it.tab) return;
      var a = st.a[it.id];
      it.tab.className = "rw-tab" + (a && a.v ? " is-" + a.v : "");
      it.tab.setAttribute("aria-label", "Review item " + (i + 1) + ": " + it.title + (a && a.v ? ", " + LABEL[a.v].toLowerCase() : ", not answered yet"));
    });
  }

  function goto(id) {
    var it = byId(id);
    if (onThisPage(it)) { focusItem(it); }
    else { try { sessionStorage.setItem("rwGo", id); } catch (e) {} location.href = it.url; }
  }
  function focusItem(it) {
    var n = it.node || findNode(it);
    if (n) {
      var top = n.getBoundingClientRect().top + window.scrollY - (it.id === "header" ? 0 : 110);
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    open("item", it); mark(it);
  }

  function render(view, arg) {
    body.textContent = "";
    if (view === "intro") return intro();
    if (view === "list") return list();
    if (view === "item") return item(arg);
    if (view === "general") return general();
    if (view === "send") return sendView();
    if (view === "thanks") return thanks();
  }

  function intro() {
    headT.textContent = "Hi" + (st.name ? " " + st.name : "") + ", welcome";
    body.appendChild(el("p", null, "This is a draft of the Lion's new website. We'd love to know what you think of every part of it."));
    body.appendChild(el("p", null, "Tap the gold numbers on the page. For each one, say Love it, Change it or Not sure, and add a note if you like. It takes about ten minutes, and you can stop and carry on later."));
    body.appendChild(el("p", "rw-fine", "Your answers stay on this phone until you press Send at the end."));
    var go = el("button", "rw-btn rw-btn--go", "Start"); go.type = "button";
    go.addEventListener("click", function () { st.seen = true; save(); goto(ITEMS[0].id); });
    body.appendChild(go);
  }

  function list() {
    headT.textContent = "Your review";
    mark(null);
    var bar = el("div", "rw-bar"), fill = el("span"); fill.style.width = Math.round(answered() / ITEMS.length * 100) + "%"; bar.appendChild(fill);
    body.appendChild(bar);
    body.appendChild(el("p", "rw-fine", answered() + " of " + ITEMS.length + " done. Tap one to go to it."));
    var ol = el("ol", "rw-list");
    ITEMS.forEach(function (it, i) {
      var li = el("li"), b = el("button", null); b.type = "button";
      var a = st.a[it.id];
      b.appendChild(el("i", a && a.v ? "is-" + a.v : "", String(i + 1)));
      b.appendChild(el("span", null, it.title));
      b.appendChild(el("em", null, a && a.v ? LABEL[a.v].toLowerCase() : ""));
      b.addEventListener("click", function () { goto(it.id); });
      li.appendChild(b); ol.appendChild(li);
    });
    body.appendChild(ol);
    var row = el("div", "rw-row");
    var g = el("button", "rw-btn", "A few questions"); g.type = "button"; g.addEventListener("click", function () { render("general"); });
    var s = el("button", "rw-btn rw-btn--go", "Finish and send"); s.type = "button"; s.addEventListener("click", function () { render("send"); });
    row.appendChild(g); row.appendChild(s); body.appendChild(row);
  }

  function item(it) {
    var i = ITEMS.indexOf(it);
    headT.textContent = (i + 1) + " of " + ITEMS.length;
    body.appendChild(el("h3", null, it.title));
    body.appendChild(el("p", null, it.q));
    var a = st.a[it.id] = st.a[it.id] || {};
    var row = el("div", "rw-choices");
    CHOICES.forEach(function (c) {
      var b = el("button", "rw-choice is-" + c[0], c[1]); b.type = "button";
      b.setAttribute("aria-pressed", a.v === c[0] ? "true" : "false");
      b.addEventListener("click", function () {
        a.v = c[0]; save(); refresh();
        row.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      });
      row.appendChild(b);
    });
    body.appendChild(row);
    var ta = el("textarea"); ta.rows = 3; ta.placeholder = "Your note (optional)"; ta.value = a.n || "";
    ta.setAttribute("aria-label", "Your note");
    ta.addEventListener("input", function () { a.n = ta.value; save(); });
    body.appendChild(ta);
    var nav = el("div", "rw-row");
    var back = el("button", "rw-btn", "All items"); back.type = "button"; back.addEventListener("click", function () { render("list"); });
    var next = el("button", "rw-btn rw-btn--go", i < ITEMS.length - 1 ? "Next" : "Finish"); next.type = "button";
    next.addEventListener("click", function () { if (i < ITEMS.length - 1) goto(ITEMS[i + 1].id); else render("general"); });
    nav.appendChild(back); nav.appendChild(next); body.appendChild(nav);
  }

  function general() {
    headT.textContent = "A few questions";
    mark(null);
    GENERAL.forEach(function (g) {
      var a = st.g[g.id] = st.g[g.id] || {};
      var box = el("div", "rw-q");
      box.appendChild(el("p", null, g.q));
      if (g.choices) {
        var row = el("div", "rw-choices");
        g.choices.forEach(function (c) {
          var b = el("button", "rw-choice", c); b.type = "button";
          b.setAttribute("aria-pressed", a.v === c ? "true" : "false");
          b.addEventListener("click", function () {
            a.v = c; save();
            row.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          });
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      var ta = el("textarea"); ta.rows = g.choices ? 2 : 3; ta.placeholder = g.choices ? "Anything to add (optional)" : "Your answer";
      ta.setAttribute("aria-label", g.q); ta.value = a.n || "";
      ta.addEventListener("input", function () { a.n = ta.value; save(); });
      box.appendChild(ta); body.appendChild(box);
    });
    var nav = el("div", "rw-row");
    var back = el("button", "rw-btn", "All items"); back.type = "button"; back.addEventListener("click", function () { render("list"); });
    var s = el("button", "rw-btn rw-btn--go", "Finish and send"); s.type = "button"; s.addEventListener("click", function () { render("send"); });
    nav.appendChild(back); nav.appendChild(s); body.appendChild(nav);
  }

  function summary() {
    var out = ["THE LION WEBSITE REVIEW", "From: " + (st.name || "(no name)") + " on " + new Date().toLocaleDateString("en-GB"), answered() + " of " + ITEMS.length + " items answered", ""];
    ITEMS.forEach(function (it, i) {
      var a = st.a[it.id] || {};
      out.push((i + 1) + ". " + it.title + ": " + (a.v ? LABEL[a.v] : "(no answer)"));
      if (a.n && a.n.trim()) out.push("   Note: " + a.n.trim());
    });
    out.push("", "QUESTIONS");
    GENERAL.forEach(function (g) {
      var a = st.g[g.id] || {};
      var ans = [a.v, a.n && a.n.trim()].filter(Boolean).join(". ");
      out.push("- " + g.q + "\n  " + (ans || "(no answer)"));
    });
    return out.join("\n");
  }

  function sendView() {
    headT.textContent = "Ready to send";
    mark(null);
    body.appendChild(el("p", null, "Here's everything you've said. Check it over, then send it to Kev."));
    var ta = el("textarea", "rw-sum"); ta.readOnly = true; ta.rows = 9; ta.value = summary(); ta.setAttribute("aria-label", "Your answers");
    body.appendChild(ta);
    var msg = el("p", "rw-fine"); body.appendChild(msg);
    var extra = el("div", "rw-row rw-extra");
    var row = el("div", "rw-row");
    var back = el("button", "rw-btn", "Back"); back.type = "button"; back.addEventListener("click", function () { render("list"); });
    row.appendChild(back);
    if (CFG.web3formsKey) {
      var s = el("button", "rw-btn rw-btn--go", "Send to Kev"); s.type = "button";
      s.addEventListener("click", function () {
        s.disabled = true; msg.textContent = "Sending…";
        fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ access_key: CFG.web3formsKey, subject: "Lion website review from " + (st.name || "the Lion"), from_name: "Lion website review", message: ta.value })
        }).then(function (r) { return r.json(); }).then(function (j) {
          if (j && j.success) { st.sent = Date.now(); save(); render("thanks"); }
          else throw new Error("no");
        }).catch(function () { s.disabled = false; msg.textContent = "That didn't go through. Try again, or use Copy below."; copyRow(); });
      });
      row.appendChild(s);
    } else { copyRow(); }
    body.appendChild(row);
    body.appendChild(extra);
    function copyRow() {
      if (extra.children.length) return;
      var c = el("button", "rw-btn rw-btn--go", "Copy my answers"); c.type = "button";
      c.addEventListener("click", function () {
        (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { msg.textContent = "Copied. Now paste it into a message to Kev."; })
          .catch(function () { ta.readOnly = false; ta.select(); msg.textContent = "Select all the text above, copy it, and paste it into a message to Kev."; });
      });
      extra.appendChild(c);
      if (navigator.share) {
        var sh = el("button", "rw-btn", "Share…"); sh.type = "button";
        sh.addEventListener("click", function () { navigator.share({ title: "Lion website review", text: ta.value }).catch(function () {}); });
        extra.appendChild(sh);
      }
      if (CFG.email) {
        var em = el("a", "rw-btn", "Email it"); em.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Lion website review") + "&body=" + encodeURIComponent(ta.value);
        extra.appendChild(em);
      }
    }
  }

  function thanks() {
    headT.textContent = "Thank you";
    body.appendChild(el("h3", null, "Sent. Cheers" + (st.name ? ", " + st.name : "") + "!"));
    body.appendChild(el("p", null, "Kev has your answers. You can keep looking around, and change anything and send again if you think of more."));
    var b = el("button", "rw-btn", "Back to the list"); b.type = "button"; b.addEventListener("click", function () { render("list"); });
    body.appendChild(b);
  }

  /* ---- numbered tabs on the page ---- */
  function findNode(it) { return onThisPage(it) ? document.querySelector(it.sel) : null; }
  function mount() {
    var missing = 0, added = 0;
    ITEMS.forEach(function (it, i) {
      if (it.tab || !onThisPage(it)) return;
      var n = document.querySelector(it.sel);
      if (n && n.tagName === "H1") n = n.parentElement;  // keep the button out of the heading text
      if (!n || n.hidden) { missing++; return; }
      if (getComputedStyle(n).position === "static") n.style.position = "relative";
      var t = el("button", "rw-tab", String(i + 1)); t.type = "button";
      if (it.right) t.setAttribute("data-r", "");  // top-right, clear of a label in the top-left
      t.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); open("item", it); mark(it); });
      n.appendChild(t); it.node = n; it.tab = t; added++;
    });
    if (added) refresh();  // only when something changed, or our own edits would retrigger the watcher forever
    return missing;
  }

  refresh();
  mount();
  var tries = 0;
  var mo = new MutationObserver(function () { if (++tries < 200) mount(); });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () { mo.disconnect(); }, 8000);

  // Arrived here from "Next" or the list on another page
  var go = null;
  try { go = sessionStorage.getItem("rwGo"); sessionStorage.removeItem("rwGo"); } catch (e) {}
  if (go && byId(go)) setTimeout(function () { mount(); focusItem(byId(go)); }, 700);
  else if (!st.seen) setTimeout(function () { open("intro"); }, 900);
})();
