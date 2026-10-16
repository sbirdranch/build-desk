# Order Watch and Purchasing coordination contract

Version: 1.0 planning baseline, 2026-10-16.
Status: v1 coordination contract. Purchasing consumer implementation is recorded in purchasing/implementation.md; live authorization and joint acceptance remain gates. Producer activation is owned by the separate Order Watch effort.

## Independent session handoff

| Effort | Session input | Owns | Must not do |
| --- | --- | --- | --- |
| ChatGPT Order Watch | `order-watch/requirements.md` plus this document | Gmail interpretation, immutable queue publication, Gmail completion, push notification | Change the local workbook, guess local row IDs, synchronize the retired Sheet |
| Build Desk Purchasing | `purchasing/requirements.md` plus this document | Direct Drive checks, current-workbook matching, user review, safe commits, disposition and receipts | Broaden email-watch vendors, infer physical receipt, require a paid service |

The two sessions may work separately but must share exactly one contract. Changes to field meaning, identities or folder lifecycle require a documented contract revision and updated fixtures for both. The user's agreed behavior takes precedence over proposed technical details here.

## End-to-end behavior

1. ChatGPT finds a relevant AliExpress email and extracts supported facts.
2. It publishes a complete structured event to Pending and verifies successful creation.
3. It performs the agreed Gmail label/read/archive steps and sends a queued-for-review push notification. Unresolved messages stay unread/inbox.
4. Build Desk fetches on application startup or manual Check only. There is no order polling. It caches pending events and flags grouped pending orders at application level.
5. User opens review, sees current/proposed values and sources, then selects OK, Modify or Dismiss. Closing leaves pending.
6. Build Desk atomically saves approved changes and event disposition locally, then moves source records to Processed. Dismiss saves a disposition without purchasing changes and moves records to Dismissed.
7. Failures preserve recoverable state and display actionable feedback. A carrier's Delivered message never becomes a physical receipt.

## Drive layout and ownership

Resolve the parent of the old `Kitten 745 — Master Tracker` Sheet, ID `1IsH7Pz2WhBIFGcvJCBDmO6TSoyKaIfPi-rd3Xo6l080`.

- `Dump Truck Order Updates/Pending`
- `Dump Truck Order Updates/Processed`
- `Dump Truck Order Updates/Dismissed`

Store actual folder IDs in configuration; names alone are not identities. Create missing folders once, reusing exact verified matches. The watch creates immutable JSON in Pending. Build Desk moves files; it does not rewrite the source facts. Processed and Dismissed records are retained without automatic deletion. No local workbook is uploaded to this folder and no Sheet synchronization is introduced.

Both efforts use direct Google access through their respective authorization contexts. Build Desk cannot inherit ChatGPT's connector credentials or invoke this conversation's skill. Do not assume installing a skill creates an application-callable API.

## Proposed v1 event envelope

Encoding: UTF-8 JSON; MIME type `application/json`; one event per source-message/order combination. One message spanning several orders produces several events. No workbook cell addresses or executable instructions. Suggested filename: `v1__<event_id>.json`, with event_id using safe ASCII letters/digits/hyphens.

Required top-level fields:

| Field | Type / rule |
| --- | --- |
| schema_version | Literal `1` |
| event_id | Deterministic identifier, unique within a build; `k745-` plus SHA-256 of canonical `build_id + "|" + vendor + "|" + order_number + "|" + gmail_message_id`. If the task cannot compute it reliably, resolve that capability before publishing; do not improvise another algorithm. |
| build_id | Literal `kitten-745` in this release |
| vendor | Literal `aliexpress` in this release |
| order_number | Nonempty string; preserve leading zeroes and exact identifier |
| created_at | RFC 3339 UTC time of queue creation |
| event_at | RFC 3339 time of business event if explicit; otherwise null. Do not invent precision for a date-only event; preserve that date in facts. |
| source | Object: gmail_message_id, gmail_thread_id, message_date (RFC 3339), subject, forwarded (boolean), original_sender (string or null). Optional gmail_url is a convenience, not the identity. |
| facts | Object with order_date (`YYYY-MM-DD` or null), currency (ISO code or null), order_total (decimal string or null), and items (array). Optional related original-order reference and concise factual note. |
| supersedes_event_ids | Array of event IDs for explicit corrections; empty otherwise |

Each facts.items entry contains:

| Field | Meaning |
| --- | --- |
| source_item_id | Vendor line identity if available, else null; never invent a stable vendor ID |
| description / specification | Strings or null, preserving variant details |
| seller | String or null |
| ordered_quantity | Nonnegative integer or null; the vendor's purchase-unit count |
| unit_basis | `component`, `pack`, or `unknown` |
| pack_size | Positive integer or null; component units per purchase unit |
| unit_price / line_total | Decimal strings or null; currency comes from facts unless an item explicitly overrides it |
| shipping_amount / tax_amount | Decimal strings or null; do not allocate an order-wide amount without evidence |
| status | `ordered`, `shipped`, `delivered_by_carrier`, `cancelled`, or null. `received` is prohibited in producer events. |
| status_quantity | Nonnegative integer or null, expressed in purchase units; unknown allocation is not full-order allocation |
| tracking | Array of carrier/tracking_number objects; empty when absent |
| suggested_part_id | Existing known ID or null; a hint only, never a forced match |
| evidence | Concise factual excerpt/summary supporting identity, amounts or status; no full email archive required |

Additional optional fields require consumer compatibility and documented meaning. Null means unknown, not delete or zero. A missing field must not erase an existing workbook value. Consumer rejects unsupported major versions and malformed required fields with visible attention status. Never accept arbitrary status text or embedded formulas as executable workbook content.

### Illustrative fixture, not a live order

```json
{
  "schema_version": 1,
  "event_id": "fixture-shipped-001",
  "build_id": "kitten-745",
  "vendor": "aliexpress",
  "order_number": "FIXTURE-ONLY-001",
  "created_at": "2026-10-16T16:00:00Z",
  "event_at": null,
  "source": {
    "gmail_message_id": "fixture-message-001",
    "gmail_thread_id": "fixture-thread-001",
    "message_date": "2026-10-16T15:00:00Z",
    "subject": "Fixture shipment notice",
    "forwarded": false,
    "original_sender": null
  },
  "facts": {
    "order_date": null,
    "currency": null,
    "order_total": null,
    "items": [{
      "source_item_id": null,
      "description": "Fixture component",
      "specification": null,
      "seller": null,
      "ordered_quantity": 2,
      "unit_basis": "component",
      "pack_size": 1,
      "unit_price": null,
      "line_total": null,
      "shipping_amount": null,
      "tax_amount": null,
      "status": "shipped",
      "status_quantity": 1,
      "tracking": [],
      "suggested_part_id": null,
      "evidence": "Fixture says one of two components has shipped."
    }]
  },
  "supersedes_event_ids": []
}
```

Fixture identifiers are explicitly exempt from the production hash rule and must never enter the live queue. The consumer now uses `order-updates/order-event-v1.schema.json` with valid/invalid examples under `order-updates/fixtures`. Expand the golden fixture set jointly before producer activation. The illustrative fixture above is documentation-only and does not pass the production hash check. Both sessions must validate against the same schema. Use decimal-safe monetary arithmetic and preserve unknown currency; do not assume every email price is USD.

## Identity, matching and aggregation

- Event identity guards repeat publication; source Gmail IDs guard repeat processing. A forwarded copy with a different Gmail ID may still describe the same business event. Consumer semantic matching must avoid adding quantities twice, even if producer cannot recognize the forwarded duplicate.
- Order identity is build + vendor + order number. Consumer item identity is a separate durable key, including vendor item ID where available. Description-only or positional matching is insufficient for ambiguous variants.
- Every event is a statement of facts, not an instruction to add quantities. An email repeating ordered quantity does not create another purchase.
- Group events into one review per order; show latest proposed facts with supporting source history. Prefer explicit business event time, then message time when needed; download/queue time must not determine shipment progression.
- New events cannot silently override user decisions, regress shipment progress, or replace confirmed receipt. Conflicts require user selection. Refund/cancellation and receipt are different facts, not a simple numeric status ranking.
- The watch has no current-workbook snapshot. Proposed row changes are built only in Build Desk against its authoritative workbook.
- When an order review opens, capture exactly the event IDs and workbook revision in that proposal. New arrivals are not implicitly approved by an old OK. A fresh check may invalidate/rebuild a proposal with visible notice.
- On order approval, disposition all events included in the accepted consolidated proposal, including redundant older facts, while recording what contributed changes. A no-op already reflected in the workbook may be approved/processed with an explicit no-change explanation.
- Dismiss covers only the selected event set. A later status message for that order can still appear; dismissal does not blacklist the order.

## Durable lifecycle and recovery

| State / failure | Required behavior |
| --- | --- |
| Publish fails or outcome unknown | Watch checks event identity before retry; source remains actionable; do not falsely archive as completed. |
| Published; Gmail handling fails | Retry Gmail steps using existing event; do not republish. |
| Pending downloaded | Cache raw event locally; pending notification reflects unresolved grouped orders. Downloading changes no workbook purchase data. |
| Approved and workbook commit fails | Keep pending and preserve user edits for retry where possible. No Drive move. |
| Approved and workbook commit succeeds | Persist disposition and event IDs in that same commit; move files to Processed afterwards. |
| Dismissed | Persist local dismissal disposition before moving to Dismissed; no quantity or order-data change. |
| Commit succeeds; move fails or app crashes | Persisted disposition suppresses reapplication; retry move on next startup/manual check. Show acknowledgment failure separately from save failure. |
| Invalid/unknown schema | Retain original file, show an attention item; do not count it as successfully processed or delete it. |
| Queue empty | Manual check explicitly says no new updates; failed checks never report empty success. |
| Previously dismissed fact reappears via another message | Use semantic duplicate detection and show prior disposition if needed; do not silently create another purchase. |

Folder location alone is not an exactly-once guarantee. The workbook's durable disposition ledger is authoritative for what this installation applied. Include event ID, source IDs, order/item IDs, action, time, review revision, changes and pending Drive acknowledgment. Apply normal backup/lock/stale-file protections. Preserve enough provenance to recover after restoring a workbook backup; do not assume Processed means an event is reflected in a restored earlier workbook. Recovery from backup must offer explicit reconciliation rather than silently replaying receipts.

## Configuration handoff checklist

Record verified nonsecret values in an implementation completion note:

- Build ID and selected workbook schema/version.
- Old Sheet parent ID; queue root, Pending, Processed and Dismissed folder IDs.
- Contract/schema version and shared fixture location.
- Actual task ID, effective schedule/timezone, enabled state and initial scan window.
- Application OAuth scopes, redirect setup and secret-file locations described without secret values.
- Confirmed writer capability in the scheduled runtime and consumer refresh-token durability.
- Migration/version baseline, acceptance results and known limitations.

No folder IDs or Google authorization configuration have been verified by this planning pass. No task, Drive folder, OAuth client or workbook schema was changed.

## Integration and release order

1. Freeze the shared schema/fixtures and resolve verified folder IDs and free authorization feasibility.
2. Build Desk implements and validates against fixtures; Watch implements the producer and validates the same fixtures. Each can progress independently after the contract is fixed.
3. Test publication and ingestion in an isolated test location with explicit fixtures. Confirm no paid/trial dependency, no silent Gmail loss, and no automatic physical receipts.
4. Test a real relevant event with user review and verify before/after workbook effects, queue disposition and duplicate handling.
5. Activate the revised watch only when queue durability is verified and the consumer is usable, or the user explicitly elects to accumulate a pending backlog. Preserve the existing schedule and perform the agreed labeled-plus-30-day reconciliation.
6. Each session reports its actual changes and remaining steps. Never claim the other effort is complete based solely on these requirements.

## Session kickoff prompts

**Watch session:** Implement `docs/order-watch/requirements.md` using `docs/order-update-coordination.md` as the shared contract. Inspect the actual automation and connected tools first. Do not modify Build Desk application code or the retired Google Sheet. Report readiness gates and task activation state.

**Application session:** Implement the first Purchasing release from `docs/purchasing/requirements.md` and the shared coordination contract. Preserve existing printing behavior and safe Excel persistence. Do not edit or activate the ChatGPT watch. Coordinate shared schema changes explicitly and report the remaining producer activation steps.
