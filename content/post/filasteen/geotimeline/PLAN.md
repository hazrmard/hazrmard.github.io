# geo-timeline: implementation plan

Working plan for rebuilding the `filasteen` post as a data-agnostic, static
"geo-timeline" renderer. Lives on branch `post/filasteen` (cut from `drafts`).
Remove this file as a clean-up right before merging.

## Decisions

| # | Question | Decision |
|---|---|---|
| D1 | Where the renderer lives | Inside the post folder (`content/post/filasteen/geotimeline/`). Promote to `static/` only if a second post uses it. |
| D2 | Default filter mode | `dim` (keeps chronology intact). Configurable via `options.filter_mode` and a toggle in the filter panel. Revisit after use. |
| D3 | Basemap / boundary data | Coastline-only basemap from Natural Earth (via `world-atlas`). Historical boundaries: proposals presented to the author when Phase 3 lands; nothing committed without a citation. |
| D4 | CDN vs vendored deps | Pinned CDN during development, self-host (`geotimeline/vendor/`) before publishing. |
| D5 | Review cadence | Run phases straight through. |

### Notes from the build environment

- jsdelivr's `+esm` endpoints cannot be verified from the build container, so
  `deps.js` references **raw npm files** on jsdelivr (`/npm/pkg@x.y.z/path`),
  which are byte-identical to the npm tarballs. Tests route those URLs to a
  local `npm install`. Self-hosting (D4) is then a straight copy.
- d3, Plot and topojson-client are loaded from their UMD builds (classic
  scripts, globals); js-yaml and marked from their ESM builds.

## Hugo constraints that shape the layout

- `content/post/filasteen/` is a leaf bundle. Other `.md` files inside it are
  **not published**, so event files use a `.timeline` extension (as `details/`
  already uses `.details`). YAML/CSV/GeoJSON are published as-is.
- The theme defines `--bg`, `--text`, `--c-*` on `:root` and redefines them for
  `[data-theme="dark"]`. Custom properties inherit into shadow DOM, so the
  component follows the theme by reading them with fallbacks.

## File layout

```
content/post/filasteen/
  index.md                     # {{< geotimeline src="timeline.yaml" >}}
  timeline.yaml                # manifest
  events/*.timeline            # event stream files, one per era
  details/*.details            # long-form details (kept)
  facets.yaml places.yaml periods.yaml sources.yaml series.yaml threads.yaml
  data/*.csv  geo/*.json
  geotimeline/
    geo-timeline.js  deps.js  state.js  styles.css  README.md
    model/{load,stream,dates,normalize,validate,query}.js
    views/{scroll,filters,globe,geo,charts,tracks,...}.js
layouts/shortcodes/geotimeline.html   # optional static fallback (SEO / no-JS)
tools/geotimeline/                    # dev-only: migrate.py, tests, e2e
```

## Data schema v1 (summary; full reference in `geotimeline/README.md`)

- **Manifest** `timeline.yaml`: `schema: 1`, `title`, `events: [paths]`,
  `facets|places|periods|sources|series|threads: path or inline`, `basemap`,
  `options {view, spacing, gap_marker, filter_mode, date_locale}`.
- **Event stream** `*.timeline`: alternating `---` YAML header / markdown body.
  A markdown horizontal rule must be `***`. Body: first `##` = title (unless
  `title:` given), first paragraph = summary, each `###` = collapsible section.
- **Event fields**: `when` (required: `1948`, `1948-04`, `1948-04-21`,
  `~1882`, `a/b`, `a/..`), `id`, `title`, `where` (place key(s), `{lat,lon}`,
  `{geo: file#id}`), any facet-group key, `threads`, `sources` (`key` or
  `{ref, at, quote}`), `data` (chart specs), `images`, `details`,
  `importance` (1–3), `draft`.
- **facets.yaml**: groups `{label, filter, badge, values: {key: {label, icon, color, parent}}}`.
- **places.yaml**: `{name, lat, lon | geo, parent, kind, region, names[]}`.
- **periods.yaml**: `[{id, label, when, color, boundaries[]}]` (replaces `bgRender`).
- **sources.yaml**: bibliography `{author, title, year, publisher, url}`.
- **threads.yaml**: `[{id, title, intro, events[] | match{}}]` (replaces `myth_*` tags).
- **series.yaml** + event `data`: `{mark: line|bar|area|dot|stat, title, table (inline CSV) | file | series, x, y, unit, sources}`.
- **Validation**: errors drop an event, warnings keep it; console always, on-page panel with `?debug`.

## Architecture

1. **load**: fetch manifest + includes in parallel, paths relative to manifest URL.
2. **model** (pure, DOM-free, node-tested): stream → dates → normalize → validate → query.
3. **state**: one store `{focusId, view, filters, query, filterMode, threadId, expanded}`, synced with URL hash.
4. **views**: scroll (focus line, ResizeObserver-driven gutter, period bands, gap markers),
   filters (counts, AND across / OR within groups, search, dim/hide),
   globe (d3-geo canvas, rotate + region zoom, period boundaries, reduced-motion),
   geo view + scrubber, charts (Plot, lazy), tracks (series strips).
5. **packaging**: `<geo-timeline src="timeline.yaml">` custom element, shadow DOM;
   light-DOM fallback content stays for SEO / no-JS.

## Phases

1. **Schema, model, migration**: model modules + node tests; `migrate.py`
   converts `data.json`/`taxonomies.json`; split into era files.
2. **Scroll view parity + bug fixes**: component, state, filters, gutter, shortcode;
   switch `index.md`; delete old app; schema README. Playwright checks.
3. **Globe**: basemaps, linked focus, rotate/zoom, clustering, reduced motion, mobile strip.
   Propose boundary sources (D3).
4. **Charts and tracks**: Plot wrapper, lazy CSV, series tracks.
5. **Geo-first view**: toggle, scrubber, side/bottom sheet, keyboard.
6. **Threads**: picker, step-through mode.
7. **Hardening**: a11y pass, 1k-event perf check, vendoring (D4), docs.

## Author-owned content work

Coordinates for unplaced events, `sources` for every event, cited boundary
GeoJSON (1920 Mandate, 1947 partition plan, 1949 armistice lines, depopulated
villages), and datasets for series tracks.

## Status

- [x] Phase 1
- [x] Phase 2
- [x] Phase 3 (boundary sources pending author decision, D3)
- [x] Phase 4
- [x] Phase 5
- [x] Phase 6
- [x] Phase 7 (vendored deps, axe audit clean, 1k-event check passes without virtualisation)
