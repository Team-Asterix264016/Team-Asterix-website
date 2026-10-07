#!/usr/bin/env bash
# Re-encode the gallery photographs for the web.
#
# The source files ship at JPEG quality 100 with a ~6KB APP11 profile, which is
# roughly four times the bytes anything on the site can actually show: the drift
# wall renders these at 165x115 CSS px and the lightbox at most at the width of a
# 5xl container. Quality 80 is visually indistinguishable here and costs ~77%
# less. Dimensions are deliberately unchanged at 1200x896 -- one cached copy
# serves the wall, the grid and the lightbox, and a second smaller variant would
# only add requests.
#
#   -strip      drop the APP11 profile (~6KB/file, nothing reads it)
#   -interlace  progressive, so the wall paints something early on a slow link
#
# There are two byte-identical copies of each photo: public/gallery is what the
# browser fetches, and src/assets/gallery is imported by WebsiteDataContext and
# emitted into dist/assets, where apiUrl() rewrites the hashed URL back to
# /gallery/ so the bundled copy is never actually requested. Both are encoded
# here so the build output does not carry the heavy originals either.
#
# Re-run this after dropping new photographs in, or they go out at quality 100.
set -euo pipefail

QUALITY="${QUALITY:-80}"
cd "$(dirname "$0")/.."

for dir in public/gallery src/assets/gallery; do
    [ -d "$dir" ] || continue
    for f in "$dir"/*.jpg; do
        [ -e "$f" ] || continue
        before=$(stat -c%s "$f")
        convert "$f" -strip -quality "$QUALITY" -interlace JPEG "$f.tmp"
        mv "$f.tmp" "$f"
        after=$(stat -c%s "$f")
        printf '%-44s %7s KB -> %6s KB\n' "$f" "$((before / 1024))" "$((after / 1024))"
    done
done
