import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyDesignSystemPreference, applyThemeModePreference } from "@codexsun/ui/design-system";
import { App } from "./App.js";
import "./styles.css";

applyThemeModePreference();
applyDesignSystemPreference();

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
