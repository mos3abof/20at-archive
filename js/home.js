// 20at archive, the home page (templates/index.html). Each part works on its own and the page reads fine
// without the script (the first pick, writers, sections and poll are in the HTML):
//   - the chart: a month's numbers on hover or focus; a click opens the month below the chart (/#m-2006-6
//     links to one); without the script a bar leads to its year in the archive;
//   - "where you left off" (kept by page.html in this browser only) and the random article;
//   - the pick of the day and the writer of the day: the same for everyone on a given day;
//   - "on this day", for any day and month;
//   - the writers: search, sort, and every writer a page at a time (data/writers.json);
//   - the sections of one site or all of them;
//   - the poll: a guess first, then how readers voted; the media: another at random.
(() => {
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
  const num = (n) => ar(Number(n).toLocaleString("en-US")).replace(/,/g, "٬");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => s.toLowerCase().replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").trim();
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const today = new Date();
  const dayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  const json = (el) => { try { return JSON.parse(el.textContent); } catch { return null; } };
  let articles = null;   // data/articles.json, shared by the chart's months, "on this day" and the random article
  const loadArticles = (src) => articles || (articles = fetch(src).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  const secmapEl = document.querySelector("[data-secmap]");
  const secmap = (secmapEl && json(secmapEl)) || {};
  const secTag = (slug) => {
    const s = secmap[slug];
    return s ? `<a class="hm-tag" href="/sections/${esc(slug)}/" style="--ct: ${esc(s[1])}">${esc(s[0])}</a>` : "";
  };

  // ---- the chart: a tooltip per month, and a click opens it below ------------------------------------
  const tl = document.querySelector("[data-tl]");
  if (tl) {
    const tip = tl.querySelector("[data-tip]");
    const box = tl.querySelector("[data-tl-month]");
    const bars = tl.querySelectorAll(".hm-tl__bar[data-month]");
    const show = (bar) => {
      const x = Math.min(88, Math.max(12, parseFloat(bar.dataset.x)));
      tip.innerHTML = `<strong>${esc(bar.dataset.label)}</strong><span>${bar.dataset.total} مقالًا · ${bar.dataset.said} تعليقًا</span><em>الضغط يعرض مقالاته</em>`;
      tip.style.insetInlineStart = x + "%";
      tip.style.bottom = (parseInt(bar.dataset.h, 10) + 10) + "px";
      tip.hidden = false;
    };
    const hide = () => { tip.hidden = true; };
    let open = null;
    const close = () => {
      if (open) open.classList.remove("is-on");
      open = null; box.hidden = true;
      history.replaceState(null, "", location.pathname + location.search);
    };
    const SHOW = 12;
    bars.forEach((bar) => {
      bar.addEventListener("mouseenter", () => show(bar));
      bar.addEventListener("focus", () => show(bar));
      bar.addEventListener("mouseleave", hide);
      bar.addEventListener("blur", hide);
      bar.setAttribute("aria-controls", "hm-month");
      bar.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if (open === bar) { close(); return; }
        if (open) open.classList.remove("is-on");
        open = bar; bar.classList.add("is-on");
        history.replaceState(null, "", "#m-" + bar.dataset.month);
        const [y, m] = bar.dataset.month.split("-").map(Number);
        const mm = String(m).padStart(2, "0");
        const rows = (await loadArticles(box.dataset.src)).filter((a) => a.y === y && a.d.startsWith(mm + "-"));
        if (open !== bar) return;
        rows.sort((a, b) => (b.c || 0) - (a.c || 0) || a.d.localeCompare(b.d));
        const items = rows.slice(0, SHOW).map((a) =>
          `<li><span class="hv-tl-month__day">${ar(+a.d.slice(3))}</span><a href="${esc(a.u)}">${esc(a.t)}</a>` +
          (a.c ? `<span class="hv-tl-month__n">${ar(a.c)} تعليقًا</span>` : "") + "</li>").join("");
        box.id = "hm-month";
        box.innerHTML = `<div class="hv-tl-month__head"><h2 class="hv-tl-month__title">${esc(bar.dataset.label)}</h2>` +
          `<span class="hv-tl-month__nums">${bar.dataset.total} مقالًا، ${bar.dataset.said} تعليقًا من القرّاء${rows.length > SHOW ? "، الأكثر نقاشًا أولًا" : ""}</span>` +
          `<button type="button" class="hv-tl-month__close">إغلاق</button></div>` +
          (items ? `<ol class="hv-tl-month__list">${items}</ol>` : "") +
          `<a class="hv-tl-month__more" href="${esc(box.dataset.archive)}#zt-year-${y}">كل مقالات ${ar(y)} في الأرشيف ←</a>`;
        box.hidden = false;
        box.querySelector(".hv-tl-month__close").addEventListener("click", () => { const b = open; close(); b && b.focus(); });
      });
    });
    document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && open) { const b = open; close(); b.focus(); } });
    const want = /^#m-(\d{4}-\d{1,2})$/.exec(location.hash);
    const bar = want && tl.querySelector(`.hm-tl__bar[data-month="${want[1]}"]`);
    if (bar) { bar.click(); box.scrollIntoView({ block: "center" }); }
  }

  // ---- where you left off; a random article ------------------------------------------------------------
  const last = document.querySelector("[data-last-read]");
  if (last) {
    try {
      const it = JSON.parse(localStorage.getItem("t9-last") || "null");
      if (it && it.t && it.u) { const a = last.querySelector("a"); a.textContent = it.t; a.href = it.u; last.hidden = false; }
    } catch { /* storage unavailable: nothing to show */ }
  }
  document.querySelectorAll(".hm [data-random]").forEach((a) => a.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const rows = await loadArticles(a.dataset.src);
    location.href = rows.length ? rows[Math.floor(Math.random() * rows.length)].u : a.href;
  }));

  // ---- the pick of the day ---------------------------------------------------------------------------------
  const pickBox = document.querySelector("[data-pick-day]");
  const picksEl = pickBox && pickBox.querySelector("[data-picks]");
  const picks = picksEl && json(picksEl);
  if (picks && picks.length) {
    const p = picks[dayIndex % picks.length];
    const f = (k) => pickBox.querySelector(`[data-f="${k}"]`);
    f("img").src = p.img;
    const sec = f("sec");
    sec.textContent = p.sec; sec.href = `/sections/${p.sec_slug}/`; sec.style.setProperty("--ct", p.colour); sec.hidden = !p.sec;
    f("title").textContent = p.t; f("title").href = p.u;
    f("ex").textContent = p.ex;
    f("by").textContent = p.by; f("sep").textContent = p.by ? " · " : "";
    f("date").textContent = p.date;
    f("more").href = p.u;
    f("quotebox").hidden = !p.quote;
    f("quote").textContent = `«${p.quote}»`;
    f("talk").href = p.u + "#s-comments-title";
    f("talk").innerHTML = `النقاش كاملًا: <bdi>${num(p.n)}</bdi> تعليقًا ←`;
    f("tmlabel").textContent = "يوم " + p.date;
  }

  // ---- on this day -----------------------------------------------------------------------------------------
  const otd = document.querySelector("[data-otd]");
  if (otd) {
    const dSel = otd.querySelector("[data-otd-d]"), mSel = otd.querySelector("[data-otd-m]");
    const list = otd.querySelector("[data-otd-list]"), more = otd.querySelector("[data-otd-more]");
    const label = otd.querySelector("[data-otd-day]");
    for (let d = 1; d <= 31; d++) dSel.add(new Option(ar(d), d));
    MONTHS.forEach((m, i) => mSel.add(new Option(m, i + 1)));
    dSel.value = today.getDate(); mSel.value = today.getMonth() + 1;
    const FIRST = 6;
    const render = async (all) => {
      const d = +dSel.value, m = +mSel.value;
      const key = String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      label.textContent = ar(d) + " " + MONTHS[m - 1];
      const rows = (await loadArticles(otd.dataset.src)).filter((a) => a.d === key)
        .sort((a, b) => a.y - b.y || (b.c || 0) - (a.c || 0));
      const shown = all ? rows : rows.slice(0, FIRST);
      list.innerHTML = shown.length ? shown.map((a) =>
        `<li><span class="hm-otd__year">${ar(a.y)}</span><span><a class="hm-otd__title" href="${esc(a.u)}">${esc(a.t)}</a>` +
        `<span class="hm-otd__meta">${secTag(a.s)} ${[a.a ? esc(a.a) : "", a.c ? ar(a.c) + " تعليقًا" : ""].filter(Boolean).join(" · ")}</span></span></li>`).join("")
        : `<li>لم نستعد مقالات نُشرت في هذا اليوم.</li>`;
      more.hidden = all || rows.length <= FIRST;
      more.textContent = `كل مقالات ${ar(d)} ${MONTHS[m - 1]} (${ar(rows.length)})`;
      otd.hidden = false;
    };
    dSel.addEventListener("change", () => render(false));
    mSel.addEventListener("change", () => render(false));
    more.addEventListener("click", () => render(true));
    render(false);
  }

  // ---- the writers -------------------------------------------------------------------------------------------
  const wBox = document.querySelector("[data-writers]");
  if (wBox) {
    const q = wBox.querySelector("[data-w-q]"), sortSel = wBox.querySelector("[data-w-sort]");
    const list = wBox.querySelector("[data-w-list]"), pager = wBox.querySelector("[data-w-pager]");
    const prev = wBox.querySelector("[data-w-prev]"), next = wBox.querySelector("[data-w-next]");
    const pageLabel = wBox.querySelector("[data-w-page]"), day = wBox.querySelector("[data-w-day]");
    const PER = 50;   // writers per page (the user's choice)
    let rows = [], page = 0;
    const sorters = {
      count: (a, b) => b[2] - a[2], comments: (a, b) => b[3] - a[3],
      alpha: (a, b) => a[0].localeCompare(b[0], "ar"), early: (a, b) => a[4] - b[4] || b[2] - a[2],
    };
    const render = () => {
      const want = norm(q.value);
      const found = rows.filter((r) => !want || r.key.includes(want)).sort(sorters[sortSel.value]);
      const pages = Math.max(1, Math.ceil(found.length / PER));
      page = Math.min(page, pages - 1);
      const byComments = sortSel.value === "comments";
      list.innerHTML = found.length ? found.slice(page * PER, page * PER + PER).map((r) =>
        `<li><a href="${esc(r[1])}">${esc(r[0])}</a><span>${byComments ? num(r[3]) + " تعليقًا" : num(r[2]) + " مقالًا"}</span></li>`).join("")
        : `<li class="hm-empty">لا اسم يطابق البحث.</li>`;
      pageLabel.textContent = found.length ? `صفحة ${ar(page + 1)} من ${ar(pages)}` : "";
      prev.disabled = page === 0; next.disabled = page >= pages - 1;
    };
    fetch(wBox.dataset.src).then((r) => (r.ok ? r.json() : [])).then((data) => {
      if (!data.length) return;
      rows = data.map((r) => Object.assign(r, { key: norm(r[0]) }));
      wBox.querySelector("[data-w-tools]").hidden = false;
      pager.hidden = false;
      render();
      // the writer of the day: one of the sixty most prolific, the same for everyone that day
      const w = data.slice(0, 60).sort((a, b) => b[2] - a[2])[dayIndex % Math.min(60, data.length)];
      day.innerHTML = `<span>اختيار اليوم من الكُتَّاب:</span> <a href="${esc(w[1])}"><strong>${esc(w[0])}</strong></a> · ` +
        `${num(w[2])} مقالًا، و${num(w[3])} تعليقًا من القرّاء` +
        (w[6] ? ` · الأكثر نقاشًا: <a href="${esc(w[6])}">${esc(w[5])}</a>` : "");
      day.hidden = false;
    }).catch(() => {});
    q.addEventListener("input", () => { page = 0; render(); });
    sortSel.addEventListener("change", () => { page = 0; render(); });
    prev.addEventListener("click", () => { page--; render(); });
    next.addEventListener("click", () => { page++; render(); });
  }

  // ---- the sections: one site, or all of them ----------------------------------------------------------------
  const secBox = document.querySelector("[data-sections]");
  if (secBox) {
    const sel = secBox.querySelector("[data-sec-site]");
    const apply = () => secBox.querySelectorAll("[data-site]").forEach((el) => {
      el.hidden = sel.value !== "all" && el.dataset.site !== sel.value;
    });
    secBox.querySelector("[data-sec-pick]").hidden = false;
    sel.addEventListener("change", apply);
    apply();
  }

  // ---- the poll: a guess, then the result ----------------------------------------------------------------------
  const pollBox = document.querySelector("[data-polls]");
  if (pollBox) {
    const polls = [...pollBox.querySelectorAll("[data-poll]")];
    const nextBtn = pollBox.querySelector("[data-poll-next]");
    let cur = -1;
    const ask = (i) => {
      polls.forEach((p, k) => { p.hidden = k !== i; });
      const p = polls[i], hint = p.querySelector("[data-hint]");
      const opts = [...p.querySelectorAll("li")];
      opts.forEach((li) => {
        li.classList.remove("is-mine", "is-top");
        li.querySelector("[data-opt]").hidden = false;
        li.querySelector("[data-res]").hidden = true;
      });
      hint.textContent = `هل يمكنك تخمين كيف صوّت ${hint.dataset.total} قارئًا وقارئة؟`;
      cur = i;
    };
    polls.forEach((p) => {
      const opts = [...p.querySelectorAll("li")];
      const top = opts.reduce((best, li) => (parseFloat(li.querySelector("i").style.inlineSize) > parseFloat(best.querySelector("i").style.inlineSize) ? li : best), opts[0]);
      opts.forEach((li) => li.querySelector("[data-opt]").addEventListener("click", () => {
        opts.forEach((o) => { o.querySelector("[data-opt]").hidden = true; o.querySelector("[data-res]").hidden = false; });
        li.classList.add("is-mine"); top.classList.add("is-top");
        p.querySelector("[data-hint]").textContent =
          `اختيارك «${li.querySelector("[data-label]").textContent}»، ومثله ${li.dataset.pctAr} من القرّاء.`;
      }));
    });
    nextBtn.hidden = polls.length < 2;
    nextBtn.addEventListener("click", () => {
      let i = cur;
      while (polls.length > 1 && i === cur) i = Math.floor(Math.random() * polls.length);
      ask(i);
    });
    ask(Math.floor(Math.random() * polls.length));
  }

  // ---- the media: one at random, and another ----------------------------------------------------------------------
  const mediaBox = document.querySelector("[data-media]");
  if (mediaBox) {
    const items = [...mediaBox.querySelectorAll("[data-media-one]")];
    const nextBtn = mediaBox.querySelector("[data-media-next]");
    let cur = -1;
    const show = (i) => {
      items.forEach((it, k) => {
        it.hidden = k !== i;
        if (k !== i) { const a = it.querySelector("audio"); if (a) a.pause(); }
      });
      cur = i;
    };
    nextBtn.hidden = items.length < 2;
    nextBtn.addEventListener("click", () => {
      let i = cur;
      while (items.length > 1 && i === cur) i = Math.floor(Math.random() * items.length);
      show(i);
    });
    if (items.length) show(Math.floor(Math.random() * items.length));
  }
})();
