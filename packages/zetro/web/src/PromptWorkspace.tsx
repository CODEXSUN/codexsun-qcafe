import { AttachmentControls } from "./AttachmentControls.js";
import type { PromptAttachment } from "@codexsun/zetro-api/contracts";
import { createPortal } from "react-dom";
import { ConversationSideCar } from "./ConversationSideCar.js";
import { loadConversations, saveConversations, type Conversation, type Exchange } from "./conversations.js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Bot } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { MdiTopologyRegion, type MdiTopologyAdapter } from "@codexsun/ui-desk";
import { useMutation } from "@tanstack/react-query";
import { sendPrompt } from "./prompt-api.js";
import { ComposerOptions } from "./ComposerOptions.js";



export function PromptWorkspace({ topology, sideCarTarget }: { topology?: MdiTopologyAdapter; sideCarTarget?: HTMLElement | null }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => { try { return loadConversations(localStorage); } catch { return []; } });
  const [activeId, setActiveId] = useState<string>(() => crypto.randomUUID());
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [showActivity, setShowActivity] = useState(false);
  const [motion, setMotion] = useState(true);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const mutation = useMutation({ mutationFn: sendPrompt });
  const sending = mutation.isPending;
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [exchanges]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (request.current || attachmentBusy || (!prompt.trim() && !attachments.length)) return;
    const submitted = prompt.trim() || "Process attached files";
    const controller = new AbortController();
    request.current = controller; setError("");
    try {
      const result = await mutation.mutateAsync({ message: submitted, signal: controller.signal, attachments });
      const updated = [...exchanges, { id: result.runId, prompt: submitted, result: result.message, activities: result.activities }];
      setExchanges(updated);
      const conversation: Conversation = { id: activeId, title: updated[0]!.prompt.slice(0, 100), updatedAt: new Date().toISOString(), exchanges: updated };
      const next = [conversation, ...conversations.filter((item) => item.id !== activeId)];
      setConversations(next);
      try { saveConversations(localStorage, next); } catch { setError("Unable to save chat history in this browser."); }
      setPrompt(""); setAttachments([]);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to connect to Zetro.");
    } finally { request.current = null; }
  }

  return <MdiTopologyRegion id="z1" topology={topology} className="flex h-full min-h-0 flex-col bg-background [&>.technical-label]:!left-auto [&>.technical-label]:!right-3">
    {sideCarTarget && createPortal(<ConversationSideCar conversations={conversations} activeId={activeId} disabled={sending || attachmentBusy} onSelect={(item) => { setActiveId(item.id); setExchanges(item.exchanges); setPrompt(""); setAttachments([]); setError(""); }} onNew={() => { setActiveId(crypto.randomUUID()); setExchanges([]); setPrompt(""); setAttachments([]); setError(""); }} />, sideCarTarget)}
    <header {...topology?.regionProps("z3")} className="ito-region relative flex items-center gap-3 border-b border-border px-6 py-4">{topology?.marker("z3")}<Bot className="size-5" /><h1 className="text-lg font-semibold">Zetro</h1></header>
    <MdiTopologyRegion id="z4" topology={topology} className="min-h-0 flex-1 overflow-y-auto px-6 py-8"><div aria-live="polite">
      <MdiTopologyRegion id="z4.1" topology={topology} className="mx-auto max-w-3xl space-y-8">{exchanges.length ? exchanges.map((exchange) => <article key={exchange.id} className="space-y-4">
        <div className="ml-auto w-fit max-w-[90%] rounded-2xl bg-muted px-4 py-3"><p className="whitespace-pre-wrap break-words text-sm leading-6">{exchange.prompt}</p></div>
        <div className={motion ? "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300" : ""}><p className="mb-2 text-xs font-semibold text-muted-foreground">Zetro</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{exchange.result}</p></div>
        {showActivity && <div className="space-y-1 border-l border-border pl-3 text-xs text-muted-foreground">{exchange.activities?.length ? exchange.activities.map((item) => <p key={item.id}>{item.label} · {item.status}</p>) : <p>No tool evidence reported.</p>}</div>}
      </article>) : <div className="py-16 text-center"><h2 className="text-xl font-medium">What would you like to send?</h2><p className="mt-3 text-sm text-muted-foreground">Write a prompt to get a response from Zetro.</p></div>}<div ref={bottom} /></MdiTopologyRegion>
    </div></MdiTopologyRegion>
    <MdiTopologyRegion id="z5" topology={topology} className="shrink-0 px-3 pb-5 pt-3 sm:px-6">
      <form onSubmit={(event) => void send(event)} className="relative mx-auto w-full md:w-4/5 rounded-2xl border border-input bg-card p-3 shadow-sm">
        <MdiTopologyRegion id="z5.5" topology={topology} className="!absolute -top-3 right-3 z-10"><ComposerOptions activity={showActivity} motion={motion} onActivity={setShowActivity} onMotion={setMotion} /></MdiTopologyRegion>
        <MdiTopologyRegion id="z5.1" topology={topology}><textarea aria-label="Prompt" disabled={sending} maxLength={20000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Send a prompt…" className="min-h-20 w-full resize-none border-0 bg-transparent p-2 text-sm leading-6 shadow-none outline-none ring-0 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
        </MdiTopologyRegion><AttachmentControls items={attachments} onChange={setAttachments} disabled={sending} onBusy={setAttachmentBusy} onError={setError} /><div className="flex flex-wrap items-center justify-between gap-3"><MdiTopologyRegion id="z5.2" topology={topology}><span role="status" className="text-xs text-muted-foreground">{sending ? "Waiting for Zetro…" : "Local echo · Docker"}</span></MdiTopologyRegion><MdiTopologyRegion id="z5.3" topology={topology}><Button type="submit" aria-label="Send prompt" disabled={sending || attachmentBusy || (!prompt.trim() && !attachments.length)} className="rounded-full" size="icon"><ArrowUp className="size-4" /></Button></MdiTopologyRegion></div>
        {error && <MdiTopologyRegion id="z5.4" topology={topology}><p role="alert" className="mt-3 text-sm text-destructive">{error}</p></MdiTopologyRegion>}
      </form>
    </MdiTopologyRegion>
  </MdiTopologyRegion>;
}
