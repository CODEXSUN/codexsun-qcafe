import { useEffect, useRef, useState } from "react";
import { ImagePlus, Mic, Paperclip, Square, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import type { PromptAttachment } from "@codexsun/zetro-api/contracts";

export function AttachmentControls({ items, onChange, disabled, onBusy, onError }: { items: PromptAttachment[]; onChange: (items: PromptAttachment[]) => void; disabled: boolean; onBusy: (busy: boolean) => void; onError: (error: string) => void }) {
  const image = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);

  async function attach(files: File[]) {
    setLoading(true); onBusy(true);
    try {
      if (items.length + files.length > 3 || files.reduce((size, entry) => size + entry.size, items.reduce((size, entry) => size + entry.data.length * 0.75, 0)) > 2_000_000) throw new Error("Attach up to 3 files, 2 MB total.");
      const additions = await Promise.all(files.map((entry) => new Promise<PromptAttachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: entry.name, mime: entry.type || "application/octet-stream", data: String(reader.result).split(",")[1]! });
        reader.onerror = () => reject(new Error("Could not read this file."));
        reader.readAsDataURL(entry);
      })));
      if (mounted.current) { onChange([...items, ...additions]); onError(""); }
    } catch (cause) { if (mounted.current) onError(cause instanceof Error ? cause.message : "Attachment failed."); }
    finally { if (mounted.current) { setLoading(false); onBusy(false); } }
  }

  async function record() {
    if (recorder.current?.state === "recording") { recorder.current.stop(); return; }
    setLoading(true); onBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is unavailable in this browser.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      const instance = new MediaRecorder(media);
      recorder.current = instance;
      const chunks: BlobPart[] = [];
      instance.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      instance.onstop = () => {
        clearTimeout(timer.current); media.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setRecording(false);
        const mime = instance.mimeType || "audio/webm";
        void attach([new File(chunks, `voice-${Date.now()}.${mime.includes("mp4") ? "m4a" : "webm"}`, { type: mime })]);
      };
      instance.start(); setRecording(true); setLoading(false);
      timer.current = setTimeout(() => { if (instance.state === "recording") instance.stop(); }, 30_000);
    } catch (cause) { stream.current?.getTracks().forEach((track) => track.stop()); setLoading(false); onBusy(false); onError(cause instanceof Error ? cause.message : "Microphone unavailable."); }
  }

  return <div className="space-y-2">
    {items.length > 0 && <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">{items.map((item, index) => <div key={`${item.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg border border-border px-2 py-1 text-xs">
      {/^image\/(png|jpeg|webp|gif)$/.test(item.mime) && <img src={`data:${item.mime};base64,${item.data}`} alt={item.name} className="size-10 rounded object-cover" />}
      <span className="max-w-40 truncate" title={item.name}>{item.name}</span>
      <Button type="button" aria-label={`Remove ${item.name}`} disabled={disabled || loading || recording} variant="ghost" size="icon" className="size-6" onClick={() => onChange(items.filter((_, i) => i !== index))}><X className="size-3" /></Button>
    </div>)}</div>}
    <div className="flex flex-wrap items-center gap-1">
      <input ref={image} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(event) => { void attach(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <input ref={file} type="file" multiple hidden onChange={(event) => { void attach(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <Button type="button" aria-label="Attach image" title="Attach image" variant="ghost" size="icon" disabled={disabled || loading || recording} onClick={() => image.current?.click()}><ImagePlus className="size-4" /></Button>
      <Button type="button" aria-label="Attach file" title="Attach file" variant="ghost" size="icon" disabled={disabled || loading || recording} onClick={() => file.current?.click()}><Paperclip className="size-4" /></Button>
      <Button type="button" aria-label={recording ? "Stop recording" : "Record voice"} title={recording ? "Stop recording" : "Record voice (up to 30 seconds)"} variant="ghost" size="icon" disabled={disabled || loading} onClick={() => void record()}>{recording ? <Square className="size-4 text-destructive" /> : <Mic className="size-4" />}</Button>
      {recording && <span role="status" className="text-xs text-destructive">Recording · 30s maximum</span>}
      {loading && <span role="status" className="text-xs text-muted-foreground">Preparing attachment…</span>}
    </div>
  </div>;
}
