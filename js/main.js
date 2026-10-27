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
  function liveMenus(menus, today) {
    return menus.filter(function (m) { return !m.valid_to || m.valid_to >= today; })
      .sort(function (a, b) { return (a.valid_to ? 0 : 1) - (b.valid_to ? 0 : 1); });
  }
  function renderMenu(m) {
    var box = el("div", "menu");
    box.appendChild(el("h3", "menu__title", m.title.replace(/\s*\(demo\)$/i, "")));
    if (m.subtitle) box.appendChild(el("p", "menu__sub", m.subtitle));
    if (m.intro) box.appendChild(el("p", "menu__intro", m.intro));
    m.sections.forEach(function (s) {
      box.appendChild(el("h3", null, s.name));
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
    var tabs = el("div", "tabs"), shown = [];
    live.forEach(function (m, i) {
      var pane = renderMenu(m); pane.hidden = i > 0; shown.push(pane);
      var tab = el("button", "tab" + (i === 0 ? " on" : ""), m.title);
      tab.type = "button";
      tab.addEventListener("click", function () {
        shown.forEach(function (p, k) { p.hidden = k !== i; });
        tabs.querySelectorAll(".tab").forEach(function (t, k) { t.classList.toggle("on", k === i); });
      });
      tabs.appendChild(tab);
    });
    if (live.length > 1) body.appendChild(tabs);
    shown.forEach(function (p) { body.appendChild(p); });
  }
  window.LION_renderMenus = renderMenus; // exposed so the date rules can be tested
  var todayISO = new Date().toISOString().slice(0, 10);
  fetch("data/menu.json").then(function (r) { return r.json(); })
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
