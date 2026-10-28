/* Mock-up pages: menu picker, single menu, What's on, event. Reads data/menu.json (real)
   plus data/sample/*.json (invented, flagged SAMPLE). Add ?at=2026-10-30T18:00 to any page
   to preview it at another date and time (for the "Served now" badges). */
(function () {
  var D = window.LION || {};
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var KIND = { regular: "Menu", special: "Special", themed: "Themed night" };
  var TYPE = { music: "Live music", party: "Party night", workshop: "Workshop", poker: "Poker", food: "Food night" };
  function big(e) { return e.type === "party" || e.type === "workshop"; }

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function param(n) { return new URLSearchParams(location.search).get(n); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fromISO(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  var NOW = param("at") ? new Date(param("at")) : new Date();
  var TODAY = iso(NOW);
  function daysUntil(s) { return Math.round((fromISO(s) - fromISO(TODAY)) / 86400000); }
  function fmt(h) {
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60), h12 = hh % 12 === 0 ? 12 : hh % 12;
    return h12 + (mm ? ":" + pad(mm) : "") + (hh >= 12 ? "pm" : "am");
  }
  function dayLabel(s) { var d = fromISO(s); return DAYS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3); }

  /* ---------- data ---------- */
  function getJSON(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function loadAll() {
    return Promise.all([getJSON("data/menu.json"), getJSON("data/sample/menus.json"), getJSON("data/sample/events.json")])
      .then(function (a) {
        var byId = {}, menus = [];
        a[0].menus.forEach(function (m) { byId[m.id] = m; menus.push(m); });
        a[1].menus.forEach(function (s) {
          if (byId[s.id]) Object.assign(byId[s.id], s); else { byId[s.id] = s; menus.push(s); }
        });
        menus.forEach(function (m) { m.kind = m.kind || "regular"; });
        var evById = {};
        a[2].events.forEach(function (e) { evById[e.id] = e; });
        return { menus: menus, byId: byId, events: a[2].events, evById: evById };
      });
  }
  function servedNow(m) {
    var t = NOW.getHours() + NOW.getMinutes() / 60, d = NOW.getDay();
    return (m.served || []).some(function (w) {
      var dayOk = w.dates ? w.dates.indexOf(TODAY) > -1 : (w.days || []).indexOf(d) > -1;
      return dayOk && t >= w.from && t < w.to;
    });
  }
  function live(m) { return !m.valid_to || m.valid_to >= TODAY; }

  /* ---------- shared header and footer ---------- */
  function chrome(active) {
    var f = $("#chrome-foot");
    f.className = "foot";
    f.innerHTML = '<div class="wrap foot__in"><span>&copy; The Lion, Earls Colne &middot; <a href="index.html#join">Weekly news</a> &middot; <a href="privacy.html">Privacy</a></span><span>' + (D.address || "") + "</span></div>";

    var sb = el("div", "sticky show");
    sb.innerHTML = '<a class="btn btn--gold" data-book href="#">Book a table</a><a class="btn btn--line" href="tel:' + (D.phone || "").replace(/\s/g, "") + '">Call us</a>';
    document.body.appendChild(sb);
    document.querySelectorAll("[data-book]").forEach(function (a) {
      if (D.bookingUrl) { a.href = D.bookingUrl; a.rel = "noopener"; }
      else { a.href = "index.html#find"; a.title = "Online booking coming soon"; }
    });
  }
  function bookButton(label, cls) {
    var a = el("a", cls || "btn btn--gold", label || "Book a table");
    a.setAttribute("data-book", "");
    if (D.bookingUrl) { a.href = D.bookingUrl; a.rel = "noopener"; }
    else { a.href = "index.html#find"; a.title = "Online booking coming soon"; }
    return a;
  }
  function chips(container, items, onPick) {
    items.forEach(function (it, i) {
      var b = el("button", "chip" + (i === 0 ? " on" : ""), it[1]);
      b.type = "button";
      b.addEventListener("click", function () {
        container.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("on"); });
        b.classList.add("on");
        onPick(it[0]);
      });
      container.appendChild(b);
    });
  }
  function sampleTag() { return el("span", "tag tag--sample", "Sample"); }

  /* ---------- menus.html ---------- */
  function menusPage(data) {
    var wrap = $("#cards"), cur = "all";
    var list = data.menus.filter(live);
    function prio(m) { return servedNow(m) ? 0 : m.kind === "special" ? 1 : m.kind === "themed" ? 2 : 3; }
    list.sort(function (a, b) { return prio(a) - prio(b); });
    function draw() {
      wrap.textContent = "";
      list.filter(function (m) { return cur === "all" || m.kind === cur; }).forEach(function (m) {
        var a = el("a", "mcard"); a.href = "menu.html?id=" + encodeURIComponent(m.id) + (param("at") ? "&at=" + param("at") : "");
        var top = el("div", "mcard__top");
        top.appendChild(el("span", "tag tag--" + m.kind, KIND[m.kind]));
        if (servedNow(m)) top.appendChild(el("span", "badge badge--now", "Served now"));
        else if (m.new) top.appendChild(el("span", "badge badge--new", "New"));
        if (m.sample) top.appendChild(sampleTag());
        a.appendChild(top);
        a.appendChild(el("h3", "mcard__t", m.title));
        if (m.blurb) a.appendChild(el("p", "mcard__b", m.blurb));
        a.appendChild(el("p", "mcard__s", m.served_text || ""));
        var go = el("span", "mcard__go", "See the menu");
        a.appendChild(go);
        wrap.appendChild(a);
      });
    }
    var kinds = [["special", "Specials"], ["themed", "Themed nights"], ["regular", "Regular menus"]].filter(function (k) {
      return list.some(function (m) { return m.kind === k[0]; });
    });
    if (kinds.length > 1) chips($("#chips"), [["all", "All menus"]].concat(kinds), function (v) { cur = v; draw(); });
    draw();
  }

  /* ---------- menu.html ---------- */
  function menuPage(data) {
    var m = data.byId[param("id")];
    var box = $("#menu");
    if (!m) { box.appendChild(el("p", null, "Menu not found.")); return; }
    document.title = m.title + " | The Lion, Earls Colne";
    var ev = m.event_id ? data.evById[m.event_id] : null;

    var head = el("div", "mhead");
    var tags = el("div", "mcard__top");
    tags.appendChild(el("span", "tag tag--" + m.kind, KIND[m.kind]));
    if (servedNow(m)) tags.appendChild(el("span", "badge badge--now", "Served now"));
    if (m.sample) tags.appendChild(sampleTag());
    head.appendChild(tags);
    head.appendChild(el("h1", null, m.title));
    head.appendChild(el("p", "mhead__s", m.served_text || ""));
    box.appendChild(head);

    if (ev) {
      var link = el("a", "evlink"); link.href = "event.html?id=" + ev.id + (param("at") ? "&at=" + param("at") : "");
      link.innerHTML = "<span>This menu is for</span><strong></strong><em>View the event</em>";
      link.querySelector("strong").textContent = ev.title + (ev.date ? " · " + dayLabel(ev.date) : "");
      box.appendChild(link);
    }

    var paper = el("div", "paper");
    var bar = el("div", "paper__bar");
    if (m.pdf) {
      var pdf = el("a", "btn btn--ghost btn--sm", "Download PDF");
      pdf.href = m.pdf; pdf.setAttribute("download", "");
      bar.appendChild(pdf);
    }
    if (!bar.children.length) bar = null;
    if (bar) paper.appendChild(bar);

    (m.offers || []).forEach(function (o) {
      var b = el("div", "offer");
      b.appendChild(el("span", "offer__t", o.title));
      b.appendChild(el("strong", null, o.headline));
      if (o.detail) b.appendChild(el("span", "offer__d", o.detail));
      paper.appendChild(b);
    });
    var body = el("div");
    paper.appendChild(body);
    if (m.footnote) paper.appendChild(el("p", "menu__foot", m.footnote));
    box.appendChild(paper);

    function draw() {
      body.textContent = "";
      var shown = 0;
      m.sections.forEach(function (s) {
        var items = s.items;
        body.appendChild(el("h3", null, s.name));
        if (s.note) body.appendChild(el("p", "menu__note", s.note));
        items.forEach(function (it) {
          shown++;
          var row = el("div", "dish"), left = el("div");
          if (it.label) left.appendChild(el("em", "dish__label", it.label));
          var nm = el("strong", null, it.name);
          (it.tags || []).forEach(function (t) { nm.appendChild(el("span", "dish__tag", t)); });
          left.appendChild(nm);
          if (it.description) left.appendChild(el("span", "dish__d", it.description));
          row.appendChild(left);
          if (it.price != null) row.appendChild(el("b", "dish__p", "£" + it.price.toFixed(2)));
          body.appendChild(row);
        });
      });
    }
    draw();
    box.appendChild(el("p", "menu__foot menu__foot--page", "Please let a member of staff know if you have any dietary requirements."));
  }

  /* ---------- events ---------- */
  function occurrences(data) {
    return data.events.filter(function (e) { return e.date && e.date >= TODAY; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function posterEl(e, big) {
    if (e.image) {  // a real poster or photo beats the drawn one
      var q = el("div", "poster poster--img" + (big ? " poster--big" : ""));
      var im = el("img"); im.src = e.image; im.alt = e.image_alt || e.title; im.loading = "lazy";
      q.appendChild(im);
      return q;
    }
    var p = el("div", "poster poster--" + (e.poster || "plain") + (big ? " poster--big" : ""));
    if (e.date) p.appendChild(el("span", "poster__d", dayLabel(e.date)));
    p.appendChild(el("span", "poster__t", e.title));
    if (e.time) p.appendChild(el("span", "poster__m", e.time));
    return p;
  }
  function countdown(e) {
    var n = daysUntil(e.date);
    return n === 0 ? "Tonight" : n === 1 ? "Tomorrow" : "In " + n + " days";
  }
  function evHref(e) { return "event.html?id=" + e.id + (param("at") ? "&at=" + param("at") : ""); }
  function menuHref(e) { return "menu.html?id=" + e.menu_id + (param("at") ? "&at=" + param("at") : ""); }

  function eventsPage(data) {
    var upcoming = occurrences(data);
    var feat = upcoming.filter(function (e) { return e.featured; })[0] || upcoming.filter(big)[0];
    var fbox = $("#featured");
    if (feat) {
      var c = el("div", "feature");
      c.appendChild(posterEl(feat, true));
      var t = el("div", "feature__t");
      t.appendChild(el("p", "kicker", "Next big night · " + countdown(feat)));
      t.appendChild(el("h2", null, feat.title));
      t.appendChild(el("p", "feature__m", dayLabel(feat.date) + " · " + (feat.time || "") + (feat.price ? " · " + feat.price : "")));
      t.appendChild(el("p", null, feat.blurb));
      var acts = el("div", "acts");
      var more = el("a", "btn btn--gold", "See the night"); more.href = evHref(feat); acts.appendChild(more);
      if (feat.menu_id) { var mm = el("a", "btn btn--line", "See the menu"); mm.href = menuHref(feat); acts.appendChild(mm); }
      t.appendChild(acts);
      if (feat.sample) t.appendChild(sampleTag());
      c.appendChild(t);
      fbox.appendChild(c);
    }

    var weekly = data.events.filter(function (e) { return e.recurs; });
    var wbox = $("#weekly");
    weekly.forEach(function (e) {
      var r = el("a", "wk"); r.href = evHref(e);
      r.innerHTML = "<span></span><strong></strong><em></em>";
      r.children[0].textContent = "Every " + e.recurs;
      r.children[1].textContent = e.title;
      r.children[2].textContent = e.time || "";
      wbox.appendChild(r);
    });

    var cur = "all", list = $("#list");
    function group(e) {
      var n = daysUntil(e.date);
      if (n <= 6) return "This week";
      if (n <= 13) return "Next week";
      return MONTHS[fromISO(e.date).getMonth()];
    }
    function draw() {
      list.textContent = "";
      var last = null, any = false;
      upcoming.filter(function (e) { return cur === "all" || e.type === cur; }).forEach(function (e) {
        any = true;
        var g = group(e);
        if (g !== last) { list.appendChild(el("h3", "gh", g)); last = g; }
        var d = fromISO(e.date);
        var card = el("article", "ev" + (big(e) ? " ev--themed" : ""));
        var date = el("div", "ev__d");
        date.appendChild(el("span", null, DAYS[d.getDay()].slice(0, 3)));
        date.appendChild(el("strong", null, "" + d.getDate()));
        date.appendChild(el("span", null, MONTHS[d.getMonth()].slice(0, 3)));
        card.appendChild(date);
        var mid = el("div", "ev__m");
        var tg = el("div", "mcard__top");
        tg.appendChild(el("span", "tag tag--" + (big(e) ? "themed" : "plain"), TYPE[e.type]));
        if (e.sample) tg.appendChild(sampleTag());
        mid.appendChild(tg);
        mid.appendChild(el("h4", null, e.title));
        mid.appendChild(el("p", "ev__t", [e.time, e.note, e.price].filter(Boolean).join(" · ")));
        if (e.blurb) mid.appendChild(el("p", "ev__b", e.blurb));
        card.appendChild(mid);
        var acts = el("div", "ev__a");
        var det = el("a", "btn btn--line btn--sm", "Details"); det.href = evHref(e); acts.appendChild(det);
        if (e.menu_id) { var mn = el("a", "btn btn--ghost btn--sm", "Menu"); mn.href = menuHref(e); acts.appendChild(mn); }
        card.appendChild(acts);
        list.appendChild(card);
      });
      if (!any) list.appendChild(el("p", "menu__note", "Nothing coming up for this filter."));
    }
    chips($("#chips"), [["all", "Everything"], ["party", "Party nights"], ["music", "Live music"], ["workshop", "Workshops"]], function (v) { cur = v; draw(); });
    draw();
  }

  /* ---------- event.html ---------- */
  function parseStart(str) {
    var m = /(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)/i.exec(str || "");
    if (!m) return [19, 0];
    var h = +m[1] % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0);
    return [h, m[2] ? +m[2] : 0];
  }
  function icsFor(e) {
    var date = e.date || iso(nextWeekday(e.recurs));
    var s = parseStart(e.time), d = fromISO(date);
    function stamp(dt) { return dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()) + "T" + pad(dt.getHours()) + pad(dt.getMinutes()) + "00"; }
    var start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s[0], s[1]);
    var end = new Date(start.getTime() + 3 * 3600000);
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Lion Earls Colne//EN", "BEGIN:VEVENT",
      "UID:" + e.id + "@thelionearlscolne.com", "DTSTAMP:" + stamp(new Date()), "DTSTART:" + stamp(start), "DTEND:" + stamp(end),
      "SUMMARY:" + e.title + " at The Lion", "LOCATION:" + (D.address || "The Lion, High Street, Earls Colne"),
      "DESCRIPTION:" + (e.blurb || "")];
    if (e.recurs) lines.push("RRULE:FREQ=WEEKLY");
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n");
  }
  function nextWeekday(name) {
    var want = DAYS.indexOf(name), d = fromISO(TODAY);
    while (d.getDay() !== want) d.setDate(d.getDate() + 1);
    return d;
  }

  function eventPage(data) {
    var e = data.evById[param("id")], box = $("#event");
    if (!e) { box.appendChild(el("p", null, "Event not found.")); return; }
    document.title = e.title + " | The Lion, Earls Colne";
    box.appendChild(posterEl(e, true));

    var info = el("div", "einfo");
    var dateTxt = e.date ? DAYS[fromISO(e.date).getDay()] + " " + dayLabel(e.date).split(" ").slice(1).join(" ") : "Every " + e.recurs;
    [["When", dateTxt], ["Time", e.time || ""], [e.price ? "Price" : "Type", e.price || TYPE[e.type]]].forEach(function (p) {
      var c = el("div"); c.appendChild(el("span", null, p[0])); c.appendChild(el("strong", null, p[1])); info.appendChild(c);
    });
    box.appendChild(info);
    if (e.sample) box.appendChild(sampleTag());

    var main = el("div", "ebody");
    if (e.date) main.appendChild(el("p", "kicker", countdown(e)));
    main.appendChild(el("p", "ebody__lead", e.blurb || ""));
    if (e.details) {
      var ul = el("ul", "tick");
      e.details.forEach(function (d) { ul.appendChild(el("li", null, d)); });
      main.appendChild(ul);
    }
    if (e.todo) main.appendChild(el("p", "todo", e.todo));
    var acts = el("div", "acts");
    acts.appendChild(bookButton("Book a table"));
    var cal = el("button", "btn btn--line", "Add to calendar"); cal.type = "button";
    cal.addEventListener("click", function () {
      var url = URL.createObjectURL(new Blob([icsFor(e)], { type: "text/calendar" }));
      var a = el("a"); a.href = url; a.download = e.id + ".ics"; document.body.appendChild(a); a.click(); a.remove();
    });
    acts.appendChild(cal);
    var sh = el("button", "btn btn--line", "Share"); sh.type = "button";
    sh.addEventListener("click", function () {
      if (navigator.share) navigator.share({ title: e.title + " at The Lion", url: location.href });
      else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { sh.textContent = "Link copied"; });
    });
    acts.appendChild(sh);
    main.appendChild(acts);
    box.appendChild(main);

    var m = e.menu_id ? data.byId[e.menu_id] : null;
    if (m) {
      var ms = el("section", "emenu");
      ms.appendChild(el("p", "kicker", "On the menu"));
      var shown = 0;
      m.sections.forEach(function (s) {
        s.items.forEach(function (it) {
          if (shown >= 6) return;
          shown++;
          var row = el("div", "dish"), left = el("div");
          left.appendChild(el("strong", null, it.name));
          if (it.description) left.appendChild(el("span", "dish__d", it.description));
          row.appendChild(left);
          if (it.price != null) row.appendChild(el("b", "dish__p", "£" + it.price.toFixed(2)));
          ms.appendChild(row);
        });
      });
      var full = el("a", "btn btn--gold", "See the full menu"); full.href = menuHref(e);
      var wrap = el("p", "emenu__go"); wrap.appendChild(full); ms.appendChild(wrap);
      box.appendChild(ms);
    }
  }

  /* ---------- boot ---------- */
  var page = document.body.dataset.page;
  chrome({ menus: "menus", menu: "menus", events: "events", event: "events" }[page]);
  loadAll().then(function (data) {
    ({ menus: menusPage, menu: menuPage, events: eventsPage, event: eventPage })[page](data);
  }).catch(function (err) {
    var m = $("main"); if (m) m.appendChild(el("p", "menu__note", "Couldn't load this page. (" + err.message + ")"));
  });
})();
