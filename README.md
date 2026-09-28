<p align="center">
  <img src="public/logo.svg" alt="Loaf" width="120" height="120">
</p>

<h1 align="center">Loaf</h1>

<p align="center">A Bun starter project. Clone it, run one command, start building.</p>

## Why

- **Zero setup**: no accounts, no database server, no `.env` required.
- **Zero build**: the HTML you write is what the browser gets.
- **Zero dependencies**: Bun ships the server, the database, the watcher and the test runner.
- **Readable in 5 minutes**: a handful of small files. Add structure when your app needs it.

## Stack

- **[Bun](https://bun.sh)** runs the server (`Bun.serve`) and the database (`bun:sqlite`)
- **[Alpine.js](https://alpinejs.dev)** adds reactivity, loaded from a CDN
- **[Tailwind CSS](https://tailwindcss.com)** handles styling, loaded from a CDN

## Quick start

Requires Bun 1.2.3 or newer.

```bash
bunx degit anas1412/loaf my-app
cd my-app
bun dev
```

Open http://localhost:3000. The notes demo is at http://localhost:3000/demo.

## Project structure

```
server.js       your routes + static files
db.js           opens loaf.db (SQLite)
public/         everything served as-is: html, images, js
demo/           optional notes demo
```

## Starting clean

The notes demo is self-contained. To remove it:

1. Delete the `demo/` folder.
2. Delete the two lines marked `// demo` in `server.js`.

## Adding a table and a route

Create the table in `db.js`:

```js
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
)`);
```

Add the route in `server.js`:

```js
"/api/posts": {
  GET: () => Response.json(db.query("SELECT * FROM posts").all()),
  POST: async (req) => {
    const { title } = await req.json();
    const post = db.query("INSERT INTO posts (title) VALUES (?) RETURNING *").get(title);
    return Response.json(post, { status: 201 });
  },
},
```

Use it from any page with Alpine:

```html
<ul x-data="{ posts: [] }" x-init="posts = await (await fetch('/api/posts')).json()">
  <template x-for="post in posts">
    <li x-text="post.title"></li>
  </template>
</ul>
```

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

Add `loaf.db` to your backups. That file is your whole database.

## License

[MIT](LICENSE)
