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
- Prefer the simplest layer that works: an HTML page with `collection()` before an `api/` route, an `api/` route before editing `server.js`.
- Run `bun test` after changing `server.js`, `pages.js`, `db.js` or `api/`.

## Project layout

```
public/           served as-is; names starting with _ are private
  _layout.html    shared <head> and frame, has <slot></slot>
  _header.html    navbar (with the theme picker)
  _footer.html    footer
  index.html      home page (a fragment)
  demo.html       optional todo demo
  loaf.js         frontend helper: collection() and themePicker
api/              one file per route; _files are helpers
server.js         routes, cross-site guard, body limit, dev reload
pages.js          static files, layouts, includes
db.js             database + automatic data API
server.test.js    tests
```

## Pages, layouts and includes

- `public/about.html` is served at `/about`, `public/blog/index.html` at `/blog`. Anything with a path segment starting with `_` returns 404.
- **A new page is a fragment**: no `<html>`, `<head>`, `<body>`, navbar or footer. Start it with a `<title>` (it replaces the layout's), then the content, usually in a `<main>`:
  ```html
  <title>About · My app</title>

  <main class="mx-auto max-w-3xl p-8">...</main>
  ```
- For page-specific `<head>` tags, start the page with a `<head>...</head>` block instead; its `<title>` replaces the layout's and the other tags are appended to the layout's `<head>`. `<title>` and `<head>` are only picked up at the very top of the file.
- The page is inserted at the layout's `<slot></slot>`. The nearest `_layout.html` wins, looking in the page's folder first, then each parent up to `public/`.
- A page with its own `<html>` tag skips the layout.
- `<include src="_navbar.html"></include>` (or `<include src="..." />`) pastes a file in place. `src` is relative to `public/`, not to the current file. Includes nest up to 10 levels; a missing file becomes an HTML comment and a terminal warning. Anything inside `<!-- -->` is ignored.
- Shared pieces go in `_` files (`_header.html`, `_card.html`...). Add nav links to `_header.html`. Don't copy the layout's `<head>` into pages.
- Rendered HTML is sent with `Cache-Control: no-cache`; other files with `Last-Modified` and 304s.

## Saving data from HTML: `collection()`

For lists of things (posts, todos, contacts), use `collection('name')` instead of writing fetch code or routes. The name is created on first save.

```html
<div x-data="collection('posts')">
  <form @submit.prevent="add($el)">
    <input name="title" class="input" required>
    <input name="featured" type="checkbox" class="checkbox">
    <button class="btn btn-primary" :disabled="saving">Add</button>
  </form>

  <p x-show="error" x-text="error" class="text-error"></p>
  <p x-show="!loading && !items.length">No posts yet.</p>

  <template x-for="post in items" :key="post.id">
    <article>
      <h2 x-text="post.title"></h2>
      <button class="btn btn-sm" @click="update(post, { pinned: !post.pinned })">Pin</button>
      <button class="btn btn-sm" @click="remove(post)">Delete</button>
    </article>
  </template>
</div>
```

| Name | What it does |
|---|---|
| `items` | records, newest first |
| `add($el)` | on a `<form>`: saves its named fields, then resets the form |
| `add({ ... })` | saves an object |
| `update(item, { ... })` | merges only the given fields; `null` removes a field |
| `remove(item)` | deletes the record |
| `loading` | `true` until the first load finishes |
| `saving` | `true` while `add()` runs; repeat calls are ignored |
| `error` | last error message or `null` |

- Records always have `id` and `created_at`; clients can't set those.
- `add($el)` turns checkboxes into booleans, `type="number"`/`range` into numbers (empty → `null`), radios into the checked value, everything else into strings. File inputs are skipped.
- All `collection('posts')` components on one page share one state, loaded once. Use a second one for a counter (`x-text="items.length"`) instead of passing data around.
- The page's collections are loaded when the page loads; there's no live sync with other tabs or users.

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

Theme picker (in `_header.html`, needs `loaf.js`):

```html
<select x-data="themePicker" class="select select-sm" aria-label="Theme"></select>
```

It lists the 35 built-in themes, remembers each visitor's choice in `localStorage`, and otherwise uses `<html data-theme="...">` if set, or light/dark following the device. To set a default theme, put `data-theme="coffee"` (or any theme) on `<html>` in `_layout.html`. A custom theme is a plain `<style>` block defining daisyUI's variables under `[data-theme="mytheme"]`: `color-scheme`, `--color-base-100/200/300`, `--color-base-content`, `--color-primary` and `--color-primary-content` (plus secondary, accent, neutral), `--radius-box`, `--radius-field`, `--radius-selector`.

## Removing optional parts

- Demo: delete `public/demo.html` and its link in `public/_header.html`.
- Example route: delete `api/hello.js`.
- Database: delete `db.js` and the `// db` lines in `server.js`. `collection()` then stops working; pages and `api/` routes that don't import `db` keep working.
- Shared layout: delete `public/_layout.html`, `_header.html`, `_footer.html`; each page then needs its own full `<html>` document.

## Settings

`PORT` (default `3000`) and `DB` (default `loaf.db`, `:memory:` for throwaway) from the environment or `.env`. Scripts: `bun dev` (watch + reload new `api/` files), `bun start`, `bun test`.
