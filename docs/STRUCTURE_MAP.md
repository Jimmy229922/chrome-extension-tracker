# Project Structure Map

This extension is now organized around runtime responsibilities instead of a flat root.

## Top-Level Layout

- `assets/`
  - Static assets shared by pages.
- `docs/`
  - Project documentation and refactoring notes.
- `pages/`
  - User-facing extension pages grouped by feature area.
- `scripts/`
  - Local maintenance and packaging scripts.
- `src/`
  - Runtime logic, shared utilities, content scripts, and i18n resources.
- `tests/`
  - Local test and parsing helpers.

## Page Layout

- `pages/sidepanel/`
  - Main side panel shell.
  - `sidepanel-core.js`: shared DOM refs, state, toast, translations.
  - `sidepanel-modals.js`: modal windows and modal interaction logic.
  - `sidepanel-tabs.js`: tab switching, search, filter wiring, lazy-init hooks.
  - `core/sidepanel-app.js`: app container for feature initialization and shared service access.
  - `features/`: split feature logic previously inside `sidepanel.js`.
    - `01-critical-watchlist.js`: VIP watchlist state and rendering.
    - `02-data-rendering.js`: settings sync, account/IP loading and rendering.
    - `03-profit-wallets.js`: profit calculator and wallets list behavior.
    - `04-transfer-report.js`: transfer report, notes, user settings, telegram, mentions.
    - `05-deposit-report.js`: deposit percentage report logic.
    - `06-withdrawal-report.js`: withdrawal report, draft persistence, wallet duplicate checks.
    - `07-evaluation-entry.js`: employee evaluation button visibility and navigation.
    - `08-credit-out.js`: credit-out section complete flow and settings modal.
    - `09-bootstrap.js`: lazy tab initializers and initial tab load.
- `pages/options/`
  - Extension settings page.
- `pages/popup/`
  - Browser action popup.
- `pages/reports/`
  - Report-oriented pages such as transfer, credit-out, evaluation, and activity reports.
- `pages/alerts/`
  - Alert and notification windows.
- `pages/tools/`
  - Standalone utility pages such as wallets, hedge checker, classification helper, and price checker.
- `pages/dev/`
  - Development-only or experimental UI files.

## Runtime Layout

- `src/runtime/`
  - Background service worker and offscreen document files.
- `src/content/`
  - Content scripts and shared browser-page guards.
- `src/shared/`
  - Utilities reused across multiple pages.
  - `services/`
    - `storage-service.js`: unified async wrappers for local/sync storage.
    - `ip-geo-service.js`: normalized IP lookup helpers built on top of `IPGeoClient`.
    - `report-submit-service.js`: background report submission + image payload helpers.
- `src/i18n/`
  - Translation JSON files.

## Asset Layout

- `assets/images/`
  - Extension icons and image resources.
- `assets/styles/`
  - Shared stylesheets and design tokens.
