// Loaf's frontend helper. Load it before Alpine:
//   <script src="/loaf.js"></script>
//   <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js"></script>

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
  Alpine.data("collection", (name) => ({
    items: [],
    loading: true,
    error: null,

    async init() {
      await this.run(async () => (this.items = await api("GET", `/api/${name}`)));
      this.loading = false;
    },

    // add({ text: "hi" }), or add($el) on a <form> to save its named inputs and clear it.
    async add(data) {
      const form = data instanceof HTMLFormElement ? data : null;
      if (form) data = Object.fromEntries(new FormData(form));
      await this.run(async () => {
        this.items.unshift(await api("POST", `/api/${name}`, data));
        form?.reset();
      });
    },

    // update(item, { done: true }) changes only the fields you pass.
    async update(item, changes) {
      await this.run(async () => Object.assign(item, await api("PATCH", `/api/${name}/${item.id}`, changes)));
    },

    async remove(item) {
      await this.run(async () => {
        await api("DELETE", `/api/${name}/${item.id}`);
        this.items = this.items.filter((i) => i.id !== item.id);
      });
    },

    async run(action) {
      this.error = null;
      try {
        await action();
      } catch (err) {
        this.error = err.message;
      }
    },
  }));
});
