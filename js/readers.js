// 20at archive, the readers' page (/readers/): look up a name and list every restored comment signed
// with it, each linking to its place under the article (#c-N). Data: search/readers.json, written by
// pipeline/site.py (write_readers): {a: [[title, url]], r: [[name, count, [[article, place, "YYYY-MM-DD"]]]]}.
// Names match whatever their spelling of hamza, taa marbuta, alef maqsura or vowel marks; a name that is
// the query itself comes first, then names that contain all its words.
(() => {
  const root = document.querySelector("[data-readers]");
  if (!root) return;
  const form = root.querySelector("form"), input = root.querySelector("#rd-q");
  const status = root.querySelector("[data-status]"), out = root.querySelector("[data-results]");
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const ar = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const date = (d) => ar(+d.slice(8, 10)) + " " + MONTHS[+d.slice(5, 7) - 1] + " " + ar(d.slice(0, 4));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const norm = (s) => s.toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")          // vowel marks, tatweel
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const MAX_NAMES = 30;
  let data = null;

  const load = async () => {
    if (data) return data;
    status.textContent = "جارٍ تحميل أسماء القرّاء…";
    const res = await fetch(root.dataset.src);
    if (!res.ok) throw new Error(res.status);
    const raw = await res.json();
    data = { a: raw.a, r: raw.r.map(([name, n, cs]) => ({ name, n, cs, key: norm(name) })) };
    return data;
  };

  const comments = (r) => "<ol class=\"ar-readers__comments\" role=\"list\">" + r.cs.map(([ai, place, d]) => {
    const [title, url] = data.a[ai];
    return `<li><a href="${esc(url)}#c-${place}">${esc(title)}</a> <span class="ar-search__meta">${date(d)}</span></li>`;
  }).join("") + "</ol>";

  const show = async (q) => {
    const want = norm(q);
    out.innerHTML = "";
    if (!want) { status.textContent = ""; return; }
    try { await load(); } catch { status.textContent = "تعذّر تحميل أسماء القرّاء."; return; }
    const words = want.split(" ");
    const exact = [], partial = [];
    for (const r of data.r) {
      if (r.key === want) exact.push(r);
      else if (words.every((w) => (" " + r.key + " ").includes(" " + w) )) partial.push(r);
    }
    const found = exact.concat(partial);
    if (!found.length) {
      status.textContent = `لا يوجد قارئ باسم «${q}» في التعليقات التي استعدناها.`;
      return;
    }
    const shown = found.slice(0, MAX_NAMES);
    status.textContent = found.length === 1 ? "" :
      `${ar(found.length)} اسمًا${found.length > MAX_NAMES ? `، أول ${ar(MAX_NAMES)} منها` : ""}`;
    out.innerHTML = shown.map((r, i) =>
      `<details class="ar-readers__one"${i === 0 && (exact.length || found.length === 1) ? " open" : ""}>` +
      `<summary><bdi class="ar-readers__name">${esc(r.name)}</bdi> <span class="ar-search__count">${ar(r.n)} تعليقًا</span></summary>` +
      comments(r) + "</details>").join("");
  };

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const q = input.value.trim();
    history.replaceState(null, "", q ? "?q=" + encodeURIComponent(q) : location.pathname);
    show(q);
  });
  // a regular's name in the list: look them up here rather than reloading
  root.querySelectorAll("[data-name]").forEach((a) => a.addEventListener("click", (ev) => {
    ev.preventDefault();
    input.value = a.dataset.name;
    form.requestSubmit();
    input.scrollIntoView({ block: "start", behavior: "smooth" });
  }));
  const q = new URLSearchParams(location.search).get("q");
  if (q) { input.value = q; show(q); }
})();
