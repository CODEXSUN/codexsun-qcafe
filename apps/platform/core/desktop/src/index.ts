import { invoke, isTauri } from "@tauri-apps/api/core";

export function desktopCredentialStore(name: "identity-refresh" | "dcs-device") {
  if (!isTauri()) return undefined;
  return {
    load: () => invoke<string | null>("read_credential", { name }),
    save: (value: string) => invoke<void>("save_credential", { name, value }),
    clear: () => invoke<void>("delete_credential", { name }),
  };
}
