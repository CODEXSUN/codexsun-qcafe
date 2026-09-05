import { useEffect, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import { platformBaseUrl, platformFetch } from "@codexsun/platform-host-contracts";

type Device = { id: string; name: string; kind: string; lastSeen: string | null; revokedAt: string | null };

export function DevicesPanel({ credentialStore }: { credentialStore?: { load(): Promise<string | null>; save(token: string): Promise<void> } }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(credentialStore ? "desktop" : "web");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState(0);

  async function load() {
    const result = await request<{ devices: Device[] }>("/dcs/devices");
    setDevices(result.devices);
  }
  useEffect(() => { void load().catch(cause => setError(String(cause.message))); }, []);
  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let after = 0;
    async function connect() {
      try {
        const deviceToken = await credentialStore?.load();
        const { ticket } = await request<{ ticket: string }>("/dcs/tickets", "POST", undefined, deviceToken);
        if (disposed) return;
        const endpoint = new URL("/dcs/ws", platformBaseUrl() || location.origin);
        endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(endpoint, [`ticket.${ticket}`]);
        socket.onopen = () => { setStatus("Connected"); socket?.send(JSON.stringify({ type: "pull", after })); void load(); };
        socket.onmessage = event => {
          const message = JSON.parse(event.data);
          if (message.type === "available") socket?.send(JSON.stringify({ type: "pull", after }));
          if (message.type === "events" && message.events.length) {
            after = message.events.at(-1).seq;
            window.dispatchEvent(new CustomEvent("codexsun:sync", { detail: message.events }));
            if (message.events.length === 100) socket?.send(JSON.stringify({ type: "pull", after }));
          }
        };
        socket.onclose = event => { setStatus(event.code === 4001 ? "Revoked" : "Disconnected"); if (!disposed && event.code !== 4001) timer = setTimeout(() => { void connect(); }, 5000); };
      } catch { if (!disposed) setStatus("Enroll this device to connect"); }
    }
    void connect();
    return () => { disposed = true; clearTimeout(timer); socket?.close(); };
  }, [connection]);

  async function enroll() {
    setBusy(true); setError("");
    try { const device = await request<{ token: string }>("/dcs/devices", "POST", { name, kind }); await credentialStore?.save(device.token); setName(""); await load(); setConnection(value => value + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Enrollment failed"); }
    finally { setBusy(false); }
  }
  async function revoke(device: Device) {
    setBusy(true); setError("");
    try { await request(`/dcs/devices/${device.id}`, "DELETE"); await load(); }
    catch { setError("Could not revoke the device."); }
    finally { setBusy(false); }
  }
  return <section className="grid gap-6" aria-label="Device Communication Service">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Devices</h2><span role="status" className="text-sm text-muted-foreground">{status}</span></div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void enroll(); }}>
      <label className="grid grow gap-2 text-sm">Device name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="My work device" className="rounded-lg border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" /></label>
      <label className="grid gap-2 text-sm">Type<select value={kind} onChange={event => setKind(event.target.value)} className="cursor-pointer rounded-lg border border-input bg-background p-3"><option value="web">Browser</option><option value="desktop">Desktop</option><option value="android">Android</option><option value="ios">iOS</option></select></label>
      <Button type="submit" disabled={busy || !name.trim()} className="cursor-pointer">Enroll this device</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="divide-y divide-border">{devices.map(device => <article key={device.id} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-medium">{device.name}</h3><p className="text-sm text-muted-foreground">{device.kind} · {device.revokedAt ? "Revoked" : device.lastSeen ? `Last connected ${new Date(device.lastSeen).toLocaleString()}` : "Enrolled, awaiting connection"}</p></div><Button variant="outline" disabled={busy || !!device.revokedAt} className="cursor-pointer" onClick={() => { void revoke(device); }}>Revoke</Button></article>)}</div>
  </section>;
}

async function request<T>(path: string, method = "GET", body?: unknown, deviceToken?: string | null): Promise<T> {
  const response = await platformFetch(path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(deviceToken ? { authorization: `Bearer ${deviceToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "DCS request failed");
  return result;
}
