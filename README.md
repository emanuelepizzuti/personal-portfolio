# emanuelepizzuti.github.io

Personal portfolio — hosted on GitHub Pages, data from Google Sheets.

---

## 1. GitHub Pages setup

For the site to be live at `https://emanuelepizzuti.github.io`:

- The repo **must be named** `emanuelepizzuti.github.io` on GitHub.
- Go to **Settings → Pages → Source** and select `main` / `/ (root)`.
- Your site goes live at `https://emanuelepizzuti.github.io` within ~1 minute of pushing.

---

## 2. Google Sheets setup

### Create the sheet

Make a Google Sheet with these column headers in row 1 (exact spelling):

| name | url | platform | fields | description | thumbnail |
|------|-----|----------|--------|-------------|-----------|
| Forma Studio | https://behance.net/... | Behance | Branding, Typography | Short blurb | https://... |

- **fields**: comma-separated list of categories, e.g. `Branding, Typography, Motion`
- **platform**: where the project lives (Behance, Instagram, etc.)
- **description** and **thumbnail**: optional, stored for future use

### Publish the sheet as CSV

1. **File → Share → Publish to web**
2. First dropdown → **Sheet1**
3. Second dropdown → **Comma-separated values (.csv)**
4. Click **Publish** and copy the URL

### Wire it up

Open `script.js` and paste the URL into `CONFIG.SHEET_URL`:

```js
const CONFIG = {
  SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/YOUR_LONG_ID/pub?output=csv',
  ...
};
```

Also fill in your social handles in the same `CONFIG` block.

---

## 3. Customisation

All easy changes live at the top of `script.js` in the `CONFIG` object:

| Key | What it does |
|-----|--------------|
| `SHEET_URL` | Google Sheets CSV URL |
| `TAGLINE` | Text shown in the header centre |
| `LINKEDIN` | Your LinkedIn profile URL |
| `INSTAGRAM` | Your Instagram profile URL |
| `BEHANCE` | Your Behance profile URL |
| `EMAIL` | Your email address |
| `TICKER` | Footer scrolling text |

CSS custom properties in `style.css` (`:root` block) control all colours.

---

## 4. How the graph works

- Each **node** is a field/category from your sheet.
- Node **size** scales with how many projects use that field.
- Two nodes are **connected** when they appear together in at least one project.
- Hovering a project button in the sidebar **highlights** its field nodes and dims the rest.
- You can **drag nodes** to rearrange the graph manually.
