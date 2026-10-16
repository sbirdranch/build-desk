# Dump Truck Order Watch requirements

Version: 1.0 planning baseline, 2026-10-16.
Status: requirements only; no task changes or activation authorized by this document alone.
Audience: the AI session implementing the ChatGPT automation effort.

## Read first

Read this file and `../order-update-coordination.md` together. The sibling `../purchasing/requirements.md` belongs to the separate Build Desk application effort. The shared contract is authoritative for queue format and lifecycle. Do not independently invent another format.

## Purpose and ownership

Keep the watch in ChatGPT so it can interpret variable AliExpress email formats, run while the PC is off, and deliver ChatGPT push notifications. Replace writes to the retired Google Sheet with durable structured files in Google Drive. Build Desk owns matching against the current local workbook, user review, and actual tracker writes. The watch does not need access to the local PC or workbook.

## Existing task and migration reference

- Task title: Dump Truck Order Watch.
- Task ID observed during planning: `6acfd11b9c1881919d2004680d811d6e`. Recheck actual task state before editing; do not create a duplicate unintentionally.
- Retired tracker: Kitten 745 — Master Tracker, spreadsheet ID `1IsH7Pz2WhBIFGcvJCBDmO6TSoyKaIfPi-rd3Xo6l080`.
- Preserve the existing 08:00 and 16:00 America/New_York schedule unless the user changes it. This schedule was carried forward as a planning default.
- Resolve the retired Sheet's actual parent folder. The new queue belongs there; do not guess a folder ID or use the local workbook path as a Drive path.
- Never update or synchronize the retired Sheet.

## Functional requirements

| ID | Requirement |
| --- | --- |
| OW-01 | Inspect Gmail for AliExpress build orders and subsequent order, shipment, carrier delivery, cancellation, and related transaction messages, including mail forwarded from `sbirdranch@yahoo.com`. Amazon, eBay, and other vendors remain out of scope. |
| OW-02 | Identify genuine Kitten 745 build purchases. Queue relevant items from mixed orders only. Uncertain relevance or extraction stays unresolved; do not guess. |
| OW-03 | Queue both new orders and updates to existing orders. Extract order identity, item/variant specifications, seller, ordered quantity and unit basis, actual paid amounts/currency, dates, tracking details and supported status facts when available. Distinguish missing information from zero. |
| OW-04 | Payment confirmation is not a tracked status. It may provide purchase-price evidence. Do not invent a tax/shipping/unit-price allocation from a total. |
| OW-05 | Translate email content into the versioned JSON contract in the coordination document. Produce facts, evidence, and suggested matches, not executable worksheet edits or authoritative local row numbers. |
| OW-06 | Write each complete, validated handoff to `Dump Truck Order Updates/Pending` in the agreed Drive parent. Confirm successful durable creation before completing Gmail processing. |
| OW-07 | Prevent duplicate handoffs using Gmail message identity and event identity, including repeat runs and already Processed or Dismissed records. A genuinely new message about the same order is a new event, not a duplicate. |
| OW-08 | After successful handoff, label the source message `DumpTruckBuild`, mark it read, and archive it by removing INBOX. Completion here means safely queued, not approved or applied to the workbook. |
| OW-09 | Ambiguous, incomplete in a blocking way, conflicting, or failed-to-queue messages remain UNREAD and in INBOX with an explanation in the notification. If previously read and now needing attention, mark unread. Do not mark received from carrier evidence. |
| OW-10 | Notify through ChatGPT when relevant changes are queued or attention is needed. Distinguish queued-for-review from tracker-updated. Summarize order/item changes and unresolved questions. No relevant changes means no notification. |
| OW-11 | Carrier delivery may propose `delivered_by_carrier`; only the user in Build Desk may record `received` or received quantities. |
| OW-12 | First-run reconciliation covers all messages already labeled `DumpTruckBuild` plus relevant mail from the preceding 30 days, de-duplicating overlapping searches. Existing local purchases must be reconciled by Build Desk, not recreated blindly. |
| OW-13 | Never place purchases, send vendor messages, or add other vendors without user instruction. Gmail handling remains within the explicit workflow above. |

## Failure and retry rules

- Queue creation fails or its outcome is unknown: keep source actionable, check for the deterministic event before retrying, and report the failure. Never claim it was queued without evidence.
- Queue succeeds but Gmail mutation fails: leave the queue file intact; retry Gmail handling without creating another event.
- Notification failure must not cause another queue event on the next run.
- Never alter pending JSON after publication. Corrections are new events referencing the previous event; Build Desk shows conflicts for review.
- Process each source independently so one invalid email does not falsely complete the entire batch.
- A nonblocking missing field, such as seller name, can be null if identity and proposed facts are sufficient. Missing order/item identity, uncertain build relevance, or materially ambiguous quantities/prices requires attention.

## Implementation plan

1. Read the actual task prompt and state; resolve the Drive parent and existing Gmail label.
2. Verify this task runtime can create the agreed UTF-8 JSON files in Drive without interactive approval on each scheduled run. Inspect actual tool capabilities; do not promise support from assumptions.
3. Establish queue folder IDs and the v1 contract with the application effort. Test with explicitly identified fixtures, never fictional live orders.
4. Replace the task prompt, preserving relevant scope, schedule, notification and Gmail rules. Remove all Sheet mutation instructions.
5. Coordinate activation with the application acceptance gate. Do not silently enable a previously disabled task.
6. Run the agreed initial reconciliation after readiness and user activation; verify a real source-to-queue-to-review path without automatically approving purchases.

## Acceptance criteria

- One relevant new order and one subsequent shipment email yield valid events with source IDs and accurate quantities/prices; repeat runs do not duplicate them.
- A carrier delivery email never produces a received quantity or automatic received status.
- An unrelated purchase is excluded; an uncertain purchase remains actionable in Gmail.
- A queue write failure leaves the email unread/inbox and generates an actionable failure notice.
- A simulated Gmail-cleanup retry reuses the existing event.
- Push wording states that the tracker awaits Build Desk review.
- The retired Sheet remains unchanged, and no paid service or expiring trial is introduced.

## Session completion report

Report the actual task ID, effective schedule/state, verified folder IDs, contract version, validation performed, outstanding authorization steps and any failed checks. Never include OAuth secrets or message bodies beyond what is needed to explain the result.
