import type { MdiPage } from "../../main-mdi.js";

export function readPageUrl(url: URL, fallback: MdiPage, addonIds: string[]): MdiPage {
  const app = url.searchParams.get("app");
  if (!app) return fallback;
  if (app !== "workspace" && !addonIds.includes(app)) return fallback;
  return { view: "workspace", addonId: app === "workspace" ? undefined : app, pageId: url.searchParams.get("page") ?? "" };
}

export function writePageUrl(url: URL, page: MdiPage): URL {
  const next = new URL(url);
  next.searchParams.set("app", page.addonId ?? "workspace");
  if (page.pageId) next.searchParams.set("page", page.pageId);
  else next.searchParams.delete("page");
  return next;
}
