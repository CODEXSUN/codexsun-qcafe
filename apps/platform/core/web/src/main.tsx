import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { IdentityGate } from "@codexsun/identity-web";
import { setChatConnection } from "@codexsun/chat-web";
import { desktopCredentialStore } from "@codexsun/core-desktop";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {import.meta.env.VITE_OS_CLOUD === "true" ? <IdentityGate baseUrl={import.meta.env.VITE_OS_API_URL || window.location.origin} sessionStore={desktopCredentialStore("identity-refresh")} onAuthenticated={token => setChatConnection({ apiUrl: import.meta.env.VITE_OS_API_URL || window.location.origin, accessToken: token })}><App /></IdentityGate> : <App />}
  </StrictMode>,
);
