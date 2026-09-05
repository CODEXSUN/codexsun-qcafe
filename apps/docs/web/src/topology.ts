import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const docsTopology: InterfaceTopologySection[] = [
  { id: "d1", technicalName: "docs.workspace.canvas", name: "Documentation canvas", scope: "Docs", description: "Renders the selected local MDX document." },
  { id: "d2", technicalName: "docs.sideCar.panel", name: "Docs side car", scope: "Docs", description: "Document search and navigation." },
  { id: "d2.1", technicalName: "docs.sideCar.content", name: "Docs navigation", scope: "Docs", description: "Searchable documentation index." },
  { id: "d2.1.1", technicalName: "docs.sideCar.documentList", name: "Document list", scope: "Docs", description: "Available architecture and operating documents." },
];
