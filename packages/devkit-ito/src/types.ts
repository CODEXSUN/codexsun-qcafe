export type InterfaceTopologySection = {
  description: string;
  id: string;
  name: string;
  scope: string;
  technicalName?: string;
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
