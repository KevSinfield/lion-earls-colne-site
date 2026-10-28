(function () {
  var D = window.LION;
  var $ = function (s) { return document.querySelector(s); };
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function fmt(h) {
    h = h % 24;
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    var h12 = hh % 12 === 0 ? 12 : hh % 12;
    return h12 + (mm ? ":" + String(mm).padStart(2, "0") : "") + (hh >= 12 ? "pm" : "am");
  }

  // Static content from the data file
  $("#addr").textContent = D.address;
  $("#fb").href = D.facebook;
  $("#mapLink").href = D.mapsUrl;
  var ph = $("#phone");
  ph.textContent = D.phone;
  ph.href = "tel:" + D.phone.replace(/\s/g, "");
  $("#stickyCall").href = ph.href;
  document.querySelectorAll("[data-book]").forEach(function (a) {
    if (D.bookingUrl) { a.href = D.bookingUrl; a.rel = "noopener"; }
    else { a.href = "#find"; a.title = "Online booking coming soon"; }  // waiting for the Stampede link
  });

  // Week
  D.week.forEach(function (w) {
    var li = document.createElement("li");
    li.innerHTML = "<span class='wk__d'></span><strong></strong><span class='wk__n'></span>";
    li.children[0].textContent = w.day;
    li.children[1].textContent = w.title;
    li.children[2].textContent = w.note;
    $("#weekList").appendChild(li);
  });

  // Hours table
  [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
    var h = D.hours[d], tr = document.createElement("tr"), food = "";
    if (h && h.kitchen.length) food = "Food " + h.kitchen.map(function (k) { return fmt(k[0]) + " to " + fmt(k[1]); }).join(" and ");
    else if (h && h.note) food = h.note;
    tr.innerHTML = "<th></th><td></td><td></td>";
    tr.children[0].textContent = DAYS[d];
    tr.children[1].textContent = h ? fmt(h.open) + " to " + fmt(h.close) : "Closed";
    tr.children[2].textContent = food;
    $("#hours").appendChild(tr);
  });

  // Live labels and the "Coming up" strip. ?at=2026-10-31T18:00 previews another date and time.
  var NOW = new URLSearchParams(location.search).get("at") ? new Date(new URLSearchParams(location.search).get("at")) : new Date();
  function p2(n) { return String(n).padStart(2, "0"); }
  function isoDay(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function fromIso(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function when(e) {
    var d = fromIso(e.date);
    return DAYS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }
  function inDays(n) { return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n <= 14 ? "In " + n + " days" : ""; }
  function kitchenLabel() {
    var d = NOW.getDay(), t = NOW.getHours() + NOW.getMinutes() / 60, h = D.hours[d];
    if (!h) return "Closed today";
    if (!h.kitchen.length) return "Drinks only today";
    var cur = h.kitchen.filter(function (w) { return t >= w[0] && t < w[1]; })[0];
    if (cur) return "Kitchen until " + fmt(cur[1]);
    var nxt = h.kitchen.filter(function (w) { return t < w[0]; })[0];
    return nxt ? "Kitchen from " + fmt(nxt[0]) : "Kitchen closed now";
  }
  $("#actMenuL").textContent = kitchenLabel();

  function renderSoon(events) {
    var today = isoDay(NOW), todayDate = fromIso(today);
    var real = events.filter(function (e) { return !e.sample; });  // never show the invented sample nights
    var dated = real.filter(function (e) { return e.date && e.date >= today; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var picks = dated.slice(0, 2).map(function (e) {
      return { e: e, n: Math.round((fromIso(e.date) - todayDate) / 86400000), line: when(e) + (e.time ? " · " + e.time : "") };
    });
    if (picks.length < 2) {  // quiet week: fill with the regular nights, soonest first
      real.filter(function (e) { return e.recurs; }).map(function (e) {
        var n = (DAYS.indexOf(e.recurs) - todayDate.getDay() + 7) % 7;
        return { e: e, n: n, line: "Every " + e.recurs + (e.time ? " · " + e.time : "") };
      }).sort(function (a, b) { return a.n - b.n; }).slice(0, 2 - picks.length).forEach(function (x) { picks.push(x); });
    }
    var first = dated[0];
    if (first && Math.round((fromIso(first.date) - todayDate) / 86400000) <= 21) {
      $("#actEventL").textContent = "Next up";
      $("#actEventT").textContent = (first.short || first.title) + ", " + DAYS[fromIso(first.date).getDay()].slice(0, 3);
    }
    if (!picks.length) return;
    var grid = $("#soonGrid");
    grid.className = "soon__grid soon__grid--" + picks.length;
    $("#soonSub").textContent = !dated.length ? "On every week at the Lion." : picks.length > 1 && picks[1].e.date ? "Two nights to put in the diary." : "Next up at the Lion.";
    picks.forEach(function (x) {
      var a = document.createElement("a");
      a.className = "soon__card"; a.href = "event.html?id=" + encodeURIComponent(x.e.id);
      var pic = document.createElement("div"); pic.className = "soon__pic";
      if (x.e.image) {
        var im = document.createElement("img"); im.src = x.e.image; im.alt = x.e.image_alt || x.e.title; im.loading = "lazy"; pic.appendChild(im);
      } else {
        var ph = document.createElement("div"); ph.className = "soon__noimg"; ph.textContent = x.e.title; pic.appendChild(ph);
      }
      var chip = inDays(x.n);
      if (chip && x.n <= 7) { var c = document.createElement("span"); c.className = "soon__chip"; c.textContent = x.n === 0 && x.e.recurs ? "Tonight" : chip; pic.appendChild(c); }
      var w = document.createElement("span"); w.className = "soon__when"; w.textContent = x.line;
      var h = document.createElement("h3"); h.textContent = x.e.title;
      var m = document.createElement("span"); m.className = "soon__more"; m.textContent = "See the night";
      a.appendChild(pic); a.appendChild(w); a.appendChild(h); a.appendChild(m); grid.appendChild(a);
    });
    $("#soon").hidden = false;
  }
  fetch("data/sample/events.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
    .then(function (d) { renderSoon(d.events || []); }).catch(function () {});

  // Open-now badge
  function status() {
    var now = new Date(), d = now.getDay(), t = now.getHours() + now.getMinutes() / 60;
    var today = D.hours[d], yest = D.hours[(d + 6) % 7], msg = "", open = false;
    var h = null, tt = t;
    if (yest && yest.close > 24 && t < yest.close - 24) { h = yest; tt = t + 24; }
    else if (today && t >= today.open) h = today;
    if (h && tt < h.close) {
      open = true; msg = "Open now until " + fmt(h.close);
      var k = h.kitchen.filter(function (w) { return tt >= w[0] && tt < w[1]; })[0];
      var nxt = h.kitchen.filter(function (w) { return tt < w[0]; })[0];
      if (k) msg += " · Kitchen until " + fmt(k[1]);
      else if (nxt) msg += " · Kitchen from " + fmt(nxt[0]);
      else if (!h.kitchen.length) msg += " · Drinks only";
      else msg += " · Kitchen closed";
    } else if (today && t < today.open) msg = "Opens today at " + fmt(today.open);
    else {
      for (var i = 1; i <= 7; i++) {
        var nd = (d + i) % 7;
        if (D.hours[nd]) { msg = "Closed · Opens " + (i === 1 ? "tomorrow" : DAYS[nd]) + " at " + fmt(D.hours[nd].open); break; }
      }
    }
    $("#statusText").textContent = msg;
    $("#status").classList.toggle("is-open", open);
  }
  status();

  // Menu panel. Menus come from data/menu.json; anything past its valid_to date is hidden.
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function servedNow(m) {
    var now = new Date(), t = now.getHours() + now.getMinutes() / 60, d = now.getDay();
    return (m.served || []).some(function (w) { return (w.days || []).indexOf(d) > -1 && t >= w.from && t < w.to; });
  }
  // Dated menus (this week's specials) first, then whatever is being served right now, then the rest in file order.
  function liveMenus(menus, today) {
    function rank(m) { return m.valid_to ? 0 : servedNow(m) ? 1 : 2; }
    return menus.filter(function (m) { return !m.valid_to || m.valid_to >= today; })
      .sort(function (a, b) { return rank(a) - rank(b); });
  }
  function renderMenu(m) {
    var box = el("div", "menu");
    box.appendChild(el("h3", "menu__title", m.title.replace(/\s*\(demo\)$/i, "")));
    if (m.subtitle) box.appendChild(el("p", "menu__sub", m.subtitle));
    if (m.intro) box.appendChild(el("p", "menu__intro", m.intro));
    var acts = el("div", "menu__acts");
    if (m.pdf) {
      var dl = el("a", "btn btn--line btn--sm", "Download PDF");
      dl.href = m.pdf; dl.setAttribute("download", "");
      acts.appendChild(dl);
    }
    var full = el("a", "menu__full", "Open full page");
    full.href = "menu.html?id=" + encodeURIComponent(m.id);
    acts.appendChild(full);
    box.appendChild(acts);
    var jump = null;
    if (m.sections.length > 2) {
      jump = el("div", "menu__jump");
      box.appendChild(jump);
    }
    m.sections.forEach(function (s) {
      var h = el("h3", null, s.name);
      box.appendChild(h);
      if (jump) {
        var j = el("button", null, s.name.replace(/^Our /, ""));
        j.type = "button";
        j.addEventListener("click", function () { h.scrollIntoView({ behavior: "smooth", block: "start" }); });
        jump.appendChild(j);
      }
      if (s.note) box.appendChild(el("p", "menu__note", s.note));
      s.items.forEach(function (it) {
        var row = el("div", "dish");
        var left = el("div");
        if (it.label) left.appendChild(el("em", "dish__label", it.label));
        var name = el("strong", null, it.name);
        left.appendChild(name);
        it.tags.forEach(function (t) { name.appendChild(el("span", "dish__tag", t)); });
        if (it.description) left.appendChild(el("span", "dish__d", it.description));
        row.appendChild(left);
        if (it.price != null) row.appendChild(el("b", "dish__p", "£" + it.price.toFixed(2)));
        box.appendChild(row);
      });
    });
    (m.offers || []).forEach(function (o) {
      var b = el("div", "offer");
      b.appendChild(el("span", "offer__t", o.title));
      b.appendChild(el("strong", null, o.headline));
      if (o.detail) b.appendChild(el("span", "offer__d", o.detail));
      box.appendChild(b);
    });
    if (m.footnote) box.appendChild(el("p", "menu__foot", m.footnote));
    if (m.todo) box.appendChild(el("p", "todo", m.todo));
    return box;
  }
  function renderMenus(menus, today) {
    var body = $("#menuBody"), live = liveMenus(menus, today);
    body.textContent = "";
    if (!live.length) { body.appendChild(el("p", null, "Menu coming soon. Give us a call on " + D.phone + ".")); return; }
    var tabs = el("div", "tabs"), shown = [], btns = [], cur = 0;
    tabs.setAttribute("role", "tablist");
    function select(i, focus) {
      cur = (i + live.length) % live.length;
      shown.forEach(function (p, k) { p.hidden = k !== cur; });
      btns.forEach(function (t, k) { t.classList.toggle("on", k === cur); t.setAttribute("aria-selected", k === cur ? "true" : "false"); t.tabIndex = k === cur ? 0 : -1; });
      tabs.scrollLeft = btns[cur].offsetLeft - (tabs.clientWidth - btns[cur].offsetWidth) / 2;
      if (focus) btns[cur].focus();
      var box = body.closest(".panel__box"); if (box) box.scrollTop = 0;
    }
    live.forEach(function (m, i) {
      var pane = renderMenu(m); pane.hidden = i > 0; shown.push(pane);
      var tab = el("button", "tab" + (servedNow(m) ? " tab--now" : ""), m.title);
      tab.type = "button"; tab.setAttribute("role", "tab");
      tab.addEventListener("click", function () { select(i); });
      tab.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); select(cur + 1, true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); select(cur - 1, true); }
      });
      btns.push(tab); tabs.appendChild(tab);
    });
    if (live.length > 1) {
      body.appendChild(tabs);
      // Swipe left or right on a phone to move to the next or previous menu
      var x0 = null, y0 = null;
      body.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      body.addEventListener("touchend", function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) select(cur + (dx < 0 ? 1 : -1));
      }, { passive: true });
      body.appendChild(el("p", "menu__hint", "Swipe or use the tabs to see the other menus."));
    }
    shown.forEach(function (p) { body.appendChild(p); });
    if (live.length > 1) select(0);
  }
  window.LION_renderMenus = renderMenus; // exposed so the date rules can be tested
  var todayISO = new Date().toISOString().slice(0, 10);
  fetch("data/menu.json", { cache: "no-cache" }).then(function (r) { return r.json(); })
    .then(function (d) { renderMenus(d.menus, todayISO); })
    .catch(function () { $("#menuBody").textContent = "Menu coming soon. Give us a call on " + D.phone + "."; });
  var panel = $("#panel"), opener = null;
  function openPanel(e) { opener = e.currentTarget; panel.hidden = false; document.body.classList.add("lock"); panel.querySelector(".panel__x").focus(); }
  function closePanel() { panel.hidden = true; document.body.classList.remove("lock"); if (opener) opener.focus(); }
  document.querySelectorAll("[data-menu]").forEach(function (b) { b.addEventListener("click", openPanel); });
  panel.querySelector(".panel__x").addEventListener("click", closePanel);
  panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) closePanel(); });

  // Sticky bottom bar (phones) appears once the hero actions have scrolled away
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { $(".sticky").classList.toggle("show", !e[0].isIntersecting); }).observe($(".actions"));
  } else { $(".sticky").classList.add("show"); }

  // Sign-up (mock only)
  document.querySelectorAll(".js-join").forEach(function (f) {
    f.addEventListener("submit", function (e) { e.preventDefault(); f.querySelector(".ok").hidden = false; });
  });
})();
