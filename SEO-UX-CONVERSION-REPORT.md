# SEO, UI/UX & Conversion Audit — iahmed.me

**Site:** Ibrahim Ahmed's personal blog/portfolio (Hugo, custom `hugolb` theme, GitHub Pages)
**Audience goal:** technical peers, recruiters, collaborators
**Conversion goals:** grow social following, drive About-page reads, drive Résumé views
**Audit date:** 2026-07-18

---

## 1. Executive summary

The site is a well-organized, content-rich Hugo blog with solid foundations: clean per-page Open Graph/Twitter tags, canonical URLs, reading time, tables of contents, and a sensible content taxonomy. However, several issues actively undercut the three stated goals.

**The five things that matter most:**

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | **Analytics tag is outdated** — the page still hardcodes the deprecated `UA-…` tag. Data currently reaches your GA4 property only via Google's implicit "connected site tags" forwarding; embed the GA4 `G-…` ID directly so tracking doesn't depend on the legacy tag. | Medium | S |
| 2 | **The Résumé page is invisible to search engines and LLMs.** It's an AngularJS 1.3 SPA that fetches JSON client-side; crawlers see an empty `<div>`. Your single most important conversion page has no indexable text and no PDF. | Critical | M |
| 3 | **No structured data (JSON-LD).** No `Person`, `Article`, or `BreadcrumbList` schema. You are not eligible for Google knowledge-panel / rich results, and LLM/AI answer engines can't reliably attribute your work. | High | M |
| 4 | **Conversion dead-ends.** Social links open in the same tab (visitor leaves and doesn't come back), have no `alt`/`aria-label`, and there's no contact method, RSS/subscribe CTA, or "hire me" path anywhere. | High | S–M |
| 5 | **No favicon, no dark mode, no on-site search, thin mobile CSS.** Basic polish that a technical audience notices by its absence. | Medium | M |

None of these are structural rewrites. The theme is small and readable; every fix below is scoped to specific files.

---

## 2. SEO findings

### 2.1 Critical

**S2 — Résumé is not indexable.**
`themes/hugolb/layouts/resume/resume.html` + `themes/hugolb/static/js/resume.js` render the résumé via AngularJS 1.3.15 (2015, EOL) calling `$http.get(resume.json).success(...)`. Crawlers and AI answer engines get an empty container. Additional problems:
- AngularJS 1.3 is end-of-life with known XSS/security issues and `.success()` is a removed API pattern.
- If the Google CDN copy of AngularJS ever fails to load, the page is blank.
- A downloadable PDF résumé exists via the `pdf_link` field in `static/resume.json` (a Google Drive link). **Keep this link** — surface it as a clear "Download PDF" button on the server-rendered page.
→ Render `resume.json` **server-side in Hugo templates** so the HTML ships fully populated; keep the JSON as the single source of truth. Add a linked PDF. See plan item **B**.

### 2.2 High

**S3 — No structured data.** No JSON-LD anywhere (`grep` of `layouts/` returns nothing for `schema.org`/`ld+json`). Add:
- `Person` schema on home + About (name, `sameAs` social profiles, `jobTitle`, `alumniOf`, `knowsAbout`).
- `Article`/`BlogPosting` schema on posts (headline, datePublished, dateModified, author, image).
- `BreadcrumbList` schema (you already render visual breadcrumbs in `partials/breadcrumbs.html` — mark them up too).

**S4 — No `robots.txt` and no sitemap discovery.** Hugo emits `sitemap.xml` by default, but `robots.txt` is not generated unless enabled, and nothing points crawlers to the sitemap.
→ Set `enableRobotsTXT = true` in `hugo.toml` and add a `robots.txt` referencing the sitemap.

**S5 — No RSS auto-discovery.** Hugo generates `index.xml`, but `<head>` has no `<link rel="alternate" type="application/rss+xml">`, so browsers/readers can't discover the feed. This also directly hurts goal #1 (following) — RSS is how technical audiences subscribe. Add the discovery link (`meta_header.html`) and a visible "Subscribe" affordance.

**S6 — No `<meta name="author">`.** Add site-wide author meta for SEO and content attribution.

### 2.3 Medium

**S1 — Analytics tag references the deprecated UA property.** `themes/hugolb/layouts/partials/header.html:11-18` still loads `gtag.js?id=UA-118761164-1` and calls `gtag('config', 'UA-118761164-1')`. Data does reach your GA4 property (you see live traffic) — almost certainly via Google's server-side **"connected site tags"** forwarding, which maps the legacy UA tag to GA4. This works today but is implicit and fragile: it depends on the deprecated tag and on Google continuing to honor the forwarding mapping.
→ Make the setup explicit: replace the UA snippet with the GA4 measurement ID directly (`gtag.js?id=G-…` + `gtag('config', 'G-…')`), move the ID into `hugo.toml [params]`, and guard it to production only. See plan item **A**.

**S7 — Non-ASCII slug.** `content/post/2016-04-29-markov-chains.md` sets `slug: markov-chains-–-random-text-generation` (contains an en-dash `–`). This produces a percent-encoded, ugly, hard-to-share URL. Replace with `markov-chains-random-text-generation` and add a redirect/alias.

**S8 — Render-blocking third-party requests.** `<head>` loads Google Fonts (render-blocking + GDPR/privacy exposure), and posts pull KaTeX, AngularJS, and numjs from CDNs. Consider self-hosting fonts (`hugo_stats`/`resources` pipeline) and adding `font-display: swap`. Lower priority but affects LCP and privacy.

**S9 — OG image path resolution.** `meta.html` handles several image-path shapes, but posts using relative `image = "static/icon.png"` (e.g. `uav-physics`) rely on the fallback branch. Verify each post's OG image resolves to an **absolute** URL when the page is scraped (test with the LinkedIn Post Inspector / X card validator). Ensure sane default OG images exist for the home and About pages (currently the home page has no explicit share image).

**S10 — Title/description hygiene.** Titles are brand-prefixed (`Ibrahim Ahmed: {Title}`) which is fine. But several posts have empty `description = ""` (e.g. markov), falling back to a truncated summary. Audit descriptions across `content/post/*` and `content/project/*` — hand-written 120–160-char descriptions materially improve click-through.

---

## 3. UI/UX findings

**U1 — No favicon / touch icon / web manifest.** `grep` of `layouts/` finds none. Every browser tab and bookmark shows a blank icon. Add `favicon.ico`, `apple-touch-icon.png`, SVG favicon, and a minimal `site.webmanifest`.

**U2 — No dark mode.** Code highlighting is locked to `solarized-light` (`hugo.toml:96`); there is one light theme only. A technical audience strongly expects dark mode. Add a CSS-variable-based theme with `prefers-color-scheme` support and a toggle, plus a dark code-highlight style.

**U3 — No on-site search.** With 35 posts + 18 projects + notes across 5 subsections, there's no way to search. Add a client-side search (Fuse.js over a Hugo-generated JSON index, or Pagefind — zero-config, works great with static Hugo).

**U4 — Weak homepage hook.** `layouts/index.html` shows only the News feed. It doesn't surface latest posts or featured projects, the splash subheading is empty (`splashSubheading = ""` in `hugo.toml`), and there's no one-line value proposition. First-time visitors get no "here's what I do / here's my best work" signal. Add a tagline and a "Latest posts" / "Featured projects" strip.

**U5 — Accessibility gaps on icon links.** Social/link icons render as `<img src="{{.image}}"/>` with **no `alt`** in `partials/topbar.html:8`, `partials/footer.html`, and `layouts/index.html:10`. Screen readers and crawlers can't identify them. Add `alt`/`aria-label` (e.g. "GitHub", "LinkedIn"). The menu images already do this correctly (`topbar.html:19`) — mirror that.

**U6 — Thin responsive coverage.** Only 3 `@media` queries exist across all CSS (`splash.css`, `hugolb.css`). Audit key breakpoints (post body line-length, code block overflow, résumé, tables) on real mobile widths. Ensure wide content (code, math, tables) scrolls within its container rather than breaking the layout.

**U7 — Minimal 404 page.** `layouts/404.html` renders only "Link does not exist." Add helpful navigation: search box, links to Posts/Projects/About, and popular content.

**U8 — No related/next-read surfacing.** `single_navigation.html` only does chronological prev/next within a section. Add topically related posts (by shared tags/categories) to keep readers on-site — directly supports engagement and repeat visits.

---

## 4. Conversion findings (following, About, Résumé)

**C1 — Social links leak visitors and are unlabeled.** In `index.html`, `topbar.html`, `footer.html` the social `<a>` tags:
- have no `target="_blank"` / `rel="noopener noreferrer"` — clicking GitHub/LinkedIn navigates the visitor **away** from your site;
- have no `aria-label`/`alt`;
- are not framed as a call to action ("Follow me on…").
→ Open social profiles in a new tab, label them, and add a clear "Let's connect" block. See plan item **G**.

**C2 — No contact path.** There is no email link, contact form, or "get in touch" anywhere prominent. For a recruiter or collaborator this is a hard dead-end. Add a visible contact affordance (obfuscated `mailto:` and/or a simple form via Formspree/Web3Forms, since GitHub Pages is static).

**C3 — No subscribe / follow-on-site mechanism.** Nothing invites visitors to subscribe (RSS, or an email list via Buttondown/Substack embed). This is the single biggest lever for goal #1 (growing a following) and it's currently absent. Add a subscribe CTA at the end of each post and on the homepage.

**C4 — Résumé conversion problems** (beyond the SEO issue S2):
- The Google Drive PDF link (`pdf_link` in `resume.json`) is present but not surfaced as a prominent "Download PDF" button — make it obvious.
- Fragile client-side render; a CDN hiccup shows a blank page to the exact audience you most want to impress.
- No "contact / LinkedIn" CTA on the résumé page itself.

**C5 — About page conversion gaps.** `content/about/_index.md` is a strong narrative, but:
- Key credibility links (PhD thesis) point to **Google Drive** (`drive.google.com/file/…`) — fragile, no preview, feels ad-hoc. Host the thesis PDF on the site.
- No headshot / professional photo (adds trust and memorability).
- No explicit CTA ("Read my résumé", "See my projects", "Get in touch") to route engaged readers toward conversion.
- News/achievements (Google role, talks, publications) are great social proof but live only on the homepage feed — surface a condensed version on About too.

**C6 — News feed underused as social proof.** `content/about/news.md` is excellent (Google role, conference talks, publications) but is only injected into the homepage. Consider a dedicated, linkable `/news` or "Talks & Publications" page for sharing and SEO.

---

## 5. What's already good (keep it)

- Per-page Open Graph + Twitter Card tags with sensible fallbacks (`partials/seo.html`).
- Canonical URLs on every page.
- Reading time, last-modified via `enableGitInfo`, tables of contents, tag/category taxonomies.
- Clean, self-contained post-directory convention; no JS build step.
- Semantic content model (posts / notes / projects / about / résumé).
- Description truncation and whitespace normalization in the meta partial.

---

## 6. Enhancement plan (developer hand-off)

Ordered by impact-to-effort. Effort: **S** ≈ <1h, **M** ≈ 1–4h, **L** ≈ >4h. Each item lists the files to touch.

### Phase 1 — Critical fixes (do first)

**A. Point the analytics tag at GA4 directly** · S · `themes/hugolb/layouts/partials/header.html:11-18`
- Data already flows to GA4 via Google's implicit UA→GA4 "connected site tags" forwarding; this makes it explicit and removes the dependency on the deprecated tag.
- Replace the `UA-118761164-1` snippet with the GA4 measurement ID (`gtag.js?id=G-…` + `gtag('config', 'G-…')`). Find the `G-…` ID under GA4 Admin → Data Streams.
- Move the ID into `hugo.toml [params]` (e.g. `analyticsID`) and guard it so it only loads in production (`hugo.IsProduction`).
- Optional: consider a privacy-first alternative (Plausible / Umami / Cloudflare Web Analytics) — no cookie banner, GDPR-friendly.

**B. Server-render the résumé** · M · `themes/hugolb/layouts/resume/resume.html`, new `partials/resume/*.html`, `hugo.toml`
- Load `static/resume.json` via Hugo's `resources.Get`/`transform.Unmarshal` (or `site.Data` if moved to `data/resume.json`) and render sections in Go templates so the HTML ships fully populated.
- Delete the AngularJS dependency (`header.html:53-58`) and `static/js/resume.js`.
- Keep `resume.json` as the single source of truth.
- Surface the existing `pdf_link` (Google Drive) from `resume.json` as a prominent "Download PDF" button — the link persists as-is.
- Add a Résumé-specific `Person`/`ProfilePage` JSON-LD block.

**C. Add JSON-LD structured data** · M · new `partials/schema.html`, wired into `header.html`
- `Person` (home + About): `name`, `url`, `image`, `jobTitle`, `sameAs` (LinkedIn, GitHub, Scholar, X), `knowsAbout`, `alumniOf`.
- `BlogPosting` on posts: headline, `datePublished`, `dateModified`, author, `image`, `mainEntityOfPage`.
- `BreadcrumbList` from the same data as `partials/breadcrumbs.html`.

### Phase 2 — SEO & discoverability

**D. robots.txt + sitemap + RSS discovery** · S · `hugo.toml`, new `layouts/robots.txt`, `partials/meta_header.html`
- `enableRobotsTXT = true`; template a `robots.txt` that references `{{ .Site.BaseURL }}sitemap.xml`.
- Add `<link rel="alternate" type="application/rss+xml" title="Ibrahim Ahmed" href="/index.xml">` to `<head>`.
- Add `<meta name="author" content="Ibrahim Ahmed">`.

**E. Favicon + web manifest** · S · `static/`, `header.html`
- Generate `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180×180), `site.webmanifest`; add the `<link>`/`<meta name="theme-color">` tags.

**F. Content SEO cleanup** · M · `content/post/*`, `content/project/*`
- Fix the en-dash slug in the markov post; add an `aliases` entry for the old URL.
- Write hand-crafted 120–160-char `description` for every post/project missing one.
- Verify OG images resolve to absolute URLs (test in X/LinkedIn validators); set an explicit home + About share image.

### Phase 3 — Conversion

**G. Fix and elevate social/contact CTAs** · S–M · `index.html`, `topbar.html`, `footer.html`, About
- Add `target="_blank" rel="noopener noreferrer"` and `aria-label` to every social link.
- Add a "Let's connect / Follow me" block (home + end of posts + About).
- Add a contact method: obfuscated `mailto:` and/or a static-friendly form (Formspree/Web3Forms).

**H. Subscribe mechanism** · M · new partial, wired into `single.html` + `index.html`
- Visible RSS subscribe button + optional email list (Buttondown/Substack embed).
- Add an end-of-post CTA partial ("Enjoyed this? Subscribe / follow on X / read my résumé").

**I. About & Résumé conversion polish** · M · `content/about/_index.md`, résumé templates
- Self-host the PhD thesis PDF (replace the Google Drive link).
- Add a headshot to About.
- Add explicit CTAs (Résumé / Projects / Contact) to About; add a contact/LinkedIn CTA to the résumé page.

### Phase 4 — UI/UX polish

**J. Dark mode** · M · `hugolb.css`/`cosmetic.css` → CSS variables, `header.html` toggle, `hugo.toml` highlight
- CSS-variable theming with `prefers-color-scheme` + a persisted toggle; add a dark code-highlight style alongside `solarized-light`.

**K. On-site search** · M · Pagefind (recommended) or Fuse.js + Hugo JSON index
- Pagefind integrates with the Hugo build with near-zero config and no server.

**L. Homepage hook + related posts + 404** · M
- Homepage: add a tagline (`splashSubheading`), "Latest posts", and "Featured projects".
- `single_navigation.html`: add tag/category-based related posts.
- `404.html`: add search + navigation to key sections.

**M. Responsive & a11y audit** · M · CSS
- Add/verify breakpoints; ensure code/math/tables scroll within their container on mobile; run Lighthouse + axe and fix flagged issues.

---

## 7. Suggested sequencing

1. **Week 1 (highest ROI):** A (analytics), D (robots/RSS/author), E (favicon), G (social/contact) — mostly small, immediate wins.
2. **Week 2:** B (résumé SSR + PDF), C (JSON-LD) — the two biggest SEO/credibility unlocks.
3. **Week 3:** F (content SEO), H (subscribe), I (About/résumé polish).
4. **Backlog:** J (dark mode), K (search), L (homepage/related/404), M (responsive/a11y), S8 (self-host fonts).

## 8. How to verify after each phase

- **SEO:** Google Rich Results Test (JSON-LD), Search Console (sitemap submission, coverage), `curl` the résumé URL and confirm résumé text is in the HTML source.
- **Social:** LinkedIn Post Inspector + X Card Validator on home, About, résumé, and a sample post.
- **Perf/a11y:** Lighthouse (mobile) targeting ≥95 SEO / ≥90 Best Practices / ≥90 a11y; axe DevTools for the icon-label fixes.
- **Analytics:** after switching to the `G-…` tag, confirm real-time events register directly in the GA4 property (not just via the legacy forwarding).
