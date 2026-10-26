# geo-timeline

A static, data-agnostic renderer for timelines with places, facets, periods,
sources and charts. It is a custom element:

```html
<geo-timeline src="timeline.yaml"></geo-timeline>
<script type="module" src="geotimeline/geo-timeline.js"></script>
```

In a Hugo page bundle, `{{< geotimeline src="timeline.yaml" >}}` emits the
same markup plus a plain list of every event inside the element, for readers
without JavaScript and for search engines. The renderer does not need Hugo.

- No build step. Dependencies are pinned in `deps.js` and self-hosted under
  `vendor/` (each with its licence). The page makes no third-party requests.
- Validate data from the command line:
  `node tools/geotimeline/check.mjs content/post/filasteen/timeline.yaml --info`
  (run `npm install` in `tools/geotimeline` once).
- On the page, `?debug` lists diagnostics and `?drafts` shows draft events.
- Views: a scrolling list with a backdrop globe (default), and a map view
  (List/Map switch, or `v=geo`) with a time scrubber; arrow keys step
  through events there and Escape returns to the list.
- State is kept in the URL hash: `#e=<event id>&v=geo&q=<search>&f.<group>=a,b&t=<thread>&m=hide&s=scaled`.

## Story pages

A narrative post can cut back to a timeline and converge on the present
(`story.js`, `<geo-story>`). In Hugo:

```markdown
+++
[geotimeline]
src = "/post/filasteen/timeline.yaml"   # or a resource of this bundle
now = "2023-10-07"                      # the story's present
modes = ["woven", "story", "timeline"]  # which readings to offer, in this order
default = "woven"
converge = true                         # `register: story` events join the timeline
cutback_stubs = true                    # story mode leaves a one-line marker per cut-back
events = ["story.timeline"]             # the story's own events, in this bundle
+++

{{% story %}}

## Rafah, October 2023 {data-where="31.2969,34.2455" data-name="Rafah" data-region="levant" data-when="2023-10-09"}

Prose. A link like [Jaffa](#e=<event id>) shows that event's card.

{{% woven %}}Bridging text, shown only in the woven reading.{{% /woven %}}

{{% cutback from="1878" to="1917" title="Before the Mandate" max=8 %}}

## South {data-when="2023-10-28"}

{{% cutback from="1949" to="now" converge=true %}}

{{% /story %}}
```

Use the `{{% %}}` form for all three shortcodes, and put each cut-back on a
line of its own. With `{{< >}}`, Hugo wraps the element in a paragraph and
the browser moves its fallback list out of it.

- **Story sections.** A heading with `data-where` and/or `data-when` starts a
  story section; the prose up to the next such heading or cut-back belongs to
  it.
  - `data-where` is a place key, several keys separated by commas, or
    `"lat,lon"` with `data-name` (and optionally `data-region` to zoom).
  - A heading that gives only a place or only a date keeps the other from the
    previous section.
  - While a story section is under the reader, the globe holds on its place,
    dimmed and kept out from behind the prose. On phones the map strip steps
    aside.
- **Cut-backs.** Each selects events by:
  - `from` / `to`: dates at any precision. `to` includes all of its year or
    month. `to="now"` is open-ended.
  - `thread="id"`: the thread's own order.
  - `events="id, id"`: that order.
  - any facet group, e.g. `actors="haganah,uk"`.

  Other attributes:
  - `max` caps the events shown inline: the most important first, then an
    even spread. A "See all" button (labelled by `more`) opens the rest in the
    timeline.
  - `converge` adds the story's own events (needs `converge = true` on the
    page).
- **Readings.** The switch in the sticky ribbon (also `#r=story` /
  `#r=timeline` in the URL; the reader's choice is remembered):
  - *woven*: prose and cut-backs.
  - *story*: prose only; cut-backs become one-line stubs that open in place.
  - *timeline*: the full explorer, with a "↩ The story" marker per section.

  Switching keeps the reader's place: the same section, the same event, or the
  nearest by date.
- **The ribbon** spans the earliest cut-back to the story's present. Cut-backs
  fill in once read, and a dot shows where the reader is in time.
- **Story events** are ordinary events with `register: story`, kept in the
  story's own `.timeline` file (paths in it resolve against that file). They
  appear only in converging cut-backs and, with `converge`, the timeline.
- **Diagnostics.** `?debug` also lists cut-backs that select nothing or show
  more than 15 events without `max`, unknown places in headings, and
  unparseable dates.
- **Without JavaScript** the page reads woven, with each cut-back's events as
  a static list.

Without Hugo, write the elements directly:
`<geo-story src="…" now="…" converge cutback-stubs events="…">`,
`<geo-cutback from="…" to="…">`, `<geo-woven>`, and load
`geotimeline/story.js` as a module.

## Files

| File | Contents |
|---|---|
| `timeline.yaml` | The manifest. Every other file is listed here. |
| `events/*.timeline` | Events. |
| `facets.yaml` | Filterable dimensions (actors, themes, …). |
| `places.yaml` | Gazetteer. |
| `periods.yaml` | Eras: background bands, headings and map boundaries. |
| `sources.yaml` | Bibliography. |
| `series.yaml` | Timeline-wide numeric series, drawn as tracks. |
| `threads.yaml` | Guided paths through a subset of events. |
| `data/*.csv`, `geo/*` | Data and map files referenced from the above. |

All paths, including paths inside events, are relative to the manifest.

Event files use `.timeline` rather than `.md` because Hugo does not publish
`.md` files inside a page bundle. Long-form text loaded on demand uses
`.details` for the same reason.

Each section of the manifest (`facets`, `places`, …) may be a path or written
inline.

## `timeline.yaml`

```yaml
schema: 1                    # required
title: Filasteen
events: [events/1878-1917.timeline, events/1947-1949.timeline]
facets: facets.yaml
places: places.yaml
periods: periods.yaml
sources: sources.yaml
series: series.yaml
threads: threads.yaml
basemap:
  world: geo/land-110m.json  # TopoJSON with a `land` object
  regions:                   # places in a region zoom the map in
    levant: {name: Levant, center: [35.1, 31.9], span: 4.2, land: geo/levant-10m.json}
options:
  view: scroll               # scroll | geo
  spacing: compressed        # compressed | scaled
  gap_marker: 2y             # label gaps longer than this (y, m or d)
  filter_mode: dim           # dim | hide: what happens to non-matching events
  date_locale: en-GB         # BCP 47 locale for dates; default: the reader's
```

`span` is the width of the region view in degrees of longitude.

## Event files

An event is a YAML header between two `---` lines, followed by an optional
markdown body. Write a horizontal rule as `***`, since `---` separates
events.

```
---
id: 1948-04-22-haifa                # optional; default: date + title words
when: 1948-04-21/1948-04-22         # required
where: haifa                        # place key(s), {lat, lon, name} or {geo: file, region: key}
actors: [haganah, uk]               # any facet group key from facets.yaml
threads: [some-thread]
sources: [pappe2006, {morris2004: "p. 186"}, {ref: x, at: "p. 2", quote: "…"}]
details: [{src: details/1948-haifa.details, title: The fall of Haifa}]
images: [{src: img/haifa.jpg, caption: Haifa harbour, credit: "Photo: …"}]
data:
  - {mark: bar, title: Killed, x: group, y: count, table: "group,count\nVillagers,107"}
importance: 3                       # 1–3; label priority on the map
draft: true                         # hidden unless ?drafts
---
## The fall of Haifa

The first paragraph is the summary shown on the card.

Further paragraphs go behind "Read more".

### A section
Each `###` heading starts a collapsible section.
```

A `## heading` at the top of the body is the title, unless `title:` is set.
`register: story` marks an event as one of a story page's own moments (see
*Story pages*).
Lines starting with `#` before the first `---` are file comments.

### Dates (`when`)

| Value | Meaning |
|---|---|
| `1948` | some time in 1948 |
| `1948-04` | some time in April 1948 |
| `1948-04-21` | that day |
| `~1882` | circa 1882 (either side of a range may use `~`) |
| `1947-11/1948-05` | a range; the two sides may have different precision |
| `1920/..`, `../1917` | open-ended ranges |
| `-0500` | 501 BCE (year 0 is 1 BCE) |

Dates are labelled at the precision written, so `1948` is never shown as
"1 January 1948".

## `facets.yaml`

```yaml
actors:                      # the key used in event headers
  label: Actors
  filter: true               # appears in the filter panel (default true)
  badge: true                # shown on cards (default true)
  values:
    uk: United Kingdom       # shorthand for {label: …}
    haganah: {label: Haganah, icon: "🛡", color: "#7a6", description: …}
    palmach: {label: Palmach, parent: haganah}
```

An icon is text or an image path. A filter on a parent value also matches its
children. Filters combine with OR within a group and AND across groups.
Facet keys must not clash with event fields.

## `places.yaml`

```yaml
palestine: {name: Palestine, lat: 31.6, lon: 34.95, region: levant}
haifa: {name: Haifa, lat: 32.794, lon: 34.99, parent: palestine}
wadi-rushmiya: {name: Wadi Rushmiya, parent: haifa}   # drawn at Haifa, marked approximate
mandate: {name: Mandatory Palestine, geo: geo/mandate.geojson}
```

A place inherits `region` from its parent. A place without coordinates uses
its parent's point, marked as approximate. `names` takes a list of
`{name, lang}` for other names.

## `periods.yaml`

```yaml
- id: british
  label: British rule
  when: 1917-12-09/1948-05-14
  color: "#4f9a5e"
  boundaries: [geo/mandate-1922.geojson]   # drawn on the map during this period
```

Periods may overlap or nest. Each appears as a heading where it begins and as
a band in the gutter.

## `sources.yaml`

```yaml
pappe2006: {author: Ilan Pappé, title: The Ethnic Cleansing of Palestine, year: 2006, publisher: Oneworld, url: https://…}
```

Cards show citations as "Pappé 2006, p. 95". Set `label:` to override that.

## `series.yaml` and charts

```yaml
population:
  label: Population of Palestine
  file: data/population.csv   # or `table:` with inline CSV
  x: year
  y: [arab, jewish]
  mark: line                  # line | area | bar | dot | stat
  unit: people
  sources: [mccarthy1990]
  track: true                 # draw as a track beside the timeline (default true)
```

An event's `data` list takes the same fields. An entry `{series: population}`
draws that series with the event's date marked on it. `stat` shows a single
number: the first row's `y` value, labelled by `x`.

## `threads.yaml`

```yaml
- id: empty-land
  title: "“A land without a people”"
  intro: threads/empty-land.details   # or inline markdown
  events: [1878-palestine-has-500000-inhabitants]   # optional explicit order
  match: {themes: [demographics]}                   # optional: add events by facet
```

A thread's members, in order, are:
1. the events listed in `events`;
2. then, in date order, events that match `match` or list the thread under
   `threads:`.

## Diagnostics

| Level | Meaning |
|---|---|
| `error` | The event is dropped: unparseable date, invalid header, no title. |
| `warning` | Kept, but something is wrong: unknown key, place, source or facet value; duplicate id. |
| `info` | Missing optional data: no sources, no place, a place without coordinates. |
