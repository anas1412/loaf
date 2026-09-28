---
name: loaf
description: How to build in a Loaf project (Bun + bun:sqlite + Alpine.js + Tailwind + daisyUI from a CDN, no build step). Use for any change to pages, data, API routes, styling or themes in this repo. Its rules override the daisyui skill where they conflict.
---

# Loaf

Loaf is a zero-dependency Bun starter. Pages are plain HTML in `public/`, data is saved from HTML with `loaf.js`, and custom logic lives in `api/`. Docs: https://anas1412.github.io/loaf/docs.html

## Ground rules

- **No npm dependencies.** Don't run `npm install`, `bun add` or add a `dependencies` field. Use what Bun ships (`Bun.serve`, `bun:sqlite`, `Bun.file`, `bun test`).
- **No build step.** Don't add Vite, bundlers, `tailwind.config.js`, PostCSS, or `@plugin` / `@utility` / `@import "tailwindcss"` CSS. Tailwind, daisyUI and Alpine load from the CDN in each page's `<head>`.
- **Plain JavaScript**, ES modules, no TypeScript.
- Prefer the simplest layer that works: an HTML page with `collection()` before an `api/` route, an `api/` route before editing `server.js`.
- Run `bun test` after changing `server.js`, `db.js` or `api/`.

## Project layout

```
public/         pages, images, scripts, served as-is
  index.html    home page
  loaf.js       frontend helper: collection() and themePicker
  demo.html     optional todo demo
api/            one file per route
server.js       the engine: pages, api/ routes, data API
db.js           database + the automatic data API
server.test.js  tests
```

## Pages

`public/about.html` is served at `/about`, `public/blog/index.html` at `/blog`. Every new page copies the `<head>` from `public/index.html`, which loads, in this order:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.7.46" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/daisyui@5.7.46/themes.css" />
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3"></script>
<script src="/loaf.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js"></script>
```

`loaf.js` must load before Alpine. Keep the pinned versions the same across pages.

## Saving data from HTML: `collection()`

For lists of things (posts, todos, contacts), use `collection('name')` instead of writing fetch code or routes. The name is created on first save.

```html
<div x-data="collection('posts')">
  <form @submit.prevent="add($el)">
    <input name="title" class="input" required>
    <button class="btn btn-primary">Add</button>
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
| `add($el)` | on a `<form>`: saves its named inputs, then resets the form |
| `add({ ... })` | saves an object |
| `update(item, { ... })` | merges only the given fields; `null` removes a field |
| `remove(item)` | deletes the record |
| `loading` | `true` until the first load finishes |
| `error` | last error message or `null` |

Records always have `id` and `created_at`; clients can't set those. Form values arrive as strings, so convert numbers or booleans with `update()` or in a custom route if needed.

## The data API

`collection()` uses these endpoints, which also work with `fetch`:

- `GET /api/<name>` list, `POST /api/<name>` create (body: JSON object)
- `GET /api/<name>/<id>`, `PATCH /api/<name>/<id>` merge, `DELETE /api/<name>/<id>`

Everything is one SQLite table, `records (id, collection, data JSON, created_at)`, in `loaf.db`.

**It has no auth.** Anyone who can reach the site can read, change and delete everything. When a task involves users, logins, private data or a public deployment, say so, and move the endpoints that need protection into `api/` routes with checks. To turn the automatic API off entirely, remove the `// db` lines in `server.js` (and `db.js` if nothing else uses it).

## Custom routes: `api/`

Each `.js` file in `api/` becomes a route. Export one function per HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`), each taking a `Request` and returning a `Response`.

```js
// api/users/[id].js → /api/users/:id
import { db } from "../db.js";

export const GET = (req) => {
  const user = db.query("SELECT * FROM users WHERE id = ?").get(req.params.id);
  return user ? Response.json(user) : Response.json({ error: "user not found" }, { status: 404 });
};
```

- `[name]` in a file or folder name becomes a `:name` parameter, read with `req.params.name`. `index.js` maps to its folder's path.
- Files in `api/` win over the automatic data API for the same URL.
- `db` is a `bun:sqlite` `Database`. Create your own tables with `db.run("CREATE TABLE IF NOT EXISTS ...")` at the top of the route file. Always use `?` placeholders, never string-built SQL.
- Validate request bodies: `await req.json().catch(() => null)` and check the shape before using it.
- `bun dev` reloads when an existing file changes, but doesn't notice a **new** file in `api/`. After adding one, tell the user to restart `bun dev`.

## Styling and themes

Use daisyUI components (`btn`, `input`, `card`, `navbar`, `table`, `alert`, `modal`...) plus Tailwind utilities for layout. The daisyui skill has the component reference; follow it, except for these CDN rules:

- **Semantic colors only**: `bg-base-100`, `bg-base-200`, `text-base-content`, `text-primary`, `btn-secondary`, `border-base-300`. Never fixed colors like `bg-white` or `text-gray-500`, or the page breaks in other themes.
- **Opacity in steps of 10 only**: `text-base-content/70` exists, `/75` doesn't. Some combinations like `ring-base-300` or `divide-base-300` don't exist; use `border border-base-300` instead. A missing class silently does nothing.
- **Never `@apply` a daisyUI class** in `<style type="text/tailwindcss">`: it throws and stops the whole style block. In custom CSS, use daisyUI's variables: `color: var(--color-primary)`, `color-mix(in oklab, var(--color-base-content) 70%, transparent)`.
- Ignore the daisyui skill's advice to install daisyUI with npm or to customize components with `@plugin` / `@utility`. Those need a build step.

Theme picker (needs `loaf.js`):

```html
<select x-data="themePicker" class="select select-sm" aria-label="Theme"></select>
```

It lists the 35 built-in themes, remembers each visitor's choice in `localStorage`, and otherwise uses `<html data-theme="...">` if set, or light/dark following the device. To set a default theme, put `data-theme="coffee"` (or any theme) on `<html>`. A custom theme is a plain `<style>` block defining daisyUI's variables under `[data-theme="mytheme"]`: `color-scheme`, `--color-base-100/200/300`, `--color-base-content`, `--color-primary` and `--color-primary-content` (plus secondary, accent, neutral), `--radius-box`, `--radius-field`, `--radius-selector`.

## Removing optional parts

- Demo: delete `public/demo.html`.
- Example route: delete `api/hello.js`.
- Database: delete `db.js` and the `// db` lines in `server.js`. `collection()` then stops working; pages and `api/` routes that don't import `db` keep working.

## Settings

`PORT` (default `3000`) and `DB` (default `loaf.db`, `:memory:` for throwaway) from the environment or `.env`. Scripts: `bun dev`, `bun start`, `bun test`.
