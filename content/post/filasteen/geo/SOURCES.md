# Map data

| File | Source | Licence |
|---|---|---|
| `land-110m.json` | Natural Earth 4.1.0, 1:110m land, via [world-atlas](https://github.com/topojson/world-atlas) 2.0.2 | Natural Earth: public domain; world-atlas packaging: ISC |
| `levant-10m.json` | Natural Earth 4.1.0, 1:10m land, clipped to 29–41°E, 26–38°N, with a separate `coast` line layer | as above |

Regenerate with `tools/geotimeline/basemaps.sh`.

Natural Earth's land layer is built by merging modern country polygons.
It has no lakes, so the Dead Sea and the Sea of Galilee do not appear.

Historical boundaries (periods' `boundaries:`) still need to be chosen and
cited; see the proposals in the PR or session notes.
