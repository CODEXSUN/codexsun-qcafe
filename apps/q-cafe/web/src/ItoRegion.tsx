import type { ReactNode } from 'react';
import { TopologyMarker, type InterfaceTopologyController } from '@codexsun/devkit-ito';

export function ItoRegion({ children, className = '', id, topology, tag: Tag = 'div' }: { children: ReactNode; className?: string; id: string; topology: InterfaceTopologyController; tag?: 'div' | 'section' | 'aside' }) {
  return <Tag className={`ito-region relative ${className}`} {...topology.regionProps(id)}><TopologyMarker id={id} topology={topology}/>{children}</Tag>;
}
