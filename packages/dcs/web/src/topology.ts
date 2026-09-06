import type { InterfaceTopologySection } from "@codexsun/devkit-ito";

export const deviceChatTopology: InterfaceTopologySection[] = [
  { id: "dc1", technicalName: "dcs.deviceChat.workspace", name: "Device chat workspace", scope: "DCS", description: "Durable device-to-device message workspace." },
  { id: "dc2", technicalName: "dcs.deviceChat.sideCar", name: "Device chat side car", scope: "DCS", description: "Enrolled device selection." },
  { id: "dc2.1", technicalName: "dcs.deviceChat.deviceList", name: "Device list", scope: "DCS", description: "Select an enrolled destination device." },
  { id: "dc2.1.1", technicalName: "dcs.deviceList.deviceButton", name: "Device selection button", scope: "Device list", description: "Select a destination device for the conversation." },
  { id: "dc1.1", technicalName: "dcs.workspace.header", name: "Device chat header", scope: "Device chat", description: "Show the selected device and connection state." },
  { id: "dc1.2", technicalName: "dcs.messages.history", name: "Device message history", scope: "Device chat", description: "Show sent and received device messages." },
  { id: "dc1.3", technicalName: "dcs.composer.form", name: "Device message composer", scope: "Device chat", description: "Write and send a message to the selected device." },
  { id: "dc1.3.1", technicalName: "dcs.composer.messageInput", name: "Device message input", scope: "Message composer", description: "Enter a device message." },
  { id: "dc1.3.2", technicalName: "dcs.composer.sendButton", name: "Send device message button", scope: "Message composer", description: "Send the drafted message." },
];
