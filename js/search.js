// 20at archive, search (data in static/search/, written by pipeline/site.py write_search):
//   quick.json     [kind, name, url, note]: writers, sections, years, the archive's own pages
//   articles.json  [title, url, date, section, authors], newest first
//   text-N.json    the articles' text, same order, `chunk` a file (meta.json), fetched only when asked
// Two places use it:
//   - the header's field (form[data-suggest]): suggestions as you type, writers/sections/pages first,
//     then article titles; ↑ ↓ to move, Enter to open, Esc to close; Enter with nothing chosen searches;
//   - the search page (templates/search.html, [data-search-page]): every match, grouped by kind, and on
//     request (a button) the articles' text, results growing as each file arrives.
// Matching ignores the differences Arabic spelling allows: vowel marks and tatweel, أ/إ/آ/ا, ى/ي, ة/ه,
// ؤ/و, ئ/ي, and case; every word of the query must appear.
(function () {
  "use strict";

  var MARKS = /[ً-ٰٟـ]/g;
  function norm(s) {
    return (s || "").replace(MARKS, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
      .toLowerCase().replace(/\s+/g, " ").trim();
  }
  // every query word must begin a word of the text, after at most a prefix (و ف ب ل ك, ال, وال, بال, لل…):
  // "ستار" finds "ستار" and "والستار" but not "كوستاريكا" or "الستارة"'s inside; endings are free
  // ("أكاديمي" finds "أكاديمية"). words() gives one RegExp per word, built once per search.
  var LETTER = "\\u0621-\\u064Aa-z0-9";
  function words(q) {
    return norm(q).split(" ").filter(Boolean).map(function (w) {
      return new RegExp("(?:^|[^" + LETTER + "])(?:[وفبلك]?(?:ال)?|لل)" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    });
  }
  function hasAll(hay, ws) { for (var i = 0; i < ws.length; i++) if (!ws[i].test(hay)) return false; return true; }
  // rank: the query as the whole name, as whole words at its start, as whole words, at the start of a word,
  // then inside a word ("منى" must come before "منير")
  var NOTLETTER = /[^\u0621-\u064Aa-z0-9]/;
  function rank(hay, q) {
    if (hay === q) return 0;
    var i = hay.indexOf(q), best = 9;
    while (i >= 0) {
      var before = i === 0 || NOTLETTER.test(hay[i - 1]), after = i + q.length >= hay.length || NOTLETTER.test(hay[i + q.length]);
      var r = before && after ? (i === 0 ? 1 : 2) : before ? (i === 0 ? 3 : 4) : 5;
      if (r < best) best = r;
      i = hay.indexOf(q, i + 1);
    }
    return best;
  }

  // a pattern that finds a query word in the original text, whatever its spelling variant
  var ALT = { "ا": "[اأإآٱ]", "ي": "[يىئ]", "ه": "[هة]", "و": "[وؤ]" };
  function loose(w) {
    return w.split("").map(function (c) {
      return (ALT[c] || c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) + "[\\u064B-\\u065F\\u0670\\u0640]*";
    }).join("");
  }

  var cache = {};
  function getJSON(url) {
    return cache[url] || (cache[url] = fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    }));
  }
  function loadIndex(el) {
    return Promise.all([getJSON(el.dataset.quick), getJSON(el.dataset.articles)]).then(function (d) {
      if (!d[0].normed) { d[0].forEach(function (r) { r.n = norm(r[1]); }); d[0].normed = true; }
      if (!d[1].normed) { d[1].forEach(function (r) { r.n = norm(r[0]); r.m = norm(r[0] + " " + r[3] + " " + r[4]); }); d[1].normed = true; }
      return { quick: d[0], articles: d[1] };
    });
  }
  function quickMatches(ix, ws, q) {
    return ix.quick.filter(function (r) { return hasAll(r.n, ws); })
      .map(function (r, i) { return [rank(r.n, q), i, r]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }
  function articleMatches(ix, ws, q) {
    return ix.articles.filter(function (r) { return hasAll(r.m, ws); })
      .map(function (r, i) { return [hasAll(r.n, ws) ? rank(r.n, q) : 6, i, r]; })   // title hits before byline/section hits
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---- the header's suggestions ------------------------------------------------------------------- */
  document.querySelectorAll("form[data-suggest]").forEach(function (form) {
    var input = form.querySelector("input[type=search]");
    var list = form.querySelector("[role=listbox]");
    var ix = null, active = -1, timer = 0;

    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; }
    function items() { return Array.prototype.slice.call(list.querySelectorAll("[role=option]")); }
    function select(i) {
      var opts = items();
      if (!opts.length) return;
      active = (i + opts.length) % opts.length;
      opts.forEach(function (o, j) { o.setAttribute("aria-selected", j === active ? "true" : "false"); });
      input.setAttribute("aria-activedescendant", opts[active].id);
      opts[active].scrollIntoView({ block: "nearest" });
    }
    function option(href, label, kind, note) {
      var li = el("li"); li.setAttribute("role", "option"); li.id = "t9h-opt-" + list.children.length;
      var a = el("a"); a.href = href; a.tabIndex = -1;
      if (kind) a.appendChild(el("span", "t9h__kind", kind));
      a.appendChild(el("span", "t9h__label", label));
      if (note) a.appendChild(el("span", "t9h__note", note));
      li.appendChild(a); list.appendChild(li);
    }
    function render() {
      var q = norm(input.value), ws = words(input.value);
      list.textContent = "";
      if (q.length < 2 || !ix) { close(); return; }
      quickMatches(ix, ws, q).slice(0, 5).forEach(function (r) { option(r[2], r[1], r[0], r[3]); });
      articleMatches(ix, ws, q).slice(0, 5).forEach(function (r) { option(r[1], r[0], "مقال", r[2]); });
      var all = form.action + (form.action.indexOf("?") < 0 ? "?" : "&") + "q=" + encodeURIComponent(input.value.trim());
      option(all, "كل نتائج «" + input.value.trim() + "»، وفي نصوص المقالات ←", "", "");
      list.lastChild.classList.add("t9h__all");
      list.hidden = false; input.setAttribute("aria-expanded", "true"); active = -1;
    }
    function ensure() {
      if (ix) return Promise.resolve(ix);
      return loadIndex(form).then(function (d) { ix = d; return d; });
    }
    input.addEventListener("focus", function () { ensure().catch(function () {}); });
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { ensure().then(render).catch(close); }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (list.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); select(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); select(active - 1); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "Enter" && active >= 0) { e.preventDefault(); location.href = items()[active].querySelector("a").href; }
    });
    document.addEventListener("click", function (e) { if (!form.contains(e.target)) close(); });
  });

  /* ---- the search page ---------------------------------------------------------------------------- */
  var page = document.querySelector("[data-search-page]");
  if (!page) return;
  var input = page.querySelector("input[type=search]");
  var status = page.querySelector("[data-status]");
  var out = page.querySelector("[data-results]");
  var params = new URLSearchParams(location.search);
  input.value = params.get("q") || "";
  var KINDS = [["كاتب", "الكُتَّاب"], ["قسم", "الأقسام"], ["سنة", "السنوات"], ["صفحة", "صفحات"], ["وسائط", "الوسائط"]];
  var PAGE = 40, run = 0, textState = null;   // textState: {texts: [...normalized], raw: [...]} once loaded

  function arNum(n) { return String(n).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩"[d]; }); }
  function snippet(raw, ws) {
    var re = new RegExp(ws.map(loose).join("|"), "g"), m = re.exec(raw);
    if (!m) return null;
    var s = Math.max(0, m.index - 90), e = Math.min(raw.length, m.index + 160);
    var piece = (s ? "…" : "") + raw.slice(s, e) + (e < raw.length ? "…" : "");
    var p = el("p", "ar-search__snip"), last = 0, mm;
    re.lastIndex = 0;
    while ((mm = re.exec(piece)) && mm[0]) {
      p.appendChild(document.createTextNode(piece.slice(last, mm.index)));
      p.appendChild(el("mark", "", mm[0]));
      last = mm.index + mm[0].length;
    }
    p.appendChild(document.createTextNode(piece.slice(last)));
    return p;
  }
  function articleItem(r, ws, raw) {
    var li = el("li", "ar-search__hit");
    var a = el("a", "ar-search__title", r[0]); a.href = r[1]; li.appendChild(a);
    li.appendChild(el("p", "ar-search__meta", [r[2], r[3], r[4]].filter(Boolean).join(" · ")));
    if (raw) { var sn = snippet(raw, ws); if (sn) li.appendChild(sn); }
    return li;
  }
  function list(rows, make, more) {
    var ul = el("ul", "ar-search__list"); ul.setAttribute("role", "list");
    var shown = 0;
    function next() {
      rows.slice(shown, shown + PAGE).forEach(function (r) { ul.appendChild(make(r)); });
      shown = Math.min(rows.length, shown + PAGE);
      btn.hidden = shown >= rows.length;
      btn.textContent = "المزيد (" + arNum(rows.length - shown) + ") ↓";
    }
    var frag = document.createDocumentFragment(), btn = el("button", "hv-button-outline ar-search__more");
    btn.type = "button"; btn.addEventListener("click", next);
    frag.appendChild(ul); frag.appendChild(btn); next();
    return frag;
  }
  function group(title, count, body) {
    var s = el("section", "ar-search__group");
    var h = el("h2", "ar-search__head", title + " "); h.appendChild(el("span", "ar-search__count", arNum(count)));
    s.appendChild(h); s.appendChild(body); out.appendChild(s);
    return s;
  }

  function search() {
    var mine = ++run, q = norm(input.value), ws = words(input.value), plain = q.split(" ").filter(Boolean);
    out.textContent = "";
    if (!q) { status.textContent = "كلمة أو اسم للبحث في الأرشيف."; return; }
    status.textContent = "جارٍ البحث…";
    loadIndex(page).then(function (ix) {
      if (mine !== run) return;
      var quick = quickMatches(ix, ws, q), arts = articleMatches(ix, ws, q);
      KINDS.forEach(function (k) {
        var rows = quick.filter(function (r) { return r[0] === k[0]; });
        if (!rows.length) return;
        var ul = el("ul", "ar-search__chips"); ul.setAttribute("role", "list");
        rows.slice(0, 60).forEach(function (r) {
          var li = el("li"), a = el("a", "", r[1]); a.href = r[2];
          if (r[3]) a.appendChild(el("span", "ar-search__note", " · " + r[3]));
          li.appendChild(a); ul.appendChild(li);
        });
        group(k[1], rows.length, ul);
      });
      var seen = {};
      arts.forEach(function (r) { seen[r[1]] = true; });
      if (arts.length) group("في العناوين والكُتَّاب والأقسام", arts.length, list(arts, function (r) { return articleItem(r, plain, null); }));
      status.textContent = (quick.length + arts.length) ? "" : "لا شيء في العناوين والأسماء.";
      textBlock(ix, ws, plain, seen, mine);
    }).catch(function () { status.textContent = "تعذّر تحميل فهرس البحث."; });
  }

  // the articles' text: on request (a button), or straight away once loaded in this visit
  function textBlock(ix, ws, plain, seen, mine) {
    var box = el("section", "ar-search__group ar-search__text"); out.appendChild(box);
    function go() {
      box.textContent = "";
      var h = el("h2", "ar-search__head", "في نصوص المقالات "), cnt = el("span", "ar-search__count", "…");
      h.appendChild(cnt); box.appendChild(h);
      var prog = el("p", "ar-search__progress"); box.appendChild(prog);
      var hits = [], ul = el("ul", "ar-search__list"); ul.setAttribute("role", "list"); box.appendChild(ul);
      var more = el("button", "hv-button-outline ar-search__more"); more.type = "button"; more.hidden = true; box.appendChild(more);
      var shown = 0;
      function show() {
        hits.slice(shown, shown + PAGE).forEach(function (i) { ul.appendChild(articleItem(ix.articles[i], plain, textState.raw[i])); });
        shown = Math.min(hits.length, shown + PAGE);
        more.hidden = shown >= hits.length; more.textContent = "المزيد (" + arNum(hits.length - shown) + ") ↓";
      }
      more.addEventListener("click", show);
      loadText(function (from, to, done, total) {          // called as each file arrives
        if (mine !== run) return false;
        for (var i = from; i < to; i++) if (!seen[ix.articles[i][1]] && hasAll(textState.texts[i], ws)) hits.push(i);
        cnt.textContent = arNum(hits.length);
        prog.textContent = done < total ? "يُحمَّل نص المقالات: " + arNum(Math.round(100 * done / total)) + "٪" : "";
        if (shown < PAGE) show();
        else { more.hidden = false; more.textContent = "المزيد (" + arNum(hits.length - shown) + ") ↓"; }
        if (done === total && !hits.length) prog.textContent = "لا شيء آخر في نصوص المقالات.";
        return true;
      });
    }
    if (textState && textState.complete) { go(); return; }
    getJSON(page.dataset.meta).then(function (meta) {
      if (mine !== run) return;
      var b = el("button", "hv-button-outline", "البحث في نصوص المقالات أيضًا");
      b.type = "button"; b.addEventListener("click", go);
      box.appendChild(b);
      box.appendChild(el("p", "ar-search__note", "يُحمَّل نص " + arNum(meta.articles) + " مقالًا (نحو " + arNum(meta.text_mb) + " ميغابايت) مرة واحدة في هذه الزيارة."));
    }).catch(function () {});
  }
  function loadText(each) {
    getJSON(page.dataset.meta).then(function (meta) {
      textState = textState || { texts: [], raw: [], loaded: {}, complete: false };
      var n = meta.chunks, done = 0;
      function step(c) {
        if (c >= n) return;
        var from = c * meta.chunk;
        var p = textState.loaded[c] ? Promise.resolve(null) : getJSON(page.dataset.text + c + ".json");
        p.then(function (rows) {
          if (rows) {
            rows.forEach(function (t, j) { textState.raw[from + j] = t; textState.texts[from + j] = norm(t); });
            textState.loaded[c] = true;
          }
          done++;
          if (done === n) textState.complete = true;
          if (each(from, Math.min(from + meta.chunk, meta.articles), done, n) !== false) step(c + 1);
        }).catch(function () { status.textContent = "تعذّر تحميل جزء من نصوص المقالات."; });
      }
      step(0);
    });
  }

  page.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname);
    search();
  });
  search();
})();
