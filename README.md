# Simple Table Preview

English | [简体中文](README.zh-CN.md)

<img src="icon.png" alt="Simple Table Preview icon" width="96">

A read-only XLSX and CSV viewer for VS Code and Cursor, with sorting, column filters and resizable columns. Files are parsed locally and are never uploaded by the extension.

## Install

Download `simple-table-preview-0.2.0.vsix` from [Releases](https://github.com/Muchmorepig/simple-table-preview/releases). Open the command palette with **Ctrl+Shift+P** (**Cmd+Shift+P** on macOS), search for `VSIX`, select **Extensions: Install from VSIX…**, and choose the package. Use the same steps to update an existing installation.

Open an `.xlsx` or `.csv` file. If it opens as text, right-click its editor tab and choose **Reopen Editor With… → Table Preview**. You can also set Table Preview as the default editor there.

The interface follows the editor's display language: Chinese locales use Simplified Chinese; other locales use English. Change the editor's display language and restart to switch. Both languages use the same extension package. Requires VS Code 1.85 or a compatible Cursor version.

## Use

- Choose a worksheet in the bottom toolbar. CSV treats the first row as a header by default; XLSX shows all rows. Toggle **First row as header** when needed.
- Click a column title to cycle through ascending, descending and original order. Numbers and scientific notation sort numerically; other values use natural text ordering.
- Drag the right edge of a column title to resize it, or focus the edge with Tab and use the arrow keys (10 pixels per press). Widths range from 80 to 1600 pixels. Hover over clipped data to see the full value. Widths survive sorting, filtering, pagination and worksheet changes; reloading or reopening resets them.
- Filter each column using the syntax below. All active column filters must match. Invalid expressions show a message and retain the last valid results.
- Browse 200 rows per page. Sorting and filtering cover all loaded rows, not just the current page. Row numbers always refer to the source worksheet.
- **Reset sort and filters** restores original order. **Reload file** reads changes saved by other applications.
- CSV supports UTF-8, GB18030/GBK and UTF-16 LE, with automatic delimiter detection.
- Select cell text and use the system copy shortcut. Excel-style range selection and editing are not included.

| Filter | Meaning |
| --- | --- |
| `gene` | Case-insensitive text contains |
| `/^Gene\.09/` | Regular expression |
| `/^gene/i` | Case-insensitive regular expression |
| `<0.05` | Numeric value below 0.05 |
| `>=2` | Numeric value at least 2 |
| `<=1e-100` | Scientific-notation threshold |
| `=0` or `!=0` | Numeric equality or inequality |

Regex flags `i`, `m`, `s` and `u` are supported; `g` and `y` are not. Numeric operators are `<`, `<=`, `>`, `>=`, `=`, `==` and `!=`. Blank and nonnumeric cells never match numeric comparisons. A bare number such as `0.05` still performs text matching.

## Preview limits

- Maximum file size: **20 MiB**; parsing timeout: **15 seconds**.
- Up to **50,000 rows and 200 columns per worksheet**, with a **200,000-cell budget per file**, allocated in worksheet order. Truncated worksheets show a warning; sorting and filtering only apply to loaded data.
- Data only: no Excel styling, charts, merged-cell layout, macros or formula evaluation. Formulas display cached results when available.
- Numbers use JavaScript double precision. CSV text is preserved, but numeric comparisons convert values to numbers. Do not use the viewer to compare integers beyond double-precision accuracy.
- Header settings, sorting and filters reset when switching worksheets or reloading. External file changes require manual reload.
- Regex uses the native JavaScript engine on the UI thread. Expensive backtracking patterns may stall the preview; prefer simple patterns.

## Develop and test

Use Node.js 22:

```sh
npm ci
npm test
npm run package
```

Open this folder in VS Code or Cursor and press **F5** to launch an Extension Development Host. Open a sample XLSX or CSV in that window.

Tests cover parsing, encodings, sorting, regex/numeric filters, localization and the read-only editor provider. Real-data fixtures under `test/fixtures/` are local only and excluded from Git and VSIX packages. Unit tests generate their own data and do not require those fixtures.

An optional browser check uses an existing Playwright installation with Chromium; it is not a runtime dependency:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright TEST_LANGUAGE=en node test/browser-check.js
PLAYWRIGHT_MODULE=/path/to/playwright TEST_LANGUAGE=zh-cn node test/browser-check.js
```

It checks localized labels and errors, resizing, column alignment, retained widths and toolbar layout at several viewport sizes.

Built with the [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors) and [SheetJS Community Edition](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), pinned to the official 0.20.3 distribution. MIT licensed; the bundled SheetJS dependency retains its own license.
