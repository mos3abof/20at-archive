# أرشيف عشرينات · 20at archive (published site)

This repository is the **built** website served at <https://el20at.com>: the HTML, styles, scripts,
search files and media that Zola writes to `public/`. It isn't edited by hand, and nothing is built here.

- **Source:** the archive pipeline and the Zola project (templates, styles, scripts, theme, the
  article generator) live in the pipeline repository, under `website/`.
- **Updates:** every change arrives as a pull request opened from the pipeline repository with
  `make pr`. The site is rebuilt there, copied over this repository's files, and recorded as one
  jj change.
- **Deploy:** `.github/workflows/deploy.yml` checks each pull request: is it a full build, is it under
  GitHub Pages' 1 GB, and are there no stray Zola sources or oversized files? Every push to `main` is
  deployed to GitHub Pages as is.
- **Recordings:** the audio and video (≈450 MB) don't fit beside the site. They are assets of this
  repository's [`recordings` release](../../releases/tag/recordings), uploaded with `make recordings`,
  and the pages link to them there.

`README.md` and `.github/` come from `publish/` in the pipeline repository; edit them there.
