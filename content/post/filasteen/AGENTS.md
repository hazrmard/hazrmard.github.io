# filasteen: an interactive geo-timeline post

`index.md` is a story page: placeholder narrative sections woven with
cut-backs to the timeline (`{{% story %}}`, `{{% cutback %}}`,
`{{% woven %}}`, shortcodes in `layouts/shortcodes/`). The story's own
moments are in `story.timeline`. See *Story pages* in
`geotimeline/README.md`.

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
  - `HUGO=… npm run e2e` runs the browser tests.

## Constraints

1. No build step and no server-side dependency. Hugo only adds the static
   fallback list.
2. Third-party code is pinned in `geotimeline/deps.js`.
3. Keep `.md` files out of the published data. Hugo does not publish `.md`
   inside a page bundle, so use `.timeline` / `.details`.
4. The renderer reads the host page's colour variables (`--bg`, `--text`, …)
   and must work in light and dark themes and at 375px width.
