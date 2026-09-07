import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/ui/input";
import { Check, Mic, Send, Sparkles, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { HoneyMascot } from "./HoneyMascot.js";

type VoiceControl = {
  error: string;
  listening: boolean;
  supported: boolean;
  toggleListening: (onComplete: (value: string) => void) => Promise<void>;
  transcript: string;
};

type HoneyInputAssistantProps = {
  onAskHoney: (request: { fieldLabel: string; fieldValue: string; instruction: string }) => Promise<string | undefined>;
  voice: VoiceControl;
};

type ActiveField = {
  element: HTMLInputElement | HTMLTextAreaElement;
  label: string;
};

export function HoneyInputAssistant({ onAskHoney, voice }: HoneyInputAssistantProps) {
  const [field, setField] = useState<ActiveField | null>(null);
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const updateField = (target: EventTarget | null) => {
      const next = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null;
      if (next?.dataset.honeyAssist === "control") return;
      if (!next || !isSupportedField(next)) {
        setField(null);
        return;
      }
      setField({ element: next, label: fieldLabel(next) });
      setResult("");
    };
    const refreshField = () => setField((current) => current?.element.isConnected ? { ...current } : null);
    const handleFocusIn = (event: FocusEvent) => updateField(event.target);

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("input", refreshField);
    updateField(document.activeElement);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("input", refreshField);
    };
  }, []);

  if (!field) return null;
  const activeField = field;
  const fieldValue = activeField.element.value;

  async function askHoney() {
    setAsking(true);
    setResult("");
    try {
      const next = await onAskHoney({
        fieldLabel: activeField.label,
        fieldValue,
        instruction: instruction.trim() || "Improve or complete this field.",
      });
      if (next) setResult(next);
    } finally {
      setAsking(false);
    }
  }

  return (
    <aside className="fixed bottom-52 right-4 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-3 shadow-lg" aria-label={`Honey assistant for ${activeField.label}`}>
      <div className="flex items-center gap-3">
        <HoneyMascot listening={voice.listening} size="compact" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Honey can help with {activeField.label}</p>
          <p className="truncate text-xs text-muted-foreground">Voice fills this field; AI results stay reviewable.</p>
        </div>
        <Button
          type="button"
          aria-label={voice.listening ? `Stop dictating to ${activeField.label}` : `Dictate to ${activeField.label}`}
          title={voice.listening ? "Finish dictation" : "Dictate into this field"}
          variant="outline"
          size="icon"
          disabled={!voice.supported}
          className="shrink-0 cursor-pointer"
          onClick={() => void voice.toggleListening((transcript) => insertAtSelection(activeField.element, transcript))}
        >
          {voice.listening ? <Square className="size-4" /> : <Mic className="size-4" />}
        </Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          data-honey-assist="control"
          placeholder="Ask Honey to improve or create…"
          aria-label={`Instruction for ${activeField.label}`}
          className="h-9"
        />
        <Button type="button" size="icon" className="shrink-0 cursor-pointer" disabled={asking} aria-label="Ask Honey" title="Ask Honey" onClick={() => void askHoney()}>
          {asking ? <Sparkles className="size-4 animate-pulse" /> : <Send className="size-4" />}
        </Button>
      </div>
      {voice.listening || voice.error ? <p className={`mt-2 text-xs ${voice.error ? "text-destructive" : "text-muted-foreground"}`} role={voice.error ? "alert" : "status"}>{voice.error || voice.transcript || `Listening for ${activeField.label}…`}</p> : null}
      {result ? (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-2.5">
          <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-foreground">{result}</p>
          <Button type="button" size="sm" variant="secondary" className="mt-2 cursor-pointer gap-2" onClick={() => insertAtSelection(activeField.element, result)}>
            <Check className="size-3.5" /> Use result
          </Button>
        </div>
      ) : null}
    </aside>
  );
}

function isSupportedField(element: HTMLInputElement | HTMLTextAreaElement) {
  if (element.disabled || element.readOnly || element.dataset.honeyAssist === "off") return false;
  if (element instanceof HTMLTextAreaElement) return true;
  return ["", "email", "search", "tel", "text", "url"].includes(element.type);
}

function fieldLabel(element: HTMLInputElement | HTMLTextAreaElement) {
  return element.labels?.[0]?.textContent?.trim() || element.getAttribute("aria-label") || element.placeholder || "this field";
}

function insertAtSelection(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const start = element.selectionStart ?? element.value.length;
  const end = element.selectionEnd ?? start;
  const separator = start > 0 && element.value.slice(0, start).match(/\s$/u) ? "" : start > 0 ? " " : "";
  const next = `${element.value.slice(0, start)}${separator}${value}${element.value.slice(end)}`;
  setNativeValue(element, next);
  element.focus();
  const cursor = start + separator.length + value.length;
  element.setSelectionRange(cursor, cursor);
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
