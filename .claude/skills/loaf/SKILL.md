---
name: loaf
description: How to build in a Loaf project (Bun + bun:sqlite + Alpine.js + Tailwind + daisyUI from a CDN, no build step). Use for any change to pages, layouts, data, API routes, styling or themes in this repo. Its rules override the daisyui skill where they conflict.
---

# Loaf

Loaf is a zero-dependency Bun starter. Pages are HTML fragments in `public/` wrapped by a shared layout, data is saved from HTML with `loaf.js`, and custom logic lives in `api/`. Docs: https://anas1412.github.io/loaf/docs.html

## Ground rules

- **No npm dependencies.** Don't run `npm install`, `bun add` or add a `dependencies` field. Use what Bun ships (`Bun.serve`, `bun:sqlite`, `Bun.file`, `bun test`).
- **No build step.** Don't add Vite, bundlers, templating libraries, `tailwind.config.js`, PostCSS, or `@plugin` / `@utility` / `@import "tailwindcss"` CSS. Tailwind, daisyUI and Alpine load from the CDN in `public/_layout.html`.
- **Plain JavaScript**, ES modules, no TypeScript.
- Prefer the simplest layer that works: `loaf-` elements first, Alpine with `collection()` when they can't express it, an `api/` route when you need server logic, and editing `server.js` last.
- Audience: many Loaf users aren't programmers. Write pages with `loaf-` elements and daisyUI classes, and keep Alpine out of pages unless it's needed.
- Run `bun test` after changing `server.js`, `pages.js`, `db.js` or `api/`.

## Project layout

```
public/           served as-is; names starting with _ are private
  _layout.html    shared <head> and frame; pages go in its <main> at <loaf-page>
  _header.html    navbar (with <loaf-theme>)
  _footer.html    footer
  index.html      home page (a fragment)
  demo.html       optional todo demo
  loaf.js         loaf- elements, plus collection() and themePicker under them
api/              one file per route; _files are helpers
server.js         routes, cross-site guard, body limit, dev reload
pages.js          static files, layouts, includes
db.js             database + automatic data API
server.test.js    tests
```

## Pages, layouts and includes

- `public/about.html` is served at `/about`, `public/blog/index.html` at `/blog`. Anything with a path segment starting with `_` returns 404.
- **A new page is a fragment**: no `<html>`, `<head>`, `<body>`, `<main>`, navbar or footer. The layout already puts it in a centered `<main>` column (`max-w-3xl`, `gap-4`). Start it with a `<title>` (it replaces the layout's), then the content:
  ```html
  <title>About · My app</title>

  <h1 class="text-3xl font-bold">About</h1>
  <p>...</p>
  ```
- A full-width section (a hero, a banner) needs a different layout: give that folder its own `_layout.html`, or change the `<main>` in `_layout.html`.
- For page-specific `<head>` tags, start the page with a `<head>...</head>` block instead; its `<title>` replaces the layout's and the other tags are appended to the layout's `<head>`. `<title>` and `<head>` are only picked up at the very top of the file.
- The page is inserted at the layout's `<loaf-page></loaf-page>` (`<slot></slot>` also works). The nearest `_layout.html` wins, looking in the page's folder first, then each parent up to `public/`.
- A page with its own `<html>` tag skips the layout.
- `<loaf-include src="_navbar.html"></loaf-include>` pastes a file in place (`<include>` also works). `src` is relative to `public/`, not to the current file. Includes nest up to 10 levels; a missing file becomes an HTML comment and a terminal warning. Anything inside `<!-- -->` is ignored.
- Shared pieces go in `_` files (`_header.html`, `_card.html`...). Add nav links to `_header.html`. Don't copy the layout's `<head>` into pages.
- Rendered HTML is sent with `Cache-Control: no-cache`; other files with `Last-Modified` and 304s.

## Saving data: `loaf-` elements (use these first)

```html
<title>Notes</title>

<loaf-form name="notes">
  <input name="text" placeholder="Write a note" required>
  <button>Save</button>
</loaf-form>

<loaf-empty name="notes">No notes yet.</loaf-empty>

<loaf-list name="notes">
  <p field="text"></p>
</loaf-list>
```

- Elements with the same `name` share one collection, loaded once per page. No wrapper element is needed; put them anywhere on the page.
- `<loaf-form name>` becomes a `<form>` that saves its named fields, then resets. Checkboxes save booleans, number inputs numbers, the rest strings. Its submit button is disabled while saving.
- `<loaf-list name>` repeats its content per record, newest first. Several children are wrapped in one `<div>`. Inside it, the current record is `item`:
  - `field="key"` shows `item.key` as text (`created_at` as a local date; on an `<img>` it sets `src`).
  - `edit="key"` shows it and makes it click-to-edit; saves on blur or Enter.
  - `toggle="key"` on an input makes it a checkbox that saves `true`/`false`.
  - `remove` on a button deletes the record.
  - Any Alpine attribute can use `item`, e.g. `:class="item.done && 'line-through'"`.
- `<loaf-count name>` shows the number of records; `<loaf-empty name>` shows only when there are none.
- `<loaf-theme>` is the theme menu (a daisyUI `select`).
- **Default styling:** an element without a `class` gets daisyUI's look: form inputs `input grow`, textareas `textarea w-full`, selects `select`, buttons `btn btn-primary`, the form `flex flex-wrap items-center gap-2`, the list `flex flex-col gap-3`, each list item `rounded-box bg-base-100 p-4 shadow-sm` (several children are wrapped in a row: `flex items-center gap-3 rounded-box bg-base-100 p-4 shadow-sm`, and their unstyled `field`/`edit` children get `grow`; not daisyUI `card`, which outlines itself when it holds a checked checkbox), `remove` buttons `btn btn-ghost btn-sm`, `toggle` inputs `checkbox`. Adding any `class` replaces the default for that element, so include the daisyUI classes you still want.
- Elements are converted when Alpine starts, so they must be in the page HTML (layouts and includes count). Don't create them later with JavaScript.

## `collection()` in Alpine (when the elements aren't enough)

`loaf-` elements are built on `x-data="collection('name')"`, which exposes:

| Name | What it does |
|---|---|
| `items` | records, newest first |
| `add($el)` / `add({ ... })` | saves a form's named fields (then resets it), or an object |
| `update(item, { ... })` | merges only the given fields; `null` removes a field |
| `remove(item)` | deletes the record |
| `loading`, `saving`, `error` | first load pending, `add()` running, last error message or `null` |

Records always have `id` and `created_at`; clients can't set those. Everything using the same name on a page shares one state.

## The data API

`collection()` uses these endpoints, which also work with `fetch`:

- `GET /api/<name>` list (newest first), `?limit=20&offset=40` for one page
- `POST /api/<name>` create (body: JSON object)
- `GET /api/<name>/<id>`, `PATCH /api/<name>/<id>` merge, `DELETE /api/<name>/<id>`

Everything is one SQLite table, `records (id, collection, data JSON, created_at)`, in `loaf.db`.

**It has no auth.** Anyone who can reach the site can read, change and delete everything. When a task involves users, logins, private data or a public deployment, say so, and move the endpoints that need protection into `api/` routes with checks. To turn the automatic API off, remove the `// db` lines in `server.js` (and `db.js` if nothing else uses it).

What Loaf already enforces for every route, including `api/` files, so don't re-implement it:

- Non-GET requests from another website (`Sec-Fetch-Site: cross-site`/`same-site`, or a mismatched `Origin`) get `403`. Requests with neither header (curl, servers) pass.
- Request bodies over 1 MB get `413` (`maxRequestBodySize` in `server.js`).

## Custom routes: `api/`

Each `.js` file in `api/` becomes a route. Export one function per HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), each taking a `Request` and returning a `Response`, or `export default` one function for every method.

```js
// api/users/[id].js → /api/users/:id
import { db } from "../db.js";

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)");

export const GET = (req) => {
  const user = db.query("SELECT * FROM users WHERE id = ?").get(req.params.id);
  return user ? Response.json(user) : Response.json({ error: "user not found" }, { status: 404 });
};
```

- `[name]` in a file or folder name becomes a `:name` parameter, read with `req.params.name`. `index.js` maps to its folder's path.
- Files and folders starting with `_` (`api/_auth.js`) are not routes; import them from routes for shared code.
- A file with no method or default export is skipped with a terminal warning, so an empty new file never breaks the server.
- Files in `api/` win over the automatic data API for the same URL.
- `db` is a `bun:sqlite` `Database`. Always use `?` placeholders, never string-built SQL. `CREATE TABLE IF NOT EXISTS` at the top of the file is fine; it runs on each load.
- Validate request bodies: `await req.json().catch(() => null)` and check the shape before using it.
- In `bun dev`, new and deleted `api/` files go live without a restart, and edits restart the server. A file with a syntax error is logged and the previous routes keep running.

## Styling and themes

Use daisyUI components (`btn`, `input`, `card`, `navbar`, `menu`, `table`, `alert`, `modal`...) plus Tailwind utilities for layout. The daisyui skill has the component reference; follow it, except for these CDN rules:

- **Semantic colors only**: `bg-base-100`, `bg-base-200`, `text-base-content`, `text-primary`, `btn-secondary`, `border-base-300`. Never fixed colors like `bg-white` or `text-gray-500`, or the page breaks in other themes.
- **Opacity in steps of 10 only**: `text-base-content/70` exists, `/75` doesn't. Some combinations like `ring-base-300` or `divide-base-300` don't exist; use `border border-base-300` instead. A missing class silently does nothing.
- **Never `@apply` a daisyUI class** in `<style type="text/tailwindcss">`: it throws and stops the whole style block. In custom CSS, use daisyUI's variables: `color: var(--color-primary)`, `color-mix(in oklab, var(--color-base-content) 70%, transparent)`.
- Ignore the daisyui skill's advice to install daisyUI with npm or to customize components with `@plugin` / `@utility`. Those need a build step.
- Direct children of daisyUI's `footer` become grid cells; wrap inline text in `<aside><p>...</p></aside>`.

Theme picker (in `_header.html`, needs `loaf.js`): `<loaf-theme></loaf-theme>`, which becomes `<select x-data="themePicker">`.

It lists the 35 built-in themes, remembers each visitor's choice in `localStorage`, and otherwise uses `<html data-theme="...">` if set, or light/dark following the device. To set a default theme, put `data-theme="coffee"` (or any theme) on `<html>` in `_layout.html`. A custom theme is a plain `<style>` block defining daisyUI's variables under `[data-theme="mytheme"]`: `color-scheme`, `--color-base-100/200/300`, `--color-base-content`, `--color-primary` and `--color-primary-content` (plus secondary, accent, neutral), `--radius-box`, `--radius-field`, `--radius-selector`.

## Removing optional parts

- Demo: delete `public/demo.html` and its link in `public/_header.html`.
- Example route: delete `api/hello.js`.
- Database: delete `db.js` and the `// db` lines in `server.js`. `collection()` then stops working; pages and `api/` routes that don't import `db` keep working.
- Shared layout: delete `public/_layout.html`, `_header.html`, `_footer.html`; each page then needs its own full `<html>` document.

## Settings

`PORT` (default `3000`) and `DB` (default `loaf.db`, `:memory:` for throwaway) from the environment or `.env`. Scripts: `bun dev` (watch + reload new `api/` files), `bun start`, `bun test`.
