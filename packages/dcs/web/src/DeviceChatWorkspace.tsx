import { MonitorSmartphone, Send } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { Button } from "@codexsun/ui/components/button";
import { MdiTopologyRegion, type MdiTopologyAdapter, type MdiWorkspaceAddon } from "@codexsun/ui-desk";
import { platformBaseUrl, platformFetch } from "@codexsun/platform-host-contracts";

type Device = { id: string; name: string; kind: string; lastSeen: string | null; revokedAt: string | null };
type DeviceEvent = { seq: number; deviceId: string; payload: { kind?: string; senderDeviceId?: string; sentAt?: string; targetDeviceId?: string; text?: string } };
type DeviceMessage = { id: number; senderDeviceId: string; sentAt: string; targetDeviceId: string; text: string };
type CredentialStore = { load(): Promise<string | null> };

export function createDeviceChatWorkspaceAddon({ credentialStore }: { credentialStore?: CredentialStore } = {}): MdiWorkspaceAddon {
  return {
    icon: MonitorSmartphone,
    id: "device-chat",
    label: "Devices",
    navigation: { id: "device-chat", hideSearch: true, searchPlaceholder: "Search devices", groups: [{ defaultOpen: true, id: "devices", items: [{ id: "messages", title: "Device chat" }], title: "DCS" }] },
    renderPage: (_pageId, topology, target) => <DeviceChatWorkspace credentialStore={credentialStore} sideCarTarget={target} topology={topology} />,
  };
}

export function DeviceChatWorkspace({ credentialStore, sideCarTarget, topology }: { credentialStore?: CredentialStore; sideCarTarget?: HTMLElement | null; topology?: MdiTopologyAdapter }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [messages, setMessages] = useState<DeviceMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const socket = useRef<WebSocket | undefined>(undefined);
  const after = useRef(0);
  const activeDeviceId = useRef("");

  useEffect(() => { void loadDevices().then(items => { setDevices(items.filter(item => !item.revokedAt)); setDeviceId(current => current || items.find(item => !item.revokedAt)?.id || ""); }).catch(() => setError("Device directory is unavailable.")); }, []);
  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    async function connect() {
      try {
        const token = await credentialStore?.load();
        const { ticket } = await request<{ ticket: string }>("/dcs/tickets", "POST", undefined, token);
        const endpoint = new URL("/dcs/ws", platformBaseUrl() || window.location.origin);
        endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
        const connection = new WebSocket(endpoint, [`ticket.${ticket}`]);
        socket.current = connection;
        connection.onopen = () => { if (!disposed) { setStatus("Authorizing device"); connection.send(JSON.stringify({ type: "pull", after: after.current })); } };
        connection.onmessage = event => receive(event.data, connection, after, activeDeviceId, setMessages, setStatus);
        connection.onclose = () => { if (!disposed) { setStatus("Disconnected"); retry = setTimeout(() => { void connect(); }, 5000); } };
      } catch { if (!disposed) setStatus("Enroll this device in Settings to connect"); }
    }
    void connect();
    return () => { disposed = true; clearTimeout(retry); socket.current?.close(); };
  }, [credentialStore]);

  const selected = devices.find(device => device.id === deviceId);
  const sideCar = <MdiTopologyRegion id="dc2.1" topology={topology} className="space-y-2"><p className="px-2 text-xs font-semibold text-muted-foreground">DEVICES</p>{devices.map(device => <button className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${device.id === deviceId ? "bg-accent text-accent-foreground" : ""}`} key={device.id} onClick={() => setDeviceId(device.id)} type="button"><MonitorSmartphone className="size-4" /><span className="min-w-0"><span className="block truncate font-medium">{device.name}</span><span className="block text-xs text-muted-foreground">{device.kind}</span></span></button>)}</MdiTopologyRegion>;

  async function send() {
    const text = draft.trim();
    if (!text || !deviceId || socket.current?.readyState !== WebSocket.OPEN) return;
    const payload = { kind: "device.message", senderDeviceId: activeDeviceId.current, sentAt: new Date().toISOString(), targetDeviceId: deviceId, text };
    socket.current.send(JSON.stringify({ type: "publish", id: crypto.randomUUID(), payload }));
    setDraft("");
  }

  return <MdiTopologyRegion id="dc1" topology={topology} className="flex h-full min-h-0 flex-col bg-background text-foreground">
    {sideCarTarget && createPortal(sideCar, sideCarTarget)}
    <header className="flex items-center justify-between border-b border-border px-6 py-4"><div><h1 className="font-semibold">{selected?.name ?? "Device chat"}</h1><p className="text-sm text-muted-foreground">{status}</p></div></header>
    <div className="flex-1 overflow-y-auto px-6 py-6">{error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}{messages.filter(message => message.targetDeviceId === deviceId || message.senderDeviceId === activeDeviceId.current).map(message => <article className={`mb-3 max-w-xl rounded-xl border border-border p-3 text-sm ${message.senderDeviceId === activeDeviceId.current ? "ml-auto bg-accent" : "bg-card"}`} key={message.id}><p>{message.text}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(message.sentAt).toLocaleString()}</p></article>)}</div>
    <form className="border-t border-border p-4" onSubmit={event => { event.preventDefault(); void send(); }}><div className="mx-auto flex max-w-3xl gap-3"><input aria-label="Device message" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" disabled={!deviceId} onChange={event => setDraft(event.target.value)} placeholder={deviceId ? "Send a device message" : "Select a device"} value={draft} /><Button aria-label="Send device message" className="cursor-pointer" disabled={!draft.trim() || !deviceId || status !== "Connected"} type="submit"><Send className="size-4" /></Button></div></form>
  </MdiTopologyRegion>;
}

function receive(raw: unknown, socket: WebSocket, after: MutableRefObject<number>, activeDeviceId: MutableRefObject<string>, setMessages: Dispatch<SetStateAction<DeviceMessage[]>>, setStatus: Dispatch<SetStateAction<string>>) {
  const message = JSON.parse(String(raw));
  if (message.type === "ready") { activeDeviceId.current = message.deviceId; setStatus("Connected"); }
  if (message.type === "available") socket.send(JSON.stringify({ type: "pull", after: after.current }));
  if (message.type !== "events" || !Array.isArray(message.events) || !message.events.length) return;
  after.current = message.events.at(-1).seq;
  const received = (message.events as DeviceEvent[]).filter(event => event.payload.kind === "device.message" && event.payload.text && event.payload.targetDeviceId && event.payload.senderDeviceId && event.payload.sentAt)
    .map(event => ({ id: event.seq, senderDeviceId: event.payload.senderDeviceId!, sentAt: event.payload.sentAt!, targetDeviceId: event.payload.targetDeviceId!, text: event.payload.text! }));
  if (received.length) setMessages(current => [...current, ...received.filter(item => !current.some(existing => existing.id === item.id))]);
  if (message.events.length === 100) socket.send(JSON.stringify({ type: "pull", after: after.current }));
}

async function loadDevices(): Promise<Device[]> { return (await request<{ devices: Device[] }>("/dcs/devices")).devices; }
async function request<T>(path: string, method = "GET", body?: unknown, deviceToken?: string | null): Promise<T> {
  const response = await platformFetch(path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(deviceToken ? { authorization: `Bearer ${deviceToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "DCS request failed");
  return result;
}
