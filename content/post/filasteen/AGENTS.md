# filasteen: an interactive geo-timeline post

`index.md` embeds `{{< geotimeline src="timeline.yaml" >}}` (shortcode in
`layouts/shortcodes/geotimeline.html`).

- **Data**: `timeline.yaml` and the files it lists (`events/*.timeline`,
  `facets.yaml`, `places.yaml`, `periods.yaml`, `sources.yaml`, `series.yaml`,
  `threads.yaml`, `details/`, `data/`, `geo/`).
- **Renderer**: `geotimeline/`. It is data-agnostic and must stay that way:
  nothing in it may refer to this post's content. The data schema is
  documented in `geotimeline/README.md`.
- **Dev tooling** (not published): `tools/geotimeline/`.
  - `npm install` once.
  - `npm test` runs the model unit tests.
  - `npm run check` validates the data.
  - `HUGO=… node --test e2e/*.test.mjs` runs the browser tests.

## Constraints

1. No build step and no server-side dependency. Hugo only adds the static
   fallback list.
2. Third-party code is pinned in `geotimeline/deps.js`.
3. Keep `.md` files out of the published data. Hugo does not publish `.md`
   inside a page bundle, so use `.timeline` / `.details`.
4. The renderer reads the host page's colour variables (`--bg`, `--text`, …)
   and must work in light and dark themes and at 375px width.
