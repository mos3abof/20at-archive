// 20at archive, a section's page (/sections/<name>/): filter its articles by title, writer or summary as
// people type (Arabic letter variants أ/ا، ى/ي، ة/ه match; vowel marks and tatweel are ignored), hide the
// years with nothing left, and keep the year bar's counts in step.
(() => {
  const input = document.querySelector("[data-section-filter]");
  const list = document.querySelector("[data-section-list]");
  if (!input || !list) return;
  const none = document.querySelector("[data-section-none]");
  const count = document.querySelector("[data-section-count]");
  const digits = (n) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
  const years = [...list.querySelectorAll("[data-year]")].map((sec) => ({
    sec,
    link: document.querySelector(`[data-year-link="${sec.dataset.year}"]`),
    items: [...sec.querySelectorAll("li")].map((li) => [li, norm(li.textContent)]),
  }));
  let timer;
  const run = () => {
    const q = norm(input.value);
    let total = 0;
    for (const y of years) {
      let shown = 0;
      for (const [li, text] of y.items) { const hit = !q || text.includes(q); li.hidden = !hit; shown += hit; }
      y.sec.hidden = shown === 0;
      if (y.link) {
        y.link.hidden = shown === 0;
        const b = y.link.querySelector("bdi");
        if (b) b.textContent = digits(shown);
      }
      total += shown;
    }
    if (none) none.hidden = total > 0;
    if (count) { count.hidden = !q; count.textContent = q ? `${digits(total)} مقالًا` : ""; }
  };
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 120); });
})();
