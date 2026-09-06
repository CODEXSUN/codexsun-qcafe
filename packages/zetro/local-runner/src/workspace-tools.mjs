import { lstat, open, opendir, realpath } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

const TEXT_TYPES = new Set([".md", ".txt", ".json", ".ts", ".tsx", ".js", ".mjs", ".css", ".html"]);
const DENIED = /(^\.|^(node_modules|dist|build|coverage|secrets?|credentials?|auth)(\.|$)|\.(pem|key|pfx|p12)$)/i;
const MAX_BYTES = 64 * 1024;

export class WorkspaceTools {
  constructor(root) { this.root = root; }

  static async create(root) { return new WorkspaceTools(await realpath(root)); }

  async list({ path = "." } = {}) {
    const folder = await this.safePath(path);
    const entries = [];
    let truncated = false;
    let visited = 0;
    for await (const item of await opendir(folder)) {
      if (++visited > 200) { truncated = true; break; }
      if (DENIED.test(item.name) || item.isSymbolicLink()) continue;
      if (!item.isDirectory() && !TEXT_TYPES.has(extname(item.name).toLowerCase())) continue;
      entries.push({ name: item.name, type: item.isDirectory() ? "directory" : "file" });
    }
    return { path, entries: entries.sort((a, b) => a.name.localeCompare(b.name)), truncated };
  }

  async read({ path }) {
    if (!TEXT_TYPES.has(extname(path).toLowerCase())) throw new Error("Text file type is not allowed.");
    const file = await this.safePath(path);
    const handle = await open(file, "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.nlink !== 1 || stat.size > MAX_BYTES) throw new Error("Only small, regular text files are allowed.");
      const buffer = Buffer.alloc(MAX_BYTES + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      if (bytesRead > MAX_BYTES || buffer.subarray(0, bytesRead).includes(0)) throw new Error("File is too large or binary.");
      return { path, text: new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead)) };
    } finally { await handle.close(); }
  }

  async search({ query, path = "." }) {
    const pending = [path];
    const matches = [];
    let visited = 0;
    let truncated = false;
    const deadline = Date.now() + 3000;
    while (pending.length && visited < 100 && matches.length < 30 && Date.now() < deadline) {
      const folder = pending.shift();
      const listing = await this.list({ path: folder });
      truncated ||= listing.truncated;
      for (const entry of listing.entries) {
        if (++visited > 100 || matches.length >= 30 || Date.now() >= deadline) { truncated = true; break; }
        const child = folder === "." ? entry.name : `${folder}/${entry.name}`;
        if (entry.type === "directory") { pending.push(child); continue; }
        try {
          const { text } = await this.read({ path: child });
          for (const [index, line] of text.split(/\r?\n/).entries()) {
            if (line.toLowerCase().includes(query.toLowerCase())) matches.push({ path: child, line: index + 1, text: line.slice(0, 300) });
            if (matches.length >= 30) { truncated = true; break; }
          }
        } catch { /* Inaccessible or excluded files contribute no content. */ }
      }
    }
    return { matches, truncated: truncated || pending.length > 0 };
  }

  async safePath(input) {
    if (typeof input !== "string" || input.length > 240 || isAbsolute(input) || /[:\\\x00-\x1f]/.test(input)) throw new Error("Use a relative workspace path.");
    const parts = input === "." ? [] : input.split("/");
    if (parts.some((part) => !part || part === ".." || part === "." || DENIED.test(part) || /[. ]$/.test(part))) throw new Error("Path is not allowed.");
    let target = this.root;
    for (const part of parts) {
      target = resolve(target, part);
      if ((await lstat(target)).isSymbolicLink()) throw new Error("Links are not allowed.");
    }
    const canonical = await realpath(target);
    const inside = relative(this.root, canonical);
    if (inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) throw new Error("Path is outside the workspace.");
    return canonical;
  }
}

/** Holds the one user-approved workspace while the local tool server is running. */
export class WorkspaceToolProvider {
  constructor(workspace) { this.workspace = workspace; }

  static async create(root) { return new WorkspaceToolProvider(await WorkspaceTools.create(root)); }

  async setRoot(root) {
    this.workspace = await WorkspaceTools.create(root);
    return this.root();
  }

  root() { return this.workspace.root; }
  list(input) { return this.workspace.list(input); }
  read(input) { return this.workspace.read(input); }
  search(input) { return this.workspace.search(input); }
}
