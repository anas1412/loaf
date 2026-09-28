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
  loaf.js       frontend helper for Alpine
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

Pages use [Alpine.js](https://alpinejs.dev) for interactivity and [Tailwind CSS](https://tailwindcss.com) for styling. Both load from a CDN, so there's nothing to install. Copy the `<head>` from `public/index.html` into new pages.

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

The Tailwind CDN build compiles styles in the browser. That's fine for small apps and prototypes. When you outgrow it, switch to the [Tailwind CLI](https://tailwindcss.com/docs/installation/tailwind-cli) and serve the generated CSS file from `public/`.

Back up `loaf.db`. That file is your whole database.

## License

[MIT](LICENSE)
