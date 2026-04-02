# Finance Tracker

A simple, modular finance tracker built with vanilla HTML, CSS, and JavaScript. Track income and expenses, see your balance, and keep everything in your browser with localStorage.

## Features

- Add income and expense transactions with description, amount, category, date, and type
- Edit transactions in a slide-out panel and delete entries
- Sort by date, amount, description, category, or type
- Filter by type and date range
- Balance summary (income, expenses, and total)
- Export data as JSON or CSV (comma/semicolon) with date ranges
- Import data from JSON or CSV
- Expenses by category chart (Chart.js)
- Theme selector with saved preference
- Toast notifications for feedback
- Search (description/category) and pagination with page-size selector
- Clear all transactions
- Responsive layout for desktop and mobile

## Tech Stack

- HTML, CSS, JavaScript (ES6 modules)
- Chart.js (CDN)
- Browser localStorage for persistence
- Vitest (data + light UI tests)

## Getting Started

1. Clone or download the project
2. Open `index.html` in your browser
3. Start tracking

## Usage

- Add a transaction using the form
- Click a row or **Edit** to update a transaction in the slide-out panel
- Click **Delete** to remove a transaction
- Use **Sort by** to change order
- Use **Filters** to narrow by type or date range
- Use **Search** to match description or category
- Use **Pagination** (top/bottom) to browse results and change page size
- Use **Import / Export** in the top bar to load or download JSON/CSV for a selected date range
- Use **Theme Selector** to switch the look

## Debug / Seed Data

For quick testing, you can seed sample data from the browser console:

```js
seedDataInTransactionsTab(); // defaults to 150 entries over the last 365 days
seedDataInTransactionsTab(50, 30); // 50 entries over the last 30 days
```

## Import/Export Formats

- JSON: an array of transactions, or an object containing a `transactions` array
- CSV: a header row with `ID, Description, Amount, Category, Date, Type` (comma or semicolon)

## Project Structure

- `js/app/`
  - `controller.js` app logic and state mutations
  - `bindings.js` DOM event wiring
  - `render.js` central render pipeline
- `js/config/`
  - `constants.js` shared app constants (page sizes, limits)
- `js/data/`
  - `storage.js` localStorage CRUD
  - `transactions.js` transaction logic
  - `dateRange.js` shared date-range filtering
  - `export.js` export helpers
  - `import.js` import parsing
- `js/dev/`
  - `seed.js` console seed helper
- `js/state/`
  - `state.js` centralized app state
- `js/ui/`
  - `form.js` form handling and validation
  - `renderer.js` UI rendering and sorting
  - `editPanel.js` edit panel logic
  - `importer.js` import UI
  - `chart.js` chart rendering
  - `theme.js` theme dropdown rendering
- `js/utils/`
  - `helpers.js` formatting, messages, themes
  - `date.js` date parsing helpers
- `js/main.js` app entry point
- `js/types.js` shared JSDoc typedefs
- `tests/data/`
  - `transactions.test.js`
  - `dateRange.test.js`
  - `export.test.js`
  - `import.test.js`
  - `storage.test.js`
- `tests/ui/`
  - `renderer.test.js`
  - `form.test.js`
- `tests/utils/`
  - `date.test.js`
  - `helpers.test.js`

## License

This project is open source and available under the MIT License.
