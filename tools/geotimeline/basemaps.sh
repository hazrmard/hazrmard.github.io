#!/bin/sh
# Regenerates the post's basemaps from Natural Earth (via the world-atlas
# package, v2.0.2 = Natural Earth 4.1.0). Coastlines only: no country borders,
# which would be anachronistic on a historical map.
#   cd tools/geotimeline && npm install && sh basemaps.sh
set -e
OUT=../../content/post/filasteen/geo
mkdir -p "$OUT"
cp node_modules/world-atlas/land-110m.json "$OUT/land-110m.json"
# Levant at 1:10m, clipped to lon 29–41, lat 26–38 and lightly simplified.
# `land` (polygons, for fill) and `coast` (lines made before clipping, so the
# clip box adds no false coastline).
npx mapshaper -i node_modules/world-atlas/land-10m.json \
    -simplify 40% keep-shapes -lines + name=coast \
    -clip bbox=29,26,41,38 target=* \
    -o format=topojson quantization=1e5 target=* "$OUT/levant-10m.json"
