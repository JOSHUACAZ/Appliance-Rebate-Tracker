# ApplianceRebates.com

Static web application rebuilt from `GEA_Rebate_Package_Builder_Commercial_Laundry_Monogram(1).xlsx`.

## Public access and browser privacy

- The calculator is available to every visitor without a username, password, or account.
- User-entered model numbers and calculated package results are processed entirely in the visitor's browser.
- Package entries are saved only in that browser's `localStorage` so the visitor can return to their package later.
- The site contains no form submission, user database, cookies, analytics, or server-side storage.
- Selecting **Clear** removes the saved package from that browser.
- `rebate-data.json` is downloaded as a read-only public data file needed to run the calculator; it does not receive user-entered information.


## Run locally
Because the site loads `rebate-data.json`, serve the folder rather than double-clicking index.html:

```bash
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Publish a shareable link
Deploy the entire folder to Netlify, Vercel, GitHub Pages, Azure Static Web Apps, or another approved host. The custom domain `ApplianceRebates.com` must be separately registered/owned, then its DNS pointed to the host.

## Update rebates
1. Open `admin.html` directly as a maintenance utility. It is intentionally not linked from the public calculator.
2. Edit the JSON and validate it.
3. Download the updated `rebate-data.json`.
4. Replace the deployed `rebate-data.json` file and redeploy.

For a production admin experience where nontechnical users can update data without redeploying, connect this frontend to a database/CMS and add authentication. The current version intentionally remains static, portable, and low-cost.

## Current logic
- Café tiers: 2=$100, 3=$200, 4=$400, 5=$900, 6=$1,400, 7=$2,000, 8=$2,500.
- Café category caps and bonuses mirror workbook notes.
- Profile tiers: 4=$400, 5=$750, 6=$1,100, 7=$1,500, 8=$2,000.
- Commercial Laundry: $150 qualifying washer/dryer pair.
- Monogram: $300 delivery and installation payout for one eligible built-in refrigerator.
