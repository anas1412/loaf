import { stat } from "node:fs/promises";
import { dirname, join, sep } from "node:path";

const PUBLIC = join(import.meta.dir, "public");
// Comments are matched too, so a commented-out <include> or <slot> is left alone.
const INCLUDE = /<!--[\s\S]*?-->|<include\s+src="([^"]+)"\s*(?:\/>|><\/include>)/gi;
const SLOT = /<!--[\s\S]*?-->|<slot\s*(?:\/>|><\/slot>)/gi;

const notFound = () => new Response("Not Found", { status: 404 });

// The full path of a file in public/, or null if the path points outside it.
function inPublic(path) {
  const full = join(PUBLIC, path);
  return full === PUBLIC || full.startsWith(PUBLIC + sep) ? full : null;
}

async function fileInfo(path) {
  const info = await stat(path).catch(() => null);
  return info?.isFile() ? info : null;
}

// Serves everything that isn't an API route: /about → public/about.html, /logo.svg → public/logo.svg.
// Files and folders starting with _ are private (layouts and includes) and never served directly.
export async function servePage(req) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url).pathname);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  if (pathname.includes("\0") || pathname.split("/").some((part) => part.startsWith("_"))) return notFound();
  const path = inPublic(pathname);
  if (!path) return notFound();

  for (const candidate of [path, path + ".html", join(path, "index.html")]) {
    const info = await fileInfo(candidate);
    if (!info) continue;
    if (candidate.endsWith(".html")) {
      return new Response(await renderPage(candidate), {
        headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-cache" },
      });
    }
    // Browsers ask again with If-Modified-Since; unchanged files get an empty 304.
    const lastModified = info.mtime.toUTCString();
    if (req.headers.get("if-modified-since") === lastModified) return new Response(null, { status: 304 });
    return new Response(Bun.file(candidate), { headers: { "Last-Modified": lastModified, "Cache-Control": "no-cache" } });
  }
  return notFound();
}

// A page without an <html> tag is a fragment: it goes into the nearest _layout.html at <slot></slot>.
export async function renderPage(file) {
  let html = await Bun.file(file).text();
  if (!/<html[\s>]/i.test(html)) {
    const layout = await findLayout(dirname(file));
    if (layout) html = wrap(html, await Bun.file(layout).text());
  }
  return withIncludes(html);
}

// The page's leading <title> replaces the layout's. A leading <head> block adds to the layout's <head>.
function wrap(page, layout) {
  let head = "";
  let title = null;
  const takeTitle = (html) => html.replace(/^\s*<title>[\s\S]*?<\/title>/i, (tag) => ((title = tag), ""));
  page = page.replace(/^\s*<head>([\s\S]*?)<\/head>/i, (_, inner) => ((head = inner), ""));
  page = takeTitle(page);
  head = head.replace(/<title>[\s\S]*?<\/title>/i, (tag) => ((title = tag), ""));

  let placed = false;
  let html = layout.replace(SLOT, (match) => (match.startsWith("<!--") || placed ? match : ((placed = true), page)));
  if (title) {
    html = /<title>/i.test(html)
      ? html.replace(/<title>[\s\S]*?<\/title>/i, () => title)
      : html.replace(/<\/head>/i, () => title + "</head>");
  }
  if (head.trim()) html = html.replace(/<\/head>/i, () => head + "</head>");
  return html;
}

// The nearest _layout.html: the page's folder first, then each folder above it up to public/.
async function findLayout(dir) {
  while (dir.startsWith(PUBLIC)) {
    const layout = join(dir, "_layout.html");
    if (await fileInfo(layout)) return layout;
    if (dir === PUBLIC) break;
    dir = dirname(dir);
  }
  return null;
}

// Replaces <include src="_navbar.html"></include> with that file from public/, and the includes inside it.
async function withIncludes(html, depth = 0) {
  const sources = [...html.matchAll(INCLUDE)].map((match) => match[1]).filter(Boolean);
  if (!sources.length) return html;
  if (depth >= 10) throw new Error(`Includes are nested more than 10 deep. Does ${sources[0]} include itself?`);
  const parts = await Promise.all(
    sources.map(async (src) => {
      const path = inPublic(src);
      if (!path || !(await fileInfo(path))) {
        console.warn(`<include src="${src}"> not found in public/`);
        return `<!-- include not found: ${src} -->`;
      }
      return withIncludes(await Bun.file(path).text(), depth + 1);
    }),
  );
  let i = 0;
  return html.replace(INCLUDE, (match, src) => (src ? parts[i++] : match));
}
