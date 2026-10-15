# Build Desk acceptance walk-through

The original Google export is retained under `local-data/kitten-745/backups`. The active local workbook is `local-data/kitten-745/Master Tracker.xlsx`. The app writes no Google data. Stop using the online sheet for new production changes once this local workflow is accepted; changes are not synchronized between them.

1. Open the Vehicle. Compare accepted totals and unconfirmed quantities with the workbook. Drill down through section, 3MF, plate and part. Check that breadcrumbs and tree selection agree; search and filters must keep ancestors visible.
2. Open reference photos from any workspace. Test Fit, 100%, zoom and closing without losing your current selection. Open About and verify IntegratedSA LLC attribution.
3. Select a plate, open its project in Bambu Studio and review enabled objects/material/layout. Refresh saved file details. Missing usable slice metadata should say Not yet sliced. New custom plates remain untracked candidates.
4. Prepare the plate. Plate runs defaults to 1; copies/planned counts must be checked in the correct physical units. Change a value and navigate away: test Stay, Discard, and Save and continue. Reopen the plate to verify saved preparation.
5. Start a real intended print only when ready. Confirm the immutable planned quantities and then start the physical printer in Bambu Studio. While Printing, prepare another plate; starting another is blocked.
6. Mark the job finished to move it to awaiting inspection. Verify that no accepted totals change. Enter accepted and rejected counts, save a draft, then commit the results. Incorrect/fractional/negative or incomplete counts must be rejected. Repeat Finish must not count twice.
7. Use a custom physical reprint plate in Bambu. Record manual results against the original part associations, optionally across several original plates. Verify zero original-plate runs, retained history, and updated part totals.
8. Open the workbook while the app is idle. Inspect original tabs, result history, preparation/draft tabs, and change log. Close Excel before app saves. Make an intentional outside edit in a test copy and check stale-save rejection. Compare timestamped backups.
9. Open the host's home-network address on a phone. Check last recorded time and status; no editing controls or live printer countdown should be available. Network mutation requests are also blocked server-side.

Automated integration tests use synthetic workbooks and a separate clone of the real export under `web/test-output`. They do not manufacture jobs or accepted quantities in the active workbook. See the implementation report for actual test results and current limitations.
