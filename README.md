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

<main class="p-8">
  <h1 class="text-3xl font-bold">Hi, I'm Sam</h1>
  <p>I bake bread and build websites.</p>
</main>
```

Open http://localhost:3000/about. The header and footer are added for you.

## Change the header and footer

Every page shares them:

- `public/_header.html`: your logo, links and the theme menu
- `public/_footer.html`: the bottom of every page
- `public/_layout.html`: the rest of the page frame

Add a link to your new page in `_header.html` and it shows up everywhere.

## Save things

Make a notes app with a few lines. Create `public/notes.html`:

```html
<title>Notes</title>

<main x-data="collection('notes')" class="mx-auto max-w-md p-8">
  <form @submit.prevent="add($el)" class="flex gap-2">
    <input name="text" class="input w-full" placeholder="Write a note" required>
    <button class="btn btn-primary">Save</button>
  </form>

  <template x-for="note in items">
    <p class="card bg-base-100 mt-3 p-4" x-text="note.text"></p>
  </template>
</main>
```

- `collection('notes')` keeps your notes. Use any name: `recipes`, `contacts`, `ideas`.
- `add($el)` saves what's in the form.
- `items` is everything you saved.

Notes stay after you refresh or restart. See the [guide](https://anas1412.github.io/loaf/docs.html#saving) for editing and deleting.

> Anyone who can open your site can see and change what's saved. Keep private things out of it.

## Make it look good

Use ready-made pieces like buttons, cards and menus from [daisyUI](https://daisyui.com/components/):

```html
<button class="btn btn-primary">Click me</button>
```

Pick a theme from the menu in the header. There are 35. To choose one for everyone, open `_layout.html` and change `<html lang="en">` to `<html lang="en" data-theme="coffee">`.

## Put it online

Your site needs a host that runs Bun, like [Railway](https://railway.com) or [Fly.io](https://fly.io). Use `bun start` as the start command.

If your site saves things, they're kept in the file `loaf.db`. Ask your host for a volume (a disk that stays) so saved data survives updates.

## Remove what you don't need

- The demo: delete `public/demo.html` and its link in `_header.html`.
- The example in `api/`: delete `api/hello.js`.

## For developers

Every file in `api/` becomes a route (`api/hello.js` → `/api/hello`), and `.claude/skills/` teaches AI assistants how Loaf works. The [guide](https://anas1412.github.io/loaf/docs.html#developers) has the details.

## License

[MIT](LICENSE)
