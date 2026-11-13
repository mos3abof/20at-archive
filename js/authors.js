// 20at archive, the writers' index (/authors/): filter the cards, and the folded list of all writers, as people
// type, matching Arabic letter variants (أ/ا، ى/ي، ة/ه) and ignoring vowel marks and tatweel.
(() => {
  const input = document.querySelector("[data-writer-filter]");
  const list = document.querySelector("[data-writer-list]");
  if (!input || !list) return;
  const none = document.querySelector("[data-writer-none]");
  const compact = document.querySelector("[data-writer-compact]");
  const norm = (s) => s.normalize("NFC").replace(/[\u064B-\u0670\u065F\u0640]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
  const items = [...list.children].map((li) => [li, norm((li.querySelector(".ar-author-card__name") || li).textContent)]);
  const rows = compact ? [...compact.children].map((li) => [li, norm((li.querySelector("a") || li).textContent)]) : [];
  input.addEventListener("input", () => {
    const q = norm(input.value);
    let shown = 0;
    for (const [li, name] of items) { const hit = !q || name.includes(q); li.hidden = !hit; shown += hit; }
    for (const [li, name] of rows) li.hidden = !!q && !name.includes(q);
    if (none) none.hidden = shown > 0;
  });
})();
