# Build Desk

Browser workspace for Kitten 745 production tracking. This first delivery contains the real-geometry asset pipeline, branding, a local image/3D review gallery, and the agreed [application plan](plan.md). It does **not** yet implement production updates, Sheets authentication or printer integration.

## What is versioned

Code, original branding, tracker identity mappings, dependency locks and documentation. Original STL/3MF files, derived model assets, local production snapshots, credentials and caches are deliberately Git-excluded. This private repository is not a backup of your model library. Source model rights remain with their original owners. No open-source license is granted to the model library by this repository.

## Generate assets

Use Python 3.12 and Node.js 22 or newer. Install Python requirements in a virtual environment and run:

```powershell
python -m pip install -r requirements.txt
python tools/create_branding.py
powershell -File tools/prepare-inputs.ps1
python tools/generate_assets.py --stl-root local-inputs/stl-current --projects local-inputs/projects --keys config/parts.json --project-manifest config/projects.json
python tools/verify_assets.py
npm ci --ignore-scripts
npm run preview
```

Open http://127.0.0.1:4173. Choose a part or plate and click **Rotate model**. Drag to rotate, wheel to zoom, right-drag to pan. The gallery loads Three.js from the locally installed package; no models are uploaded to an external viewer. It only listens on loopback and exposes preview assets, not the model input folder or credentials. It is intentionally not the later home Wi-Fi service.

If Python packages are installed under `.python-packages`, the tools detect that folder. Install into the virtual environment by default; the directory override supports the managed desktop environment used for this delivery. If npm's usual cache is unavailable, use `npm ci --ignore-scripts --cache .npm-cache`.

## Outputs

- `assets/branding/`: original SVG mark, dark/light wordmarks, PNG icon sizes, favicon and web manifest.
- `assets/generated/parts/<PartID>/`: 192px WebP thumbnail, 960px WebP preview and simplified GLB.
- `assets/generated/plates/<ProjectID>-P<NN>/`: saved embedded plate image when available, WebP preview/thumbnail, reconstructed display GLB.
- `assets/generated/catalog.json`: stable IDs, source hashes, geometry bounds, source/display face counts, saved enabled states, available slice metadata, explicit exceptions and provenance.
- `assets/generated/contact-sheet-*.jpg`: overview for visual review.
- `assets/generated/verification.json`: integrity checks and output sizes.

STL geometry is treated in the source library's millimeter convention. GLBs use display coordinates in the same scale and are centered for viewing; do not feed them to a slicer. Simplification and static rendering can soften small features; they do not establish print readiness or replace Bambu Studio. Saved plate images can be stale within a 3MF, so the gallery labels their provenance and shows reconstructed geometry separately.

No new required/completed quantities are inferred. Wheel object membership may be ambiguous because the project contains split objects. Unknown part associations remain null rather than guessed. Custom/manual plates discovered in files remain asset candidates; generating a preview does not add them to the production tracker.

See [plan.md](plan.md) for the full interface and workflow decisions, and [ASSET_REPORT.md](ASSET_REPORT.md) for this batch's verified results.
