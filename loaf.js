// Loaf's frontend helper. Load it before Alpine:
//   <script src="/loaf.js"></script>
//   <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js"></script>
//
// It gives pages the loaf- elements (below), and the Alpine pieces they're built on:
// collection('name') for saved data and themePicker for the theme menu.

// Themes: <select x-data="themePicker"></select> lets visitors pick a DaisyUI theme.
// Their choice is remembered. Without one, the page's own data-theme is used,
// or light/dark following the device setting.
const THEMES = {
  Light: ["light", "acid", "autumn", "bumblebee", "caramellatte", "cmyk", "corporate", "cupcake", "cyberpunk", "emerald", "fantasy", "garden", "lemonade", "lofi", "nord", "pastel", "retro", "silk", "valentine", "winter", "wireframe"],
  Dark: ["dark", "abyss", "aqua", "black", "business", "coffee", "dim", "dracula", "forest", "halloween", "luxury", "night", "sunset", "synthwave"],
};
const pageTheme = document.documentElement.dataset.theme;
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function savedTheme() {
  try {
    return localStorage.getItem("loaf-theme");
  } catch {
    return null;
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = savedTheme() ?? pageTheme ?? (systemDark.matches ? "dark" : "light");
}

applyTheme();
systemDark.addEventListener("change", applyTheme);

// Calls your API and returns the JSON. Throws with the server's message if the request fails.
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `${method} ${url} failed (${res.status})`);
  return data;
}

// One shared state per collection name, loaded once per page.
const collections = {};

function sharedCollection(name) {
  if (!collections[name]) {
    const state = (collections[name] = Alpine.reactive({ items: [], loading: true, error: null, saving: false }));
    attempt(state, async () => (state.items = await api("GET", `/api/${name}`))).then(() => (state.loading = false));
  }
  return collections[name];
}

// Runs an API call and puts any error message in state.error.
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
    }
    else if (field.type === "number" || field.type === "range") data[field.name] = field.value === "" ? null : Number(field.value);
    else data[field.name] = field.value;
  }
  return data;
}

// Loaf elements: plain-HTML shortcuts, turned into Alpine just before the page starts.
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
const loafStyle = document.createElement("style");
// In Tailwind's base layer, so classes like "flex" or "hidden" on these elements still win.
loafStyle.textContent = "@layer base { loaf-list, loaf-empty { display: block; } }";
document.head.append(loafStyle);

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
  if (key === "created_at" && value) return new Date(value.replace(" ", "T") + "Z").toLocaleString();
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
      node.setAttribute("x-on:blur", `$el.innerText.trim() !== showField(item, ${field}) && update(item, { [${field}]: $el.innerText.trim() })`);
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

document.addEventListener("alpine:init", upgradeLoafElements);

document.addEventListener("alpine:init", () => {
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
          if (select.value) localStorage.setItem("loaf-theme", select.value);
          else localStorage.removeItem("loaf-theme");
        } catch {}
        applyTheme();
      });
    },
  }));

  // x-data="collection('todos')" gives you items, add(), update() and remove() for /api/todos.
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
          state.items.unshift(await api("POST", `/api/${name}`, data));
          form?.reset();
        });
        state.saving = false;
      },

      // update(item, { done: true }) changes only the fields you pass.
      async update(item, changes) {
        await attempt(state, async () => Object.assign(item, await api("PATCH", `/api/${name}/${item.id}`, changes)));
      },

      async remove(item) {
        await attempt(state, async () => {
          await api("DELETE", `/api/${name}/${item.id}`);
          state.items = state.items.filter((i) => i.id !== item.id);
        });
      },
    };
  });
});
