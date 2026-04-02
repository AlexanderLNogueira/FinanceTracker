# Changelog

## 2026-04-02

Added
- UI tests under `tests/ui`

## 2026-03-30

Changed
- Centralized shared constants in `js/config`
- UI validation delegates to data-layer validation rules
- Theme dropdown items are rendered dynamically
- Dropdown wiring uses a shared binding helper

## 2026-03-29

Fixed
- Theme problems

## 2026-03-28

Fixed
- Keyboard (tab) accessibility

## 2026-03-26

Changed
- Date sorting uses timezone-safe parsing
- Sort button states use theme-aware CSS variables

Fixed
- Pagination controls now include aria-labels for screen readers
- Unknown themes fall back to default instead of leaving UI unset

## 2026-03-25

Changed
- Timezone-safe date parsing and inclusive date-range boundaries
- Import guards for non-object entries
- CSV amount escaping and unescape on import
- localStorage save errors surface in UI
- Shared typedefs and concise JSDoc updates
- Added test coverage for date/utils, helpers, storage, and import edge cases

## 2026-03-24

Added
- Modular app layering (`js/app`, `js/state`, `js/ui`, `js/data`, `js/utils`)
- Centralized state store with render pipeline
- Import/export workflows for JSON and CSV (comma/semicolon) with date-range support
- Sorting, filtering, search, and pagination with page-size selector
- Slide-out edit panel workflow for updating transactions
- Theme selector with persisted preference and toast notifications
- Expenses-by-category chart rendering with data-change optimizations
- Dev seed helper for generating sample data
- Vitest test suite for data modules (`transactions`, `dateRange`, `export`, `import`)

Changed
- Shared date-range filtering for exports and in-app filters
- DOM rendering uses safe element construction to avoid HTML injection

## 2026-03-23

Changed
- Chart rendering no longer destroys/recreates when paginating; Updates only when data changes
- Refactored architecture into state/app/data/ui layers with a single entry point and dev seed module

Fixed
- General cleanup and small fixes around

## 2026-03-22

Added
- Console seed helper `seedDataInTransactionsTab(count, daysBack)` for generating sample data
- Search and pagination controls for the transactions table

Changed
- Transactions render via safe DOM construction to prevent HTML injection
- Date-range filtering is shared between exports and in-app filters
- Edit panel error clearing scoped to the edit form
- Toast notifications clear previous timers to avoid premature dismissal
- Toast notifications display as bottom-right popups
- Updated `README.md`

Removed
- Unused view-mode state, card rendering, and hamburger menu wiring

## 2026-03-20

Added
- Export workflow with date-range filtering and JSON/CSV (comma/semicolon) downloads
- Theme selector with persisted preference
- Slide-out edit panel for updating transactions
- Import result feedback (imported, skipped, invalid)
- Inline message area for success/error feedback

Changed
- Transactions render as a compact table by default with row click-to-edit
- Navbar now hosts the Import / Export and Theme selector menus

## 2026-03-19

Added
- Created centralized state module
- Added import (JSON/CSV) workflow
- Added expenses-by-category chart (Chart.js)
- Added filters for type and date range

Changed
- Switched transaction IDs to UUIDs with fallback
- Moved transaction validation into data layer
- Updated `README.md`

## 2026-03-17

- Basic idea (Created)
