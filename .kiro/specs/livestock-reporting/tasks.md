# Implementation Plan: Livestock Reporting

## Overview

Implement the read-only React Reports module incrementally: establish report contracts and test tooling, build pure validation/filtering/ordering/summary functions, add the asynchronous report controller, compose accessible report views, integrate navigation and responsive/print styling, and validate existing GET payloads and the production build. Each coding prompt builds on earlier prompts and ends with the complete module wired into the existing application; no report write route or database schema change is introduced.

## Tasks

- [ ] 1. Establish report contracts, data access, and test foundations
  - [ ] 1.1 Create shared report contracts and presentation schemas
    - Create `client/src/reports/reportConfig.js` with report-type constants, empty filter factories, summary definitions, required table-column definitions, and human-readable labels for Purchase, Sales, and Animal Weight.
    - Keep row data numeric and unformatted in domain state; expose schema metadata that the React layer can use without duplicating report rules.
    - Define the valid measurement-type values and initial Purchase selection used by the controller and UI.
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 3.1, 3.4, 4.1, 4.3_

  - [ ] 1.2 Create the read-only report data source adapter
    - Create `client/src/reports/reportDataSource.js` and map Purchase, Sales, and Weight retrieval to `api.getPurchases()`, `api.getSales()`, and `api.getWeights()` respectively.
    - Expose only `retrieve(reportType)` so the reporting controller cannot create, update, or delete source records.
    - Reject unknown report types without issuing an HTTP request.
    - _Requirements: 1.4, 5.9, 7.1_

  - [ ]* 1.3 Configure pinned automated-test dependencies and non-watch scripts
    - Add exact, Node 22/React 19/Vite 8-compatible versions of Vitest, jsdom, React Testing Library, `user-event`, fast-check, and the selected browser automation package to the appropriate workspace manifests and lockfile.
    - Add non-watch client test, coverage-optional, and browser-test scripts plus shared jsdom/setup configuration; ensure CI-oriented commands use one-shot execution rather than watch mode.
    - Configure fast-check tests to run at least 100 generated cases and preserve seed/counterexample output.
    - _Requirements: 1.1–7.6_

  - [ ]* 1.4 Create reusable report property-test generators
    - Create test support modules for valid ISO dates, optional ranges, normalized text variants, unique positive IDs, duplicate dates, finite bounded quantities/prices/costs/weights, valid filters, rows, and arbitrary applied snapshots.
    - Include shuffled collections, case/whitespace variants, tag-prefix traps, deep-freezing helpers, and simple independent reference predicates/reductions.
    - Keep generators domain-neutral where possible so every formal property can use the same bounded, reproducible data conventions.
    - _Requirements: 1.4, 2.2–2.8, 3.2–3.9, 4.2–4.9, 5.1–5.5, 7.2–7.6_

- [ ] 2. Implement pure validation, filtering, ordering, and summaries
  - [ ] 2.1 Implement shared filter normalization and validation
    - Create `client/src/reports/domain/reportFilters.js` with strict ISO-date validation, inclusive optional date predicates, trim/case-fold helpers, valid date-order checks, and required Animal ID/tag validation.
    - Return normalized filter objects plus field-associated errors without mutating draft inputs; reject malformed dates and unexpected measurement types before retrieval.
    - Preserve empty optional fields while requiring the Weight tag to contain non-whitespace text.
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 5.6_

  - [ ] 2.2 Implement Purchase report derivation
    - Create `client/src/reports/domain/purchaseReport.js` with conjunctive inclusive-date and normalized substring filtering for supplier, species, and breed.
    - Return a new array ordered by purchase date descending and ID descending without sorting or changing source arrays/objects.
    - Reduce only filtered rows into record count, purchased quantity, and `quantity × unitCost + transportCost` total purchase cost.
    - _Requirements: 2.2, 2.3, 2.5, 2.6, 2.7, 2.8, 7.2_

  - [ ] 2.3 Implement Sales report derivation
    - Create `client/src/reports/domain/salesReport.js` with conjunctive inclusive-date and normalized substring filtering for customer, species, and breed.
    - Return a new array ordered by sale date descending and ID descending without mutating source data.
    - Reduce only filtered rows into record count, sold quantity, `quantity × unitPrice` revenue, and realized profit from the API-projected revenue and linked landed-cost-based cost values; validate finite numeric inputs.
    - _Requirements: 3.2, 3.3, 3.5, 3.6, 3.7, 3.8, 3.9, 7.3, 7.4_

  - [ ] 2.4 Implement Animal Weight report derivation
    - Create `client/src/reports/domain/weightReport.js` with exact normalized Animal ID/tag equality, inclusive dates, and optional exact measurement-type filtering.
    - Return a new array ordered by measurement date descending and ID descending without mutating source data.
    - Summarize zero, one, and many rows; use ascending `(weightDate, id)` extrema and compute latest minus earliest weight, with greater same-date ID treated as later.
    - _Requirements: 4.2, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 7.5, 7.6_

  - [ ] 2.5 Compose atomic applied report snapshots
    - Create `client/src/reports/domain/reportDomain.js` to dispatch validation and report-specific derivation through one `buildReport` boundary.
    - Construct a fresh applied snapshot containing the report type, normalized applied filters, immutable derived rows/summary, one captured generation timestamp, and source request ID.
    - Fail malformed source rows as derivation/data errors instead of producing misleading totals; do not modify source collections.
    - _Requirements: 1.3, 1.4, 6.1, 6.4, 6.5, 6.6, 6.7, 7.1_

  - [ ]* 2.6 Write the property test for source-record preservation
    - Create a dedicated property test file and implement exactly one fast-check test with at least 100 runs and the required feature/property comment.
    - **Property 1: Report derivation preserves source records**
    - Generate deep-frozen Purchase, Sales, and Weight source collections and assert arrays and source objects remain structurally unchanged after report derivation.
    - **Validates: Requirements 1.4**

  - [ ]* 2.7 Write the property test for inclusive optional date ranges
    - Create a dedicated property test file and implement exactly one fast-check test with absent, start-only, end-only, and two-boundary ranges, including rows exactly on populated boundaries.
    - **Property 2: Date ranges have inclusive optional boundaries**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 2.8 Write the property test for exact Purchase match sets
    - Create a dedicated property test file and implement exactly one fast-check test comparing Purchase results to an independent conjunctive reference predicate across text case, surrounding whitespace, and optional fields.
    - **Property 3: Purchase filtering returns exactly the conjunctive match set**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 2.9 Write the property test for Purchase ordering
    - Create a dedicated property test file and implement exactly one fast-check test that preserves matching IDs and checks each adjacent pair by descending `(purchaseDate, id)` chronology, including duplicate dates and shuffled inputs.
    - **Property 4: Purchase rows follow deterministic descending chronology**
    - **Validates: Requirements 2.8**

  - [ ]* 2.10 Write the property test for Purchase summaries
    - Create a dedicated property test file and implement exactly one fast-check test comparing count, quantity, and total purchase cost to an independent reduction, using a documented decimal tolerance.
    - **Property 5: Purchase summary is the exact reduction of filtered rows**
    - **Validates: Requirements 2.5, 2.6, 2.7, 7.2**

  - [ ]* 2.11 Write the property test for exact Sales match sets
    - Create a dedicated property test file and implement exactly one fast-check test comparing Sales results to an independent conjunctive reference predicate across optional dates and normalized text filters.
    - **Property 6: Sales filtering returns exactly the conjunctive match set**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.12 Write the property test for Sales ordering
    - Create a dedicated property test file and implement exactly one fast-check test that preserves matching IDs and checks each adjacent pair by descending `(saleDate, id)` chronology.
    - **Property 7: Sales rows follow deterministic descending chronology**
    - **Validates: Requirements 3.9**

  - [ ]* 2.13 Write the property test for Sales accounting summaries
    - Create a dedicated property test file and implement exactly one fast-check test comparing count, quantity, formula-derived revenue, and `revenue − cost` realized profit to independent reductions with decimal tolerance.
    - **Property 8: Sales summary is the exact accounting reduction of filtered rows**
    - **Validates: Requirements 3.5, 3.6, 3.7, 3.8, 7.3**

  - [ ]* 2.14 Write the property test for exact Weight match sets
    - Create a dedicated property test file and implement exactly one fast-check test covering exact normalized tags, nonmatching tag prefixes/substrings, optional inclusive dates, and exact measurement types.
    - **Property 9: Weight filtering requires an exact normalized tag and all optional predicates**
    - **Validates: Requirements 4.2**

  - [ ]* 2.15 Write the property test for Weight ordering
    - Create a dedicated property test file and implement exactly one fast-check test that preserves matching IDs and checks descending `(weightDate, id)` order across duplicate dates and shuffled inputs.
    - **Property 10: Weight rows follow deterministic descending chronology**
    - **Validates: Requirements 4.9**

  - [ ]* 2.16 Write the property test for Weight chronological summaries
    - Create a dedicated property test file and implement exactly one fast-check test for empty, one-row, and many-row sets, including same-date ID tie-breaking and latest-minus-earliest weight change.
    - **Property 11: Weight summary uses deterministic chronological extrema**
    - **Validates: Requirements 4.4, 4.5, 4.6, 4.7, 4.8, 7.5, 7.6**

- [ ] 3. Checkpoint — Ensure pure-domain tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement asynchronous report controller behavior
  - [ ] 4.1 Implement report state transitions and stale-response guards
    - Create `client/src/reports/reportControllerState.js` with pure state transitions for draft edits, report selection, loading, successful ready/empty commits, validation errors, retrieval errors, and request-generation checks.
    - Keep `draftFilters` separate from applied filters and preserve the entire last valid snapshot when validation or retrieval fails.
    - Accept a response only when both request ID and selected report type match the latest user intent; derive print eligibility solely from valid non-empty ready state.
    - _Requirements: 1.1, 1.3, 5.4, 5.5, 5.7, 5.8, 6.3, 6.10, 7.1_

  - [ ] 4.2 Implement `useReportController`
    - Create `client/src/reports/useReportController.js` to coordinate report selection, draft updates, pre-request validation, retrieval, atomic derivation, apply, clear, refresh, retry, and guarded printing.
    - Retrieve the selected collection on module entry, valid selection/apply, refresh, and retry; Purchase is the initial type, while Weight without a tag enters required-tag validation without issuing a GET.
    - Make Retry use the selected report's active valid filters, increment the request token, and issue a new request; make Clear reset every selected-type field, including the required Weight tag.
    - Inject the data source, clock, and print function for deterministic tests and expose no source-record mutation callback.
    - _Requirements: 1.1, 1.4, 5.4, 5.5, 5.6, 5.8, 5.9, 5.10, 5.11, 6.3, 6.4, 6.10, 7.1_

  - [ ]* 4.3 Write the property test for invalid-date snapshot preservation
    - Create a dedicated property test file and implement exactly one fast-check test over arbitrary controller states containing a last valid report and arbitrary reversed date drafts; assert validation error output and structural equality of all applied snapshot fields.
    - **Property 12: Invalid date ranges cannot replace the last valid report**
    - **Validates: Requirements 5.4, 5.5**

  - [ ]* 4.4 Write focused controller tests for retrieval, retry, clear, and concurrency
    - Verify entry/selection/refresh retrieval, ready versus empty commits, stable retrieval-error copy, Retry issuing a new request, rejection followed by success, and stale responses being ignored.
    - Verify missing Weight tag prevents retrieval, corrected filters apply, clear resets all fields, invalid drafts preserve the valid snapshot, and print guards call the injected print function only once for ready non-empty state.
    - Use deferred promises and adapter spies; assert only read-adapter methods are reachable.
    - _Requirements: 1.1, 1.4, 5.5–5.11, 6.3, 6.10, 7.1_

- [ ] 5. Build and compose the React Reports user interface
  - [ ] 5.1 Implement accessible report selection and filter controls
    - Create `ReportTypeSelector.jsx` and type-specific filter components that consume shared schemas, emit string draft values, associate validation messages with fields, and expose Apply/Clear controls.
    - Provide accessible selected state for Purchase, Sales, and Animal Weight; switch filter controls, summaries, and columns as one report-type operation.
    - Keep the required Animal ID/tag input visible and empty after Weight filters are cleared.
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 4.1, 5.4, 5.6, 5.10, 5.11_

  - [ ] 5.2 Implement active filters, summaries, and complete report tables
    - Create `ActiveFilterSummary.jsx`, `ReportSummary.jsx`, and `ReportTable.jsx` driven by the applied snapshot and shared schema definitions.
    - Render only populated applied filters, using `All records` for unfiltered Purchase/Sales; render every required type-specific summary and column value with formatting only at the view boundary.
    - Keep every table cell in the DOM, use record IDs as keys, omit edit/delete controls, and provide an accessible horizontal-scroll label.
    - _Requirements: 2.4–2.7, 3.4–3.8, 4.3–4.8, 6.1, 6.2_

  - [ ] 5.3 Implement report status and printable presentation components
    - Create `ReportStatePanel.jsx` for announced loading, report-specific empty guidance, field/actionable validation messages, and retrieval errors with Retry.
    - Create `PrintableReport.jsx` from the current applied snapshot only, including report title, captured generation date, populated filters, current summary, complete row set, and reusable table headings.
    - Mark screen-only controls and print-only content explicitly so CSS can omit navigation, filters, retry/refresh/print actions, and management controls during printing.
    - _Requirements: 5.4, 5.6, 5.7, 5.8, 5.9, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 5.4 Compose `ReportsPage` with the controller and applied snapshot
    - Create `client/src/reports/ReportsPage.jsx` and compose type selection, draft controls, active applied filters, state panel, summary, complete table, refresh, and guarded print action.
    - Present active filters, summary, and rows from the same atomic applied snapshot; show mutually exclusive loading/empty/error states while retaining the last valid result internally.
    - Enable Print only for ready non-empty results, inject data source/clock/print dependencies, and expose no report record-management action.
    - _Requirements: 1.1–1.4, 5.7–5.9, 6.1, 6.3, 6.4, 6.10_

  - [ ]* 5.5 Write selector and filter component tests
    - Verify Purchase is initially selected, all report choices have accessible names/state, each type exposes exactly the required controls, labels and field errors are associated, and Apply/Clear emit the correct draft values.
    - Verify Purchase/Sales empty filters are valid, Weight whitespace tags are rejected, and clearing Weight leaves the required empty input visible.
    - _Requirements: 1.1–1.3, 2.1, 3.1, 4.1, 5.4, 5.6, 5.10, 5.11_

  - [ ]* 5.6 Write summary, table, and state component tests
    - Use representative applied snapshots to assert every required heading/value, type-specific summary label, one-measurement unavailable text, active-filter scope, no management actions, and all rows/columns remain rendered.
    - Verify report-specific empty guidance, announced loading, date/tag validation alerts, stable retrieval-error message, Retry action, and disabled print behavior for empty/error states.
    - _Requirements: 2.4–2.7, 3.4–3.8, 4.3–4.8, 5.4–5.8, 6.1, 6.2, 6.10_

  - [ ]* 5.7 Write `ReportsPage` interaction and print-region tests
    - Exercise selection, valid apply, invalid apply preservation, clear, refresh, failed retrieval/retry, and stale-request flows through user-visible controls with a fake read-only adapter.
    - Assert Print is enabled only for ready non-empty data, calls the injected function once, and the printable region uses the applied rather than draft filters while including title, generation date, summary, and every row.
    - _Requirements: 1.1–1.4, 5.4–5.11, 6.1, 6.3–6.7, 6.10, 7.1_

- [ ] 6. Integrate Reports navigation, responsive layout, and print media styling
  - [ ] 6.1 Wire Reports into the existing application shell
    - Update `client/src/App.jsx` to add Reports to shared desktop/mobile navigation and page copy, render `ReportsPage` for the destination, and pass the read-only data source without coupling Reports to the existing global mutable ledger arrays.
    - Add or map a Reports icon in `client/src/Icons.jsx` and preserve every existing destination/action.
    - Ensure entering Reports initializes Purchase and allows the controller to retrieve a fresh source snapshot independently of initial application loading.
    - _Requirements: 1.1, 1.2, 1.4, 7.1_

  - [ ] 6.2 Add responsive and print-specific report styles
    - Update `client/src/styles.css` with responsive report controls, summaries, state panels, and horizontally scrollable tables whose required columns are never hidden at narrow widths; update the mobile navigation grid for the additional destination.
    - Add `@media print` and `@page` rules that isolate the printable report, retain all columns/rows, repeat `thead` as a table header group, avoid row fragmentation, and use practical margins.
    - Hide sidebar, top/mobile navigation, filter controls, retry/refresh/print controls, screen notices, and record-management controls in print while retaining title, generation date, populated filters, summary, and table.
    - _Requirements: 6.2, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 6.3 Write application-shell navigation integration tests
    - Verify both desktop and mobile navigation include Reports without removing existing destinations, selecting Reports displays its page copy and Purchase report, and no create/delete action is exposed in the module.
    - Assert a Reports retrieval uses only the selected existing GET adapter and does not reuse a stale application-load array.
    - _Requirements: 1.1, 1.2, 1.4, 7.1_

  - [ ]* 6.4 Add automated narrow-viewport report validation
    - Add a browser test at desktop and narrow mobile widths that loads deterministic report fixtures, verifies horizontal access/overflow, and asserts every required column and record value remains rendered for all three report types.
    - Verify the additional mobile navigation item remains reachable and accessible; capture diagnostics on failure without replacing semantic assertions with screenshots.
    - _Requirements: 1.2, 2.4, 3.4, 4.3, 6.2_

  - [ ]* 6.5 Add automated print-media validation
    - Add browser/CSS assertions for print media that verify hidden application/filter/action controls, visible title/date/filters/summary/full table, `table-header-group` headings, page-break-protected rows, and configured page margins.
    - Use enough deterministic rows to span multiple pages for Purchase, Sales, and Animal Weight and assert no required column or applied row is omitted from the print document.
    - _Requirements: 6.3–6.10_

- [ ] 7. Validate existing API contracts, accounting, freshness, and read-only behavior
  - [ ]* 7.1 Configure isolated server integration testing
    - Add exact compatible test dependencies and a non-watch test script to the server workspace, updating the shared lockfile without changing runtime dependencies.
    - Build helpers that assign a unique temporary `DATABASE_PATH` before importing database/app modules, seed deterministic purchases/sales/weights, and close/remove each temporary database after tests.
    - Keep tests in-process and avoid starting a long-running development server.
    - _Requirements: 1.4, 7.1, 7.4_

  - [ ]* 7.2 Write existing GET payload and accounting integration tests
    - Seed linked purchase, sale, and weight rows and verify `/api/purchases`, `/api/sales`, and `/api/weights` satisfy the designed source-row contracts and deterministic ordering.
    - Verify purchase total/landed cost and Sales revenue, cost, and profit use the linked source purchase's landed unit cost with decimal tolerance.
    - _Requirements: 2.4, 3.4, 4.3, 7.2, 7.3, 7.4, 7.6_

  - [ ]* 7.3 Write freshness and GET-only non-mutation integration tests
    - Change temporary database source data between two report retrievals and assert the second derivation uses the later response snapshot.
    - Capture source row counts/values before and after report retrieval and print-controller interaction; assert report flows issue only GET requests and persisted records remain unchanged.
    - _Requirements: 1.4, 7.1_

- [ ] 8. Final checkpoint and validation gates
  - [ ]* 8.1 Run the complete client unit, component, and property suite
    - Run the one-shot Vitest command and confirm all 12 formal property tests execute at least 100 cases with their required `Feature: livestock-reporting, Property N: ...` comments.
    - Confirm focused component/controller tests cover validation, empty/error/retry, stale requests, accessible controls, complete columns, clear behavior, and print guards.
    - _Requirements: 1.1–7.6_

  - [ ]* 8.2 Run isolated API/database integration tests
    - Run the non-watch server integration command and confirm source contracts, linked landed-cost accounting, freshness, GET-only access, and persisted-row non-mutation pass against temporary SQLite databases.
    - _Requirements: 1.4, 2.4, 3.4, 4.3, 7.1–7.4, 7.6_

  - [ ]* 8.3 Run responsive and print browser checks
    - Run the one-shot browser suite for desktop/mobile overflow and all three multi-page printable reports; retain failing browser artifacts only for diagnosis.
    - Confirm accessible navigation and controls, complete on-screen columns, print visibility rules, repeated headings, protected rows, and margins.
    - _Requirements: 1.2, 2.4, 3.4, 4.3, 6.2–6.10_

  - [ ]* 8.4 Run the production build
    - Run the root/client production build after all integrations and resolve import, JSX, bundling, and stylesheet failures without starting a development server or watcher.
    - _Requirements: 1.1–7.6_

## Notes

- Tasks marked with `*` are optional validation tasks and may be skipped for a faster MVP; core implementation tasks are required.
- Each of the 12 formal design properties has one separate fast-check task, at least 100 generated runs, and explicit requirements traceability.
- All test and browser commands must be one-shot/non-watch commands. No task starts a development server, watcher, or interactive print preview.
- The implementation remains read-only and reuses the existing Purchase, Sales, and Weight GET endpoints; no report table, write route, or report persistence is added.
- Checkpoints ensure the pure domain is validated before controller/UI integration and that final automated/build gates run after complete wiring.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "5.1", "7.2", "7.3"] },
    { "id": 3, "tasks": ["2.5", "2.7", "2.8", "2.9", "2.10", "2.11", "2.12", "2.13", "2.14", "2.15", "2.16", "5.2", "5.3"] },
    { "id": 4, "tasks": ["2.6", "4.1", "5.5", "5.6"] },
    { "id": 5, "tasks": ["4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4", "5.4"] },
    { "id": 7, "tasks": ["5.7", "6.1", "6.2"] },
    { "id": 8, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3", "8.4"] }
  ]
}
```
