// 20at archive, the writers' index (/authors/): filter the cards as people type, matching Arabic letter
// variants (أ/ا، ى/ي، ة/ه) and ignoring vowel marks and tatweel.
(() => {
  const input = document.querySelector("[data-writer-filter]");
  const list = document.querySelector("[data-writer-list]");
  if (!input || !list) return;
  const none = document.querySelector("[data-writer-none]");
  const norm = (s) => s.normalize("NFC").replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim().toLowerCase();
  const items = [...list.children].map((li) => [li, norm((li.querySelector(".ar-author-card__name") || li).textContent)]);
  input.addEventListener("input", () => {
    const q = norm(input.value);
    let shown = 0;
    for (const [li, name] of items) { const hit = !q || name.includes(q); li.hidden = !hit; shown += hit; }
    if (none) none.hidden = shown > 0;
  });
})();
