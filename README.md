# ApplianceRebates.com - Scheduled Rebates + Printable Forms

Static GitHub Pages web app. No login, database, or server is required.

## What's new in this version

- Date-aware rebate programs with `startDate` and `endDate`.
- Future programs can be uploaded early and activate automatically on their effective date.
- Expired programs automatically disappear from the public calculator.
- Each program is tied to its official rebate PDF in `/rebates`.
- **Print Eligible Rebate Forms** builds one PDF packet in the user's browser containing only programs currently returning a payout greater than $0.
- Model numbers and calculated results remain browser-local.
- BrandSource GE Labor Day Savings is preloaded for **August 27, 2026 - September 16, 2026**.

## Current scheduled timeline

- Cafe Express Yourself: 2026-07-01 through 2026-12-31
- GE Profile Innovation: 2026-07-01 through 2026-12-31
- GE Commercial Laundry Pair: 2026-07-01 through 2026-09-01
- Monogram Delivery & Installation: 2026-07-01 through 2026-09-30
- BrandSource GE Labor Day Savings: 2026-08-27 through 2026-09-16

Dates are inclusive and are evaluated using the visitor's local browser date.

## GitHub upload

Upload the **contents of this folder** to the root of the `Appliance-Rebate-Tracker` repository, replacing the existing files. Keep the `rebates` folder intact.

Required root files:

- `index.html`
- `styles.css`
- `app.js`
- `rebate-data.js`
- `rebate-data.json`
- `admin.html`
- `rebates/` folder with the official PDFs

GitHub Pages should remain configured to deploy from `main` and `/ (root)`.

## Testing scheduled activation before August 27

The public interface uses today's browser date. For private testing only, append a date query to the URL:

`?date=2026-08-27`

Example:

`https://joshuacaz.github.io/Appliance-Rebate-Tracker/?date=2026-08-27`

This lets you verify the Labor Day rebate before it becomes active. Remove the query parameter for normal use.

## Printing

When one or more active programs calculate a payout greater than $0, the **Print Eligible Rebate Forms** button becomes enabled. It combines only those official PDFs into a single browser-generated PDF packet. The packet is created locally in the visitor's browser.

The PDF merge uses the browser build of `pdf-lib` loaded from jsDelivr. No entered appliance models are transmitted to that library or service.

## Future rebate updates

1. Copy the new official rebate PDF into `/rebates`.
2. Open `admin.html` or edit `rebate-data.json` directly.
3. Add a new program/version with a unique `id`, its model list/rules, `startDate`, `endDate`, and `pdf` path.
4. Download/replace both `rebate-data.json` and `rebate-data.js`.
5. Upload the new PDF and both data files to GitHub.
6. Commit the changes. GitHub Pages republishes automatically.

You do **not** need to remove the currently active rebate before uploading its replacement. The dates control which version is shown.

## Privacy

- No account or password is required.
- Model entries and results use browser `localStorage` only.
- There is no user database or submission endpoint.
- Clearing the package removes its saved browser data.


## Automatic update / cache handling

This release uses build version `2026.08.21.1`. The page references the stylesheet, rebate data, and application script with a version query string so a new deployment does not reuse an older cached asset.

`site-version.json` is checked with `cache: no-store` when the app opens, when the tab regains focus, and every five minutes while it remains open. If a newer deployed version is detected, the app reloads itself with the new build identifier.

For every future deployment, change the version in all four places together:

- `site-version.json` → `version`
- `app.js` → `APP_BUILD_VERSION`
- `index.html` → the `?v=` value on `styles.css`, `rebate-data.js`, and `app.js`
- Optionally update the published date / notes in `site-version.json`

This means users can keep using the same GitHub Pages URL and will receive future versions automatically after the new files are deployed. A one-time hard refresh after installing this release is still recommended for users who currently have the pre-cache-aware version open.


## 2026-08-26 rebate update

- Added GE Refrigeration Labor Day Bonus (GEPPKLD26), active 2026-08-27 through 2026-09-16, $100 for one qualifying GE Profile or Café refrigerator.
- Replaced the GE Commercial Laundry form with version 8.19.26 and extended its active end date through 2026-09-30.
- Predictive text, print behavior, browser-local storage, and all other existing site behavior are unchanged.


## Google Analytics 4

Measurement ID: `G-2TX46QFNKC`

This build tracks page visits through GA4 plus anonymous custom events for `check_rebates`, `rebate_qualified`, `print_results`, and `print_eligible_rebate_forms`. Appliance model numbers are not sent to GA4. Event parameters include package size, qualifying rebate count, total calculated rebate amount, rebate program identifier, rebate amount, and forms count where applicable.
