# Annual menu-data workflow

Lunch, dinner, and dessert boards are bundled as static JavaScript. They do not require a runtime API or fetch request, so the same data ships with web, PWA, and packaged WebView builds.

## Files

- `app-v6-menu.js`: 2026 lunch nodes
- `app-v7-menus.js`: 2026 dinner and dessert nodes
- `data/menus/schema.js`: schema, validation, registry, activation
- `data/menus/2026/index.js`: 2026 release metadata
- `data/menus/active.js`: one-line active year switch
- `app-v8-annual.js`: dataset labels and snapshot-safe cloning

## Rules

- Each hub has at most 8 children.
- A terminal menu has no children.
- Sibling titles must be unique.
- Weights are positive numbers.
- Exact public statistics and relative recommendation weights must be described separately.

Run `validateNonetMenuData()` in the browser console to inspect validation results. Run `exportNonetMenuCatalog()` to export the bundled catalog as JSON.

## Updating for a new year

1. Keep old-year files unchanged for reproducibility.
2. Add the new menu trees and `data/menus/YYYY/index.js`.
3. Load the new year file in `index.html` before `data/menus/active.js`.
4. Change only `window.NONET_ACTIVE_MENU_YEAR` in `data/menus/active.js`.
5. Test all three boards, weighted random selection, and cloning.

Built-in boards switch to the active annual release. A board copied with `내 보드로 복제` remains a frozen snapshot so user edits are never overwritten. Its `sourceDataset` records the map id, year, version, update date, schema version, and clone date.
