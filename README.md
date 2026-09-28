<p align="center">
  <img src="public/logo.svg" alt="Loaf" width="120" height="120">
</p>

<h1 align="center">Loaf</h1>

<p align="center">A Bun starter project. Clone it, run one command, start building.</p>

<p align="center"><a href="https://anas1412.github.io/loaf/">Website</a> · <a href="https://anas1412.github.io/loaf/docs.html">Docs</a></p>

## Why

- **Zero setup**: no accounts, no database server, no `.env` required.
- **Zero build**: the HTML you write is what the browser gets.
- **35 themes**: daisyUI components and a theme picker, light and dark, out of the box.
- **Zero dependencies**: Bun ships the server, the database, the watcher and the test runner.
- **No backend code needed**: save and load data straight from HTML. Write routes only when you want custom logic.

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
public/         your pages, images and scripts
  index.html    the home page
  loaf.js       frontend helper: collection() and the theme picker
  demo.html     optional todo demo
api/            your own routes, one file per route
server.js       the Loaf engine
db.js           the database and the automatic data API
```

## Pages

Every file in `public/` is served as-is. HTML pages get clean URLs:

| File                      | URL      |
|---------------------------|----------|
| `public/index.html`       | `/`      |
| `public/about.html`       | `/about` |
| `public/blog/index.html`  | `/blog`  |

Pages use [Alpine.js](https://alpinejs.dev) for interactivity, and [Tailwind CSS](https://tailwindcss.com) with [daisyUI](https://daisyui.com) for styling. All three load from a CDN, so there's nothing to install. Copy the `<head>` from `public/index.html` into new pages.

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

**Theme picker.** Put this anywhere, for example in your navbar:

```html
<select x-data="themePicker" class="select select-sm" aria-label="Theme"></select>
```

It lists all 35 daisyUI themes, grouped into light and dark, and remembers each visitor's choice. It needs `loaf.js`.

**Default theme.** Without a choice, pages follow the device's light or dark mode. To use one theme by default, set it on the `<html>` tag:

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

Load `loaf.js` before Alpine, then use `collection('name')` on any element. The name can be anything: it's created the first time you save to it.

```html
<div x-data="collection('posts')">
  <form @submit.prevent="add($el)">
    <input name="title" required>
    <button>Add post</button>
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
| `add($el)`              | on a `<form>`: saves its named inputs, then clears the form |
| `add({ title: "Hi" })`  | saves any object you pass                                   |
| `update(item, { ... })` | changes only the fields you pass, e.g. `{ done: true }`     |
| `remove(item)`          | deletes the record                                          |
| `loading`               | `true` until the first load finishes                        |
| `error`                 | the last error message, or `null`                           |

Every record gets an `id` and a `created_at` automatically.

## The data API

`collection()` talks to this API, and you can call it from anywhere with `fetch`:

| Request                | What it does                                      |
|------------------------|---------------------------------------------------|
| `GET /api/posts`       | list all posts, newest first                      |
| `POST /api/posts`      | save the JSON object in the body                  |
| `GET /api/posts/5`     | get one post                                      |
| `PATCH /api/posts/5`   | change the fields in the body, `null` removes one |
| `DELETE /api/posts/5`  | delete it                                         |

Everything is stored in `loaf.db`, a single SQLite file.

> **Before you go public:** the data API has no login. Anyone who can open your site can read, change and delete every record. That's fine on your own machine and for prototypes. For a public site, remove the `// db` lines from `server.js` and write your own routes in `api/` with the checks you need.

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

Your routes win over the data API when both match the same URL. To use the database directly, import it:

```js
import { db } from "../db.js";

export const GET = () => Response.json(db.query("SELECT COUNT(*) AS count FROM records").get());
```

`db` is a [`bun:sqlite`](https://bun.sh/docs/api/sqlite) database, so you can create your own tables too.

## Starting clean

Everything optional can be deleted:

- **No demo:** delete `public/demo.html`.
- **No example route:** delete `api/hello.js`.
- **No database:** delete `db.js` and the lines marked `// db` in `server.js`. `collection()` stops working, but pages and `api/` routes keep working.

## Scripts

| Command     | What it does                    |
|-------------|---------------------------------|
| `bun dev`   | start with auto-restart on save |
| `bun start` | start for production            |
| `bun test`  | run tests                       |

Set these in the environment or in a `.env` file:

- `PORT`: server port (default `3000`)
- `DB`: database file (default `loaf.db`, use `:memory:` for a throwaway one)

## Going to production

The Tailwind CDN build compiles styles in the browser, and the daisyUI CDN file includes every component. That's fine for small apps and prototypes. When you outgrow it, switch to the [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli) with the [daisyUI plugin](https://daisyui.com/docs/install/) and serve the generated CSS file from `public/`.

Back up `loaf.db`. That file is your whole database.

## License

[MIT](LICENSE)
