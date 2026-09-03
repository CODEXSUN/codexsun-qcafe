import type { ReactNode } from "react";

type ITORegionAttributes = {
  "data-ito-highlighted": string;
  "data-ito-section": string;
};

type ITORootAttributes = {
  "data-ito-highlight": string;
  "data-ito-labels": string;
  "data-ito-selected": string;
};

export type MdiTopologyAdapter = {
  control: ReactNode;
  drawer: ReactNode;
  marker: (id: string) => ReactNode;
  regionProps: (id: string) => ITORegionAttributes;
  rootAttributes: ITORootAttributes;
};

export function MdiTopologyRegion({ children, className = "", id, topology }: { children: ReactNode; className?: string; id: string; topology?: MdiTopologyAdapter }) {
  if (!topology) return <div className={className}>{children}</div>;
  return <div className={`ito-region ${className}`} {...topology.rootAttributes} {...topology.regionProps(id)}>{topology.marker(id)}{children}</div>;
}
