import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const deviceChatTopology: InterfaceTopologySection[] = [
  { id: "dc1", technicalName: "dcs.deviceChat.workspace", name: "Device chat workspace", scope: "DCS", description: "Durable device-to-device message workspace." },
  { id: "dc2", technicalName: "dcs.deviceChat.sideCar", name: "Device chat side car", scope: "DCS", description: "Enrolled device selection." },
  { id: "dc2.1", technicalName: "dcs.deviceChat.deviceList", name: "Device list", scope: "DCS", description: "Select an enrolled destination device." },
];
