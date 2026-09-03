import { useCallback, useState } from "react";
import { MainMdi, type MdiPage } from "@codexsun/ui-desk";
import { InterfaceTopologyDrawer, TopologyInspectionControl, TopologyMarker } from "@codexsun/devkit-ito";
import { useInterfaceTopologyOverlay } from "@codexsun/devkit-ito/use-interface-topology-overlay";
import { zetroWorkspaceAddon } from "./MdiWorkspace.js";
import { zetroPageTopology } from "./mdi-topology.js";
const initialPage: MdiPage = { view: "workspace", addonId: "zetro", pageId: "agent" };
export function App() {
  const [page, setPage] = useState("agent");
  const onPageChange = useCallback((next: MdiPage) => setPage(next.pageId ?? "agent"), []);
  const controller = useInterfaceTopologyOverlay(zetroPageTopology(page));
  return <MainMdi addons={[zetroWorkspaceAddon]} requestedPage={initialPage} onPageChange={onPageChange} topology={{ control: <TopologyInspectionControl placement="dock" topology={controller} />, drawer: <InterfaceTopologyDrawer topology={controller} />, marker: (id) => <TopologyMarker id={id} topology={controller} />, regionProps: controller.regionProps, rootAttributes: controller.rootAttributes }} />;
}
