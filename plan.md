# Build Desk implementation plan

## Agreed product design

Build a responsive browser application using TypeScript, React and Next.js, served from Preston's Windows PC to the PC and home Wi-Fi devices. Each build's local Excel workbook is authoritative for production details, current recorded state and history. A small local Builds registry points to separate workbook and asset locations. Models remain local/on the NAS. No Google Cloud setup, paid runtime service or cloud credentials are required. The original Google export is retained as an audit backup.

Use a single charcoal/yellow application shell with an original dump-truck logo at upper left, top navigation for Printing / Purchasing / Assembly, a current tracked-job strip, an expandable left tree and a spacious right workspace. About opens a dialog from the top navigation, not a separate workspace. A persistent desktop footer shows read-only printer-reported state, progress, remaining time and observation age, distinct from tracked-job state. Verify H2D firmware/access compatibility before enabling integration; do not change printer modes as an installation side effect.

Tree hierarchy: Vehicle → Section → 3MF → Plate → Part. Tree clicks, detail child rows and breadcrumbs share one selected entity; selection expands/highlights the appropriate ancestors. Search/filter retains matching ancestors. Separate readiness filters (confirmed/review needed) from completion filters (not printed/partial/complete). Provide meaningful sorting with explicit labels. Preserve navigation context and use Save / Discard / Stay before leaving unsaved edits.

Vehicle workspace shows overall accepted-part progress, section rollups, and a finished-product reference-photo gallery for appearance and color decisions. Reference thumbnails open larger previews and byte-identical originals at full resolution; no color grading or generated replacement photos. Retain source filenames, provenance and ICC profiles. Initially use the front, passenger-side and rear photos provided on the NAS. References remain reachable while working deeper in the tree without losing selection or edits. Section workspace lists its projects and summaries. 3MF workspace shows its plates and readiness. Plate workspace shows saved layout preview, material/profile, available slice estimates and a read-only parts table of required/accepted/remaining/status. Selecting a part opens its details and results workflow. Avoid repeating header bars or displaying every screen at once. Status labels accompany colors; controls remain keyboard accessible. Purchasing and Assembly will reuse the shell and drill-down patterns later.

## Production behavior

One saved preparation per tracked plate. Enabled object copies × plate runs gives default planned quantities; plate runs defaults to 1. Completed parts start excluded; the user must match the physical enabled layout in Bambu Studio. STL sets and split wheel objects must not be assumed to represent complete-unit quantities. Allow preparation and review of other plates during an active print, while enforcing at most one active job per physical printer across builds. Start takes an immutable snapshot of the committed preparation. The user reports printer completion to move the job to awaiting inspection; device telemetry can support that later. Completion never accepts parts automatically. Accept/reject results require explicit Commit and update history and counts exactly once.

Custom plates/layouts and manual reprints stay outside the tracked tree. Record manual accepted/rejected results against the affected original parts/plate associations, with optional custom filename/notes, without falsely logging another execution of an original plate. New archive plates are candidates for manual review, never automatically adopted as tracked plates. Server access checks restrict mutations to loopback clients using a process edit token and same-origin requests. Home-network clients cannot edit by bypassing hidden buttons. Remote editing would require a separate authorization design.

Mobile is a responsive read-only status/progress layout: last recorded information and its timestamp, with no live countdown or claim about current printer state. Preparation, review and count changes remain in the desktop working layout. The PC service must be running for home Wi-Fi access; The original online sheet remains an unsynchronized archive.

## Files, previews and Bambu handoff

Open a project in Bambu Studio for manual review, layout changes and slicing; save and explicitly refresh file details in Build Desk. No app-driven slicing or print commands in v1. Record source fingerprints and imported metadata age. A changed file invalidates assumed readiness and prompts review without changing production history. A thumbnail is not evidence of readiness. Show **Not yet sliced** when reliable slice estimates are unavailable. A header-only slice_info.config is not a valid time/material estimate.

Generate cached thumbnails and larger still images from real STL geometry. Extract saved plate images and reconstruct 3MF component/build transforms for display geometry. Produce simplified, display-only GLBs for on-demand rotation/zoom. Retain disabled instance metadata; do not infer required quantities or change print settings. Use stable Part IDs and Project ID + local plate number as asset keys. Fingerprint source files for regeneration. Do not publish model derivatives without deliberate authorization.

About: logo/name, the attribution **An application by IntegratedSA LLC**, purpose, version/build, project, last successful data sync, help/repository links and dependency licenses. Diagnostics reveal reachability, never secrets. Branding uses a realistic yellow articulated dump truck rather than the initial simplified silhouette.

## Delivery stages and validation

1. **Delivered:** original branding/icons; part thumbnails/stills/GLBs; plate thumbnails/stills/GLBs; asset catalog and local review gallery; documented generation/verification; private Git repository. Source STL/3MF, derivatives/cache, production exports and secrets stay outside Git.
2. Verify Bambu slicing persistence using a deliberately sliced working copy and the installed Studio version. Inspect estimates after save/reopen and determine whether sliced export is needed. The seven projects inspected during asset generation have header-only slice metadata and no saved G-code: they currently supply no verified estimates.
3. **Implemented for acceptance testing:** application workflow, Excel data-store adapter, serialized/retry-safe commits, backups, change logging, conflict detection, desktop access controls and responsive read-only mobile summaries. Existing tabs, IDs, prior history and opening balances are preserved. Spreadsheet controls remain as reference; Apps Script is not executed locally. Use the acceptance checklist for a real print after the disposable-workbook tests.
4. Add read-only printer telemetry after connection feasibility is proven; implement sister modules using the same shell and store boundaries.

Acceptance: every available tracked part has an identifiable, nonblank thumbnail and framed preview; GLBs are valid and load/rotate; all seven current source projects are inspected; plate object names, enabled states and transforms correspond to saved files; missing/ambiguous associations are explicit; source geometry and spreadsheet records are unchanged; no credentials or model files enter Git. Asset review gallery is a verification tool, not the finished production app.

## Approved storage revision

Per user direction, use Excel rather than a production database or Google service account. Keep the Builds registry small and readable (JSON initially). Each build has separate authoritative workbook and asset roots; data adapters isolate storage from the interface. Auditability during integration testing and acceptance is a primary requirement.
