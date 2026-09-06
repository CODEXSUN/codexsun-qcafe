import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const docsTopology: InterfaceTopologySection[] = [
  { id: "d1", technicalName: "docs.workspace.canvas", name: "Documentation canvas", scope: "Docs", description: "Renders the selected cloud documentation page." },
  { id: "d2", technicalName: "docs.sideCar.panel", name: "Docs side car", scope: "Docs", description: "Document search and navigation." },
  { id: "d2.1", technicalName: "docs.sideCar.content", name: "Docs navigation", scope: "Docs", description: "Searchable documentation index." },
  { id: "d2.1.1", technicalName: "docs.sideCar.documentList", name: "Document list", scope: "Docs", description: "Available architecture and operating documents." },
  { id: "d2.1.1.1", technicalName: "docs.navigation.searchInput", name: "Document search input", scope: "Docs navigation", description: "Filter documents by title or summary." },
  { id: "d2.1.1.2", technicalName: "docs.navigation.newButton", name: "New document button", scope: "Docs navigation", description: "Open a blank documentation editor." },
  { id: "d2.1.1.3", technicalName: "docs.navigation.groupedList", name: "Grouped document links", scope: "Docs navigation", description: "Browse documents grouped by their owning area." },
  { id: "d2.1.1.4", technicalName: "docs.navigation.cloudStatus", name: "Cloud Docs status", scope: "Docs navigation", description: "Show the cloud database, migration, table, and available page count." },
  { id: "d1.1", technicalName: "docs.document.editButton", name: "Edit document button", scope: "Documentation canvas", description: "Open the selected document in the editor." },
  { id: "d1.2", technicalName: "docs.document.content", name: "Document content", scope: "Documentation canvas", description: "Render the selected MDX document or loading state." },
  { id: "d1.3", technicalName: "docs.editor.form", name: "Document editor", scope: "Documentation canvas", description: "Create or update a documentation page." },
  { id: "d1.3.1", technicalName: "docs.editor.header", name: "Editor header", scope: "Document editor", description: "Identify and close the document editor." },
  { id: "d1.3.2", technicalName: "docs.editor.metadata", name: "Document metadata fields", scope: "Document editor", description: "Edit title, description, group, and slug." },
  { id: "d1.3.3", technicalName: "docs.editor.body", name: "Document body input", scope: "Document editor", description: "Edit the MDX document body." },
  { id: "d1.3.4", technicalName: "docs.editor.saveButton", name: "Save document button", scope: "Document editor", description: "Persist the documentation page." },
];
