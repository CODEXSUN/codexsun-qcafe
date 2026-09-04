import { Check, ChevronRight, Eye, EyeOff, Highlighter, Tags, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { InterfaceTopologyController, InterfaceTopologySection } from "./types.js";
import { isHierarchyLabelVisible } from "./label-visibility.js";

export type { InterfaceTopologyController, InterfaceTopologySection } from "./types.js";

function subLabelStyle(id: string): CSSProperties | undefined {
  if (!id.includes(".")) return undefined;
  const hues = [240, 85, 195, 125, 60, 145, 230, 95, 180, 210, 75, 155, 115, 200, 45];
  const section = Number.parseInt(id.replace(/^[a-z]+/i, ""), 10) || 1;
  return { "--ito-branch-hue": hues[(section - 1) % hues.length] } as CSSProperties;
}

export function TopologyMarker({ id, topology }: { id: string; topology: InterfaceTopologyController }) {
  const section = topology.sections.find((candidate) => candidate.id === id);
  if (!section) return null;
  if (!topology.labelsVisible) return null;
  if (!isHierarchyLabelVisible(id, topology.selected, topology.rootAttributes["data-ito-highlight"] === "true")) return null;
  const technicalName = section.technicalName ?? section.name;
  const selected = topology.open && topology.selected === id;
  return <button type="button" style={subLabelStyle(id)} data-ito-hierarchical={id.includes(".") ? "true" : undefined} aria-label={`Inspect ${section.name}: ${technicalName}`} className={selected ? "technical-label selected" : "technical-label"} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.preventDefault(); event.stopPropagation(); topology.inspect(id); }} title={`${id} · ${section.name} · ${technicalName}`}><b>{id.replace(/^[a-z]+/i, "").padStart(2, "0")}</b></button>;
}

export function TopologyInspectionControl({ placement = "floating", topology }: { placement?: "dock" | "floating"; topology: InterfaceTopologyController }) {
  const action = topology.open ? "Close Topology Inspection" : "Open Topology Inspection";
  const classes = `topology-inspection-control ${placement}${topology.open ? " open" : ""}`;
  return <button aria-label={action} className={classes} onClick={topology.toggleOpen} title={action}><Tags size={18} />{placement === "floating" && <span>ITO</span>}</button>;
}

export function InterfaceTopologyDrawer({ topology, pageSelector }: { topology: InterfaceTopologyController; pageSelector?: ReactNode }) {
  if (!topology.open) return null;
  const selected = topology.sections.find((section) => section.id === topology.selected) ?? topology.sections[0];
  if (!selected) return null;
  const highlighting = topology.rootAttributes["data-ito-highlight"] === "true";
  return <aside aria-label="Interface Topology Overlay" className="technical-inspector">
    <header><div><span>Interface Topology Overlay</span></div><div className="inspector-actions"><button aria-pressed={topology.labelsVisible} aria-label={topology.labelsVisible ? "Hide ITO labels" : "Show ITO labels"} className={topology.labelsVisible ? "ito-labels-toggle active" : "ito-labels-toggle"} onClick={topology.toggleLabels} title={topology.labelsVisible ? "Hide ITO labels" : "Show ITO labels"}>{topology.labelsVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button><button aria-label="Highlight section" aria-pressed={highlighting} className={highlighting ? "boundary-highlight-toggle active" : "boundary-highlight-toggle"} onClick={topology.toggleHighlight} title={highlighting ? "Turn off section highlight" : "Turn on section highlight"}><Highlighter size={16} /></button><button aria-label="Close Topology Inspection" onClick={topology.close} title="Close Topology Inspection"><X size={17} /></button></div></header>
    {pageSelector}
    <section className="inspector-detail"><strong>{selected.id} · {selected.name}</strong><code>{selected.technicalName ?? selected.name}</code><span>{selected.scope}</span><p>{selected.description}</p></section>
    <nav aria-label="Topology sections">{topology.sections.filter((section) => !section.id.includes(".")).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })).map((section) => <TopologyGroup key={section.id} section={section} topology={topology} />)}</nav>
  </aside>;
}

function TopologyGroup({ section, topology }: { section: InterfaceTopologySection; topology: InterfaceTopologyController }) {
  const [collapsed, setCollapsed] = useState(false);
  const highlighting = topology.rootAttributes["data-ito-highlight"] === "true";
  useEffect(() => setCollapsed(false), [topology.selected, highlighting]);
  const id = section.id.replace(/^0+(?=\d)/, "");
  const selectedId = topology.selected.replace(/^0+(?=\d)/, "");
  const children = topology.sections.filter((candidate) => candidate.id.includes(".") && candidate.id.slice(0, candidate.id.lastIndexOf(".")) === id)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const selected = section.id === topology.selected;
  const expanded = highlighting && !collapsed && (selectedId === id || selectedId.startsWith(`${id}.`));
  return <div className="ito-group">
    <button type="button" aria-expanded={children.length ? expanded : undefined} className={selected ? "selected" : ""} onClick={() => {
      if (children.length && expanded) setCollapsed(true);
      else { setCollapsed(false); topology.inspect(section.id); }
    }} title={`Inspect ${section.technicalName ?? section.name}`}>
      <b style={subLabelStyle(section.id)} data-ito-hierarchical={section.id.includes(".") ? "true" : undefined}>{section.id.replace(/^[a-z]+/i, "").padStart(2, "0")}</b>
      <span>{section.name}</span>
      {children.length ? <ChevronRight size={16} style={{ transform: expanded ? "rotate(90deg)" : undefined }} /> : selected && <Check className="selected-check" size={17} />}
    </button>
    {children.length > 0 && expanded && <div className="ito-group-children">{children.map((child) => <TopologyGroup key={child.id} section={child} topology={topology} />)}</div>}
  </div>;
}
