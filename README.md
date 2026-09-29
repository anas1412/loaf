<p align="center">
  <img src="public/logo.svg" alt="Loaf" width="120" height="120">
</p>

<h1 align="center">Loaf</h1>

<p align="center">Make websites and small apps by writing HTML. Nothing to set up, nothing to install.</p>

<p align="center"><a href="https://anas1412.github.io/loaf/">Website</a> · <a href="https://anas1412.github.io/loaf/docs.html">Guide</a> · <a href="https://anas1412.github.io/loaf/tutorial.mp4">Watch: a notes app in one minute</a></p>

## Get started

1. Install [Bun](https://bun.sh) (once).
2. Run:
   ```bash
   bunx degit anas1412/loaf my-site
   cd my-site
   bun dev
   ```
3. Open http://localhost:3000.

Your site lives in the `public/` folder. Change a file, save, refresh.

## Add a page

Create `public/about.html`:

```html
<title>About me</title>

<h1 class="text-3xl font-bold">Hi, I'm Sam</h1>
<p>I bake bread and build websites.</p>
```

Open http://localhost:3000/about. The header, footer and page frame are added for you.

## Change the header and footer

Every page shares them:

- `public/_header.html`: your logo, links and the theme menu
- `public/_footer.html`: the bottom of every page
- `public/_layout.html`: the page frame around them

Add a link to your new page in `_header.html` and it shows up everywhere. To reuse any piece on several pages, put it in a file starting with `_` and drop it in with `<loaf-include src="_contact.html"></loaf-include>`.

## Save things

A whole notes app. Create `public/notes.html`:

```html
<title>Notes</title>

<loaf-form name="notes">
  <input name="text" placeholder="Write a note">
  <button>Save</button>
</loaf-form>

<loaf-list name="notes">
  <p field="text"></p>
</loaf-list>
```

- `<loaf-form name="notes">` saves what you type. The name can be anything: `recipes`, `contacts`, `ideas`.
- `<loaf-list name="notes">` shows everything saved, newest first.
- `field="text"` shows the input named `text`.

Notes stay after you refresh or restart.

Inside a `<loaf-list>` you can also use:

| Add this                             | What it does                          |
|--------------------------------------|---------------------------------------|
| `<p edit="text"></p>`                | shows the text; click it to change it |
| `<input toggle="done">`              | a checkbox that remembers             |
| `<button remove>Delete</button>`     | deletes the item                      |
| `<p field="created_at"></p>`         | when it was saved                     |

And anywhere on the page:

- `<loaf-count name="notes"></loaf-count>` shows how many there are.
- `<loaf-empty name="notes">No notes yet.</loaf-empty>` shows only when there are none.

> Anyone who can open your site can see and change what's saved. Keep private things out of it.

## Make it look good

Loaf comes with [daisyUI](https://daisyui.com/components/), a set of ready-made pieces: buttons, cards, menus, tabs, modals, alerts and more. Forms and lists already use it, so they look good with no extra work.

To add a piece, copy it from the daisyUI site and paste it into your page:

```html
<button class="btn btn-primary">Click me</button>

<div class="card bg-base-100 shadow-sm">
  <div class="card-body">A card</div>
</div>
```

Pick a theme from the menu in the header. There are 35. To choose one for everyone, open `_layout.html` and change `<html lang="en">` to `<html lang="en" data-theme="coffee">`.

## Put it online

Your site needs a host that runs Bun, like [Railway](https://railway.com) or [Fly.io](https://fly.io). Use `bun start` as the start command.

If your site saves things, they're kept in the file `loaf.db`. Ask your host for a volume (a disk that stays) so saved data survives updates.

## Remove what you don't need

- The demo: delete `public/demo.html` and its link in `_header.html`.
- The example in `api/`: delete `api/hello.js`.

## For developers

Loaf's own code is in `loaf/` (version in `loaf/VERSION`). Leave it as it is, so Loaf can be updated later; your work goes in `public/` and `api/`. The `loaf-` elements are built on [Alpine.js](https://alpinejs.dev), which you can use directly in any page. Every file in `api/` becomes a route (`api/hello.js` → `/api/hello`), and `.claude/skills/` teaches AI assistants how Loaf works. The [guide](https://anas1412.github.io/loaf/docs.html#developers) has the details.

## License

[MIT](LICENSE)
