// 20at archive: the writers' directory, a writer's page, a section's page and the archive page
// (templates/taxonomy_list.html, taxonomy_single.html, archive.html; styled in css/pages.css). Every list is
// in the HTML in full; this script lets readers search it, narrow it, sort it and page through it.
(() => {
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
  const num = (n) => ar(Number(n).toLocaleString("en-US")).replace(/,/g, "٬");
  const unar = (s) => String(s).replace(/[٠-٩]/g, (d) => AR.indexOf(d));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => s.toLowerCase().replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").trim();
  const press = (buttons, on) => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === on)));

  // a pager over an <ol>: shows `per` items at a time
  const pager = (nav, per) => {
    const prev = nav.querySelector("[data-prev]"), next = nav.querySelector("[data-next]"), label = nav.querySelector("[data-page]");
    let page = 0, total = 1, onTurn = () => {};
    prev.addEventListener("click", () => { page--; onTurn(); });
    next.addEventListener("click", () => { page++; onTurn(); });
    return {
      set(items, turn) {
        onTurn = turn; total = Math.max(1, Math.ceil(items / per)); page = Math.min(page, total - 1);
        label.textContent = items ? `صفحة ${ar(page + 1)} من ${ar(total)}` : "";
        prev.disabled = page === 0; next.disabled = page >= total - 1;
        nav.hidden = total < 2;
        return [page * per, page * per + per];
      },
      reset() { page = 0; },
    };
  };

  // ---- a writer's page and a section's page: every article, by year, searchable, sortable, paged ----------
  const lp = document.querySelector("[data-list-page]");
  if (lp) {
    const ol = lp.querySelector("[data-list]");
    const rows = [...ol.children].map((li) => ({ li, y: +li.dataset.y, d: li.dataset.d, n: +li.dataset.n, key: norm(li.textContent) }));
    const sortSel = lp.querySelector("[data-sort]"), search = lp.querySelector("[data-search]");
    const count = lp.querySelector("[data-list-count]");
    const yearButtons = [...lp.querySelectorAll("[data-year]")];
    const chips = [...lp.querySelectorAll("[data-year-chips] [data-year]")];
    const pg = pager(lp.querySelector("[data-pager]"), 30);
    let year = "";
    const render = () => {
      const q = search ? norm(search.value) : "";
      const sort = sortSel ? sortSel.value : "old";
      let found = rows.filter((r) => (!year || r.y === +year) && (!q || r.key.includes(q)));
      found = found.slice().sort(sort === "hot" ? (a, b) => b.n - a.n || a.d.localeCompare(b.d)
        : sort === "new" ? (a, b) => b.d.localeCompare(a.d) : (a, b) => a.d.localeCompare(b.d));
      const [from, to] = pg.set(found.length, render);
      ol.replaceChildren();
      let last = null;
      for (const r of found.slice(from, to)) {
        if (sort !== "hot" && r.y !== last) {   // a year heading wherever the year changes
          const h = document.createElement("li"); h.className = "pg-list__year"; h.textContent = ar(r.y);
          ol.append(h); last = r.y;
        }
        ol.append(r.li);
      }
      if (count) count.textContent = (year || q ? `${num(found.length)} من ${num(rows.length)}` : `${num(rows.length)} مقالًا`);
      yearButtons.forEach((b) => b.classList.toggle("is-on", b.dataset.year === year && year !== ""));
      press(chips, chips.find((c) => c.dataset.year === year));
    };
    yearButtons.forEach((b) => b.addEventListener("click", () => {
      year = (year === b.dataset.year && !b.closest("[data-year-chips]")) ? "" : b.dataset.year;
      pg.reset(); render();
      if (b.classList.contains("pg-bar")) lp.querySelector(".pg-all").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    if (sortSel) { sortSel.addEventListener("change", () => { pg.reset(); render(); }); lp.querySelector("[data-sort-wrap]").hidden = false; }
    if (search) { search.addEventListener("input", () => { pg.reset(); render(); }); lp.querySelector("[data-search-wrap]").hidden = false; }
    const chipRow = lp.querySelector("[data-year-chips]"); if (chipRow) chipRow.hidden = false;
    render();
    const share = lp.querySelector("[data-share]");
    if (share) share.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try { if (navigator.share) await navigator.share({ title: document.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); share.textContent = "نُسخ الرابط"; } } catch { /* cancelled */ }
    });
  }

  // ---- the writers' directory -----------------------------------------------------------------------------------
  const dir = document.querySelector("[data-dir]");
  if (dir) {
    const ol = dir.querySelector("[data-list]");
    const rows = [...ol.children].map((li) => ({
      li, name: li.querySelector("a").textContent, key: norm(li.querySelector("a").textContent),
      n: +li.dataset.n, c: +li.dataset.c, first: +unar(li.dataset.first || "9999"), l: li.dataset.l,
      meta: li.querySelector("[data-meta]"), metaC: li.querySelector("[data-meta-c]"),
    }));
    const search = dir.querySelector("[data-search]"), sortSel = dir.querySelector("[data-sort]");
    const sizes = [...dir.querySelectorAll("[data-size]")], letters = [...dir.querySelectorAll("[data-letter]")];
    const heading = dir.querySelector("[data-dir-heading]"), count = dir.querySelector("[data-list-count]");
    const pg = pager(dir.querySelector("[data-pager]"), 60);
    let size = "all", letter = "";
    const inSize = (n) => ({ all: true, many: n >= 10, some: n >= 2 && n < 10, one: n === 1 })[size];
    const sorters = { count: (a, b) => b.n - a.n, comments: (a, b) => b.c - a.c || b.n - a.n,
      alpha: (a, b) => a.name.localeCompare(b.name, "ar"), early: (a, b) => a.first - b.first || b.n - a.n };
    const render = () => {
      const q = norm(search.value);
      const found = rows.filter((r) => inSize(r.n) && (!letter || r.l === letter) && (!q || r.key.includes(q))).sort(sorters[sortSel.value]);
      const [from, to] = pg.set(found.length, render);
      const byC = sortSel.value === "comments";
      ol.replaceChildren(...found.slice(from, to).map((r) => { r.meta.hidden = byC; r.metaC.hidden = !byC; return r.li; }));
      if (!found.length) { const li = document.createElement("li"); li.className = "pg-empty"; li.textContent = "لا اسم يطابق البحث."; ol.append(li); }
      heading.textContent = letter ? `حرف ${letter}` : "كل الكُتَّاب";
      count.textContent = `${num(found.length)} اسمًا`;
    };
    search.addEventListener("input", () => { pg.reset(); render(); });
    sortSel.addEventListener("change", () => { pg.reset(); render(); });
    sizes.forEach((b) => b.addEventListener("click", () => { size = b.dataset.size; press(sizes, b); pg.reset(); render(); }));
    letters.forEach((b) => b.addEventListener("click", () => { letter = b.dataset.letter; press(letters, b); pg.reset(); render(); }));
    dir.querySelector("[data-dir-tools]").hidden = false;
    const lettersNav = dir.querySelector("[data-letters]"); if (lettersNav) lettersNav.hidden = false;
    render();
  }

  // ---- the archive: a calendar of months; one opens below ------------------------------------------------------
  const arch = document.querySelector("[data-archive]");
  if (arch) {
    const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const cells = [...arch.querySelectorAll(".pg-cal__cell[data-month]")];
    const period = arch.querySelector("[data-period]"), list = period.querySelector("[data-p-list]");
    const more = period.querySelector("[data-p-more]"), sortSel = period.querySelector("[data-p-sort]");
    const siteSel = arch.querySelector("[data-f-site]"), secSel = arch.querySelector("[data-f-sec]");
    const siteOf = {};
    if (secSel) [...secSel.options].forEach((o) => { if (o.value) siteOf[o.value] = o.dataset.site; });
    let rows = null, cur = null, all = false;
    const load = () => rows || (rows = fetch(arch.dataset.src).then((r) => (r.ok ? r.json() : [])).catch(() => []));
    const keep = (a) => (!secSel || !secSel.value || a.s === secSel.value) && (!siteSel || !siteSel.value || (siteOf[a.s] || "20at") === siteSel.value);
    const shade = (n) => (!n ? 0 : n < 60 ? 1 : n < 130 ? 2 : n < 220 ? 3 : 4);
    const filtered = async () => (await load()).filter(keep);
    // the calendar again for one site or section
    const recount = async () => {
      const fs = await filtered();
      const by = {}, years = {};
      for (const a of fs) { const k = a.y + "-" + +a.d.slice(0, 2); by[k] = (by[k] || 0) + 1; years[a.y] = (years[a.y] || 0) + 1; }
      for (const c of cells) {
        const n = by[c.dataset.month] || 0;
        c.className = `pg-cal__cell pg-cal__cell--${shade(n)}`; c.textContent = n ? ar(n) : "";
        c.setAttribute("aria-label", `${c.dataset.label}: ${ar(n)} مقالًا`);
      }
      arch.querySelectorAll("[data-total]").forEach((t) => { t.innerHTML = `<bdi>${num(years[t.dataset.total] || 0)}</bdi>`; });
      if (cur) open(cur);
    };
    const keys = cells.map((c) => c.dataset.month);
    const open = async (what, quiet) => {
      cur = what; all = false;
      const fs = await filtered();
      const isYear = what.startsWith("y");
      const [y, m] = what.slice(1).split("-").map(Number);
      const mm = String(m).padStart(2, "0");
      const sel = fs.filter((a) => a.y === y && (isYear || a.d.startsWith(mm + "-")));
      period.querySelector("[data-p-title]").textContent = isYear ? `سنة ${ar(y)}` : `${MONTHS[m - 1]} ${ar(y)}`;
      period.querySelector("[data-p-count]").textContent = `${num(sel.length)} مقالًا استعدناه`;
      const show = () => {
        const sorted = sel.slice().sort(sortSel.value === "day" ? (a, b) => a.d.localeCompare(b.d) : (a, b) => (b.c || 0) - (a.c || 0) || a.d.localeCompare(b.d));
        const LIMIT = isYear ? 40 : 30;
        list.innerHTML = sorted.slice(0, all ? sorted.length : LIMIT).map((a) =>
          `<li><span class="pg-plist__day">${isYear ? MONTHS[+a.d.slice(0, 2) - 1].slice(0, 3) + " " : ""}${ar(+a.d.slice(3))}</span><a href="${esc(a.u)}">${esc(a.t)}</a>` +
          `<span class="pg-plist__n">${a.c ? ar(a.c) + " تعليقًا" : ""}</span></li>`).join("") || "<li>لم نستعد مقالات من هذه الفترة.</li>";
        more.hidden = all || sorted.length <= LIMIT;
        more.textContent = `عرض كل المقالات (${num(sorted.length)})`;
      };
      sortSel.onchange = show; more.onclick = () => { all = true; show(); };
      show();
      const tm = period.querySelector("[data-p-tm]");
      tm.hidden = isYear;
      tm.href = arch.dataset.tm;
      cells.forEach((c) => c.classList.toggle("is-on", !isYear && c.dataset.month === `${y}-${m}`));
      period.hidden = false;
      if (!quiet) history.replaceState(null, "", isYear ? `#y-${y}` : `#m-${y}-${m}`);
    };
    const step = (dir) => {
      if (!cur || cur.startsWith("y")) { const ys = [...arch.querySelectorAll("[data-year]")].map((a) => +a.dataset.year); const y = cur ? +cur.slice(1) : ys[0]; const i = ys.indexOf(y) + dir; if (i >= 0 && i < ys.length) open("y" + ys[i]); return; }
      const i = keys.indexOf(cur.slice(1)) + dir;
      if (i >= 0 && i < keys.length) open("m" + keys[i]);
    };
    period.querySelector("[data-p-prev]").addEventListener("click", () => step(-1));
    period.querySelector("[data-p-next]").addEventListener("click", () => step(1));
    cells.forEach((c) => c.addEventListener("click", (ev) => { ev.preventDefault(); open("m" + c.dataset.month); period.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    arch.querySelectorAll(".pg-cal__year").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); open("y" + a.dataset.year); period.scrollIntoView({ behavior: "smooth", block: "start" }); }));
    if (siteSel) {
      arch.querySelector("[data-filters]").hidden = false;
      siteSel.addEventListener("change", () => {
        [...secSel.options].forEach((o) => { o.hidden = !!(o.value && siteSel.value && o.dataset.site !== siteSel.value); });
        if (secSel.selectedOptions[0] && secSel.selectedOptions[0].hidden) secSel.value = "";
        recount();
      });
      secSel.addEventListener("change", recount);
    }
    // arriving with #m-2006-6, #y-2006 or the older #zt-year-2006
    const h = location.hash;
    let want = /^#m-(\d{4}-\d{1,2})$/.exec(h);
    if (want) open("m" + want[1]);
    else if ((want = /^#(?:y|zt-year)-(\d{4})$/.exec(h))) open("y" + want[1]);
    else {   // by default: this month in the last full year of the archive
      const years = [...arch.querySelectorAll(".pg-cal__year")].map((a) => +a.dataset.year);
      const full = years.length > 1 ? years[years.length - 2] : years[0];
      if (full) open(`m${full}-${new Date().getMonth() + 1}`, true);
    }
  }
})();
