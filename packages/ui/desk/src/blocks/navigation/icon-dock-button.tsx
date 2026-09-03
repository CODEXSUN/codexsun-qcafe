import type { LucideIcon } from "lucide-react";

type IconDockButtonProps = {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
};

export function IconDockButton({ active = false, icon: Icon, label, onClick }: IconDockButtonProps) {
  return <button aria-label={label} aria-pressed={active} className={`grid size-9 cursor-pointer place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${active ? "bg-accent text-accent-foreground" : "text-foreground/65 hover:bg-accent hover:text-accent-foreground"}`} onClick={onClick} title={label} type="button">
    <Icon aria-hidden="true" className="size-4" />
  </button>;
}
