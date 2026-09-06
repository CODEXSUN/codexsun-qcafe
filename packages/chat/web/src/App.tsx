import { useMemo } from "react";
import { InterfaceTopologyDrawer, TopologyInspectionControl, TopologyMarker } from "@codexsun/devkit-ito";
import { useInterfaceTopologyOverlay } from "@codexsun/devkit-ito/use-interface-topology-overlay";
import { MainMdi, type MdiPage } from "@codexsun/ui-desk";
import { createChatWorkspaceAddon } from "./Workspace.js";
import { chatTopology } from "./topology.js";
import { defaultChatApiUrl } from "./connection-defaults.js";

const initialPage: MdiPage = { view: "workspace", addonId: "chat", pageId: "" };

export function App() {
  const addon = useMemo(() => createChatWorkspaceAddon({
    defaultApiUrl: defaultChatApiUrl(),
    demoApiUrl: import.meta.env.VITE_CHAT_DEMO_API_URL || "http://127.0.0.1:4165",
    demoToken: import.meta.env.VITE_CHAT_DEMO_TOKEN || "local-demo-only",
    localDemo: import.meta.env.DEV && import.meta.env.VITE_CHAT_LOCAL_DEMO === "true",
  }), []);
  const controller = useInterfaceTopologyOverlay(chatTopology);

  return <MainMdi
    addons={[addon]}
    requestedPage={initialPage}
    topology={{
      control: <TopologyInspectionControl placement="dock" topology={controller} />,
      drawer: <InterfaceTopologyDrawer topology={controller} />,
      marker: (id) => <TopologyMarker id={chatOwnedId(id)} topology={controller} />,
      regionProps: (id) => controller.regionProps(chatOwnedId(id)),
      rootAttributes: controller.rootAttributes,
    }}
  />;
}

function chatOwnedId(id: string) {
  return ({ "11": "c2", "11.1": "c2.1", "12": "c2.2" } as Record<string, string>)[id] ?? id;
}