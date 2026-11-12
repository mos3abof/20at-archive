// 20at archive, home page: "في مثل هذا اليوم" — for every year in the archive, one random article
// published on today's day and month (or, failing that, the nearest days, up to two weeks away);
// "اختيار آخر" picks again; arrow buttons move the ribbon a card at a time (right to left in Arabic).
// Also "مقال عشوائي": a random article. Data: data/articles.json ([{d: "MM-DD", y, t: title, u: url}],
// written by pipeline/site.py). The section stays hidden if the script or the data can't load.
(async () => {
  const box = document.querySelector("[data-otd]");
  if (!box) return;
  let data;
  try {
    const res = await fetch(box.dataset.src);
    if (!res.ok) return;
    data = await res.json();
  } catch { return; }
  if (!Array.isArray(data) || data.length === 0) return;

  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const ar = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);  // Arabic-Indic digits
  const MAX_DAYS = 14;

  // day of the year (on a non-leap calendar) for "MM-DD", and the distance between two, around the year end
  const DAYS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const doy = (md) => DAYS[+md.slice(0, 2) - 1] + +md.slice(3, 5);
  const dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, 365 - d); };
  const today = new Date();
  const todayDoy = DAYS[today.getMonth()] + today.getDate();

  // per year, the articles sorted by how close their day is to today's
  const byYear = new Map();
  for (const a of data) {
    const k = dist(doy(a.d), todayDoy);
    if (k > MAX_DAYS) continue;
    if (!byYear.has(a.y)) byYear.set(a.y, []);
    byYear.get(a.y).push({ ...a, k });
  }
  const years = [...byYear.keys()].sort((x, y) => x - y);  // oldest first: the ribbon reads like a timeline

  const list = box.querySelector(".hv-ribbon");
  const label = (a) => `${ar(+a.d.slice(3, 5))} ${months[+a.d.slice(0, 2) - 1]} ${ar(a.y)}`;
  const pick = () => {
    list.replaceChildren();
    for (const y of years) {
      const items = byYear.get(y);
      const best = Math.min(...items.map((a) => a.k));
      const closest = items.filter((a) => a.k === best);   // the nearest day that year…
      const a = closest[Math.floor(Math.random() * closest.length)];  // …and a random article from it
      const li = document.createElement("li");
      const year = document.createElement("span");
      year.className = "hv-ribbon__year";
      year.textContent = ar(y);
      const link = document.createElement("a");
      link.href = a.u;
      link.textContent = a.t;
      const when = document.createElement("span");
      when.className = "hv-ribbon__date";
      when.textContent = a.k === 0 ? label(a) : `${label(a)} (أقرب يوم)`;
      li.append(year, link, when);
      list.append(li);
    }
    list.scrollTo({ left: 0 });
    update();
  };
  box.querySelector(".t9-otd__day").textContent = `(${ar(today.getDate())} ${months[today.getMonth()]})`;

  // arrows: one card at a time; in a right-to-left page, "next" moves toward the left
  const rtl = getComputedStyle(list).direction === "rtl";
  const back = box.querySelector('[data-ribbon="back"]');
  const next = box.querySelector('[data-ribbon="next"]');
  const step = () => (list.firstElementChild?.getBoundingClientRect().width || 200) + 12;
  const move = (dir) => list.scrollBy({ left: dir * (rtl ? -1 : 1) * step(), behavior: "smooth" });
  const update = () => {
    const max = list.scrollWidth - list.clientWidth;
    const pos = Math.abs(list.scrollLeft);  // RTL scroll positions are negative
    const scrolls = max > 2;
    back.hidden = next.hidden = !scrolls;
    back.disabled = pos <= 2;
    next.disabled = pos >= max - 2;
  };
  back.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  list.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
  addEventListener("resize", update);
  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); move(rtl ? 1 : -1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(rtl ? -1 : 1); }
  });

  if (years.length) {
    pick();
    box.querySelector("[data-reshuffle]").addEventListener("click", pick);
  } else {
    box.querySelector(".hv-ribbon-wrap").remove();
    box.querySelector("[data-reshuffle]").remove();
  }
  box.querySelector("[data-random]").addEventListener("click", (e) => {
    e.preventDefault();
    location.href = data[Math.floor(Math.random() * data.length)].u;
  });
  box.hidden = false;
  update();
})();

// "كل الكتّاب": filter the list as people type, matching Arabic letter variants (أ/ا، ى/ي، ة/ه) and
// ignoring vowel marks and tatweel.
(() => {
  const input = document.querySelector("[data-writer-filter]");
  const list = document.querySelector("[data-writer-list]");
  if (!input || !list) return;
  const none = document.querySelector("[data-writer-none]");
  const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
  const items = [...list.children].map((li) => [li, norm(li.querySelector("a")?.textContent || li.textContent)]);
  input.addEventListener("input", () => {
    const q = norm(input.value);
    let shown = 0;
    for (const [li, name] of items) { const hit = !q || name.includes(q); li.hidden = !hit; shown += hit; }
    if (none) none.hidden = shown > 0;
  });
})();
