import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";

export function ComposerOptions({ activity, motion, workflow, onActivity, onMotion }: { activity: boolean; motion: boolean; workflow: ReactNode; onActivity: (value: boolean) => void; onMotion: (value: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" aria-label="Agent flow options" title="Agent flow options" variant="outline" size="icon" className="size-8 rounded-xl bg-background text-muted-foreground shadow-none cursor-pointer"><SlidersHorizontal className="size-4" /></Button></PopoverTrigger>
    <PopoverContent onFocusOutside={(event) => event.preventDefault()} side="top" align="end" sideOffset={12} aria-label="Agent flow" className="max-h-[78vh] w-[min(42rem,calc(100vw-2rem))] overflow-x-hidden overflow-y-auto rounded-2xl border-border p-3">
      <div className="flex items-center justify-between border-b border-border pb-2"><h2 className="text-sm font-semibold">Agent flow</h2><Button type="button" aria-label="Close agent flow" size="icon" variant="ghost" className="size-6 cursor-pointer" onClick={() => setOpen(false)}><X className="size-3" /></Button></div>
      <div className="py-3">{workflow}</div>
      <div className="grid grid-cols-2 border-t border-border pt-2">
        <label className="flex cursor-pointer items-center justify-between gap-3 border-r border-border px-2 py-1.5"><span className="text-xs font-medium">Activity</span><input aria-label="Show activity" type="checkbox" checked={activity} onChange={(event) => onActivity(event.target.checked)} className="size-3.5 cursor-pointer accent-primary" /></label>
        <label className="flex cursor-pointer items-center justify-between gap-3 px-2 py-1.5"><span className="text-xs font-medium">Motion</span><input aria-label="Use motion" type="checkbox" checked={motion} onChange={(event) => onMotion(event.target.checked)} className="size-3.5 cursor-pointer accent-primary" /></label>
      </div>
    </PopoverContent>
  </Popover>;
}
