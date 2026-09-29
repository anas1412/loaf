<p align="center">
  <img src="logo.svg" alt="Loaf" width="120" height="120">
</p>

<h1 align="center">Loaf</h1>

<p align="center">Make websites by writing HTML. Nothing to install, free to host on GitHub Pages.</p>

<p align="center"><a href="https://anas1412.github.io/loaf/">Website</a> · <a href="https://anas1412.github.io/loaf/docs.html">Guide</a> · <a href="https://anas1412.github.io/loaf/tutorial.mp4">Watch: a notes app in one minute</a></p>

## Get started

**On GitHub, with nothing to install:**

1. Click **Use this template** → **Create a new repository** at the top of this page.
2. In your new repository, open **Settings** → **Pages**, pick the `main` branch and click **Save**.
3. A minute later your site is live at `https://your-name.github.io/your-repo/`.

Edit any file with the pencil icon on GitHub, and the site updates by itself.

**On your computer:** download this repository (**Code** → **Download ZIP**), unzip it, and open the folder with any local web server, for example:

```bash
npx serve
```

Or use the "Live Server" extension in VS Code. Opening the files directly by double-clicking doesn't work, because browsers don't let pages load other files from your disk.

## Add a page

Create `about.html`:

```html
<script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.3/loaf.js"></script>
<title>About me</title>

<h1 class="text-3xl font-bold">Hi, I'm Sam</h1>
<p>I bake bread and build websites.</p>
```

The first line goes at the top of every page. It adds the header, footer, styles and everything else, so the page only needs its own content. Open it at `about.html`.

## Change the header and footer

Every page shares them:

- `_header.html`: your logo, links and the theme menu
- `_footer.html`: the bottom of every page
- `_layout.html`: the page frame around them

Add a link to your new page in `_header.html`, like `<li><a href="about.html">About</a></li>`, and it shows up everywhere. To reuse any piece on several pages, put it in a file starting with `_` and drop it in with `<loaf-include src="_contact.html"></loaf-include>`.

Links and images are relative to your site's main folder, so write `about.html` or `photo.jpg`, not `/about`.

**Pages in a folder** (like `blog/first-post.html`) need to know where the main folder is. Add `data-root="../"` to their first line:

```html
<script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.3/loaf.js" data-root="../"></script>
```

## Save things

A whole notes app. Create `notes.html`:

```html
<script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.3/loaf.js"></script>
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

Everything is saved in the visitor's own browser. It stays after refreshing and closing the browser, it never leaves their device, and each visitor only sees their own. That makes it right for personal tools like notes, to-do lists and trackers, but not for things visitors share, like a guestbook.

## Make it look good

Loaf comes with [daisyUI](https://daisyui.com/components/), a set of ready-made pieces: buttons, cards, menus, tabs, modals, alerts and more. Forms and lists already use it, so they look good with no extra work.

To add a piece, copy it from the daisyUI site and paste it into your page:

```html
<button class="btn btn-primary">Click me</button>

<div class="card bg-base-100 shadow-sm">
  <div class="card-body">A card</div>
</div>
```

**Icons.** Show any of the 1,600 icons from [lucide.dev/icons](https://lucide.dev/icons) by name:

```html
<button class="btn"><loaf-icon name="heart"></loaf-icon> Like</button>
<loaf-icon name="chef-hat" class="size-8 text-primary"></loaf-icon>
```

An icon takes the color and size of the text around it. Make it bigger with a class like `size-8`. When an icon is shown on its own, give it a `label` that says what it means, like `<loaf-icon name="trash-2" label="Delete">`.

Pick a theme from the menu in the header. There are 35. To choose one for everyone, open `_layout.html` and change `<html lang="en">` to `<html lang="en" data-theme="coffee">`.

## Put it online

Any service that hosts plain files works: GitHub Pages (see above), [Netlify](https://app.netlify.com/drop) (drag and drop the folder) or Cloudflare Pages. Keep the empty `.nojekyll` file: without it, GitHub Pages skips the files starting with `_`.

## Update Loaf

The first line of each page loads Loaf `0.3`, which gets every 0.3 fix automatically. New features come in new versions like `0.4`: to use them, change `@0.3` to `@0.4` on your pages.

## Remove what you don't need

- The demo: delete `demo.html` and its link in `_header.html`.
- The tests: delete the `test/` folder.

## For developers

- `loaf.js` is the whole of Loaf, one file with no build step. It loads [Tailwind](https://tailwindcss.com), daisyUI and [Alpine.js](https://alpinejs.dev), then builds each page in the browser.
- The `loaf-` elements are built on `x-data="collection('notes')"`, which you can use directly with Alpine: it gives you `items`, `add()`, `update()`, `remove()`, `loading`, `saving` and `error`.
- Data is stored in `localStorage`, one key per collection, separate for each site folder.
- Open `test/` through a local server to run the browser tests.
- `.claude/skills/` teaches AI assistants how Loaf works.

## License

[MIT](LICENSE)
