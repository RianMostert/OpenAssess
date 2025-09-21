# PDF Exporting: Geometry and Algorithms Documentation

This document details the geometric algorithms and processing steps used in the export pipeline to turn frontend‐stored annotation data (strokes, erasers, text notes, etc.) into final vectorized PDFs. It goes deeper than the report, describing how and why each step is done.

---

## Overview

The frontend captures annotation interactions as JSON: strokes (freehand), eraser paths, text notes, sticky notes. Coordinates are stored in percentages relative to page dimensions. On export, these must be converted to absolute PDF page coordinates and processed so that the exported PDF matches what the user saw, including correct erasing behavior, vector rendering, etc.

---

## Key Algorithmic Steps

Here are the main processing steps, what algorithms are used, and why:

| Step | Algorithm / Method | What it Does | Why it's Necessary |
|---|---|---|---|
| **Percent → Absolute coordinate conversion** | Simple linear scaling: `(x_percent/100) * page_width, (y_percent/100) * page_height` | Converts annotations to the coordinate system used by PyMuPDF/PDF pages | Ensures that annotations line up correctly regardless of frontend viewport, device, zoom. Without this, strokes/text would be misaligned or scale wrong. |
| **Modeling eraser geometry** | Capsules (each eraser polyline segment + radius), i.e. segment Minkowski‑sum disk approach | Represents the eraser “volume” in page space: union of all eraser segments expanded by radius | Because the frontend uses compositing (masking) which doesn’t leave a durable geometry. To remove parts of strokes accurately, need a geometry representation of eraser. |
| **Broad‐phase candidate selection** | AABB (axis‐aligned bounding box) inflation + uniform grid spatial index | Quickly filters which stroke segments *could* be hit by eraser: only those whose bounding box overlaps with an eraser capsule’s bounding box | White‑boxing every stroke against every eraser is too slow; this reduces the number of expensive distance tests. |
| **Narrow‐phase / precise intersection test** | Segment‑segment distance formula + checking whether distance ≤ radius | Determines exactly which stroke segments intersect the eraser region | Required so we only remove (or split) actual intersections, not just coarse overlaps. |
| **Boundary refinement / splitting** | Bisection (iteratively subdividing segment) to find entry/exit points where a stroke enters or exits the eraser region | Allows splitting a stroke segment into subsegments that represent preserved parts vs removed parts | Without boundary refinement, either too much is removed (over‑erasing) or too little (eraser effect is sloppy). |
| **Reconstruction of remaining segments** | Piecewise polylines: keep subsegments that are not erased, discard erased parts, possibly draw circular caps at joints for smoothness | Builds final stroke geometry after erasing, which can be drawn by PyMuPDF in order with original stroke width, color, etc. | Ensures exported vector strokes match user expectation, with clean visuals, no artifacts from masking or layering differences. |
| **Text & Sticky Notes** | Placing text boxes or using PDF annotation objects, using absolute positions and size parameters stored in JSON | Adds non‑stroke annotation content into PDF so that it remains selectable / visible / expandable in many viewers | Strokes + erasers only cover ink; textual feedback must survive the export in readable, selectable form. |
| **Role‑based output packaging** | For each student, generate annotated PDF, then package as ZIP for lecturers; students get single file | Different users have different access; grouping makes download easier for lecturers | Makes UX practical: lecturers seldom want to download individual PDFs one by one; students only need their own. |

---

## Why Geometry Recalculation (not just using frontend renderings)

- The frontend uses canvas compositing (via Konva) and masking (destination‑out) to **visually** hide erased parts of strokes. However, compositing does not modify the underlying stroke geometry, which remains intact in JSON. That is lightweight for UI but cannot yield clean vector export.  
- To produce vector PDFs (clean lines, accurate stroke width/color, proper removal of stroke segments), the backend must compute the actual geometric difference between stroke paths and eraser regions.  
- This approach ensures **portability**: exported PDFs look consistent across viewers, zoom levels, devices.  
- It also enhances **quality**: no white overlays, no weird pixel artifacts, clean joins.  
- Finally, it makes downstream processing (e.g., if you later need to compute bounding boxes of visible ink, or measure similarity, etc.) precise and predictable because the geometry is explicit and clean.

---

## References / Resources

- PyMuPDF Documentation: [https://pymupdf.readthedocs.io/](https://pymupdf.readthedocs.io/)  
- Christer Ericson, *Real-Time Collision Detection* (Morgan Kaufmann, 2005): [PDF summary link](https://www.r-5.org/files/books/computers/algo-list/realtime-3d/Christer_Ericson-Real-Time_Collision_Detection-EN.pdf)  
- J.C.G.T. Paper on Line Segment Distance Tests: [https://jcgt.org/published/0003/04/05/paper.pdf](https://jcgt.org/published/0003/04/05/paper.pdf)  
- P.K. Agarwal et al., *Polygon decomposition for efficient construction of Minkowski sums*: [https://users.cs.duke.edu/~pankaj/publications/papers/poly-mink.pdf](https://users.cs.duke.edu/~pankaj/publications/papers/poly-mink.pdf)  
- R. Wein, *Exact and Efficient Construction of Planar Minkowski Sums using the Convolution Method*: [https://www.cs.jhu.edu/~misha/Spring20/Wein06.pdf](https://www.cs.jhu.edu/~misha/Spring20/Wein06.pdf)

---

## Pseudocode Sketch

```python
# Pseudocode outline of eraser filtering

for each stroke in strokes:
  convert stroke points from percent to page_px
for each eraser in eraser_strokes:
  convert points, build capsules
build spatial grid over page with eraser capsules’ AABBs

for each stroke_segment:
  if segment’s AABB overlaps any eraser capsule (via grid):
    compute segment‑capsule distance
    if intersects:
      refine boundary via bisection → split segment
    else:
      keep segment intact
  else:
    keep segment

rebuild stroke as polyline(s) of kept segments
draw polyline(s), draw text/sticky notes
```
