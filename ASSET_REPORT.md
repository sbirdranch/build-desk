# Asset batch — 15 October 2026

Generated from current read-only NAS working copies, not from mockup illustrations.

| Output | Count |
|---|---:|
| Tracked part sources | 101 |
| Part thumbnails, 192 × 192 WebP | 101 |
| Part still previews, 960 × 960 WebP | 101 |
| Part rotatable GLBs | 101 |
| Current 3MF projects inspected | 7 |
| Saved plates previewed | 25 |
| Tracked plate identities | 24 |
| Additional untracked wheel plate candidate | 1 |
| Plate thumbnail / still / GLB sets | 25 |
| Original branding files | 12 |

All 252 main images decode and contain visible variation. All 126 GLBs pass container/mesh checks. All 101 tracked part IDs and seven project IDs are covered, with no missing files or generation exceptions. Sources match catalog SHA-256 fingerprints. The 126 display sets occupy approximately 52.4 MiB, excluding extracted original plate PNGs and contact sheets.

Three part contact sheets and a plate contact sheet provide visual review. The local gallery supports search, still images, on-demand GLB rotation, zoom, pan and view reset. Browser verification covers a small handrail set, the larger cabin, a current saved plate and the beadlock wheel. See the local `assets/generated/verification.json` for machine-readable integrity results.

Standard Wheel and Standard Hub are excluded. The extra plate in the current wheel project is explicitly an **untracked preview candidate**; generating its assets does not adopt it into the production workflow. Ambiguous split-object associations are left unresolved rather than inferred as complete-unit quantities. Disabled flags are retained in plate instance metadata; preview geometry includes saved instances so users can inspect them.

All seven projects contain `Metadata/slice_info.config`, but those files currently contain only a slicer header, no per-plate estimates. No saved G-code entries were found. Consequently all plates show **Not yet sliced**. Confirming persistence of actual estimates after slicing/saving in the installed Bambu Studio remains a separate integration validation; metadata-file existence alone is insufficient.

No spreadsheet cells, acceptance counts, job statuses, original STL files or original 3MF projects were changed. Model working copies and generated derivatives remain local and Git-excluded. Code, original branding, source identity mappings, documentation and dependency lockfiles are committed to the private repository.
