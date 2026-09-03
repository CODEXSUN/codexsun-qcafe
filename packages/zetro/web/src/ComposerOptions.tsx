import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@codexsun/ui/components/ui/popover";

export function ComposerOptions({ activity, motion, onActivity, onMotion }: { activity: boolean; motion: boolean; onActivity: (value: boolean) => void; onMotion: (value: boolean) => void }) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" aria-label="Agent flow options" title="Agent flow options" variant="outline" size="icon" className="size-8 rounded-xl bg-background text-muted-foreground shadow-none cursor-pointer"><SlidersHorizontal className="size-4" /></Button></PopoverTrigger>
    <PopoverContent side="top" align="end" sideOffset={12} aria-label="Agent flow" className="w-64 rounded-2xl border-border p-3">
      <div className="flex items-center justify-between border-b border-border pb-2"><h2 className="text-sm font-semibold">Agent flow</h2><Button type="button" aria-label="Close agent flow" size="icon" variant="ghost" className="size-6 cursor-pointer" onClick={() => setOpen(false)}><X className="size-3" /></Button></div>
      <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-border py-3"><span><span className="block text-sm font-medium">Activity</span><span className="text-xs text-muted-foreground">Show tool evidence as it happens</span></span><input type="checkbox" checked={activity} onChange={(event) => onActivity(event.target.checked)} className="size-3.5 cursor-pointer accent-primary" /></label>
      <label className="flex cursor-pointer items-center justify-between gap-4 pt-3"><span><span className="block text-sm font-medium">Motion</span><span className="text-xs text-muted-foreground">Use subtle response animation</span></span><input type="checkbox" checked={motion} onChange={(event) => onMotion(event.target.checked)} className="size-3.5 cursor-pointer accent-primary" /></label>
    </PopoverContent>
  </Popover>;
}
