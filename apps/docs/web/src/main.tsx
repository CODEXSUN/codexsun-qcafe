import { createRoot } from "react-dom/client";
import { MainMdi, type MdiPage } from "@codexsun/ui-desk";
import { createDocsWorkspaceAddon } from "./DocsWorkspace.js";
import "./styles.css";

const page: MdiPage = { view: "workspace", addonId: "docs", pageId: "architecture" };
createRoot(document.getElementById("root")!).render(<MainMdi addons={[createDocsWorkspaceAddon({ apiBaseUrl: import.meta.env.VITE_DOCS_API_URL || window.location.origin })]} requestedPage={page} />);
