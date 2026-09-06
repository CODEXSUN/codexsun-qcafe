export type ClientSurface = "web" | "desktop" | "android" | "ios";

export function detectClientSurface(browser: Pick<Navigator, "userAgent"> | undefined = typeof navigator === "undefined" ? undefined : navigator): ClientSurface {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) return "desktop";
  const agent = browser?.userAgent ?? "";
  if (/android/i.test(agent)) return "android";
  if (/iPad|iPhone|iPod/i.test(agent)) return "ios";
  return "web";
}

export function clientSurfaceLabel(surface = detectClientSurface()): string {
  if (surface === "ios") return "iOS";
  if (surface === "android") return "Android";
  return surface === "desktop" ? "Desktop" : "Web";
}
