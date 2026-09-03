import { Check, Eye, EyeOff, Highlighter, Tags, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type InterfaceTopologySection = {
  description: string;
  id: string;
  name: string;
  scope: string;
};

export type InterfaceTopologyController = {
  close: () => void;
  inspect: (id: string) => void;
  labelsVisible: boolean;
  open: boolean;
  regionProps: (id: string) => Record<"data-ito-highlighted" | "data-ito-section", string>;
  rootAttributes: Record<"data-ito-highlight" | "data-ito-labels" | "data-ito-selected", string>;
  sections: readonly InterfaceTopologySection[];
  selected: string;
  select: (id: string) => void;
  toggleHighlight: () => void;
  toggleLabels: () => void;
  toggleOpen: () => void;
};

export function useInterfaceTopologyOverlay(sections: readonly InterfaceTopologySection[]): InterfaceTopologyController {
  const firstSection = sections[0];
  const [labelsVisible, setLabelsVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [selected, setSelected] = useState(firstSection?.id ?? "");
  const sectionIds = useMemo(() => new Set(sections.map((section) => section.id)), [sections]);

  useEffect(() => {
    if (!sectionIds.has(selected)) setSelected(firstSection?.id ?? "");
  }, [firstSection?.id, sectionIds, selected]);

  useEffect(() => {
    if (!open) return;
    function closeOnClickAway(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest(".technical-inspector, .topology-inspection-control")) setOpen(false);
    }
    window.addEventListener("pointerdown", closeOnClickAway);
    return () => window.removeEventListener("pointerdown", closeOnClickAway);
  }, [open]);

  function inspect(id: string) {
    const section = sections.find((candidate) => candidate.id === id);
    if (!section) return;
    void navigator.clipboard?.writeText(section.name).catch(() => undefined);
    setSelected(id);
    setOpen(true);
  }

  return {
    close: () => setOpen(false),
    inspect,
    labelsVisible,
    open,
    regionProps: (id) => ({ "data-ito-highlighted": String(highlighted && selected === id), "data-ito-section": id }),
    rootAttributes: { "data-ito-highlight": String(highlighted), "data-ito-labels": String(labelsVisible), "data-ito-selected": selected },
    sections,
    selected,
    select: setSelected,
    toggleHighlight: () => { setHighlighted((enabled) => !enabled); setOpen(false); },
    toggleLabels: () => setLabelsVisible((visible) => !visible),
    toggleOpen: () => setOpen((isOpen) => !isOpen),
  };
}

export function TopologyMarker({ id, topology }: { id: string; topology: InterfaceTopologyController }) {
  const section = topology.sections.find((candidate) => candidate.id === id);
  if (!section) return null;
  return <button aria-label={`Copy and inspect ${section.name}`} className="technical-label" onClick={() => topology.inspect(id)} title={`Copy ${section.name}`}>{id}</button>;
}

export function TopologyInspectionControl({ topology }: { topology: InterfaceTopologyController }) {
  const action = topology.open ? "Close Topology Inspection" : "Open Topology Inspection";
  return <button aria-label={action} className={topology.open ? "topology-inspection-control open" : "topology-inspection-control"} onClick={topology.toggleOpen} title={action}><Tags size={18} /><span>ITO</span></button>;
}

export function InterfaceTopologyDrawer({ topology }: { topology: InterfaceTopologyController }) {
  if (!topology.open) return null;
  const selected = topology.sections.find((section) => section.id === topology.selected) ?? topology.sections[0];
  if (!selected) return null;
  return <aside aria-label="Interface Topology Overlay" className="technical-inspector">
    <header><div><span>Interface Topology Overlay</span></div><div className="inspector-actions"><button aria-label={topology.labelsVisible ? "Hide ITO labels" : "Show ITO labels"} className={topology.labelsVisible ? "ito-labels-toggle active" : "ito-labels-toggle"} onClick={topology.toggleLabels} title={topology.labelsVisible ? "Hide ITO labels" : "Show ITO labels"}>{topology.labelsVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button><button aria-label="Toggle boundary highlighter" className="boundary-highlight-toggle" onClick={topology.toggleHighlight} title="Toggle boundary highlighter"><Highlighter size={15} /><span>Highlight</span></button><button aria-label="Close Topology Inspection" onClick={topology.close} title="Close Topology Inspection"><X size={17} /></button></div></header>
    <section className="inspector-detail"><span>{selected.scope}</span><p>{selected.description}</p></section>
    <nav aria-label="Topology sections">{topology.sections.map((section) => <button className={section.id === topology.selected ? "selected" : ""} key={section.id} onClick={() => topology.select(section.id)}><b>{section.id}</b><span>{section.name}</span>{section.id === topology.selected && <Check className="selected-check" size={17} />}</button>)}</nav>
  </aside>;
}
