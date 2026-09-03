import { useEffect, useMemo, useState } from "react";
import type { InterfaceTopologyController, InterfaceTopologySection } from "./types.js";

const labelsVisibilityStorageKey = "codexsun.devkit-ito.labels-visible";

export function useInterfaceTopologyOverlay(sections: readonly InterfaceTopologySection[]): InterfaceTopologyController {
  const firstSection = sections[0];
  const [labelsVisible, setLabelsVisible] = useState(readLabelsVisibility);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [selected, setSelected] = useState(firstSection?.id ?? "");
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);

  const pageKey = sections.map((section) => section.technicalName ?? section.id).join("|");
  useEffect(() => setHighlighted(false), [pageKey]);

  useEffect(() => {
    if (!sectionIds.has(selected)) setSelected(firstSection?.id ?? "");
  }, [firstSection?.id, sectionIds, selected]);

  function inspect(id: string) {
    const section = sections.find((candidate) => candidate.id === id);
    if (!section) return;
    copyTechnicalName(section.technicalName ?? section.name);
    setSelected(id);
    setHighlighted(true);
    setOpen(true);
  }

  return {
    close: () => setOpen(false),
    inspect,
    labelsVisible,
    open,
    regionProps: (id) => ({ "data-ito-highlighted": String(sectionIds.has(id) && highlighted && selected === id), "data-ito-section": id }),
    rootAttributes: { "data-ito-highlight": String(highlighted), "data-ito-labels": String(labelsVisible), "data-ito-selected": selected },
    sections,
    selected,
    select: setSelected,
    toggleHighlight: () => setHighlighted((enabled) => !enabled),
    toggleLabels: () => setLabelsVisible((visible) => {
      const next = !visible;
      persistLabelsVisibility(next);
      return next;
    }),
    toggleOpen: () => setOpen((isOpen) => !isOpen),
  };
}

function readLabelsVisibility() {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(labelsVisibilityStorageKey) !== "false";
  } catch {
    return true;
  }
}

function persistLabelsVisibility(visible: boolean) {
  try {
    window.localStorage.setItem(labelsVisibilityStorageKey, String(visible));
  } catch {
    // Storage can be disabled by the browser. The current session still updates.
  }
}

function copyTechnicalName(value: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
    return;
  }
  fallbackCopy(value);
}

function fallbackCopy(value: string) {
  const copyTarget = document.createElement("textarea");
  copyTarget.value = value;
  copyTarget.setAttribute("readonly", "");
  copyTarget.style.position = "fixed";
  copyTarget.style.opacity = "0";
  document.body.append(copyTarget);
  copyTarget.select();
  document.execCommand("copy");
  copyTarget.remove();
}
