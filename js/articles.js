// 20at archive, the articles library (/articles/, templates/articles.html): every article we restored, searched by
// title and writer, narrowed by site, section, year, month, writer and what it has (comments, a photo, a
// recording), sorted, shown as a list or as cards, a page at a time. Every choice is kept in the address
// (?sec=7ayatna&y=2006&sort=hot…) so a selection can be shared and other pages can link into one.
// Data: data/articles.json rows {d: "MM-DD", y, t, u, c: comments, s: section, a: writer, p: photo, e: excerpt,
// r: recording}; the sections' names, colours and sites from data/home.json (in the page).
(() => {
  const root = document.querySelector("[data-lib]");
  if (!root) return;
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
  const num = (n) => ar(Number(n).toLocaleString("en-US")).replace(/,/g, "٬");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => String(s || "").toLowerCase().replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").trim();
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const PER = 50;
  const $ = (sel) => root.querySelector(sel);
  const f = (name) => root.querySelector(`[data-f="${name}"]`);
  const metaEl = $("[data-lib-meta]");
  const sections = metaEl ? JSON.parse(metaEl.textContent) : [];
  const sec = Object.fromEntries(sections.map((s) => [s.slug, s]));
  const siteNames = Object.fromEntries([...f("site").options].filter((o) => o.value).map((o) => [o.value, o.textContent]));
  const siteOf = (slug) => (sec[slug] ? sec[slug].site : "20at");

  // the state, read from and written to the address
  const KEYS = ["q", "site", "sec", "y", "m", "w", "c", "p", "r", "sort", "view", "page"];
  const state = Object.fromEntries(KEYS.map((k) => [k, ""]));
  const params = new URLSearchParams(location.search);
  KEYS.forEach((k) => { if (params.has(k)) state[k] = params.get(k); });
  state.sort = state.sort || "new"; state.view = state.view || "list"; state.page = +state.page || 1;
  let seed = Math.random();
  const save = () => {
    const out = new URLSearchParams();
    KEYS.forEach((k) => { const v = state[k]; if (v && !(k === "sort" && v === "new") && !(k === "view" && v === "list") && !(k === "page" && +v === 1)) out.set(k, v); });
    const qs = out.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  };

  let rows = [];
  const list = $("[data-lib-list]"), countEl = $("[data-lib-count]"), chipsEl = $("[data-lib-chips]");
  const clearBtn = $("[data-lib-clear]"), yearsEl = $("[data-lib-years]"), pagerEl = $("[data-pager]");
  const shuffleBtn = $("[data-lib-shuffle]");

  // the filters, all but `skip` (the year chart counts everything but the year)
  const matches = (r, skip) => {
    const q = state._q;
    return (!q || r.key.includes(q))
      && (!state.site || r.site === state.site)
      && (!state.sec || r.s === state.sec)
      && (skip === "y" || !state.y || r.y === +state.y)
      && (!state.m || +r.d.slice(0, 2) === +state.m)
      && (!state._w || r.wkey.includes(state._w))
      && (!state.c || r.c > 0) && (!state.p || r.p) && (!state.r || r.r);
  };
  const rand = (u) => { let h = 0; for (const ch of u) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.sin(h + seed * 1e4); };
  const sorters = {
    new: (a, b) => b.y - a.y || b.d.localeCompare(a.d),
    old: (a, b) => a.y - b.y || a.d.localeCompare(b.d),
    hot: (a, b) => (b.c || 0) - (a.c || 0) || b.y - a.y,
    rand: (a, b) => rand(a.u) - rand(b.u),
  };

  const tag = (slug) => (sec[slug] ? `<a class="pg-tag" href="/sections/${esc(slug)}/" style="--ct: ${esc(sec[slug].text_colour)}">${esc(sec[slug].name)}</a>` : "");
  const date = (r) => `${ar(+r.d.slice(3))} ${MONTHS[+r.d.slice(0, 2) - 1]} ${ar(r.y)}`;
  const rowHtml = (r) => state.view === "cards"
    ? `<li class="lib-card">${r.p ? `<a class="lib-card__img" href="${esc(r.u)}"><img src="${esc(r.p)}" alt="" loading="lazy"></a>` : ""}
        <div class="lib-card__body">${tag(r.s)}<a class="lib-card__title" href="${esc(r.u)}">${esc(r.t)}</a>
        ${r.e ? `<p class="lib-card__ex">${esc(r.e)}</p>` : ""}
        <p class="lib-card__meta">${[r.a ? esc(r.a) : "", date(r), r.c ? ar(r.c) + " تعليقًا" : ""].filter(Boolean).join(" · ")}</p></div></li>`
    : `<li><span class="pg-list__date">${date(r)}</span><a class="pg-list__title" href="${esc(r.u)}">${esc(r.t)}</a>${tag(r.s)}
        <span class="pg-list__by">${esc(r.a || "")}</span><span class="pg-list__n">${r.c ? ar(r.c) + " تعليقًا" : ""}</span></li>`;

  const chips = () => {
    const c = [];
    if (state.q) c.push(["q", `«${state.q}»`]);
    if (state.site) c.push(["site", siteNames[state.site] || state.site]);
    if (state.sec) c.push(["sec", sec[state.sec] ? sec[state.sec].name : state.sec]);
    if (state.y) c.push(["y", ar(state.y)]);
    if (state.m) c.push(["m", MONTHS[+state.m - 1]]);
    if (state.w) c.push(["w", state.w]);
    if (state.c) c.push(["c", "فيها تعليقات"]);
    if (state.p) c.push(["p", "فيها صورة"]);
    if (state.r) c.push(["r", "فيها تسجيل"]);
    chipsEl.innerHTML = c.map(([k, label]) => `<li><button type="button" data-chip="${k}" aria-label="إزالة ${esc(label)}">${esc(label)} ×</button></li>`).join("");
    clearBtn.hidden = !c.length;
  };

  const render = (keepPage) => {
    state._q = norm(state.q); state._w = norm(state.w);
    if (!keepPage) state.page = 1;
    const found = rows.filter((r) => matches(r)).sort(sorters[state.sort] || sorters.new);
    // the year chart
    const byYear = {};
    for (const r of rows) if (matches(r, "y")) byYear[r.y] = (byYear[r.y] || 0) + 1;
    const peak = Math.max(1, ...Object.values(byYear));
    yearsEl.innerHTML = years.map((y) => `<button type="button" class="lib-years__y${+state.y === y ? " is-on" : ""}" data-year="${y}"${byYear[y] ? "" : " disabled"}>
      <span class="lib-years__bar" style="--h: ${Math.round(48 * (byYear[y] || 0) / peak)}px"></span><span>${ar(y)}</span><span class="lib-years__n">${byYear[y] ? num(byYear[y]) : "—"}</span></button>`).join("");
    // the page
    const pages = Math.max(1, Math.ceil(found.length / PER));
    state.page = Math.min(Math.max(1, state.page), pages);
    const slice = found.slice((state.page - 1) * PER, state.page * PER);
    list.className = state.view === "cards" ? "lib-cards" : "pg-list lib-list";
    list.innerHTML = slice.map(rowHtml).join("") || `<li class="pg-empty">لا مقالات تطابق هذا الاختيار.</li>`;
    countEl.textContent = found.length === rows.length ? `${num(rows.length)} مقالًا` : `${num(found.length)} من ${num(rows.length)} مقالًا`;
    pagerEl.hidden = pages < 2;
    pagerEl.querySelector("[data-page]").textContent = `صفحة ${ar(state.page)} من ${ar(pages)}`;
    pagerEl.querySelector("[data-prev]").disabled = state.page <= 1;
    pagerEl.querySelector("[data-next]").disabled = state.page >= pages;
    shuffleBtn.hidden = state.sort !== "rand";
    root.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    chips();
    save();
  };

  // the form, filled from the state and back
  let years = [];
  const fillSections = () => {
    const s = f("sec"), keep = state.sec;
    s.length = 1;
    sections.filter((x) => !state.site || x.site === state.site).sort((a, b) => b.count - a.count)
      .forEach((x) => s.add(new Option(`${x.name} (${ar(x.count)})`, x.slug)));
    s.value = sec[keep] && (!state.site || sec[keep].site === state.site) ? keep : "";
    state.sec = s.value;
  };
  const toForm = () => {
    f("q").value = state.q; f("site").value = state.site; fillSections(); f("y").value = state.y; f("m").value = state.m;
    f("w").value = state.w; f("c").checked = !!state.c; f("p").checked = !!state.p; f("r").checked = !!state.r; f("sort").value = state.sort;
  };
  const bind = (name, ev, read) => f(name).addEventListener(ev, () => { state[name] = read(f(name)); if (name === "site") fillSections(); render(); });
  ["q", "w"].forEach((n) => bind(n, "input", (el) => el.value.trim()));
  ["site", "sec", "y", "m"].forEach((n) => bind(n, "change", (el) => el.value));
  ["c", "p", "r"].forEach((n) => bind(n, "change", (el) => (el.checked ? "1" : "")));
  bind("sort", "change", (el) => el.value);
  root.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { state.view = b.dataset.view; render(true); }));
  shuffleBtn.addEventListener("click", () => { seed = Math.random(); render(); });
  chipsEl.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-chip]"); if (!b) return;
    state[b.dataset.chip] = ""; if (b.dataset.chip === "site") state.sec = ""; toForm(); render();
  });
  clearBtn.addEventListener("click", () => { ["q", "site", "sec", "y", "m", "w", "c", "p", "r"].forEach((k) => { state[k] = ""; }); toForm(); render(); });
  yearsEl.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-year]"); if (!b || b.disabled) return;
    state.y = state.y === b.dataset.year ? "" : b.dataset.year; f("y").value = state.y; render();
  });
  pagerEl.querySelector("[data-prev]").addEventListener("click", () => { state.page--; render(true); root.querySelector(".lib-bar").scrollIntoView({ block: "start" }); });
  pagerEl.querySelector("[data-next]").addEventListener("click", () => { state.page++; render(true); root.querySelector(".lib-bar").scrollIntoView({ block: "start" }); });

  fetch(root.dataset.src).then((r) => (r.ok ? r.json() : [])).then((data) => {
    if (!data.length) return;
    rows = data.map((r) => Object.assign(r, { key: norm(r.t + " " + (r.a || "")), wkey: norm(r.a || ""), site: siteOf(r.s) }));
    years = [...new Set(rows.map((r) => r.y))].sort((a, b) => a - b);
    years.forEach((y) => f("y").add(new Option(ar(y), y)));
    MONTHS.forEach((m, i) => f("m").add(new Option(m, i + 1)));
    const writers = [...new Set(rows.map((r) => r.a).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    $("#lib-writers").innerHTML = writers.map((w) => `<option value="${esc(w)}"></option>`).join("");
    $("[data-lib-total]").textContent = `${num(rows.length)} مقالًا`;
    toForm();
    $("[data-lib-fallback]").hidden = true;
    $("[data-lib-ui]").hidden = false;
    render(true);
  }).catch(() => {});
})();
