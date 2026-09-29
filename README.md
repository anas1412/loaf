<p align="center">
  <img src="public/logo.svg" alt="Loaf" width="120" height="120">
</p>

<h1 align="center">Loaf</h1>

<p align="center">A Bun starter project. Clone it, run one command, start building.</p>

<p align="center"><a href="https://anas1412.github.io/loaf/">Website</a> · <a href="https://anas1412.github.io/loaf/docs.html">Docs</a></p>

## Why

- **Zero setup**: no accounts, no database server, no `.env` required.
- **Zero build**: the HTML you write is what the browser gets.
- **Zero dependencies**: Bun ships the server, the database, the watcher and the test runner.
- **No backend code needed**: save and load data straight from HTML. Write routes only when you want custom logic.
- **Shared layouts**: one `<head>`, navbar and footer for every page, with no templating language.
- **35 themes**: daisyUI components and a theme picker, light and dark, out of the box.

## Quick start

Requires Bun 1.2.3 or newer.

```bash
bunx degit anas1412/loaf my-app
cd my-app
bun dev
```

Open http://localhost:3000. The todo demo is at http://localhost:3000/demo.

## Project structure

```
public/           your pages, images and scripts
  _layout.html    the shared <head> and page frame
  _header.html    the navbar, included by the layout
  _footer.html    the footer, included by the layout
  index.html      the home page
  demo.html       optional todo demo
  loaf.js         frontend helper: collection() and the theme picker
api/              your own routes, one file per route
server.js         the Loaf engine: routes and security
pages.js          serves public/, with layouts and includes
db.js             the database and the automatic data API
.claude/skills/   guides for AI assistants
```

## Pages

Every file in `public/` is served as-is. HTML pages get clean URLs:

| File                      | URL      |
|---------------------------|----------|
| `public/index.html`       | `/`      |
| `public/about.html`       | `/about` |
| `public/blog/index.html`  | `/blog`  |

Files and folders starting with `_` are private: they're never served on their own, so they're the place for layouts and shared pieces.

## Layouts and includes

A page doesn't need `<html>`, `<head>` or a navbar. Write only what's unique to it:

```html
<!-- public/about.html -->
<title>About · My app</title>

<main class="p-8">
  <h1 class="text-3xl font-bold">About us</h1>
</main>
```

Loaf puts it inside `public/_layout.html`, where the layout has `<slot></slot>`. A `<title>` at the top of the page replaces the layout's. A page without one keeps the layout's.

The layout is a normal HTML page that holds everything shared:

```html
<!-- public/_layout.html -->
<!doctype html>
<html lang="en">
  <head>
    <title>My app</title>
    <!-- CSS and scripts every page needs -->
  </head>
  <body>
    <include src="_header.html"></include>
    <slot></slot>
    <include src="_footer.html"></include>
  </body>
</html>
```

- **Includes**: `<include src="_header.html"></include>` pastes that file in place. Paths start from `public/`, and includes can contain includes, so a navbar can include a logo, for example.
- **Extra `<head>` tags for one page**: start the page with a `<head>` block instead. Its tags are added to the layout's `<head>`:
  ```html
  <head>
    <title>Contact</title>
    <meta name="description" content="How to reach us">
  </head>
  <main>...</main>
  ```
- **A different layout for one folder**: put a `_layout.html` in that folder. Each page uses the nearest one, looking in its own folder first, then up.
- **No layout**: a page with its own `<html>` tag is served as it is. Includes still work in it.
- A commented-out `<include>` or `<slot>` is ignored.

Pages use [Alpine.js](https://alpinejs.dev) for interactivity, and [Tailwind CSS](https://tailwindcss.com) with [daisyUI](https://daisyui.com) for styling. All three load from a CDN in `_layout.html`, so there's nothing to install.

## Styling and themes

daisyUI gives you ready-made components, so a button is just `class="btn btn-primary"`:

```html
<button class="btn btn-primary">Save</button>
<input class="input" placeholder="Your name">
<div class="card bg-base-100 shadow-sm">
  <div class="card-body">A card</div>
</div>
```

Browse all components at [daisyui.com/components](https://daisyui.com/components/). Tailwind classes like `mt-4` or `flex` work alongside them.

**Theme picker.** `_header.html` already has one:

```html
<select x-data="themePicker" class="select select-sm" aria-label="Theme"></select>
```

It lists all 35 daisyUI themes, grouped into light and dark, and remembers each visitor's choice. It needs `loaf.js`.

**Default theme.** Without a choice, pages follow the device's light or dark mode. To use one theme by default, set it on the `<html>` tag in `_layout.html`:

```html
<html lang="en" data-theme="coffee">
```

Visitors can still switch with the picker. Use daisyUI's color classes (`bg-base-100`, `text-primary`, `btn-secondary`) rather than fixed colors like `bg-white`, so your page follows every theme.

**Colors in your own CSS.** daisyUI's color classes like `text-primary`, `bg-base-200` and `border-base-300` work in your HTML, with two limits when everything comes from the CDN:

- Only shades in steps of 10 exist: `text-base-content/70` works, `text-base-content/75` doesn't. Some combinations, like `ring-base-300`, don't exist at all. A missing class silently does nothing.
- Tailwind's `@apply` doesn't know daisyUI's classes and stops the whole style block with an error.

In your own CSS, use daisyUI's variables instead, so the color still follows the theme:

```css
.note {
  color: var(--color-primary);
  background: color-mix(in oklab, var(--color-base-content) 5%, transparent);
}
```

## Saving data without writing a backend

`loaf.js` is loaded by the layout. Use `collection('name')` on any element. The name can be anything: it's created the first time you save to it.

```html
<div x-data="collection('posts')">
  <form @submit.prevent="add($el)">
    <input name="title" required>
    <input name="featured" type="checkbox">
    <button :disabled="saving">Add post</button>
  </form>

  <template x-for="post in items" :key="post.id">
    <article>
      <h2 x-text="post.title"></h2>
      <button @click="remove(post)">Delete</button>
    </article>
  </template>
</div>
```

Inside `collection('posts')` you get:

| Name                    | What it does                                                |
|-------------------------|-------------------------------------------------------------|
| `items`                 | all saved records, newest first                             |
| `add($el)`              | on a `<form>`: saves its named fields, then clears the form |
| `add({ title: "Hi" })`  | saves any object you pass                                   |
| `update(item, { ... })` | changes only the fields you pass, e.g. `{ done: true }`     |
| `remove(item)`          | deletes the record                                          |
| `loading`               | `true` until the first load finishes                        |
| `saving`                | `true` while `add()` is saving; extra clicks are ignored    |
| `error`                 | the last error message, or `null`                           |

- Every record gets an `id` and a `created_at` automatically.
- `add($el)` saves checkboxes as `true`/`false`, number inputs as numbers, and everything else as text.
- Every `collection('posts')` on a page shares the same items, so a counter in the navbar and a list further down stay in sync.

## The data API

`collection()` talks to this API, and you can call it from anywhere with `fetch`:

| Request                           | What it does                                      |
|-----------------------------------|---------------------------------------------------|
| `GET /api/posts`                  | list all posts, newest first                      |
| `GET /api/posts?limit=20&offset=40` | one page of posts                               |
| `POST /api/posts`                 | save the JSON object in the body                  |
| `GET /api/posts/5`                | get one post                                      |
| `PATCH /api/posts/5`              | change the fields in the body, `null` removes one |
| `DELETE /api/posts/5`             | delete it                                         |

Everything is stored in `loaf.db`, a single SQLite file.

> **Before you go public:** the data API has no login. Anyone who can open your site can read, change and delete every record. That's fine on your own machine and for prototypes. For a public site, remove the `// db` lines from `server.js` and write your own routes in `api/` with the checks you need.

Loaf does protect you from two things automatically, for the data API and your own routes:

- **Other websites can't change your data.** Browsers mark requests that come from another site, and Loaf answers those with `403` for anything but `GET`. Tools like `curl` aren't affected.
- **Uploads are capped at 1 MB.** Bigger requests get a `413`. Change `maxRequestBodySize` in `server.js` if you need more.

## Your own routes

Every `.js` file in `api/` becomes a route. Export a function for each HTTP method:

```js
// api/hello.js → /api/hello
export const GET = () => Response.json({ message: "Hello" });
```

Put a name in brackets for a URL parameter:

```js
// api/users/[id].js → /api/users/:id
export const GET = (req) => Response.json({ id: req.params.id });

export const POST = async (req) => {
  const body = await req.json();
  return Response.json({ id: req.params.id, received: body }, { status: 201 });
};
```

- `export default` handles every method with one function.
- Files and folders starting with `_`, like `api/_auth.js`, aren't routes. Use them for code you share between routes.
- With `bun dev`, new files go live as soon as you save them, with no restart. A file that doesn't export anything yet is skipped with a message in the terminal.
- Your routes win over the data API when both match the same URL.

To use the database directly, import it:

```js
import { db } from "../db.js";

export const GET = () => Response.json(db.query("SELECT COUNT(*) AS count FROM records").get());
```

`db` is a [`bun:sqlite`](https://bun.sh/docs/api/sqlite) database, so you can create your own tables too.

## Starting clean

Everything optional can be deleted:

- **No demo:** delete `public/demo.html` and its link in `public/_header.html`.
- **No example route:** delete `api/hello.js`.
- **No database:** delete `db.js` and the lines marked `// db` in `server.js`. `collection()` stops working, but pages and `api/` routes keep working.
- **No shared layout:** delete `public/_layout.html`, `_header.html` and `_footer.html`, and give each page its own `<html>`.

## Using with AI assistants

Loaf ships two [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) in `.claude/skills/`, so an AI assistant working in your project knows how Loaf works:

- `loaf`: the rules of this project: no build step, layouts, `collection()`, `api/` routes, themes and the CDN limits.
- `daisyui`: daisyUI's official component reference, copied from [daisyui.com/llms.txt](https://daisyui.com/llms.txt) (MIT, by the daisyUI authors).

To update the daisyUI skill, run this in your project folder:

```bash
curl -sL https://daisyui.com/llms.txt -o .claude/skills/daisyui/SKILL.md
```

Not using an AI assistant? Delete `.claude/`.

## Scripts

| Command     | What it does                                           |
|-------------|--------------------------------------------------------|
| `bun dev`   | start, restart on save, and pick up new `api/` files   |
| `bun start` | start for production                                   |
| `bun test`  | run tests                                              |

Set these in the environment or in a `.env` file:

- `PORT`: server port (default `3000`)
- `DB`: database file (default `loaf.db`, use `:memory:` for a throwaway one)

## Going to production

The Tailwind CDN build compiles styles in the browser, and the daisyUI CDN file includes every component. That's fine for small apps and prototypes. When you outgrow it, switch to the [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli) with the [daisyUI plugin](https://daisyui.com/docs/install/) and serve the generated CSS file from `public/`.

Files in `public/` are sent with `Last-Modified`, so browsers only download them again when they change.

Back up `loaf.db`. That file is your whole database.

## License

[MIT](LICENSE)
