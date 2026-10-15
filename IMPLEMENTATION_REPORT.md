# Build Desk 0.2.0 implementation report

Delivered October 15, 2026. Application attribution: IntegratedSA LLC.

## Running application and records

The production build runs locally at http://127.0.0.1:4174/. Start-Build-Desk.cmd opens or starts the background service. Home-network connections receive read-only access; the PC must remain running. No Google Cloud setup, cloud credentials, database server or paid runtime service is required.

The active record is `local-data/kitten-745/Master Tracker.xlsx`. The complete 16-tab Google export is retained in `local-data/kitten-745/backups/Google-export-2026-10-15.xlsx`. At delivery the active workbook remains byte-identical to that export: no test jobs, preparations or completion counts were written into production. SHA-256: `a8023037604ef87f84dac45358769d3da034c5d1f44b2acfcce62bcb15c06d95`.

Imported records comprise 101 parts, seven current registered 3MF files, 24 tracked plates and one completed historical job. Accepted units total 16. Required quantities are unconfirmed for 98 part types; the app exposes that uncertainty and calculates progress only over confirmed requirements. Obsolete/deleted FrontChassis.3mf is excluded. Standard Wheel and Standard Hub are absent from the tracked library.

## Implemented workflow

- Shared vehicle → section → 3MF → plate → part navigation, synchronized breadcrumbs/tree, search, readiness/completion filters and name sorting.
- Vehicle progress/section summaries; realistic truck branding; About attribution; three original high-resolution finished-product references with zoom.
- Real STL thumbnails/stills and on-demand rotatable part/plate models. Desktop Bambu handoff and saved-3MF metadata/preview refresh. Unknown estimates display Not yet sliced.
- Saved preparation per plate, enabled-copy defaults, plate runs defaulting to one, reviewed material/profile/layout, explicit Save/Discard/Stay.
- Start snapshots the saved plan; only one Printing job can occupy a shared physical printer. Other plates can be prepared meanwhile. Mark print finished moves to Awaiting inspection without accepting parts.
- Inspection drafts, validated accepted/rejected results, exactly-once result commits and auditable history. Custom manual reprint results credit original part mappings with zero original-plate runs.
- Local Excel adapter with workbook locking, stale-edit detection, Excel owner-file checks, backups, atomic replacement, duplicate-request replay and change logging. Three app-owned tabs are added on the first real save; all original tabs are retained.
- Separate Builds registry and workbook/asset roots, normalized data-store interface and printer identity. Only the selected build is loaded. Another workbook schema can be added through an adapter.
- Responsive phone review showing last recorded information; editing remains on the host desktop. File and mutation APIs enforce access independently of UI visibility.

## Verification performed

All 12 integration tests passed. Coverage includes a full preparation/start/draft/acceptance cycle, backups/audit, duplicate request replay, stale source and invalid counts, one-printer constraints within/across builds, manual multi-plate results, outside workbook edits, Excel owner locks, build isolation, printer-finished/cancel behavior, origin/token access controls, asset traversal rejection and disabled-object/untracked-plate metadata. A save on a disposable clone of the actual export preserved all 101 part balances and the 16 original tabs, adding only the three app tabs. The production workbook was verified unchanged afterward.

Strict TypeScript checks and the optimized application build passed. Runtime checks confirmed all seven NAS sources were accessible, source/preview fingerprints were current, foreign-origin POST requests were rejected, and requests made through the PC's home-network address remained read-only even with a forged local-access header. Tests used that same host address; a separate physical phone was not used.

Browser checks covered section/file/plate navigation, a regenerated plate GLB loading, default preparation quantities, Stay/Discard navigation, reference-photo 100% viewing, About attribution and the phone viewport's read-only layout. A separate browser service used a disposable clone of the actual export for Save preparation → Start → Mark print finished → Save inspection draft → Commit completed results. It credited two accepted units and one rejected unit, produced five audit entries, and closed the job. The production workbook remained unchanged at 16 accepted units. The first physical print remains part of user acceptance.

In-app Cabin refresh regenerated its plate previews successfully. Front Chassis previews were also regenerated after detecting a changed source; its newly discovered P08 remains an untracked candidate. The asset library now contains 101 part models and 26 plate models (24 tracked and two untracked candidates). Integrity verification passed for 127 GLBs, 254 main images and three reference photos, with no exceptions. Supporting rendering-library read permissions were corrected for the Windows account running the app.

## Limits and next acceptance steps

Read-only printer telemetry was added after the initial delivery, as detailed below. Physical layout changes, slicing and printing remain manual in Bambu Studio. Current saved archives provide no verified time/material estimate. A deliberately sliced saved working copy still needs a save/reopen check with this installed Studio version before promising reliable estimate availability.

Purchasing and Assembly are reserved modules. Build registration is configuration-based; no New Build wizard is supplied. Remote editing, automatic cloud synchronization, automatic discovery/adoption of custom plates and automatic acceptance are not enabled. Spreadsheet Apps Script controls do not run in Excel.

Excel should be closed during app saves. An interrupted process can leave a lock file; verify the service is stopped before removing a stale lock. The change log is an audit aid, not a tamper-proof ledger. External Excel edits are detected as changed files but are not attributed as app actions. Workbooks, backups, photos and model derivatives are outside Git and should be included in normal file backups.

Follow UAT_CHECKLIST.md for the first real plate → Start → inspection → accepted-parts cycle. Preserve the original export during acceptance.

## Printer monitoring follow-up — October 15, 2026

The H2D authenticated locally in normal/cloud-connected mode on firmware 01.04.00.00. Its certificate chain and serial identity verified with TLS validation enabled. A subscribe-only test received five reports, including RUNNING, the Grill pieces black device job, 44% progress, 152 minutes remaining, layer 45 of 348 and reported temperatures. Those values are a historical test observation, not current status. No printer controls, network-mode changes, or production-workbook updates were issued.

The application now maintains a read-only status subscriber and shows the selected printer's observed job/state/progress/time/layers in the desktop footer, with ten-second display refreshes and stale labels after thirty seconds. Device telemetry remains separate from Excel acceptance. Mobile does not poll the live printer feed. Connection secrets and certificate/provenance files remain local and Git-excluded. Three additional tests cover fragmented/coalesced MQTT frames, invalid/oversized frames, freshness/disconnection labels and omission of credentials from API views; all 15 integration tests pass.
