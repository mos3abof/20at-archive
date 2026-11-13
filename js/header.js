// 20at archive, the header (templates/partials/header.html):
//  - the menus are <details>: opening one closes the others; Esc or a click outside closes them;
//  - on phones, ☰ opens the content row (.t9-types) as a drawer (without this script it simply shows);
//  - 🎲 and "مقال عشوائي": a random article from data/articles.json (without the script: the archive page).
(function () {
  "use strict";
  var head = document.querySelector("[data-t9h]");
  if (!head) return;
  head.classList.add("t9h--js");
  var drops = Array.prototype.slice.call(head.querySelectorAll("[data-drop]"));

  drops.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) drops.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  function closeAll(focusBack) {
    drops.forEach(function (d) {
      if (d.open) { d.open = false; if (focusBack) d.querySelector("summary").focus(); }
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (drops.some(function (d) { return d.open && d.contains(document.activeElement); })) closeAll(true);
    else if (head.classList.contains("t9h--open")) setDrawer(false, true);
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-drop]")) closeAll(false);
  });

  // the phone drawer
  var toggle = head.querySelector("[data-menu-toggle]");
  function setDrawer(open, focusBack) {
    head.classList.toggle("t9h--open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) closeAll(false);
    if (!open && focusBack) toggle.focus();
  }
  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", function () { setDrawer(!head.classList.contains("t9h--open")); });
  }

  // a random article
  var cache = null;
  head.querySelectorAll("[data-random]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      (cache || (cache = fetch(a.dataset.src).then(function (r) { return r.json(); })))
        .then(function (rows) { location.href = rows[Math.floor(Math.random() * rows.length)].u; })
        .catch(function () { location.href = a.href; });
    });
  });
})();
