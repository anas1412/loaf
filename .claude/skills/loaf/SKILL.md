---
name: loaf
description: How to build in a Loaf project (static HTML pages powered by one CDN script, loaf.js, with Tailwind + daisyUI + Alpine; hosted on GitHub Pages or any static host; no server, no build step). Use for any change to pages, layouts, saved data, styling or themes in this repo. Its rules override the daisyui skill where they conflict.
---

# Loaf

A Loaf site is a folder of HTML files. Each page starts with one script tag that loads Loaf from a CDN; Loaf then loads Tailwind, daisyUI and Alpine, wraps the page in `_layout.html`, pastes in `<loaf-include>` pieces and turns the `loaf-` elements into working HTML, all in the browser. Docs: https://anas1412.github.io/loaf/docs.html

## Ground rules

- **Static only.** No server code, no npm packages, no build step, no bundlers, no `tailwind.config.js`, no `@plugin` / `@utility` / `@import "tailwindcss"` CSS. Everything must work when the folder is served by GitHub Pages.
- **Every page's first line** is the Loaf script. Don't add Tailwind, daisyUI or Alpine yourself; Loaf loads them.
  ```html
  <script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.3/loaf.js"></script>
  ```
- **Audience:** many Loaf users aren't programmers. Write pages with `loaf-` elements and daisyUI classes, and keep Alpine out of pages unless it's needed.
- Prefer the simplest layer that works: plain HTML + daisyUI, then `loaf-` elements, then Alpine with `collection()`.
- Plain JavaScript only, no TypeScript.
- If `loaf.js` itself is in the repo (the Loaf starter), don't edit it for a site's needs; it's the library, and pages load the CDN copy anyway.

## Project layout

```
index.html        home page
demo.html         optional todo demo
_layout.html      the page frame: <head> extras, <loaf-page>, includes
_header.html      navbar, with <loaf-theme>
_footer.html      footer
logo.svg, favicon.svg
.nojekyll         keeps GitHub Pages from hiding the _ files; never delete it
test/             browser tests for loaf.js (open /test/ through a local server)
loaf.js           the library source (only in the Loaf repo itself)
```

## Pages, layouts and includes

- **A page is a fragment**: the script line, a `<title>`, then content. No `<html>`, `<head>`, `<body>`, `<main>`, navbar or footer; the layout puts the page in a centered `<main>` column (`max-w-3xl`, `gap-4`).
  ```html
  <script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.3/loaf.js"></script>
  <title>About · My site</title>

  <h1 class="text-3xl font-bold">About</h1>
  <p>...</p>
  ```
- Page-specific `<meta>` or `<link>` tags can go right after the `<title>`; the browser puts them in the head.
- `_layout.html` is a full HTML document. Loaf copies its `<html>` attributes (like `lang`, `data-theme`), adds its `<head>` children to the page's head (its `<title>` only if the page has none), copies its `<body>` attributes, and puts the page where `<loaf-page></loaf-page>` is. Scripts in the layout and includes run.
- `<loaf-include src="_nav.html"></loaf-include>` pastes a file in place, and includes can nest (up to 10 levels). Commented-out includes are ignored.
- **Paths are relative to the site's main folder** (Loaf adds a `<base>` tag). Links are `about.html`, images `photo.jpg`, includes `_header.html`. Never start them with `/`: that breaks on GitHub Pages project sites (`name.github.io/repo/`). Link to `.html` files; `./` is the home page.
- **Pages in sub-folders** add `data-root="../"` (or `../../`) to the script tag so Loaf finds `_layout.html` and relative paths resolve from the main folder.
- `data-layout="none"` on the script tag skips the layout; `data-layout="_other.html"` uses a different one.
- The page is hidden until Loaf has built it (at most ~4s if something fails to load).
- Opening files with `file://` doesn't work (browsers block `fetch` there). Use a local server (`npx serve`, `python3 -m http.server`, VS Code Live Server) or GitHub Pages.

## Saving data: `loaf-` elements (use these first)

```html
<loaf-form name="notes">
  <input name="text" placeholder="Write a note" required>
  <button>Save</button>
</loaf-form>

<loaf-empty name="notes">No notes yet.</loaf-empty>

<loaf-list name="notes">
  <p field="text"></p>
</loaf-list>
```

- Data is stored **in the visitor's browser** (`localStorage`, key `loaf:<site path>:data:<name>`). It survives reloads, stays on the device, and each visitor sees only their own. Other tabs of the same site update live. **Nothing is shared between visitors**: don't build guestbooks, comments, sign-up lists or anything multi-user with it; say that it needs a backend.
- Elements with the same `name` share one collection per page. No wrapper element is needed.
- `<loaf-form name>` becomes a `<form>` that saves its named fields, then resets. Checkboxes save booleans, number inputs numbers, the rest strings. Its submit button is disabled while saving.
- `<loaf-list name>` repeats its content per record, newest first. Several children are wrapped in one `<div>`. Inside it, the current record is `item`:
  - `field="key"` shows `item.key` as text (`created_at` as a local date; on an `<img>` it sets `src`).
  - `edit="key"` shows it and makes it click-to-edit; saves on blur or Enter.
  - `toggle="key"` on an input makes it a checkbox that saves `true`/`false`.
  - `remove` on a button deletes the record.
  - Any Alpine attribute can use `item`, e.g. `:class="item.done && 'line-through'"`.
- `<loaf-count name>` shows the number of records; `<loaf-empty name>` shows only when there are none.
- `<loaf-theme>` is the theme menu (a daisyUI `select`).
- `<loaf-icon name="house"></loaf-icon>` shows a [Lucide](https://lucide.dev/icons) icon (kebab-case names like `shopping-cart`, `trash-2`, `chef-hat`), 1em big in `currentColor`. Size it with Tailwind (`size-5`), color it with text classes (`text-primary`). It's decorative (`aria-hidden`) unless it has `label="…"`; icon-only buttons need either a `label` or an `aria-label` on the button. Use icons, not emoji, for UI.
- **Default styling:** an element without a `class` gets daisyUI's look: form inputs `input grow`, textareas `textarea w-full`, selects `select`, buttons `btn btn-primary`, the form `flex flex-wrap items-center gap-2`, the list `flex flex-col gap-3`, each list item `rounded-box bg-base-100 p-4 shadow-sm` (several children are wrapped in a row: `flex items-center gap-3 rounded-box bg-base-100 p-4 shadow-sm`, and their unstyled `field`/`edit` children get `grow`), `remove` buttons `btn btn-ghost btn-sm`, `toggle` inputs `checkbox`. Adding any `class` replaces the default for that element.
- Elements are converted when Alpine starts, so they must be in the page, layout or includes. Don't create them later with JavaScript.

## `collection()` in Alpine (when the elements aren't enough)

`loaf-` elements are built on `x-data="collection('name')"`:

| Name | What it does |
|---|---|
| `items` | records, newest first |
| `add($el)` / `add({ ... })` | saves a form's named fields (then resets it), or an object |
| `update(item, { ... })` | merges only the given fields; `null` removes a field |
| `remove(item)` | deletes the record |
| `loading`, `saving`, `error` | first load pending, `add()` running, last error message or `null` |

Records always have a numeric `id` and an ISO `created_at`; they can't be set by the page. `loafData.list/add/update/remove(name, …)` is the same store without Alpine.

## Styling and themes

Use daisyUI components (`btn`, `input`, `card`, `navbar`, `menu`, `table`, `alert`, `modal`, `hero`, `timeline`...) plus Tailwind utilities for layout. The daisyui skill has the component reference; follow it, except for these CDN rules:

- **Semantic colors only**: `bg-base-100`, `bg-base-200`, `text-base-content`, `text-primary`, `btn-secondary`, `border-base-300`. Never fixed colors like `bg-white` or `text-gray-500`, or the page breaks in other themes.
- **Opacity in steps of 10 only**: `text-base-content/70` exists, `/75` doesn't. Some combinations like `ring-base-300` or `divide-base-300` don't exist; use `border border-base-300`. A missing class silently does nothing.
- **No responsive prefixes on daisyUI classes**: `md:timeline-horizontal` or `lg:card-side` don't work (Tailwind utilities like `md:flex` do).
- **Never `@apply` a daisyUI class** in `<style type="text/tailwindcss">`: it throws and stops the whole style block. In custom CSS, use daisyUI's variables: `color: var(--color-primary)`.
- Ignore the daisyui skill's advice to install daisyUI with npm or to use `@plugin` / `@utility`.
- Don't use daisyUI `card` for an element that directly contains a checkbox; `card` outlines itself when that checkbox is checked. Use `rounded-box bg-base-100 p-4`.
- Direct children of daisyUI's `footer` become grid cells; wrap inline text in `<aside><p>...</p></aside>`.

Themes: `<loaf-theme></loaf-theme>` lists the 35 built-in themes and remembers each visitor's choice. The default is `data-theme` on `<html>` in `_layout.html`, or light/dark following the device. A custom theme is a plain `<style>` in `_layout.html`'s head defining daisyUI's variables under `[data-theme="mytheme"]` (`color-scheme`, `--color-base-100/200/300`, `--color-base-content`, `--color-primary`, `--color-primary-content`, secondary, accent, neutral, `--radius-box`, `--radius-field`, `--radius-selector`).

## Hosting and updating

- GitHub Pages: Settings → Pages → deploy from `main`. Keep `.nojekyll`. Netlify and Cloudflare Pages also work with no settings.
- `@0.3` in the script URL follows every 0.3.x release, which are fixes only. New features ship in a new minor version (0.4): change the number on every page to use them. Browsers cache the `@0.3` file for up to a week, so never rely on a feature from a newer patch.
