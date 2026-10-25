#!/bin/sh
# Regenerates the post's basemaps from Natural Earth (via the world-atlas
# package, v2.0.2 = Natural Earth 4.1.0). Coastlines only: no country borders,
# which would be anachronistic on a historical map.
#   cd tools/geotimeline && npm install && sh basemaps.sh
set -e
OUT=../../content/post/filasteen/geo
mkdir -p "$OUT"
cp node_modules/world-atlas/land-110m.json "$OUT/land-110m.json"
# Levant at 1:10m, clipped to lon 31.5–38.5, lat 28–35 and lightly simplified.
npx mapshaper node_modules/world-atlas/land-10m.json \
    -clip bbox=31.5,28,38.5,35 -simplify 40% keep-shapes \
    -o format=topojson quantization=1e5 "$OUT/levant-10m.json"
