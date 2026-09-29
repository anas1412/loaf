// Loaf: make websites by writing HTML. https://github.com/anas1412/loaf
//
// Put this first on every page:
//   <script src="https://cdn.jsdelivr.net/gh/anas1412/loaf@0.2/loaf.js"></script>
//
// It loads Tailwind, daisyUI and Alpine, puts the page inside _layout.html, pastes in
// <loaf-include> pieces, and turns the loaf- elements (below) into working HTML.
// Everything runs in the browser, so a Loaf site is a folder of HTML files that any
// static host can serve, like GitHub Pages.

const LOAF_VERSION = "0.2.0";
const loafScript = document.currentScript;

// The site's main folder, where _layout.html lives. A page in a sub-folder says so with
// <script src="…/loaf.js" data-root="../">. Links and images on every page are relative to it.
const loafRoot = new URL(loafScript?.dataset.root ?? "./", location.href);
{
  const base = document.createElement("base");
  base.href = loafRoot.href;
  document.head.prepend(base);
}

// Pages don't need a <head>: add the mobile viewport tag if it's missing.
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  document.head.append(viewport);
}

// Keep the page hidden until the layout and styles are in, so it doesn't flash half-built.
// If something fails to load, show it anyway after a few seconds.
document.documentElement.style.visibility = "hidden";
function showPage() {
  document.documentElement.style.visibility = "";
}
setTimeout(showPage, 4000);

// The libraries Loaf builds on. Updating Loaf updates these too.
const LOAF_LIBS = {
  daisyui: "https://cdn.jsdelivr.net/npm/daisyui@5.7.46",
  themes: "https://cdn.jsdelivr.net/npm/daisyui@5.7.46/themes.css",
  tailwind: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3",
  alpine: "https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js",
};
for (const href of [LOAF_LIBS.daisyui, LOAF_LIBS.themes]) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}
{
  const tailwind = document.createElement("script");
  tailwind.src = LOAF_LIBS.tailwind;
  document.head.append(tailwind);
  const style = document.createElement("style");
  // In Tailwind's base layer, so classes like "flex" or "hidden" on these elements still win.
  style.textContent = "@layer base { loaf-list, loaf-empty { display: block; } }";
  document.head.append(style);
}

// Saved data and the theme choice are kept per site, so two Loaf sites on the same
// address (like username.github.io/a and /b) don't mix.
const loafKey = (name) => `loaf:${loafRoot.pathname}:${name}`;

// ---------- Themes ----------
// <loaf-theme> lets visitors pick a daisyUI theme. Their choice is remembered. Without one,
// the theme on <html data-theme="…"> in _layout.html is used, or light/dark following the device.
const THEMES = {
  Light: ["light", "acid", "autumn", "bumblebee", "caramellatte", "cmyk", "corporate", "cupcake", "cyberpunk", "emerald", "fantasy", "garden", "lemonade", "lofi", "nord", "pastel", "retro", "silk", "valentine", "winter", "wireframe"],
  Dark: ["dark", "abyss", "aqua", "black", "business", "coffee", "dim", "dracula", "forest", "halloween", "luxury", "night", "sunset", "synthwave"],
};
let pageTheme = document.documentElement.dataset.theme;
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function savedTheme() {
  try {
    return localStorage.getItem(loafKey("theme"));
  } catch {
    return null;
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = savedTheme() ?? pageTheme ?? (systemDark.matches ? "dark" : "light");
}

applyTheme();
systemDark.addEventListener("change", applyTheme);

// ---------- Layout and includes ----------
async function fetchText(path) {
  const res = await fetch(new URL(path, loafRoot));
  return res.ok ? res.text() : null;
}

// Scripts that arrive through DOMParser or innerHTML never run on their own. Once they're
// on the page, swap each for a fresh copy, which the browser does run.
function revive(scripts) {
  for (const old of scripts) {
    const script = document.createElement("script");
    for (const attr of old.attributes) script.setAttribute(attr.name, attr.value);
    script.textContent = old.textContent;
    old.replaceWith(script);
  }
}

// Puts the page into _layout.html at <loaf-page></loaf-page>. The page's <title> wins over the layout's.
async function applyLayout() {
  if (loafScript?.dataset.layout === "none") return;
  const html = await fetchText(loafScript?.dataset.layout ?? "_layout.html");
  if (html === null) return; // no layout: the page is shown as it is
  const layout = new DOMParser().parseFromString(html, "text/html");
  const scripts = [...layout.querySelectorAll("script")];

  // <html lang="…" data-theme="…"> on the layout applies to every page.
  for (const attr of layout.documentElement.attributes) {
    if (attr.name !== "data-theme" && !document.documentElement.hasAttribute(attr.name)) {
      document.documentElement.setAttribute(attr.name, attr.value);
    }
  }
  pageTheme ??= layout.documentElement.dataset.theme;
  applyTheme();

  const layoutTitle = layout.querySelector("title");
  if (layoutTitle && !document.title) document.title = layoutTitle.textContent;
  layoutTitle?.remove();
  document.head.append(...layout.head.childNodes);

  const slot = layout.body.querySelector("loaf-page");
  if (slot) slot.replaceWith(...document.body.childNodes);
  else console.warn("_layout.html has no <loaf-page></loaf-page>, so Loaf doesn't know where the page goes.");
  for (const attr of layout.body.attributes) document.body.setAttribute(attr.name, attr.value);
  if (slot) document.body.replaceChildren(...layout.body.childNodes);
  revive(scripts);
}

// Replaces each <loaf-include src="_header.html"></loaf-include> with that file, and the includes inside it.
async function applyIncludes(root = document.body, depth = 0) {
  const includes = [...root.querySelectorAll("loaf-include")];
  if (!includes.length) return;
  if (depth >= 10) {
    console.warn(`Includes are nested more than 10 deep. Does ${includes[0].getAttribute("src")} include itself?`);
    return;
  }
  await Promise.all(
    includes.map(async (el) => {
      const src = el.getAttribute("src");
      const html = src ? await fetchText(src) : null;
      if (html === null) {
        console.warn(`<loaf-include src="${src}"> wasn't found next to _layout.html.`);
        el.remove();
        return;
      }
      const piece = document.createElement("div");
      piece.innerHTML = html;
      await applyIncludes(piece, depth + 1);
      const scripts = [...piece.querySelectorAll("script")];
      el.replaceWith(...piece.childNodes);
      revive(scripts);
    }),
  );
}

// ---------- Saved data ----------
// Records are kept in this browser (localStorage), newest first, each with an id and created_at.
function readRecords(name) {
  try {
    return JSON.parse(localStorage.getItem(loafKey(`data:${name}`))) ?? [];
  } catch {
    return [];
  }
}

function writeRecords(name, records) {
  try {
    localStorage.setItem(loafKey(`data:${name}`), JSON.stringify(records));
  } catch {
    throw new Error("This browser can't save any more (storage is full or turned off).");
  }
}

// The fields Loaf manages can't be set from forms or add().
function cleanFields(data) {
  const { id, created_at, ...fields } = data ?? {};
  return fields;
}

const loafData = {
  list: (name) => readRecords(name),

  add(name, data) {
    const records = readRecords(name);
    const id = Math.max(0, ...records.map((record) => record.id)) + 1;
    const record = { ...cleanFields(data), id, created_at: new Date().toISOString() };
    writeRecords(name, [record, ...records]);
    return record;
  },

  // Merges the changes into the record. A field set to null is removed.
  update(name, id, changes) {
    const records = readRecords(name);
    const record = records.find((r) => r.id === id);
    if (!record) throw new Error("That item doesn't exist anymore.");
    for (const [key, value] of Object.entries(cleanFields(changes))) {
      if (value === null) delete record[key];
      else record[key] = value;
    }
    writeRecords(name, records);
    return record;
  },

  remove(name, id) {
    writeRecords(name, readRecords(name).filter((r) => r.id !== id));
  },
};

// One shared state per collection name, so every element using that name stays in sync.
const collections = {};

function sharedCollection(name) {
  if (!collections[name]) {
    const state = (collections[name] = Alpine.reactive({ items: [], loading: true, error: null, saving: false }));
    attempt(state, async () => (state.items = loafData.list(name))).then(() => (state.loading = false));
  }
  return collections[name];
}

// Another tab of the same site changed something: show it here too.
addEventListener("storage", (event) => {
  for (const name of Object.keys(collections)) {
    if (event.key === loafKey(`data:${name}`)) collections[name].items = readRecords(name);
  }
});

// Runs an action and puts any error message in state.error.
async function attempt(state, action) {
  state.error = null;
  try {
    await action();
  } catch (err) {
    state.error = err.message;
  }
}

// A form's named fields as an object. Checkboxes become true/false and number inputs become numbers.
function formValues(form) {
  const data = {};
  for (const field of form.elements) {
    if (!field.name || field.disabled || ["submit", "button", "reset", "file"].includes(field.type)) continue;
    if (field.type === "checkbox") data[field.name] = field.checked;
    else if (field.type === "radio") {
      if (field.checked) data[field.name] = field.value;
    } else if (field.type === "number" || field.type === "range") data[field.name] = field.value === "" ? null : Number(field.value);
    else data[field.name] = field.value;
  }
  return data;
}

// ---------- Loaf elements ----------
// Plain-HTML shortcuts, turned into Alpine just before the page starts.
// Elements with the same name share their items, so a form and a list stay in sync.
//
//   <loaf-form name="notes">     saves its named fields, then clears itself
//   <loaf-list name="notes">     repeats what's inside once per saved item, newest first
//     field="text"               shows that field (created_at shows as a date, images get it as src)
//     edit="text"                shows that field; click to change it, and it saves
//     toggle="done"              a checkbox that saves true/false to that field
//     remove                     a button that deletes the item
//   <loaf-count name="notes">    how many items are saved
//   <loaf-empty name="notes">    shown only when nothing is saved yet
//   <loaf-theme>                 the theme menu
//
// Elements without a class get daisyUI's look. Inside <loaf-list>, the current item is
// `item`, so Alpine attributes work too: <span :class="item.done && 'line-through'">.

// The class an unstyled form control gets inside <loaf-form> or <loaf-list>.
function defaultClass(el) {
  if (el.tagName === "BUTTON" || el.type === "submit") return "btn btn-primary";
  if (el.tagName === "TEXTAREA") return "textarea w-full";
  if (el.tagName === "SELECT") return "select";
  return { checkbox: "checkbox", radio: "radio", range: "range", file: "file-input" }[el.type] ?? "input grow";
}

function styleDefault(el, className) {
  if (!el.hasAttribute("class")) el.className = className;
}

// Formats a field for display: created_at as a local date, missing fields as nothing.
function showField(item, key) {
  const value = item[key];
  if (key === "created_at" && value) return new Date(value).toLocaleString();
  return value ?? "";
}

// Copies attributes from a loaf- element onto the real element that replaces it.
function replaceElement(el, tag) {
  const replacement = document.createElement(tag);
  for (const attr of el.attributes) if (attr.name !== "name") replacement.setAttribute(attr.name, attr.value);
  replacement.append(...el.childNodes);
  el.replaceWith(replacement);
  return replacement;
}

function bindCollection(el, name = el.getAttribute("name")) {
  if (!name) console.warn(`<${el.localName}> needs a name, like <${el.localName} name="notes">`);
  el.setAttribute("x-data", `collection(${JSON.stringify(name ?? "")})`);
}

function upgradeLoafElements() {
  for (const el of document.querySelectorAll("loaf-theme")) {
    const select = replaceElement(el, "select");
    styleDefault(select, "select select-sm w-32 sm:w-40");
    if (!select.hasAttribute("aria-label")) select.setAttribute("aria-label", "Theme");
    select.setAttribute("x-data", "themePicker");
  }

  for (const el of document.querySelectorAll("loaf-list")) {
    bindCollection(el);
    styleDefault(el, "flex flex-col gap-3");
    const key = (attr) => JSON.stringify(attr);
    for (const node of el.querySelectorAll("[field]")) {
      const expression = `showField(item, ${key(node.getAttribute("field"))})`;
      node.setAttribute(node.tagName === "IMG" ? "x-bind:src" : "x-text", expression);
    }
    for (const node of el.querySelectorAll("[edit]")) {
      const field = key(node.getAttribute("edit"));
      node.setAttribute("x-text", `showField(item, ${field})`);
      node.setAttribute("contenteditable", "plaintext-only");
      node.setAttribute("title", "Click to edit");
      node.setAttribute("x-on:keydown.enter.prevent", "$el.blur()");
      node.setAttribute("x-on:blur", `$el.textContent.trim() !== showField(item, ${field}) && update(item, { [${field}]: $el.textContent.trim() })`);
    }
    for (const node of el.querySelectorAll("[toggle]")) {
      if (!node.hasAttribute("type")) node.setAttribute("type", "checkbox");
      styleDefault(node, "checkbox");
      node.setAttribute("x-bind:checked", `item[${key(node.getAttribute("toggle"))}]`);
      node.setAttribute("x-on:change", `update(item, { [${key(node.getAttribute("toggle"))}]: $el.checked })`);
    }
    for (const node of el.querySelectorAll("[remove]")) {
      styleDefault(node, "btn btn-ghost btn-sm");
      node.setAttribute("x-on:click", "remove(item)");
    }

    // Alpine repeats a <template> with one element inside, so wrap the content if it has several.
    // A wrapped item is a row, with its text taking the free space.
    let row = el.children[0];
    if (el.children.length !== 1) {
      row = document.createElement("div");
      row.append(...el.childNodes);
      styleDefault(row, "flex items-center gap-3 rounded-box bg-base-100 p-4 shadow-sm");
      for (const text of row.querySelectorAll(":scope > [field]:not(img), :scope > [edit]")) styleDefault(text, "grow");
    }
    styleDefault(row, "rounded-box bg-base-100 p-4 shadow-sm");
    const template = document.createElement("template");
    template.setAttribute("x-for", "item in items");
    template.setAttribute("x-bind:key", "item.id");
    template.content.append(row);
    el.replaceChildren(template);
  }

  for (const el of document.querySelectorAll("loaf-form")) {
    const name = el.getAttribute("name");
    const form = replaceElement(el, "form");
    bindCollection(form, name);
    styleDefault(form, "flex flex-wrap items-center gap-2");
    form.setAttribute("x-on:submit.prevent", "add($el)");
    for (const control of form.querySelectorAll("input, textarea, select, button")) {
      styleDefault(control, defaultClass(control));
      if (control.tagName === "BUTTON" && control.type === "submit") control.setAttribute("x-bind:disabled", "saving");
    }
  }

  for (const el of document.querySelectorAll("loaf-count")) {
    bindCollection(el);
    el.setAttribute("x-text", "items.length");
  }

  for (const el of document.querySelectorAll("loaf-empty")) {
    bindCollection(el);
    styleDefault(el, "text-base-content/60");
    el.setAttribute("x-show", "!loading && !items.length");
  }
}

// ---------- Alpine pieces ----------
document.addEventListener("alpine:init", () => {
  upgradeLoafElements();

  Alpine.data("themePicker", () => ({
    init() {
      const select = this.$el;
      select.add(new Option(pageTheme ? `Default (${pageTheme})` : "System", ""));
      for (const [label, names] of Object.entries(THEMES)) {
        const group = document.createElement("optgroup");
        group.label = label;
        for (const name of names) group.append(new Option(name[0].toUpperCase() + name.slice(1), name));
        select.append(group);
      }
      select.value = savedTheme() ?? "";
      select.addEventListener("change", () => {
        try {
          if (select.value) localStorage.setItem(loafKey("theme"), select.value);
          else localStorage.removeItem(loafKey("theme"));
        } catch {}
        applyTheme();
      });
    },
  }));

  // x-data="collection('todos')" gives you items, add(), update() and remove() for the saved "todos".
  // Every collection('todos') on the page shares the same items.
  Alpine.data("collection", (name) => {
    const state = sharedCollection(name);
    return {
      get items() {
        return state.items;
      },
      get loading() {
        return state.loading;
      },
      get error() {
        return state.error;
      },
      get saving() {
        return state.saving;
      },

      // add({ text: "hi" }), or add($el) on a <form> to save its named fields and clear it.
      async add(data) {
        if (state.saving) return; // a second click while saving would save twice
        const form = data instanceof HTMLFormElement ? data : null;
        if (form) data = formValues(form);
        state.saving = true;
        await attempt(state, async () => {
          state.items.unshift(loafData.add(name, data));
          form?.reset();
        });
        state.saving = false;
      },

      // update(item, { done: true }) changes only the fields you pass.
      async update(item, changes) {
        await attempt(state, async () => {
          const saved = loafData.update(name, item.id, changes);
          for (const key of Object.keys(item)) if (!(key in saved)) delete item[key];
          Object.assign(item, saved);
        });
      },

      async remove(item) {
        await attempt(state, async () => {
          loafData.remove(name, item.id);
          state.items = state.items.filter((i) => i.id !== item.id);
        });
      },
    };
  });
});

document.addEventListener("alpine:initialized", () => {
  requestAnimationFrame(showPage);
  setTimeout(showPage, 100); // background tabs don't run animation frames
});

// Some local web servers don't say that pages are UTF-8, so the browser shows "·" as "Â·".
// If that happened, read the page again as UTF-8 (fetch always does).
async function fixEncoding() {
  if (document.characterSet === "UTF-8") return;
  const page = new DOMParser().parseFromString(await (await fetch(location.href)).text(), "text/html");
  for (const script of page.querySelectorAll("script")) script.remove(); // they already ran once
  document.title = page.title;
  document.body.replaceChildren(...page.body.childNodes);
}

// ---------- Start ----------
// Build the page, then start Alpine, which turns the loaf- elements into working HTML.
async function startLoaf() {
  try {
    await fixEncoding();
    await applyLayout();
    await applyIncludes();
  } catch (err) {
    console.error("Loaf couldn't build this page:", err);
  }
  const alpine = document.createElement("script");
  alpine.src = LOAF_LIBS.alpine;
  alpine.onerror = showPage;
  document.head.append(alpine);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startLoaf);
else startLoaf();
