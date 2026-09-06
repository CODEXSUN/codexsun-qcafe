import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { IdentityGate } from "@codexsun/identity-web";
import { clearChatConnection, setChatConnection } from "@codexsun/chat-web";
import { desktopCredentialStore } from "@codexsun/core-desktop";
import { applyDesignSystemPreference, applyThemeModePreference } from "@codexsun/ui/design-system";
import "./styles.css";

applyThemeModePreference();
applyDesignSystemPreference();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_OS_CLOUD === "true" ? <IdentityGate baseUrl={import.meta.env.VITE_OS_API_URL || window.location.origin} sessionStore={desktopCredentialStore("identity-refresh")} onAuthenticated={token => setChatConnection({ apiUrl: import.meta.env.VITE_OS_API_URL || window.location.origin, accessToken: token })} onSignedOut={clearChatConnection}><App /></IdentityGate> : <App />}
  </StrictMode>,
);
